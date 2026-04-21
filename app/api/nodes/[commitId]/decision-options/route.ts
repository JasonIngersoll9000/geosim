import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDecisionOptions } from '@/lib/ai/decision-generator'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: Request,
  { params }: { params: { commitId: string } },
) {
  if (!UUID_RE.test(params.commitId)) {
    return NextResponse.json({ error: 'Invalid commit ID' }, { status: 400 })
  }

  const actorId = new URL(request.url).searchParams.get('actor')
  if (!actorId) {
    return NextResponse.json({ error: 'actor query param is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // 1. Load commit (need branch_id and decision_options_cache)
    const { data: commitData, error: commitErr } = await supabase
      .from('turn_commits')
      .select('id, branch_id, turn_number, simulated_date, decision_options_cache')
      .eq('id', params.commitId)
      .single()

    if (commitErr || !commitData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    const commit = commitData as {
      id: string; branch_id: string; turn_number: number
      simulated_date: string; decision_options_cache: Record<string, unknown> | null
    }

    // 2. Cache hit check
    const existingCache = commit.decision_options_cache ?? {}
    if (existingCache[actorId]) {
      return NextResponse.json({
        commitId:   params.commitId,
        actorId,
        options:    existingCache[actorId],
        cached:     true,
        as_of_date: commit.simulated_date,
      })
    }

    // 3. Cache miss — load actor profile then generate
    const { data: actorRows } = await supabase
      .from('scenario_actors')
      .select('id, name, short_name, biographical_summary, win_condition, strategic_doctrine, leadership_profile, historical_precedents, initial_scores')
      .eq('id', actorId)
      .single()

    if (!actorRows) {
      return NextResponse.json({ error: `Actor '${actorId}' not found` }, { status: 404 })
    }

    const actorProfile = actorRows as {
      id: string; name: string; short_name: string; biographical_summary: string
      win_condition: string; strategic_doctrine: string; leadership_profile: string
      historical_precedents: string; initial_scores: Record<string, number>
    }

    const options = await generateDecisionOptions(
      params.commitId,
      commit.branch_id,
      actorId,
      { actorProfile },
    )

    // 4. Write-through cache
    await supabase
      .from('turn_commits')
      .update({ decision_options_cache: { ...existingCache, [actorId]: options } })
      .eq('id', params.commitId)

    return NextResponse.json({
      commitId:   params.commitId,
      actorId,
      options,
      cached:     false,
      as_of_date: commit.simulated_date,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[decision-options]', message)
    return NextResponse.json({ error: 'Options unavailable — try again' }, { status: 503 })
  }
}
