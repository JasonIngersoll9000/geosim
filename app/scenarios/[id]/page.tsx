'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { ActorCard } from '@/components/game/ActorCard'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'

// ─── Mock data ────────────────────────────────────────────────────────────────

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

// ─── Timeline mock data ───────────────────────────────────────────────────────

const TIMELINE_ENTRIES = [
  {
    turnNumber: 1,
    date: '4 March 2026',
    title: 'Operation Epic Fury Launched',
    narrative: 'Joint US-Israeli decapitation strike targeting 14 nuclear facilities. Three sites hardened beyond conventional penetration. Fordow partially intact.',
    severity: 'critical' as const,
    tags: ['Military', 'Nuclear'],
    detail: 'B-2 sorties from Diego Garcia, F-35I from Nevatim. Carrier group CVN-73 launched 64 Tomahawks. Fordow bunker penetration failed — requires GBU-57 on second sortie.',
  },
  {
    turnNumber: 2,
    date: '8 March 2026',
    title: 'Strait of Hormuz Closed',
    narrative: 'IRGC mining operation closes Hormuz. 22 tankers rerouted. Oil spikes to $142/bbl. Gulf States emergency session convened.',
    severity: 'critical' as const,
    tags: ['Economic', 'Military'],
    detail: 'MCM assets deployed. US 5th Fleet estimating 72–96 hours to clear main channel. LNG terminal at Ras Laffan operational.',
  },
  {
    turnNumber: 3,
    date: '14 March 2026',
    title: 'Oman Diplomatic Breakthrough',
    narrative: 'Oman announces framework for temporary ceasefire. Iran signals willingness to negotiate Hormuz reopening. US rejects preconditions.',
    severity: 'major' as const,
    tags: ['Diplomatic'],
  },
  {
    turnNumber: 4,
    date: '22 March 2026',
    title: 'Hezbollah Northern Front Activated',
    narrative: 'Hezbollah launches 340 rockets into northern Israel. Iron Dome at 87% intercept rate. Three civilians killed in Haifa.',
    severity: 'major' as const,
    tags: ['Military', 'Escalation'],
  },
]

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'timeline' | 'actors'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ScenarioHubPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>('actors')
  const router = useRouter()

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName="US-ISRAEL-IRAN CONFLICT 2025-2026" />

      <main
        className="pt-[66px]"
        style={{ background: 'var(--bg-base)', minHeight: '100vh' }}
      >
        <div className="max-w-5xl mx-auto px-5 py-4">
          <DocumentIdHeader
            scenarioCode={`GEOSIM-${params.id.toUpperCase().slice(0, 12)}`}
            branchName="SELECT BRANCH"
          />

          {/* Scenario header */}
          <div
            className="mt-2 mb-6 pb-5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <h1
              className="font-label text-[22px] font-bold uppercase tracking-[0.04em]"
              style={{ color: 'var(--text-primary)' }}
            >
              US–Israel–Iran Conflict
            </h1>
            <p
              className="font-sans text-[13px] mt-2 max-w-2xl leading-[1.6]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Phase 3: Operation Epic Fury — Day 19. Joint US-Israeli decapitation
              strike launched one day after Oman announced a diplomatic breakthrough.
              Strait of Hormuz closed. Oil at $142/bbl. Nuclear constraint cascade forming.
            </p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => router.push(`/scenarios/${params.id}/play/trunk`)}
                className="font-label text-[11px] font-semibold uppercase tracking-[0.04em] px-4 py-2 transition-opacity hover:opacity-[0.88]"
                style={{
                  background: 'var(--gold)',
                  color: '#0D1117',
                  border: 'none',
                }}
              >
                Observe (AI vs AI)
              </button>
              <button
                className="font-label text-[11px] font-semibold uppercase tracking-[0.04em] px-4 py-2 transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-hi)',
                  color: 'var(--text-secondary)',
                }}
              >
                Browse Branches
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex mb-6"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {(['actors', 'timeline'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="font-label text-[11px] font-semibold uppercase tracking-[0.04em] px-4 py-2 -mb-px transition-colors"
                style={{
                  color: activeTab === tab ? 'var(--gold)' : 'var(--text-tertiary)',
                  border: 'none',
                  borderBottom: activeTab === tab
                    ? '2px solid var(--gold)'
                    : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {tab === 'actors' ? 'Strategic Actors' : 'Event Timeline'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'actors' && (
            <div className="grid grid-cols-3 gap-4">
              {MOCK_ACTORS.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  onViewDossier={() => router.push(`/scenarios/${params.id}/play/trunk`)}
                />
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <ChronicleTimeline entries={TIMELINE_ENTRIES} />
          )}
        </div>
      </main>
    </>
  )
}
