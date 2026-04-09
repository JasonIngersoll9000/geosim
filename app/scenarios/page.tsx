'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
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

interface ScenarioDisplay extends ScenarioSummary {
  displayCategory: 'ACTIVE CONFLICTS' | 'HISTORICAL' | 'HYPOTHETICAL'
  classification: 'SECRET' | 'CONFIDENTIAL'
  status: 'ACTIVE' | 'ARCHIVED'
  actorCount: number
  lastActive: string
  turnNumber?: number
  actors?: { label: string; color: string }[]
}

const TABS = ['ALL SCENARIOS', 'ACTIVE CONFLICTS', 'HISTORICAL', 'HYPOTHETICAL'] as const
type Tab = (typeof TABS)[number]

const CATEGORY_MAP: Record<string, ScenarioDisplay['displayCategory']> = {
  military: 'ACTIVE CONFLICTS',
  economic: 'HYPOTHETICAL',
  diplomatic: 'HISTORICAL',
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageHeaderVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const cardContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

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
    <motion.button
      variants={cardVariants}
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

        <h3 className="font-label font-bold text-md text-text-primary uppercase tracking-[0.03em] mb-2 leading-[1.3]">
          {scenario.name}
        </h3>

        <p className="font-serif text-base text-text-secondary leading-[1.7] mb-4">
          {scenario.description}
        </p>

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
    </motion.button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScenarioBrowserPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<ScenarioDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('ALL SCENARIOS')
  const shouldSkip = useReducedMotion()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/scenarios')
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        const json = (await res.json()) as { data: ScenarioSummary[]; error: unknown }
        const mapped: ScenarioDisplay[] = (json.data ?? []).map((s) => ({
          ...s,
          displayCategory: CATEGORY_MAP[s.category] ?? 'HYPOTHETICAL',
          classification: 'CONFIDENTIAL' as const,
          status: 'ARCHIVED' as const,
          actorCount: 0,
          lastActive: '—',
        }))
        setScenarios(mapped)
      } catch (err) {
        console.error('[ScenarioBrowser] fetch failed:', err)
        setError('Unable to load scenarios. Check your connection and try again.')
        setScenarios([])
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

          {/* Page heading — fades in on mount */}
          <motion.div
            className="mb-8"
            variants={pageHeaderVariants}
            initial={shouldSkip ? 'visible' : 'hidden'}
            animate="visible"
          >
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em]">
              Scenario Library
            </h1>
            <p className="font-sans text-base text-text-secondary mt-2 max-w-2xl leading-[1.6]">
              Select a scenario to observe AI vs AI play or take direct control of a strategic actor.
              All scenarios are modeled with actor-neutral rigor.
            </p>
          </motion.div>

          {!loading && error !== null && (
            <div className="mb-4 px-4 py-3 border border-[#3a1a1a] bg-[rgba(185,28,28,0.06)] font-mono text-[10px] uppercase tracking-[0.08em] text-[#b91c1c]">
              {error}
            </div>
          )}

          {!loading && (
            <CategoryTabStrip active={activeTab} onChange={setActiveTab} />
          )}

          {loading && (
            <div className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
              LOADING SCENARIOS...
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
              NO SCENARIOS IN THIS CATEGORY
            </div>
          )}

          {/* Scenario grid — staggered entrance */}
          {!loading && visible.length > 0 && (
            <motion.div
              key={activeTab}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={cardContainerVariants}
              initial={shouldSkip ? 'visible' : 'hidden'}
              animate="visible"
            >
              {visible.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onClick={() => router.push(`/scenarios/${scenario.id}`)}
                />
              ))}
            </motion.div>
          )}

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
