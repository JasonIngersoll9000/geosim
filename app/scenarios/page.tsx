'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { Badge } from '@/components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioSummary {
  id: string
  name: string
  description: string
  category: string
  branch_count: number
  play_count: number
  rating: number | null
}

// Extended mock data with display fields
interface ScenarioDisplay extends ScenarioSummary {
  displayCategory: 'ACTIVE CONFLICTS' | 'HISTORICAL' | 'HYPOTHETICAL'
  classification: 'SECRET' | 'CONFIDENTIAL'
  status: 'ACTIVE' | 'ARCHIVED'
  actorCount: number
  lastActive: string
  turnNumber?: number
  actors?: { label: string; color: string }[]
}

// ─── Fixed category tabs ──────────────────────────────────────────────────────

const TABS = ['ALL SCENARIOS', 'ACTIVE CONFLICTS', 'HISTORICAL', 'HYPOTHETICAL'] as const
type Tab = (typeof TABS)[number]

const CATEGORY_MAP: Record<string, ScenarioDisplay['displayCategory']> = {
  military: 'ACTIVE CONFLICTS',
  economic: 'HYPOTHETICAL',
  diplomatic: 'HISTORICAL',
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SCENARIOS: ScenarioDisplay[] = [
  {
    id: 'iran-conflict-2025',
    name: 'US–Israel–Iran Conflict 2025–2026',
    description:
      'Phase 3: Operation Epic Fury — Day 19. Joint US-Israeli decapitation strike launched one day after Oman announced a diplomatic breakthrough. Strait of Hormuz closed. Oil at $142/bbl.',
    category: 'military',
    displayCategory: 'ACTIVE CONFLICTS',
    classification: 'SECRET',
    status: 'ACTIVE',
    branch_count: 14,
    play_count: 3821,
    rating: 4,
    actorCount: 5,
    lastActive: '22 MAR 2026',
    turnNumber: 3,
    actors: [
      { label: 'USA', color: '#4a90d9' },
      { label: 'IRN', color: '#c0392b' },
      { label: 'ISR', color: '#ffba20' },
      { label: 'SAU', color: '#5EBD8E' },
      { label: 'CHN', color: '#4A90B8' },
    ],
  },
  {
    id: 'taiwan-strait-2026',
    name: 'Taiwan Strait Crisis 2026',
    description:
      'PLA initiates quarantine operations around Taiwan following independence referendum. US carrier groups deploy. Economic decoupling accelerates across Pacific.',
    category: 'military',
    displayCategory: 'ACTIVE CONFLICTS',
    classification: 'SECRET',
    status: 'ACTIVE',
    branch_count: 9,
    play_count: 2104,
    rating: 5,
    actorCount: 4,
    lastActive: '15 MAR 2026',
  },
  {
    id: 'nato-eastern-flank',
    name: 'NATO Eastern Flank — Baltic Escalation',
    description:
      'Article 5 invoked following incursion into Estonian territory. Rapid reinforcement race underway. Nuclear signaling from Moscow escalating.',
    category: 'military',
    displayCategory: 'ACTIVE CONFLICTS',
    classification: 'CONFIDENTIAL',
    status: 'ARCHIVED',
    branch_count: 6,
    play_count: 1587,
    rating: 4,
    actorCount: 6,
    lastActive: '01 FEB 2026',
  },
  {
    id: 'dollar-petrodollar-collapse',
    name: 'Petrodollar Collapse Scenario',
    description:
      'Saudi Arabia finalizes oil trade in yuan and rupees. Dollar reserve status deteriorating. US fiscal options narrowing. BRICS payment rails go live.',
    category: 'economic',
    displayCategory: 'HYPOTHETICAL',
    classification: 'CONFIDENTIAL',
    status: 'ARCHIVED',
    branch_count: 5,
    play_count: 983,
    rating: 3,
    actorCount: 7,
    lastActive: '10 JAN 2026',
  },
  {
    id: 'un-reform-2027',
    name: 'UN Security Council Reform Crisis',
    description:
      'G4 nations push binding resolution to add permanent seats. Russia and China veto repeatedly. Coalition threatens parallel institution.',
    category: 'diplomatic',
    displayCategory: 'HISTORICAL',
    classification: 'CONFIDENTIAL',
    status: 'ARCHIVED',
    branch_count: 4,
    play_count: 612,
    rating: null,
    actorCount: 8,
    lastActive: '05 DEC 2025',
  },
  {
    id: 'south-china-sea-2025',
    name: 'South China Sea — ASEAN Flashpoint',
    description:
      'Philippine Coast Guard vessel sunk in contested waters. ASEAN unity fracturing. US mutual defense treaty obligations triggered. QUAD emergency session convened.',
    category: 'military',
    displayCategory: 'ACTIVE CONFLICTS',
    classification: 'SECRET',
    status: 'ARCHIVED',
    branch_count: 7,
    play_count: 1342,
    rating: 4,
    actorCount: 5,
    lastActive: '18 FEB 2026',
  },
]

// ─── Category tab strip ───────────────────────────────────────────────────────

function CategoryTabStrip({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex border-b border-[#1a1a1a] mb-8" role="tablist" aria-label="Filter by category">
      {TABS.map((tab) => {
        const isActive = active === tab
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={`font-label font-semibold text-[11px] uppercase tracking-[0.06em] px-4 py-3 -mb-px border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'text-gold border-gold'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, onClick }: { scenario: ScenarioDisplay; onClick: () => void }) {
  const isActive = scenario.status === 'ACTIVE'
  const leftBorderColor = isActive ? '#b91c1c' : '#2a2a2a'

  return (
    <button
      onClick={onClick}
      className="w-full text-left group transition-colors"
      style={{
        background: '#0d0d0d',
        border: '1px solid #1a1a1a',
        borderLeft: `3px solid ${leftBorderColor}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.background = '#111'
        el.style.borderColor = '#3a3a3a'
        el.style.borderLeftColor = leftBorderColor
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = '#0d0d0d'
        el.style.borderColor = '#1a1a1a'
        el.style.borderLeftColor = leftBorderColor
      }}
    >
      <div className="p-5">
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={scenario.classification === 'SECRET' ? 'critical' : 'info'}>
              {scenario.classification}
            </Badge>
            {scenario.turnNumber && (
              <span className="font-mono text-2xs text-text-tertiary tracking-[0.04em]">
                TURN {String(scenario.turnNumber).padStart(2, '0')}{' // '}{scenario.status}
              </span>
            )}
          </div>
          <span
            className="font-mono text-2xs px-2 py-0.5 border shrink-0"
            style={
              isActive
                ? { color: '#b91c1c', background: 'rgba(185,28,28,0.1)', borderColor: 'rgba(185,28,28,0.3)' }
                : { color: 'var(--text-tertiary)', background: 'var(--bg-surface-high)', borderColor: 'var(--border-subtle)' }
            }
          >
            {scenario.status}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-label font-bold text-md text-text-primary uppercase tracking-[0.03em] mb-2 leading-[1.3]">
          {scenario.name}
        </h3>

        {/* Description */}
        <p className="font-serif text-base text-text-secondary leading-[1.7] mb-4">
          {scenario.description}
        </p>

        {/* Actor strip (for prominent cards) */}
        {scenario.actors && (
          <div className="flex items-center gap-1.5 mb-4">
            {scenario.actors.map(({ label, color }) => (
              <span
                key={label}
                className="font-mono text-2xs px-2 py-0.5 border"
                style={{ color, borderColor: `${color}40`, background: `${color}12` }}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-4 pt-3 border-t border-[#1a1a1a]">
          <span className="font-mono text-2xs text-text-tertiary tracking-[0.04em] uppercase">
            <span className="text-text-secondary">{scenario.actorCount}</span> ACTORS
          </span>
          <span className="font-mono text-2xs text-text-tertiary tracking-[0.04em] uppercase">
            <span className="text-text-secondary">{scenario.branch_count}</span> BRANCHES
          </span>
          <span className="font-mono text-2xs text-text-tertiary tracking-[0.04em] uppercase ml-auto">
            {scenario.lastActive}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScenarioBrowserPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<ScenarioDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('ALL SCENARIOS')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/scenarios')
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        const json = (await res.json()) as { data: ScenarioSummary[]; error: unknown }
        if (json.data && json.data.length > 0) {
          const mapped: ScenarioDisplay[] = json.data.map((s) => ({
            ...s,
            displayCategory: CATEGORY_MAP[s.category] ?? 'HYPOTHETICAL',
            classification: 'CONFIDENTIAL' as const,
            status: 'ARCHIVED' as const,
            actorCount: 0,
            lastActive: '—',
          }))
          setScenarios(mapped)
        } else {
          setScenarios(MOCK_SCENARIOS)
        }
      } catch (err) {
        console.error('[ScenarioBrowser] fetch failed:', err)
        setError('Failed to load scenarios. Showing cached data.')
        setScenarios(MOCK_SCENARIOS)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const visible =
    activeTab === 'ALL SCENARIOS'
      ? scenarios
      : scenarios.filter((s) => s.displayCategory === activeTab)

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // GEOSIM-BROWSER" />
      <TopBar scenarioName="SCENARIO BROWSER" />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-5xl mx-auto px-5 py-8">
          <div className="border-b border-[#1a1a1a] mb-6">
            <DocumentIdHeader text="DOC-ID: GS-SCENARIOS-INDEX // CLASSIFICATION: TOP SECRET" />
          </div>

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em]">
              Scenario Library
            </h1>
            <p className="font-sans text-base text-text-secondary mt-2 max-w-2xl leading-[1.6]">
              Select a scenario to observe AI vs AI play or take direct control of a strategic actor.
              All scenarios are modeled with actor-neutral rigor.
            </p>
          </div>

          {/* Category filter */}
          {!loading && (
            <CategoryTabStrip active={activeTab} onChange={setActiveTab} />
          )}

          {/* Loading state */}
          {loading && (
            <div className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
              LOADING SCENARIOS...
            </div>
          )}

          {/* Error state */}
          {!loading && error !== null && (
            <div className="mb-4 px-4 py-3 border border-[#3a1a1a] bg-[rgba(185,28,28,0.06)] font-mono text-[10px] uppercase tracking-[0.08em] text-[#b91c1c]">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && visible.length === 0 && (
            <div className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
              NO SCENARIOS IN THIS CATEGORY
            </div>
          )}

          {/* Scenario grid */}
          {!loading && visible.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onClick={() => router.push(`/scenarios/${scenario.id}`)}
                />
              ))}
            </div>
          )}

          {/* Footer count */}
          {!loading && (
            <p className="mt-8 font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary">
              {visible.length} SCENARIO{visible.length !== 1 ? 'S' : ''}{' '}
              {activeTab !== 'ALL SCENARIOS' ? `— ${activeTab}` : '— ALL CATEGORIES'}
            </p>
          )}
        </div>
      </main>
    </>
  )
}
