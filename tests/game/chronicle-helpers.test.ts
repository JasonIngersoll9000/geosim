import { describe, it, expect } from 'vitest'
import { getChronicleUpToTurn } from '@/lib/game/chronicle-helpers'

// Minimal Supabase client mock — only needs .from().select().eq().lte().order()
function makeSupabase(trunkCommits: unknown[], branchCommits: unknown[]) {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          lte: (_col2: string, _val2: number) => ({
            order: (_col3: string, _opts: unknown) =>
              Promise.resolve({ data: trunkCommits, error: null }),
          }),
          gt: (_col2: string, _val2: number) => ({
            lte: (_col3: string, _val3: number) => ({
              order: (_col4: string, _opts: unknown) =>
                Promise.resolve({ data: branchCommits, error: null }),
            }),
          }),
          order: (_col2: string, _opts: unknown) =>
            Promise.resolve({ data: branchCommits, error: null }),
        }),
      }),
    }),
  }
}

describe('getChronicleUpToTurn', () => {
  it('returns only trunk commits for a trunk branch', async () => {
    const trunk = [
      { turn_number: 1, chronicle_headline: 'T1' },
      { turn_number: 2, chronicle_headline: 'T2' },
      { turn_number: 3, chronicle_headline: 'T3' },
    ]
    const sb = makeSupabase([], trunk)
    const result = await getChronicleUpToTurn(sb as never, 'branch-1', 2)
    // With maxTurn=2, should only return turns <= 2
    expect(result.every(r => r.turn_number <= 2)).toBe(true)
  })

  it('merges trunk ancestry and branch divergence for a forked branch', async () => {
    const trunkCommits = [
      { turn_number: 1, chronicle_headline: 'GT-1' },
      { turn_number: 2, chronicle_headline: 'GT-2' },
    ]
    const branchCommits = [
      { turn_number: 3, chronicle_headline: 'BR-3' },
    ]
    const sb = makeSupabase(trunkCommits, branchCommits)
    const result = await getChronicleUpToTurn(sb as never, 'branch-fork', 3, {
      parentBranchId: 'trunk-id',
      forkTurnNumber: 2,
    })
    expect(result).toHaveLength(3)
    expect(result.map(r => r.turn_number)).toEqual([1, 2, 3])
  })

  it('branch commits overwrite trunk commits at the same turn_number', async () => {
    const trunkCommits = [{ turn_number: 2, chronicle_headline: 'GT-2' }]
    const branchCommits = [{ turn_number: 2, chronicle_headline: 'BRANCH-2' }]
    const sb = makeSupabase(trunkCommits, branchCommits)
    const result = await getChronicleUpToTurn(sb as never, 'branch-fork', 2, {
      parentBranchId: 'trunk-id',
      forkTurnNumber: 2,
    })
    expect(result).toHaveLength(1)
    expect(result[0].chronicle_headline).toBe('BRANCH-2')
  })
})
