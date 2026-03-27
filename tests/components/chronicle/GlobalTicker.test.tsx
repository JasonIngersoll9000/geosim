import { render, screen } from '@testing-library/react'
import { GlobalTicker } from '@/components/chronicle/GlobalTicker'

describe('GlobalTicker', () => {
  it('renders ticker items', () => {
    render(<GlobalTicker items={['Oil $142/bbl', 'Iran mobilizes']} />)
    expect(screen.getByText(/Oil \$142/)).toBeInTheDocument()
  })
  it('renders with gold separator', () => {
    render(<GlobalTicker items={['A', 'B']} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getAllByText('|').length).toBeGreaterThan(0)
  })
})
