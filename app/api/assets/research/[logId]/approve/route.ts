import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ProposedAssetChange } from '@/lib/types/database'

export async function POST(
  _req: Request,
  { params }: { params: { logId: string } }
) {
  const supabase = await createClient()

  // Get the log entry
  const { data: logEntry, error: fetchError } = await supabase
    .from('asset_research_log')
    .select('*')
    .eq('id', params.logId)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!logEntry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (logEntry.status !== 'awaiting_approval') {
    return NextResponse.json({ error: 'Log entry is not awaiting approval' }, { status: 400 })
  }

  const changes = (logEntry.proposed_changes ?? []) as ProposedAssetChange[]

  // Apply each proposed change
  for (const change of changes) {
    if (change.type === 'add' && change.changes) {
      await supabase
        .from('asset_registry')
        .upsert({ ...change.changes, id: change.assetId }, { onConflict: 'id,scenario_id' })
    } else if (change.type === 'update' && change.changes) {
      await supabase
        .from('asset_registry')
        .update(change.changes)
        .eq('id', change.assetId)
        .eq('scenario_id', logEntry.scenario_id)
    } else if (change.type === 'remove') {
      await supabase
        .from('asset_registry')
        .update({ status: 'destroyed' })
        .eq('id', change.assetId)
        .eq('scenario_id', logEntry.scenario_id)
    }
  }

  // Mark log entry as approved
  const { data, error } = await supabase
    .from('asset_research_log')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', params.logId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
