import { describe, it, expect } from 'vitest'
import type { VerificationStatus, SeedEvent, Event, EventImpact } from '../../lib/types/simulation'

describe('VerificationStatus', () => {
  it('accepts all valid values', () => {
    const v1: VerificationStatus = 'verified'
    const v2: VerificationStatus = 'researched'
    const v3: VerificationStatus = 'inferred'
    expect(v1).toBe('verified')
    expect(v2).toBe('researched')
    expect(v3).toBe('inferred')
  })
})

describe('SeedEvent', () => {
  it('requires verificationStatus field', () => {
    const seedEvent: SeedEvent = {
      id: 'evt_test',
      timestamp: '2026-02-28',
      title: 'Test event',
      description: 'Test description',
      initiatedBy: 'us',
      targetedActors: ['iran'],
      dimension: 'military',
      impacts: [],
      verificationStatus: 'verified',
    }
    expect(seedEvent.verificationStatus).toBe('verified')
  })

  it('accepts all VerificationStatus values', () => {
    const base = {
      id: 'evt_test',
      timestamp: '2026-02-28',
      title: 'Test',
      description: 'Test',
      initiatedBy: 'us',
      targetedActors: [],
      dimension: 'military' as const,
      impacts: [],
    }
    const e1: SeedEvent = { ...base, verificationStatus: 'verified' }
    const e2: SeedEvent = { ...base, verificationStatus: 'researched' }
    const e3: SeedEvent = { ...base, verificationStatus: 'inferred' }
    expect(e1.verificationStatus).toBe('verified')
    expect(e2.verificationStatus).toBe('researched')
    expect(e3.verificationStatus).toBe('inferred')
  })
})

describe('Event', () => {
  it('allows optional verificationStatus', () => {
    const eventWithStatus: Event = {
      id: 'evt_test',
      timestamp: '2026-02-28',
      title: 'Test',
      description: 'Test',
      initiatedBy: 'us',
      targetedActors: [],
      dimension: 'military',
      impacts: [],
      verificationStatus: 'researched',
    }
    const eventWithout: Event = {
      id: 'evt_test2',
      timestamp: '2026-02-28',
      title: 'Test2',
      description: 'Test2',
      initiatedBy: 'iran',
      targetedActors: [],
      dimension: 'economic',
      impacts: [],
    }
    expect(eventWithStatus.verificationStatus).toBe('researched')
    expect(eventWithout.verificationStatus).toBeUndefined()
  })
})

describe('EventImpact', () => {
  it('allows optional verificationStatus', () => {
    const impactWithStatus: EventImpact = {
      actorId: 'us',
      dimension: 'military',
      field: 'overallReadiness',
      description: 'Test impact',
      magnitude: 'major',
      verificationStatus: 'verified',
    }
    const impactWithout: EventImpact = {
      actorId: 'iran',
      dimension: 'economic',
      field: 'overallHealth',
      description: 'Test impact 2',
      magnitude: 'minor',
    }
    expect(impactWithStatus.verificationStatus).toBe('verified')
    expect(impactWithout.verificationStatus).toBeUndefined()
  })
})
