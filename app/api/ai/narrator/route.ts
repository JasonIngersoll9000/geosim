import { NextResponse } from 'next/server'
import { runNarrator } from '@/lib/ai/narrator'
import type { TurnPlan, EventStateEffects } from '@/lib/types/simulation'

/**
 * POST /api/ai/narrator
 * Generate the War Chronicle entry for a resolved turn.
 *
 * Body: {
 *   turnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }>
 *   effects: EventStateEffects
 *   headline: string
 *   narrativeSummary: string
 *   judgeScore: number
 *   judgeCritique: string
 *   simulatedDate: string
 *   turnNumber: number
 *   scenarioContext: string
 *   escalationChanges: Array<{ actorId: string; previousRung: number; newRung: number; rationale: string }>
 * }
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  try {
    const body = await request.json() as {
      turnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }>
      effects: EventStateEffects
      headline: string
      narrativeSummary: string
      judgeScore: number
      judgeCritique: string
      simulatedDate: string
      turnNumber: number
      scenarioContext: string
      escalationChanges: Array<{ actorId: string; previousRung: number; newRung: number; rationale: string }>
    }

    const {
      turnPlans,
      effects,
      headline,
      narrativeSummary,
      judgeScore,
      judgeCritique,
      simulatedDate,
      turnNumber,
      scenarioContext,
      escalationChanges,
    } = body

    if (!turnPlans?.length || !effects) {
      return NextResponse.json({ error: 'turnPlans and effects are required' }, { status: 400 })
    }

    const result = await runNarrator({
      turnPlans,
      effects,
      headline: headline ?? '',
      narrativeSummary: narrativeSummary ?? '',
      judgeScore: judgeScore ?? 0,
      judgeCritique: judgeCritique ?? '',
      simulatedDate,
      turnNumber,
      scenarioContext: scenarioContext ?? '',
      escalationChanges: escalationChanges ?? [],
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[narrator]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
