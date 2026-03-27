import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EventsTab } from '@/components/panels/EventsTab'

const mockResolution = {
  narrative: 'In the predawn hours, the conflict entered a new phase.',
  actionOutcomes: [
    { actorId: 'united_states', decisionId: 'd1', succeeded: true, outcome: 'Air strikes hit 12 targets', parameterEffects: 'Overwhelming force profile applied' },
  ],
  reactionPhase: null,
  judgeScores: { plausibility: 84, consistency: 81, proportionality: 76, rationality: 72, cascadeLogic: 78, overallScore: 78 },
}

describe('EventsTab', () => {
  it('renders turn narrative', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText(/predawn hours/)).toBeTruthy()
  })

  it('renders action outcome cards', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText('Air strikes hit 12 targets')).toBeTruthy()
  })

  it('renders judge scores', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText('84')).toBeTruthy()
  })

  it('shows no reaction block when reactionPhase is null', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.queryByText(/reaction phase/i)).toBeNull()
  })

  it('shows reaction block when reactionPhase is provided', () => {
    const withReaction = { ...mockResolution, reactionPhase: 'Forces repositioned across the strait.' }
    render(<EventsTab resolution={withReaction} />)
    expect(screen.getByText(/Forces repositioned/)).toBeTruthy()
  })
})
