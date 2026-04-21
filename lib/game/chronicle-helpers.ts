import type { SupabaseClient } from '@supabase/supabase-js'

export type ChronicleCommitRow = {
  turn_number: number
  simulated_date: string
  chronicle_headline: string | null
  chronicle_entry: string | null
  narrative_entry: string | null
  full_briefing: string | null
  chronicle_date_label: string | null
  context_summary: string | null
  is_decision_point: boolean | null
}

const CHRONICLE_COLS = [
  'turn_number', 'simulated_date', 'chronicle_headline', 'chronicle_entry',
  'narrative_entry', 'full_briefing', 'chronicle_date_label', 'context_summary',
  'is_decision_point',
].join(', ')

/**
 * Fetch chronicle entries for a branch scoped to turns <= maxTurn.
 *
 * For forked branches, pass parentBranchId + forkTurnNumber to get the merged
 * lineage: trunk commits up to the fork point, then branch commits after it.
 * Branch commits win on any turn_number collision.
 */
export async function getChronicleUpToTurn(
  supabase: SupabaseClient,
  branchId: string,
  maxTurn: number,
  opts?: { parentBranchId: string; forkTurnNumber: number },
): Promise<ChronicleCommitRow[]> {
  if (opts) {
    const [trunkRes, branchRes] = await Promise.all([
      supabase
        .from('turn_commits')
        .select(CHRONICLE_COLS)
        .eq('branch_id', opts.parentBranchId)
        .lte('turn_number', opts.forkTurnNumber)
        .order('turn_number', { ascending: true }),
      supabase
        .from('turn_commits')
        .select(CHRONICLE_COLS)
        .eq('branch_id', branchId)
        .gt('turn_number', opts.forkTurnNumber)
        .lte('turn_number', maxTurn)
        .order('turn_number', { ascending: true }),
    ])

    const mergedMap = new Map<number, ChronicleCommitRow>()
    for (const c of (trunkRes.data ?? []) as unknown as ChronicleCommitRow[]) {
      mergedMap.set(c.turn_number, c)
    }
    for (const c of (branchRes.data ?? []) as unknown as ChronicleCommitRow[]) {
      mergedMap.set(c.turn_number, c)
    }
    return Array.from(mergedMap.values()).sort((a, b) => a.turn_number - b.turn_number)
  }

  // Trunk or simple branch: single query
  const { data } = await supabase
    .from('turn_commits')
    .select(CHRONICLE_COLS)
    .eq('branch_id', branchId)
    .lte('turn_number', maxTurn)
    .order('turn_number', { ascending: true })
  return (data ?? []) as unknown as ChronicleCommitRow[]
}
