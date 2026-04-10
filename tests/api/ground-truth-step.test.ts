import { describe, it, expect } from 'vitest'

// Pure function test for next-turn selection logic
type CommitRow = { turn_number: number; simulated_date: string; narrative_entry: string | null; id: string }

function findNextCommit(commits: CommitRow[], currentTurn: number): CommitRow | null {
  return commits.find(c => c.turn_number === currentTurn + 1) ?? null
}

describe('findNextCommit', () => {
  const commits: CommitRow[] = [
    { id: 'a', turn_number: 1, simulated_date: '2026-03-04', narrative_entry: 'Epic Fury launched' },
    { id: 'b', turn_number: 2, simulated_date: '2026-03-11', narrative_entry: 'Hormuz closed' },
    { id: 'c', turn_number: 3, simulated_date: '2026-03-18', narrative_entry: null },
  ]

  it('returns the next turn', () => {
    const next = findNextCommit(commits, 1)
    expect(next?.turn_number).toBe(2)
    expect(next?.narrative_entry).toBe('Hormuz closed')
  })

  it('returns null when at the end', () => {
    expect(findNextCommit(commits, 3)).toBeNull()
  })

  it('returns turn 1 when currentTurn is 0', () => {
    const next = findNextCommit(commits, 0)
    expect(next?.turn_number).toBe(1)
  })
})
