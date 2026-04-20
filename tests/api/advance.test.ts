import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  }),
}))

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'commit-1' }, error: null }) })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
const mockSingleShared = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'branches') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'branch-1', head_commit_id: 'head-1', scenario_id: 'sc-1', user_controlled_actors: [], created_by: 'user-1' },
                error: null,
              }),
            })),
          })),
          update: mockUpdate,
        }
      }
      if (table === 'turn_commits') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((col: string, val: string) => {
              if (val === 'head-1') {
                // head commit lookup: .select().eq('id', headCommitId).single()
                return { single: vi.fn().mockResolvedValue({ data: { turn_number: 3, simulated_date: '2026-04-01' }, error: null }) }
              }
              // Branch-scoped queries:
              //  - duplicate-check: .select().eq('branch_id', branchId).not(...).limit(1)
              //  - max turn_number:  .select().eq('branch_id', branchId).order(...).limit(1).maybeSingle()
              return {
                single: mockSingleShared,
                not: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              }
            }),
          })),
          insert: mockInsert,
          update: mockUpdate,
        }
      }
      return { select: mockSelect }
    }),
    channel: vi.fn(() => ({ send: vi.fn().mockResolvedValue('ok') })),
  })),
}))

// Mock AI modules to prevent real API calls
vi.mock('@/lib/ai/actor-agent-runner', () => ({ runActorAgent: vi.fn() }))
vi.mock('@/lib/ai/resolution-engine', () => ({ runResolutionEngine: vi.fn() }))
vi.mock('@/lib/ai/judge-evaluator', () => ({ runJudge: vi.fn(), JUDGE_THRESHOLD: 40 }))
vi.mock('@/lib/ai/narrator', () => ({ runNarrator: vi.fn() }))
vi.mock('@/lib/game/state-engine', () => ({
  getStateAtTurn: vi.fn(),
  applyEventEffects: vi.fn(),
  persistStateSnapshot: vi.fn(),
}))

describe('POST /api/scenarios/[id]/branches/[branchId]/advance', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    vi.stubEnv('NEXT_PUBLIC_DEV_MODE', 'true')
  })

  it('returns instant response with processing status', async () => {
    const { POST } = await import('@/app/api/scenarios/[id]/branches/[branchId]/advance/route')

    const request = new Request('http://localhost:3000/api/scenarios/sc-1/branches/branch-1/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryAction: 'expand-air', concurrentActions: [], controlledActors: ['united_states'] }),
    })

    const response = await POST(request as never, { params: { id: 'sc-1', branchId: 'branch-1' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('turnCommitId')
    expect(body).toHaveProperty('status', 'processing')
    expect(body).toHaveProperty('turnNumber', 4)
  })

  it('returns 400 when primaryAction is missing', async () => {
    const { POST } = await import('@/app/api/scenarios/[id]/branches/[branchId]/advance/route')

    const request = new Request('http://localhost:3000/api/scenarios/sc-1/branches/branch-1/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurrentActions: [] }),
    })

    const response = await POST(request as never, { params: { id: 'sc-1', branchId: 'branch-1' } })
    expect(response.status).toBe(400)
  })
})
