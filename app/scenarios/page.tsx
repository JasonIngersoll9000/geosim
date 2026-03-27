'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'

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

// ─── Category filter tabs ─────────────────────────────────────────────────────

const ALL_CATEGORIES = 'ALL'

function CategoryTabStrip({
  categories,
  active,
  onChange,
}: {
  categories: string[]
  active: string
  onChange: (cat: string) => void
}) {
  const tabs = [ALL_CATEGORIES, ...categories]
  return (
    <div
      className="flex gap-1 flex-wrap mb-6"
      role="tablist"
      aria-label="Filter by category"
    >
      {tabs.map((cat) => {
        const isActive = active === cat
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat)}
            className={`font-label text-[11px] font-semibold uppercase tracking-[0.06em] px-3 py-[5px] transition-all border ${
              isActive
                ? 'text-gold bg-gold-glow border-gold shadow-[0_0_0_1px_var(--gold)]'
                : 'text-text-tertiary bg-transparent border-transparent'
            }`}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}

// ─── Star rating display ──────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) {
    return (
      <span className="font-mono text-[10px] text-text-tertiary">
        UNRATED
      </span>
    )
  }
  const full = Math.floor(rating)
  const empty = 5 - full
  return (
    <span
      className="font-mono text-[11px] tracking-[0.04em] text-gold"
      aria-label={`Rating: ${rating} out of 5`}
    >
      {'★'.repeat(full)}
      <span className="text-[var(--border-hi)]">{'★'.repeat(empty)}</span>
    </span>
  )
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className="font-mono text-[9px] px-[7px] py-[2px] uppercase tracking-[0.04em] border text-status-info bg-status-info-bg border-status-info"
    >
      {category}
    </span>
  )
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  onClick,
}: {
  scenario: ScenarioSummary
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 transition-colors bg-bg-surface border border-border-subtle hover:bg-bg-surface-high"
    >
      {/* Top row: category badge + rating */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <CategoryBadge category={scenario.category} />
        <StarRating rating={scenario.rating} />
      </div>

      {/* Name */}
      <h3
        className="font-label text-[14px] font-bold uppercase tracking-[0.04em] mb-2 leading-[1.3] text-text-primary"
      >
        {scenario.name}
      </h3>

      {/* Description */}
      <p
        className="font-sans text-[12px] leading-[1.6] mb-4 text-text-secondary"
      >
        {scenario.description}
      </p>

      {/* Footer stats */}
      <div className="flex gap-5 pt-3 border-t border-border-subtle">
        <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-text-tertiary">
          <span className="text-text-secondary">
            {scenario.branch_count}
          </span>{' '}
          BRANCHES
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-text-tertiary">
          <span className="text-text-secondary">
            {scenario.play_count.toLocaleString()}
          </span>{' '}
          PLAYS
        </span>
      </div>
    </button>
  )
}

// ─── Mock data (dev bypass) ───────────────────────────────────────────────────

const MOCK_SCENARIOS: ScenarioSummary[] = [
  {
    id: 'iran-conflict-2025',
    name: 'US–Israel–Iran Conflict 2025–2026',
    description:
      'Phase 3: Operation Epic Fury — Day 19. Joint US-Israeli decapitation strike launched one day after Oman announced a diplomatic breakthrough. Strait of Hormuz closed. Oil at $142/bbl.',
    category: 'military',
    branch_count: 14,
    play_count: 3821,
    rating: 4,
  },
  {
    id: 'taiwan-strait-2026',
    name: 'Taiwan Strait Crisis 2026',
    description:
      'PLA initiates quarantine operations around Taiwan following independence referendum. US carrier groups deploy. Economic decoupling accelerates across Pacific.',
    category: 'military',
    branch_count: 9,
    play_count: 2104,
    rating: 5,
  },
  {
    id: 'nato-eastern-flank',
    name: 'NATO Eastern Flank — Baltic Escalation',
    description:
      'Article 5 invoked following incursion into Estonian territory. Rapid reinforcement race underway. Nuclear signaling from Moscow escalating.',
    category: 'military',
    branch_count: 6,
    play_count: 1587,
    rating: 4,
  },
  {
    id: 'dollar-petrodollar-collapse',
    name: 'Petrodollar Collapse Scenario',
    description:
      'Saudi Arabia finalizes oil trade in yuan and rupees. Dollar reserve status deteriorating. US fiscal options narrowing. BRICS payment rails go live.',
    category: 'economic',
    branch_count: 5,
    play_count: 983,
    rating: 3,
  },
  {
    id: 'un-reform-2027',
    name: 'UN Security Council Reform Crisis',
    description:
      'G4 nations push binding resolution to add permanent seats. Russia and China veto repeatedly. Coalition threatens parallel institution.',
    category: 'diplomatic',
    branch_count: 4,
    play_count: 612,
    rating: null,
  },
  {
    id: 'south-china-sea-2025',
    name: 'South China Sea — ASEAN Flashpoint',
    description:
      'Philippine Coast Guard vessel sunk in contested waters. ASEAN unity fracturing. US mutual defense treaty obligations triggered. QUAD emergency session convened.',
    category: 'military',
    branch_count: 7,
    play_count: 1342,
    rating: 4,
  },
]

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ScenarioBrowserPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/scenarios')
        if (!res.ok) throw new Error('fetch failed')
        const json = (await res.json()) as { data: ScenarioSummary[]; error: unknown }
        if (json.data && json.data.length > 0) {
          setScenarios(json.data)
        } else {
          setScenarios(MOCK_SCENARIOS)
        }
      } catch {
        setScenarios(MOCK_SCENARIOS)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const categories = Array.from(new Set(scenarios.map((s) => s.category))).sort()

  const visible =
    activeCategory === ALL_CATEGORIES
      ? scenarios
      : scenarios.filter((s) => s.category === activeCategory)

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // GEOSIM-BROWSER" />
      <TopBar scenarioName="SCENARIO BROWSER" />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-5xl mx-auto px-5 py-8">
          {/* Page header */}
          <div className="mb-8 pb-5 border-b border-border-subtle">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] mb-2 text-text-tertiary">
              GEOSIM // STRATEGIC SIMULATION ENGINE
            </p>
            <h1 className="font-label text-[26px] font-bold uppercase tracking-[0.04em] text-text-primary">
              Scenario Library
            </h1>
            <p className="font-sans text-[13px] mt-2 max-w-2xl leading-[1.6] text-text-secondary">
              Select a scenario to observe AI vs AI play or take direct control
              of a strategic actor. All scenarios are modeled with actor-neutral
              rigor.
            </p>
          </div>

          {/* Category filter */}
          {!loading && categories.length > 0 && (
            <CategoryTabStrip
              categories={categories}
              active={activeCategory}
              onChange={setActiveCategory}
            />
          )}

          {/* Loading state */}
          {loading && (
            <div className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
              LOADING SCENARIOS...
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
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
              {visible.length} SCENARIO{visible.length !== 1 ? 'S' : ''}{' '}
              {activeCategory !== ALL_CATEGORIES ? `IN ${activeCategory.toUpperCase()}` : 'TOTAL'}
            </p>
          )}
        </div>
      </main>
    </>
  )
}
