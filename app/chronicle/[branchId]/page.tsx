'use client'

import { useState } from 'react'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { GlobalTicker } from '@/components/chronicle/GlobalTicker'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TICKER_ITEMS = [
  'Strait of Hormuz 40% blocked — MCM sweep in progress',
  'Oil $142/bbl — IEA emergency meeting called',
  'Iran mobilizes IRGC reserves — 3 additional divisions',
  'US CENTCOM DEFCON 3 — force protection raised',
  'Israel Iron Dome at 94% capacity — resupply en route',
  'Saudi Aramco evacuation drill ordered — precautionary',
  'Russia moves naval group to Mediterranean',
  'China BRICS emergency session — yuan oil settlement proposed',
]

const MOCK_ENTRIES = [
  {
    turnNumber: 1,
    date: '4 March 2026',
    title: 'Operation Epic Fury Launched',
    narrative: 'Joint US-Israeli decapitation strike targeting 14 nuclear facilities across Iran. Three sites hardened beyond conventional penetration. Fordow enrichment complex partially intact following failed GBU-57 drop.',
    severity: 'critical' as const,
    tags: ['Military', 'Nuclear', 'US', 'Israel'],
    detail: 'B-2 sorties launched from Diego Garcia; F-35I from Nevatim. Carrier group CVN-73 launched 64 Tomahawks. Fordow bunker penetration failed — second sortie requires GBU-57 MOP. Natanz centrifuge hall destroyed.',
  },
  {
    turnNumber: 2,
    date: '8 March 2026',
    title: 'Strait of Hormuz Closed — Economic Shockwave',
    narrative: 'IRGC mining operation seals Hormuz. Twenty-two tankers rerouted via Cape of Good Hope. Oil spikes to $142 per barrel. Gulf States emergency economic session convened in Abu Dhabi.',
    severity: 'critical' as const,
    tags: ['Economic', 'Military', 'Iran', 'Gulf'],
    detail: 'MCM assets deployed from Bahrain. US 5th Fleet estimating 72–96 hours to clear main channel. LNG terminal at Ras Laffan operational — Qatari gas unaffected.',
  },
  {
    turnNumber: 3,
    date: '14 March 2026',
    title: 'Oman Diplomatic Breakthrough Attempt',
    narrative: 'Oman announces framework for temporary ceasefire and Hormuz reopening. Iran signals willingness to negotiate. US rejects all preconditions.',
    severity: 'major' as const,
    tags: ['Diplomatic', 'Oman', 'Iran'],
    detail: 'Back-channel mediated by Omani FM. Iran demands suspension of air campaign as precondition. NSC split — State favors engagement, DoD opposes operational pause.',
  },
  {
    turnNumber: 4,
    date: '22 March 2026',
    title: 'Hezbollah Northern Front Activated',
    narrative: 'Hezbollah launches 340 rockets into northern Israel. Iron Dome intercept rate at 87%. Three civilians killed in Haifa. Israel mulling ground incursion into southern Lebanon.',
    severity: 'major' as const,
    tags: ['Military', 'Escalation', 'Lebanon'],
    detail: 'Mixed salvo of Grad and Katyusha rockets. Three S-5 anti-armor missiles targeted Haifa port facility. Ground forces at 72-hour readiness.',
  },
]

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

  const filteredEntries = activeFilter === 'ALL'
    ? MOCK_ENTRIES
    : MOCK_ENTRIES.filter(entry =>
        entry.tags.some(tag => TAG_TO_FILTER[tag] === activeFilter)
      )

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName="WAR CHRONICLE — US-ISRAEL-IRAN" />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        {/* Global intel ticker — just below fixed header */}
        <GlobalTicker items={MOCK_TICKER_ITEMS} />

        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="border-b border-border-subtle mb-6">
            <DocumentIdHeader
              scenarioCode={`GEOSIM-CHRONICLE-${params.branchId.toUpperCase().slice(0, 8)}`}
              branchName={params.branchId.toUpperCase()}
            />
          </div>

          {/* Page heading */}
          <div className="mb-6">
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-1">
              War Chronicle
            </h1>
            <p className="font-sans text-sm text-text-secondary leading-[1.6]">
              Complete record of AI-generated turn narratives, strategic decisions, and outcome assessments.
            </p>
          </div>

          {/* Dimension filter tabs */}
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

          {/* Entry count */}
          <p className="font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary mb-6">
            {filteredEntries.length}{' '}
            {filteredEntries.length !== 1 ? 'ENTRIES' : 'ENTRY'}
            {activeFilter !== 'ALL' ? ` — ${activeFilter}` : ''}
          </p>

          {/* Timeline */}
          {filteredEntries.length > 0 ? (
            <ChronicleTimeline entries={filteredEntries} />
          ) : (
            <div className="py-12 text-center font-mono text-2xs uppercase tracking-[0.08em] text-text-tertiary">
              NO ENTRIES IN THIS DIMENSION
            </div>
          )}
        </div>
      </main>
    </>
  )
}
