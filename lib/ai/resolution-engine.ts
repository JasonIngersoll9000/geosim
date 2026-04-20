/**
 * Resolution Engine
 * Adjudicates all actor TurnPlans simultaneously and produces EventStateEffects.
 * The "omniscient" agent — sees all actor plans and resolves conflicts.
 */

import { callClaude } from '@/lib/ai/anthropic'
import { buildCachedSystemBlocks, buildGlobalStateBlock } from '@/lib/ai/prompts'
import type { TurnPlan, EventStateEffects, BranchStateAtTurn, Decision } from '@/lib/types/simulation'

export interface ResolutionInput {
  turnPlans: Array<{
    actorId: string
    actorName: string
    turnPlan: TurnPlan
    rationale?: string
  }>
  branchState: BranchStateAtTurn
  decisionCatalog: Decision[]
  simulatedDate: string
  turnNumber: number
  scenarioContext: string
  /**
   * Optional critique from the Judge evaluator on a prior attempt.
   * When set the resolution engine is instructed to correct the identified flaws.
   */
  judgeCorrection?: string
}

export interface ResolutionOutput {
  effects: EventStateEffects
  headline: string
  escalationChanges: Array<{
    actorId: string
    previousRung: number
    newRung: number
    rationale: string
  }>
  narrativeSummary: string
}

/**
 * Stable role text for the resolution engine — does NOT include NEUTRALITY_PREAMBLE.
 * Must never contain per-turn data.
 */
const RESOLUTION_ROLE_TEXT = `ROLE: You are the omniscient resolution engine. You see ALL actor plans simultaneously
and resolve their simultaneous execution. Your job is to determine realistic outcomes
when multiple actors execute their strategies at the same time.

RESOLUTION PRINCIPLES:
- Model realistic friction, unintended consequences, and strategic collisions.
- Simultaneous actions can cancel, amplify, or redirect each other.
- Effects must be proportional to action scale and actor capabilities.
- Score deltas should be realistic: major military strikes = -5 to -20 points, not -50.
- Economic effects typically lag military effects by 1-2 turns.
- Escalation rung changes must be logically warranted by the actions taken.

SCORE DELTA GUIDANCE (per actor per turn):
  Military: major strike = -10 to -20, moderate = -5 to -10, minor = -2 to -5
  Economic: blockade/sanctions = -5 to -15, infrastructure damage = -5 to -10
  Political: domestic crisis = -5 to -15, military success = +3 to +8
  Public support: war fatigue per turn = -2 to -5, major victory = +5 to +10
  International standing: major violation = -10 to -20, diplomatic win = +5 to +10

OUTPUT FORMAT — return ONLY this JSON:
{
  "actor_score_deltas": {
    "actor_id": {
      "military_strength": number,
      "political_stability": number,
      "economic_health": number,
      "public_support": number,
      "international_standing": number
    }
  },
  "asset_inventory_deltas": {
    "actor_id": {
      "asset_type": number
    }
  },
  "global_state_deltas": {
    "oil_price_usd": number,
    "hormuz_throughput_pct": number,
    "global_economic_stress": number
  },
  "facility_updates": [
    {
      "actor_id": string,
      "name": string,
      "type": string,
      "status": "operational" | "degraded" | "destroyed",
      "capacity_pct": number,
      "location_label": string
    }
  ],
  "new_depletion_rates": [
    {
      "actor_id": string,
      "asset_type": string,
      "rate_per_day": number,
      "effective_from_date": string
    }
  ],
  "headline": string,
  "escalation_changes": [
    {
      "actor_id": string,
      "previous_rung": number,
      "new_rung": number,
      "rationale": string
    }
  ],
  "narrative_summary": string
}`

const RESOLUTION_SYSTEM_BLOCKS = buildCachedSystemBlocks(RESOLUTION_ROLE_TEXT)

export async function runResolutionEngine(input: ResolutionInput): Promise<ResolutionOutput> {
  const {
    turnPlans,
    branchState,
    decisionCatalog,
    simulatedDate,
    turnNumber,
    scenarioContext,
    judgeCorrection,
  } = input

  const decisionMap = new Map(decisionCatalog.map(d => [d.id, d]))

  const plansBlock = turnPlans
    .map(tp => {
      const primaryDecision = decisionMap.get(tp.turnPlan.primaryAction.decisionId)
      const concurrentNames = tp.turnPlan.concurrentActions
        .map(ca => decisionMap.get(ca.decisionId)?.name ?? ca.decisionId)
        .join(', ')

      const actorState = branchState.actor_states[tp.actorId]
      const scores = actorState
        ? `M:${actorState.military_strength} E:${actorState.economic_health} P:${actorState.political_stability} S:${actorState.public_support} I:${actorState.international_standing}`
        : 'unknown'

      return `ACTOR: ${tp.actorName} (${tp.actorId}) [${scores}]
  PRIMARY: ${primaryDecision?.name ?? tp.turnPlan.primaryAction.decisionId} (${tp.turnPlan.primaryAction.resourcePercent}%)
    ${primaryDecision?.description ?? ''}
  CONCURRENT: ${concurrentNames || 'none'}
  RATIONALE: ${tp.rationale ?? '(none provided)'}`
    })
    .join('\n\n')

  const globalBlock = buildGlobalStateBlock(branchState.global_state)

  const correctionBlock = judgeCorrection
    ? `\nJUDGE CORRECTION (prior attempt scored below threshold — address these issues):\n${judgeCorrection}\n`
    : ''

  const userPrompt = `SIMULATION CONTEXT:
Turn ${turnNumber} | Simulated date: ${simulatedDate}

SCENARIO BACKGROUND:
${scenarioContext}

${globalBlock}

ALL ACTOR PLANS FOR THIS TURN:
${plansBlock}
${correctionBlock}
Resolve all simultaneous actions and return the JSON effects object.`

  const raw = await callClaude('', userPrompt, {
    maxTokens: 4096,
    systemBlocks: RESOLUTION_SYSTEM_BLOCKS,
  })

  const parsed = raw as {
    actor_score_deltas: Record<string, Record<string, number>>
    asset_inventory_deltas: Record<string, Record<string, number>>
    global_state_deltas: Record<string, number>
    facility_updates: Array<{
      actor_id: string
      name: string
      type: string
      status: 'operational' | 'degraded' | 'destroyed'
      capacity_pct: number
      location_label: string
    }>
    new_depletion_rates: Array<{
      actor_id: string
      asset_type: string
      rate_per_day: number
      effective_from_date: string
    }>
    headline: string
    escalation_changes: Array<{
      actor_id: string
      previous_rung: number
      new_rung: number
      rationale: string
    }>
    narrative_summary: string
  }

  const effects: EventStateEffects = {
    actor_score_deltas: parsed.actor_score_deltas ?? {},
    asset_inventory_deltas: parsed.asset_inventory_deltas ?? {},
    global_state_deltas: parsed.global_state_deltas ?? {},
    facility_updates: (parsed.facility_updates ?? []).map(f => ({
      actor_id: f.actor_id,
      name: f.name,
      type: f.type,
      status: f.status,
      capacity_pct: f.capacity_pct,
      location_label: f.location_label,
    })),
    new_depletion_rates: (parsed.new_depletion_rates ?? []).map(r => ({
      actor_id: r.actor_id,
      asset_type: r.asset_type,
      rate_per_day: r.rate_per_day,
      effective_from_date: r.effective_from_date ?? simulatedDate,
    })),
  }

  return {
    effects,
    headline: parsed.headline ?? `Turn ${turnNumber} resolution`,
    escalationChanges: (parsed.escalation_changes ?? []).map(ec => ({
      actorId: ec.actor_id,
      previousRung: ec.previous_rung,
      newRung: ec.new_rung,
      rationale: ec.rationale,
    })),
    narrativeSummary: parsed.narrative_summary ?? '',
  }
}
