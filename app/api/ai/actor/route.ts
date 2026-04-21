import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { runActorAgent } from '@/lib/ai/actor-agent-runner'
import type { Decision } from '@/lib/types/simulation'

/**
 * POST /api/ai/actor
 * Generate a TurnPlan for a specific actor using the actor agent.
 *
 * Body: {
 *   scenarioId: string
 *   branchId: string
 *   turnCommitId: string     // head commit to load state from
 *   actorId: string
 *   availableDecisions: Decision[]
 *   branchDivergence?: number
 *   simulatedDate: string
 *   turnNumber: number
 * }
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  try {
    const body = await request.json() as {
      scenarioId: string
      branchId: string
      turnCommitId: string
      actorId: string
      availableDecisions: Decision[]
      branchDivergence?: number
      simulatedDate: string
      turnNumber: number
    }

    const { scenarioId, branchId, turnCommitId, actorId, availableDecisions, simulatedDate, turnNumber } = body
    const branchDivergence = body.branchDivergence ?? 0

    if (!scenarioId || !branchId || !turnCommitId || !actorId) {
      return NextResponse.json({ error: 'scenarioId, branchId, turnCommitId, actorId are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: actorRow, error: actorError } = await supabase
      .from('scenario_actors')
      .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
      .eq('scenario_id', scenarioId)
      .eq('id', actorId)
      .single()

    if (actorError || !actorRow) {
      return NextResponse.json({ error: `Actor not found: ${actorId}` }, { status: 404 })
    }

    const branchState = await getStateAtTurn(branchId, turnCommitId)

    const result = await runActorAgent({
      actorId,
      actorProfile: actorRow as Parameters<typeof runActorAgent>[0]['actorProfile'],
      branchState,
      availableDecisions: availableDecisions ?? [],
      branchDivergence,
      simulatedDate,
      turnNumber,
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[actor-agent]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
