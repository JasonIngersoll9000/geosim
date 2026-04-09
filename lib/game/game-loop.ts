import {
  getStateAtTurn,
  applyDepletion,
  applyEventEffects,
  persistStateSnapshot,
  forkStateForBranch,
} from '@/lib/game/state-engine'
import { evaluateThresholds } from '@/lib/game/threshold-evaluator'
import type { BranchStateAtTurn, EventStateEffects, ThresholdResult } from '@/lib/types/simulation'

/**
 * Called after advancing ground truth (new turn commit from research update).
 * Applies event effects, persists the new snapshot, evaluates thresholds.
 * Returns any forced events that must be queued.
 */
export async function onGroundTruthAdvanced(
  scenarioId: string,
  branchId: string,
  previousTurnCommitId: string,
  newTurnCommitId: string,
  resolvedEffects: EventStateEffects
): Promise<ThresholdResult[]> {
  const currentState = await getStateAtTurn(branchId, previousTurnCommitId)
  const newState = applyEventEffects(currentState, resolvedEffects)
  await persistStateSnapshot(scenarioId, branchId, newTurnCommitId, newState)
  return evaluateThresholds(branchId, newState)
}

/**
 * Called after a player submits a decision on an alternate branch.
 * Gets current state (with live depletion applied), resolves the decision,
 * applies effects, persists, evaluates thresholds.
 * Returns the new state and any forced events.
 */
export async function onPlayerDecision(
  scenarioId: string,
  branchId: string,
  lastTurnCommitId: string,
  newTurnCommitId: string,
  resolvedEffects: EventStateEffects
): Promise<{ newState: BranchStateAtTurn; thresholdResults: ThresholdResult[] }> {
  const now = new Date().toISOString().split('T')[0]

  // Load state and apply real-time depletion since last turn
  let currentState = await getStateAtTurn(branchId, lastTurnCommitId)
  currentState = applyDepletion(currentState, currentState.as_of_date, now)

  const newState = applyEventEffects(currentState, resolvedEffects)
  await persistStateSnapshot(scenarioId, branchId, newTurnCommitId, newState)

  const thresholdResults = await evaluateThresholds(branchId, newState)
  return { newState, thresholdResults }
}

/**
 * Called when a player forks from a commit to create a new branch.
 * Copies state and depletion rates to the new branch.
 * Returns the forked state.
 */
export async function onBranchCreated(
  parentBranchId: string,
  forkTurnCommitId: string,
  newBranchId: string
): Promise<BranchStateAtTurn> {
  return forkStateForBranch(parentBranchId, forkTurnCommitId, newBranchId)
}
