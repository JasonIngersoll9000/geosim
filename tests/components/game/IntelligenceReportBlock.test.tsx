import { render, screen } from '@testing-library/react'
import { IntelligenceReportBlock } from '@/components/game/IntelligenceReportBlock'

describe('IntelligenceReportBlock', () => {
  it('renders header in brackets', () => {
    render(<IntelligenceReportBlock header="ASSESSMENT" body="Iran readiness degraded." />)
    expect(screen.getByText('[ASSESSMENT]')).toBeInTheDocument()
  })

  it('renders body text', () => {
    render(<IntelligenceReportBlock header="ASSESSMENT" body="Iran readiness degraded." />)
    expect(screen.getByText('Iran readiness degraded.')).toBeInTheDocument()
  })

  it('has gold left border styling', () => {
    const { container } = render(<IntelligenceReportBlock header="H" body="B" />)
    expect(container.firstChild).toHaveClass('border-l-4')
  })
})
