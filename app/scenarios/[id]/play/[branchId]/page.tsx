// RSC boundary: async server component — no 'use client'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { NodeNavTopBar } from '@/components/ui/NodeNavTopBar'
import { HowToPlayButton } from '@/components/ui/HowToPlayButton'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameView } from '@/components/game/GameView'
import { createClient } from '@/lib/supabase/server'
import { resolveScenarioId } from '@/lib/supabase/resolve-scenario'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { US_DECISIONS, US_DECISION_DETAILS } from '@/lib/game/decisions/united-states'
import type { GameInitialData, ChronicleEntry, GroundTruthCommit } from '@/lib/types/game-init'
import type { ActorSummary, ActorDetail } from '@/lib/types/panels'
import { getActorColor, getRelationshipStance, isAdversaryActor, hasLimitedIntel, getEscalationRungName } from '@/lib/game/actor-meta'
import { parseIntelProfile, inferIntelConfidence, extractKnownUnknowns } from '@/lib/game/fow-panel'
import { parseDbEscalationLadder, buildRungSummaries } from '@/lib/game/escalation-from-db'
import { getIranSeedSnapshot } from '@/lib/game/dev-snapshot'

interface Props {
  params: { id: string; branchId: string }
  searchParams?: Record<string, string | undefined>
}

export default async function PlayPage({ params, searchParams }: Props) {
  // ── Dev mode fast path ────────────────────────────────────────────────────
  // When NEXT_PUBLIC_DEV_MODE=true the full Iran seed snapshot is loaded from
  // local data files so the UI can be tested without any Supabase connection.
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    const devData = getIranSeedSnapshot()

    // A forked branch in dev mode has an ID like "dev-branch-t5-1234567890".
    // Detect this to set isTrunk=false so the DECISIONS tab and TurnPlanBuilder
    // are accessible (they are hidden in Ground Truth / observer mode).
    const isDevFork = params.branchId.startsWith('dev-branch-')
    const forkTurnMatch = isDevFork ? params.branchId.match(/dev-branch-t(\d+)-/) : null
    const forkTurn = forkTurnMatch ? parseInt(forkTurnMatch[1], 10) : devData.branch.turnNumber

    // For a dev fork, filter chronicle to only include entries up to the fork point
    // so the simulation starts from the correct history.
    const devChronicle = isDevFork
      ? devData.chronicle.filter(e => e.turnNumber <= forkTurn)
      : devData.chronicle

    const devDataForBranch = isDevFork
      ? {
          ...devData,
          branch: {
            id:           params.branchId,
            name:         `Player Branch (T${forkTurn})`,
            isTrunk:      false,
            headCommitId: `dev-commit-${forkTurn}`,
            turnNumber:   forkTurn,
          },
          chronicle: devChronicle,
        }
      : devData

    return (
      <GameProvider initialData={devDataForBranch}>
        <ClassificationBanner classification="TOP SECRET // NOFORN // DEV MODE" />
        <TopBar
          scenarioName={devDataForBranch.scenario.name}
          scenarioHref={`/scenarios/${params.id}`}
          turnNumber={devDataForBranch.branch.turnNumber}
          totalTurns={devData.groundTruthCommits.length}
          phase={isDevFork ? 'Planning' : 'Observer'}
          howToPlaySlot={<HowToPlayButton />}
        />
        <main className="h-screen pt-[66px] overflow-hidden">
          <GameView
            branchId={params.branchId}
            scenarioId={params.id}
            initialData={devDataForBranch}
          />
        </main>
      </GameProvider>
    )
  }

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

  // 2. Fetch branch record — support "trunk" slug by looking up is_trunk branch.
  //    Also fetch lineage columns (parent_branch_id, fork_point_commit_id) so
  //    forked branches can reconstruct trunk history up to the fork point.
  type BranchRow = {
    id: string
    name: string
    is_trunk: boolean
    head_commit_id: string | null
    parent_branch_id: string | null
    fork_point_commit_id: string | null
  }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let branchData: BranchRow | null = null
  if (UUID_RE.test(params.branchId)) {
    const { data } = await supabase
      .from('branches')
      .select('id, name, is_trunk, head_commit_id, parent_branch_id, fork_point_commit_id')
      .eq('id', params.branchId)
      .single()
    branchData = data as BranchRow | null
  } else {
    // slug like "trunk" → look up trunk branch for this scenario
    const { data } = await supabase
      .from('branches')
      .select('id, name, is_trunk, head_commit_id, parent_branch_id, fork_point_commit_id')
      .eq('scenario_id', scenarioId)
      .eq('is_trunk', true)
      .single()
    branchData = data as BranchRow | null
  }
  const branch = branchData

  // 2b. Resolve active commit (may be overridden by ?commit= param)
  const commitParam = (searchParams as Record<string, string | undefined> | undefined)?.commit
  let activeCommitId = branch?.head_commit_id ?? null
  if (commitParam && UUID_RE.test(commitParam)) {
    activeCommitId = commitParam
  }

  // 2c. Fetch prev/next commit IDs for node navigation
  let prevCommitId: string | null = null
  let nextCommitId: string | null = null
  if (activeCommitId) {
    const nodeRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/nodes/${activeCommitId}`,
      { cache: 'no-store' }
    ).then(r => r.ok ? r.json() : null).catch(() => null) as { prev_commit_id?: string | null; next_commit_id?: string | null } | null
    if (nodeRes) {
      prevCommitId = nodeRes.prev_commit_id ?? null
      nextCommitId = nodeRes.next_commit_id ?? null
    }
  }

  // 3. Fetch actors for this scenario
  const { data: actorRows } = await supabase
    .from('scenario_actors')
    .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
    .eq('scenario_id', scenarioId)

  // 3b. Fetch simulation-layer actor data (escalation_ladder JSONB) from the
  //     actors table.  This table is populated by the research pipeline (Stage 5)
  //     and contains the full EscalationLadder object with real rung names,
  //     descriptions, and reversibility markers per actor.
  const { data: simActorRows } = await supabase
    .from('actors')
    .select('actor_id, escalation_ladder')
    .eq('scenario_id', scenarioId)

  // Index sim-actor rows by canonical actor_id for fast lookup
  const escalationLadderByActorId: Record<string, ReturnType<typeof parseDbEscalationLadder>> = {}
  for (const row of simActorRows ?? []) {
    if (row.actor_id) {
      escalationLadderByActorId[String(row.actor_id)] = parseDbEscalationLadder(
        row.escalation_ladder as Record<string, unknown> | null
      )
    }
  }

  // Parse the viewer (US) actor's intelligence profile for FOW derivation
  const viewerActorId = 'us'
  const viewerRow = (actorRows ?? []).find(a => a.id === viewerActorId || a.id === 'united_states')
  const viewerIntelProfile = parseIntelProfile(
    viewerRow?.intelligence_profile as Record<string, unknown> | null
  )

  // 4. Fetch current state via state engine
  let currentState = null
  if (branch?.head_commit_id) {
    try {
      currentState = await getStateAtTurn(params.branchId, branch.head_commit_id)
    } catch {
      // State engine failure is non-fatal
    }
  }

  // 5. Fetch chronicle using branch-lineage logic:
  //    • Trunk branches: all commits on this branch, ordered by turn_number.
  //    • Forked branches: trunk commits up to (and including) the fork turn,
  //      PLUS this branch's own commits after the fork — giving a contiguous,
  //      correctly scoped history.
  //    We derive the fork turn number by resolving fork_point_commit_id → turn_number.
  const COMMIT_COLS = 'turn_number, simulated_date, narrative_entry, chronicle_headline, chronicle_entry, chronicle_date_label, context_summary, is_decision_point'

  type CommitRow = {
    turn_number: number
    simulated_date: string
    narrative_entry: string | null
    chronicle_headline: string | null
    chronicle_entry: string | null
    chronicle_date_label: string | null
    context_summary: string | null
    is_decision_point: boolean | null
  }

  let commits: CommitRow[] | null = null

  const isForkedBranch = !!(branch && !branch.is_trunk && branch.parent_branch_id)

  if (isForkedBranch && branch) {
    // Step 5a: Resolve the fork turn number from the fork_point_commit_id.
    let forkTurnNumber: number | null = null
    if (branch.fork_point_commit_id) {
      const { data: forkCommit } = await supabase
        .from('turn_commits')
        .select('turn_number')
        .eq('id', branch.fork_point_commit_id)
        .single()
      forkTurnNumber = forkCommit?.turn_number ?? null
    }

    // Step 5b: Fetch trunk history up to fork turn.
    const { data: trunkCommits } = forkTurnNumber !== null
      ? await supabase
          .from('turn_commits')
          .select(COMMIT_COLS)
          .eq('branch_id', branch.parent_branch_id)
          .lte('turn_number', forkTurnNumber)
          .order('turn_number', { ascending: true })
      : { data: [] as CommitRow[] }

    // Step 5c: Fetch branch-specific commits after the fork turn.
    const { data: branchCommits } = forkTurnNumber !== null
      ? await supabase
          .from('turn_commits')
          .select(COMMIT_COLS)
          .eq('branch_id', branch.id)
          .gt('turn_number', forkTurnNumber)
          .order('turn_number', { ascending: true })
      : await supabase
          .from('turn_commits')
          .select(COMMIT_COLS)
          .eq('branch_id', branch.id)
          .order('turn_number', { ascending: true })

    // Merge trunk ancestry + branch divergence, deduplicated by turn_number
    // (branch commits win in case of any overlap).
    const mergedMap = new Map<number, CommitRow>()
    for (const c of (trunkCommits ?? []) as CommitRow[]) {
      mergedMap.set(c.turn_number, c)
    }
    for (const c of (branchCommits ?? []) as CommitRow[]) {
      mergedMap.set(c.turn_number, c)
    }
    commits = Array.from(mergedMap.values()).sort((a, b) => a.turn_number - b.turn_number)
  } else {
    // Trunk branch (or unknown): simple single-branch query
    const { data } = await supabase
      .from('turn_commits')
      .select(COMMIT_COLS)
      .eq('branch_id', branch?.id ?? params.branchId)
      .order('turn_number', { ascending: true })
    commits = data as CommitRow[] | null
  }

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

  if (process.env.NODE_ENV === 'development') {
    console.log('[play page] params:', { id: params.id, branchId: params.branchId })
    console.log('[play page] scenario?.id:', scenario?.id)
    console.log('[play page] branch?.id:', branch?.id)
    console.log('[play page] actorRows?.length:', actorRows?.length ?? 0)
    console.log('[play page] commits?.length:', commits?.length ?? 0)
  }

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

    // Derive FOW confidence and known unknowns using the panel FOW utilities,
    // which mirror the fog-of-war engine's logic adapted to the DB data layer.
    const stance          = getRelationshipStance(a.id, viewerActorId)
    const intelConfidence = inferIntelConfidence(viewerIntelProfile, stance)
    const knownUnknowns   = extractKnownUnknowns(
      viewerRow?.intelligence_profile as Record<string, unknown> | null
    )

    // Escalation ladder: use real rung data from actors.escalation_ladder if
    // available (populated by the research pipeline Stage 5), delegating blocked-
    // rung computation to the escalation engine (lib/game/escalation.ts).
    const dbLadder     = escalationLadderByActorId[a.id] ?? escalationLadderByActorId[`${a.id}_${scenarioId}`] ?? null
    const escalationRungs = buildRungSummaries(a.id, dbLadder, rung)

    actorDetails[a.id] = {
      id: a.id,
      name: a.name,
      shortName,
      actorColor: getActorColor(a.id),
      escalationRung: rung,
      escalationRungName: getEscalationRungName(a.id, rung),
      escalationRungs,
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
      isAdversary:      isAdversaryActor(a.id, viewerActorId),
      hasLimitedIntel:  hasLimitedIntel(a.id, viewerActorId),
      viewerActorId,
      relationshipStance: stance,
      recentHistory: recentHistory.length > 0 ? recentHistory : undefined,
      knownUnknowns: knownUnknowns.length > 0 ? knownUnknowns : undefined,
      intelConfidence,
    }
  }

  const chronicle: ChronicleEntry[] = (commits ?? []).map(c => {
    // chronicle_entry = short summary shown above the fold.
    // full_briefing / narrative_entry = extended text shown when user expands.
    // Only expose a distinct "Full Briefing" when it is non-empty, different
    // from mainContent, AND more than 200 chars longer (prevents near-duplicates).
    const mainContent  = c.chronicle_entry ?? c.narrative_entry ?? 'No narrative recorded.'
    const fullBriefing = c.narrative_entry ?? ''
    const distinctDetail =
      fullBriefing.length > 0 &&
      fullBriefing !== mainContent &&
      fullBriefing.length > mainContent.length + 200
        ? fullBriefing
        : undefined
    return {
      turnNumber: c.turn_number,
      date: c.simulated_date,
      title: c.chronicle_headline ?? `Turn ${c.turn_number}`,
      narrative: mainContent,
      detail: distinctDetail,
      dateLabel: c.chronicle_date_label ?? undefined,
      contextSummary: c.context_summary ?? undefined,
      isDecisionPoint: c.is_decision_point ?? false,
      severity: 'major' as const,
      tags: [],
    }
  })

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
    decisions: US_DECISIONS,
    decisionDetails: US_DECISION_DETAILS,
    chronicle,
    groundTruthBranchId: trunkBranch?.id ?? params.branchId,
    groundTruthCommits: gtCommits,
    currentState,
  }

  return (
    <GameProvider>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <NodeNavTopBar
        scenarioId={params.id}
        branchId={params.branchId}
        prevCommitId={prevCommitId}
        nextCommitId={nextCommitId}
        scenarioName={initialData.scenario.name}
        scenarioHref={`/scenarios/${params.id}`}
        turnNumber={turnNumber}
        totalTurns={gtCommits.length}
        phase={branch?.is_trunk ? 'Observer' : 'Planning'}
        howToPlaySlot={<HowToPlayButton />}
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
