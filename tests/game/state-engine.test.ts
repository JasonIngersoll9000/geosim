import { describe, it, expect } from 'vitest'
import {
  computeAssetAvailability,
  applyDepletion,
  applyEventEffects,
} from '@/lib/game/state-engine'
import type { BranchStateAtTurn, EventStateEffects, LiveActorState, LiveGlobalState } from '@/lib/types/simulation'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLiveActor(overrides: Partial<LiveActorState> = {}): LiveActorState {
  return {
    actor_id: 'us',
    military_strength: 80,
    political_stability: 70,
    economic_health: 75,
    public_support: 60,
    international_standing: 65,
    asset_inventory: { tomahawk: 100, f35: 200 },
    global_state: {},
    facility_statuses: [],
    asset_availability: {
      tomahawk: { count: 100, pct_of_initial: 1.0, status: 'available' },
      f35: { count: 200, pct_of_initial: 1.0, status: 'available' },
    },
    ...overrides,
  }
}

function makeState(overrides: Partial<BranchStateAtTurn> = {}): BranchStateAtTurn {
  const globalState: LiveGlobalState = {
    oil_price_usd: 85,
    hormuz_throughput_pct: 100,
    global_economic_stress: 20,
  }
  return {
    scenario_id: 'scenario-1',
    branch_id: 'branch-1',
    turn_commit_id: 'turn-1',
    as_of_date: '2026-01-10',
    actor_states: { us: makeLiveActor() },
    global_state: globalState,
    facility_statuses: [],
    active_depletion_rates: { us: { tomahawk: -2, f35: 0 } },
    initial_inventories: { us: { tomahawk: 100, f35: 200 } },
    ...overrides,
  }
}

// ── computeAssetAvailability ──────────────────────────────────────────────────

describe('computeAssetAvailability', () => {
  it('marks asset available when above 25% of initial', () => {
    const result = computeAssetAvailability('us', { tomahawk: 50 }, { tomahawk: 100 })
    expect(result.tomahawk.status).toBe('available')
    expect(result.tomahawk.pct_of_initial).toBe(0.5)
    expect(result.tomahawk.count).toBe(50)
  })

  it('marks asset constrained when below 25% of initial', () => {
    const result = computeAssetAvailability('us', { tomahawk: 24 }, { tomahawk: 100 })
    expect(result.tomahawk.status).toBe('constrained')
    expect(result.tomahawk.pct_of_initial).toBeCloseTo(0.24)
  })

  it('marks asset exhausted when count is 0', () => {
    const result = computeAssetAvailability('us', { tomahawk: 0 }, { tomahawk: 100 })
    expect(result.tomahawk.status).toBe('exhausted')
    expect(result.tomahawk.pct_of_initial).toBe(0)
  })

  it('marks asset exhausted even when initial is 0 (edge case)', () => {
    const result = computeAssetAvailability('us', { tomahawk: 0 }, { tomahawk: 0 })
    expect(result.tomahawk.status).toBe('exhausted')
  })

  it('does not include assets absent from initial inventory', () => {
    const result = computeAssetAvailability('us', { tomahawk: 50, mystery: 999 }, { tomahawk: 100 })
    expect(result.mystery).toBeUndefined()
    expect(result.tomahawk).toBeDefined()
  })
})

// ── applyDepletion ────────────────────────────────────────────────────────────

describe('applyDepletion', () => {
  it('depletes assets proportional to days elapsed', () => {
    const state = makeState()
    // rate is -2/day for tomahawk, 0 for f35
    const result = applyDepletion(state, '2026-01-10', '2026-01-15') // 5 days
    expect(result.actor_states.us.asset_inventory.tomahawk).toBe(90) // 100 + (-2 * 5)
    expect(result.actor_states.us.asset_inventory.f35).toBe(200)     // unchanged
  })

  it('clamps depleted count to 0, never negative', () => {
    const state = makeState({
      active_depletion_rates: { us: { tomahawk: -10 } },
      actor_states: { us: makeLiveActor({ asset_inventory: { tomahawk: 5, f35: 200 } }) },
    })
    const result = applyDepletion(state, '2026-01-10', '2026-01-15') // 5 days = -50, but only 5
    expect(result.actor_states.us.asset_inventory.tomahawk).toBe(0)
  })

  it('updates asset_availability after depletion', () => {
    const state = makeState({
      active_depletion_rates: { us: { tomahawk: -2 } },
      initial_inventories: { us: { tomahawk: 100, f35: 200 } },
    })
    const result = applyDepletion(state, '2026-01-10', '2026-01-15') // 5 days: 100 - 10 = 90
    expect(result.actor_states.us.asset_availability.tomahawk.status).toBe('available')
    expect(result.actor_states.us.asset_availability.tomahawk.count).toBe(90)
  })

  it('returns state unchanged when toDate equals fromDate', () => {
    const state = makeState()
    const result = applyDepletion(state, '2026-01-10', '2026-01-10')
    expect(result).toBe(state) // same reference
  })

  it('handles assets with zero depletion rate (no change)', () => {
    const state = makeState({ active_depletion_rates: { us: { f35: 0 } } })
    const result = applyDepletion(state, '2026-01-10', '2026-01-20')
    expect(result.actor_states.us.asset_inventory.f35).toBe(200)
  })
})

// ── applyEventEffects ─────────────────────────────────────────────────────────

describe('applyEventEffects', () => {
  it('applies score deltas and clamps to 0-100', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: { us: { military_strength: -30 } },
      asset_inventory_deltas: {},
      global_state_deltas: {},
      facility_updates: [],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.actor_states.us.military_strength).toBe(50) // 80 - 30
  })

  it('clamps score deltas so result never exceeds 100', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: { us: { military_strength: 50 } }, // 80 + 50 = 130 → clamp to 100
      asset_inventory_deltas: {},
      global_state_deltas: {},
      facility_updates: [],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.actor_states.us.military_strength).toBe(100)
  })

  it('clamps score deltas so result never goes below 0', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: { us: { military_strength: -200 } },
      asset_inventory_deltas: {},
      global_state_deltas: {},
      facility_updates: [],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.actor_states.us.military_strength).toBe(0)
  })

  it('applies asset inventory deltas and clamps to 0', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: {},
      asset_inventory_deltas: { us: { tomahawk: -40 } },
      global_state_deltas: {},
      facility_updates: [],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.actor_states.us.asset_inventory.tomahawk).toBe(60) // 100 - 40
  })

  it('clamps asset inventory to 0, never negative', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: {},
      asset_inventory_deltas: { us: { tomahawk: -500 } },
      global_state_deltas: {},
      facility_updates: [],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.actor_states.us.asset_inventory.tomahawk).toBe(0)
  })

  it('updates global state', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: {},
      asset_inventory_deltas: {},
      global_state_deltas: { oil_price_usd: 15, hormuz_throughput_pct: -30 },
      facility_updates: [],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.global_state.oil_price_usd).toBe(100) // 85 + 15
    expect(result.global_state.hormuz_throughput_pct).toBe(70) // 100 - 30
  })

  it('upserts facility updates by actor_id+name', () => {
    const state = makeState({
      facility_statuses: [
        { actor_id: 'iran', name: 'Fordow', type: 'nuclear', status: 'operational', capacity_pct: 100, location_label: 'Fordow, Iran' },
      ],
    })
    const effects: EventStateEffects = {
      actor_score_deltas: {},
      asset_inventory_deltas: {},
      global_state_deltas: {},
      facility_updates: [
        { actor_id: 'iran', name: 'Fordow', type: 'nuclear', status: 'degraded', capacity_pct: 40, location_label: 'Fordow, Iran' },
      ],
      new_depletion_rates: [],
    }
    const result = applyEventEffects(state, effects)
    expect(result.facility_statuses).toHaveLength(1)
    expect(result.facility_statuses[0].status).toBe('degraded')
    expect(result.facility_statuses[0].capacity_pct).toBe(40)
  })

  it('adds new depletion rates', () => {
    const state = makeState()
    const effects: EventStateEffects = {
      actor_score_deltas: {},
      asset_inventory_deltas: {},
      global_state_deltas: {},
      facility_updates: [],
      new_depletion_rates: [{ actor_id: 'us', asset_type: 'f35', rate_per_day: -1, effective_from_date: '2026-01-10' }],
    }
    const result = applyEventEffects(state, effects)
    expect(result.active_depletion_rates.us.f35).toBe(-1)
  })

  it('does not mutate the original state', () => {
    const state = makeState()
    const original = JSON.stringify(state)
    const effects: EventStateEffects = {
      actor_score_deltas: { us: { military_strength: -10 } },
      asset_inventory_deltas: { us: { tomahawk: -20 } },
      global_state_deltas: { oil_price_usd: 5 },
      facility_updates: [],
      new_depletion_rates: [],
    }
    applyEventEffects(state, effects)
    expect(JSON.stringify(state)).toBe(original)
  })
})
