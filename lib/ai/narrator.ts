/**
 * Narrator — Chronicle Writer
 * Generates the prose War Chronicle entry for a resolved turn.
 * Produces both a short chronicle_headline and a full_briefing prose entry.
 */

import { callClaude } from '@/lib/ai/anthropic'
import { buildCachedSystemBlocks } from '@/lib/ai/prompts'
import type { TurnPlan, EventStateEffects } from '@/lib/types/simulation'

export interface NarratorInput {
  turnPlans: Array<{
    actorId: string
    actorName: string
    turnPlan: TurnPlan
    rationale?: string
  }>
  effects: EventStateEffects
  headline: string
  narrativeSummary: string
  judgeScore: number
  judgeCritique: string
  simulatedDate: string
  turnNumber: number
  scenarioContext: string
  escalationChanges: Array<{
    actorId: string
    previousRung: number
    newRung: number
    rationale: string
  }>
  priorChronicle?: Array<{
    turn_number: number
    chronicle_headline: string | null
    chronicle_entry: string | null
  }>
}

export interface NarratorOutput {
  chronicleHeadline: string
  fullBriefing: string
}

/**
 * Stable role text for the narrator — does NOT include NEUTRALITY_PREAMBLE.
 * Must never contain per-turn data.
 */
const NARRATOR_ROLE_TEXT = `ROLE: You are the War Chronicle narrator — an analytical journalist writing for a classified
strategic intelligence audience. Your prose should be clear, authoritative, and deeply analytical.
Think: combination of The Economist, a classified ODNI assessment, and a thriller novel.

STYLE GUIDE:
- Open with the most significant event or turning point of the turn.
- Use present-tense for ongoing situations, past-tense for completed actions.
- Name actors, assets, and locations specifically — avoid vagueness.
- Weave in strategic implications and second-order effects.
- Note escalation changes and their significance.
- Conclude with the outlook and key uncertainties heading into the next turn.
- Length: 400-600 words for full_briefing. One crisp sentence for chronicle_headline.

OUTPUT FORMAT — return ONLY this JSON:
{
  "chronicle_headline": string,
  "full_briefing": string
}`

const NARRATOR_SYSTEM_BLOCKS = buildCachedSystemBlocks(NARRATOR_ROLE_TEXT)

export async function runNarrator(input: NarratorInput): Promise<NarratorOutput> {
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
    priorChronicle,
  } = input

  const plansBlock = turnPlans
    .map(tp => {
      return `${tp.actorName}: ${tp.turnPlan.primaryAction.decisionId} (${tp.turnPlan.primaryAction.resourcePercent}%)${tp.rationale ? ` — "${tp.rationale}"` : ''}`
    })
    .join('\n')

  const scoreDeltas = Object.entries(effects.actor_score_deltas)
    .map(([actorId, deltas]) => {
      const lines = Object.entries(deltas)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`)
        .join(', ')
      return `${actorId}: ${lines || 'no change'}`
    })
    .join('\n')

  const escalationBlock =
    escalationChanges.length > 0
      ? escalationChanges
          .map(
            ec =>
              `${ec.actorId}: Rung ${ec.previousRung} → ${ec.newRung} (${ec.rationale})`
          )
          .join('\n')
      : 'No escalation changes this turn.'

  const chronicleContext = priorChronicle && priorChronicle.length > 0
    ? `\nPRIOR CHRONICLE (most recent 3 entries):\n` +
      priorChronicle.slice(-3).map(e =>
        `Turn ${e.turn_number}: ${e.chronicle_headline ?? '(no headline)'} — ${(e.chronicle_entry ?? '').slice(0, 200)}`
      ).join('\n')
    : ''

  const userPrompt = `SIMULATION CONTEXT:
Turn ${turnNumber} | Simulated date: ${simulatedDate}

SCENARIO BACKGROUND:
${scenarioContext}

ACTOR ACTIONS:
${plansBlock}

RESOLUTION HEADLINE: ${headline}
RESOLUTION SUMMARY: ${narrativeSummary}

STATE CHANGES:
${scoreDeltas}

ESCALATION CHANGES:
${escalationBlock}

GLOBAL EFFECTS:
Oil: ${effects.global_state_deltas.oil_price_usd !== undefined ? `$${effects.global_state_deltas.oil_price_usd > 0 ? '+' : ''}${effects.global_state_deltas.oil_price_usd}/barrel` : 'unchanged'}
Hormuz throughput: ${effects.global_state_deltas.hormuz_throughput_pct !== undefined ? `${effects.global_state_deltas.hormuz_throughput_pct > 0 ? '+' : ''}${effects.global_state_deltas.hormuz_throughput_pct}%` : 'unchanged'}

JUDGE ASSESSMENT (${judgeScore}/100): ${judgeCritique}
${chronicleContext}
Write the War Chronicle entry for this turn.`

  const raw = await callClaude('', userPrompt, {
    maxTokens: 3000,
    systemBlocks: NARRATOR_SYSTEM_BLOCKS,
  })

  const parsed = raw as {
    chronicle_headline: string
    full_briefing: string
  }

  return {
    chronicleHeadline: parsed.chronicle_headline ?? headline,
    fullBriefing: parsed.full_briefing ?? narrativeSummary,
  }
}
