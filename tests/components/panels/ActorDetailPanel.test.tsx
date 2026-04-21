import { render, screen } from '@testing-library/react'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'
import type { ActorDetail } from '@/lib/types/panels'

const mockActor: ActorDetail = {
  id: 'united_states',
  name: 'United States',
  shortName: 'USA',
  actorColor: '#4a90d9',
  escalationRung: 5,
  escalationRungName: 'Limited Strikes',
  briefing: 'Conventional power with global reach.',
  militaryStrength: 90,
  economicStrength: 85,
  politicalStability: 70,
  objectives: ['Prevent nuclear Iran', 'Protect Israel'],
  primaryObjective: 'Prevent nuclear Iran',
  winCondition: 'Prevent Iran from achieving nuclear capability while avoiding regional war.',
  isAdversary: false,
  relationshipStance: 'ally',
  escalationRungs: [
    { level: 1, name: 'Diplomatic Pressure', description: 'Statements and sanctions threats.', reversibility: 'easy' },
    { level: 5, name: 'Limited Strikes', description: 'Tomahawk strikes on military targets.', reversibility: 'moderate' },
    { level: 8, name: 'Nuclear', description: 'Nuclear use — last resort.', reversibility: 'irreversible' },
  ],
}

describe('ActorDetailPanel', () => {
  it('renders actor name', () => {
    render(<ActorDetailPanel actor={mockActor} open={true} onClose={() => {}} />)
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('renders briefing prose', () => {
    render(<ActorDetailPanel actor={mockActor} open={true} onClose={() => {}} />)
    expect(screen.getByText(/Conventional power/)).toBeInTheDocument()
  })

  it('renders objectives', () => {
    render(<ActorDetailPanel actor={mockActor} open={true} onClose={() => {}} />)
    expect(screen.getByText('Prevent nuclear Iran')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const onClose = vi.fn()
    render(<ActorDetailPanel actor={mockActor} open={true} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
