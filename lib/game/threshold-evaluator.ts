import { createClient } from '@/lib/supabase/server'
import { daysBetween } from '@/lib/game/state-engine'
import type { BranchStateAtTurn, ThresholdResult } from '@/lib/types/simulation'

type ThresholdRow = {
  trigger_id: string
  actor_id: string | null
  variable_path: string
  threshold_value: number
  direction: 'above' | 'below'
  sustained_days: number
  forced_event_template: Record<string, unknown>
  status: 'armed' | 'triggered' | 'disarmed'
}

/**
 * Resolve a dot-notation variable path to a numeric value from state.
 * Supports: global.<field>, public_support, military_strength, etc. (actor-level),
 * and asset_inventory.<assetType> (actor-level).
 */
function resolveVariablePath(
  path: string,
  state: BranchStateAtTurn,
  actorId: string | null
): number {
  if (path.startsWith('global.')) {
    const key = path.slice(7)
    return (state.global_state as unknown as Record<string, number>)[key] ?? 0
  }
  if (!actorId) return 0
  const actor = state.actor_states[actorId]
  if (!actor) return 0
  if (path.startsWith('asset_inventory.')) {
    return actor.asset_inventory[path.slice('asset_inventory.'.length)] ?? 0
  }
  return (actor as Record<string, unknown>)[path] as number ?? 0
}

/**
 * Evaluate all armed thresholds for a branch against current state.
 * Writes triggered thresholds to DB (status = 'triggered').
 * Returns results for all armed triggers — check triggered field.
 */
export async function evaluateThresholds(
  branchId: string,
  state: BranchStateAtTurn
): Promise<ThresholdResult[]> {
  const supabase = await createClient()

  const { data: triggers, error } = await supabase
    .from('threshold_triggers')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'armed')

  if (error) throw new Error(`Failed to load triggers: ${error.message}`)
  if (!triggers || triggers.length === 0) return []

  // Get branch start date for sustained threshold calculation
  const { data: branch } = await supabase
    .from('branches')
    .select('created_at')
    .eq('id', branchId)
    .single()

  const branchStartDate: string = (
    (branch as { created_at: string } | null)?.created_at ?? new Date().toISOString()
  ).split('T')[0]

  const results: ThresholdResult[] = []

  for (const trigger of triggers as ThresholdRow[]) {
    const currentValue = resolveVariablePath(trigger.variable_path, state, trigger.actor_id)
    const crossed = trigger.direction === 'below'
      ? currentValue < trigger.threshold_value
      : currentValue > trigger.threshold_value

    if (!crossed) {
      results.push({ triggered: false, trigger_id: trigger.trigger_id, forced_event: null })
      continue
    }

    let shouldFire = trigger.sustained_days === 0

    if (!shouldFire && trigger.sustained_days > 0) {
      const daysElapsed = daysBetween(branchStartDate, state.as_of_date)
      shouldFire = daysElapsed >= trigger.sustained_days
    }

    if (shouldFire) {
      await supabase
        .from('threshold_triggers')
        .update({ status: 'triggered', triggered_at_event_id: state.turn_commit_id })
        .eq('branch_id', branchId)
        .eq('trigger_id', trigger.trigger_id)

      results.push({
        triggered: true,
        trigger_id: trigger.trigger_id,
        forced_event: trigger.forced_event_template,
      })
    } else {
      results.push({ triggered: false, trigger_id: trigger.trigger_id, forced_event: null })
    }
  }

  return results
}
