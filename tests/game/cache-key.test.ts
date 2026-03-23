import { describe, it, expect } from 'vitest'
import { computeCacheKey, type ActorDecision } from '../../lib/game/cache-key'

describe('computeCacheKey', () => {
  const parentId = 'parent-commit-123'

  const decisionA: ActorDecision = {
    actorId: 'united_states',
    decisionId: 'dec-001',
    selectedProfileId: 'surgical',
    parameters: { scale: 'limited', posture: 'covert' },
  }

  const decisionB: ActorDecision = {
    actorId: 'iran',
    decisionId: 'dec-002',
    selectedProfileId: null,
    parameters: { scale: 'full' },
  }

  it('returns a 64-character hex string (SHA-256)', () => {
    const key = computeCacheKey(parentId, [decisionA])
    expect(key).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is deterministic — same inputs produce same key', () => {
    const key1 = computeCacheKey(parentId, [decisionA, decisionB])
    const key2 = computeCacheKey(parentId, [decisionA, decisionB])
    expect(key1).toBe(key2)
  })

  it('is order-independent — decisions sorted by actorId', () => {
    const key1 = computeCacheKey(parentId, [decisionA, decisionB])
    const key2 = computeCacheKey(parentId, [decisionB, decisionA])
    expect(key1).toBe(key2)
  })

  it('changes when parentCommitId changes', () => {
    const key1 = computeCacheKey('parent-1', [decisionA])
    const key2 = computeCacheKey('parent-2', [decisionA])
    expect(key1).not.toBe(key2)
  })

  it('changes when actorId changes', () => {
    const modified = { ...decisionA, actorId: 'israel' }
    const key1 = computeCacheKey(parentId, [decisionA])
    const key2 = computeCacheKey(parentId, [modified])
    expect(key1).not.toBe(key2)
  })

  it('changes when selectedProfileId changes (null vs string)', () => {
    const withProfile = { ...decisionA, selectedProfileId: 'overwhelming' }
    const withNull = { ...decisionA, selectedProfileId: null }
    const key1 = computeCacheKey(parentId, [withProfile])
    const key2 = computeCacheKey(parentId, [withNull])
    expect(key1).not.toBe(key2)
  })

  it('changes when parameters change', () => {
    const modified = { ...decisionA, parameters: { scale: 'overwhelming' } }
    const key1 = computeCacheKey(parentId, [decisionA])
    const key2 = computeCacheKey(parentId, [modified])
    expect(key1).not.toBe(key2)
  })
})
