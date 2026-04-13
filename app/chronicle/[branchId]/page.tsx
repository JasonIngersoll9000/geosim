'use client'

import { useState, useEffect } from 'react'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'
import { GlobalTicker } from '@/components/chronicle/GlobalTicker'
import type { ChronicleEntry } from '@/lib/types/game-init'

// ─── Dimension filter tabs ────────────────────────────────────────────────────

const FILTER_TABS = ['ALL', 'MILITARY', 'DIPLOMATIC', 'ECONOMIC', 'INTELLIGENCE'] as const
type FilterTab = (typeof FILTER_TABS)[number]

const TAG_TO_FILTER: Record<string, FilterTab> = {
  Military:     'MILITARY',
  Nuclear:      'MILITARY',
  Escalation:   'MILITARY',
  Lebanon:      'MILITARY',
  Diplomatic:   'DIPLOMATIC',
  Oman:         'DIPLOMATIC',
  Economic:     'ECONOMIC',
  Gulf:         'ECONOMIC',
  Intelligence: 'INTELLIGENCE',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChroniclePage({ params }: { params: { branchId: string } }) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')
  const [entries, setEntries] = useState<ChronicleEntry[]>([])
  const [tickerItems, setTickerItems] = useState<string[]>([])
  const [scenarioName, setScenarioName] = useState('WAR CHRONICLE — US-ISRAEL-IRAN')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_RE.test(params.branchId)) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/chronicle/${params.branchId}`)
        if (!res.ok) {
          setLoading(false)
          return
        }
        const json = await res.json() as {
          commits: Array<{
            turn_number: number;
            simulated_date: string;
            chronicle_headline: string | null;
            chronicle_entry: string | null;
            narrative_entry: string | null;
          }>;
          branch: { name: string; scenarios: { name?: string } | null } | null;
          error: string | null;
        }

        if (json.branch?.scenarios?.name) {
          setScenarioName(`WAR CHRONICLE — ${json.branch.scenarios.name.toUpperCase()}`)
        }

        const rows = json.commits ?? []
        if (rows.length > 0) {
          const chronicle: ChronicleEntry[] = rows.map(c => {
            const headline = c.chronicle_headline ?? `Turn ${c.turn_number}`
            const body = c.chronicle_entry ?? c.narrative_entry ?? ''
            const severity: ChronicleEntry['severity'] = c.turn_number >= 6 ? 'critical' : 'major'
            return {
              turnNumber: c.turn_number,
              date: c.simulated_date,
              title: headline,
              narrative: body,
              severity,
              tags: [],
            }
          })
          setEntries(chronicle)

          const tickers = rows
            .filter(c => c.chronicle_headline)
            .map(c => `T${c.turn_number} — ${c.chronicle_headline}`)
          if (tickers.length > 0) setTickerItems(tickers)
        }
      } catch (err) {
        console.error('[ChroniclePage] fetch error:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [params.branchId])

  const filteredEntries = activeFilter === 'ALL'
    ? entries
    : entries.filter(entry =>
        entry.tags.some(tag => TAG_TO_FILTER[tag] === activeFilter)
      )

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName={scenarioName} />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        {tickerItems.length > 0 && <GlobalTicker items={tickerItems} />}

        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="border-b border-border-subtle mb-6">
            <DocumentIdHeader
              scenarioCode={`GEOSIM-CHRONICLE-${params.branchId.toUpperCase().slice(0, 8)}`}
              branchName={params.branchId.toUpperCase()}
            />
          </div>

          <div className="mb-6">
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-1">
              War Chronicle
            </h1>
            <p className="font-sans text-sm text-text-secondary leading-[1.6]">
              Complete record of AI-generated turn narratives, strategic decisions, and outcome assessments.
            </p>
          </div>

          <div className="flex border-b border-border-subtle mb-8" role="tablist">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(tab)}
                  className={`font-label text-[10px] font-semibold uppercase tracking-[0.06em] px-3 py-2 -mb-px border-b-2 transition-colors whitespace-nowrap ${
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

          {loading ? (
            <div className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary py-12 text-center">
              LOADING CHRONICLE…
            </div>
          ) : (
            <>
              <p className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-6">
                {filteredEntries.length}{' '}
                {filteredEntries.length !== 1 ? 'ENTRIES' : 'ENTRY'}
                {activeFilter !== 'ALL' ? ` — ${activeFilter}` : ''}
              </p>

              {filteredEntries.length > 0 ? (
                <ChronicleTimeline entries={filteredEntries} />
              ) : (
                <div className="py-12 text-center font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary">
                  {entries.length === 0 ? 'NO CHRONICLE DATA FOR THIS BRANCH' : 'NO ENTRIES IN THIS DIMENSION'}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
