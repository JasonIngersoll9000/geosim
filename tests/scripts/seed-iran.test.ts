import { describe, it, expect, vi } from 'vitest'

// Use vi.hoisted so variables are available when vi.mock factories run
const { mockInsert, mockSingle, mockSelect, mockEq, mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null })
  const mockChain: Record<string, unknown> = {}
  const mockInsert = vi.fn().mockImplementation(() => mockChain)
  const mockSelect = vi.fn().mockImplementation(() => mockChain)
  const mockEq = vi.fn().mockImplementation(() => mockChain)
  const mockUpdate = vi.fn().mockImplementation(() => mockChain)
  Object.assign(mockChain, { insert: mockInsert, update: mockUpdate, select: mockSelect, eq: mockEq, single: mockSingle })
  const mockFrom = vi.fn().mockReturnValue(mockChain)
  return { mockInsert, mockSingle, mockSelect, mockEq, mockUpdate, mockFrom }
})

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('@/lib/ai/anthropic', () => ({
  callClaude: vi.fn().mockResolvedValue({ escalationLadders: [], constraintCascades: [] }),
}))

import { IRAN_EVENTS } from '@/lib/scenarios/iran/events'
import { seedIranScenario } from '@/scripts/seed-iran'

describe('seedIranScenario (dry-run)', () => {
  it('creates one turn_commit per event, with is_ground_truth: true, in chronological order', async () => {
    mockInsert.mockClear()

    await seedIranScenario({ dryRun: true })

    // 1. One insert per event
    expect(mockInsert.mock.calls.length).toBe(IRAN_EVENTS.length)

    // 2. All have is_ground_truth: true
    for (const [payload] of mockInsert.mock.calls as [{ is_ground_truth: boolean }][]) {
      expect(payload.is_ground_truth).toBe(true)
    }

    // 3. Chronological order
    const dates = (mockInsert.mock.calls as [{ simulated_date: string }][]).map(([p]) => p.simulated_date)
    expect(dates).toEqual([...dates].sort())
  })
})
