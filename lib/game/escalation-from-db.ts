/**
 * Escalation ladder utilities that work from the database JSONB data stored
 * in actors.escalation_ladder, bridging to the simulation-layer escalation
 * engine (lib/game/escalation.ts).
 *
 * The actors.escalation_ladder column stores a serialized EscalationLadder
 * object (from lib/types/simulation.ts) seeded by the research pipeline.
 * This module parses it and applies:
 *   1. The same algorithm as getDeescalationOptions() in escalation.ts for
 *      irreversibility-based de-escalation blocking.
 *   2. The same constraint-checking logic as canEscalateTo() in escalation.ts
 *      for hard-constraint-based escalation blocking — sourced from the static
 *      IRAN_SCENARIO_CONSTRAINTS registry (lib/scenarios/iran/initial-state.ts),
 *      which holds the same Constraint[] data embedded in IRAN_INITIAL_STATE.
 *
 * Note: IRAN_SCENARIO_CONSTRAINTS carries the initial-state constraint status.
 *   Dynamic constraint mutations (e.g. Iran's fatwa removal at Day 1) are
 *   reflected in the 'removed'/'weakened' status already baked into the exported
 *   arrays — so a 'removed' hard constraint does NOT block escalation.
 */

import type { Constraint, EscalationRung } from '@/lib/types/simulation'
import type { EscalationRungSummary } from '@/lib/types/panels'
import { IRAN_SCENARIO_CONSTRAINTS } from '@/lib/scenarios/iran/initial-state'
import { norm } from '@/lib/game/actor-meta'

// ── EscalationLadder subset (no full simulation graph required) ───────────────

interface ParsedLadder {
  currentRung: number
  rungs: EscalationRung[]
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function isEscalationRung(v: unknown): v is EscalationRung {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as EscalationRung).level === 'number' &&
    typeof (v as EscalationRung).name  === 'string' &&
    typeof (v as EscalationRung).reversibility === 'string'
  )
}

/**
 * Parse the actors.escalation_ladder JSONB record into a typed ParsedLadder.
 * Returns null if the record does not conform to the expected schema.
 */
export function parseDbEscalationLadder(
  jsonb: Record<string, unknown> | null | undefined
): ParsedLadder | null {
  if (!jsonb || typeof jsonb !== 'object') return null

  const { currentRung, rungs } = jsonb as {
    currentRung?: unknown
    rungs?: unknown
  }

  if (!Array.isArray(rungs)) return null

  const parsedRungs: EscalationRung[] = rungs.filter(isEscalationRung)
  if (parsedRungs.length === 0) return null

  return {
    currentRung: typeof currentRung === 'number' ? currentRung : 0,
    rungs: parsedRungs,
  }
}

// ── Constraint-based escalation blocking ────────────────────────────────────

/**
 * Return the active hard constraints that block escalation to targetRung.
 * Mirrors the hard-block check in canEscalateTo() from escalation.ts:
 *   "Hard constraints with status='active' block escalation entirely."
 *
 * A constraint applies at targetRung when:
 *   - no rung threshold set (applies globally), OR
 *   - targetRung >= constraint.overriddenAtEscalationRung
 *
 * Constraints whose status is 'removed' or 'weakened' are non-blocking.
 */
function getActiveHardConstraints(
  constraints: Constraint[],
  targetRung: number
): Constraint[] {
  return constraints.filter(c => {
    if (c.severity !== 'hard' || c.status !== 'active') return false
    const appliesToRung =
      c.overriddenAtEscalationRung === undefined ||
      targetRung >= c.overriddenAtEscalationRung
    return appliesToRung
  })
}

// ── De-escalation blocking logic ─────────────────────────────────────────────

/**
 * Compute which rungs below `currentRung` are available for de-escalation.
 *
 * Mirrors the algorithm in escalation.ts getDeescalationOptions():
 *   "Cannot de-escalate below an irreversible rung that has been passed."
 *
 * Returns the set of rung levels that CAN be de-escalated to.
 */
function computeDeescalableRungs(ladder: ParsedLadder, currentRung: number): Set<number> {
  const { rungs } = ladder

  const irreversibleRungs = rungs.filter(
    r => r.reversibility === 'irreversible' && r.level <= currentRung
  )
  const irreversibleFloor =
    irreversibleRungs.length === 0
      ? 0
      : irreversibleRungs.reduce((min, r) => Math.min(min, r.level), Infinity)

  return new Set(
    rungs
      .filter(r => r.level < currentRung && r.level >= irreversibleFloor)
      .map(r => r.level)
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the full set of EscalationRungSummary entries for the panel, using:
 *   1. Real rung definitions from actors.escalation_ladder (if available)
 *   2. The same algorithm as escalation.ts getDeescalationOptions() for
 *      irreversibility-based de-escalation blocking
 *   3. The same constraint-check logic as canEscalateTo() in escalation.ts,
 *      with real constraint descriptions surfaced in blockReason labels
 *   4. Returns an empty array when no DB ladder data is available
 *
 * @param actorId    Canonical actor ID (e.g., 'iran', 'us')
 * @param dbLadder   Parsed result of parseDbEscalationLadder(), or null
 * @param currentRung The actor's current escalation rung index
 */
export function buildRungSummaries(
  actorId: string,
  dbLadder: ParsedLadder | null,
  currentRung: number
): EscalationRungSummary[] {
  if (!dbLadder || dbLadder.rungs.length === 0) return []

  const ladderWithCurrent: ParsedLadder = { ...dbLadder, currentRung }
  const deescalable = computeDeescalableRungs(ladderWithCurrent, currentRung)

  // Lowest irreversible rung already crossed — needed for block reason label
  const crossedIrreversible = dbLadder.rungs
    .filter(r => r.reversibility === 'irreversible' && r.level <= currentRung)
    .map(r => r.level)
  const irreversibleFloor =
    crossedIrreversible.length > 0 ? Math.min(...crossedIrreversible) : null

  // Look up static constraints for this actor from the scenario constraint registry
  const canonicalId = norm(actorId)
  const actorConstraints: Constraint[] = IRAN_SCENARIO_CONSTRAINTS[canonicalId] ?? []

  return dbLadder.rungs.map((rung): EscalationRungSummary => {
    const isBelowFloor =
      irreversibleFloor !== null && rung.level < irreversibleFloor
    const isBlockedByIrreversibility =
      rung.level < currentRung && !deescalable.has(rung.level)

    // Check hard constraints that would block escalation to this rung
    // (mirrors canEscalateTo() in escalation.ts)
    const hardBlocks = rung.level > currentRung
      ? getActiveHardConstraints(actorConstraints, rung.level)
      : []
    const isBlockedByConstraint = hardBlocks.length > 0

    const isBlocked = isBelowFloor || isBlockedByIrreversibility || isBlockedByConstraint || undefined

    // Build a human-readable blockReason that surfaces the constraint label
    let blockReason: string | undefined
    if (isBelowFloor) {
      blockReason = `De-escalation blocked: irreversible threshold crossed at rung ${irreversibleFloor}`
    } else if (isBlockedByIrreversibility) {
      blockReason = 'De-escalation unavailable from current position'
    } else if (isBlockedByConstraint) {
      const labels = hardBlocks.map(c => c.description).join('; ')
      blockReason = `Hard constraint: ${labels}`
    }

    return {
      level:         rung.level,
      name:          rung.name,
      description:   rung.description,
      reversibility: rung.reversibility,
      isBlocked,
      blockReason,
    }
  })
}
