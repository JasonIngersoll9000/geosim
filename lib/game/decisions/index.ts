// lib/game/decisions/index.ts
// Aggregated decision catalog for the Iran 2026 scenario.
// Per-actor catalogs live in sibling files; this index composes them into
// the record shape consumed by turn-helpers.ts::loadDecisionCatalog().
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'
import { US_DECISIONS, US_DECISION_DETAILS } from './united-states'
import { IL_DECISIONS, IL_DECISION_DETAILS } from './israel'
import { IR_DECISIONS, IR_DECISION_DETAILS } from './iran'
import { RU_DECISIONS, RU_DECISION_DETAILS } from './russia'
import { CN_DECISIONS, CN_DECISION_DETAILS } from './china'
import { GCC_DECISIONS, GCC_DECISION_DETAILS } from './gulf-states'

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
  iran: IR_DECISIONS,
  israel: IL_DECISIONS,
  russia: RU_DECISIONS,
  china: CN_DECISIONS,
  gulf_states: GCC_DECISIONS,
}

/** Detail metadata (rationale, outcomes, concurrency) keyed by actor then decision id. */
export const DECISION_DETAILS: Record<ActorId, Record<string, DecisionDetail>> = {
  united_states: US_DECISION_DETAILS,
  iran: IR_DECISION_DETAILS,
  israel: IL_DECISION_DETAILS,
  russia: RU_DECISION_DETAILS,
  china: CN_DECISION_DETAILS,
  gulf_states: GCC_DECISION_DETAILS,
}
