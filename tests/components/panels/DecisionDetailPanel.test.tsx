import { render, screen } from '@testing-library/react'
import { DecisionDetailPanel } from '@/components/panels/DecisionDetailPanel'

const mockDecision = {
  id: 'd1',
  title: 'Intensify Air Campaign',
  dimension: 'military' as const,
  escalationDirection: 'escalate' as const,
  resourceWeight: 0.7,
  strategicRationale: 'Degrades Iranian air defense networks systematically.',
  concurrencyRules: [],
}

describe('DecisionDetailPanel', () => {
  it('renders strategic rationale when open', () => {
    render(<DecisionDetailPanel decision={mockDecision} open={true} onClose={() => {}} />)
    expect(screen.getByText(/Degrades Iranian air defense/)).toBeInTheDocument()
  })

  it('renders decision title when open', () => {
    render(<DecisionDetailPanel decision={mockDecision} open={true} onClose={() => {}} />)
    expect(screen.getByText('Intensify Air Campaign')).toBeInTheDocument()
  })

  it('shows fallback when decision is null', () => {
    render(<DecisionDetailPanel decision={null} open={true} onClose={() => {}} />)
    expect(screen.getByText(/no decision selected/i)).toBeInTheDocument()
  })
})
