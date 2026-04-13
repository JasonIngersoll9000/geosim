import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveScenarioId } from '@/lib/supabase/resolve-scenario'

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = (await request.json()) as { scenarioId?: string; name?: string; parentBranchId?: string }
    const { scenarioId: rawScenarioId, name, parentBranchId } = body

    if (!rawScenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const scenarioId = await resolveScenarioId(supabase, rawScenarioId)

    // Find the trunk branch to use as parent if not supplied
    let resolvedParentId = parentBranchId ?? null
    if (!resolvedParentId) {
      const { data: trunk } = await supabase
        .from('branches')
        .select('id')
        .eq('scenario_id', scenarioId)
        .eq('is_trunk', true)
        .single()
      resolvedParentId = trunk?.id ?? null
    }

    const branchName = name ?? `Player Branch ${new Date().toISOString().slice(0, 10)}`

    const { data, error } = await supabase
      .from('branches')
      .insert({
        scenario_id:      scenarioId,
        name:             branchName,
        is_trunk:         false,
        status:           'active',
        parent_branch_id: resolvedParentId,
      })
      .select('id')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
