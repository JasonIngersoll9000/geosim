// RSC boundary: async server component — no 'use client'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameView } from '@/components/game/GameView'
import { createClient } from '@/lib/supabase/server'
import { resolveScenarioId } from '@/lib/supabase/resolve-scenario'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { IRAN_DECISIONS, IRAN_DECISION_DETAILS } from '@/lib/game/iran-decisions'
import type { GameInitialData, ChronicleEntry, GroundTruthCommit } from '@/lib/types/game-init'
import type { ActorSummary, ActorDetail } from '@/lib/types/panels'
import { getActorColor, getRelationshipStance, isAdversaryActor, hasLimitedIntel, getEscalationRungName, getEscalationRungs } from '@/lib/game/actor-meta'

interface Props {
  params: { id: string; branchId: string }
}

export default async function PlayPage({ params }: Props) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#050A12]">
        <div className="text-center space-y-2">
          <p className="font-mono text-sm text-[#888]">DATABASE NOT CONFIGURED</p>
          <p className="font-mono text-xs text-[#555]">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to play</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // 0. Resolve scenario slug → UUID
  const scenarioId = await resolveScenarioId(supabase, params.id)

  // 1. Fetch scenario metadata (classification column does not exist in live schema)
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('id, name')
    .eq('id', scenarioId)
    .single()

  // 2. Fetch branch record — support "trunk" slug by looking up is_trunk branch
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let branchData: { id: string; name: string; is_trunk: boolean; head_commit_id: string | null } | null = null
  if (UUID_RE.test(params.branchId)) {
    const { data } = await supabase
      .from('branches')
      .select('id, name, is_trunk, head_commit_id')
      .eq('id', params.branchId)
      .single()
    branchData = data
  } else {
    // slug like "trunk" → look up trunk branch for this scenario
    const { data } = await supabase
      .from('branches')
      .select('id, name, is_trunk, head_commit_id')
      .eq('scenario_id', scenarioId)
      .eq('is_trunk', true)
      .single()
    branchData = data
  }
  const branch = branchData

  // 3. Fetch actors for this scenario
  const { data: actorRows } = await supabase
    .from('scenario_actors')
    .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
    .eq('scenario_id', scenarioId)

  // 4. Fetch current state via state engine
  let currentState = null
  if (branch?.head_commit_id) {
    try {
      currentState = await getStateAtTurn(params.branchId, branch.head_commit_id)
    } catch {
      // State engine failure is non-fatal
    }
  }

  // 5. Fetch chronicle (turn_commits on this branch)
  const { data: commits } = await supabase
    .from('turn_commits')
    .select('turn_number, simulated_date, narrative_entry, chronicle_headline, chronicle_entry, chronicle_date_label, context_summary, is_decision_point')
    .eq('branch_id', branch?.id ?? params.branchId)
    .order('turn_number', { ascending: true })

  // 6. Fetch ground truth branch
  const { data: trunkBranch } = await supabase
    .from('branches')
    .select('id')
    .eq('scenario_id', params.id)
    .eq('is_trunk', true)
    .single()

  const { data: groundTruthCommits } = await supabase
    .from('turn_commits')
    .select('id, turn_number, simulated_date, narrative_entry')
    .eq('branch_id', trunkBranch?.id ?? params.branchId)
    .order('turn_number', { ascending: true })

  // --- Transform DB rows → GameInitialData types ---

  const actors: ActorSummary[] = (actorRows ?? []).map(a => {
    const scores = a.initial_scores as { escalationRung?: number; escalation_rung?: number } | null
    const rung = scores?.escalationRung ?? scores?.escalation_rung ?? 0
    const rawObjectives = a.win_condition
      ? a.win_condition.split(/\n|•|–|-/).map((s: string) => s.trim()).filter((s: string) => s.length > 10)
      : []
    return {
      id: a.id,
      name: a.name,
      shortName: a.short_name ?? a.name.slice(0, 6).toUpperCase(),
      actorColor: getActorColor(a.id),
      escalationRung: rung,
      escalationRungName: getEscalationRungName(a.id, rung),
      primaryObjective: rawObjectives[0] ?? '',
      relationshipStance: getRelationshipStance(a.id),
    }
  })

  const actorDetails: Record<string, ActorDetail> = {}
  for (const a of actorRows ?? []) {
    const s = currentState?.actor_states[a.id]
    const scores = a.initial_scores as { escalationRung?: number; escalation_rung?: number } | null
    const rung = scores?.escalationRung ?? scores?.escalation_rung ?? 0
    const rawObjectives = a.win_condition
      ? a.win_condition.split(/\n|•|–|-/).map((w: string) => w.trim()).filter((w: string) => w.length > 10)
      : []
    const shortName = a.short_name ?? a.name.slice(0, 6).toUpperCase()
    // Build recent history from chronicle entries mentioning this actor
    const actorNameLower = a.name.toLowerCase()
    const recentHistory = (commits ?? [])
      .filter(c => {
        const narrative = (c.chronicle_entry ?? c.narrative_entry ?? '').toLowerCase()
        const headline  = (c.chronicle_headline ?? '').toLowerCase()
        return narrative.includes(actorNameLower) || headline.includes(actorNameLower)
      })
      .slice(-5)
      .reverse()
      .map(c => {
        const headline  = c.chronicle_headline ? `[T${c.turn_number}] ${c.chronicle_headline}` : null
        const narrative = c.chronicle_entry ?? c.narrative_entry ?? ''
        return headline ?? narrative.slice(0, 240)
      })

    actorDetails[a.id] = {
      id: a.id,
      name: a.name,
      shortName,
      actorColor: getActorColor(a.id),
      escalationRung: rung,
      escalationRungName: getEscalationRungName(a.id, rung),
      escalationRungs: getEscalationRungs(a.id, rung),
      briefing: a.biographical_summary ?? 'No briefing available.',
      militaryStrength:   s ? Math.round(Number(s.military_strength))   : 50,
      economicStrength:   s ? Math.round(Number(s.economic_health))     : 50,
      politicalStability: s ? Math.round(Number(s.political_stability)) : 50,
      objectives: rawObjectives,
      primaryObjective: rawObjectives[0] ?? '',
      winCondition: a.win_condition ?? undefined,
      leadershipProfile:    a.leadership_profile ?? undefined,
      strategicDoctrine:    a.strategic_doctrine ?? undefined,
      historicalPrecedents: a.historical_precedents ?? undefined,
      intelligenceProfile:  a.intelligence_profile as Record<string, unknown> | undefined,
      isAdversary:      isAdversaryActor(a.id),
      hasLimitedIntel:  hasLimitedIntel(a.id),
      viewerActorId:    'us',
      relationshipStance: getRelationshipStance(a.id),
      recentHistory: recentHistory.length > 0 ? recentHistory : undefined,
    }
  }

  const chronicle: ChronicleEntry[] = (commits ?? []).map(c => ({
    turnNumber: c.turn_number,
    date: c.simulated_date,
    title: c.chronicle_headline ?? `Turn ${c.turn_number}`,
    narrative: c.chronicle_entry ?? c.narrative_entry ?? 'No narrative recorded.',
    dateLabel: c.chronicle_date_label ?? undefined,
    contextSummary: c.context_summary ?? undefined,
    isDecisionPoint: c.is_decision_point ?? false,
    severity: 'major' as const,
    tags: [],
  }))

  const gtCommits: GroundTruthCommit[] = (groundTruthCommits ?? []).map(c => ({
    id: c.id,
    turnNumber: c.turn_number,
    simulatedDate: c.simulated_date,
    narrativeEntry: c.narrative_entry,
  }))

  const headCommit = commits?.at(-1)
  const turnNumber = headCommit?.turn_number ?? 0

  const initialData: GameInitialData = {
    scenario: {
      id:             scenario?.id ?? params.id,
      name:           scenario?.name ?? 'Unknown Scenario',
      classification: 'SECRET',
    },
    branch: {
      id:           branch?.id ?? params.branchId,
      name:         branch?.name ?? 'Ground Truth',
      isTrunk:      branch?.is_trunk ?? false,
      headCommitId: branch?.head_commit_id ?? null,
      turnNumber,
    },
    actors,
    actorDetails,
    decisions: IRAN_DECISIONS,
    decisionDetails: IRAN_DECISION_DETAILS,
    chronicle,
    groundTruthBranchId: trunkBranch?.id ?? params.branchId,
    groundTruthCommits: gtCommits,
    currentState,
  }

  return (
    <GameProvider>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar
        scenarioName={initialData.scenario.name}
        scenarioHref={`/scenarios/${params.id}`}
        turnNumber={turnNumber}
        totalTurns={gtCommits.length}
        phase={branch?.is_trunk ? 'Observer' : 'Planning'}
      />
      <main className="h-screen pt-[66px] overflow-hidden">
        <GameView
          branchId={params.branchId}
          scenarioId={params.id}
          initialData={initialData}
        />
      </main>
    </GameProvider>
  )
}
