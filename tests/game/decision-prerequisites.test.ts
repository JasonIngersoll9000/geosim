// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type {
  AssetRequirement,
  AssetTransitionEffect,
  CachedResponse,
  BranchWorthiness,
  Decision,
} from '@/lib/types/simulation'

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
