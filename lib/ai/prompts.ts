/**
 * Shared prompt constants and builders for War Game AI agents.
 * The NEUTRALITY_PREAMBLE is injected as a cached system prompt prefix
 * across all agent calls to reduce token cost via Anthropic prompt caching.
 */

import type Anthropic from '@anthropic-ai/sdk'

export const NEUTRALITY_PREAMBLE = `You are an analyst for the War Game strategic simulation engine.
War Game models complex competitive dynamics between nation-states and actors with
absolute analytical neutrality. Your role is to reason rigorously from each actor's
strategic perspective — not to impose external moral judgments.

CORE PRINCIPLES:
- Every actor's rationality is evaluated from their own perspective and objectives.
- Actions that appear aggressive from one perspective may be defensive from another.
- Historical precedent and real-world strategic logic ground all reasoning.
- Fog of war: actors make decisions based on what they BELIEVE, not omniscient truth.
- Escalation follows the lowest level of intensity that achieves strategic goals.
- Constraint cascades: track how events erode actor constraints enabling new actions.

ANALYTICAL STANDARDS:
- Ground claims in verifiable military, economic, and political logic.
- Quantify effects using realistic magnitudes (not dramatic exaggeration).
- Distinguish between intended effects and likely second/third-order consequences.
- Model uncertainty — actors rarely have complete information.

OUTPUT: Always return valid JSON matching the specified schema. No prose outside JSON.`

/**
 * Build a compact actor profile summary for use in AI prompts.
 * Draws from scenario_actors row data.
 */
export function buildActorProfileBlock(actor: {
  id: string
  name: string
  short_name: string
  biographical_summary: string
  leadership_profile: string
  win_condition: string
  strategic_doctrine: string
  historical_precedents: string
  initial_scores: Record<string, number>
  intelligence_profile?: Record<string, unknown>
}): string {
  return `ACTOR: ${actor.name} (${actor.id})
BIOGRAPHICAL SUMMARY: ${actor.biographical_summary}
LEADERSHIP: ${actor.leadership_profile}
WIN CONDITION: ${actor.win_condition}
STRATEGIC DOCTRINE: ${actor.strategic_doctrine}
HISTORICAL PRECEDENTS: ${actor.historical_precedents}`
}

/**
 * Build a concise current-state block from live actor scores.
 */
export function buildLiveScoreBlock(
  actorId: string,
  scores: {
    military_strength: number
    political_stability: number
    economic_health: number
    public_support: number
    international_standing: number
  }
): string {
  return `LIVE STATE — ${actorId.toUpperCase()}:
  Military Strength:      ${scores.military_strength}/100
  Political Stability:    ${scores.political_stability}/100
  Economic Health:        ${scores.economic_health}/100
  Public Support:         ${scores.public_support}/100
  International Standing: ${scores.international_standing}/100`
}

/**
 * Summarise global state for prompt injection.
 */
export function buildGlobalStateBlock(global: {
  oil_price_usd: number
  hormuz_throughput_pct: number
  global_economic_stress: number
}): string {
  return `GLOBAL STATE:
  Oil price: $${global.oil_price_usd}/barrel
  Strait of Hormuz throughput: ${global.hormuz_throughput_pct}% of normal
  Global economic stress index: ${global.global_economic_stress}/100`
}

/**
 * Build two separately-cached system content blocks for any agent call.
 *
 * Per the Anthropic prompt caching spec, placing `cache_control: { type: 'ephemeral' }`
 * on the LAST block of each stable section creates a cumulative cache breakpoint.
 * With two blocks the API stores two breakpoints:
 *
 *   Block 1 (NEUTRALITY_PREAMBLE) — shared across ALL agents; cached once per session.
 *   Block 2 (agent role text)     — stable per agent type; cached once per agent type.
 *
 * Turn-variable data (current state, simulated date, turn number, divergence count,
 * live scores) must NEVER be included in either block — it goes in the user message.
 *
 * @param agentRoleText The stable, agent-specific ROLE + OUTPUT FORMAT instructions.
 *   Must not contain per-turn data.
 * @returns An array of two TextBlockParam objects, each with cache_control applied.
 */
export function buildCachedSystemBlocks(
  agentRoleText: string
): Anthropic.Messages.TextBlockParam[] {
  return [
    {
      type: 'text' as const,
      text: NEUTRALITY_PREAMBLE,
      cache_control: { type: 'ephemeral' as const },
    },
    {
      type: 'text' as const,
      text: agentRoleText,
      cache_control: { type: 'ephemeral' as const },
    },
  ]
}

/**
 * Format available decisions compactly for AI consumption.
 */
export function buildDecisionListBlock(
  decisions: Array<{
    id: string
    name?: string
    description: string
    dimension: string
    escalationLevel?: number
    strategicRationale?: string
    prerequisites?: string[]
  }>
): string {
  return decisions
    .map((d, i) => {
      const prereqs = d.prerequisites?.length
        ? `\n    Prerequisites: ${d.prerequisites.join(', ')}`
        : ''
      const rationale = d.strategicRationale
        ? `\n    Rationale: ${d.strategicRationale}`
        : ''
      return `  ${i + 1}. [${d.id}] ${d.name ?? d.id} (${d.dimension}, escalation rung ${d.escalationLevel ?? '?'})
    ${d.description}${rationale}${prereqs}`
    })
    .join('\n\n')
}
