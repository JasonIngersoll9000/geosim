import { describe, it, expect } from 'vitest'
import { createMockScenario } from '../helpers/mock-scenario'
import type { Event } from '../../lib/types/simulation'

// Import under test — doesn't exist yet (RED phase)
import { applyStateUpdates, applyEventImpact } from '../../lib/game/state-updates'

describe('applyStateUpdates', () => {
  it('should update military readiness from event impacts', () => {
    const scenario = createMockScenario()
    const deltas = [
      {
        actorId: 'iran',
        deltas: {
          'military.overallReadiness': { change: -10 },
        },
      },
    ]
    const updated = applyStateUpdates(scenario, deltas)
    const iran = updated.actors.find(a => a.id === 'iran')!
    const originalIran = scenario.actors.find(a => a.id === 'iran')!
    expect(iran.state.military.overallReadiness).toBe(originalIran.state.military.overallReadiness - 10)
  })

  it('should update oil price from energy events', () => {
    const scenario = createMockScenario()
    const deltas = [{ actorId: '__global__', deltas: { 'oilPricePerBarrel': { set: 160 } } }]
    const updated = applyStateUpdates(scenario, deltas)
    expect(updated.globalState.oilPricePerBarrel).toBe(160)
  })

  it('should update domestic support from political events', () => {
    const scenario = createMockScenario()
    // Find a political influence channel on US that has supportForCurrentPolicy
    const usOriginal = scenario.actors.find(a => a.id === 'united_states')!
    const publicChannel = usOriginal.state.political.influenceChannels.find(
      c => c.name === 'general_public'
    )!
    const originalSupport = publicChannel.supportForCurrentPolicy

    const deltas = [
      {
        actorId: 'united_states',
        deltas: { 'political.influenceChannels.general_public.supportForCurrentPolicy': { change: -5 } },
      },
    ]
    const updated = applyStateUpdates(scenario, deltas)
    const usUpdated = updated.actors.find(a => a.id === 'united_states')!
    const updatedChannel = usUpdated.state.political.influenceChannels.find(
      c => c.name === 'general_public'
    )!
    expect(updatedChannel.supportForCurrentPolicy).toBe(originalSupport - 5)
  })

  it('should mark a constraint as weakened when specified in deltas', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const activeConstraint = us.constraints.find(c => c.status === 'active')!

    const deltas = [
      {
        actorId: 'united_states',
        deltas: {
          [`constraints.${activeConstraint.description}.status`]: { set: 'weakened' },
        },
      },
    ]
    const updated = applyStateUpdates(scenario, deltas)
    const usUpdated = updated.actors.find(a => a.id === 'united_states')!
    const constraint = usUpdated.constraints.find(c => c.description === activeConstraint.description)!
    expect(constraint.status).toBe('weakened')
  })

  it('should NOT mutate the original scenario object', () => {
    const scenario = createMockScenario()
    const originalOil = scenario.globalState.oilPricePerBarrel
    const originalIranReadiness = scenario.actors.find(a => a.id === 'iran')!.state.military.overallReadiness

    const deltas = [
      { actorId: '__global__', deltas: { 'oilPricePerBarrel': { set: 200 } } },
      { actorId: 'iran', deltas: { 'military.overallReadiness': { change: -20 } } },
    ]
    applyStateUpdates(scenario, deltas)

    // Originals must be unchanged
    expect(scenario.globalState.oilPricePerBarrel).toBe(originalOil)
    expect(scenario.actors.find(a => a.id === 'iran')!.state.military.overallReadiness).toBe(originalIranReadiness)
  })

  it('should handle multiple actor deltas in one call', () => {
    const scenario = createMockScenario()
    const iranOriginal = scenario.actors.find(a => a.id === 'iran')!
    const usOriginal = scenario.actors.find(a => a.id === 'united_states')!

    const deltas = [
      { actorId: 'iran', deltas: { 'military.overallReadiness': { change: -5 } } },
      { actorId: 'united_states', deltas: { 'military.overallReadiness': { change: -3 } } },
    ]
    const updated = applyStateUpdates(scenario, deltas)

    expect(updated.actors.find(a => a.id === 'iran')!.state.military.overallReadiness)
      .toBe(iranOriginal.state.military.overallReadiness - 5)
    expect(updated.actors.find(a => a.id === 'united_states')!.state.military.overallReadiness)
      .toBe(usOriginal.state.military.overallReadiness - 3)
  })

  it('should clamp score values to the 0-100 range', () => {
    const scenario = createMockScenario()
    // Push readiness below 0
    const deltas = [{ actorId: 'iran', deltas: { 'military.overallReadiness': { change: -1000 } } }]
    const updated = applyStateUpdates(scenario, deltas)
    expect(updated.actors.find(a => a.id === 'iran')!.state.military.overallReadiness).toBeGreaterThanOrEqual(0)
  })

  it('should clamp score fields to 100 when a change would exceed 100', () => {
    const scenario = createMockScenario()
    // A change of +1000 on any score field must be clamped to 100, not 1000+
    const deltas = [{ actorId: 'iran', deltas: { 'military.overallReadiness': { change: +1000 } } }]
    const updated = applyStateUpdates(scenario, deltas)
    const readiness = updated.actors.find(a => a.id === 'iran')!.state.military.overallReadiness
    expect(readiness).toBeLessThanOrEqual(100)
    expect(readiness).toBe(100)
  })

  it('should silently ignore deltas for unknown actorId', () => {
    const scenario = createMockScenario()
    // 'nonexistent_actor' does not exist in the mock scenario
    const deltas = [
      { actorId: 'nonexistent_actor', deltas: { 'military.overallReadiness': { change: -50 } } },
    ]
    const updated = applyStateUpdates(scenario, deltas)
    // Scenario actors and global state should be identical to original
    expect(updated.actors).toEqual(scenario.actors)
    expect(updated.globalState).toEqual(scenario.globalState)
  })
})

describe('applyEventImpact', () => {
  it('should apply a critical military impact to the targeted actor', () => {
    const scenario = createMockScenario()
    const iranBefore = scenario.actors.find(a => a.id === 'iran')!.state.military.overallReadiness

    const event: Event = {
      id: 'test-strike',
      timestamp: '2026-03-22',
      title: 'Test strike',
      description: 'Strikes on Iran military infrastructure',
      initiatedBy: 'united_states',
      targetedActors: ['iran'],
      dimension: 'military',
      impacts: [
        {
          actorId: 'iran',
          dimension: 'military',
          field: 'overallReadiness',
          previousValue: iranBefore,
          newValue: iranBefore - 8,
          description: 'Sustained strike degraded readiness',
          magnitude: 'major',
        },
      ],
    }

    const updated = applyEventImpact(scenario, event)
    const iranAfter = updated.actors.find(a => a.id === 'iran')!
    expect(iranAfter.state.military.overallReadiness).toBe(iranBefore - 8)
  })

  it('should update escalation rung when event specifies an escalation change', () => {
    const scenario = createMockScenario()
    const iranBefore = scenario.actors.find(a => a.id === 'iran')!.escalation.currentRung

    const event: Event = {
      id: 'test-escalation-event',
      timestamp: '2026-03-22',
      title: 'Escalation event',
      description: 'Iran escalates',
      initiatedBy: 'iran',
      targetedActors: ['united_states'],
      dimension: 'military',
      impacts: [],
      escalationChanges: [
        { actorId: 'iran', previousRung: iranBefore, newRung: iranBefore + 1, rationale: 'Test escalation' },
      ],
    }

    const updated = applyEventImpact(scenario, event)
    const iranAfter = updated.actors.find(a => a.id === 'iran')!
    expect(iranAfter.escalation.currentRung).toBe(iranBefore + 1)
  })

  it('should not mutate the original scenario', () => {
    const scenario = createMockScenario()
    const originalReadiness = scenario.actors.find(a => a.id === 'iran')!.state.military.overallReadiness

    const event: Event = {
      id: 'test',
      timestamp: '2026-03-22',
      title: 'Test',
      description: '',
      initiatedBy: 'united_states',
      targetedActors: ['iran'],
      dimension: 'military',
      impacts: [
        { actorId: 'iran', dimension: 'military', field: 'overallReadiness', previousValue: originalReadiness, newValue: 10, description: '', magnitude: 'critical' },
      ],
    }

    applyEventImpact(scenario, event)
    expect(scenario.actors.find(a => a.id === 'iran')!.state.military.overallReadiness).toBe(originalReadiness)
  })
})
