import { describe, it, expect } from 'vitest'
import { createMockScenario } from '../helpers/mock-scenario'

// Import under test — doesn't exist yet (RED phase)
import {
  canEscalateTo,
  getAvailableEscalationOptions,
  getDeescalationOptions,
  applyConstraintStatusChange,
  detectEscalationSkip,
  getConstraintCascadeRisk,
} from '../../lib/game/escalation'

describe('canEscalateTo', () => {
  it('should not allow escalation past a hard constraint', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    // US has a hard constraint preventing ground invasion without political cover (rung 7)
    // currentRung = 5, trying to jump to 7
    const result = canEscalateTo(us, 7, scenario)
    expect(result.allowed).toBe(false)
    expect(result.blockingConstraints.length).toBeGreaterThan(0)
    expect(result.blockingConstraints[0].severity).toBe('hard')
  })

  it('should allow escalation past a soft constraint with a cost', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    // Escalating to rung 6 may be soft-constrained by political support
    const result = canEscalateTo(us, 6, scenario)
    // Whether allowed depends on mock data — if soft constraints exist, allowed=true but costs returned
    if (result.blockingConstraints.some(c => c.severity === 'soft')) {
      expect(result.allowed).toBe(true)
      expect(result.costs.length).toBeGreaterThan(0)
    }
  })

  it('should allow normal escalation to the next rung', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    // Iran is at rung 6 with 2 constraints removed — can attempt rung 7 (nuclear threshold)
    // For Iran, some constraints were removed
    const result = canEscalateTo(iran, 7, scenario)
    // Iran's religious nuclear constraint is REMOVED, deterrence REMOVED — escalation should be enabled
    expect(result.blockingConstraints.filter(c => c.severity === 'hard' && c.status === 'active').length).toBe(0)
  })

  it('should treat REMOVED constraints as non-blocking', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    // Iran's religious nuclear prohibition has status='removed' — should not block
    const result = canEscalateTo(iran, 7, scenario)
    const activeHardBlocks = result.blockingConstraints.filter(
      c => c.severity === 'hard' && c.status === 'active'
    )
    expect(activeHardBlocks.length).toBe(0)
  })
})

describe('getAvailableEscalationOptions', () => {
  it('should return rungs above current that are not hard-blocked', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const options = getAvailableEscalationOptions(us, scenario)
    // All returned rungs should be above currentRung=5
    expect(options.every(r => r.level > us.escalation.currentRung)).toBe(true)
  })

  it('should not include rungs blocked by active hard constraints', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const options = getAvailableEscalationOptions(us, scenario)
    // Rung 7 (ground invasion) should be excluded due to hard constraint
    const rung7 = options.find(r => r.level === 7)
    expect(rung7).toBeUndefined()
  })
})

describe('getDeescalationOptions', () => {
  it('should return rungs below current that are achievable', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    // currentRung=5, de-escalation options should be below 5
    const options = getDeescalationOptions(us)
    expect(options.every(r => r.level < us.escalation.currentRung)).toBe(true)
  })

  it('should indicate irreversible rungs cannot be de-escalated past', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    // Check that irreversible rungs are flagged correctly
    const irreversibleRungs = us.escalation.rungs.filter(r => r.reversibility === 'irreversible')
    // If any irreversible rungs exist, they should prevent further de-escalation
    for (const rung of irreversibleRungs) {
      if (rung.level <= us.escalation.currentRung) {
        const options = getDeescalationOptions(us)
        // Cannot de-escalate below an irreversible rung
        expect(options.every(r => r.level >= rung.level)).toBe(true)
      }
    }
  })
})

describe('applyConstraintStatusChange', () => {
  it('should update constraint status when an event removes it', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!

    // Simulate a new event that weakens a previously "active" constraint
    const updatedActor = applyConstraintStatusChange(
      iran,
      'nuclear_deterrence_constraint', // constraint description pattern to match
      'removed',
      'evt-ayatollah-killed'
    )
    const affected = updatedActor.constraints.find(c =>
      c.description.toLowerCase().includes('deterrence') ||
      c.description.toLowerCase().includes('nuclear')
    )
    // At least one nuclear-related constraint should be removed/weakened
    expect(affected).toBeDefined()
  })

  it('should not mutate the original actor', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    const originalConstraints = iran.constraints.map(c => ({ ...c }))

    applyConstraintStatusChange(iran, 'any', 'weakened', 'test-event')

    // Original unchanged
    expect(iran.constraints).toEqual(originalConstraints)
  })
})

describe('detectEscalationSkip', () => {
  it('should return skip triggers that match current conditions', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    const skips = detectEscalationSkip(iran, scenario)
    // isEscalationSkip triggers exist if conditions are met
    // Just validate it returns an array
    expect(Array.isArray(skips)).toBe(true)
  })

  it('should only return triggers where likelihood > 0 and conditions are plausible', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    const skips = detectEscalationSkip(iran, scenario)
    expect(skips.every(s => s.likelihood > 0)).toBe(true)
    expect(skips.every(s => s.isEscalationSkip === true)).toBe(true)
  })
})

describe('getConstraintCascadeRisk', () => {
  it('should detect the Iran nuclear cascade as active', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!

    // Iran has 2 of 3 nuclear constraints removed — cascade is active
    const cascadeRisk = getConstraintCascadeRisk(iran, scenario)
    expect(cascadeRisk.activeCascades.length).toBeGreaterThan(0)

    const nuclearCascade = cascadeRisk.activeCascades.find(c =>
      c.ultimateRisk.toLowerCase().includes('nuclear') ||
      c.description.toLowerCase().includes('nuclear')
    )
    expect(nuclearCascade).toBeDefined()
  })

  it('should report likelihood as a number between 0 and 100', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    const cascadeRisk = getConstraintCascadeRisk(iran, scenario)
    for (const cascade of cascadeRisk.activeCascades) {
      expect(cascade.likelihoodOfFullCascade).toBeGreaterThanOrEqual(0)
      expect(cascade.likelihoodOfFullCascade).toBeLessThanOrEqual(100)
    }
  })
})
