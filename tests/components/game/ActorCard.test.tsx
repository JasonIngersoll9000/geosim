import { render, screen } from '@testing-library/react'
import { ActorCard } from '@/components/game/ActorCard'

const mockActor = {
  id: 'united_states',
  name: 'United States',
  escalationRung: 5,
  status: 'escalating' as const,
  metrics: [
    { label: 'Air Defense', value: '42%' },
    { label: 'Readiness', value: '58' },
  ],
}

describe('ActorCard', () => {
  it('renders actor name', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByText(/escalating/i)).toBeInTheDocument()
  })

  it('renders all metrics', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByText('Air Defense')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('renders View Dossier button', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByRole('button', { name: /view dossier/i })).toBeInTheDocument()
  })
})
