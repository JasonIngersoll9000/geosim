import { NextResponse } from 'next/server'
import { runJudge } from '@/lib/ai/judge-evaluator'
import type { TurnPlan, EventStateEffects } from '@/lib/types/simulation'

/**
 * POST /api/ai/judge
 * Score the plausibility of a resolved turn (0-100).
 * Retries once automatically if score is below threshold.
 *
 * Body: {
 *   turnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan }>
 *   effects: EventStateEffects
 *   headline: string
 *   narrativeSummary: string
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
      turnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan }>
      effects: EventStateEffects
      headline: string
      narrativeSummary: string
      simulatedDate: string
      turnNumber: number
      scenarioContext: string
    }

    const { turnPlans, effects, headline, narrativeSummary, simulatedDate, turnNumber, scenarioContext } = body

    if (!turnPlans?.length || !effects) {
      return NextResponse.json({ error: 'turnPlans and effects are required' }, { status: 400 })
    }

    const result = await runJudge({
      turnPlans,
      effects,
      headline: headline ?? '',
      narrativeSummary: narrativeSummary ?? '',
      simulatedDate,
      turnNumber,
      scenarioContext: scenarioContext ?? '',
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[judge]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
