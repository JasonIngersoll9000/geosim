import { render, screen } from '@testing-library/react'
import { ChokepointMarker } from '@/components/map/ChokepointMarker'

describe('ChokepointMarker', () => {
  it('renders label', () => {
    render(<ChokepointMarker label="Hormuz" status="open" />)
    expect(screen.getByText('Hormuz')).toBeInTheDocument()
  })
  it('applies critical classes for blocked status', () => {
    const { container } = render(<ChokepointMarker label="Hormuz" status="blocked" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-status-critical')
    expect(el.className).toContain('border-status-critical')
  })
  it('applies warning classes for contested status', () => {
    const { container } = render(<ChokepointMarker label="Hormuz" status="contested" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-status-warning')
    expect(el.className).toContain('border-status-warning')
  })
  it('applies gold classes for open status', () => {
    const { container } = render(<ChokepointMarker label="Hormuz" status="open" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-gold')
    expect(el.className).toContain('border-gold')
  })
})
