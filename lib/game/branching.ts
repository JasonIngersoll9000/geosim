/**
 * Pure (DB-free) branch and commit operations.
 * These functions handle the data shape logic without any Supabase dependency,
 * making them fully testable without a live database.
 *
 * DB-backed equivalents live in lib/game/state-engine.ts.
 */
import type { BranchStateAtTurn } from '@/lib/types/simulation'

// ─── Descriptors ─────────────────────────────────────────────────────────────

export interface BranchDescriptor {
  id: string
  name: string
  parentBranchId: string | null
  forkFromCommitId: string | null
  isTrunk: boolean
  createdAt: string
}

export interface TurnCommitDescriptor {
  id: string
  branchId: string
  turnNumber: number
  simulatedDate: string
  narrativeEntry: string | null
}

// ─── Factory functions ────────────────────────────────────────────────────────

/**
 * Create a branch descriptor.
 * isTrunk branches have no parent; fork branches must supply both parent fields.
 */
export function createBranch(
  id: string,
  name: string,
  parentBranchId: string | null = null,
  forkFromCommitId: string | null = null,
  isTrunk = false,
  createdAt = new Date().toISOString()
): BranchDescriptor {
  if (!id || typeof id !== 'string') throw new Error('id is required')
  if (!name || typeof name !== 'string') throw new Error('name is required')
  if (!isTrunk && (parentBranchId === null || forkFromCommitId === null)) {
    throw new Error('Non-trunk branches must supply parentBranchId and forkFromCommitId')
  }
  return { id, name, parentBranchId, forkFromCommitId, isTrunk, createdAt }
}

/**
 * Create a turn commit descriptor.
 * turnNumber must be a positive integer.
 * simulatedDate must be a non-empty string (YYYY-MM-DD recommended).
 */
export function commitTurn(
  id: string,
  branchId: string,
  turnNumber: number,
  simulatedDate: string,
  narrativeEntry: string | null = null
): TurnCommitDescriptor {
  if (!id || typeof id !== 'string') throw new Error('id is required')
  if (!branchId || typeof branchId !== 'string') throw new Error('branchId is required')
  if (!Number.isInteger(turnNumber) || turnNumber < 1) {
    throw new Error('turnNumber must be a positive integer')
  }
  if (!simulatedDate) throw new Error('simulatedDate is required')
  return { id, branchId, turnNumber, simulatedDate, narrativeEntry }
}

// ─── Fork ────────────────────────────────────────────────────────────────────

/**
 * Fork a BranchStateAtTurn to a new branch.
 * Returns a deep copy of the parent state with branch_id updated.
 * Pure — does NOT write to DB; caller is responsible for persistence.
 */
export function forkBranch(
  parentState: BranchStateAtTurn,
  newBranchId: string
): BranchStateAtTurn {
  if (!newBranchId || typeof newBranchId !== 'string') {
    throw new Error('newBranchId is required')
  }
  if (!parentState || typeof parentState !== 'object') {
    throw new Error('parentState is required')
  }

  const forked: BranchStateAtTurn = JSON.parse(JSON.stringify(parentState))
  forked.branch_id = newBranchId
  return forked
}

// ─── Sequential turn helpers ─────────────────────────────────────────────────

/**
 * Validate that a new commit advances the turn number sequentially.
 * Returns true if newTurnNumber === latestTurnNumber + 1.
 * Trunk starts at 0 so the first commit should be turn 1.
 */
export function isSequentialCommit(
  newTurnNumber: number,
  latestTurnNumber: number
): boolean {
  return newTurnNumber === latestTurnNumber + 1
}

/**
 * Validate that a fork commit references a commit that is within the
 * commit history of the parent branch (turn number <= parent head turn).
 */
export function isForkPointValid(
  forkTurnNumber: number,
  parentHeadTurnNumber: number
): boolean {
  return forkTurnNumber >= 1 && forkTurnNumber <= parentHeadTurnNumber
}
