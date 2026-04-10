import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  const { branchId } = await params
  const currentTurn = parseInt(request.nextUrl.searchParams.get('currentTurn') ?? '0', 10)

  const supabase = await createClient()

  const { data: commit, error } = await supabase
    .from('turn_commits')
    .select('id, turn_number, simulated_date, narrative_entry, resolution_phase')
    .eq('branch_id', branchId)
    .eq('turn_number', currentTurn + 1)
    .single()

  if (error || !commit) {
    // No next commit — we're at the end of the ground truth
    return NextResponse.json({ data: null, hasNext: false })
  }

  // Check if there's a commit after this one (to know if "next" button should stay enabled)
  const { count } = await supabase
    .from('turn_commits')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('turn_number', commit.turn_number + 1)

  return NextResponse.json({
    data: {
      id:             commit.id,
      turnNumber:     commit.turn_number,
      simulatedDate:  commit.simulated_date,
      narrativeEntry: commit.narrative_entry,
    },
    hasNext: (count ?? 0) > 0,
  })
}
