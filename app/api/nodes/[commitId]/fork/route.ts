import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { forkStateForBranch } from '@/lib/game/state-engine'

let waitUntil: ((p: Promise<unknown>) => void) | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vf = require('@vercel/functions')
  waitUntil = vf.waitUntil
} catch { /* local dev — waitUntil not available */ }

export async function POST(
  request: Request,
  { params }: { params: { commitId: string } },
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: { actorId?: string; primaryAction?: string; concurrentActions?: string[]; branchName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { actorId, primaryAction, concurrentActions = [], branchName } = body
  if (!actorId || !primaryAction) {
    return NextResponse.json({ error: 'actorId and primaryAction are required' }, { status: 400 })
  }

  const decisionKey = `${actorId}::${primaryAction}`

  try {
    const supabase      = await createClient()
    const serviceClient = createServiceClient()

    // 1. Validate the commit exists and get branch context
    const { data: commitData, error: commitErr } = await serviceClient
      .from('turn_commits')
      .select('id, branch_id, turn_number, simulated_date')
      .eq('id', params.commitId)
      .single()

    if (commitErr || !commitData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    const commit = commitData as { id: string; branch_id: string; turn_number: number; simulated_date: string }

    // 2. Deduplication: check for existing branch with same fork point + decision key
    const { data: existingBranch } = await serviceClient
      .from('branches')
      .select('id, head_commit_id')
      .eq('fork_point_commit_id', params.commitId)
      .eq('decision_key', decisionKey)
      .maybeSingle()

    if (existingBranch) {
      const eb = existingBranch as { id: string; head_commit_id: string | null }
      return NextResponse.json({
        branchId:     eb.id,
        joined:       true,
        processing:   false,
        turnCommitId: eb.head_commit_id,
      })
    }

    // 3. Auth check — require login for new branch creation
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && !process.env.NEXT_PUBLIC_DEV_MODE) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 4. Fetch parent branch to inherit required fields
    const { data: parentBranchData } = await serviceClient
      .from('branches')
      .select('scenario_id, visibility, game_mode, turn_timeframe, user_controlled_actors')
      .eq('id', commit.branch_id)
      .single()
    const parentBranch = parentBranchData as {
      scenario_id: string
      visibility: string
      game_mode: string
      turn_timeframe: string
      user_controlled_actors: string[]
    } | null

    // 5. Create the new branch
    const autoName = branchName ?? `${actorId.toUpperCase()} → ${primaryAction.replace(/_/g, ' ')}`
    const { data: newBranch, error: insertErr } = await serviceClient
      .from('branches')
      .insert({
        name:                 autoName,
        is_trunk:             false,
        status:               'active',
        scenario_id:          parentBranch?.scenario_id ?? '',
        parent_branch_id:     commit.branch_id,
        fork_point_commit_id: params.commitId,
        head_commit_id:       params.commitId,
        decision_key:         decisionKey,
        created_by:           user?.id ?? 'system',
        visibility:           parentBranch?.visibility ?? 'private',
        game_mode:            parentBranch?.game_mode ?? 'solo',
        turn_timeframe:       parentBranch?.turn_timeframe ?? '2 weeks',
        user_controlled_actors: parentBranch?.user_controlled_actors ?? [],
      } as never)
      .select('id, scenario_id')
      .single()

    if (insertErr || !newBranch) {
      return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
    }

    const newBranchRow = newBranch as { id: string; scenario_id: string | null }
    const scenarioId = newBranchRow.scenario_id ?? parentBranch?.scenario_id ?? null

    // 6. Fork state snapshots (required for advance to work)
    try {
      await forkStateForBranch(commit.branch_id, params.commitId, newBranchRow.id, { client: serviceClient })
    } catch (forkErr) {
      await serviceClient.from('branches').delete().eq('id', newBranchRow.id)
      const msg = forkErr instanceof Error ? forkErr.message : 'Fork state failed'
      return NextResponse.json({ error: `Failed to copy branch state: ${msg}` }, { status: 500 })
    }

    // 7. Fire advance pipeline in background
    if (scenarioId) {
      const { POST: advancePost } = await import(
        '@/app/api/scenarios/[id]/branches/[branchId]/advance/route'
      )
      const advanceReq = new Request(
        `http://localhost/api/scenarios/${scenarioId}/branches/${newBranchRow.id}/advance`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ primaryAction, concurrentActions, controlledActors: [actorId] }),
        },
      )
      const advancePipeline = advancePost(advanceReq as never, {
        params: { id: scenarioId, branchId: newBranchRow.id },
      })
      if (waitUntil) waitUntil(advancePipeline)
      else void advancePipeline
    }

    return NextResponse.json({
      branchId:   newBranchRow.id,
      joined:     false,
      processing: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
