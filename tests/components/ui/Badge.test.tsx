import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('renders military variant with status-critical color', () => {
    render(<Badge variant="military">Military</Badge>)
    const badge = screen.getByText('Military')
    expect(badge).toHaveClass('text-status-critical')
  })

  it('renders info variant with status-info color', () => {
    render(<Badge variant="info">Info</Badge>)
    const badge = screen.getByText('Info')
    expect(badge).toHaveClass('text-status-info')
  })

  it('renders stable variant with status-stable color', () => {
    render(<Badge variant="stable">Stable</Badge>)
    expect(screen.getByText('Stable')).toHaveClass('text-status-stable')
  })
})
