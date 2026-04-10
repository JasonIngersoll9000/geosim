import type { BranchStateAtTurn } from '@/lib/types/simulation'

/**
 * Build a structured state context block for injection into actor agent prompts.
 * Injected after doctrine section, before decision alternatives instruction.
 * Returns empty string if the actor is not found in state.
 */
export function buildStateContextBlock(
  actorId: string,
  state: BranchStateAtTurn
): string {
  const actor = state.actor_states[actorId]
  if (!actor) return ''

  const scores = [
    `Military Strength: ${actor.military_strength}/100`,
    `Political Stability: ${actor.political_stability}/100`,
    `Economic Health: ${actor.economic_health}/100`,
    `Public Support: ${actor.public_support}/100`,
    `International Standing: ${actor.international_standing}/100`,
  ].join('\n')

  const assets = Object.entries(actor.asset_availability)
    .map(([type, av]) =>
      `${type}: ${av.count} remaining (${Math.round(av.pct_of_initial * 100)}% of initial) — ${av.status.toUpperCase()}`
    )
    .join('\n')

  const globalCtx = [
    `Oil price: $${state.global_state.oil_price_usd}/barrel`,
    `Hormuz throughput: ${state.global_state.hormuz_throughput_pct}% of normal`,
    `Global economic stress: ${state.global_state.global_economic_stress}/100`,
  ].join('\n')

  const facilities = actor.facility_statuses
    .filter(f => f.actor_id === actorId)
    .map(f => `${f.name}: ${f.status} (${f.capacity_pct}% capacity)`)
    .join('\n')

  return `
CURRENT ACTOR STATE — ${actorId.toUpperCase()}:
${scores}

ASSET INVENTORY:
${assets || '(none tracked)'}

KEY FACILITIES:
${facilities || '(none)'}

GLOBAL CONTEXT:
${globalCtx}

CONSTRAINT RULE: Do not generate alternatives that require assets marked EXHAUSTED.
Flag alternatives requiring CONSTRAINED assets as high-risk and note the supply concern.
`.trim()
}
