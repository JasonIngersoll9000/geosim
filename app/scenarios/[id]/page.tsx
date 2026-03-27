'use client'

import { useState } from 'react'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { ActorCard } from '@/components/game/ActorCard'

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

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'timeline' | 'actors'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ScenarioHubPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>('actors')

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
                  borderBottom: activeTab === tab
                    ? '2px solid var(--gold)'
                    : '2px solid transparent',
                  background: 'transparent',
                  border: 'none',
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
                  onViewDossier={() => {
                    // TODO: navigate to play view as this actor
                    console.log(`Play as ${actor.id}`)
                  }}
                />
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div
              className="py-8 text-center font-mono text-[11px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              TIMELINE — COMING IN TASK 8
            </div>
          )}
        </div>
      </main>
    </>
  )
}
