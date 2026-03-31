// tests/game/asset-types.test.ts
import { describe, it, expect } from 'vitest'
import type {
  AssetCategory,
  AssetStatus,
  AssetCapability,
  PositionedAsset,
  AssetStateDelta,
  CityImpact,
  City,
  ActorStatusSnapshot,
  CityStateDelta,
} from '@/lib/types/simulation'

describe('PositionedAsset type shape', () => {
  it('accepts a valid US carrier asset', () => {
    const asset: PositionedAsset = {
      id: 'cvn-72',
      scenarioId: 'iran-2026',
      actorId: 'us',
      name: 'USS Abraham Lincoln (CVN-72)',
      shortName: 'CVN-72',
      category: 'naval',
      assetType: 'carrier',
      description: 'Nimitz-class carrier, CSG-12',
      position: { lat: 23.5, lng: 59.5 },
      zone: 'arabian_sea',
      status: 'staged',
      capabilities: [
        { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
        { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
        { name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' },
      ],
      strikeRangeNm: 1200,
      threatRangeNm: 300,
      provenance: 'researched',
      effectiveFrom: '2025-01-01',
      discoveredAt: '2025-08-01T00:00:00Z',
      sourceUrl: 'https://example.com/cvn72',
      sourceDate: '2025-08-01',
      notes: 'Flagship of CSG-12. SM-6 depleted from prior AAW operations.',
    }
    expect(asset.id).toBe('cvn-72')
    expect(asset.category).toBe('naval')
    expect(asset.capabilities).toHaveLength(3)
    expect(asset.capabilities[0].current).toBeLessThanOrEqual(asset.capabilities[0].max)
  })

  it('accepts a valid AssetStateDelta', () => {
    const delta: AssetStateDelta = {
      assetId: 'cvn-72',
      field: 'capabilities',
      previousValue: [{ name: 'SM-6 (AAW)', current: 80, max: 80, unit: 'missiles' }],
      newValue: [{ name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' }],
      cause: 'AAW defense against Shahab salvo',
      turnDate: '2025-10-26',
    }
    expect(delta.field).toBe('capabilities')
    expect(delta.assetId).toBe('cvn-72')
  })

  it('accepts City, CityImpact, ActorStatusSnapshot, CityStateDelta types', () => {
    // Verify types compile correctly
    const impact: CityImpact = {
      category: 'displacement',
      severity: 'severe',
      description: '500,000 residents evacuated',
      estimatedValue: 500000,
      unit: 'people',
      sourceUrl: 'https://example.com',
      sourceDate: '2025-10-15',
    }
    const city: City = {
      id: 'tehran',
      scenarioId: 'iran-2026',
      name: 'Tehran',
      country: 'Iran',
      population: 9400000,
      economicRole: 'Political capital',
      position: { lat: 35.6892, lng: 51.3890 },
      zone: 'central_iran',
      infrastructureNodes: ['military_command'],
      warImpacts: [impact],
      provenance: 'verified',
      sourceUrl: 'https://example.com/tehran',
      sourceDate: '2025-01-01',
    }
    const snap: ActorStatusSnapshot = {
      actorId: 'iran',
      turnDate: '2025-10-15',
      politicalStability: 45,
      economicHealth: 30,
      militaryReadiness: 70,
      publicSupport: 60,
      internationalIsolation: 80,
    }
    const delta: CityStateDelta = {
      cityId: 'isfahan',
      field: 'war_impacts',
      addedImpact: impact,
      cause: 'US strike on Fordow',
      turnDate: '2025-10-26',
    }
    expect(city.id).toBe('tehran')
    expect(snap.politicalStability).toBe(45)
    expect(delta.field).toBe('war_impacts')
  })
})
