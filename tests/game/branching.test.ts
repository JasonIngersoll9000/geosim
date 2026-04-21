import { describe, it, expect } from 'vitest'
import {
  createBranch,
  commitTurn,
  forkBranch,
  isSequentialCommit,
  isForkPointValid,
} from '../../lib/game/branching'
import type { BranchStateAtTurn } from '../../lib/types/simulation'

// ─── Shared fixture ──────────────────────────────────────────────────────────

function makeBranchState(overrides: Partial<BranchStateAtTurn> = {}): BranchStateAtTurn {
  return {
    scenario_id: 'sc-1',
    branch_id: 'branch-parent',
    turn_commit_id: 'commit-5',
    as_of_date: '2026-03-22',
    actor_states: {
      iran: {
        actor_id: 'iran',
        military_strength: 55,
        political_stability: 30,
        economic_health: 40,
        public_support: 45,
        international_standing: 20,
        asset_inventory: { ballistic_missiles: 200, drones: 300 },
        global_state: {},
        facility_statuses: [],
        asset_availability: {},
      },
      united_states: {
        actor_id: 'united_states',
        military_strength: 90,
        political_stability: 70,
        economic_health: 75,
        public_support: 55,
        international_standing: 65,
        asset_inventory: { f35: 48, tomahawks: 500 },
        global_state: {},
        facility_statuses: [],
        asset_availability: {},
      },
    },
    global_state: { oil_price_usd: 145, hormuz_throughput_pct: 30, global_economic_stress: 60 },
    facility_statuses: [],
    active_depletion_rates: {
      iran: { ballistic_missiles: -2, drones: -5 },
    },
    initial_inventories: {
      iran: { ballistic_missiles: 500, drones: 800 },
      united_states: { f35: 48, tomahawks: 800 },
    },
    ...overrides,
  }
}

// ─── createBranch ────────────────────────────────────────────────────────────

describe('createBranch', () => {
  it('creates a trunk branch with no parent', () => {
    const branch = createBranch('branch-1', 'Trunk', null, null, true)
    expect(branch.id).toBe('branch-1')
    expect(branch.name).toBe('Trunk')
    expect(branch.isTrunk).toBe(true)
    expect(branch.parentBranchId).toBeNull()
    expect(branch.forkFromCommitId).toBeNull()
  })

  it('creates a fork branch with parent reference', () => {
    const branch = createBranch('branch-2', 'Alt Timeline', 'branch-1', 'commit-3')
    expect(branch.id).toBe('branch-2')
    expect(branch.parentBranchId).toBe('branch-1')
    expect(branch.forkFromCommitId).toBe('commit-3')
    expect(branch.isTrunk).toBe(false)
  })

  it('throws when id is missing', () => {
    expect(() => createBranch('', 'Trunk', null, null, true)).toThrow()
  })

  it('throws when name is missing', () => {
    expect(() => createBranch('branch-1', '', null, null, true)).toThrow()
  })

  it('throws when non-trunk branch is missing parentBranchId', () => {
    expect(() => createBranch('branch-2', 'Alt', null, 'commit-3', false)).toThrow()
  })

  it('throws when non-trunk branch is missing forkFromCommitId', () => {
    expect(() => createBranch('branch-2', 'Alt', 'branch-1', null, false)).toThrow()
  })

  it('sets createdAt to a valid ISO string by default', () => {
    const branch = createBranch('b', 'Trunk', null, null, true)
    expect(() => new Date(branch.createdAt)).not.toThrow()
    expect(new Date(branch.createdAt).toISOString()).toBe(branch.createdAt)
  })

  it('accepts a custom createdAt', () => {
    const ts = '2026-03-01T00:00:00.000Z'
    const branch = createBranch('b', 'Trunk', null, null, true, ts)
    expect(branch.createdAt).toBe(ts)
  })
})

// ─── commitTurn ─────────────────────────────────────────────────────────────

describe('commitTurn', () => {
  it('creates a commit with all required fields', () => {
    const commit = commitTurn('commit-1', 'branch-1', 1, '2026-02-28')
    expect(commit.id).toBe('commit-1')
    expect(commit.branchId).toBe('branch-1')
    expect(commit.turnNumber).toBe(1)
    expect(commit.simulatedDate).toBe('2026-02-28')
    expect(commit.narrativeEntry).toBeNull()
  })

  it('stores a narrative entry when provided', () => {
    const commit = commitTurn('c-2', 'b-1', 2, '2026-03-07', 'US strikes deepened.')
    expect(commit.narrativeEntry).toBe('US strikes deepened.')
  })

  it('throws when turnNumber is 0', () => {
    expect(() => commitTurn('c', 'b', 0, '2026-01-01')).toThrow()
  })

  it('throws when turnNumber is negative', () => {
    expect(() => commitTurn('c', 'b', -1, '2026-01-01')).toThrow()
  })

  it('throws when turnNumber is not an integer', () => {
    expect(() => commitTurn('c', 'b', 1.5, '2026-01-01')).toThrow()
  })

  it('throws when id is empty', () => {
    expect(() => commitTurn('', 'b', 1, '2026-01-01')).toThrow()
  })

  it('throws when simulatedDate is empty', () => {
    expect(() => commitTurn('c', 'b', 1, '')).toThrow()
  })

  it('throws when branchId is empty', () => {
    expect(() => commitTurn('c', '', 1, '2026-01-01')).toThrow()
  })
})

// ─── forkBranch ─────────────────────────────────────────────────────────────

describe('forkBranch', () => {
  it('returns a new state with the updated branch_id', () => {
    const parent = makeBranchState()
    const forked = forkBranch(parent, 'branch-fork')
    expect(forked.branch_id).toBe('branch-fork')
  })

  it('does not mutate the parent state', () => {
    const parent = makeBranchState()
    forkBranch(parent, 'branch-fork')
    expect(parent.branch_id).toBe('branch-parent')
  })

  it('copies actor_states as a deep clone', () => {
    const parent = makeBranchState()
    const forked = forkBranch(parent, 'branch-fork')
    forked.actor_states['iran'].military_strength = 1
    expect(parent.actor_states['iran'].military_strength).toBe(55)
  })

  it('copies global_state as a deep clone', () => {
    const parent = makeBranchState()
    const forked = forkBranch(parent, 'branch-fork')
    forked.global_state.oil_price_usd = 999
    expect(parent.global_state.oil_price_usd).toBe(145)
  })

  it('copies initial_inventories as a deep clone', () => {
    const parent = makeBranchState()
    const forked = forkBranch(parent, 'branch-fork')
    forked.initial_inventories['iran']['ballistic_missiles'] = 0
    expect(parent.initial_inventories['iran']['ballistic_missiles']).toBe(500)
  })

  it('copies active_depletion_rates to the fork', () => {
    const parent = makeBranchState()
    const forked = forkBranch(parent, 'branch-fork')
    expect(forked.active_depletion_rates['iran']['ballistic_missiles']).toBe(-2)
  })

  it('preserves scenario_id and turn_commit_id', () => {
    const parent = makeBranchState()
    const forked = forkBranch(parent, 'branch-fork')
    expect(forked.scenario_id).toBe('sc-1')
    expect(forked.turn_commit_id).toBe('commit-5')
  })

  it('throws when newBranchId is empty', () => {
    const parent = makeBranchState()
    expect(() => forkBranch(parent, '')).toThrow()
  })

  it('throws when parentState is falsy', () => {
    expect(() => forkBranch(null as unknown as BranchStateAtTurn, 'b')).toThrow()
  })
})

// ─── isSequentialCommit ──────────────────────────────────────────────────────

describe('isSequentialCommit', () => {
  it('returns true for turn 1 after turn 0 (first commit)', () => {
    expect(isSequentialCommit(1, 0)).toBe(true)
  })

  it('returns true for sequential advance', () => {
    expect(isSequentialCommit(6, 5)).toBe(true)
  })

  it('returns false when skipping a turn', () => {
    expect(isSequentialCommit(7, 5)).toBe(false)
  })

  it('returns false for same turn number', () => {
    expect(isSequentialCommit(5, 5)).toBe(false)
  })

  it('returns false for reverse commit', () => {
    expect(isSequentialCommit(3, 5)).toBe(false)
  })
})

// ─── isForkPointValid ────────────────────────────────────────────────────────

describe('isForkPointValid', () => {
  it('returns true when forking from the head commit', () => {
    expect(isForkPointValid(5, 5)).toBe(true)
  })

  it('returns true when forking from an earlier commit', () => {
    expect(isForkPointValid(3, 5)).toBe(true)
  })

  it('returns false when fork point is beyond parent head', () => {
    expect(isForkPointValid(6, 5)).toBe(false)
  })

  it('returns false when fork turn is 0', () => {
    expect(isForkPointValid(0, 5)).toBe(false)
  })

  it('returns true for turn 1 on a branch with head at 1', () => {
    expect(isForkPointValid(1, 1)).toBe(true)
  })
})
