// tests/ai/cost-tracker.test.ts
// Tests for lib/ai/cost-tracker — Supabase service client is fully mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup (must come before module imports)
// ---------------------------------------------------------------------------

// Shared mock state so individual tests can inject per-row data.
let mockRowData: Record<string, unknown> | null = null
let mockUpsertError: { message: string } | null = null
let mockSelectError: { message: string } | null = null
let mockUpdateError: { message: string } | null = null
let mockRpcError: { message: string } | null = null

const mockUpdate = vi.fn()
const mockRpc = vi.fn()

// Chain builder for .from().select().eq().eq().single()
function buildSelectChain(data: Record<string, unknown> | null, error: { message: string } | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  return chain
}

// The mock client factory — each test call to createServiceClient returns this.
function createMockClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'user_token_budgets') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: mockUpsertError }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRowData, error: mockSelectError }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: mockUpdateError }),
            }),
          }),
        }
      }
      return {}
    }),
    rpc: mockRpc.mockResolvedValue({ error: mockRpcError }),
  }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => createMockClient()),
}))

// Import module AFTER mock is declared.
import {
  checkBudget,
  recordTokens,
  incrementTurn,
  markTurnStarted,
} from '@/lib/ai/cost-tracker'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<{
  tokens_used: number
  tokens_limit: number
  turns_completed: number
  turns_limit: number
  last_turn_started_at: string | null
}> = {}): Record<string, unknown> {
  return {
    user_id: 'user-1',
    day: '2026-04-20',
    tokens_used: 0,
    tokens_limit: 2_000_000,
    turns_completed: 0,
    turns_limit: 50,
    last_turn_started_at: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertError = null
    mockSelectError = null
    mockUpdateError = null
    mockRpcError = null
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  it('creates a default row on first call (upsert is called)', async () => {
    mockRowData = makeRow()
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = createMockClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createServiceClient>)

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(true)
    expect(mockClient.from).toHaveBeenCalledWith('user_token_budgets')
  })

  it('returns allowed=true when under both limits', async () => {
    mockRowData = makeRow({ tokens_used: 100_000, turns_completed: 5 })

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(true)
    expect(status.tokensUsed).toBe(100_000)
    expect(status.turnsCompleted).toBe(5)
    expect(status.reason).toBeUndefined()
  })

  it('returns tokens_exceeded when tokens_used >= tokens_limit', async () => {
    mockRowData = makeRow({ tokens_used: 2_000_000, tokens_limit: 2_000_000 })

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(false)
    expect(status.reason).toBe('tokens_exceeded')
  })

  it('returns turns_exceeded when turns_completed >= turns_limit', async () => {
    mockRowData = makeRow({ turns_completed: 50, turns_limit: 50 })

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(false)
    expect(status.reason).toBe('turns_exceeded')
  })

  it('returns concurrent_turn when last_turn_started_at is within 60 seconds', async () => {
    const recent = new Date(Date.now() - 20_000).toISOString() // 20 s ago
    mockRowData = makeRow({ last_turn_started_at: recent })

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(false)
    expect(status.reason).toBe('concurrent_turn')
  })

  it('returns allowed=true when last_turn_started_at is older than 60 seconds', async () => {
    const old = new Date(Date.now() - 90_000).toISOString() // 90 s ago
    mockRowData = makeRow({ last_turn_started_at: old })

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(true)
  })

  it('returns allowed=true when tokens_limit is -1 (admin bypass)', async () => {
    mockRowData = makeRow({ tokens_used: 99_999_999, tokens_limit: -1, turns_limit: -1 })

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(true)
    expect(status.reason).toBeUndefined()
  })

  it('returns allowed=true in dev mode without hitting Supabase', async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = 'true'
    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockClear()

    const status = await checkBudget('user-1')

    expect(status.allowed).toBe(true)
    expect(status.tokensLimit).toBe(-1)
    expect(status.turnsLimit).toBe(-1)
    expect(vi.mocked(createServiceClient)).not.toHaveBeenCalled()
  })
})

describe('recordTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpcError = null
    mockSelectError = null
    mockUpdateError = null
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  it('sums all token fields including cache tokens', async () => {
    // rpc succeeds — capture args
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = createMockClient()
    // Make rpc succeed so we can inspect the call.
    mockClient.rpc = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServiceClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createServiceClient>)

    await recordTokens('user-1', {
      input_tokens: 1000,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 50,
      output_tokens: 500,
    })

    expect(mockClient.rpc).toHaveBeenCalledWith('increment_tokens_used', {
      p_user_id: 'user-1',
      p_day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      p_delta: 1750, // 1000 + 200 + 50 + 500
    })
  })

  it('is a no-op in dev mode', async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = 'true'
    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockClear()

    await recordTokens('user-1', { input_tokens: 100, output_tokens: 50 })

    expect(vi.mocked(createServiceClient)).not.toHaveBeenCalled()
  })
})

describe('incrementTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpcError = null
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  it('calls the increment_turns_completed RPC with correct args', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = createMockClient()
    mockClient.rpc = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServiceClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createServiceClient>)

    await incrementTurn('user-1')

    expect(mockClient.rpc).toHaveBeenCalledWith('increment_turns_completed', {
      p_user_id: 'user-1',
      p_day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })

  it('is a no-op in dev mode', async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = 'true'
    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockClear()

    await incrementTurn('user-1')

    expect(vi.mocked(createServiceClient)).not.toHaveBeenCalled()
  })
})

describe('markTurnStarted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateError = null
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEV_MODE
  })

  it('is a no-op in dev mode', async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = 'true'
    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockClear()

    await markTurnStarted('user-1')

    expect(vi.mocked(createServiceClient)).not.toHaveBeenCalled()
  })
})
