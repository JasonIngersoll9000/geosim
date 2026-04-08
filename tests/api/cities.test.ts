// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type { City, CityImpact, ActorStatusSnapshot, CityStateDelta } from '@/lib/types/simulation'

describe('City types', () => {
  it('accepts a valid City object', () => {
    const city: City = {
      id: 'tehran', scenarioId: 'test', name: 'Tehran', country: 'Iran',
      population: 9400000, economicRole: 'Political capital',
      position: { lat: 35.6892, lng: 51.3890 }, zone: 'central_iran',
      infrastructureNodes: ['military_command'], warImpacts: [],
      provenance: 'researched', sourceUrl: 'https://example.com', sourceDate: '2025-08-01',
    }
    expect(city.id).toBe('tehran')
    expect(city.warImpacts).toHaveLength(0)
  })

  it('accepts a CityImpact', () => {
    const impact: CityImpact = {
      category: 'displacement', severity: 'severe',
      description: '500k evacuated', estimatedValue: 500000, unit: 'people',
    }
    expect(impact.severity).toBe('severe')
  })

  it('accepts an ActorStatusSnapshot', () => {
    const snap: ActorStatusSnapshot = {
      actorId: 'iran', turnDate: '2025-10-15',
      politicalStability: 45, economicHealth: 30, militaryReadiness: 70,
      publicSupport: 60, internationalIsolation: 80,
    }
    expect(snap.politicalStability).toBe(45)
  })

  it('accepts a CityStateDelta', () => {
    const delta: CityStateDelta = {
      cityId: 'isfahan', field: 'war_impacts',
      addedImpact: { category: 'infrastructure', severity: 'moderate', description: 'Power grid disruption' },
      cause: 'US strike on Fordow', turnDate: '2025-10-26',
    }
    expect(delta.field).toBe('war_impacts')
  })
})
