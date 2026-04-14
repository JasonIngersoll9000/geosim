import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStateAtTurn, applyEventEffects, persistStateSnapshot } from '@/lib/game/state-engine'
import { runActorAgent } from '@/lib/ai/actor-agent-runner'
import { runResolutionEngine } from '@/lib/ai/resolution-engine'
import { runJudge, JUDGE_THRESHOLD } from '@/lib/ai/judge-evaluator'
import { runNarrator } from '@/lib/ai/narrator'
import type { TurnPlan, Decision } from '@/lib/types/simulation'

/**
 * POST /api/game/turn
 * Full turn orchestrator. Sequences all four AI agents, persists the new turn_commit,
 * and advances the branch head_commit_id.
 *
 * Authorization:
 *   - Requires an authenticated Supabase session (unless NEXT_PUBLIC_DEV_MODE=true).
 *   - Owner of a branch may run turns with or without a player actor.
 *   - Non-owners may only run in observer mode (playerActorId === null) on public scenarios.
 *   - All unauthenticated requests are rejected when auth is configured.
 *
 * Body: {
 *   branchId: string
 *   playerActorId: string | null      // null = observer mode (all actors are AI)
 *   playerTurnPlan: TurnPlan | null   // required if playerActorId is set
 *   availableDecisions: Record<string, Decision[]>  // keyed by actorId
 * }
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  const authConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    const body = await request.json() as {
      branchId: string
      playerActorId: string | null
      playerTurnPlan: TurnPlan | null
      availableDecisions: Record<string, Decision[]>
    }

    const { branchId, playerActorId, playerTurnPlan, availableDecisions } = body

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 })
    }
    if (playerActorId && !playerTurnPlan) {
      return NextResponse.json(
        { error: 'playerTurnPlan is required when playerActorId is set' },
        { status: 400 }
      )
    }

    // ── 1. Authenticate ────────────────────────────────────────────────────
    // Use session-scoped client to resolve the authenticated user.
    // Reject unauthenticated requests when auth is configured and dev mode is off.

    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()

    if (!user && authConfigured && !devMode) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ── 2. Load branch (via session client — RLS enforces read access) ─────

    const { data: branchRaw, error: branchError } = await sessionClient
      .from('branches')
      .select('id, head_commit_id, scenario_id, user_controlled_actors, created_by')
      .eq('id', branchId)
      .single()

    if (branchError || !branchRaw) {
      return NextResponse.json({ error: 'Branch not found or access denied' }, { status: 404 })
    }

    const branch = branchRaw as {
      id: string
      head_commit_id: string | null
      scenario_id: string
      user_controlled_actors: string[]
      created_by: string | null
    }

    // Derive scenarioId from the branch record — never trust body input
    const scenarioId = branch.scenario_id

    // ── 3. Authorize against scenario visibility and branch ownership ──────
    // Load scenario visibility as the authoritative source for public access.

    const { data: scenarioMeta, error: scenarioMetaError } = await sessionClient
      .from('scenarios')
      .select('id, visibility')
      .eq('id', scenarioId)
      .single()

    if (scenarioMetaError || !scenarioMeta) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const scenarioVisibility = (scenarioMeta as Record<string, unknown>).visibility as string
    const isPublicScenario = scenarioVisibility === 'public'
    const isOwner = user ? branch.created_by === user.id : devMode

    // Non-owners may only observe (no playerActorId) on public scenarios
    if (!isOwner) {
      if (!isPublicScenario) {
        return NextResponse.json(
          { error: 'Access denied: this scenario is private' },
          { status: 403 }
        )
      }
      if (playerActorId) {
        return NextResponse.json(
          { error: 'Access denied: only the branch owner can submit player decisions' },
          { status: 403 }
        )
      }
    }

    const headCommitId = branch.head_commit_id
    if (!headCommitId) {
      return NextResponse.json(
        { error: 'Branch has no head commit — run the research pipeline first' },
        { status: 400 }
      )
    }

    // ── 4. All further reads/writes use service-role (auth already enforced) ─

    const supabase = createServiceClient()

    const { data: headCommit, error: headError } = await supabase
      .from('turn_commits')
      .select('id, turn_number, simulated_date')
      .eq('id', headCommitId)
      .single()

    if (headError || !headCommit) {
      return NextResponse.json({ error: 'Head commit not found' }, { status: 404 })
    }

    const currentTurn = (headCommit as Record<string, unknown>).turn_number as number
    const newTurnNumber = currentTurn + 1
    const currentDate = (headCommit as Record<string, unknown>).simulated_date as string
    const simulatedDate = advanceDate(currentDate, 7)

    // ── 5. Load actors and scenario context ───────────────────────────────

    const [actorRes, scenarioRes] = await Promise.all([
      supabase
        .from('scenario_actors')
        .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
        .eq('scenario_id', scenarioId),
      supabase
        .from('scenarios')
        .select('name, description, critical_context')
        .eq('id', scenarioId)
        .single(),
    ])

    if (actorRes.error || !actorRes.data?.length) {
      return NextResponse.json({ error: 'No actors found for scenario' }, { status: 404 })
    }

    const actorRows = actorRes.data
    const scenario = scenarioRes.data as Record<string, unknown> | null
    const scenarioContext = scenario
      ? `${scenario.name}: ${scenario.description ?? ''}${scenario.critical_context ? '\n' + scenario.critical_context : ''}`
      : 'Geopolitical simulation'

    // ── 6. Load branch state and compute divergence ────────────────────────

    const [branchState, branchDivergence] = await Promise.all([
      getStateAtTurn(branchId, headCommitId),
      computeBranchDivergence(supabase, branchId),
    ])

    // ── 7. Generate AI actor TurnPlans ─────────────────────────────────────
    // Fail the turn if any AI actor with available decisions fails to produce a plan.

    const userControlledActors = branch.user_controlled_actors ?? []
    const aiActors = actorRows.filter(
      a =>
        a.id !== playerActorId &&
        !userControlledActors.includes(a.id) &&
        (availableDecisions[a.id]?.length ?? 0) > 0
    )

    const aiPlanResults = await Promise.allSettled(
      aiActors.map(async (actor) => {
        const result = await runActorAgent({
          actorId: actor.id,
          actorProfile: actor as Parameters<typeof runActorAgent>[0]['actorProfile'],
          branchState,
          availableDecisions: availableDecisions[actor.id],
          branchDivergence,
          simulatedDate,
          turnNumber: newTurnNumber,
        })
        return { actorId: actor.id, actorName: actor.name, turnPlan: result.turnPlan, rationale: result.rationale }
      })
    )

    const aiTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale: string }> = []
    const agentFailures: string[] = []

    for (const result of aiPlanResults) {
      if (result.status === 'fulfilled') {
        aiTurnPlans.push(result.value)
      } else {
        const actor = aiActors[aiPlanResults.indexOf(result)]
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
        agentFailures.push(`${actor?.id ?? 'unknown'}: ${reason}`)
      }
    }

    if (agentFailures.length > 0) {
      console.error('[turn] actor agent failures:', agentFailures)
      return NextResponse.json(
        { error: `AI actor plan generation failed: ${agentFailures.join('; ')}` },
        { status: 500 }
      )
    }

    const allTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }> = [
      ...aiTurnPlans,
    ]

    if (playerActorId && playerTurnPlan) {
      const playerActor = actorRows.find(a => a.id === playerActorId)
      allTurnPlans.push({
        actorId: playerActorId,
        actorName: playerActor?.name ?? playerActorId,
        turnPlan: playerTurnPlan,
        rationale: 'Player decision',
      })
    }

    if (allTurnPlans.length === 0) {
      return NextResponse.json(
        { error: 'No turn plans generated — ensure actors have available decisions' },
        { status: 400 }
      )
    }

    const decisionCatalog: Decision[] = Object.values(availableDecisions).flat()

    // ── 8. Resolution → Judge loop (max 2 attempts) ────────────────────────
    // First attempt: resolve, then score. If score < threshold, run a corrected
    // resolution informed by the judge's critique, then re-score. Accept on the
    // second pass regardless of score (capped at 2 resolution attempts).

    let resolution = await runResolutionEngine({
      turnPlans: allTurnPlans,
      branchState,
      decisionCatalog,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
    })

    let judgeResult = await runJudge({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
    })

    if (judgeResult.verdict === 'retry' || judgeResult.score < JUDGE_THRESHOLD) {
      // Second resolution pass: feed judge critique back so Claude can correct flaws
      resolution = await runResolutionEngine({
        turnPlans: allTurnPlans,
        branchState,
        decisionCatalog,
        simulatedDate,
        turnNumber: newTurnNumber,
        scenarioContext,
        judgeCorrection: judgeResult.critique,
      })

      const retryJudge = await runJudge({
        turnPlans: allTurnPlans,
        effects: resolution.effects,
        headline: resolution.headline,
        narrativeSummary: resolution.narrativeSummary,
        simulatedDate,
        turnNumber: newTurnNumber,
        scenarioContext,
      })

      // Accept the retry result unconditionally — we've done our 2 passes
      judgeResult = { ...retryJudge, verdict: 'accept' }
    }

    // ── 10. Narrator ───────────────────────────────────────────────────────

    const narration = await runNarrator({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      judgeScore: judgeResult.score,
      judgeCritique: judgeResult.critique,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
      escalationChanges: resolution.escalationChanges,
    })

    // ── 11. Persist new turn_commit ────────────────────────────────────────

    const { data: newCommit, error: commitError } = await supabase
      .from('turn_commits')
      .insert({
        branch_id: branchId,
        parent_commit_id: headCommitId,
        turn_number: newTurnNumber,
        simulated_date: simulatedDate,
        scenario_snapshot: {},
        planning_phase: { turnPlans: allTurnPlans },
        resolution_phase: {
          effects: resolution.effects,
          escalationChanges: resolution.escalationChanges,
          narrativeSummary: resolution.narrativeSummary,
        },
        judging_phase: {
          score: judgeResult.score,
          critique: judgeResult.critique,
          verdict: judgeResult.verdict,
        },
        narrative_entry: narration.fullBriefing,
        full_briefing: narration.fullBriefing,
        chronicle_headline: narration.chronicleHeadline,
        current_phase: 'complete',
        is_ground_truth: false,
      })
      .select('id')
      .single()

    if (commitError || !newCommit) {
      throw new Error(`Failed to persist turn commit: ${commitError?.message}`)
    }

    const newCommitId = (newCommit as { id: string }).id

    // ── 12. Apply state effects and persist snapshots ──────────────────────
    // Wrap separately so snapshot failures are distinct from commit failures.

    const newState = applyEventEffects(branchState, resolution.effects)
    try {
      await persistStateSnapshot(scenarioId, branchId, newCommitId, newState)
    } catch (snapshotErr) {
      const msg = snapshotErr instanceof Error ? snapshotErr.message : String(snapshotErr)
      console.error('[turn] snapshot persistence failed after commit insert:', msg)
      return NextResponse.json(
        {
          error: 'Turn committed but state snapshot failed — data may be inconsistent',
          turnCommitId: newCommitId,
        },
        { status: 500 }
      )
    }

    // ── 13. Advance branch head_commit_id ──────────────────────────────────

    const { error: headUpdateError } = await supabase
      .from('branches')
      .update({ head_commit_id: newCommitId, updated_at: new Date().toISOString() })
      .eq('id', branchId)

    if (headUpdateError) {
      console.error('[turn] failed to advance branch head_commit_id:', headUpdateError.message)
      return NextResponse.json(
        {
          error: 'Turn committed but branch head not advanced — retry the head update',
          turnCommitId: newCommitId,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      turnCommitId: newCommitId,
      turnNumber: newTurnNumber,
      simulatedDate,
      chronicleHeadline: narration.chronicleHeadline,
      fullBriefing: narration.fullBriefing,
      judgeScore: judgeResult.score,
      effects: resolution.effects,
      escalationChanges: resolution.escalationChanges,
      turnPlans: allTurnPlans,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[game/turn]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function advanceDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

async function computeBranchDivergence(
  supabase: ReturnType<typeof createServiceClient>,
  branchId: string
): Promise<number> {
  try {
    const { data: branch } = await supabase
      .from('branches')
      .select('is_trunk')
      .eq('id', branchId)
      .single()

    if (!branch || (branch as Record<string, unknown>).is_trunk) return 0

    const { data: commits } = await supabase
      .from('turn_commits')
      .select('id')
      .eq('branch_id', branchId)

    return commits?.length ?? 0
  } catch {
    return 0
  }
}
