import { render, screen } from '@testing-library/react'
import { ConstraintCascadeAlert } from '@/components/game/ConstraintCascadeAlert'

const mockSteps = [
  { condition: 'Ayatollah killed', constraintRemoved: 'Religious prohibition on nukes' },
  { condition: 'Attack already in progress', constraintRemoved: 'Nuclear deterrence' },
]

describe('ConstraintCascadeAlert', () => {
  it('renders title', () => {
    render(<ConstraintCascadeAlert title="Nuclear Cascade Forming" steps={mockSteps} likelihood={65} />)
    expect(screen.getByText('Nuclear Cascade Forming')).toBeInTheDocument()
  })

  it('renders all cascade steps', () => {
    render(<ConstraintCascadeAlert title="Test" steps={mockSteps} likelihood={65} />)
    expect(screen.getByText(/Ayatollah killed/)).toBeInTheDocument()
    expect(screen.getByText(/Religious prohibition/)).toBeInTheDocument()
  })

  it('renders likelihood percentage', () => {
    render(<ConstraintCascadeAlert title="Test" steps={mockSteps} likelihood={65} />)
    expect(screen.getByText(/65%/)).toBeInTheDocument()
  })

  it('has critical left border', () => {
    const { container } = render(<ConstraintCascadeAlert title="T" steps={[]} likelihood={0} />)
    expect(container.firstChild).toHaveClass('border-l-4')
  })
})
