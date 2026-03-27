import { render, screen } from '@testing-library/react'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'

const makeEntry = (
  turnNumber: number,
  severity: 'critical' | 'major' | 'minor',
  title: string,
) => ({
  turnNumber,
  date: `Turn ${turnNumber}`,
  title,
  narrative: `Narrative for turn ${turnNumber}.`,
  severity,
  tags: [],
})

const entries = [
  makeEntry(1, 'critical', 'Critical Event'),
  makeEntry(2, 'major', 'Major Event'),
  makeEntry(3, 'minor', 'Minor Event'),
]

describe('ChronicleTimeline', () => {
  it('renders all entries passed to it', () => {
    render(<ChronicleTimeline entries={entries} />)
    expect(screen.getByText('Critical Event')).toBeInTheDocument()
    expect(screen.getByText('Major Event')).toBeInTheDocument()
    expect(screen.getByText('Minor Event')).toBeInTheDocument()
  })

  it('applies border-status-critical dot class for critical severity', () => {
    const { container } = render(
      <ChronicleTimeline entries={[makeEntry(1, 'critical', 'Critical Event')]} />,
    )
    const dot = container.querySelector('.border-status-critical')
    expect(dot).toBeInTheDocument()
  })

  it('applies border-gold dot class for major severity', () => {
    const { container } = render(
      <ChronicleTimeline entries={[makeEntry(2, 'major', 'Major Event')]} />,
    )
    const dot = container.querySelector('.border-gold')
    expect(dot).toBeInTheDocument()
  })

  it('applies border-border-hi dot class for minor severity', () => {
    const { container } = render(
      <ChronicleTimeline entries={[makeEntry(3, 'minor', 'Minor Event')]} />,
    )
    const dot = container.querySelector('.border-border-hi')
    expect(dot).toBeInTheDocument()
  })

  it('renders the vertical timeline line element', () => {
    const { container } = render(<ChronicleTimeline entries={entries} />)
    const line = container.querySelector('.bg-border-subtle.w-px')
    expect(line).toBeInTheDocument()
  })
})
