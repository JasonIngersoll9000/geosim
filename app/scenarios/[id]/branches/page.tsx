'use client'

import Link from 'next/link'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'

// ─── Mock data ────────────────────────────────────────────────────────────────

interface BranchRecord {
  id: string
  name: string
  description: string
  turnReached: number
  totalTurns: number
  createdAt: string
  status: 'active' | 'complete' | 'abandoned'
  escalationRung: number
  isBase?: boolean
  parentId?: string | null
}

const MOCK_SCENARIO = {
  id: 'irn-2026',
  code: 'GEOSIM-IRN-2026',
  name: 'US-ISRAEL-IRAN CONFLICT 2025-2026',
}

const MOCK_BRANCHES: BranchRecord[] = [
  {
    id: 'trunk',
    name: 'TRUNK',
    description: 'Base timeline — Operation Epic Fury initiates. Full air campaign, Hormuz closure, Hezbollah activation.',
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
    description: 'Branch from Turn 3 — US accepts Oman framework. Hormuz reopens. Air campaign suspended for 30 days.',
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
    description: 'Branch from Turn 4 — Israel launches northern ground offensive into Lebanon. US deploys ground advisors.',
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
    description: 'Branch from Turn 2 — Coordinated IEA reserve release caps oil at $115/bbl. Hormuz remains contested.',
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
    description: 'Branch from Turn 1 — No air campaign. Full diplomatic track via UN, Oman, EU. Abandoned — outcome indeterminate.',
    turnReached: 3,
    totalTurns: 12,
    createdAt: '2026-03-04T20:15:00Z',
    status: 'abandoned',
    escalationRung: 1,
    parentId: 'trunk',
  },
]

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BranchRecord['status'], { label: string; cls: string }> = {
  active:    { label: 'ACTIVE',    cls: 'text-status-stable bg-status-info-bg border-status-info-border'      },
  complete:  { label: 'COMPLETE',  cls: 'text-gold bg-gold-dim border-gold-border'                            },
  abandoned: { label: 'ABANDONED', cls: 'text-text-tertiary bg-bg-surface-high border-border-subtle'          },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── SVG branch tree ──────────────────────────────────────────────────────────

function BranchTree({ branches }: { branches: BranchRecord[] }) {
  const rootY = 24
  const childSpacing = 52
  const childBranches = branches.filter(b => b.parentId === 'trunk' || b.isBase)

  return (
    <div className="relative">
      <svg
        width="100%"
        height={rootY + childBranches.length * childSpacing + 8}
        className="overflow-visible"
        aria-hidden="true"
      >
        {/* Trunk vertical spine */}
        <line
          x1={20} y1={rootY}
          x2={20} y2={rootY + (childBranches.length - 1) * childSpacing}
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />

        {childBranches.map((branch, i) => {
          const y = rootY + i * childSpacing
          const isRoot = branch.isBase
          const dotColor = branch.status === 'active'
            ? 'var(--status-stable)'
            : branch.status === 'complete'
              ? 'var(--gold)'
              : 'var(--border-hi)'

          return (
            <g key={branch.id}>
              {!isRoot && (
                <>
                  {/* Elbow connector */}
                  <line x1={20} y1={y} x2={48} y2={y} stroke="var(--border-subtle)" strokeWidth={1} />
                </>
              )}
              {/* Node dot */}
              <circle
                cx={20}
                cy={y}
                r={5}
                fill="var(--bg-base)"
                stroke={isRoot ? 'var(--gold)' : dotColor}
                strokeWidth={isRoot ? 2 : 1.5}
              />
              {isRoot && (
                <text x={32} y={y + 4} fontFamily="var(--font-mono)" fontSize={9} fill="var(--gold)" letterSpacing={1}>
                  TRUNK
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Branch card ──────────────────────────────────────────────────────────────

function BranchCard({ branch, scenarioId }: { branch: BranchRecord; scenarioId: string }) {
  const { label: statusLabel, cls: statusCls } = STATUS_STYLES[branch.status]
  const progress = Math.round((branch.turnReached / branch.totalTurns) * 100)

  return (
    <div className={`border border-border-subtle bg-bg-surface transition-colors hover:bg-bg-surface-high ${branch.isBase ? 'border-l-2 border-l-gold' : ''}`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.06em]">
              {branch.isBase ? '● BASE' : '⎇ BRANCH'}
            </span>
            <span
              className={`font-mono text-2xs uppercase tracking-[0.06em] px-2 py-0.5 border ${statusCls}`}
            >
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
            TURN {String(branch.turnReached).padStart(2, '0')}/{String(branch.totalTurns).padStart(2, '0')}
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
          <div className="flex-1 h-px bg-border-subtle overflow-hidden">
            <div
              className={`h-full transition-[width] duration-300 ${branch.status === 'complete' ? 'bg-gold' : branch.status === 'abandoned' ? 'bg-border-hi' : 'bg-status-stable'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-2xs text-text-tertiary">{progress}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
        <span className="font-mono text-2xs text-text-tertiary">
          {formatDate(branch.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          {branch.status !== 'abandoned' && (
            <Link
              href={`/chronicle/${branch.id}`}
              className="font-mono text-2xs uppercase tracking-[0.06em] text-text-secondary hover:text-text-primary transition-colors"
            >
              CHRONICLE →
            </Link>
          )}
          {branch.status !== 'complete' && branch.status !== 'abandoned' && (
            <Link
              href={`/scenarios/${scenarioId}/play/${branch.id}`}
              className="font-mono text-2xs uppercase tracking-[0.06em] px-3 py-1 text-bg-base transition-colors"
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
              scenarioCode={MOCK_SCENARIO.code}
              branchName="INDEX"
              turnNumber={4}
              totalTurns={12}
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

          {/* Branch tree visualization */}
          <div className="mb-8 border border-border-subtle bg-bg-surface-dim px-6 py-4">
            <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-4">
              BRANCH TOPOLOGY
            </div>
            <BranchTree branches={MOCK_BRANCHES} />
          </div>

          {/* Branch count summary */}
          <div className="flex items-center gap-6 mb-6 font-mono text-2xs text-text-tertiary">
            <span>{MOCK_BRANCHES.length} TOTAL BRANCHES</span>
            <span>
              {MOCK_BRANCHES.filter(b => b.status === 'active').length} ACTIVE
            </span>
            <span>
              {MOCK_BRANCHES.filter(b => b.status === 'complete').length} COMPLETE
            </span>
          </div>

          {/* New branch CTA */}
          <div className="mb-8">
            <Link
              href={`/scenarios/${params.id}`}
              className="inline-block font-mono text-2xs uppercase tracking-[0.08em] px-4 py-2 text-bg-base transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)' }}
            >
              + FORK NEW BRANCH
            </Link>
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
