import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useGame so DispatchTerminal can be rendered without a full GameProvider tree
vi.mock('@/components/providers/GameProvider', () => ({
  useGame: vi.fn(),
}))

import { useGame } from '@/components/providers/GameProvider'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'

const mockUseGame = useGame as ReturnType<typeof vi.fn>

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    state: {
      turnPhase: 'planning',
      turnError: null,
      resolutionProgress: '',
      isResolutionRunning: false,
      ...overrides,
    },
    dispatch: vi.fn(),
  }
}

describe('DispatchTerminal', () => {
  beforeEach(() => {
    mockUseGame.mockReset()
  })

  it('returns null when idle (planning, not running, no progress)', () => {
    mockUseGame.mockReturnValue(makeState())
    const { container } = render(<DispatchTerminal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders "Turn Pipeline" header when resolution is running', () => {
    mockUseGame.mockReturnValue(makeState({
      turnPhase: 'resolving',
      isResolutionRunning: true,
    }))
    render(<DispatchTerminal />)
    expect(screen.getByText('Turn Pipeline')).toBeTruthy()
  })

  it('renders all pipeline phase labels', () => {
    mockUseGame.mockReturnValue(makeState({
      turnPhase: 'resolving',
      isResolutionRunning: true,
    }))
    render(<DispatchTerminal />)
    expect(screen.getByText('Turn submitted')).toBeTruthy()
    expect(screen.getByText('Resolving actions')).toBeTruthy()
    expect(screen.getByText('Generating narrative')).toBeTruthy()
  })

  it('shows "Turn complete" when turnPhase is complete', () => {
    mockUseGame.mockReturnValue(makeState({ turnPhase: 'complete' }))
    render(<DispatchTerminal />)
    expect(screen.getByText('Turn complete')).toBeTruthy()
  })

  it('shows error message when turnPhase is failed', () => {
    mockUseGame.mockReturnValue(makeState({
      turnPhase: 'failed',
      turnError: 'AI timeout',
    }))
    render(<DispatchTerminal />)
    expect(screen.getByText('Pipeline failed: AI timeout')).toBeTruthy()
  })

  it('shows Retry Turn button when failed and onRetry provided', () => {
    mockUseGame.mockReturnValue(makeState({ turnPhase: 'failed', turnError: null }))
    const onRetry = vi.fn()
    render(<DispatchTerminal onRetry={onRetry} />)
    expect(screen.getByText('Retry Turn')).toBeTruthy()
  })

  it('appends resolutionProgress to current phase label', () => {
    mockUseGame.mockReturnValue(makeState({
      turnPhase: 'judging',
      isResolutionRunning: true,
      resolutionProgress: 'score: 72',
    }))
    render(<DispatchTerminal />)
    expect(screen.getByText(/score: 72/)).toBeTruthy()
  })
})
