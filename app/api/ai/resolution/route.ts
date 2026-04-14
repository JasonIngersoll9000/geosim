import { NextResponse } from 'next/server'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { runResolutionEngine } from '@/lib/ai/resolution-engine'
import type { TurnPlan, Decision } from '@/lib/types/simulation'

/**
 * POST /api/ai/resolution
 * Resolve all actor turn plans simultaneously and produce EventStateEffects.
 *
 * Body: {
 *   scenarioId: string
 *   branchId: string
 *   turnCommitId: string
 *   turnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }>
 *   decisionCatalog: Decision[]
 *   simulatedDate: string
 *   turnNumber: number
 *   scenarioContext: string
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
      turnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }>
      decisionCatalog: Decision[]
      simulatedDate: string
      turnNumber: number
      scenarioContext: string
    }

    const { branchId, turnCommitId, turnPlans, decisionCatalog, simulatedDate, turnNumber, scenarioContext } = body

    if (!branchId || !turnCommitId || !turnPlans?.length) {
      return NextResponse.json({ error: 'branchId, turnCommitId, and turnPlans are required' }, { status: 400 })
    }

    const branchState = await getStateAtTurn(branchId, turnCommitId)

    const result = await runResolutionEngine({
      turnPlans,
      branchState,
      decisionCatalog: decisionCatalog ?? [],
      simulatedDate,
      turnNumber,
      scenarioContext: scenarioContext ?? '',
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[resolution-engine]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
