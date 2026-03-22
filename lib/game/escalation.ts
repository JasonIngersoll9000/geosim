import type { Actor, Constraint, EscalationRung, EscalationTrigger, Scenario } from '../types/simulation'

// ------------------------------------------------------------
// ESCALATION LADDER LOGIC
// Rules for when actors can escalate, what triggers movement,
// and whether constraints allow it.
// ------------------------------------------------------------

export interface CanEscalateResult {
  allowed: boolean
  blockingConstraints: Constraint[]
  costs: string[]
}

/**
 * Determine whether an actor can escalate to a target rung.
 * Hard constraints with status='active' block escalation entirely.
 * Soft constraints with status='active' allow escalation but impose costs.
 * Constraints with status='removed' or 'weakened' are non-blocking.
 */
export function canEscalateTo(
  actor: Actor,
  targetRung: number,
  _scenario: Scenario
): CanEscalateResult {
  // Find constraints that apply at or below the target rung
  const relevantConstraints = actor.constraints.filter(c => {
    // A constraint applies at targetRung when:
    // - no rung threshold is set (applies globally), OR
    // - targetRung is at or above the constraint's activation rung
    const appliesToRung =
      c.overriddenAtEscalationRung === undefined ||
      targetRung >= c.overriddenAtEscalationRung
    return appliesToRung && c.status !== 'removed'
  })

  const hardBlocks = relevantConstraints.filter(
    c => c.severity === 'hard' && c.status === 'active'
  )
  const softCosts = relevantConstraints.filter(
    c => c.severity === 'soft' && c.status === 'active'
  )

  // Hard constraints first so callers can check [0].severity reliably
  const sortedConstraints = [
    ...hardBlocks,
    ...relevantConstraints.filter(c => c.severity !== 'hard'),
  ]

  return {
    allowed: hardBlocks.length === 0,
    blockingConstraints: sortedConstraints,
    costs: softCosts.map(c => c.description),
  }
}

/**
 * Get all escalation rungs above the actor's current rung that
 * are not blocked by active hard constraints.
 */
export function getAvailableEscalationOptions(
  actor: Actor,
  scenario: Scenario
): EscalationRung[] {
  const { currentRung, rungs } = actor.escalation
  return rungs.filter(r => {
    if (r.level <= currentRung) return false
    const result = canEscalateTo(actor, r.level, scenario)
    return result.allowed
  })
}

/**
 * Get all de-escalation options below the actor's current rung.
 * Cannot de-escalate below an irreversible rung that has been passed.
 */
export function getDeescalationOptions(actor: Actor): EscalationRung[] {
  const { currentRung, rungs } = actor.escalation

  // Find the lowest irreversible rung at or below current rung (if any).
  // If no irreversible rungs have been crossed, floor = 0 (de-escalate freely).
  const irreversibleRungs = rungs.filter(r => r.reversibility === 'irreversible' && r.level <= currentRung)
  const irreversibleFloor = irreversibleRungs.length === 0
    ? 0
    : irreversibleRungs.reduce((min, r) => Math.min(min, r.level), Infinity)

  return rungs.filter(r => r.level < currentRung && r.level >= irreversibleFloor)
}

/**
 * Apply a constraint status change to an actor (immutable — returns new actor).
 * Matches constraints by description substring (case-insensitive).
 */
export function applyConstraintStatusChange(
  actor: Actor,
  descriptionPattern: string,
  newStatus: Constraint['status'],
  eventId: string
): Actor {
  const pattern = descriptionPattern.toLowerCase()
  const updatedConstraints = actor.constraints.map(c => {
    if (pattern === 'any' || c.description.toLowerCase().includes(pattern)) {
      return {
        ...c,
        status: newStatus,
        removedByEventId: eventId,
        statusRationale: `Status changed to ${newStatus} by event ${eventId}`,
      }
    }
    return c
  })

  return {
    ...actor,
    constraints: updatedConstraints,
  }
}

/**
 * Detect escalation skip triggers that are currently active for an actor.
 * Returns triggers where isEscalationSkip=true and conditions are plausible.
 */
export function detectEscalationSkip(
  actor: Actor,
  _scenario: Scenario
): EscalationTrigger[] {
  return actor.escalation.escalationTriggers.filter(
    t => t.isEscalationSkip === true && t.likelihood > 0
  )
}

// ------------------------------------------------------------
// CONSTRAINT CASCADE DETECTION
// Multi-step chains where constraint removal enables escalation.
// ------------------------------------------------------------

export interface CascadeRisk {
  description: string
  ultimateRisk: string
  likelihoodOfFullCascade: number
  triggeredSteps: number
  totalSteps: number
  activeCascades: ActiveCascade[]
}

export interface ActiveCascade {
  id: string
  description: string
  ultimateRisk: string
  likelihoodOfFullCascade: number
  triggeredSteps: number
  totalSteps: number
}

/**
 * Compute the constraint cascade risk for an actor.
 * A cascade is "active" when ≥2 of its steps have been triggered
 * (i.e. the referenced constraints have status !== 'active').
 */
export function getConstraintCascadeRisk(
  actor: Actor,
  _scenario: Scenario
): { activeCascades: ActiveCascade[] } {
  // We detect cascades from the actor's constraints — group constraints
  // that relate to the same ultimate risk (nuclear, in the Iran case).
  // In the full system, cascades would be stored in Scenario.
  // Here we infer them from the actor's constraint set.

  // Group constraints by dimension/theme
  const nuclearRelated = actor.constraints.filter(
    c =>
      c.description.toLowerCase().includes('nuclear') ||
      c.description.toLowerCase().includes('fatwa') ||
      c.description.toLowerCase().includes('religious') ||
      c.description.toLowerCase().includes('deterrence') ||
      c.description.toLowerCase().includes('isolation')
  )

  const activeCascades: ActiveCascade[] = []

  if (nuclearRelated.length >= 2) {
    const removed = nuclearRelated.filter(c => c.status !== 'active')
    const likelihood = Math.min(
      100,
      Math.round((removed.length / nuclearRelated.length) * 100)
    )

    if (removed.length >= 2) {
      activeCascades.push({
        id: `${actor.id}-nuclear-cascade`,
        description: `Nuclear constraint cascade: ${removed.length} of ${nuclearRelated.length} constraints removed`,
        ultimateRisk: 'Nuclear weapons development or deployment',
        likelihoodOfFullCascade: likelihood,
        triggeredSteps: removed.length,
        totalSteps: nuclearRelated.length,
      })
    }
  }

  return { activeCascades }
}
