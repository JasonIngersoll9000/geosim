'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'

// ─── Types & mock data ────────────────────────────────────────────────────────

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

const MOCK_SCENARIO = {
  code: 'GEOSIM-IRN-2026',
  name: 'US-ISRAEL-IRAN CONFLICT 2025-2026',
}

const MOCK_BRANCHES: BranchRecord[] = [
  {
    id: 'trunk',
    name: 'TRUNK',
    description: 'Base timeline — Operation Epic Fury initiates. Full air campaign, Hormuz closure, Hezbollah activation.',
    forkTurn: 0,
    turnReached: 4,
    totalTurns: 12,
    createdAt: '2026-03-04T08:00:00Z',
    status: 'active',
    escalationRung: 6,
    isBase: true,
    parentId: null,
  },
  {
    id: 'ceasefire-t3',
    name: 'CEASEFIRE-T3',
    description: 'Branch from Turn 3 — US accepts Oman framework. Hormuz reopens. Air campaign suspended.',
    forkTurn: 3,
    turnReached: 6,
    totalTurns: 12,
    createdAt: '2026-03-14T14:23:00Z',
    status: 'active',
    escalationRung: 3,
    parentId: 'trunk',
  },
  {
    id: 'ground-op-t4',
    name: 'GROUND-OP-T4',
    description: 'Branch from Turn 4 — Israel launches northern ground offensive. US deploys ground advisors.',
    forkTurn: 4,
    turnReached: 5,
    totalTurns: 12,
    createdAt: '2026-03-22T09:41:00Z',
    status: 'active',
    escalationRung: 8,
    parentId: 'trunk',
  },
  {
    id: 'iea-release-t2',
    name: 'IEA-RELEASE-T2',
    description: 'Branch from Turn 2 — Coordinated IEA reserve release caps oil at $115/bbl.',
    forkTurn: 2,
    turnReached: 12,
    totalTurns: 12,
    createdAt: '2026-03-08T11:52:00Z',
    status: 'complete',
    escalationRung: 5,
    parentId: 'trunk',
  },
  {
    id: 'diplomacy-only',
    name: 'DIPLOMACY-ONLY',
    description: 'Branch from Turn 1 — No air campaign. Full diplomatic track via UN, Oman, EU. Abandoned.',
    forkTurn: 1,
    turnReached: 3,
    totalTurns: 12,
    createdAt: '2026-03-04T20:15:00Z',
    status: 'abandoned',
    escalationRung: 1,
    parentId: 'trunk',
  },
]

// ─── Horizontal branch tree SVG ───────────────────────────────────────────────

const TURN_COUNT = 12
const ROW_H     = 36
const LABEL_W   = 130
const PADDING   = { top: 10, right: 16, bottom: 8 }
const BAR_H     = 6

function BranchTree({ branches }: { branches: BranchRecord[] }) {
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
      {/* Turn grid lines */}
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

      {/* Branch rows */}
      {branches.map((branch, rowIndex) => {
        const y    = PADDING.top + rowIndex * ROW_H + ROW_H / 2
        const x0   = turnX(branch.forkTurn)
        const x1   = turnX(branch.turnReached)

        return (
          <g key={branch.id}>
            {/* Vertical connector from trunk row to this branch */}
            {!branch.isBase && (
              <line
                x1={x0} y1={PADDING.top + ROW_H / 2}
                x2={x0} y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={0.5}
              />
            )}

            {/* Branch label */}
            <text
              x={LABEL_W - 6}
              y={y + 4}
              fontFamily="var(--font-mono)"
              fontSize={8.5}
              fill={branch.isBase ? 'var(--gold)' : 'var(--text-secondary)'}
              textAnchor="end"
              letterSpacing={0.5}
            >
              {branch.name}
            </text>

            {/* Background track */}
            <rect
              x={LABEL_W}
              y={y - BAR_H / 2}
              width={trackW - PADDING.right}
              height={BAR_H}
              fill="var(--bg-surface-high)"
            />

            {/* Progress bar */}
            <rect
              x={x0}
              y={y - BAR_H / 2}
              width={Math.max(0, x1 - x0)}
              height={BAR_H}
              fill={barColor(branch.status)}
              opacity={branch.status === 'abandoned' ? 0.4 : 0.85}
            />

            {/* Start dot */}
            <circle
              cx={x0}
              cy={y}
              r={4}
              fill="var(--bg-base)"
              stroke={branch.isBase ? 'var(--gold)' : dotColor(branch.status)}
              strokeWidth={branch.isBase ? 2 : 1.5}
            />

            {/* End dot */}
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

function ForkSelector({ scenarioId }: { scenarioId: string }) {
  const [selectedTurn, setSelectedTurn] = useState<number>(4)

  return (
    <div className="border border-border-subtle bg-bg-surface-dim p-4">
      <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-3">
        FORK NEW BRANCH FROM TURN
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {Array.from({ length: 4 }, (_, i) => i + 1).map(turn => (
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
      <Link
        href={`/scenarios/${scenarioId}`}
        className="inline-block font-mono text-2xs uppercase tracking-[0.08em] px-4 py-2 text-bg-base transition-opacity hover:opacity-80"
        style={{ background: 'var(--gold)' }}
      >
        + FORK FROM TURN {selectedTurn}
      </Link>
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
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Branch card ──────────────────────────────────────────────────────────────

function BranchCard({ branch, scenarioId }: { branch: BranchRecord; scenarioId: string }) {
  const { label: statusLabel, cls: statusCls } = STATUS_STYLES[branch.status]
  const progress = Math.round((branch.turnReached / branch.totalTurns) * 100)
  const isActive = branch.status === 'active'

  return (
    <div
      className={`border border-border-subtle bg-bg-surface transition-colors hover:bg-bg-surface-high border-l-2 ${
        isActive ? 'border-l-gold' : 'border-l-transparent'
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.06em]">
              {branch.isBase ? '● BASE' : `⎇ FORK T${branch.forkTurn}`}
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
          <div className="font-mono text-2xs text-text-tertiary">RUNG {branch.escalationRung}</div>
          <div className="font-mono text-2xs text-gold">
            T{String(branch.turnReached).padStart(2, '0')}/{String(branch.totalTurns).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="font-sans text-2xs text-text-secondary leading-[1.6]">{branch.description}</p>
      </div>

      {/* Progress bar */}
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

      {/* Footer */}
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

export default function BranchesPage({ params }: { params: { id: string } }) {
  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName={MOCK_SCENARIO.name} />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="border-b border-border-subtle mb-6">
            <DocumentIdHeader
              text="TIMELINE DIVERGENCE MAP // SCENARIO: IRAN-2026"
            />
          </div>

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-1">
              Branch Index
            </h1>
            <p className="font-sans text-sm text-text-secondary leading-[1.6]">
              Every alternate timeline forked from this scenario. Resume any active branch or review completed chronicle records.
            </p>
          </div>

          {/* Horizontal branch topology tree */}
          <div className="mb-8 border border-border-subtle bg-bg-surface-dim px-6 pt-4 pb-6 overflow-x-auto">
            <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-4">
              BRANCH TOPOLOGY — TURN PROGRESSION
            </div>
            <BranchTree branches={MOCK_BRANCHES} />
          </div>

          {/* Summary counts */}
          <div className="flex items-center gap-6 mb-6 font-mono text-2xs text-text-tertiary">
            <span>{MOCK_BRANCHES.length} TOTAL</span>
            <span>{MOCK_BRANCHES.filter(b => b.status === 'active').length} ACTIVE</span>
            <span>{MOCK_BRANCHES.filter(b => b.status === 'complete').length} COMPLETE</span>
            <span>{MOCK_BRANCHES.filter(b => b.status === 'abandoned').length} ABANDONED</span>
          </div>

          {/* Fork from turn selector */}
          <div className="mb-8">
            <ForkSelector scenarioId={params.id} />
          </div>

          {/* Branch cards */}
          <div className="flex flex-col gap-3">
            {MOCK_BRANCHES.map(branch => (
              <BranchCard key={branch.id} branch={branch} scenarioId={params.id} />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
