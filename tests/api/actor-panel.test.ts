import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/game/state-engine', () => ({
  getStateAtTurn: vi.fn(),
}))
vi.mock('@/lib/supabase/server')

import { GET } from '@/app/api/scenarios/[id]/branches/[branchId]/actor-panel/[actorId]/route'
import { getStateAtTurn } from '@/lib/game/state-engine'
import type { BranchStateAtTurn, LiveActorState } from '@/lib/types/simulation'

function makeActor(overrides: Partial<LiveActorState> = {}): LiveActorState {
  return {
    actor_id: 'us',
    military_strength: 80,
    political_stability: 70,
    economic_health: 75,
    public_support: 60,
    international_standing: 65,
    asset_inventory: { tomahawk: 80, f35: 45 },
    global_state: {},
    facility_statuses: [
      { actor_id: 'us', name: 'USS Eisenhower', type: 'carrier_group', status: 'operational', capacity_pct: 100, location_label: 'Arabian Sea' },
    ],
    asset_availability: {
      tomahawk: { count: 80, pct_of_initial: 0.8, status: 'available' },
      f35: { count: 45, pct_of_initial: 0.225, status: 'constrained' },
    },
    ...overrides,
  }
}

function makeState(actorOverrides: Partial<LiveActorState> = {}): BranchStateAtTurn {
  return {
    scenario_id: 'sc-1',
    branch_id: 'br-1',
    turn_commit_id: 'tc-1',
    as_of_date: '2026-01-10',
    actor_states: { us: makeActor(actorOverrides) },
    global_state: { oil_price_usd: 85, hormuz_throughput_pct: 100, global_economic_stress: 20 },
    facility_statuses: [],
    active_depletion_rates: { us: { tomahawk: -2, f35: 0 } },
    initial_inventories: { us: { tomahawk: 100, f35: 200 } },
  }
}

function makeRequest(actorId: string, searchParams: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/scenarios/sc-1/branches/br-1/actor-panel/${actorId}`)
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

describe('GET /api/scenarios/[id]/branches/[branchId]/actor-panel/[actorId]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns correct score values from snapshot', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('us', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'us' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.scores.military_strength.value).toBe(80)
    expect(body.data.scores.political_stability.value).toBe(70)
    expect(body.data.scores.economic_health.value).toBe(75)
    expect(body.data.scores.public_support.value).toBe(60)
    expect(body.data.scores.international_standing.value).toBe(65)
  })

  it('computes days_until_exhausted correctly when daily_rate < 0', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('us', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'us' } })
    const body = await res.json()

    // tomahawk: rate=-2/day, count=80 → 80/2 = 40 days
    const tomahawkRate = body.data.active_depletion_rates.find(
      (r: { asset_type: string }) => r.asset_type === 'tomahawk'
    )
    expect(tomahawkRate).toBeDefined()
    expect(tomahawkRate.days_until_exhausted).toBe(40)
  })

  it('sets days_until_exhausted to null when daily_rate is 0', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('us', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'us' } })
    const body = await res.json()

    // f35: rate=0 → null
    const f35Rate = body.data.active_depletion_rates.find(
      (r: { asset_type: string }) => r.asset_type === 'f35'
    )
    expect(f35Rate).toBeDefined()
    expect(f35Rate.days_until_exhausted).toBeNull()
  })

  it('includes facilities for the actor', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('us', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'us' } })
    const body = await res.json()

    expect(body.data.facilities).toHaveLength(1)
    expect(body.data.facilities[0].name).toBe('USS Eisenhower')
    expect(body.data.facilities[0].status).toBe('operational')
  })

  it('returns 400 when turnCommitId is missing', async () => {
    const req = makeRequest('us') // no query params
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'us' } })
    expect(res.status).toBe(400)
  })

  it('returns 404 when actor not found in state', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('unknown', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'unknown' } })
    expect(res.status).toBe(404)
  })

  it('returns 500 when getStateAtTurn throws', async () => {
    vi.mocked(getStateAtTurn).mockRejectedValue(new Error('DB error'))

    const req = makeRequest('us', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1', actorId: 'us' } })
    expect(res.status).toBe(500)
  })
})
