import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { branchId: string } }
) {
  const { branchId } = params

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(branchId)) {
    return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const [commitRes, branchRes] = await Promise.all([
      supabase
        .from('turn_commits')
        .select('turn_number, simulated_date, chronicle_headline, chronicle_entry, narrative_entry')
        .eq('branch_id', branchId)
        .order('turn_number', { ascending: true }),
      supabase
        .from('branches')
        .select('id, scenario_id, name')
        .eq('id', branchId)
        .single(),
    ])

    let scenarioName: string | null = null
    if (branchRes.data?.scenario_id) {
      const { data: sc } = await supabase
        .from('scenarios')
        .select('name')
        .eq('id', branchRes.data.scenario_id)
        .single()
      scenarioName = (sc as { name?: string } | null)?.name ?? null
    }

    return NextResponse.json({
      commits: commitRes.data ?? [],
      branch: branchRes.data
        ? { ...branchRes.data, scenarios: scenarioName ? { name: scenarioName } : null }
        : null,
      error: commitRes.error?.message ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
