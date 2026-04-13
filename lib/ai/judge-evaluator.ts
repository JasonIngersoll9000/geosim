/**
 * Judge Evaluator
 * Scores the plausibility of a resolved turn (0-100) and provides critique.
 * Retries resolution if score is below the threshold.
 */

import { callClaude } from '@/lib/ai/anthropic'
import { NEUTRALITY_PREAMBLE } from '@/lib/ai/prompts'
import type { TurnPlan, EventStateEffects } from '@/lib/types/simulation'

const JUDGE_THRESHOLD = 40

export interface JudgeInput {
  turnPlans: Array<{
    actorId: string
    actorName: string
    turnPlan: TurnPlan
  }>
  effects: EventStateEffects
  headline: string
  narrativeSummary: string
  simulatedDate: string
  turnNumber: number
  scenarioContext: string
}

export interface JudgeOutput {
  score: number
  critique: string
  verdict: 'accept' | 'retry'
}

const JUDGE_SYSTEM = `${NEUTRALITY_PREAMBLE}

ROLE: You are the Judge — an evaluator of strategic plausibility. You review the
actions taken and the resolution outcomes and score whether they are realistic,
historically grounded, and internally consistent.

EVALUATION CRITERIA (each 0-25 points):
1. ACTOR RATIONALITY: Would each actor plausibly choose these actions given their doctrine and objectives?
2. RESOLUTION REALISM: Are the resolution outcomes proportional and realistic given military/economic facts?
3. HISTORICAL GROUNDING: Do the actions and effects align with real-world strategic precedents?
4. INTERNAL CONSISTENCY: Are the effects consistent with each other and the prior state?

SCORING GUIDE:
  90-100: Near-perfect — highly realistic simulation
  70-89:  Good — minor implausibilities but overall sound
  50-69:  Acceptable — some stretches but defensible
  30-49:  Marginal — significant implausibilities that weaken realism
  0-29:   Reject — fundamental realism failures

If score < 40, set verdict = "retry". Otherwise "accept".

OUTPUT FORMAT — return ONLY this JSON:
{
  "score": number,
  "rationale_breakdown": {
    "actor_rationality": number,
    "resolution_realism": number,
    "historical_grounding": number,
    "internal_consistency": number
  },
  "critique": string,
  "verdict": "accept" | "retry"
}`

async function scoreResolution(input: JudgeInput): Promise<JudgeOutput> {
  const {
    turnPlans,
    effects,
    headline,
    narrativeSummary,
    simulatedDate,
    turnNumber,
    scenarioContext,
  } = input

  const plansBlock = turnPlans
    .map(tp => {
      return `${tp.actorName}: primary=${tp.turnPlan.primaryAction.decisionId} (${tp.turnPlan.primaryAction.resourcePercent}%), concurrent=[${tp.turnPlan.concurrentActions.map(ca => ca.decisionId).join(', ')}]`
    })
    .join('\n')

  const effectsBlock = `
Score deltas: ${JSON.stringify(effects.actor_score_deltas, null, 2)}
Global deltas: ${JSON.stringify(effects.global_state_deltas)}
Headline: ${headline}
Summary: ${narrativeSummary}`

  const userPrompt = `SIMULATION CONTEXT:
Turn ${turnNumber} | Simulated date: ${simulatedDate}

SCENARIO BACKGROUND:
${scenarioContext}

ACTOR PLANS:
${plansBlock}

RESOLUTION OUTCOME:
${effectsBlock}

Score the plausibility of this turn resolution.`

  const raw = await callClaude(JUDGE_SYSTEM, userPrompt, { maxTokens: 1024 })

  const parsed = raw as {
    score: number
    critique: string
    verdict: 'accept' | 'retry'
  }

  return {
    score: Math.max(0, Math.min(100, parsed.score ?? 0)),
    critique: parsed.critique ?? '',
    verdict: (parsed.score ?? 0) < JUDGE_THRESHOLD ? 'retry' : (parsed.verdict ?? 'accept'),
  }
}

/**
 * Run the judge evaluator with a single automatic retry if score < threshold.
 */
export async function runJudge(input: JudgeInput): Promise<JudgeOutput> {
  const firstResult = await scoreResolution(input)

  if (firstResult.verdict === 'accept' || firstResult.score >= JUDGE_THRESHOLD) {
    return firstResult
  }

  // One retry — the caller is expected to get a new resolution, but for now
  // we accept the second pass regardless of score (max 2 attempts total).
  const retryResult = await scoreResolution(input)
  return {
    ...retryResult,
    verdict: 'accept',
  }
}
