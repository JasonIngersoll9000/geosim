import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { scenarioId } = await req.json()

  if (!scenarioId) {
    return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })
  }

  // Create a new research log entry with status 'pending'
  const { data, error } = await supabase
    .from('asset_research_log')
    .insert({
      scenario_id: scenarioId,
      status: 'pending',
      summary: '',
      proposed_changes: [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
