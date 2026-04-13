import { describe, it, expect } from 'vitest'
import { buildStateContextBlock } from '@/lib/ai/actor-agent'
import type { BranchStateAtTurn, LiveActorState, LiveGlobalState } from '@/lib/types/simulation'

function makeActor(): LiveActorState {
  return {
    actor_id: 'us',
    military_strength: 80,
    political_stability: 70,
    economic_health: 75,
    public_support: 60,
    international_standing: 65,
    asset_inventory: { tomahawk: 100, f35: 50 },
    global_state: {},
    facility_statuses: [
      { actor_id: 'us', name: 'USS Eisenhower', type: 'carrier_group', status: 'operational', capacity_pct: 100, location_label: 'Arabian Sea' },
    ],
    asset_availability: {
      tomahawk: { count: 100, pct_of_initial: 1.0, status: 'available' },
      f35: { count: 50, pct_of_initial: 0.2, status: 'constrained' },
    },
  }
}

function makeState(): BranchStateAtTurn {
  const global_state: LiveGlobalState = { oil_price_usd: 95, hormuz_throughput_pct: 70, global_economic_stress: 45 }
  return {
    scenario_id: 'sc-1',
    branch_id: 'br-1',
    turn_commit_id: 'tc-1',
    as_of_date: '2026-01-10',
    actor_states: { us: makeActor() },
    global_state,
    facility_statuses: [],
    active_depletion_rates: {},
    initial_inventories: {},
  }
}

describe('buildStateContextBlock', () => {
  it('includes all five score lines', () => {
    const block = buildStateContextBlock('us', makeState())
    expect(block).toContain('Military Strength: 80/100')
    expect(block).toContain('Political Stability: 70/100')
    expect(block).toContain('Economic Health: 75/100')
    expect(block).toContain('Public Support: 60/100')
    expect(block).toContain('International Standing: 65/100')
  })

  it('includes asset inventory with availability status', () => {
    const block = buildStateContextBlock('us', makeState())
    expect(block).toContain('tomahawk')
    expect(block).toContain('100')
    expect(block).toContain('AVAILABLE')
    expect(block).toContain('f35')
    expect(block).toContain('CONSTRAINED')
  })

  it('includes global context lines', () => {
    const block = buildStateContextBlock('us', makeState())
    expect(block).toContain('Oil price: $95/barrel')
    expect(block).toContain('Hormuz throughput: 70% of normal')
    expect(block).toContain('Global economic stress: 45/100')
  })

  it('includes facility lines for the actor', () => {
    const block = buildStateContextBlock('us', makeState())
    expect(block).toContain('USS Eisenhower')
    expect(block).toContain('operational')
  })

  it('includes the constraint rule mentioning EXHAUSTED and CONSTRAINED', () => {
    const block = buildStateContextBlock('us', makeState())
    expect(block).toContain('EXHAUSTED')
    expect(block).toContain('CONSTRAINED')
    expect(block).toContain('CONSTRAINT RULE')
  })

  it('returns empty string for unknown actor', () => {
    const block = buildStateContextBlock('unknown', makeState())
    expect(block).toBe('')
  })
})
