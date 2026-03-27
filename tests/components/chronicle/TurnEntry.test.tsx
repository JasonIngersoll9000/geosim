import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TurnEntry } from '@/components/chronicle/TurnEntry'

const mockEntry = {
  turnNumber: 3,
  date: '15 Mar 2026',
  title: 'The Oil War Escalates',
  narrative: 'US and Israeli forces struck Iran oil infrastructure.',
  severity: 'critical' as const,
  tags: ['Ras Tanura Hit', 'Oil $142/bbl'],
}

describe('TurnEntry', () => {
  it('renders turn date', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument()
  })
  it('renders title', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText('The Oil War Escalates')).toBeInTheDocument()
  })
  it('renders narrative prose', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText(/US and Israeli forces/)).toBeInTheDocument()
  })
  it('renders all tags', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText('Ras Tanura Hit')).toBeInTheDocument()
    expect(screen.getByText('Oil $142/bbl')).toBeInTheDocument()
  })
  it('applies data-severity attribute', () => {
    const { container } = render(<TurnEntry entry={mockEntry} />)
    expect(container.firstChild).toHaveAttribute('data-severity', 'critical')
  })
})
