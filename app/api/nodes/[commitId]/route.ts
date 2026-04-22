import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChronicleUpToTurn } from '@/lib/game/chronicle-helpers'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: { commitId: string } },
) {
  if (!UUID_RE.test(params.commitId)) {
    return NextResponse.json({ error: 'Invalid commit ID' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // 1. Load the commit (node)
    const { data: commitData, error: commitErr } = await supabase
      .from('turn_commits')
      .select('id, branch_id, turn_number, simulated_date, parent_commit_id')
      .eq('id', params.commitId)
      .single()

    if (commitErr || !commitData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    const commit = commitData as {
      id: string; branch_id: string; turn_number: number
      simulated_date: string; parent_commit_id: string | null
    }

    // 2. Load branch metadata for lineage
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, is_trunk, parent_branch_id, fork_point_commit_id, decision_key')
      .eq('id', commit.branch_id)
      .single()
    const branch = branchData as {
      id: string; is_trunk: boolean
      parent_branch_id: string | null; fork_point_commit_id: string | null
      decision_key: string | null
    } | null

    // 3. Resolve fork turn for forked branches
    let forkTurnNumber: number | null = null
    if (branch && !branch.is_trunk && branch.fork_point_commit_id) {
      const { data: forkCommit } = await supabase
        .from('turn_commits')
        .select('turn_number')
        .eq('id', branch.fork_point_commit_id)
        .single()
      forkTurnNumber = (forkCommit as { turn_number: number } | null)?.turn_number ?? null
    }

    // 4. Chronicle scoped to this node's turn
    const chronicle = await getChronicleUpToTurn(
      supabase,
      commit.branch_id,
      commit.turn_number,
      branch?.parent_branch_id && forkTurnNumber != null
        ? { parentBranchId: branch.parent_branch_id, forkTurnNumber }
        : undefined,
    ).catch(() => [])

    // 5. Prev / next commits on this branch
    const [prevRes, nextRes] = await Promise.all([
      supabase.from('turn_commits').select('id').eq('branch_id', commit.branch_id).eq('turn_number', commit.turn_number - 1).maybeSingle(),
      supabase.from('turn_commits').select('id').eq('branch_id', commit.branch_id).eq('turn_number', commit.turn_number + 1).maybeSingle(),
    ])

    // 6. Child branches forked from this node
    const { data: childBranchRows } = await supabase
      .from('branches')
      .select('id, name, decision_key, head_commit_id')
      .eq('fork_point_commit_id', params.commitId)

    const childHeadIds = (childBranchRows ?? [])
      .map((b: Record<string, unknown>) => b.head_commit_id as string)
      .filter(Boolean)

    const headTurnMap = new Map<string, number>()
    if (childHeadIds.length > 0) {
      const { data: headCommits } = await supabase
        .from('turn_commits').select('id, turn_number').in('id', childHeadIds)
      for (const hc of headCommits ?? []) {
        const row = hc as { id: string; turn_number: number }
        headTurnMap.set(row.id, row.turn_number)
      }
    }

    const child_branches = (childBranchRows ?? []).map((b: Record<string, unknown>) => ({
      branchId:    b.id as string,
      name:        b.name as string,
      decisionKey: (b.decision_key as string) ?? '',
      actorId:     ((b.decision_key as string) ?? '').split('::')[0] ?? '',
      headTurn:    headTurnMap.get(b.head_commit_id as string) ?? 0,
    }))

    return NextResponse.json({
      node_meta: {
        commitId:      commit.id,
        turnNumber:    commit.turn_number,
        simulatedDate: commit.simulated_date,
        branchId:      commit.branch_id,
        isTrunk:       branch?.is_trunk ?? false,
        parentBranchId: branch?.parent_branch_id ?? null,
        decisionKey:   branch?.decision_key ?? null,
      },
      chronicle,
      child_branches,
      prev_commit_id: (prevRes.data as { id: string } | null)?.id ?? null,
      next_commit_id: (nextRes.data as { id: string } | null)?.id ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
