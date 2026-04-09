import { describe, it, expect, vi, beforeEach } from 'vitest'
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

// ── Async functions — Supabase mocked ────────────────────────────────────────

import {
  getStateAtTurn,
  forkStateForBranch,
  persistStateSnapshot,
} from '@/lib/game/state-engine'

vi.mock('@/lib/supabase/server')

type MockBuilder = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  then: ReturnType<typeof vi.fn>
}

// Build a mock Supabase client
function buildMockClient(responses: Record<string, unknown[]>) {
  let currentTable = ''
  const builder: MockBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: responses[currentTable] ?? [], error: null })
    ),
  }
  return {
    from: vi.fn((table: string) => {
      currentTable = table
      return builder
    }),
  }
}

const TEST_SNAPSHOT = {
  scenario_id: 'sc-1', branch_id: 'br-1', turn_commit_id: 'tc-1',
  actor_id: 'us',
  military_strength: 80, political_stability: 70,
  economic_health: 75, public_support: 60, international_standing: 65,
  asset_inventory: { tomahawk: 100 },
  global_state: { oil_price_usd: 85, hormuz_throughput_pct: 100, global_economic_stress: 20 },
  facility_statuses: [],
  interceptor_effectiveness: {},
  created_at: '2026-01-10T00:00:00Z',
}

describe('getStateAtTurn', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('assembles BranchStateAtTurn from DB rows', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = buildMockClient({
      actor_state_snapshots: [TEST_SNAPSHOT],
      daily_depletion_rates: [
        { actor_id: 'us', asset_type: 'tomahawk', rate_per_day: -2, effective_from_date: '2026-01-01', effective_to_date: null },
      ],
      actor_capabilities: [
        { actor_id: 'us', name: 'tomahawk', quantity: 150 },
      ],
    })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>)

    const state = await getStateAtTurn('br-1', 'tc-1')

    expect(state.branch_id).toBe('br-1')
    expect(state.scenario_id).toBe('sc-1')
    expect(state.actor_states.us.military_strength).toBe(80)
    expect(state.actor_states.us.asset_inventory.tomahawk).toBe(100)
    expect(state.active_depletion_rates.us.tomahawk).toBe(-2)
    expect(state.initial_inventories.us.tomahawk).toBe(150)
    expect(state.global_state.oil_price_usd).toBe(85)
  })

  it('applies additional depletion when asOfDate is provided and later', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = buildMockClient({
      actor_state_snapshots: [TEST_SNAPSHOT],
      daily_depletion_rates: [
        { actor_id: 'us', asset_type: 'tomahawk', rate_per_day: -2, effective_from_date: '2026-01-01', effective_to_date: null },
      ],
      actor_capabilities: [{ actor_id: 'us', name: 'tomahawk', quantity: 150 }],
    })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>)

    // snapshot date = 2026-01-10, asOfDate = 2026-01-15 → 5 more days → 100 + (-2 * 5) = 90
    const state = await getStateAtTurn('br-1', 'tc-1', '2026-01-15')

    expect(state.actor_states.us.asset_inventory.tomahawk).toBe(90)
  })

  it('throws when no snapshots found', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = buildMockClient({
      actor_state_snapshots: [],
      daily_depletion_rates: [],
      actor_capabilities: [],
    })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>)

    await expect(getStateAtTurn('br-1', 'tc-missing')).rejects.toThrow('No state snapshots found')
  })
})

describe('forkStateForBranch', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns a new BranchStateAtTurn with the new branch_id', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = buildMockClient({
      actor_state_snapshots: [TEST_SNAPSHOT],
      daily_depletion_rates: [],
      actor_capabilities: [{ actor_id: 'us', name: 'tomahawk', quantity: 150 }],
    })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>)

    const forked = await forkStateForBranch('br-1', 'tc-1', 'new-br')

    expect(forked.branch_id).toBe('new-br')
    expect(forked.scenario_id).toBe('sc-1')
  })

  it('forked state is independent — mutations do not affect parent load', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = buildMockClient({
      actor_state_snapshots: [TEST_SNAPSHOT],
      daily_depletion_rates: [],
      actor_capabilities: [{ actor_id: 'us', name: 'tomahawk', quantity: 150 }],
    })
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>)

    const forked = await forkStateForBranch('br-1', 'tc-1', 'new-br')

    // Mutate the fork
    forked.actor_states.us.asset_inventory.tomahawk = 0
    forked.actor_states.us.asset_inventory.tomahawk = 0

    // Original mock data is unchanged (mock always returns 100)
    // Re-load — should still return 100 from mock
    const reloaded = await getStateAtTurn('br-1', 'tc-1')
    expect(reloaded.actor_states.us.asset_inventory.tomahawk).toBe(100)
  })
})

describe('persistStateSnapshot', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls supabase insert with correct rows for each actor', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: insertMock,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((r: (v: { data: unknown[]; error: null }) => void) => r({ data: [], error: null })),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>)

    const state: import('@/lib/types/simulation').BranchStateAtTurn = {
      scenario_id: 'sc-1',
      branch_id: 'br-1',
      turn_commit_id: 'tc-2',
      as_of_date: '2026-01-15',
      actor_states: {
        us: {
          actor_id: 'us',
          military_strength: 75, political_stability: 68,
          economic_health: 70, public_support: 55, international_standing: 60,
          asset_inventory: { tomahawk: 80 },
          global_state: {},
          facility_statuses: [],
          asset_availability: {},
        },
      },
      global_state: { oil_price_usd: 90, hormuz_throughput_pct: 80, global_economic_stress: 35 },
      facility_statuses: [],
      active_depletion_rates: {},
      initial_inventories: {},
    }

    await persistStateSnapshot('sc-1', 'br-1', 'tc-2', state)

    expect(insertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          scenario_id: 'sc-1',
          branch_id: 'br-1',
          turn_commit_id: 'tc-2',
          actor_id: 'us',
          military_strength: 75,
        }),
      ])
    )
  })
})
