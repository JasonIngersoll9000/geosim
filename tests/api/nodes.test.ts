import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Supabase mock setup ────────────────────────────────────────────────────
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))
vi.mock('@/lib/game/chronicle-helpers', () => ({
  getChronicleUpToTurn: vi.fn().mockResolvedValue([
    { turn_number: 1, chronicle_headline: 'Turn 1 headline', chronicle_entry: 'Long content', narrative_entry: null },
    { turn_number: 2, chronicle_headline: 'Turn 2 headline', chronicle_entry: 'Long content 2', narrative_entry: null },
  ]),
}))
vi.mock('@/lib/ai/decision-generator', () => ({
  generateDecisionOptions: vi.fn().mockResolvedValue([
    { id: 'naval_blockade', label: 'Naval Blockade', description: 'Block Hormuz.', category: 'military', prerequisites_met: true, escalation_delta: 2 },
  ]),
}))
vi.mock('@/lib/game/state-engine', () => ({
  getStateAtTurn: vi.fn(),
  forkStateForBranch: vi.fn().mockResolvedValue(undefined),
}))

// Helpers to build chained Supabase mock responses
function makeSelectChain(data: unknown, error: unknown = null) {
  const chain = {
    eq:          vi.fn(() => chain),
    single:      vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    in:          vi.fn(() => chain),
    update:      vi.fn(() => chain),
    insert:      vi.fn(() => chain),
    select:      vi.fn(() => chain),
    limit:       vi.fn(() => chain),
    order:       vi.fn(() => chain),
    not:         vi.fn(() => chain),
    delete:      vi.fn(() => chain),
    then:        vi.fn().mockImplementation((resolve: (v: { data: unknown; error: unknown }) => void) => {
      resolve({ data: Array.isArray(data) ? data : (data !== null ? [data] : []), error })
    }),
  }
  return chain
}

// ─── GET /api/nodes/[commitId] ──────────────────────────────────────────────

describe('GET /api/nodes/[commitId]', () => {
  it('returns 400 for non-UUID commitId', async () => {
    const { GET } = await import('@/app/api/nodes/[commitId]/route')
    const req = new Request('http://localhost/api/nodes/not-a-uuid')
    const res = await GET(req, { params: { commitId: 'not-a-uuid' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid/i)
  })

  it('returns 404 when commit does not exist', async () => {
    mockFrom.mockReturnValue(makeSelectChain(null, { message: 'not found' }))
    const { GET } = await import('@/app/api/nodes/[commitId]/route')
    const req = new Request('http://localhost/api/nodes/00000000-0000-0000-0000-000000000001')
    const res = await GET(req, { params: { commitId: '00000000-0000-0000-0000-000000000001' } })
    expect(res.status).toBe(404)
  })

  it('scopes chronicle to turn_number <= node turn', async () => {
    const { getChronicleUpToTurn } = await import('@/lib/game/chronicle-helpers')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'turn_commits') {
        return makeSelectChain({ id: 'c-1', branch_id: 'b-1', turn_number: 2, simulated_date: '2026-04-02', parent_commit_id: 'c-0' })
      }
      if (table === 'branches') {
        return makeSelectChain({ id: 'b-1', is_trunk: true, parent_branch_id: null, fork_point_commit_id: null, decision_key: null })
      }
      return makeSelectChain([])
    })
    const { GET } = await import('@/app/api/nodes/[commitId]/route')
    const req = new Request('http://localhost/api/nodes/00000000-0000-0000-0000-000000000001')
    const res = await GET(req, { params: { commitId: '00000000-0000-0000-0000-000000000001' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.chronicle).toHaveLength(2)
    expect(vi.mocked(getChronicleUpToTurn)).toHaveBeenCalledWith(
      expect.anything(), 'b-1', 2, undefined,
    )
  })
})

// ─── GET /api/nodes/[commitId]/decision-options ─────────────────────────────

describe('GET /api/nodes/[commitId]/decision-options', () => {
  it('returns 400 when actor param is missing', async () => {
    const { GET } = await import('@/app/api/nodes/[commitId]/decision-options/route')
    const req = new Request('http://localhost/api/nodes/00000000-0000-0000-0000-000000000001/decision-options')
    const res = await GET(req, { params: { commitId: '00000000-0000-0000-0000-000000000001' } })
    expect(res.status).toBe(400)
  })

  it('returns cached: true on cache hit, no AI invoked', async () => {
    const { generateDecisionOptions } = await import('@/lib/ai/decision-generator')
    vi.mocked(generateDecisionOptions).mockClear()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'turn_commits') {
        return makeSelectChain({
          id: '00000000-0000-0000-0000-000000000003', branch_id: 'b-1', turn_number: 3,
          simulated_date: '2026-04-03',
          decision_options_cache: {
            us: [{ id: 'naval_blockade', label: 'Naval Blockade', description: 'Block.', category: 'military', prerequisites_met: true, escalation_delta: 2 }],
          },
        })
      }
      return makeSelectChain([])
    })

    const { GET } = await import('@/app/api/nodes/[commitId]/decision-options/route')
    const req = new Request('http://localhost/api/nodes/00000000-0000-0000-0000-000000000003/decision-options?actor=us')
    const res = await GET(req, { params: { commitId: '00000000-0000-0000-0000-000000000003' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.cached).toBe(true)
    expect(vi.mocked(generateDecisionOptions)).not.toHaveBeenCalled()
  })
})

// ─── POST /api/nodes/[commitId]/fork ────────────────────────────────────────

describe('POST /api/nodes/[commitId]/fork', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    vi.stubEnv('NEXT_PUBLIC_DEV_MODE', 'true')
  })

  it('returns joined: true when a matching branch already exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'turn_commits') {
        return makeSelectChain({ id: 'c-1', branch_id: 'trunk', turn_number: 5, simulated_date: '2026-04-05', parent_commit_id: null })
      }
      if (table === 'branches') {
        return makeSelectChain({ id: 'existing-branch', name: 'US → Naval Blockade', decision_key: 'us::naval_blockade', head_commit_id: 'head-2' })
      }
      return makeSelectChain([])
    })

    const { POST } = await import('@/app/api/nodes/[commitId]/fork/route')
    const req = new Request('http://localhost/api/nodes/c-1/fork', {
      method: 'POST',
      body: JSON.stringify({ actorId: 'us', primaryAction: 'naval_blockade' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, { params: { commitId: 'c-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.joined).toBe(true)
    expect(json.branchId).toBe('existing-branch')
  })

  it('returns 400 when actorId or primaryAction is missing', async () => {
    const { POST } = await import('@/app/api/nodes/[commitId]/fork/route')
    const req = new Request('http://localhost/api/nodes/c-1/fork', {
      method: 'POST',
      body: JSON.stringify({ actorId: 'us' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, { params: { commitId: 'c-1' } })
    expect(res.status).toBe(400)
  })
})
