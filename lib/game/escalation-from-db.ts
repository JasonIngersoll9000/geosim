/**
 * Escalation ladder utilities that work from the database JSONB data stored
 * in actors.escalation_ladder, bridging to the simulation-layer escalation
 * engine (lib/game/escalation.ts).
 *
 * The actors.escalation_ladder column stores a serialized EscalationLadder
 * object (from lib/types/simulation.ts) seeded by the research pipeline.
 * This module parses it and uses the same algorithm as getDeescalationOptions()
 * in escalation.ts to compute blocked-rung state — without the `Actor` type
 * dependency, since panel-layer data does not carry the full simulation graph.
 *
 * Note on constraints:
 *   Actor.constraints[] is not stored in scenario_actors.  When the actors
 *   table constraint data becomes available, wire it in here to enable the
 *   full canEscalateTo() check.  Until then, blocking is irreversibility-based.
 */

import type { EscalationRung } from '@/lib/types/simulation'
import type { EscalationRungSummary } from '@/lib/types/panels'

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

// ── De-escalation blocking logic ─────────────────────────────────────────────

/**
 * Compute which rungs below `currentRung` are available for de-escalation.
 *
 * Mirrors the algorithm in escalation.ts getDeescalationOptions():
 *   "Cannot de-escalate below an irreversible rung that has been passed."
 *
 * Returns the set of rung levels that CAN be de-escalated to.
 * Note: When Actor.constraints[] data becomes available in the DB, add a
 * canEscalateTo() check here to enable constraint-based blocking.
 */
function computeDeescalableRungs(ladder: ParsedLadder, currentRung: number): Set<number> {
  const { rungs } = ladder

  // Mirror of getDeescalationOptions() algorithm — no Actor type needed
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
 *      blocked-rung computation based on irreversible threshold crossings
 *   3. Returns an empty array when no DB ladder data is available
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

  return dbLadder.rungs.map((rung): EscalationRungSummary => {
    const isBelowFloor =
      irreversibleFloor !== null && rung.level < irreversibleFloor
    const isBlockedByIrreversibility =
      rung.level < currentRung && !deescalable.has(rung.level)

    const isBlocked = isBelowFloor || isBlockedByIrreversibility || undefined

    return {
      level:         rung.level,
      name:          rung.name,
      description:   rung.description,
      reversibility: rung.reversibility,
      isBlocked:   isBlocked,
      blockReason: isBelowFloor
        ? `De-escalation blocked: irreversible threshold crossed at rung ${irreversibleFloor}`
        : isBlockedByIrreversibility
          ? 'De-escalation unavailable from current position'
          : undefined,
    }
  })
}

