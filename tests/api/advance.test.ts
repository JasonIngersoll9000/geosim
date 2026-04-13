import { describe, it, expect } from 'vitest'

// Pure function test for date advancement
function advanceSimulatedDate(currentDate: string, weeksToAdd: number): string {
  const [y, m, day] = currentDate.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day))
  d.setUTCDate(d.getUTCDate() + weeksToAdd * 7)
  return d.toISOString().split('T')[0]
}

describe('advanceSimulatedDate', () => {
  it('advances by 1 week', () => {
    expect(advanceSimulatedDate('2026-03-04', 1)).toBe('2026-03-11')
  })
  it('advances by 1 week across month boundary', () => {
    expect(advanceSimulatedDate('2026-03-28', 1)).toBe('2026-04-04')
  })
})
