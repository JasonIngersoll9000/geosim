// tests/game/turn-broadcast.test.ts
// Isolated file for broadcastTurnEvent — needs vi.mock for supabase service
// Separate to avoid mock hoisting affecting other tests.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn().mockResolvedValue(undefined)
const mockChannel = vi.fn().mockReturnValue({ send: mockSend })
const mockClient = { channel: mockChannel }

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockClient),
}))

// Import AFTER mock setup
import { broadcastTurnEvent } from '@/lib/game/turn-helpers'

describe('broadcastTurnEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends broadcast on correct channel', async () => {
    await broadcastTurnEvent('branch-abc', 'turn_phase', { phase: 'submitted' })

    expect(mockChannel).toHaveBeenCalledWith('branch:branch-abc')
    expect(mockSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'turn_phase',
      payload: { phase: 'submitted' },
    })
  })

  it('uses the branchId in channel name', async () => {
    await broadcastTurnEvent('xyz-123', 'turn_complete', { success: true })
    expect(mockChannel).toHaveBeenCalledWith('branch:xyz-123')
  })

  it('passes arbitrary payload through', async () => {
    const payload = { turnNumber: 5, actors: ['us', 'iran'] }
    await broadcastTurnEvent('b1', 'update', payload)
    expect(mockSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'update',
      payload,
    })
  })
})
