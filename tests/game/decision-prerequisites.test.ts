// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type {
  AssetRequirement,
  AssetTransitionEffect,
  CachedResponse,
  BranchWorthiness,
  Decision,
  PositionedAsset,
} from '@/lib/types/simulation'
import { checkPrerequisites, filterDecisionsByAssets } from '@/lib/game/decision-prerequisites'

describe('Extended Decision types', () => {
  it('accepts a Decision with requiredAssets', () => {
    const decision: Decision = {
      id: 'ground-invasion',
      name: 'Conduct Ground Invasion of Southern Iran',
      description: 'Commit ground forces across the Iranian border.',
      dimension: 'military',
      escalationLevel: 8,
      expectedOutcomes: [],
      requiredAssets: [
        {
          category: 'ground',
          requiredStatus: ['staged', 'engaged'],
          requiredZone: 'kuwait',
          minCapability: { name: 'personnel', minCurrent: 50000 },
        },
      ],
      assetTransitions: [],
    }
    expect(decision.requiredAssets).toHaveLength(1)
    expect(decision.requiredAssets![0].requiredZone).toBe('kuwait')
  })

  it('accepts CachedResponse shape', () => {
    const cached: CachedResponse = {
      actorId: 'iran',
      decision: {
        id: 'strait-mining',
        name: 'Mine the Strait of Hormuz',
        description: 'Deploy mines blocking commercial traffic.',
        dimension: 'military',
        escalationLevel: 7,
        expectedOutcomes: [],
        requiredAssets: [],
        assetTransitions: [],
      },
      rationale: 'Asymmetric response maximizing economic pressure on US coalition.',
      escalationDirection: 'up',
      cachedAt: '2025-10-26T12:00:00Z',
    }
    expect(cached.actorId).toBe('iran')
    expect(cached.escalationDirection).toBe('up')
  })

  it('accepts BranchWorthiness shape', () => {
    const bw: BranchWorthiness = {
      score: 85,
      reason: 'First strike on civilian nuclear infrastructure',
      suggestedBranchLabel: "Iran's Response to Fordow Strike",
      alternateResponses: [],
    }
    expect(bw.score).toBeGreaterThanOrEqual(60)
  })
})

const US_CARRIER: PositionedAsset = {
  id: 'cvn-72', scenarioId: 'iran-2026', actorId: 'us',
  name: 'USS Abraham Lincoln', shortName: 'CVN-72',
  category: 'naval', assetType: 'carrier', description: '',
  position: { lat: 23.5, lng: 59.5 }, zone: 'arabian_sea',
  status: 'staged', capabilities: [{ name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' }],
  strikeRangeNm: 1200,
  provenance: 'researched', effectiveFrom: '2025-01-01',
  discoveredAt: '2025-08-01T00:00:00Z', notes: '',
}

const STRIKE_DECISION: Decision = {
  id: 'carrier-strike',
  name: 'Carrier Strike on Fordow',
  description: '',
  dimension: 'military',
  escalationLevel: 8,
  expectedOutcomes: [],
  requiredAssets: [
    { category: 'naval', assetType: 'carrier', requiredStatus: ['staged', 'engaged'] },
  ],
  assetTransitions: [],
}

describe('checkPrerequisites', () => {
  it('returns met: true when carrier is staged', () => {
    const result = checkPrerequisites(STRIKE_DECISION, [US_CARRIER])
    expect(result.met).toBe(true)
    expect(result.unmet).toHaveLength(0)
  })

  it('returns met: false when no carrier exists', () => {
    const result = checkPrerequisites(STRIKE_DECISION, [])
    expect(result.met).toBe(false)
    expect(result.unmet[0]).toMatch(/carrier/)
  })

  it('returns met: false when carrier is mobilizing (not staged/engaged)', () => {
    const mobilizing = { ...US_CARRIER, status: 'mobilizing' as const }
    const result = checkPrerequisites(STRIKE_DECISION, [mobilizing])
    expect(result.met).toBe(false)
    expect(result.unmet[0]).toMatch(/staged|engaged/)
  })

  it('checks zone requirement when specified', () => {
    const decisionRequiringKuwait: Decision = {
      ...STRIKE_DECISION,
      requiredAssets: [{ category: 'ground', requiredStatus: ['staged'], requiredZone: 'kuwait' }],
    }
    const result = checkPrerequisites(decisionRequiringKuwait, [US_CARRIER])
    expect(result.met).toBe(false)
    expect(result.unmet[0]).toMatch(/kuwait/)
  })

  it('checks minCapability', () => {
    const decisionRequiringTomahawks: Decision = {
      ...STRIKE_DECISION,
      requiredAssets: [{
        category: 'naval',
        requiredStatus: ['staged'],
        minCapability: { name: 'Tomahawk TLAM', minCurrent: 100 },
      }],
    }
    const result = checkPrerequisites(decisionRequiringTomahawks, [US_CARRIER])
    expect(result.met).toBe(false)
  })
})

describe('filterDecisionsByAssets', () => {
  it('marks decisions with unmet prerequisites as unavailable', () => {
    const decisions = [STRIKE_DECISION]
    const filtered = filterDecisionsByAssets(decisions, [])
    expect(filtered[0].available).toBe(false)
    expect(filtered[0].unmetReason).toBeTruthy()
  })

  it('marks decisions with met prerequisites as available', () => {
    const decisions = [STRIKE_DECISION]
    const filtered = filterDecisionsByAssets(decisions, [US_CARRIER])
    expect(filtered[0].available).toBe(true)
  })
})
