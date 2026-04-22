'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ActorCard } from '@/components/game/ActorCard'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'
import { BranchTree } from '@/components/scenario/BranchTree'
import type { BranchNode, ActorOption } from '@/components/scenario/BranchTree'
import type { ActorDetail } from '@/lib/types/panels'
import type { ChronicleEntry } from '@/lib/types/game-init'
import { createClient } from '@/lib/supabase/client'
import { getActorColor, getRelationshipStance, isAdversaryActor, hasLimitedIntel, getEscalationRungName } from '@/lib/game/actor-meta'
import { parseIntelProfile, inferIntelConfidence, extractKnownUnknowns, applyFogOfWarToActorDetail } from '@/lib/game/fow-panel'
import { parseDbEscalationLadder, buildRungSummaries } from '@/lib/game/escalation-from-db'

// ─── Live actor types ─────────────────────────────────────────────────────────

interface LiveActor {
  id: string
  name: string
  escalationRung: number
  status: 'stable' | 'escalating' | 'critical'
  description: string
  metrics: { label: string; value: string }[]
}

// ─── Branch tree helpers ──────────────────────────────────────────────────────

type BranchRow = {
  id: string
  name: string
  is_trunk: boolean
  status: string
  head_commit_id: string | null
  fork_point_commit_id: string | null
  created_at: string
  parent_branch_id: string | null
  turn_commits: Array<{ id: string; turn_number: number; simulated_date: string }>
}

function buildBranchTree(rows: BranchRow[]): BranchNode | null {
  // Build a global commit-id → turn_number map across all branches
  const commitTurnMap = new Map<string, number>()
  for (const row of rows) {
    for (const c of row.turn_commits ?? []) {
      if (c.id) commitTurnMap.set(c.id, c.turn_number)
    }
  }

  const map = new Map<string, BranchNode>()
  for (const row of rows) {
    const commits = row.turn_commits ?? []
    const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0)
    const latestCommit = commits.find(c => c.turn_number === maxTurn)
    // Resolve fork turn from fork_point_commit_id; trunk always forks at 0
    const forkTurn = row.is_trunk
      ? 0
      : row.fork_point_commit_id
        ? (commitTurnMap.get(row.fork_point_commit_id) ?? 1)
        : 1
    map.set(row.id, {
      id: row.id,
      name: row.name,
      isTrunk: row.is_trunk,
      status: row.status === 'active' ? 'active' : 'archived',
      forkTurn,
      headTurn: Math.max(maxTurn, forkTurn),
      totalTurns: commits.length,
      lastPlayedAt: row.created_at,
      controlledActor: null,
      children: [],
      turnDate: latestCommit?.simulated_date,
    })
  }
  let root: BranchNode | null = null
  for (const row of rows) {
    const node = map.get(row.id)!
    if (row.parent_branch_id && map.has(row.parent_branch_id)) {
      map.get(row.parent_branch_id)!.children.push(node)
    } else {
      root = node
    }
  }
  return root
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'actors' | 'timeline'

// ─── Animation variants ───────────────────────────────────────────────────────

const tabFadeVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:   { opacity: 0,       transition: { duration: 0.3, ease: 'easeOut' } },
}

const tabFadeVariantsSkip: Variants = {
  hidden:  { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
  exit:    { opacity: 1,       transition: { duration: 0 } },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScenarioHubPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>('actors')
  const [selectedActor, setSelectedActor] = useState<ActorDetail | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branchError, setBranchError] = useState<string | null>(null)
  const [branchRoot, setBranchRoot] = useState<BranchNode | null>(null)
  const [trunkBranchId, setTrunkBranchId] = useState<string | null>(null)
  const [actorOptions, setActorOptions] = useState<ActorOption[]>([])
  const [liveActors, setLiveActors] = useState<LiveActor[]>([])
  const [liveActorDetails, setLiveActorDetails] = useState<Record<string, ActorDetail>>({})
  const [timelineEntries, setTimelineEntries] = useState<ChronicleEntry[]>([])
  const [scenarioName, setScenarioName] = useState<string>('US–Israel–Iran Conflict')
  const [scenarioDesc, setScenarioDesc] = useState<string>('Phase 3: Operation Epic Fury — Day 19. Joint US-Israeli decapitation strike launched. Strait of Hormuz closed. Oil at $142/bbl.')
  const [currentTurn, setCurrentTurn] = useState<number | null>(null)
  const router = useRouter()
  const shouldSkip = useReducedMotion()

  // Resolve slug → UUID redirect (e.g. "iran-2026" → real scenario UUID)
  useEffect(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (UUID_RE.test(params.id)) return
    let sb: ReturnType<typeof createClient> | null = null
    try { sb = createClient() } catch { return }
    if (!sb) return
    const keyword = params.id.split('-')[0]
    void sb.from('scenarios')
      .select('id')
      .ilike('name', `%${keyword}%`)
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (data?.id) router.replace(`/scenarios/${data.id}`)
      })
  }, [params.id, router])

  useEffect(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(params.id)) return

    void (async () => {
      // 1. Branches + actor list — server-side API bypasses RLS
      const branchApiRes = await fetch(`/api/branches?scenarioId=${params.id}`)
      let trunkId: string | null = null
      if (branchApiRes.ok) {
        const branchJson = await branchApiRes.json() as {
          branches: BranchRow[];
          actors: Array<{ id: string; name: string; short_name: string }>;
        }

        const rows = branchJson.branches ?? []
        if (rows.length > 0) {
          const tree = buildBranchTree(rows)
          if (tree) setBranchRoot(tree)
          const trunk = rows.find(r => r.is_trunk)
          if (trunk) {
            setTrunkBranchId(trunk.id)
            trunkId = trunk.id
            const commits = trunk.turn_commits ?? []
            const maxTurn = commits.reduce((m: number, c: { turn_number: number }) => Math.max(m, c.turn_number), 0)
            if (maxTurn > 0) setCurrentTurn(maxTurn)
          }
        }

        const actors = branchJson.actors ?? []
        if (actors.length > 0) {
          setActorOptions(actors.map(a => ({
            id: a.id,
            name: a.name,
            flag: (a.short_name ?? a.name.slice(0, 3)).toUpperCase(),
          })))
        }
      }

      // 2. Scenario name + description + detailed actor data — browser client (no RLS on these)
      let supabase: ReturnType<typeof createClient> | null = null
      try { supabase = createClient() } catch { /* ignore */ }
      if (supabase) {
        const sb = supabase
        const [scenarioActorRes, scenarioRes, simActorRes] = await Promise.all([
          sb
            .from('scenario_actors')
            .select('id, name, short_name, biographical_summary, win_condition, strategic_doctrine, historical_precedents, initial_scores, leadership_profile, intelligence_profile')
            .eq('scenario_id', params.id),
          sb
            .from('scenarios')
            .select('id, name, description')
            .eq('id', params.id)
            .single(),
          // Fetch simulation-layer actor data (escalation_ladder JSONB)
          // from actors table — populated by the research pipeline Stage 5
          sb
            .from('actors')
            .select('actor_id, escalation_ladder')
            .eq('scenario_id', params.id),
        ])

        // Index sim-actor escalation ladders by canonical actor_id
        const escalationLadderByActorId: Record<string, ReturnType<typeof parseDbEscalationLadder>> = {}
        for (const row of simActorRes.data ?? []) {
          if (row.actor_id) {
            escalationLadderByActorId[String(row.actor_id)] = parseDbEscalationLadder(
              row.escalation_ladder as Record<string, unknown> | null
            )
          }
        }

        if (scenarioRes.data) {
          setScenarioName(scenarioRes.data.name)
          if (scenarioRes.data.description) setScenarioDesc(scenarioRes.data.description)
        }

        if (scenarioActorRes.data && scenarioActorRes.data.length > 0) {
          const actorRows = scenarioActorRes.data as Array<{
            id: string; name: string; short_name: string; biographical_summary: string;
            win_condition: string; strategic_doctrine: string; historical_precedents: string;
            initial_scores: Record<string, number>; leadership_profile: string;
            intelligence_profile?: Record<string, unknown>;
          }>

          // Parse viewer (US) intelligence profile for FOW derivation
          const viewerActorId = 'us'
          const viewerRow = actorRows.find(a => a.id === viewerActorId || a.id === 'united_states')
          const viewerIntelProfile = parseIntelProfile(
            viewerRow?.intelligence_profile ?? null
          )

          const actorDetails: Record<string, ActorDetail> = {}
          const live: LiveActor[] = actorRows.map(a => {
            const scores = a.initial_scores ?? {}
            const milScore = typeof scores.military_strength === 'number' ? scores.military_strength : 50
            const ecoScore = typeof scores.economic_strength === 'number' ? scores.economic_strength : 50
            const polScore = typeof scores.political_stability === 'number' ? scores.political_stability : 50
            const rung = typeof scores.escalation_rung === 'number' ? scores.escalation_rung : 1
            const status: 'stable' | 'escalating' | 'critical' = rung >= 6 ? 'critical' : rung >= 3 ? 'escalating' : 'stable'

            const actorColor = getActorColor(a.id)
            const stance     = getRelationshipStance(a.id, viewerActorId)
            const isAdversary = isAdversaryActor(a.id, viewerActorId)
            const escalationRungName = getEscalationRungName(a.id, rung)

            // FOW: derive intel confidence from viewer's intel profile + stance
            const intelConfidence = inferIntelConfidence(viewerIntelProfile, stance)
            const knownUnknowns   = extractKnownUnknowns(viewerRow?.intelligence_profile ?? null)

            const rawObjectives = a.win_condition
              ? a.win_condition.split(/\n|•|–|-/).map((s: string) => s.trim()).filter((s: string) => s.length > 10)
              : []
            const primaryObjective = rawObjectives[0] ?? ''

            actorDetails[a.id] = {
              id: a.id,
              name: a.name,
              shortName: a.short_name ?? a.name.slice(0, 6).toUpperCase(),
              actorColor,
              escalationRung: rung,
              escalationRungName,
              // Escalation rungs: sourced from actors.escalation_ladder JSONB.
              // Falls back to empty array if the actors table has no ladder data for this actor.
              escalationRungs: buildRungSummaries(a.id, escalationLadderByActorId[a.id] ?? null, rung),
              briefing: a.biographical_summary,
              militaryStrength: milScore,
              economicStrength: ecoScore,
              politicalStability: polScore,
              objectives: rawObjectives,
              primaryObjective,
              winCondition: a.win_condition,
              leadershipProfile: a.leadership_profile,
              strategicDoctrine: a.strategic_doctrine,
              historicalPrecedents: a.historical_precedents,
              isAdversary,
              hasLimitedIntel: hasLimitedIntel(a.id, viewerActorId),
              viewerActorId,
              relationshipStance: stance,
              knownUnknowns: knownUnknowns.length > 0 ? knownUnknowns : undefined,
              intelConfidence,
            }

            return {
              id: a.id,
              name: a.name,
              escalationRung: rung,
              status,
              description: a.biographical_summary?.slice(0, 120) ?? '',
              metrics: [
                { label: 'Mil. Readiness', value: String(milScore) },
                { label: 'Eco. Strength', value: String(ecoScore) },
              ],
            }
          })

          setLiveActors(live)
          setLiveActorDetails(actorDetails)
        }
      }

      // 3. Timeline — use chronicle API (server-side, bypasses RLS)
      if (trunkId) {
        const chronicleRes = await fetch(`/api/chronicle/${trunkId}`)
        if (chronicleRes.ok) {
          const chronicleJson = await chronicleRes.json() as {
            commits: Array<{
              turn_number: number; simulated_date: string;
              chronicle_headline: string | null; chronicle_entry: string | null; narrative_entry: string | null;
            }>;
          }
          const rows = chronicleJson.commits ?? []
          if (rows.length > 0) {
            setTimelineEntries(rows.map(c => ({
              turnNumber: c.turn_number,
              date: c.simulated_date,
              title: c.chronicle_headline ?? `Turn ${c.turn_number}`,
              narrative: c.chronicle_entry ?? c.narrative_entry ?? '',
              severity: 'major' as const,
              tags: [],
            })))
          }
        }
      }
    })()
  }, [params.id])

  function openDossier(actorId: string) {
    const detail = liveActorDetails[actorId] ?? null
    if (detail) {
      // Apply FOW before opening dossier — redacts adversary objectives,
      // doctrine, and win-condition fields and applies intel confidence derived
      // from the viewer's intelligence profile. In the scenario hub there is no
      // controlled actor yet, so we default the viewer to 'us'.
      const filtered = applyFogOfWarToActorDetail(detail)
      setSelectedActor(filtered)
      setPanelOpen(true)
    }
  }

  function closeDossier() {
    setPanelOpen(false)
  }

  async function handleStartNewBranch() {
    setCreatingBranch(true)
    setBranchError(null)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: params.id }),
      })
      if (res.ok) {
        const json = (await res.json()) as { id?: string }
        if (json.id) {
          router.push(`/scenarios/${params.id}/play/${json.id}`)
          return
        }
      }
      setBranchError('Branching is available from the Play page after selecting a turn.')
    } catch {
      setBranchError('Failed to create branch — please try again.')
    } finally {
      setCreatingBranch(false)
    }
  }

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName={scenarioName.toUpperCase()} />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-5xl mx-auto px-5 py-4">

          <div className="border-b border-[#1a1a1a] mb-4">
            <DocumentIdHeader
              scenarioCode={`WAR-GAME-${params.id.toUpperCase().slice(0, 12)}`}
              branchName="SELECT BRANCH"
            />
          </div>

          {/* Back link */}
          <div className="mt-4 mb-3">
            <Link
              href="/scenarios"
              className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.08em] hover:text-text-secondary transition-colors"
            >
              ← Scenario Library
            </Link>
          </div>

          {/* Scenario overview card */}
          <div
            className="mb-6 p-5"
            style={{
              background: '#0d0d0d',
              border: '1px solid #1a1a1a',
              borderLeft: '3px solid #b91c1c',
            }}
          >
            {/* Badges + status */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="critical">SECRET</Badge>
              <Badge variant="military">ACTIVE CONFLICT</Badge>
              {currentTurn && (
                <span className="font-mono text-2xs text-text-tertiary ml-auto tracking-[0.04em] uppercase">
                  TURN {String(currentTurn).padStart(2, '0')}{' // '}ACTIVE
                </span>
              )}
            </div>

            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-2 leading-[1.2]">
              {scenarioName}
            </h1>
            <p className="font-serif text-base text-text-secondary leading-[1.75] mb-4 max-w-3xl">
              {scenarioDesc}
            </p>

            {/* Actor strip — live from Supabase, fall back to known actors */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {(actorOptions.length > 0 ? actorOptions : [
                { id: 'usa', name: 'United States', flag: 'USA' },
                { id: 'irn', name: 'Iran', flag: 'IRN' },
                { id: 'isr', name: 'Israel', flag: 'ISR' },
                { id: 'sau', name: 'Saudi Arabia', flag: 'SAU' },
                { id: 'chn', name: 'China', flag: 'CHN' },
                { id: 'rus', name: 'Russia', flag: 'RUS' },
              ]).map((a) => {
                const ACTOR_COLORS: Record<string, string> = {
                  usa: '#4a90d9', us: '#4a90d9', united_states: '#4a90d9',
                  irn: '#c0392b', iran: '#c0392b',
                  isr: '#ffba20', israel: '#ffba20',
                  sau: '#5EBD8E', saudi_arabia: '#5EBD8E',
                  chn: '#4A90B8', china: '#4A90B8',
                  rus: '#9B59B6', russia: '#9B59B6',
                }
                const label = a.flag.slice(0, 3).toUpperCase()
                const color = ACTOR_COLORS[a.id.toLowerCase()] ?? '#8a8880'
                return (
                  <span
                    key={a.id}
                    className="font-mono text-2xs px-2 py-0.5 border"
                    style={{ color, borderColor: `${color}40`, background: `${color}12` }}
                  >
                    {label}
                  </span>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="primary"
                onClick={() => router.push(`/scenarios/${params.id}/play/${trunkBranchId ?? 'trunk'}`)}
                className="text-[11px] py-1.5"
              >
                Observe — AI vs AI
              </Button>
              <Button
                variant="ghost"
                className="text-[11px] py-1.5"
                onClick={() => void handleStartNewBranch()}
                disabled={creatingBranch}
              >
                {creatingBranch ? 'Creating...' : '+ Play as Actor →'}
              </Button>
              <Button
                variant="ghost"
                className="text-[11px] py-1.5"
                onClick={() => router.push(`/scenarios/${params.id}/branches`)}
              >
                Browse Branches
              </Button>
            </div>
          </div>

          {/* Branch tree */}
          <section className="mb-8">
            {/* Header: title + new branch CTA */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-label font-bold text-[13px] uppercase tracking-[0.06em] text-text-primary">
                Branch Timeline
              </h2>
              <Button
                variant="ghost"
                className="text-[11px] py-1"
                onClick={() => void handleStartNewBranch()}
                disabled={creatingBranch}
              >
                {creatingBranch ? 'CREATING...' : '+ Start New Branch'}
              </Button>
            </div>

            {branchError && (
              <p className="font-mono text-2xs text-status-critical uppercase tracking-[0.04em] mb-3">
                {branchError}
              </p>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 mb-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-6 h-0.5"
                  style={{ background: '#ffba20' }}
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-tertiary">
                  Ground Truth
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-6 h-0.5"
                  style={{ background: '#5a4f32', borderTop: '1px dashed #5a4f32' }}
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-tertiary">
                  Player Branch
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-6 h-0.5"
                  style={{ background: '#2e2e2e' }}
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-tertiary">
                  Archived
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-tertiary ml-auto">
                CLICK NODE TO SELECT
              </span>
            </div>

            {/* Tree */}
            {branchRoot ? (
              <BranchTree
                root={branchRoot}
                scenarioId={params.id}
                actors={actorOptions}
              />
            ) : (
              <p className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.04em] py-4">
                Loading branches...
              </p>
            )}
          </section>

          {/* Section divider */}
          <div className="border-t border-[#1a1a1a] mb-6" />

          {/* Tabs */}
          <div className="flex mb-6 border-b border-[#1a1a1a]">
            {(['actors', 'timeline'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="font-label text-[11px] font-semibold uppercase tracking-[0.06em] px-4 py-3 -mb-px border-b-2 transition-colors"
                style={{
                  color: activeTab === tab ? 'var(--gold)' : 'var(--text-tertiary)',
                  borderBottomColor: activeTab === tab ? 'var(--gold)' : 'transparent',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                }}
              >
                {tab === 'actors' ? 'ACTORS' : 'TIMELINE'}
              </button>
            ))}
          </div>

          {/* Tab content — animated on switch */}
          <AnimatePresence mode="wait">
            {activeTab === 'actors' ? (
              <motion.div
                key="actors"
                variants={shouldSkip ? tabFadeVariantsSkip : tabFadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {liveActors.length > 0 ? liveActors.map((actor) => (
                  <ActorCard
                    key={actor.id}
                    actor={actor}
                    onViewDossier={() => openDossier(actor.id)}
                  />
                )) : (
                  <p className="col-span-3 font-mono text-2xs text-text-tertiary uppercase tracking-[0.04em] py-4">
                    Loading actors...
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="timeline"
                variants={shouldSkip ? tabFadeVariantsSkip : tabFadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {timelineEntries.length > 0 ? (
                  <ChronicleTimeline entries={timelineEntries} />
                ) : (
                  <p className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.04em] py-4">
                    Loading timeline...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Actor dossier slide-over */}
      {selectedActor && (
        <ActorDetailPanel
          actor={selectedActor}
          open={panelOpen}
          onClose={closeDossier}
        />
      )}
    </>
  )
}
