import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveScenarioId } from '@/lib/supabase/resolve-scenario'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scenarioId = searchParams.get('scenarioId')

  if (!scenarioId) {
    return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const resolvedId = await resolveScenarioId(supabase, scenarioId)

    const [branchRes, actorRes] = await Promise.all([
      supabase
        .from('branches')
        .select('id, name, is_trunk, status, head_commit_id, created_at, parent_branch_id, fork_point_commit_id')
        .eq('scenario_id', resolvedId)
        .order('created_at', { ascending: true }),
      supabase
        .from('scenario_actors')
        .select('id, name, short_name')
        .eq('scenario_id', resolvedId),
    ])

    if (branchRes.error) {
      return NextResponse.json({ error: branchRes.error.message }, { status: 500 })
    }

    const branchIds = (branchRes.data ?? []).map(b => b.id)
    const commitsByBranch: Record<string, Array<{ id: string; turn_number: number; simulated_date: string; chronicle_headline: string | null }>> = {}

    if (branchIds.length > 0) {
      const { data: commits } = await supabase
        .from('turn_commits')
        .select('id, branch_id, turn_number, simulated_date, chronicle_headline')
        .in('branch_id', branchIds)

      for (const c of commits ?? []) {
        const casted = c as { id: string; branch_id: string; turn_number: number; simulated_date: string; chronicle_headline: string | null }
        if (!commitsByBranch[casted.branch_id]) commitsByBranch[casted.branch_id] = []
        commitsByBranch[casted.branch_id].push({ id: casted.id, turn_number: casted.turn_number, simulated_date: casted.simulated_date, chronicle_headline: casted.chronicle_headline ?? null })
      }
    }

    const branches = (branchRes.data ?? []).map(b => ({
      ...b,
      turn_commits: commitsByBranch[b.id] ?? [],
    }))

    return NextResponse.json({
      branches,
      actors: actorRes.data ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = (await request.json()) as { scenarioId?: string; name?: string; parentBranchId?: string; forkTurn?: number }
    const { scenarioId: rawScenarioId, name, parentBranchId, forkTurn } = body

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

    // If a fork turn is specified, look up the turn_commit at that turn on the parent branch
    // and set it as the head_commit_id so the new branch starts from that exact state
    let headCommitId: string | null = null
    if (forkTurn != null && resolvedParentId) {
      const { data: forkCommit } = await supabase
        .from('turn_commits')
        .select('id')
        .eq('branch_id', resolvedParentId)
        .eq('turn_number', forkTurn)
        .single()
      headCommitId = (forkCommit as { id: string } | null)?.id ?? null
    }

    const branchName = name ?? `Player Branch ${new Date().toISOString().slice(0, 10)}`

    const insertData: Record<string, unknown> = {
      scenario_id:      scenarioId,
      name:             branchName,
      is_trunk:         false,
      status:           'active',
      parent_branch_id: resolvedParentId,
    }
    if (headCommitId) {
      insertData.head_commit_id       = headCommitId
      insertData.fork_point_commit_id = headCommitId
    }

    const { data, error } = await supabase
      .from('branches')
      .insert(insertData)
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
