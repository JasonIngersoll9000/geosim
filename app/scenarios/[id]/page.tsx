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
import { createClient } from '@/lib/supabase/client'

// ─── Actor mock data ──────────────────────────────────────────────────────────

const MOCK_ACTORS = [
  {
    id: 'united_states',
    name: 'United States',
    escalationRung: 5,
    status: 'escalating' as const,
    description: 'Federal republic leading coalition operations. Air campaign active.',
    metrics: [
      { label: 'Air Defense', value: '42%' },
      { label: 'Mil. Readiness', value: '58' },
    ],
  },
  {
    id: 'iran',
    name: 'Iran',
    escalationRung: 6,
    status: 'critical' as const,
    description: 'Theocratic republic executing asymmetric attrition strategy.',
    metrics: [
      { label: 'Strait Status', value: 'CLOSED' },
      { label: 'Regime Stab.', value: '68' },
    ],
  },
  {
    id: 'israel',
    name: 'Israel',
    escalationRung: 6,
    status: 'critical' as const,
    description: 'Parliamentary democracy on existential footing. Multi-front pressure.',
    metrics: [
      { label: 'Pub. Support', value: '71%' },
      { label: 'Mil. Readiness', value: '74' },
    ],
  },
  {
    id: 'russia',
    name: 'Russia',
    escalationRung: 1,
    status: 'stable' as const,
    description: 'Authoritarian state exploiting US overextension. Intel support to Iran.',
    metrics: [
      { label: 'Opportunity', value: 'HIGH' },
      { label: 'Oil Revenue', value: '+38%' },
    ],
  },
  {
    id: 'china',
    name: 'China',
    escalationRung: 1,
    status: 'stable' as const,
    description: 'Strategic patience. De-escalating around Taiwan. Passive beneficiary.',
    metrics: [
      { label: 'Trade Posture', value: 'NEUTRAL' },
      { label: 'Oil Access', value: 'SECURE' },
    ],
  },
  {
    id: 'gulf_states',
    name: 'Gulf States',
    escalationRung: 2,
    status: 'escalating' as const,
    description: 'UAE, Saudi, Qatar caught in crossfire. Reviewing US alliance commitments.',
    metrics: [
      { label: 'Oil Output', value: '−15%' },
      { label: 'US Alignment', value: 'STRAINED' },
    ],
  },
]

// ─── Actor detail dossier mock data ──────────────────────────────────────────

const MOCK_ACTOR_DETAILS: Record<string, ActorDetail> = {
  united_states: {
    id: 'united_states',
    name: 'United States',
    escalationRung: 5,
    briefing:
      'The United States leads a joint coalition air campaign targeting Iranian nuclear infrastructure. Carrier Strike Group 12 operates from the eastern Mediterranean. Public approval for kinetic operations holding at 52% domestically; coalition partners diverging on escalation tempo.',
    militaryStrength: 74,
    economicStrength: 68,
    politicalStability: 52,
    objectives: [
      'Neutralize Iranian nuclear enrichment capability',
      'Reopen Strait of Hormuz to commercial traffic',
      'Prevent Hezbollah second-front escalation',
      'Maintain allied coalition cohesion',
    ],
  },
  iran: {
    id: 'iran',
    name: 'Iran',
    escalationRung: 6,
    briefing:
      'IRGC executing asymmetric attrition doctrine. Hormuz closure achieved; economic pressure on adversaries mounting. Fordow facility partially intact. Regime stability under domestic pressure — Revolutionary Guards controlling information environment. Proxy networks in Lebanon and Iraq activating.',
    militaryStrength: 44,
    economicStrength: 22,
    politicalStability: 38,
    objectives: [
      'Preserve regime survival at all costs',
      'Maintain Hormuz closure as leverage',
      'Activate proxy network for multi-front pressure',
      'Secure Russian and Chinese diplomatic cover',
    ],
  },
  israel: {
    id: 'israel',
    name: 'Israel',
    escalationRung: 6,
    briefing:
      'IDF operating at maximum tempo across Northern Command and Air Force. Nevatim airbase sustained 14 Iranian drone strikes; operational continuity maintained. Public consensus for operations holding. Ben Gurion alternate airlift routing secured through Cyprus.',
    militaryStrength: 74,
    economicStrength: 58,
    politicalStability: 71,
    objectives: [
      'Destroy remaining Iranian nuclear sites, including Fordow',
      'Suppress Hezbollah rocket capability',
      'Maintain US political and intelligence support',
      'Prevent coalition fracture over civilian casualties',
    ],
  },
  russia: {
    id: 'russia',
    name: 'Russia',
    escalationRung: 1,
    briefing:
      'Kremlin pursuing strategic patience. Oil at $142/bbl generates $4.2B additional monthly revenue. Supplying Iran with electronic warfare and drone countermeasures indirectly. Diplomatic messaging calibrated to extend conflict while avoiding direct involvement.',
    militaryStrength: 61,
    economicStrength: 44,
    politicalStability: 64,
    objectives: [
      'Maximize economic benefit from elevated oil prices',
      'Exhaust US strategic reserves and political capital',
      'Preserve Iranian state as future leverage point',
      'Prevent NATO from increasing Eastern Flank readiness',
    ],
  },
  china: {
    id: 'china',
    name: 'China',
    escalationRung: 1,
    briefing:
      'Beijing in strategic observation posture. Continuing Iranian oil imports via grey-market tanker fleet. Maintaining Taiwan Strait calm to avoid two-crisis simultaneity. Watching US carrier group redeployment patterns carefully.',
    militaryStrength: 66,
    economicStrength: 71,
    politicalStability: 72,
    objectives: [
      'Secure continued Iranian oil supply at discount',
      'Monitor US force posture for Taiwan assessment',
      'Support BRICS diplomatic mediation narrative',
      'Avoid direct involvement triggering sanctions',
    ],
  },
  gulf_states: {
    id: 'gulf_states',
    name: 'Gulf States',
    escalationRung: 2,
    briefing:
      'Saudi Arabia, UAE, and Qatar navigating between US alliance obligations and proximity to conflict. Oil output reduced 15% due to insurance and tanker flight. Emergency OPEC+ session ongoing. US base access in Qatar and Bahrain under domestic political review.',
    militaryStrength: 38,
    economicStrength: 52,
    politicalStability: 44,
    objectives: [
      'Prevent Iranian proxy attacks on GCC territory',
      'Maintain oil infrastructure and export continuity',
      'Negotiate security guarantees from US without escalation',
      'Preserve economic relationships with China',
    ],
  },
}

// ─── Timeline mock data ───────────────────────────────────────────────────────

const TIMELINE_ENTRIES = [
  {
    turnNumber: 1,
    date: '4 March 2026',
    title: 'Operation Epic Fury Launched',
    narrative:
      'Joint US-Israeli decapitation strike targeting 14 nuclear facilities. Three sites hardened beyond conventional penetration. Fordow partially intact.',
    severity: 'critical' as const,
    tags: ['Military', 'Nuclear'],
    detail:
      'B-2 sorties from Diego Garcia, F-35I from Nevatim. Carrier group CVN-73 launched 64 Tomahawks. Fordow bunker penetration failed — requires GBU-57 on second sortie.',
  },
  {
    turnNumber: 2,
    date: '8 March 2026',
    title: 'Strait of Hormuz Closed',
    narrative:
      'IRGC mining operation closes Hormuz. 22 tankers rerouted. Oil spikes to $142/bbl. Gulf States emergency session convened.',
    severity: 'critical' as const,
    tags: ['Economic', 'Military'],
    detail:
      'MCM assets deployed. US 5th Fleet estimating 72–96 hours to clear main channel. LNG terminal at Ras Laffan operational.',
  },
  {
    turnNumber: 3,
    date: '14 March 2026',
    title: 'Oman Diplomatic Breakthrough',
    narrative:
      'Oman announces framework for temporary ceasefire. Iran signals willingness to negotiate Hormuz reopening. US rejects preconditions.',
    severity: 'major' as const,
    tags: ['Diplomatic'],
  },
  {
    turnNumber: 4,
    date: '22 March 2026',
    title: 'Hezbollah Northern Front Activated',
    narrative:
      'Hezbollah launches 340 rockets into northern Israel. Iron Dome at 87% intercept rate. Three civilians killed in Haifa.',
    severity: 'major' as const,
    tags: ['Military', 'Escalation'],
  },
]

// ─── Branch tree helpers ──────────────────────────────────────────────────────

type BranchRow = {
  id: string
  name: string
  is_trunk: boolean
  status: string
  head_commit_id: string | null
  created_at: string
  parent_branch_id: string | null
  turn_commits: Array<{ turn_number: number; simulated_date: string }>
}

function buildBranchTree(rows: BranchRow[]): BranchNode | null {
  const map = new Map<string, BranchNode>()
  for (const row of rows) {
    const commits = row.turn_commits ?? []
    const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0)
    const latestCommit = commits.find(c => c.turn_number === maxTurn)
    map.set(row.id, {
      id: row.id,
      name: row.name,
      isTrunk: row.is_trunk,
      status: row.status === 'active' ? 'active' : 'archived',
      forkTurn: 0,
      headTurn: maxTurn,
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
  const [actorOptions, setActorOptions] = useState<ActorOption[]>([])
  const router = useRouter()
  const shouldSkip = useReducedMotion()

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      return
    }
    if (!supabase) return
    void (async () => {
      const [branchRes, actorRes] = await Promise.all([
        supabase
          .from('branches')
          .select('id, name, is_trunk, status, head_commit_id, created_at, parent_branch_id, turn_commits(turn_number, simulated_date)')
          .eq('scenario_id', params.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('actors')
          .select('actor_id, name')
          .eq('scenario_id', params.id),
      ])
      if (branchRes.data && branchRes.data.length > 0) {
        const rows = branchRes.data as unknown as BranchRow[]
        const tree = buildBranchTree(rows)
        if (tree) setBranchRoot(tree)
      }
      if (actorRes.data) {
        setActorOptions(
          actorRes.data.map((a: Record<string, unknown>) => ({
            id: a.actor_id as string,
            name: a.name as string,
            flag: (a.name as string).slice(0, 3).toUpperCase(),
          }))
        )
      }
    })()
  }, [params.id])

  function openDossier(actorId: string) {
    const detail = MOCK_ACTOR_DETAILS[actorId] ?? null
    if (detail) {
      setSelectedActor(detail)
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
      const json = (await res.json()) as { id?: string; error?: string }
      if (res.ok && json.id) {
        router.push(`/scenarios/${params.id}/play/${json.id}`)
        return
      }
      setBranchError(json.error ?? 'Branching is available from the Play page after selecting a turn.')
    } catch {
      setBranchError('Failed to create branch — please try again.')
    } finally {
      setCreatingBranch(false)
    }
  }

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName="US-ISRAEL-IRAN CONFLICT 2025-2026" />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-5xl mx-auto px-5 py-4">

          <div className="border-b border-[#1a1a1a] mb-4">
            <DocumentIdHeader
              scenarioCode={`GEOSIM-${params.id.toUpperCase().slice(0, 12)}`}
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
              <span className="font-mono text-2xs text-text-tertiary ml-auto tracking-[0.04em] uppercase">
                TURN 03{' // '}ACTIVE
              </span>
            </div>

            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-2 leading-[1.2]">
              US–Israel–Iran Conflict
            </h1>
            <p className="font-serif text-base text-text-secondary leading-[1.75] mb-4 max-w-3xl">
              Phase 3: Operation Epic Fury — Day 19. Joint US-Israeli decapitation
              strike launched one day after Oman announced a diplomatic breakthrough.
              Strait of Hormuz closed. Oil at $142/bbl. Nuclear constraint cascade forming.
            </p>

            {/* Actor strip */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {[
                { label: 'USA', color: '#4a90d9' },
                { label: 'IRN', color: '#c0392b' },
                { label: 'ISR', color: '#ffba20' },
                { label: 'SAU', color: '#5EBD8E' },
                { label: 'CHN', color: '#4A90B8' },
                { label: 'RUS', color: '#9B59B6' },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className="font-mono text-2xs px-2 py-0.5 border"
                  style={{ color, borderColor: `${color}40`, background: `${color}12` }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="primary"
                onClick={() => router.push(`/scenarios/${params.id}/play/trunk`)}
                className="text-[11px] py-1.5"
              >
                Observe — AI vs AI
              </Button>
              <Button variant="ghost" className="text-[11px] py-1.5 opacity-50 cursor-not-allowed" disabled title="Coming soon">
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
                {MOCK_ACTORS.map((actor) => (
                  <ActorCard
                    key={actor.id}
                    actor={actor}
                    onViewDossier={() => openDossier(actor.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="timeline"
                variants={shouldSkip ? tabFadeVariantsSkip : tabFadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <ChronicleTimeline entries={TIMELINE_ENTRIES} />
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
