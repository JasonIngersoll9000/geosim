import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EventsTab } from '@/components/panels/EventsTab'
import type { TurnResolutionData } from '@/components/panels/EventsTab'

const mockResolution: TurnResolutionData = {
  turnNumber: 3,
  simulatedDate: 'March 15, 2026',
  chronicleHeadline: 'Turn 3 — Strike Package Alpha',
  narrativeSummary: 'In the predawn hours, the conflict entered a new phase.',
  judgeScore: 78,
  events: [
    { actorId: 'united_states', actorName: 'United States', actorColor: '#4a9eff', actionTitle: 'Air strikes hit 12 targets', dimension: 'military' },
  ],
  escalationChanges: [],
}

describe('EventsTab', () => {
  it('renders turn headline', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText(/Strike Package Alpha/)).toBeTruthy()
  })

  it('renders event action title', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText('Air strikes hit 12 targets')).toBeTruthy()
  })

  it('renders judge score', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText('78/100')).toBeTruthy()
  })

  it('renders narrative summary', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText(/predawn hours/)).toBeTruthy()
  })

  it('renders null state when no resolution', () => {
    render(<EventsTab resolution={null} />)
    expect(screen.getByText(/No Events Yet/i)).toBeTruthy()
  })
})
