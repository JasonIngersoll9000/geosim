import { NextResponse } from 'next/server'
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
 * Body: {
 *   scenarioId: string
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
      scenarioId: string
      branchId: string
      playerActorId: string | null
      playerTurnPlan: TurnPlan | null
      availableDecisions: Record<string, Decision[]>
    }

    const { scenarioId, branchId, playerActorId, playerTurnPlan, availableDecisions } = body

    if (!scenarioId || !branchId) {
      return NextResponse.json({ error: 'scenarioId and branchId are required' }, { status: 400 })
    }
    if (playerActorId && !playerTurnPlan) {
      return NextResponse.json({ error: 'playerTurnPlan is required when playerActorId is set' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── 1. Load current branch + scenario data ─────────────────────────────

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, head_commit_id, scenario_id, user_controlled_actors')
      .eq('id', branchId)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const headCommitId = (branch as Record<string, unknown>).head_commit_id as string | null
    if (!headCommitId) {
      return NextResponse.json({ error: 'Branch has no head commit — run the research pipeline first' }, { status: 400 })
    }

    // Load the head commit to get current turn number and simulated_date
    const { data: headCommit, error: headError } = await supabase
      .from('turn_commits')
      .select('id, turn_number, simulated_date, parent_commit_id')
      .eq('id', headCommitId)
      .single()

    if (headError || !headCommit) {
      return NextResponse.json({ error: 'Head commit not found' }, { status: 404 })
    }

    const currentTurn = (headCommit as Record<string, unknown>).turn_number as number
    const newTurnNumber = currentTurn + 1

    // Advance simulated date by 7 days (one turn = one week)
    const currentDate = (headCommit as Record<string, unknown>).simulated_date as string
    const simulatedDate = advanceDate(currentDate, 7)

    // ── 2. Load scenario actors and context ────────────────────────────────

    const { data: actorRows, error: actorsError } = await supabase
      .from('scenario_actors')
      .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
      .eq('scenario_id', scenarioId)

    if (actorsError || !actorRows?.length) {
      return NextResponse.json({ error: 'No actors found for scenario' }, { status: 404 })
    }

    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .select('name, description, critical_context')
      .eq('id', scenarioId)
      .single()

    const scenarioContext = scenario
      ? `${(scenario as Record<string, unknown>).name}: ${(scenario as Record<string, unknown>).description ?? ''}${(scenario as Record<string, unknown>).critical_context ? '\n' + (scenario as Record<string, unknown>).critical_context : ''}`
      : 'Geopolitical simulation'

    // ── 3. Load branch state at current head ──────────────────────────────

    const branchState = await getStateAtTurn(branchId, headCommitId)

    // ── 4. Determine AI actors and generate their TurnPlans ───────────────

    const userControlledActors = ((branch as Record<string, unknown>).user_controlled_actors as string[]) ?? []
    const aiActors = actorRows.filter(
      a => a.id !== playerActorId && !userControlledActors.includes(a.id)
    )

    // Branch divergence: count turns since fork from trunk
    const branchDivergence = await computeBranchDivergence(supabase, branchId, scenarioId)

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
      return NextResponse.json({ error: 'No turn plans generated — ensure actors have available decisions' }, { status: 400 })
    }

    // Flatten decision catalog for resolution
    const decisionCatalog: Decision[] = Object.values(availableDecisions).flat()

    // ── 5. Resolution engine ───────────────────────────────────────────────

    const resolution = await runResolutionEngine({
      turnPlans: allTurnPlans,
      branchState,
      decisionCatalog,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
    })

    // ── 6. Judge evaluator ─────────────────────────────────────────────────

    const judgeResult = await runJudge({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      simulatedDate,
      turnNumber: newTurnNumber,
      scenarioContext,
    })

    // ── 7. Narrator ────────────────────────────────────────────────────────

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

    // ── 8. Persist new turn_commit ─────────────────────────────────────────

    const { data: newCommit, error: commitError } = await supabase
      .from('turn_commits')
      .insert({
        branch_id: branchId,
        parent_commit_id: headCommitId,
        turn_number: newTurnNumber,
        simulated_date: simulatedDate,
        scenario_snapshot: {},
        planning_phase: {
          turnPlans: allTurnPlans,
        },
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

    // ── 9. Apply state effects and persist snapshots ───────────────────────

    const newState = applyEventEffects(branchState, resolution.effects)
    await persistStateSnapshot(scenarioId, branchId, newCommitId, newState)

    // ── 10. Advance branch head_commit_id ─────────────────────────────────

    await supabase
      .from('branches')
      .update({ head_commit_id: newCommitId, updated_at: new Date().toISOString() })
      .eq('id', branchId)

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
  branchId: string,
  _scenarioId: string
): Promise<number> {
  try {
    const { data: branch } = await supabase
      .from('branches')
      .select('is_trunk')
      .eq('id', branchId)
      .single()

    if (!branch || (branch as Record<string, unknown>).is_trunk) return 0

    // Count commits on this branch (non-trunk branches start from 1)
    const { data: commits } = await supabase
      .from('turn_commits')
      .select('id')
      .eq('branch_id', branchId)

    return commits?.length ?? 0
  } catch {
    return 0
  }
}
