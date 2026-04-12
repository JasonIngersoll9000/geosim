// RSC boundary: async server component — no 'use client'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameView } from '@/components/game/GameView'
import { createClient } from '@/lib/supabase/server'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { IRAN_DECISIONS, IRAN_DECISION_DETAILS } from '@/lib/game/iran-decisions'
import type { GameInitialData, ChronicleEntry, GroundTruthCommit } from '@/lib/types/game-init'
import type { ActorSummary, ActorDetail } from '@/lib/types/panels'

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

  // 1. Fetch scenario metadata
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('id, name, classification')
    .eq('id', params.id)
    .single()

  // 2. Fetch branch record — 'trunk' slug resolves to the is_trunk=true branch
  const branchQuery = params.branchId === 'trunk'
    ? supabase
        .from('branches')
        .select('id, name, is_trunk, head_commit_id')
        .eq('scenario_id', params.id)
        .eq('is_trunk', true)
        .single()
    : supabase
        .from('branches')
        .select('id, name, is_trunk, head_commit_id')
        .eq('id', params.branchId)
        .single()
  const { data: branch } = await branchQuery

  // 3. Fetch actors for this scenario
  const { data: actorRows } = await supabase
    .from('actors')
    .select('actor_id, name, win_condition, lose_condition, strategic_posture, escalation_ladder')
    .eq('scenario_id', params.id)

  // 4. Fetch current state via state engine
  let currentState = null
  if (branch?.head_commit_id) {
    try {
      currentState = await getStateAtTurn(branch.id, branch.head_commit_id)
    } catch {
      // State engine failure is non-fatal
    }
  }

  // 5. Fetch chronicle (turn_commits on this branch) — use resolved branch.id, not the URL slug
  const resolvedBranchId = branch?.id ?? params.branchId
  const { data: commits } = await supabase
    .from('turn_commits')
    .select('turn_number, simulated_date, narrative_entry')
    .eq('branch_id', resolvedBranchId)
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
    const ladder = a.escalation_ladder as { current_rung?: number } | null
    return {
      id: a.actor_id,
      name: a.name,
      escalationRung: ladder?.current_rung ?? 0,
    }
  })

  const actorDetails: Record<string, ActorDetail> = {}
  for (const a of actorRows ?? []) {
    const s = currentState?.actor_states[a.actor_id]
    actorDetails[a.actor_id] = {
      id: a.actor_id,
      name: a.name,
      escalationRung: (a.escalation_ladder as { current_rung?: number } | null)?.current_rung ?? 0,
      briefing: a.strategic_posture ?? 'No briefing available.',
      militaryStrength:   s ? Math.round(Number(s.military_strength))   : 50,
      economicStrength:   s ? Math.round(Number(s.economic_health))     : 50,
      politicalStability: s ? Math.round(Number(s.political_stability)) : 50,
      objectives: [a.win_condition, a.lose_condition].filter(Boolean) as string[],
    }
  }

  const chronicle: ChronicleEntry[] = (commits ?? []).map(c => ({
    turnNumber: c.turn_number,
    date: c.simulated_date,
    title: `Turn ${c.turn_number}`,
    narrative: c.narrative_entry ?? 'No narrative recorded.',
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
      classification: (scenario?.classification as string | null) ?? 'SECRET',
    },
    branch: {
      id:           resolvedBranchId,
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
          branchId={resolvedBranchId}
          scenarioId={params.id}
          initialData={initialData}
        />
      </main>
    </GameProvider>
  )
}
