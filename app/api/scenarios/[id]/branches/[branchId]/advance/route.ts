import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onPlayerDecision } from '@/lib/game/game-loop'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { detectConstraintCascades } from '@/lib/game/decision-prerequisites'
import { IRAN_DECISIONS } from '@/lib/game/iran-decisions'
import type { EventStateEffects, PositionedAsset, BranchStateAtTurn, AssetCategory } from '@/lib/types/simulation'

const encoder = new TextEncoder()

/** Infer a valid AssetCategory from an inventory key name. */
function inferAssetCategory(assetType: string): AssetCategory {
  const t = assetType.toLowerCase()
  if (t.includes('missile') || t.includes('tomahawk') || t.includes('jassm') || t.includes('ballistic')) return 'missile'
  if (t.includes('carrier') || t.includes('destroyer') || t.includes('submarine') || t.includes('naval')) return 'naval'
  if (t.includes('aircraft') || t.includes('bomber') || t.includes('f-') || t.includes('b-2') || t.includes('air_wing')) return 'air'
  if (t.includes('thaad') || t.includes('patriot') || t.includes('interceptor') || t.includes('air_defense')) return 'air_defense'
  if (t.includes('nuclear') || t.includes('warhead')) return 'nuclear'
  if (t.includes('cyber') || t.includes('intel') || t.includes('signal')) return 'cyber'
  if (t.includes('infrastructure') || t.includes('port') || t.includes('refinery')) return 'infrastructure'
  return 'ground'
}

/**
 * Build a minimal PositionedAsset[] from a BranchStateAtTurn so that
 * detectConstraintCascades can evaluate asset-gated decision prerequisites.
 *
 * Each asset_inventory entry becomes a stub asset with:
 *   - status 'operational' if count > 0, 'destroyed' if exhausted
 *   - assetType = inventory key, category = 'military' (default)
 *   - empty capabilities / dummy position
 */
function buildAssetsFromState(state: BranchStateAtTurn | null): PositionedAsset[] {
  if (!state) return []
  const assets: PositionedAsset[] = []
  for (const [actorId, actorState] of Object.entries(state.actor_states)) {
    for (const [assetType, count] of Object.entries(actorState.asset_inventory ?? {})) {
      const asset: PositionedAsset = {
        id:            `${actorId}:${assetType}`,
        scenarioId:    state.scenario_id,
        actorId,
        name:          assetType,
        shortName:     assetType.slice(0, 8),
        category:      inferAssetCategory(assetType),
        assetType,
        description:   '',
        position:      { lat: 0, lng: 0 },
        zone:          'default',
        status:        count > 0 ? 'available' : 'destroyed',
        capabilities:  [],
        provenance:    'inferred',
        effectiveFrom: state.as_of_date,
        discoveredAt:  state.as_of_date,
        notes:         '',
      }
      assets.push(asset)
    }
  }
  return assets
}

function sendLine(controller: ReadableStreamDefaultController, text: string, type = 'info') {
  const line = JSON.stringify({ text, type, timestamp: new Date().toISOString().slice(11, 19) })
  controller.enqueue(encoder.encode(`data: ${line}\n\n`))
}

function advanceDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + 7)
  return date.toISOString().split('T')[0]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503 })
  }

  const { id: scenarioId, branchId } = params

  let body: { primaryAction: string; concurrentActions: string[]; controlledActors?: string[] }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient()

        sendLine(controller, 'Turn plan received — validating prerequisites…', 'info')

        // 1. Get current branch state
        const { data: branch, error: branchErr } = await supabase
          .from('branches')
          .select('id, head_commit_id')
          .eq('id', branchId)
          .single()

        if (branchErr || !branch) {
          sendLine(controller, `ERROR: Branch not found — ${branchErr?.message ?? 'unknown'}`, 'critical')
          controller.close()
          return
        }

        // 2. Get latest turn commit to determine turn_number and simulated_date
        const { data: headCommit } = await supabase
          .from('turn_commits')
          .select('id, turn_number, simulated_date')
          .eq('id', branch.head_commit_id)
          .single()

        const prevTurnNumber = headCommit?.turn_number ?? 0
        const prevDate = headCommit?.simulated_date ?? '2026-03-04'
        const newTurnNumber = prevTurnNumber + 1
        const newSimDate = advanceDate(prevDate)

        sendLine(controller, 'Operational parameters confirmed.', 'confirmed')

        // 3. Insert new turn_commit
        const { data: newCommit, error: insertErr } = await supabase
          .from('turn_commits')
          .insert({
            branch_id:         branchId,
            parent_commit_id:  branch.head_commit_id,
            turn_number:       newTurnNumber,
            simulated_date:    newSimDate,
            scenario_snapshot: { primary_action: body.primaryAction, concurrent_actions: body.concurrentActions },
            planning_phase:    { primary_action_id: body.primaryAction, concurrent_action_ids: body.concurrentActions },
            current_phase:     'complete',
            is_ground_truth:   false,
          })
          .select('id')
          .single()

        if (insertErr || !newCommit) {
          sendLine(controller, `ERROR: Failed to record turn — ${insertErr?.message ?? 'unknown'}`, 'critical')
          controller.close()
          return
        }

        sendLine(controller, 'Applying effects to theater state…', 'info')

        // 4. Snapshot state BEFORE resolution (for constraint cascade comparison)
        let stateBefore: BranchStateAtTurn | null = null
        try {
          stateBefore = await getStateAtTurn(branchId, branch.head_commit_id ?? '')
        } catch {
          // Non-fatal — cascade detection will produce no results
        }

        // 5. Call state engine
        const resolvedEffects: EventStateEffects = {
          actor_score_deltas:     {},
          asset_inventory_deltas: {},
          global_state_deltas:    {},
          facility_updates:       [],
          new_depletion_rates:    [],
        }

        try {
          await onPlayerDecision(scenarioId, branchId, branch.head_commit_id ?? '', newCommit.id, resolvedEffects)
        } catch (e) {
          // State engine failure is non-fatal for simplified resolution
          sendLine(controller, `State engine: ${e instanceof Error ? e.message : 'skipped'}`, 'info')
        }

        // 6. Snapshot state AFTER resolution and compute constraint cascades
        let stateAfter: BranchStateAtTurn | null = null
        try {
          stateAfter = await getStateAtTurn(branchId, newCommit.id)
        } catch {
          // Non-fatal — cascade detection will produce no results
        }

        const assetsBefore = buildAssetsFromState(stateBefore)
        const assetsAfter  = buildAssetsFromState(stateAfter)

        const cascades = detectConstraintCascades(IRAN_DECISIONS, assetsBefore, assetsAfter)

        if (cascades.length > 0) {
          sendLine(controller, `${cascades.length} decision(s) newly unlocked by this action`, 'confirmed')
        }

        // 7. Update branch head_commit_id and persist controlled actors
        const branchUpdate: Record<string, unknown> = { head_commit_id: newCommit.id }
        if (body.controlledActors && body.controlledActors.length > 0) {
          branchUpdate.user_controlled_actors = body.controlledActors
        }
        await supabase
          .from('branches')
          .update(branchUpdate)
          .eq('id', branchId)

        sendLine(controller, 'Threshold evaluation complete.', 'info')
        sendLine(controller, `Turn ${prevTurnNumber} → Turn ${newTurnNumber} (${newSimDate})`, 'confirmed')
        sendLine(controller, 'Awaiting next planning phase.', 'info')

        // Structured resolution summary — consumed by the client to populate EventsTab
        const resolutionSummary = JSON.stringify({
          type: 'resolution_summary',
          turnNumber: newTurnNumber,
          simulatedDate: newSimDate,
          turnCommitId: newCommit.id,
          actorActions: [
            { actorId: body.controlledActors?.[0] ?? 'player', actionId: body.primaryAction, isPrimary: true },
            ...body.concurrentActions.map(id => ({ actorId: body.controlledActors?.[0] ?? 'player', actionId: id, isPrimary: false })),
          ],
          escalationChanges: [],
          judgeScore: null,
          constraintCascades: cascades,
        })
        controller.enqueue(encoder.encode(`data: ${resolutionSummary}\n\n`))

      } catch (err) {
        sendLine(controller, `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`, 'critical')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
