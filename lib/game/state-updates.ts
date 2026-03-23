import type { Actor, Constraint, Event, Scenario } from '../types/simulation'

// ------------------------------------------------------------
// STATE UPDATE APPLICATION
// Immutable state updates: apply event impacts and resolution
// deltas to a Scenario without mutating the original.
// ------------------------------------------------------------

type DeltaOp = { change?: number; set?: unknown }
type ActorDeltaEntry = { actorId: string; deltas: Record<string, DeltaOp> }

// Score fields get clamped to 0-100
const SCORE_FIELDS = new Set([
  'overallReadiness',
  'overallHealth',
  'warCostTolerance',
  'sanctionsExposure',
  'damageLevel',
  'regimeStability',
  'leadershipCohesion',
  'internationalStanding',
  'allianceStrength',
  'isolationRisk',
  'supportForCurrentPolicy',
  'policyInfluence',
  'exposureLevel',
  'signalCapability',
  'humanCapability',
  'cyberCapability',
])

function applyOp(current: unknown, op: DeltaOp, field: string): unknown {
  if (op.set !== undefined) return op.set
  if (typeof current === 'number' && op.change !== undefined) {
    const next = current + op.change
    return SCORE_FIELDS.has(field) ? Math.max(0, Math.min(100, next)) : next
  }
  return current
}

/**
 * Recursively walk an object following `segments` and apply `op` at the leaf.
 * When traversing into an array, the next segment is used as a lookup key
 * matched against the item's `.name` or `.description` property.
 */
function applyNestedPath(
  obj: Record<string, unknown>,
  segments: string[],
  op: DeltaOp
): Record<string, unknown> {
  const [head, ...rest] = segments

  if (rest.length === 0) {
    return { ...obj, [head]: applyOp(obj[head], op, head) }
  }

  const value = obj[head]

  if (Array.isArray(value)) {
    // Next segment is the lookup key (items keyed by .name or .description)
    const lookupKey = rest[0]
    const fieldRest = rest.slice(1)
    const updatedArray = (value as Record<string, unknown>[]).map(item => {
      if (item['name'] === lookupKey || item['description'] === lookupKey) {
        // WARNING: Terminating a path at the array item level (fieldRest.length === 0)
        // is NOT a supported usage pattern. applyOp returns a scalar value and
        // spreading it onto an array item object will produce unexpected results.
        // Always include a field name after the array key in your path, e.g.:
        //   'political.influenceChannels.general_public.supportForCurrentPolicy'
        //                                               ^^^^^^^^^^^^^^^^^^^^^^^^^
        //   NOT: 'political.influenceChannels.general_public' (terminates at item)
        return fieldRest.length === 0
          ? { ...item, ...(applyOp(item, op, lookupKey) as Record<string, unknown>) }
          : applyNestedPath(item, fieldRest, op)
      }
      return item
    })
    return { ...obj, [head]: updatedArray }
  }

  if (value !== null && typeof value === 'object') {
    return {
      ...obj,
      [head]: applyNestedPath(value as Record<string, unknown>, rest, op),
    }
  }

  return obj
}

/** Apply a single delta path to an actor (immutable). */
function applyActorDelta(actor: Actor, path: string, op: DeltaOp): Actor {
  // Special case: constraints.${description}.field
  if (path.startsWith('constraints.')) {
    const parts = path.split('.')
    const description = parts[1]
    const field = parts[2] as keyof Constraint
    const updatedConstraints = actor.constraints.map(c => {
      if (c.description === description) {
        return { ...c, [field]: op.set ?? c[field] }
      }
      return c
    })
    return { ...actor, constraints: updatedConstraints }
  }

  // State dimension paths: military.*, economic.*, political.*, etc.
  const stateDimensions = ['military', 'economic', 'political', 'diplomatic', 'intelligence']
  if (stateDimensions.includes(path.split('.')[0])) {
    const updatedState = applyNestedPath(
      actor.state as unknown as Record<string, unknown>,
      path.split('.'),
      op
    )
    return { ...actor, state: updatedState as unknown as typeof actor.state }
  }

  return actor
}

/**
 * Apply a batch of actor/global deltas to a Scenario.
 * Returns a new Scenario — the original is never mutated.
 *
 * Delta format:
 *   actorId: '__global__' → modifies scenario.globalState
 *   actorId: 'iran'       → modifies the matching actor
 *
 * Path examples:
 *   'military.overallReadiness'                                    { change: -10 }
 *   'oilPricePerBarrel'                                            { set: 160 }
 *   'political.influenceChannels.general_public.supportForCurrentPolicy' { change: -5 }
 *   'constraints.No ground invasion without AUMF.status'            { set: 'weakened' }
 */
export function applyStateUpdates(scenario: Scenario, deltas: ActorDeltaEntry[]): Scenario {
  const updatedGlobal = { ...scenario.globalState }
  let updatedActors = scenario.actors

  for (const { actorId, deltas: actorDeltas } of deltas) {
    if (actorId === '__global__') {
      for (const [path, op] of Object.entries(actorDeltas)) {
        const current = (updatedGlobal as Record<string, unknown>)[path]
        ;(updatedGlobal as Record<string, unknown>)[path] = applyOp(current, op, path)
      }
    } else {
      updatedActors = updatedActors.map(actor => {
        if (actor.id !== actorId) return actor
        let updated = actor
        for (const [path, op] of Object.entries(actorDeltas)) {
          updated = applyActorDelta(updated, path, op)
        }
        return updated
      })
    }
  }

  return { ...scenario, globalState: updatedGlobal, actors: updatedActors }
}

/**
 * Apply all impacts from a single Event to the Scenario (immutable).
 * Also applies any escalation changes specified on the event.
 */
export function applyEventImpact(scenario: Scenario, event: Event): Scenario {
  const updatedActors = scenario.actors.map(actor => {
    let updated = actor

    // Apply field-level impacts
    for (const impact of event.impacts) {
      if (impact.actorId !== actor.id) continue
      const path = `${impact.dimension}.${impact.field}`
      const op: DeltaOp = { set: impact.newValue as number }
      updated = applyActorDelta(updated, path, op)
    }

    // Apply escalation rung changes
    if (event.escalationChanges) {
      for (const change of event.escalationChanges) {
        if (change.actorId !== actor.id) continue
        updated = {
          ...updated,
          escalation: { ...updated.escalation, currentRung: change.newRung },
        }
      }
    }

    return updated
  })

  return { ...scenario, actors: updatedActors }
}
