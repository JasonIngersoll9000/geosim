import { render, screen } from '@testing-library/react'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'

const mockActor = {
  id: 'united_states',
  name: 'United States',
  escalationRung: 5,
  briefing: 'Conventional power with global reach.',
  militaryStrength: 0.9,
  economicStrength: 0.85,
  politicalStability: 0.7,
  objectives: ['Prevent nuclear Iran', 'Protect Israel'],
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
