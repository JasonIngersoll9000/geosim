import { describe, it, expect } from 'vitest'
import { createMockScenario, createMockDecisions, createMockTurnPlan } from '../helpers/mock-scenario'
import type { TurnPlan, PlannedAction } from '../../lib/types/simulation'

// Import under test — doesn't exist yet (RED phase)
import { validateTurnPlan } from '../../lib/game/turn-plan'

describe('validateTurnPlan — concurrency rules', () => {
  it('should allow a compatible light + light combination', () => {
    const scenario = createMockScenario()
    const decisions = createMockDecisions('united_states')
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!    // light
    const intelOp = decisions.find(d => d.id === 'dec-intel-op')!       // moderate — use as light proxy

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: sanctions.id, selectedProfile: null, resourcePercent: 60 },
      concurrentActions: [{ decisionId: intelOp.id, selectedProfile: null, resourcePercent: 40 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.errors.filter(e => e.includes('incompatible'))).toHaveLength(0)
  })

  it('should allow heavy primary + light concurrent', () => {
    const scenario = createMockScenario()
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!  // heavy
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!       // light

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 70 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 30 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.errors.filter(e => e.includes('incompatible'))).toHaveLength(0)
  })

  it('should reject a "total" primary with any concurrent action', () => {
    const decisions = createMockDecisions('united_states')
    const groundOp = decisions.find(d => d.id === 'dec-ground-op')!   // total
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: groundOp.id, selectedProfile: null, resourcePercent: 80 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 20 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.toLowerCase().includes('total'))).toBe(true)
  })

  it('should reject explicitly incompatible action pairs', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!   // incompatible with ceasefire
    const ceasefire = decisions.find(d => d.id === 'dec-ceasefire')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 70 },
      concurrentActions: [{ decisionId: ceasefire.id, selectedProfile: null, resourcePercent: 30 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('incompatible'))).toBe(true)
  })

  it('should accept explicitly compatible action pairs', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!  // compatible with sanctions
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 70 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 30 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.errors.filter(e => e.includes('incompatible'))).toHaveLength(0)
  })
})

describe('validateTurnPlan — resource allocation', () => {
  it('should require allocation summing to exactly 100%', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 70 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 30 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.resourceUtilization).toBe(100)
  })

  it('should reject allocation over 100%', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 80 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 40 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('100'))).toBe(true)
  })

  it('should reject 0% allocation to any selected action', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 100 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 0 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('0%') || e.includes('zero'))).toBe(true)
  })

  it('should emit a warning when primary action gets less than 50%', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!
    const intelOp = decisions.find(d => d.id === 'dec-intel-op')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 40 },
      concurrentActions: [
        { decisionId: sanctions.id, selectedProfile: null, resourcePercent: 30 },
        { decisionId: intelOp.id, selectedProfile: null, resourcePercent: 30 },
      ],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.warnings.some(w => w.toLowerCase().includes('primary'))).toBe(true)
  })
})

describe('validateTurnPlan — synergy and tension detection', () => {
  it('should detect synergies between paired compatible actions', () => {
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!
    const sanctions = decisions.find(d => d.id === 'dec-sanctions')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 70 },
      concurrentActions: [{ decisionId: sanctions.id, selectedProfile: null, resourcePercent: 30 }],
    }
    const result = validateTurnPlan(plan, decisions)
    // air-campaign synergiesWith sanctions
    expect(result.synergies.length).toBeGreaterThan(0)
    expect(result.synergies[0].actions).toContain('dec-air-campaign')
    expect(result.synergies[0].actions).toContain('dec-sanctions')
  })

  it('should detect tension between ceasefire + air-campaign if somehow combined', () => {
    // Even though this combination is "incompatible" (error), tensions should be reported too
    const decisions = createMockDecisions('united_states')
    const airCampaign = decisions.find(d => d.id === 'dec-air-campaign')!
    const ceasefire = decisions.find(d => d.id === 'dec-ceasefire')!

    const plan: TurnPlan = {
      actorId: 'united_states',
      primaryAction: { decisionId: airCampaign.id, selectedProfile: null, resourcePercent: 70 },
      concurrentActions: [{ decisionId: ceasefire.id, selectedProfile: null, resourcePercent: 30 }],
    }
    const result = validateTurnPlan(plan, decisions)
    expect(result.tensions.length).toBeGreaterThan(0)
  })
})

describe('validateTurnPlan — valid plan passes', () => {
  it('should return valid=true for the mock default TurnPlan', () => {
    const decisions = createMockDecisions('united_states')
    const plan = createMockTurnPlan('united_states')
    const result = validateTurnPlan(plan, decisions)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.resourceUtilization).toBe(100)
  })
})
