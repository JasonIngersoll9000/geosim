// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { scoreBranchWorthiness } from '@/lib/game/branch-worthiness'

describe('scoreBranchWorthiness', () => {
  it('scores nuclear facility strikes highly', () => {
    const result = scoreBranchWorthiness([], 'US strikes Fordow enrichment facility with B-52 bombers')
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('scores civilian infrastructure attacks highly', () => {
    const result = scoreBranchWorthiness([], 'Israel strikes Iranian electricity grid and power plants')
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('scores routine patrol turns low', () => {
    const result = scoreBranchWorthiness([], 'Routine carrier group patrol in Arabian Sea. No significant activity.')
    expect(result.score).toBeLessThan(60)
  })

  it('returns BranchWorthiness shape', () => {
    const result = scoreBranchWorthiness([], 'Iran mines the Strait of Hormuz')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('reason')
    expect(result).toHaveProperty('suggestedBranchLabel')
    expect(result).toHaveProperty('alternateResponses')
    expect(Array.isArray(result.alternateResponses)).toBe(true)
  })

  it('caps score at 100', () => {
    const result = scoreBranchWorthiness(
      [],
      'US assassinates Iranian general near Fordow nuclear facility, Iran mines strait of Hormuz, Israel bombs civilian electricity grid, first strike on alliance member'
    )
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
