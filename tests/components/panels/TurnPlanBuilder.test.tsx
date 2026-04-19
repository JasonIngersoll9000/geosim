import { render, screen } from '@testing-library/react'
import { TurnPlanBuilder } from '@/components/panels/TurnPlanBuilder'

describe('TurnPlanBuilder', () => {
  it('renders primary action slot', () => {
    render(<TurnPlanBuilder primaryAction={null} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByText(/primary action/i)).toBeInTheDocument()
  })

  it('shows filled state when primary action selected', () => {
    const action = { id: '1', title: 'Intensify Air Campaign', dimension: 'military' as const }
    render(<TurnPlanBuilder primaryAction={action} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByText('Intensify Air Campaign')).toBeInTheDocument()
  })

  it('shows resource allocation when actions are selected', () => {
    const action = { id: '1', title: 'Air Campaign', dimension: 'military' as const }
    render(<TurnPlanBuilder primaryAction={action} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('disables submit when no primary action', () => {
    render(<TurnPlanBuilder primaryAction={null} concurrentActions={[]} onSubmit={() => {}} />)
    const btn = screen.getByRole('button', { name: /submit turn/i })
    expect(btn).toBeDisabled()
  })

  it('shows split allocation when concurrent actions present', () => {
    const primary = { id: '1', title: 'Air Campaign', dimension: 'military' as const }
    const concurrent = [{ id: '2', title: 'Sanctions', dimension: 'economic' as const }]
    render(<TurnPlanBuilder primaryAction={primary} concurrentActions={concurrent} onSubmit={() => {}} />)
    // 1 primary + 1 concurrent = 2 slots → 50% each (Math.round(100/2) = 50)
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })
})
