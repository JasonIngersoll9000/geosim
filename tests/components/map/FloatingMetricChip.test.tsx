import { render, screen } from '@testing-library/react'
import { FloatingMetricChip } from '@/components/map/FloatingMetricChip'

describe('FloatingMetricChip', () => {
  it('renders label and value', () => {
    render(<FloatingMetricChip label="Oil" value="$142/bbl" />)
    expect(screen.getByText('Oil:')).toBeInTheDocument()
    expect(screen.getByText('$142/bbl')).toBeInTheDocument()
  })
  it('applies critical class for critical variant', () => {
    const { container } = render(<FloatingMetricChip label="Oil" value="$142/bbl" variant="critical" />)
    const strong = container.querySelector('strong')
    expect(strong?.className).toContain('text-status-critical')
  })
  it('applies warning class for warning variant', () => {
    const { container } = render(<FloatingMetricChip label="Oil" value="$142/bbl" variant="warning" />)
    const strong = container.querySelector('strong')
    expect(strong?.className).toContain('text-status-warning')
  })
  it('renders icon when provided', () => {
    render(<FloatingMetricChip label="Oil" value="$142/bbl" icon="⛽" />)
    expect(screen.getByText('⛽')).toBeInTheDocument()
  })
})
