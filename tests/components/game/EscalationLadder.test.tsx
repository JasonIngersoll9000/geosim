import { render } from '@testing-library/react'
import { EscalationLadder } from '@/components/game/EscalationLadder'

describe('EscalationLadder', () => {
  it('renders 8 rungs', () => {
    const { container } = render(<EscalationLadder currentRung={5} maxRung={8} />)
    expect(container.querySelectorAll('[data-rung]').length).toBe(8)
  })

  it('marks current rung with aria-current', () => {
    const { container } = render(<EscalationLadder currentRung={3} maxRung={8} />)
    const current = container.querySelector('[aria-current="true"]')
    expect(current).not.toBeNull()
    expect(current?.getAttribute('data-rung')).toBe('3')
  })

  it('applies gold styling to current rung', () => {
    const { container } = render(<EscalationLadder currentRung={5} maxRung={8} />)
    const current = container.querySelector('[aria-current="true"]')
    expect(current?.className).toMatch(/gold/)
  })
})
