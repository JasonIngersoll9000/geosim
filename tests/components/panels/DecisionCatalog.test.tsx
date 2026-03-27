import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DecisionCatalog } from '@/components/panels/DecisionCatalog'

const mockDecisions = [
  { id: 'd1', title: 'Intensify Air Campaign', dimension: 'military' as const, escalationDirection: 'escalate' as const, resourceWeight: 0.7 },
  { id: 'd2', title: 'Sanctions Expansion', dimension: 'economic' as const, escalationDirection: 'escalate' as const, resourceWeight: 0.4 },
]

describe('DecisionCatalog', () => {
  it('renders all decision titles', () => {
    render(<DecisionCatalog decisions={mockDecisions} onSelect={() => {}} />)
    expect(screen.getByText('Intensify Air Campaign')).toBeInTheDocument()
    expect(screen.getByText('Sanctions Expansion')).toBeInTheDocument()
  })

  it('calls onSelect when decision card clicked', async () => {
    const onSelect = vi.fn()
    render(<DecisionCatalog decisions={mockDecisions} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Intensify Air Campaign'))
    expect(onSelect).toHaveBeenCalledWith('d1')
  })

  it('shows dimension tags', () => {
    render(<DecisionCatalog decisions={mockDecisions} onSelect={() => {}} />)
    // Both section header and DimensionTag render the dimension name
    expect(screen.getAllByText('military').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('economic').length).toBeGreaterThanOrEqual(1)
  })
})
