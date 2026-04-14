import { describe, it, expect } from 'vitest'
import { detectConstraintCascades, checkPrerequisites } from '../../lib/game/decision-prerequisites'
import type { DecisionOption } from '../../lib/types/panels'
import type { PositionedAsset } from '../../lib/types/simulation'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAsset(assetType: string, status: PositionedAsset['status'] = 'available'): PositionedAsset {
  return {
    id:            `us:${assetType}`,
    scenarioId:    'sc-iran',
    actorId:       'us',
    name:          assetType,
    shortName:     assetType.slice(0, 8),
    category:      'missile',
    assetType,
    description:   '',
    position:      { lat: 0, lng: 0 },
    zone:          'default',
    status,
    capabilities:  [],
    provenance:    'inferred',
    effectiveFrom: '2026-03-22',
    discoveredAt:  '2026-03-22',
    notes:         '',
  }
}

function makeDecision(id: string, requiredAssetType?: string): DecisionOption {
  return {
    id,
    title: `Decision ${id}`,
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    requiredAssets: requiredAssetType
      ? [{ assetType: requiredAssetType, requiredStatus: ['available'] }]
      : undefined,
  }
}

// ─── checkPrerequisites ────────────────────────────────────────────────────────

describe('checkPrerequisites', () => {
  it('returns met=true when decision has no requiredAssets', () => {
    const decision = makeDecision('no-prereq')
    const result = checkPrerequisites(decision, [])
    expect(result.met).toBe(true)
    expect(result.unmet).toHaveLength(0)
  })

  it('returns met=true when required asset is available', () => {
    const decision = makeDecision('needs-missile', 'tomahawk')
    const assets = [makeAsset('tomahawk', 'available')]
    expect(checkPrerequisites(decision, assets).met).toBe(true)
  })

  it('returns met=false when required asset is destroyed', () => {
    const decision = makeDecision('needs-missile', 'tomahawk')
    const assets = [makeAsset('tomahawk', 'destroyed')]
    const result = checkPrerequisites(decision, assets)
    expect(result.met).toBe(false)
    expect(result.unmet.length).toBeGreaterThan(0)
  })

  it('returns met=false when required asset is absent', () => {
    const decision = makeDecision('needs-missile', 'tomahawk')
    const result = checkPrerequisites(decision, [])
    expect(result.met).toBe(false)
  })
})

// ─── detectConstraintCascades ─────────────────────────────────────────────────

describe('detectConstraintCascades', () => {
  it('returns empty array when no decisions have prerequisites', () => {
    const decisions = [makeDecision('d1'), makeDecision('d2')]
    const cascades = detectConstraintCascades(decisions, [], [])
    expect(cascades).toHaveLength(0)
  })

  it('detects a decision that flipped from blocked → available', () => {
    const decisions = [makeDecision('expand-air', 'tomahawk')]
    const before = [makeAsset('tomahawk', 'destroyed')]  // blocked before
    const after  = [makeAsset('tomahawk', 'available')]  // available after

    const cascades = detectConstraintCascades(decisions, before, after)
    expect(cascades).toHaveLength(1)
    expect(cascades[0].decisionId).toBe('expand-air')
    expect(cascades[0].previouslyBlocked).toBe(true)
    expect(cascades[0].nowAvailable).toBe(true)
    expect(cascades[0].previousBlockReasons.length).toBeGreaterThan(0)
  })

  it('does NOT include decisions that were already available before', () => {
    const decisions = [makeDecision('expand-air', 'tomahawk')]
    const before = [makeAsset('tomahawk', 'available')]
    const after  = [makeAsset('tomahawk', 'available')]
    const cascades = detectConstraintCascades(decisions, before, after)
    expect(cascades).toHaveLength(0)
  })

  it('does NOT include decisions that remain blocked after resolution', () => {
    const decisions = [makeDecision('expand-air', 'tomahawk')]
    const before = [makeAsset('tomahawk', 'destroyed')]
    const after  = [makeAsset('tomahawk', 'destroyed')]
    const cascades = detectConstraintCascades(decisions, before, after)
    expect(cascades).toHaveLength(0)
  })

  it('handles multiple decisions independently', () => {
    const decisions = [
      makeDecision('air',   'tomahawk'),
      makeDecision('naval', 'carrier'),
      makeDecision('noReq'),
    ]
    const before = [makeAsset('tomahawk', 'destroyed'), makeAsset('carrier', 'available')]
    const after  = [makeAsset('tomahawk', 'available'),  makeAsset('carrier', 'available')]

    const cascades = detectConstraintCascades(decisions, before, after)
    expect(cascades).toHaveLength(1)
    expect(cascades[0].decisionId).toBe('air')
  })

  it('includes cascade title from decision', () => {
    const decisions = [makeDecision('special-ops', 'carrier')]
    const before = [makeAsset('carrier', 'destroyed')]
    const after  = [makeAsset('carrier', 'available')]
    const cascades = detectConstraintCascades(decisions, before, after)
    expect(cascades[0].decisionTitle).toBe('Decision special-ops')
  })
})
