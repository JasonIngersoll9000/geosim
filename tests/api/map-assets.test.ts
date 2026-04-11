import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/game/state-engine', () => ({
  getStateAtTurn: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { GET } from '@/app/api/scenarios/[id]/branches/[branchId]/map-assets/route'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { createClient } from '@/lib/supabase/server'
import type { BranchStateAtTurn } from '@/lib/types/simulation'

function makeState(): BranchStateAtTurn {
  return {
    scenario_id: 'sc-1',
    branch_id: 'br-1',
    turn_commit_id: 'tc-1',
    as_of_date: '2026-01-10',
    actor_states: {},
    global_state: { oil_price_usd: 90, hormuz_throughput_pct: 65, global_economic_stress: 30 },
    facility_statuses: [
      {
        actor_id: 'iran',
        name: 'Fordow',
        type: 'nuclear_facility',
        status: 'operational',
        capacity_pct: 90,
        location_label: 'Fordow, Iran',
        lat: 34.89,
        lng: 49.93,
      },
      {
        actor_id: 'iran',
        name: 'Natanz',
        type: 'nuclear_facility',
        status: 'degraded',
        capacity_pct: 40,
        location_label: 'Natanz, Iran',
        lat: 33.72,
        lng: 51.72,
      },
    ],
    active_depletion_rates: {},
    initial_inventories: {},
  }
}

function makeRequest(branchId: string, searchParams: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/scenarios/sc-1/branches/${branchId}/map-assets`)
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

describe('GET /api/scenarios/[id]/branches/[branchId]/map-assets', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns MapAssetsResponse with assets from facility_statuses with lat/lng', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('br-1', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.turn_commit_id).toBe('tc-1')
    expect(body.data.assets).toHaveLength(2)
    expect(body.data.assets[0].actor_id).toBe('iran')
    expect(body.data.assets[0].lat).toBe(34.89)
    expect(body.data.assets[0].lng).toBe(49.93)
  })

  it('includes Strait of Hormuz shipping lane with throughput from global state', async () => {
    vi.mocked(getStateAtTurn).mockResolvedValue(makeState())

    const req = makeRequest('br-1', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1' } })
    const body = await res.json()

    const hormuz = body.data.shipping_lanes.find((l: { id: string }) => l.id === 'strait_of_hormuz')
    expect(hormuz).toBeDefined()
    expect(hormuz.throughput_pct).toBe(65)
    expect(hormuz.coordinates).toBeDefined()
    expect(hormuz.coordinates.length).toBeGreaterThan(0)
  })

  it('includes facilities with status destroyed', async () => {
    const state = makeState()
    state.facility_statuses.push({
      actor_id: 'iran', name: 'Arak', type: 'nuclear_facility',
      status: 'destroyed', capacity_pct: 0,
      location_label: 'Arak, Iran', lat: 34.47, lng: 49.09,
    })
    vi.mocked(getStateAtTurn).mockResolvedValue(state)

    const req = makeRequest('br-1', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1' } })
    const body = await res.json()

    const arak = body.data.assets.find((a: { label: string }) => a.label === 'Arak')
    expect(arak).toBeDefined()
    expect(arak.status).toBe('destroyed')
  })

  it('excludes facilities without lat/lng', async () => {
    const state = makeState()
    state.facility_statuses.push({
      actor_id: 'iran', name: 'Hidden Site', type: 'nuclear_facility',
      status: 'operational', capacity_pct: 100,
      location_label: 'Unknown',
      // no lat/lng
    })
    vi.mocked(getStateAtTurn).mockResolvedValue(state)

    const req = makeRequest('br-1', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1' } })
    const body = await res.json()

    const hidden = body.data.assets.find((a: { label: string }) => a.label === 'Hidden Site')
    expect(hidden).toBeUndefined()
    expect(body.data.assets).toHaveLength(2) // only the 2 with coordinates
  })

  it('returns 200 with assets from actor_capabilities when turnCommitId is missing', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'cap-1',
                    actor_id: 'iran',
                    name: 'Fordow Nuclear Site',
                    asset_type: 'nuclear_facility',
                    category: null,
                    lat: 34.89,
                    lng: 49.93,
                    status: 'operational',
                    description: 'Uranium enrichment facility',
                  },
                ],
              }),
            }),
          }),
        }),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)

    const req = makeRequest('br-1') // no turnCommitId
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.assets).toHaveLength(1)
    expect(body.data.assets[0].actor_id).toBe('iran')
    expect(body.data.assets[0].lat).toBe(34.89)
    expect(body.data.turn_commit_id).toBe('')
  })

  it('returns 500 when getStateAtTurn throws', async () => {
    vi.mocked(getStateAtTurn).mockRejectedValue(new Error('DB error'))

    const req = makeRequest('br-1', { turnCommitId: 'tc-1' })
    const res = await GET(req, { params: { id: 'sc-1', branchId: 'br-1' } })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })
})
