// tests/game/turn-helpers.test.ts
import { describe, it, expect, vi } from 'vitest'
import type { DecisionOption } from '@/lib/types/panels'
import type { Decision } from '@/lib/types/simulation'
import {
  adaptDecisionOptions,
  loadDecisionCatalog,
  buildTurnPlanFromIds,
  computeBranchDivergence,
} from '@/lib/game/turn-helpers'

// ─── adaptDecisionOptions ────────────────────────────────────────────────────

describe('adaptDecisionOptions', () => {
  it('maps escalate direction to isEscalation + escalationLevel 1', () => {
    const options: DecisionOption[] = [
      { id: 'a1', title: 'Strike', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.5 },
    ]
    const result = adaptDecisionOptions(options)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'a1',
      description: 'Strike',
      dimension: 'military',
      isEscalation: true,
      escalationLevel: 1,
    })
    expect(result[0].isDeescalation).toBeUndefined()
  })

  it('maps de-escalate direction to isDeescalation + escalationLevel 0', () => {
    const options: DecisionOption[] = [
      { id: 'b1', title: 'Peace Talks', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.2 },
    ]
    const result = adaptDecisionOptions(options)
    expect(result[0]).toMatchObject({
      id: 'b1',
      description: 'Peace Talks',
      dimension: 'diplomatic',
      isDeescalation: true,
      escalationLevel: 0,
    })
    expect(result[0].isEscalation).toBeUndefined()
  })

  it('maps neutral direction without escalation flags', () => {
    const options: DecisionOption[] = [
      { id: 'c1', title: 'Reserves', dimension: 'economic', escalationDirection: 'neutral', resourceWeight: 0.25 },
    ]
    const result = adaptDecisionOptions(options)
    expect(result[0]).toMatchObject({
      id: 'c1',
      description: 'Reserves',
      dimension: 'economic',
    })
    expect(result[0].isEscalation).toBeUndefined()
    expect(result[0].isDeescalation).toBeUndefined()
    expect(result[0].escalationLevel).toBeUndefined()
  })

  it('handles empty array', () => {
    expect(adaptDecisionOptions([])).toEqual([])
  })
})

// ─── loadDecisionCatalog ─────────────────────────────────────────────────────

describe('loadDecisionCatalog', () => {
  it('returns decisions keyed by united_states', () => {
    const catalog = loadDecisionCatalog('any-scenario-id')
    expect(catalog).toHaveProperty('united_states')
    expect(Array.isArray(catalog.united_states)).toBe(true)
    expect(catalog.united_states.length).toBe(7) // 7 IRAN_DECISIONS
  })

  it('returns properly adapted decisions', () => {
    const catalog = loadDecisionCatalog('iran-2026')
    const expandAir = catalog.united_states.find((d: Decision) => d.id === 'expand-air')
    expect(expandAir).toBeDefined()
    expect(expandAir!.description).toBe('Expand Air Campaign')
    expect(expandAir!.isEscalation).toBe(true)
  })
})

// ─── buildTurnPlanFromIds ────────────────────────────────────────────────────

describe('buildTurnPlanFromIds', () => {
  const catalog = loadDecisionCatalog('iran-2026')

  it('builds plan with primary action only — 100% resources', () => {
    const plan = buildTurnPlanFromIds('expand-air', [], 'united_states', catalog)
    expect(plan.actorId).toBe('united_states')
    expect(plan.primaryAction.decisionId).toBe('expand-air')
    expect(plan.primaryAction.resourcePercent).toBe(100)
    expect(plan.primaryAction.selectedProfile).toBeNull()
    expect(plan.concurrentActions).toEqual([])
  })

  it('splits resources with 1 concurrent action: 80/20', () => {
    const plan = buildTurnPlanFromIds('expand-air', ['proxy-disrupt'], 'united_states', catalog)
    expect(plan.primaryAction.resourcePercent).toBe(80)
    expect(plan.concurrentActions).toHaveLength(1)
    expect(plan.concurrentActions[0].resourcePercent).toBe(20)
    expect(plan.concurrentActions[0].decisionId).toBe('proxy-disrupt')
  })

  it('splits resources with 3 concurrent actions: 40/20/20/20', () => {
    const plan = buildTurnPlanFromIds(
      'expand-air',
      ['proxy-disrupt', 'asset-freeze', 'iea-release'],
      'united_states',
      catalog,
    )
    expect(plan.primaryAction.resourcePercent).toBe(40)
    expect(plan.concurrentActions).toHaveLength(3)
    plan.concurrentActions.forEach((a) => {
      expect(a.resourcePercent).toBe(20)
    })
  })

  it('clamps concurrent actions to max 3', () => {
    const plan = buildTurnPlanFromIds(
      'expand-air',
      ['proxy-disrupt', 'asset-freeze', 'iea-release', 'ceasefire-signal'],
      'united_states',
      catalog,
    )
    expect(plan.concurrentActions).toHaveLength(3)
    expect(plan.primaryAction.resourcePercent).toBe(40)
  })

  it('throws if primary action ID not found', () => {
    expect(() =>
      buildTurnPlanFromIds('nonexistent', [], 'united_states', catalog),
    ).toThrow('not found')
  })

  it('throws if actor has no decisions in catalog', () => {
    expect(() =>
      buildTurnPlanFromIds('expand-air', [], 'gulf_states', catalog),
    ).toThrow('No decisions')
  })
})

// ─── computeBranchDivergence ─────────────────────────────────────────────────

describe('computeBranchDivergence', () => {
  it('returns 0 for trunk branch', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_trunk: true } }),
          }),
        }),
      }),
    }
    const result = await computeBranchDivergence(mockSupabase as never, 'branch-1')
    expect(result).toBe(0)
  })

  it('returns commit count for non-trunk branch', async () => {
    const mockSupabase = {
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { is_trunk: false } }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }, { id: '3' }] }),
          }),
        }),
    }
    const result = await computeBranchDivergence(mockSupabase as never, 'branch-2')
    expect(result).toBe(3)
  })

  it('returns 0 on error', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation(() => { throw new Error('db down') }),
    }
    const result = await computeBranchDivergence(mockSupabase as never, 'branch-3')
    expect(result).toBe(0)
  })

  it('returns 0 when branch not found (null data)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    }
    const result = await computeBranchDivergence(mockSupabase as never, 'branch-4')
    expect(result).toBe(0)
  })
})
