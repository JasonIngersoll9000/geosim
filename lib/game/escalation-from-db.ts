/**
 * Escalation ladder utilities that work from the database JSONB data stored
 * in actors.escalation_ladder, bridging to the simulation-layer escalation
 * engine (lib/game/escalation.ts).
 *
 * The actors.escalation_ladder column stores a serialized EscalationLadder
 * object (from lib/types/simulation.ts) seeded by the research pipeline.
 * This module parses it, constructs a minimal Actor adapter, and delegates
 * to the canonical escalation engine functions for blocked-rung computation.
 */

import type { Actor, EscalationLadder, EscalationRung } from '@/lib/types/simulation'
import { getDeescalationOptions } from '@/lib/game/escalation'
import type { EscalationRungSummary } from '@/lib/types/panels'

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
 * Parse the actors.escalation_ladder JSONB record into a typed EscalationLadder.
 * Returns null if the record does not conform to the expected schema.
 */
export function parseDbEscalationLadder(
  jsonb: Record<string, unknown> | null | undefined
): EscalationLadder | null {
  if (!jsonb || typeof jsonb !== 'object') return null

  const { currentRung, rungs } = jsonb as {
    currentRung?: unknown
    rungs?: unknown
    escalationTriggers?: unknown
    deescalationConditions?: unknown
  }

  if (!Array.isArray(rungs)) return null

  const parsedRungs: EscalationRung[] = rungs.filter(isEscalationRung)
  if (parsedRungs.length === 0) return null

  return {
    currentRung: typeof currentRung === 'number' ? currentRung : 0,
    rungs: parsedRungs,
    escalationTriggers: [],
    deescalationConditions: [],
  }
}

// ── Minimal Actor adapter ─────────────────────────────────────────────────────

/**
 * Build a minimal Actor stub sufficient to pass to escalation engine functions.
 * Only populates fields referenced by getDeescalationOptions / canEscalateTo:
 *   - actor.id
 *   - actor.escalation (full EscalationLadder)
 *   - actor.constraints (empty — constraint data is not stored in scenario_actors;
 *     hard constraint blocking will be added when constraint data is available)
 */
function buildMinimalActor(actorId: string, ladder: EscalationLadder): Actor {
  return {
    id: actorId,
    escalation: ladder,
    constraints: [],
  } as unknown as Actor
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the full set of EscalationRungSummary entries for the panel, using:
 *   1. Real rung definitions from actors.escalation_ladder (if available)
 *   2. The canonical escalation engine (getDeescalationOptions) for blocked-rung
 *      computation based on irreversible thresholds
 *   3. Falls back to an empty array when no DB ladder data is available
 *
 * @param actorId    Canonical actor ID (e.g., 'iran', 'us')
 * @param dbLadder   Parsed result of parseDbEscalationLadder(), or null
 * @param currentRung The actor's current escalation rung index
 */
export function buildRungSummaries(
  actorId: string,
  dbLadder: EscalationLadder | null,
  currentRung: number
): EscalationRungSummary[] {
  if (!dbLadder || dbLadder.rungs.length === 0) return []

  // Temporarily override currentRung for the computation
  const ladder: EscalationLadder = { ...dbLadder, currentRung }
  const actor = buildMinimalActor(actorId, ladder)

  // Get the set of rungs available for de-escalation from the engine
  const deescalableRungs = new Set(
    getDeescalationOptions(actor).map(r => r.level)
  )

  // Find the lowest irreversible rung already crossed (for blocking label)
  const crossedIrreversible = ladder.rungs
    .filter(r => r.reversibility === 'irreversible' && r.level <= currentRung)
    .map(r => r.level)
  const irreversibleFloor = crossedIrreversible.length > 0 ? Math.min(...crossedIrreversible) : null

  return ladder.rungs.map((rung): EscalationRungSummary => {
    const isBelowFloor =
      irreversibleFloor !== null && rung.level < irreversibleFloor

    return {
      level:         rung.level,
      name:          rung.name,
      description:   rung.description,
      reversibility: rung.reversibility,
      isBlocked:   isBelowFloor || (rung.level < currentRung && !deescalableRungs.has(rung.level)) || undefined,
      blockReason: isBelowFloor
        ? `De-escalation blocked: passed irreversible threshold at rung ${irreversibleFloor}`
        : undefined,
    }
  })
}
