import { render, screen } from '@testing-library/react'
import { GlobalIndicators } from '@/components/panels/GlobalIndicators'

describe('GlobalIndicators', () => {
  it('renders label and value', () => {
    render(<GlobalIndicators indicators={[{ label: 'Oil', value: '$142/bbl' }]} />)
    expect(screen.getByText('Oil:')).toBeInTheDocument()
    expect(screen.getByText('$142/bbl')).toBeInTheDocument()
  })

  it('applies critical class for critical variant', () => {
    const { container } = render(
      <GlobalIndicators indicators={[{ label: 'Oil', value: 'HIGH', variant: 'critical' }]} />
    )
    const value = screen.getByText('HIGH')
    expect(value).toHaveClass('text-status-critical')
  })

  it('applies warning class for warning variant', () => {
    const { container } = render(
      <GlobalIndicators indicators={[{ label: 'Oil', value: 'MED', variant: 'warning' }]} />
    )
    const value = screen.getByText('MED')
    expect(value).toHaveClass('text-status-warning')
  })

  it('applies default class when no variant', () => {
    const { container } = render(
      <GlobalIndicators indicators={[{ label: 'Oil', value: 'LOW' }]} />
    )
    const value = screen.getByText('LOW')
    expect(value).toHaveClass('text-text-secondary')
  })

  it('renders multiple indicators', () => {
    render(
      <GlobalIndicators
        indicators={[
          { label: 'Oil', value: '$142/bbl' },
          { label: 'Tension', value: 'HIGH', variant: 'critical' },
        ]}
      />
    )
    expect(screen.getByText('Oil:')).toBeInTheDocument()
    expect(screen.getByText('Tension:')).toBeInTheDocument()
    expect(screen.getByText('$142/bbl')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })
})
