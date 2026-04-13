import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActorList } from '@/components/panels/ActorList'
import type { ActorSummary } from '@/lib/types/panels'

const mockActors: ActorSummary[] = [
  {
    id: 'united_states',
    name: 'United States',
    shortName: 'USA',
    actorColor: '#4a90d9',
    escalationRung: 5,
    escalationRungName: 'Limited Strikes',
    primaryObjective: 'Prevent Iranian nuclear capability',
    relationshipStance: 'ally',
  },
  {
    id: 'iran',
    name: 'Iran',
    shortName: 'IRN',
    actorColor: '#c0392b',
    escalationRung: 6,
    escalationRungName: 'Strategic Deterrence',
    primaryObjective: 'Regime survival and regional hegemony',
    relationshipStance: 'adversary',
  },
]

describe('ActorList', () => {
  it('renders all actors', () => {
    render(<ActorList actors={mockActors} selectedActorId={null} viewerActorId={null} onSelect={() => {}} />)
    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('Iran')).toBeInTheDocument()
  })

  it('calls onSelect when actor row clicked', async () => {
    const onSelect = vi.fn()
    render(<ActorList actors={mockActors} selectedActorId={null} viewerActorId={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('United States'))
    expect(onSelect).toHaveBeenCalledWith('united_states')
  })

  it('highlights selected actor', () => {
    const { container } = render(
      <ActorList actors={mockActors} selectedActorId="iran" viewerActorId={null} onSelect={() => {}} />
    )
    const rows = container.querySelectorAll('[data-actor-id]')
    const iranRow = Array.from(rows).find(r => r.getAttribute('data-actor-id') === 'iran')
    expect(iranRow).toBeTruthy()
  })
})
