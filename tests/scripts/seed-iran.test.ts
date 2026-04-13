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

  it('--from=<eventId> seeds only events from that id onward', async () => {
    mockInsert.mockClear()

    // Use the 3rd event as the resume point
    const fromEventId = IRAN_EVENTS[2].id
    await seedIranScenario({ fromEventId, dryRun: true })

    // Should only insert events from index 2 onward
    const expectedCount = IRAN_EVENTS.length - 2
    expect(mockInsert.mock.calls.length).toBe(expectedCount)

    // First inserted event should be the resume point
    const firstDate = (mockInsert.mock.calls[0] as [{ simulated_date: string }])[0].simulated_date
    expect(firstDate).toBe(IRAN_EVENTS[2].timestamp)
  })

  it('throws when fromEventId is not found in IRAN_EVENTS', async () => {
    await expect(
      seedIranScenario({ fromEventId: 'evt_nonexistent', dryRun: true })
    ).rejects.toThrow("fromEventId 'evt_nonexistent' not found in IRAN_EVENTS")
  })
})
