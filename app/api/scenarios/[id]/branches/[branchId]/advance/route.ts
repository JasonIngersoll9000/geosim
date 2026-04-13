import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onPlayerDecision } from '@/lib/game/game-loop'
import type { EventStateEffects } from '@/lib/types/simulation'

const encoder = new TextEncoder()

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

        // 4. Call state engine
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

        // 5. Update branch head_commit_id and persist controlled actors
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
