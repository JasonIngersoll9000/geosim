/**
 * Judge Evaluator
 * Scores the plausibility of a resolved turn (0-100) and provides critique.
 * The turn controller is responsible for the retry loop (judge → new resolution → re-judge).
 */

import { callClaude } from '@/lib/ai/anthropic'
import { buildCachedSystemBlocks } from '@/lib/ai/prompts'
import type { TurnPlan, EventStateEffects } from '@/lib/types/simulation'

export const JUDGE_THRESHOLD = 40

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

/**
 * Stable role text for the judge — does NOT include NEUTRALITY_PREAMBLE.
 * Must never contain per-turn data.
 */
const JUDGE_ROLE_TEXT = `ROLE: You are the Judge — an evaluator of strategic plausibility. You review the
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

If score < ${JUDGE_THRESHOLD}, set verdict = "retry". Otherwise "accept".

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

const JUDGE_SYSTEM_BLOCKS = buildCachedSystemBlocks(JUDGE_ROLE_TEXT)

/**
 * Score a single resolution attempt. Returns score, critique, and verdict.
 * Verdict is "retry" when score < JUDGE_THRESHOLD.
 */
export async function runJudge(input: JudgeInput): Promise<JudgeOutput> {
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

  const raw = await callClaude('', userPrompt, {
    maxTokens: 1024,
    systemBlocks: JUDGE_SYSTEM_BLOCKS,
  })

  const parsed = raw as {
    score: number
    critique: string
    verdict: 'accept' | 'retry'
  }

  const score = Math.max(0, Math.min(100, parsed.score ?? 0))
  return {
    score,
    critique: parsed.critique ?? '',
    verdict: score < JUDGE_THRESHOLD ? 'retry' : 'accept',
  }
}
