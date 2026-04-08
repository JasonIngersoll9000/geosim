import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateThresholds } from '@/lib/game/threshold-evaluator'
import type { BranchStateAtTurn, LiveActorState, LiveGlobalState } from '@/lib/types/simulation'

vi.mock('@/lib/supabase/server')

function makeGlobal(overrides: Partial<LiveGlobalState> = {}): LiveGlobalState {
  return { oil_price_usd: 85, hormuz_throughput_pct: 100, global_economic_stress: 20, ...overrides }
}

function makeActor(overrides: Partial<LiveActorState> = {}): LiveActorState {
  return {
    actor_id: 'iran',
    military_strength: 60, political_stability: 50,
    economic_health: 40, public_support: 35, international_standing: 30,
    asset_inventory: {}, global_state: {}, facility_statuses: [],
    asset_availability: {},
    ...overrides,
  }
}

function makeState(overrides: Partial<BranchStateAtTurn> = {}): BranchStateAtTurn {
  return {
    scenario_id: 'sc-1',
    branch_id: 'br-1',
    turn_commit_id: 'tc-1',
    as_of_date: '2026-01-10',
    actor_states: { iran: makeActor() },
    global_state: makeGlobal(),
    facility_statuses: [],
    active_depletion_rates: {},
    initial_inventories: {},
    ...overrides,
  }
}

// Build mock Supabase client for threshold tests
// Needs to handle: threshold_triggers query + branches query + update
function buildMockClient(
  triggers: unknown[],
  branchCreatedAt = '2026-01-01T00:00:00Z'
) {
  const updateBuilder = {
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((r: (v: { data: null; error: null }) => void) => r({ data: null, error: null })),
  }

  const responses: Record<string, unknown> = {
    threshold_triggers: { data: triggers, error: null },
    branches: { data: { created_at: branchCreatedAt }, error: null },
  }

  let currentTable = ''
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnValue(updateBuilder),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (v: unknown) => void) => {
      resolve(responses[currentTable] ?? { data: [], error: null })
    }),
  }

  return {
    from: vi.fn((table: string) => {
      currentTable = table
      return builder
    }),
  }
}

describe('evaluateThresholds', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('fires immediately when threshold crossed and sustained_days is 0', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const triggers = [{
      trigger_id: 'oil-spike',
      actor_id: null,
      variable_path: 'global.oil_price_usd',
      threshold_value: 100,
      direction: 'above',
      sustained_days: 0,
      forced_event_template: { type: 'oil_crisis', label: 'Oil Crisis' },
      status: 'armed',
    }]
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient(triggers) as unknown as Awaited<ReturnType<typeof createClient>>
    )

    // oil_price = 120 > 100 → should fire
    const state = makeState({ global_state: makeGlobal({ oil_price_usd: 120 }) })
    const results = await evaluateThresholds('br-1', state)

    expect(results).toHaveLength(1)
    expect(results[0].triggered).toBe(true)
    expect(results[0].trigger_id).toBe('oil-spike')
    expect(results[0].forced_event).toMatchObject({ type: 'oil_crisis' })
  })

  it('does not fire when threshold is NOT crossed', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const triggers = [{
      trigger_id: 'oil-spike',
      actor_id: null,
      variable_path: 'global.oil_price_usd',
      threshold_value: 100,
      direction: 'above',
      sustained_days: 0,
      forced_event_template: {},
      status: 'armed',
    }]
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient(triggers) as unknown as Awaited<ReturnType<typeof createClient>>
    )

    // oil_price = 85 < 100 → should NOT fire
    const state = makeState({ global_state: makeGlobal({ oil_price_usd: 85 }) })
    const results = await evaluateThresholds('br-1', state)

    expect(results[0].triggered).toBe(false)
    expect(results[0].forced_event).toBeNull()
  })

  it('does not fire sustained threshold when not enough days have elapsed', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const triggers = [{
      trigger_id: 'prolonged-stress',
      actor_id: 'iran',
      variable_path: 'public_support',
      threshold_value: 40,
      direction: 'below',
      sustained_days: 7,
      forced_event_template: { type: 'mass_protest' },
      status: 'armed',
    }]
    // Branch created 2026-01-07, as_of_date = 2026-01-10 → 3 days elapsed (< 7)
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient(triggers, '2026-01-07T00:00:00Z') as unknown as Awaited<ReturnType<typeof createClient>>
    )

    // iran.public_support = 35 < 40 → threshold crossed, but only 3 days elapsed
    const state = makeState({ as_of_date: '2026-01-10' })
    const results = await evaluateThresholds('br-1', state)

    expect(results[0].triggered).toBe(false)
  })

  it('fires sustained threshold when enough days have elapsed', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const triggers = [{
      trigger_id: 'prolonged-stress',
      actor_id: 'iran',
      variable_path: 'public_support',
      threshold_value: 40,
      direction: 'below',
      sustained_days: 7,
      forced_event_template: { type: 'mass_protest' },
      status: 'armed',
    }]
    // Branch created 2026-01-01, as_of_date = 2026-01-10 → 9 days elapsed (>= 7)
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient(triggers, '2026-01-01T00:00:00Z') as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const state = makeState({ as_of_date: '2026-01-10' }) // iran.public_support = 35 < 40
    const results = await evaluateThresholds('br-1', state)

    expect(results[0].triggered).toBe(true)
  })

  it('returns empty array when no armed triggers exist', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient([]) as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const state = makeState()
    const results = await evaluateThresholds('br-1', state)

    expect(results).toHaveLength(0)
  })

  it('does not re-fire already triggered threshold (only armed queried)', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    // The DB query filters status='armed', so triggered triggers return empty
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient([]) as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const state = makeState()
    const results = await evaluateThresholds('br-1', state)

    expect(results).toHaveLength(0)
  })

  it('resolves actor-level variable paths correctly', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const triggers = [{
      trigger_id: 'military-collapse',
      actor_id: 'iran',
      variable_path: 'military_strength',
      threshold_value: 50,
      direction: 'below',
      sustained_days: 0,
      forced_event_template: { type: 'military_collapse' },
      status: 'armed',
    }]
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient(triggers) as unknown as Awaited<ReturnType<typeof createClient>>
    )

    // iran.military_strength = 60 (NOT below 50) → should not fire
    const state = makeState()
    const results = await evaluateThresholds('br-1', state)

    expect(results[0].triggered).toBe(false)
  })
})
