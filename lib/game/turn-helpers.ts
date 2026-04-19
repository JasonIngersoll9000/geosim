// lib/game/turn-helpers.ts
// Helper functions for the turn-advance pipeline.

import type { DecisionOption, Dimension as PanelDimension } from '@/lib/types/panels'
import type { Decision, TurnPlan, PlannedAction, Dimension as SimDimension } from '@/lib/types/simulation'
import { IRAN_DECISIONS } from '@/lib/game/iran-decisions'
import { createServiceClient } from '@/lib/supabase/service'

// panels.Dimension includes 'information' (not in simulation); simulation.Dimension
// includes 'cultural' (not in panels). Map the panel-only value to the closest
// simulation equivalent so the AI pipeline receives a valid Decision.dimension.
function mapDimension(panel: PanelDimension): SimDimension {
  return panel === 'information' ? 'intelligence' : panel
}

/**
 * Convert UI-facing DecisionOption[] to AI-pipeline Decision[].
 * Maps escalationDirection to the boolean flags the simulation engine expects.
 */
export function adaptDecisionOptions(options: DecisionOption[]): Decision[] {
  return options.map((opt) => {
    const base: Decision = {
      id: opt.id,
      description: opt.title,
      dimension: mapDimension(opt.dimension),
    }

    if (opt.escalationDirection === 'escalate') {
      base.isEscalation = true
      base.escalationLevel = 1
    } else if (opt.escalationDirection === 'de-escalate') {
      base.isDeescalation = true
      base.escalationLevel = 0
    }

    return base
  })
}

/**
 * Load the decision catalog keyed by actor ID.
 * Currently only the Iran 2026 scenario exists, so we hardcode US decisions.
 * The _scenarioId param is reserved for future multi-scenario support.
 */
export function loadDecisionCatalog(_scenarioId: string): Record<string, Decision[]> {
  const adapted = adaptDecisionOptions(IRAN_DECISIONS)
  return { united_states: adapted }
}

/**
 * Build a TurnPlan from action ID strings.
 *
 * Resource split:
 *   - primary alone = 100%
 *   - with N concurrent (clamped to 3): primary = 100 - N*20, each concurrent = 20%
 */
export function buildTurnPlanFromIds(
  primaryActionId: string,
  concurrentActionIds: string[],
  actorId: string,
  catalog: Record<string, Decision[]>,
): TurnPlan {
  const decisions = catalog[actorId]
  if (!decisions || decisions.length === 0) {
    throw new Error(`No decisions found for actor "${actorId}"`)
  }

  const findDecision = (id: string): Decision => {
    const d = decisions.find((dec) => dec.id === id)
    if (!d) throw new Error(`Decision "${id}" not found for actor "${actorId}"`)
    return d
  }

  // Validate primary exists
  findDecision(primaryActionId)

  // Clamp concurrent to max 3
  const clamped = concurrentActionIds.slice(0, 3)

  // Validate concurrent exist
  clamped.forEach((id) => findDecision(id))

  const n = clamped.length
  const primaryPercent = n === 0 ? 100 : 100 - n * 20

  const primaryAction: PlannedAction = {
    decisionId: primaryActionId,
    selectedProfile: null,
    resourcePercent: primaryPercent,
  }

  const concurrentActions: PlannedAction[] = clamped.map((id) => ({
    decisionId: id,
    selectedProfile: null,
    resourcePercent: 20,
  }))

  return { actorId, primaryAction, concurrentActions }
}

/**
 * Broadcast a turn event via Supabase Realtime on channel branch:{branchId}.
 */
export async function broadcastTurnEvent(
  branchId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient()
  await supabase.channel(`branch:${branchId}`).send({
    type: 'broadcast',
    event,
    payload,
  })
}

/**
 * Count how many turn_commits exist on a non-trunk branch.
 * Returns 0 for trunk branches or on any error.
 * Ported from app/api/game/turn/route.ts lines 420-442.
 */
export async function computeBranchDivergence(
  supabase: ReturnType<typeof createServiceClient>,
  branchId: string,
): Promise<number> {
  try {
    const { data: branch } = await supabase
      .from('branches')
      .select('is_trunk')
      .eq('id', branchId)
      .single()

    if (!branch || (branch as Record<string, unknown>).is_trunk) return 0

    const { data: commits } = await supabase
      .from('turn_commits')
      .select('id')
      .eq('branch_id', branchId)

    return commits?.length ?? 0
  } catch {
    return 0
  }
}
