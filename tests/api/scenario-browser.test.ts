import { describe, it, expect } from 'vitest'

type BranchRow = {
  id: string; name: string; is_trunk: boolean; status: string
  head_commit_id: string | null; created_at: string; parent_branch_id: string | null
  turn_commits: Array<{ turn_number: number; simulated_date: string }>
}

interface BranchNode {
  id: string; name: string; isTrunk: boolean; status: 'active' | 'archived'
  forkTurn: number; headTurn: number; totalTurns: number; lastPlayedAt: string
  controlledActor: string | null; children: BranchNode[]; turnDate?: string
}

function buildBranchTree(rows: BranchRow[]): BranchNode | null {
  const map = new Map<string, BranchNode>()
  for (const row of rows) {
    const commits = row.turn_commits ?? []
    const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0)
    const latestCommit = commits.find(c => c.turn_number === maxTurn)
    map.set(row.id, {
      id: row.id,
      name: row.name,
      isTrunk: row.is_trunk,
      status: row.status === 'active' ? 'active' : 'archived',
      forkTurn: 0,
      headTurn: maxTurn,
      totalTurns: commits.length,
      lastPlayedAt: row.created_at,
      controlledActor: null,
      children: [],
      turnDate: latestCommit?.simulated_date,
    })
  }
  let root: BranchNode | null = null
  for (const row of rows) {
    const node = map.get(row.id)!
    if (row.parent_branch_id && map.has(row.parent_branch_id)) {
      map.get(row.parent_branch_id)!.children.push(node)
    } else {
      root = node
    }
  }
  return root
}

describe('buildBranchTree', () => {
  it('maps trunk branch correctly', () => {
    const row: BranchRow = {
      id: 'abc', name: 'Ground Truth', is_trunk: true, status: 'active',
      head_commit_id: 'xyz', created_at: '2026-04-01T00:00:00Z',
      parent_branch_id: null,
      turn_commits: [{ turn_number: 1, simulated_date: '2026-03-04' }, { turn_number: 4, simulated_date: '2026-03-22' }],
    }
    const root = buildBranchTree([row])
    expect(root).not.toBeNull()
    expect(root!.isTrunk).toBe(true)
    expect(root!.headTurn).toBe(4)
    expect(root!.totalTurns).toBe(2)
  })

  it('builds parent-child tree', () => {
    const rows: BranchRow[] = [
      { id: 'parent', name: 'Ground Truth', is_trunk: true, status: 'active',
        head_commit_id: 'p1', created_at: '2026-04-01T00:00:00Z', parent_branch_id: null,
        turn_commits: [{ turn_number: 1, simulated_date: '2026-03-04' }] },
      { id: 'child', name: 'Player Branch', is_trunk: false, status: 'active',
        head_commit_id: 'c1', created_at: '2026-04-02T00:00:00Z', parent_branch_id: 'parent',
        turn_commits: [] },
    ]
    const root = buildBranchTree(rows)
    expect(root!.children).toHaveLength(1)
    expect(root!.children[0].id).toBe('child')
  })
})
