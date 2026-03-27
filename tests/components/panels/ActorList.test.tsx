import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActorList } from '@/components/panels/ActorList'

const mockActors = [
  { id: 'united_states', name: 'United States', escalationRung: 5 },
  { id: 'iran', name: 'Iran', escalationRung: 6 },
]

describe('ActorList', () => {
  it('renders all actors', () => {
    render(<ActorList actors={mockActors} selectedActorId={null} onSelect={() => {}} />)
    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('Iran')).toBeInTheDocument()
  })

  it('calls onSelect when actor row clicked', async () => {
    const onSelect = vi.fn()
    render(<ActorList actors={mockActors} selectedActorId={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('United States'))
    expect(onSelect).toHaveBeenCalledWith('united_states')
  })

  it('shows escalation badge for each actor', () => {
    render(<ActorList actors={mockActors} selectedActorId={null} onSelect={() => {}} />)
    expect(screen.getByText('Rung 5')).toBeInTheDocument()
    expect(screen.getByText('Rung 6')).toBeInTheDocument()
  })

  it('highlights selected actor', () => {
    const { container } = render(
      <ActorList actors={mockActors} selectedActorId="iran" onSelect={() => {}} />
    )
    const rows = container.querySelectorAll('[data-actor-id]')
    const iranRow = Array.from(rows).find(r => r.getAttribute('data-actor-id') === 'iran')
    expect(iranRow?.className).toContain('bg-bg-surface')
  })
})
