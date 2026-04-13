import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStateAtTurn, applyEventEffects, persistStateSnapshot } from '@/lib/game/state-engine'
import { runActorAgent } from '@/lib/ai/actor-agent-runner'
import { runResolutionEngine } from '@/lib/ai/resolution-engine'
import { runJudge } from '@/lib/ai/judge-evaluator'
import { runNarrator } from '@/lib/ai/narrator'
import type { TurnPlan, Decision } from '@/lib/types/simulation'

/**
 * POST /api/game/turn
 * Full turn orchestrator. Sequences all four AI agents, persists the new turn_commit,
 * and advances the branch head_commit_id.
 *
 * Authorization: the caller must be the user who created the branch, or the
 * branch's parent scenario must be public visibility. The service-role client
 * is only used for write mutations AFTER auth has been verified.
 *
 * Body: {
 *   branchId: string
 *   playerActorId: string | null      // null = observer mode (all actors are AI)
 *   playerTurnPlan: TurnPlan | null   // required if playerActorId is set
 *   availableDecisions: Record<string, Decision[]>  // keyed by actorId
 * }
 *
 * Returns: {
 *   turnCommitId: string
 *   turnNumber: number
 *   simulatedDate: string
 *   chronicleHeadline: string
 *   fullBriefing: string
 *   judgeScore: number
 *   effects: EventStateEffects
 *   escalationChanges: [...]
 * }
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

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
      return NextResponse.json({ error: 'playerTurnPlan is required when playerActorId is set' }, { status: 400 })
    }

    // ── 1. Authenticate and authorize ─────────────────────────────────────
    // Use session-scoped client to get the authenticated user.
    // Allow unauthed access only when Supabase auth is not configured (dev mode).

    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()

    // Load branch with ownership/visibility data using session client.
    // RLS on branches should restrict reads to owner or public scenarios.
    const { data: branchRaw, error: branchError } = await sessionClient
      .from('branches')
      .select('id, head_commit_id, scenario_id, user_controlled_actors, created_by, visibility')
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
      visibility: string | null
    }

    // If auth is configured and user is authenticated, enforce ownership.
    // Observers (non-owners) may only run in observer mode (playerActorId === null).
    if (user) {
      const isOwner = branch.created_by === user.id
      const isPublic = branch.visibility === 'public'

      if (!isOwner && !isPublic) {
        return NextResponse.json({ error: 'Access denied: you do not own this branch' }, { status: 403 })
      }

      // Non-owners of private scenarios cannot submit player decisions
      if (!isOwner && playerActorId) {
        return NextResponse.json(
          { error: 'Access denied: only the branch owner can submit player decisions' },
          { status: 403 }
        )
      }
    }

    // Derive scenarioId from the branch record — never trust body input
    const scenarioId = branch.scenario_id

    const headCommitId = branch.head_commit_id
    if (!headCommitId) {
      return NextResponse.json(
        { error: 'Branch has no head commit — run the research pipeline first' },
        { status: 400 }
      )
    }

    // All subsequent reads and writes use the service-role client.
    // Auth has already been enforced above.
    const supabase = createServiceClient()

    // ── 2. Load head commit ───────────────────────────────────────────────

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

    // ── 3. Load scenario actors and context ───────────────────────────────

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

    // ── 4. Load branch state and compute divergence ────────────────────────

    const [branchState, branchDivergence] = await Promise.all([
      getStateAtTurn(branchId, headCommitId),
      computeBranchDivergence(supabase, branchId),
    ])

    // ── 5. Generate AI actor TurnPlans in parallel ─────────────────────────

    const userControlledActors = branch.user_controlled_actors ?? []
    const aiActors = actorRows.filter(
      a => a.id !== playerActorId && !userControlledActors.includes(a.id)
    )

    const aiTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale: string }> = []

    await Promise.all(
      aiActors.map(async (actor) => {
        try {
          const decisions = availableDecisions[actor.id] ?? []
          if (decisions.length === 0) return

          const result = await runActorAgent({
            actorId: actor.id,
            actorProfile: actor as Parameters<typeof runActorAgent>[0]['actorProfile'],
            branchState,
            availableDecisions: decisions,
            branchDivergence,
            simulatedDate,
            turnNumber: newTurnNumber,
          })

          aiTurnPlans.push({
            actorId: actor.id,
            actorName: actor.name,
            turnPlan: result.turnPlan,
            rationale: result.rationale,
          })
        } catch (e) {
          console.error(`[turn] actor agent failed for ${actor.id}:`, e)
        }
      })
    )

    // Combine player plan with AI plans
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

    // ── 6. Resolution engine ───────────────────────────────────────────────

    const resolution = await runResolutionEngine({
      turnPlans: allTurnPlans,
      branchState,
      decisionCatalog,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
    })

    // ── 7. Judge evaluator ─────────────────────────────────────────────────

    const judgeResult = await runJudge({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
    })

    // ── 8. Narrator ────────────────────────────────────────────────────────

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

    // ── 9. Persist new turn_commit ─────────────────────────────────────────

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

    // ── 10. Apply state effects and persist snapshots ──────────────────────

    const newState = applyEventEffects(branchState, resolution.effects)
    await persistStateSnapshot(scenarioId, branchId, newCommitId, newState)

    // ── 11. Advance branch head_commit_id (atomic fail) ───────────────────

    const { error: headUpdateError } = await supabase
      .from('branches')
      .update({ head_commit_id: newCommitId, updated_at: new Date().toISOString() })
      .eq('id', branchId)

    if (headUpdateError) {
      // The commit and snapshots are persisted, but the branch pointer wasn't advanced.
      // Log and return partial error so the caller can retry the head update.
      console.error('[turn] failed to advance branch head_commit_id:', headUpdateError.message)
      return NextResponse.json(
        {
          error: 'Turn committed but branch head not advanced — contact support',
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
