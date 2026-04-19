// lib/game/iran-decisions.ts
// Backwards-compat re-exports. The catalog has moved to lib/game/decisions/.
// Prefer importing from there directly — this module will be removed once
// all consumers migrate.
export { US_DECISIONS as IRAN_DECISIONS } from './decisions/united-states'
export { US_DECISION_DETAILS as IRAN_DECISION_DETAILS } from './decisions/united-states'
