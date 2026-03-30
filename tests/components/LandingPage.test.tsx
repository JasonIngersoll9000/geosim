import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Landing page — issue #29', () => {
  it('renders classification banner', () => {
    render(<Home />)
    expect(
      screen.getByText(/TOP SECRET.*GEOSIM.*DECLASSIFIED/i)
    ).toBeInTheDocument()
  })

  it('renders hero headline with alternate timeline phrase', () => {
    render(<Home />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/Model the decisions that shape history/i)
    expect(h1).toHaveTextContent(/alternate timeline/i)
  })

  it('renders all three how-it-works step numbers', () => {
    render(<Home />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
  })

  it('renders hero Launch Simulation CTA linking to /scenarios/iran-2026', () => {
    render(<Home />)
    const links = screen.getAllByRole('link', { name: /launch simulation/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/scenarios/iran-2026')
  })

  it('renders Browse Scenarios CTA linking to /scenarios', () => {
    render(<Home />)
    const links = screen.getAllByRole('link', { name: /browse/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/scenarios')
  })

  it('renders Iran 2026 scenario card with SECRET badge', () => {
    render(<Home />)
    expect(screen.getByText('SECRET')).toBeInTheDocument()
    expect(screen.getAllByText(/IRAN 2026/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/The Oil War Escalates/i)).toBeInTheDocument()
  })

  it('does not render component showcase elements', () => {
    render(<Home />)
    expect(screen.queryByText(/System Status/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Global Indicators/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Sample Progress/i)).not.toBeInTheDocument()
  })
})
