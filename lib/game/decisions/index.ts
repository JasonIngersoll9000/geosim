// lib/game/decisions/index.ts
// Aggregated decision catalog for the Iran 2026 scenario.
// Per-actor catalogs live in sibling files; this index composes them into
// the record shape consumed by turn-helpers.ts::loadDecisionCatalog().
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'
import { US_DECISIONS, US_DECISION_DETAILS } from './united-states'

// Actor IDs match scenario_actors.id values used in scripts/seed-iran.ts.
export type ActorId =
  | 'united_states'
  | 'iran'
  | 'israel'
  | 'russia'
  | 'china'
  | 'gulf_states'

/** Decisions a given actor can choose from each turn, keyed by actor_id. */
export const DECISION_CATALOG: Record<ActorId, DecisionOption[]> = {
  united_states: US_DECISIONS,
  iran: [],
  israel: [],
  russia: [],
  china: [],
  gulf_states: [],
}

/** Detail metadata (rationale, outcomes, concurrency) keyed by actor then decision id. */
export const DECISION_DETAILS: Record<ActorId, Record<string, DecisionDetail>> = {
  united_states: US_DECISION_DETAILS,
  iran: {},
  israel: {},
  russia: {},
  china: {},
  gulf_states: {},
}
