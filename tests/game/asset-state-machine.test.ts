// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getLeadTurns,
  interpolatePosition,
  applyTransition,
  getTransitingAssets,
} from '@/lib/game/asset-state-machine'
import type { PositionedAsset } from '@/lib/types/simulation'

const BASE_ASSET: PositionedAsset = {
  id: 'cvn-72', scenarioId: 'iran-2026', actorId: 'us',
  name: 'USS Abraham Lincoln', shortName: 'CVN-72',
  category: 'naval', assetType: 'carrier', description: '',
  position: { lat: 23.5, lng: 59.5 }, zone: 'arabian_sea',
  status: 'available', capabilities: [], strikeRangeNm: 1200,
  provenance: 'researched', effectiveFrom: '2025-01-01',
  discoveredAt: '2025-08-01T00:00:00Z', notes: '',
}

describe('canTransition', () => {
  it('allows available → mobilizing', () => {
    expect(canTransition('available', 'mobilizing')).toBe(true)
  })
  it('allows staged → engaged', () => {
    expect(canTransition('staged', 'engaged')).toBe(true)
  })
  it('disallows available → engaged (skipping steps)', () => {
    expect(canTransition('available', 'engaged')).toBe(false)
  })
  it('disallows destroyed → any forward state', () => {
    expect(canTransition('destroyed', 'available')).toBe(false)
    expect(canTransition('destroyed', 'mobilizing')).toBe(false)
  })
  it('allows degraded → destroyed', () => {
    expect(canTransition('degraded', 'destroyed')).toBe(true)
  })
  it('allows any state → withdrawn', () => {
    expect(canTransition('engaged', 'withdrawn')).toBe(true)
    expect(canTransition('staged', 'withdrawn')).toBe(true)
  })
})

describe('getLeadTurns', () => {
  it('returns 0 for ballistic missile launch', () => {
    expect(getLeadTurns('missile_site', 'available', 'engaged')).toBe(0)
  })
  it('returns 2 for carrier group mobilizing', () => {
    expect(getLeadTurns('carrier', 'available', 'mobilizing')).toBe(2)
  })
  it('returns 3 for carrier group transiting', () => {
    expect(getLeadTurns('carrier', 'mobilizing', 'transiting')).toBe(3)
  })
  it('returns 6 for ground brigade CONUS → theater', () => {
    expect(getLeadTurns('ground_brigade_conus', 'mobilizing', 'transiting')).toBe(6)
  })
})

describe('interpolatePosition', () => {
  it('returns start position at progress 0', () => {
    const start = { lat: 23.5, lng: 59.5 }
    const end = { lat: 27.0, lng: 56.0 }
    const result = interpolatePosition(start, end, 0)
    expect(result.lat).toBeCloseTo(23.5)
    expect(result.lng).toBeCloseTo(59.5)
  })
  it('returns end position at progress 1', () => {
    const start = { lat: 23.5, lng: 59.5 }
    const end = { lat: 27.0, lng: 56.0 }
    const result = interpolatePosition(start, end, 1)
    expect(result.lat).toBeCloseTo(27.0)
    expect(result.lng).toBeCloseTo(56.0)
  })
  it('returns midpoint at progress 0.5', () => {
    const start = { lat: 20.0, lng: 60.0 }
    const end = { lat: 30.0, lng: 50.0 }
    const result = interpolatePosition(start, end, 0.5)
    expect(result.lat).toBeCloseTo(25.0, 1)
    expect(result.lng).toBeCloseTo(55.0, 1)
  })
})

describe('applyTransition', () => {
  it('sets status and records transition turn', () => {
    const result = applyTransition(BASE_ASSET, 'mobilizing', 1)
    expect(result.status).toBe('mobilizing')
  })
  it('throws if transition is not allowed', () => {
    expect(() => applyTransition(BASE_ASSET, 'engaged', 1)).toThrow()
  })
})

describe('getTransitingAssets', () => {
  it('filters to only transiting assets', () => {
    const assets: PositionedAsset[] = [
      { ...BASE_ASSET, id: 'asset-1', status: 'transiting' },
      { ...BASE_ASSET, id: 'asset-2', status: 'staged' },
      { ...BASE_ASSET, id: 'asset-3', status: 'transiting' },
      { ...BASE_ASSET, id: 'asset-4', status: 'engaged' },
    ]
    const result = getTransitingAssets(assets)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('asset-1')
    expect(result[1].id).toBe('asset-3')
  })
  it('returns empty array if no assets are transiting', () => {
    const assets: PositionedAsset[] = [
      { ...BASE_ASSET, id: 'asset-1', status: 'staged' },
      { ...BASE_ASSET, id: 'asset-2', status: 'engaged' },
    ]
    const result = getTransitingAssets(assets)
    expect(result).toHaveLength(0)
  })
})
