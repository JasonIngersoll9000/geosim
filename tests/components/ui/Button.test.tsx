import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders primary variant with gold background', () => {
    render(<Button variant="primary">Submit</Button>)
    const btn = screen.getByRole('button', { name: 'Submit' })
    expect(btn).toHaveClass('bg-gold')
  })

  it('renders ghost variant with border', () => {
    render(<Button variant="ghost">Cancel</Button>)
    const btn = screen.getByRole('button', { name: 'Cancel' })
    expect(btn).toHaveClass('border')
  })

  it('renders with Space Grotesk label font class', () => {
    render(<Button variant="primary">Go</Button>)
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn).toHaveClass('font-label')
  })
})
