import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DispatchTerminal, type DispatchLine } from '@/components/game/DispatchTerminal'

const mockLines: DispatchLine[] = [
  { timestamp: '22:14:03', text: 'RESOLUTION ENGINE ACTIVE', type: 'default' },
  { timestamp: '22:14:07', text: 'COLLISION DETECTED: STRAIT OF HORMUZ', type: 'critical' },
  { timestamp: '22:14:10', text: 'EVENT CONFIRMED: TURN COMPLETE', type: 'confirmed' },
]

describe('DispatchTerminal', () => {
  it('renders all dispatch lines', () => {
    render(<DispatchTerminal lines={mockLines} isRunning={false} />)
    expect(screen.getByText('RESOLUTION ENGINE ACTIVE')).toBeTruthy()
    expect(screen.getByText('COLLISION DETECTED: STRAIT OF HORMUZ')).toBeTruthy()
    expect(screen.getByText('EVENT CONFIRMED: TURN COMPLETE')).toBeTruthy()
  })

  it('renders timestamps for each line', () => {
    render(<DispatchTerminal lines={mockLines} isRunning={false} />)
    expect(screen.getByText('[22:14:03]')).toBeTruthy()
  })

  it('shows blinking cursor when isRunning is true', () => {
    const { container } = render(<DispatchTerminal lines={[]} isRunning={true} />)
    expect(container.querySelector('[data-cursor]')).toBeTruthy()
  })

  it('hides cursor when isRunning is false', () => {
    const { container } = render(<DispatchTerminal lines={[]} isRunning={false} />)
    expect(container.querySelector('[data-cursor]')).toBeNull()
  })

  it('applies critical color class to critical lines', () => {
    const { container } = render(<DispatchTerminal lines={mockLines} isRunning={false} />)
    const criticalLine = container.querySelector('[data-line-type="critical"]')
    expect(criticalLine?.className).toContain('text-status-critical')
  })
})
