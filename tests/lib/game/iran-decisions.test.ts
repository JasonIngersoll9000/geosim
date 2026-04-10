import { describe, it, expect } from 'vitest'
import { IRAN_DECISIONS, IRAN_DECISION_DETAILS } from '@/lib/game/iran-decisions'

describe('IRAN_DECISIONS catalog', () => {
  it('has 7 decisions', () => {
    expect(IRAN_DECISIONS).toHaveLength(7)
  })

  it('every decision has a matching detail entry', () => {
    for (const d of IRAN_DECISIONS) {
      expect(IRAN_DECISION_DETAILS[d.id], `missing detail for ${d.id}`).toBeDefined()
    }
  })

  it('all resourceWeights are between 0 and 1', () => {
    for (const d of IRAN_DECISIONS) {
      expect(d.resourceWeight).toBeGreaterThan(0)
      expect(d.resourceWeight).toBeLessThanOrEqual(1)
    }
  })
})
