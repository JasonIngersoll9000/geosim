'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { BranchTree } from '@/components/scenario/BranchTree'
import type { BranchNode, ActorOption, TurnData } from '@/components/scenario/BranchTree'
import { DEV_TRUNK_BRANCH, DEV_ACTORS } from '@/lib/game/dev-branches'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchRecord {
  id: string
  name: string
  description: string
  forkTurn: number
  turnReached: number
  totalTurns: number
  createdAt: string
  status: 'active' | 'complete' | 'abandoned'
  escalationRung: number
  isBase?: boolean
  parentId?: string | null
}

type RawBranch = {
  id: string
  name: string
  is_trunk: boolean
  status: string
  head_commit_id: string | null
  fork_point_commit_id: string | null
  created_at: string
  parent_branch_id: string | null
  turn_commits: Array<{ id: string; turn_number: number; simulated_date: string; chronicle_headline?: string | null }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HIGH_SIG_KEYWORDS = [
  'nuclear', 'war', 'attack', 'launch', 'crisis', 'invasion', 'strike',
  'ultimatum', 'missile', 'conflict', 'catastroph', 'collapse', 'intercept',
  'bomb', 'explosion', 'shot down', 'hostage', 'assassination', 'retaliat',
]

function getSignificance(headline: string | null | undefined): TurnData['significance'] {
  if (!headline) return 'low'
  const lower = headline.toLowerCase()
  if (HIGH_SIG_KEYWORDS.some(kw => lower.includes(kw))) return 'high'
  return 'medium'
}

/** Format an ISO date string as "Apr 1 2025" */
function formatTurnDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

// ─── Build tree for BranchTree component ────────────────────────────────────

function buildBranchTree(rows: RawBranch[]): BranchNode | null {
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
    // Trunk starts at 0; child branches use fork_point_commit_id for accurate fork turn
    const forkTurn = row.is_trunk
      ? 0
      : row.fork_point_commit_id
        ? (commitTurnMap.get(row.fork_point_commit_id) ?? 1)
        : 1

    // Build per-turn event data from commits
    const turns: TurnData[] = commits
      .map(c => ({
        turn: c.turn_number,
        date: c.simulated_date ? formatTurnDate(c.simulated_date) : undefined,
        label: c.chronicle_headline ?? undefined,
        significance: getSignificance(c.chronicle_headline),
      }))
      .sort((a, b) => a.turn - b.turn)

    map.set(row.id, {
      id: row.id,
      name: row.name,
      isTrunk: row.is_trunk,
      status: row.status === 'active' ? 'active' : 'archived',
      forkTurn,
      headTurn: Math.max(maxTurn, forkTurn, 1),
      totalTurns: Math.max(commits.length, 12),
      lastPlayedAt: row.created_at,
      controlledActor: null,
      children: [],
      turnDate: latestCommit?.simulated_date,
      turns,
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

// ─── Build flat list for branch cards ────────────────────────────────────────

function buildBranchList(rows: RawBranch[]): BranchRecord[] {
  // Build a global commit-id → turn_number map for resolving fork points
  const commitTurnMap = new Map<string, number>()
  for (const row of rows) {
    for (const c of row.turn_commits ?? []) {
      if (c.id) commitTurnMap.set(c.id, c.turn_number)
    }
  }
  return rows.map(row => {
    const commits = row.turn_commits ?? []
    const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0)
    const forkTurn = row.is_trunk
      ? 0
      : row.fork_point_commit_id
        ? (commitTurnMap.get(row.fork_point_commit_id) ?? 1)
        : 1
    const status: BranchRecord['status'] =
      row.status === 'active' ? 'active' :
      row.status === 'completed' ? 'complete' : 'abandoned'
    return {
      id: row.id,
      name: row.name,
      description: row.is_trunk
        ? 'Ground truth timeline — AI-driven historical record of events as they unfolded.'
        : 'Player branch — alternate timeline diverged from the ground truth.',
      forkTurn,
      turnReached: maxTurn,
      totalTurns: Math.max(commits.length, 12),
      createdAt: row.created_at,
      status,
      escalationRung: 0,
      isBase: row.is_trunk,
      parentId: row.parent_branch_id,
    }
  })
}

// ─── Horizontal branch topology SVG ─────────────────────────────────────────

const TURN_COUNT = 12
const ROW_H     = 36
const LABEL_W   = 130
const PADDING   = { top: 10, right: 16, bottom: 8 }
const BAR_H     = 6

function BranchTopology({ branches }: { branches: BranchRecord[] }) {
  const svgW = 640
  const trackW = svgW - LABEL_W - PADDING.right
  const svgH = branches.length * ROW_H + PADDING.top + PADDING.bottom

  const turnX = (turn: number) => LABEL_W + (turn / TURN_COUNT) * trackW

  const barColor = (status: BranchRecord['status']) => {
    if (status === 'active')    return 'var(--status-stable)'
    if (status === 'complete')  return 'var(--gold)'
    return 'var(--border-hi)'
  }

  const dotColor = (status: BranchRecord['status']) => {
    if (status === 'active')    return 'var(--status-stable)'
    if (status === 'complete')  return 'var(--gold)'
    return 'var(--border-subtle)'
  }

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height={svgH}
      aria-label="Branch topology tree"
    >
      {Array.from({ length: TURN_COUNT + 1 }, (_, i) => (
        <g key={i}>
          <line
            x1={turnX(i)} y1={PADDING.top}
            x2={turnX(i)} y2={svgH - PADDING.bottom}
            stroke="var(--border-subtle)"
            strokeWidth={0.5}
            strokeDasharray={i % 2 === 0 ? undefined : '2,2'}
          />
          {i > 0 && (
            <text x={turnX(i)} y={svgH} fontFamily="var(--font-mono)" fontSize={7}
              fill="var(--text-tertiary)" textAnchor="middle">
              T{i}
            </text>
          )}
        </g>
      ))}

      {branches.map((branch, rowIndex) => {
        const y    = PADDING.top + rowIndex * ROW_H + ROW_H / 2
        const x0   = turnX(branch.forkTurn)
        const x1   = turnX(branch.turnReached)

        return (
          <g key={branch.id}>
            {!branch.isBase && (
              <line
                x1={x0} y1={PADDING.top + ROW_H / 2}
                x2={x0} y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={0.5}
              />
            )}

            <text
              x={LABEL_W - 6}
              y={y + 4}
              fontFamily="var(--font-mono)"
              fontSize={8.5}
              fill={branch.isBase ? 'var(--gold)' : 'var(--text-secondary)'}
              textAnchor="end"
              letterSpacing={0.5}
            >
              {branch.name.slice(0, 16)}
            </text>

            <rect
              x={LABEL_W}
              y={y - BAR_H / 2}
              width={trackW - PADDING.right}
              height={BAR_H}
              fill="var(--bg-surface-high)"
            />

            <rect
              x={x0}
              y={y - BAR_H / 2}
              width={Math.max(0, x1 - x0)}
              height={BAR_H}
              fill={barColor(branch.status)}
              opacity={branch.status === 'abandoned' ? 0.4 : 0.85}
            />

            <circle
              cx={x0}
              cy={y}
              r={4}
              fill="var(--bg-base)"
              stroke={branch.isBase ? 'var(--gold)' : dotColor(branch.status)}
              strokeWidth={branch.isBase ? 2 : 1.5}
            />

            {branch.turnReached > branch.forkTurn && (
              <circle
                cx={x1}
                cy={y}
                r={3}
                fill={dotColor(branch.status)}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Fork turn selector ───────────────────────────────────────────────────────

function ForkSelector({ scenarioId, availableTurns }: { scenarioId: string; availableTurns: number[] }) {
  const router = useRouter()
  const turns = availableTurns.length > 0 ? availableTurns : [1, 2, 3, 4]
  const [selectedTurn, setSelectedTurn] = useState<number>(turns[turns.length - 1] ?? 1)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFork() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, name: `Branch from T${selectedTurn}`, forkTurn: selectedTurn }),
      })
      if (res.ok) {
        const json = await res.json() as { id?: string }
        if (json.id) {
          router.push(`/scenarios/${scenarioId}/play/${json.id}`)
          return
        }
      }
      setError('Failed to create branch — try again.')
    } catch {
      setError('Failed to create branch — try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="border border-border-subtle bg-bg-surface-dim p-4">
      <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-3">
        FORK NEW BRANCH FROM TURN
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {turns.map(turn => (
          <button
            key={turn}
            onClick={() => setSelectedTurn(turn)}
            className={`font-mono text-2xs px-3 py-1 border transition-colors ${
              selectedTurn === turn
                ? 'border-gold text-gold bg-gold-dim'
                : 'border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-hi'
            }`}
          >
            T{turn}
          </button>
        ))}
      </div>
      {error && (
        <p className="font-mono text-2xs text-status-critical mb-2">{error}</p>
      )}
      <button
        onClick={() => void handleFork()}
        disabled={creating}
        className="inline-block font-mono text-2xs uppercase tracking-[0.08em] px-4 py-2 text-bg-base transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--gold)' }}
      >
        {creating ? 'CREATING…' : `+ FORK FROM TURN ${selectedTurn}`}
      </button>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BranchRecord['status'], { label: string; cls: string }> = {
  active:    { label: 'ACTIVE',    cls: 'text-status-stable bg-status-info-bg border-status-info-border'  },
  complete:  { label: 'COMPLETE',  cls: 'text-gold bg-gold-dim border-gold-border'                        },
  abandoned: { label: 'ABANDONED', cls: 'text-text-tertiary bg-bg-surface-high border-border-subtle'      },
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

// ─── Branch card ──────────────────────────────────────────────────────────────

function BranchCard({ branch, scenarioId }: { branch: BranchRecord; scenarioId: string }) {
  const { label: statusLabel, cls: statusCls } = STATUS_STYLES[branch.status]
  const total = branch.totalTurns > 0 ? branch.totalTurns : 12
  const progress = branch.turnReached > 0 ? Math.round((branch.turnReached / total) * 100) : 0
  const isActive = branch.status === 'active'

  return (
    <div
      className={`border border-border-subtle bg-bg-surface transition-colors hover:bg-bg-surface-high border-l-2 ${
        isActive ? 'border-l-gold' : 'border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.06em]">
              {branch.isBase ? '● BASE' : `⎇ BRANCH`}
            </span>
            <span className={`font-mono text-2xs uppercase tracking-[0.06em] px-2 py-0.5 border ${statusCls}`}>
              {statusLabel}
            </span>
          </div>
          <h3 className="font-label font-semibold text-sm text-text-primary uppercase tracking-[0.04em]">
            {branch.name}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-2xs text-gold">
            T{String(branch.turnReached).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="font-sans text-2xs text-text-secondary leading-[1.6]">{branch.description}</p>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border-subtle overflow-hidden relative" style={{ height: '3px' }}>
            <div
              className={`h-full absolute left-0 top-0 transition-[width] duration-300 ${
                branch.status === 'complete' ? 'bg-gold' :
                branch.status === 'abandoned' ? 'bg-border-hi' :
                'bg-status-stable'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-2xs text-text-tertiary">{progress}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
        <span className="font-mono text-2xs text-text-tertiary">{formatDate(branch.createdAt)}</span>
        <div className="flex items-center gap-3">
          {branch.status !== 'abandoned' && (
            <Link
              href={`/chronicle/${branch.id}`}
              className="font-mono text-2xs uppercase tracking-[0.06em] text-text-secondary hover:text-text-primary transition-colors"
            >
              CHRONICLE →
            </Link>
          )}
          {isActive && (
            <Link
              href={`/scenarios/${scenarioId}/play/${branch.id}`}
              className="font-mono text-2xs uppercase tracking-[0.06em] px-3 py-1 text-bg-base transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)' }}
            >
              RESUME →
            </Link>
          )}
          {branch.status === 'complete' && (
            <span className="font-mono text-2xs uppercase tracking-[0.06em] text-text-tertiary">
              CONCLUDED
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Pre-compute dev-mode initial state so the page renders immediately without
// waiting for async fetches (NEXT_PUBLIC_* vars are inlined at build time).
const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
const devRawBranches: RawBranch[] = isDevMode ? [DEV_TRUNK_BRANCH as RawBranch] : []
const devInitialBranches = isDevMode ? buildBranchList(devRawBranches) : []
const devInitialRoot     = isDevMode ? buildBranchTree(devRawBranches) : null
const devInitialActors: ActorOption[] = isDevMode
  ? DEV_ACTORS.map(a => ({ id: a.id, name: a.name, flag: (a.short_name ?? a.name.slice(0, 3)).toUpperCase() }))
  : []
const devInitialTurns    = isDevMode ? DEV_TRUNK_BRANCH.turn_commits.map(c => c.turn_number) : []

export default function BranchesPage({ params }: { params: { id: string } }) {
  const [branches, setBranches] = useState<BranchRecord[]>(devInitialBranches)
  const [branchRoot, setBranchRoot] = useState<BranchNode | null>(devInitialRoot)
  const [actorOptions, setActorOptions] = useState<ActorOption[]>(devInitialActors)
  const [scenarioName, setScenarioName] = useState('US-ISRAEL-IRAN CONFLICT 2025-2026')
  const [loading, setLoading] = useState(!isDevMode)
  const [availableTurns, setAvailableTurns] = useState<number[]>(devInitialTurns)

  useEffect(() => {
    // Dev mode: state already pre-populated synchronously — skip all async fetches.
    if (isDevMode) return

    void (async () => {
      try {
        const branchApiRes = await fetch(`/api/branches?scenarioId=${encodeURIComponent(params.id)}`)

        if (branchApiRes.ok) {
          const json = await branchApiRes.json() as {
            branches: RawBranch[];
            actors: Array<{ id: string; name: string; short_name: string | null }>;
          }

          if (json.branches && json.branches.length > 0) {
            const list = buildBranchList(json.branches)
            setBranches(list)

            const tree = buildBranchTree(json.branches)
            if (tree) setBranchRoot(tree)

            const trunk = json.branches.find(r => r.is_trunk)
            if (trunk) {
              const turns = (trunk.turn_commits ?? []).map(c => c.turn_number).sort((a, b) => a - b)
              setAvailableTurns(turns)
            }
          }

          if (json.actors && json.actors.length > 0) {
            setActorOptions(json.actors.map(a => ({
              id: a.id,
              name: a.name,
              flag: (a.short_name ?? a.name.slice(0, 3)).toUpperCase(),
            })))
          }
        }

        const [scenarioRes, scenarioListRes] = await Promise.all([
          fetch(`/api/scenarios/${params.id}`).catch(() => null),
          fetch(`/api/scenarios?limit=1`),
        ])
        if (scenarioRes?.ok) {
          const sJson = await scenarioRes.json() as { data?: { name?: string } }
          if (sJson.data?.name) setScenarioName(sJson.data.name.toUpperCase())
        } else if (scenarioListRes.ok) {
          const sJson = await scenarioListRes.json() as { data?: Array<{ id: string; name: string }> }
          const match = (sJson.data ?? []).find(s => s.id === params.id)
          if (match?.name) setScenarioName(match.name.toUpperCase())
        }
      } catch (err) {
        console.error('[BranchesPage] fetch error:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id])

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName={scenarioName} />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="border-b border-border-subtle mb-6">
            <DocumentIdHeader
              text="TIMELINE DIVERGENCE MAP // SCENARIO: IRAN-2026"
            />
          </div>

          <div className="mb-8">
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-1">
              Branch Index
            </h1>
            <p className="font-sans text-sm text-text-secondary leading-[1.6]">
              Every alternate timeline forked from this scenario. Resume any active branch or review completed chronicle records.
            </p>
          </div>

          {loading ? (
            <div className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.04em] py-8 text-center">
              LOADING BRANCHES…
            </div>
          ) : (
            <>
              {/* Branch topology tree */}
              {branchRoot ? (
                <div className="mb-8">
                  <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-2">
                    BRANCH TOPOLOGY — CLICK NODE TO ENTER
                  </div>
                  <BranchTree root={branchRoot} scenarioId={params.id} actors={actorOptions} />
                </div>
              ) : branches.length > 0 ? (
                <div className="mb-8 border border-border-subtle bg-bg-surface-dim px-6 pt-4 pb-6 overflow-x-auto">
                  <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-4">
                    BRANCH TOPOLOGY — TURN PROGRESSION
                  </div>
                  <BranchTopology branches={branches} />
                </div>
              ) : null}

              <div className="flex items-center gap-6 mb-6 font-mono text-2xs text-text-tertiary">
                <span>{branches.length} TOTAL</span>
                <span>{branches.filter(b => b.status === 'active').length} ACTIVE</span>
                <span>{branches.filter(b => b.status === 'complete').length} COMPLETE</span>
                <span>{branches.filter(b => b.status === 'abandoned').length} ABANDONED</span>
              </div>

              <div className="mb-8">
                <ForkSelector scenarioId={params.id} availableTurns={availableTurns} />
              </div>

              <div className="flex flex-col gap-3">
                {branches.map(branch => (
                  <BranchCard key={branch.id} branch={branch} scenarioId={params.id} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
