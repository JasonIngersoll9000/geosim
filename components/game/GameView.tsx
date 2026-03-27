'use client'

import { useState } from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { useGame } from '@/components/providers/GameProvider'
import { GlobalIndicators } from '@/components/panels/GlobalIndicators'
import { ActorList } from '@/components/panels/ActorList'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'
import { DecisionCatalog } from '@/components/panels/DecisionCatalog'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'
import { EventsTab } from '@/components/panels/EventsTab'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'
import { ObserverOverlay } from '@/components/panels/ObserverOverlay'
import type { DispatchLine } from '@/components/game/DispatchTerminal'
import type { ActorSummary, ActorDetail, DecisionOption } from '@/lib/types/panels'

// ─── Mock data (Iran conflict scenario, Turn 4) ──────────────────────────────

const MOCK_ACTORS: ActorSummary[] = [
  { id: 'united_states', name: 'United States', escalationRung: 5 },
  { id: 'iran',          name: 'Iran',          escalationRung: 6 },
  { id: 'israel',        name: 'Israel',        escalationRung: 6 },
  { id: 'russia',        name: 'Russia',        escalationRung: 1 },
  { id: 'china',         name: 'China',         escalationRung: 1 },
  { id: 'gulf_states',   name: 'Gulf States',   escalationRung: 2 },
]

const MOCK_ACTOR_DETAILS: Record<string, ActorDetail> = {
  united_states: {
    id: 'united_states',
    name: 'United States',
    escalationRung: 5,
    briefing:
      'Leading coalition air campaign. Carrier group positioned in Persian Gulf. Domestic support eroding as oil prices spike. Congressional opposition mounting against ground deployment.',
    militaryStrength: 58,
    economicStrength: 71,
    politicalStability: 44,
    objectives: [
      'Neutralize Iranian nuclear capability',
      'Prevent Strait of Hormuz closure',
      'Maintain coalition cohesion',
      'Limit domestic political exposure',
    ],
  },
  iran: {
    id: 'iran',
    name: 'Iran',
    escalationRung: 6,
    briefing:
      'Executing asymmetric attrition strategy. Strait of Hormuz closed, oil exports disrupted. Proxy networks activated across region. Leadership dispersed to hardened sites.',
    militaryStrength: 42,
    economicStrength: 29,
    politicalStability: 68,
    objectives: [
      'Impose unacceptable economic cost on coalition',
      'Preserve regime continuity',
      'Maintain Hormuz leverage',
      'Activate proxy escalation chains',
    ],
  },
  israel: {
    id: 'israel',
    name: 'Israel',
    escalationRung: 6,
    briefing:
      'Multi-front existential posture. Iron Dome operating at capacity. Hezbollah northern front active. Public support high but sustainability window narrowing.',
    militaryStrength: 74,
    economicStrength: 62,
    politicalStability: 71,
    objectives: [
      'Degrade Iranian nuclear infrastructure',
      'Suppress Hezbollah northern rocket capability',
      'Secure US extended deterrence commitment',
    ],
  },
  russia: {
    id: 'russia',
    name: 'Russia',
    escalationRung: 1,
    briefing:
      'Strategic patience mode. Providing intelligence to Iran to extend US overextension. Oil revenue up 38%. Watching for NATO distraction opportunity.',
    militaryStrength: 77,
    economicStrength: 51,
    politicalStability: 82,
    objectives: [
      'Maximize US resource commitment in Middle East',
      'Exploit oil revenue windfall',
      'Observe NATO response coherence',
    ],
  },
  china: {
    id: 'china',
    name: 'China',
    escalationRung: 1,
    briefing:
      'Passive beneficiary. Oil imports secured via alternative routes. Reducing Taiwan Strait provocation to avoid two-front pressure on US. BRICS coordination active.',
    militaryStrength: 83,
    economicStrength: 88,
    politicalStability: 79,
    objectives: [
      'Secure alternative oil supply chains',
      'Avoid US–China escalation while US is distracted',
      'Advance BRICS reserve currency position',
    ],
  },
  gulf_states: {
    id: 'gulf_states',
    name: 'Gulf States',
    escalationRung: 2,
    briefing:
      'UAE, Saudi Arabia, Qatar caught in crossfire. Oil output down 15%. US basing rights under domestic pressure. Reviewing alignment commitments.',
    militaryStrength: 38,
    economicStrength: 67,
    politicalStability: 54,
    objectives: [
      'Preserve sovereign territory from spillover',
      'Maintain US security guarantees without political cost',
      'Protect oil infrastructure',
    ],
  },
}

const MOCK_DECISIONS: DecisionOption[] = [
  { id: 'expand-air',       title: 'Expand Air Campaign',          dimension: 'military',     escalationDirection: 'escalate',    resourceWeight: 0.6  },
  { id: 'special-ops',      title: 'Special Ops Insertion',        dimension: 'military',     escalationDirection: 'escalate',    resourceWeight: 0.4  },
  { id: 'ceasefire-signal', title: 'Signal Ceasefire Willingness', dimension: 'diplomatic',   escalationDirection: 'de-escalate', resourceWeight: 0.2  },
  { id: 'oman-backchannel', title: 'Activate Oman Back-Channel',   dimension: 'diplomatic',   escalationDirection: 'de-escalate', resourceWeight: 0.15 },
  { id: 'iea-release',      title: 'IEA Reserve Release',          dimension: 'economic',     escalationDirection: 'neutral',     resourceWeight: 0.25 },
  { id: 'asset-freeze',     title: 'Expand Asset Freeze',          dimension: 'economic',     escalationDirection: 'escalate',    resourceWeight: 0.3  },
  { id: 'proxy-disrupt',    title: 'Disrupt Proxy Networks',       dimension: 'intelligence', escalationDirection: 'escalate',    resourceWeight: 0.35 },
]

const MOCK_CHRONICLE_ENTRIES = [
  {
    turnNumber: 1,
    date: '4 March 2026',
    title: 'Operation Epic Fury Launched',
    narrative:
      'Joint US-Israeli decapitation strike targeting 14 nuclear facilities. Three sites hardened beyond conventional penetration. Fordow partially intact.',
    severity: 'critical' as const,
    tags: ['Military', 'Nuclear'],
    detail:
      'B-2 sorties from Diego Garcia, F-35I from Nevatim. Carrier group CVN-73 launched 64 Tomahawks. Fordow bunker penetration failed — target requires GBU-57 on second sortie.',
  },
  {
    turnNumber: 2,
    date: '8 March 2026',
    title: 'Strait of Hormuz Closed',
    narrative:
      'IRGC mining operation closes Hormuz. 22 tankers rerouted. Oil spikes to $142/bbl. Gulf States emergency session convened.',
    severity: 'critical' as const,
    tags: ['Economic', 'Military'],
    detail:
      'MCM assets deployed. US 5th Fleet estimating 72–96 hours to clear main channel. LNG terminal at Ras Laffan operational — Qatari gas flow unaffected.',
  },
  {
    turnNumber: 3,
    date: '14 March 2026',
    title: 'Oman Diplomatic Breakthrough',
    narrative:
      'Oman announces framework for temporary ceasefire. Iran signals willingness to negotiate Hormuz reopening. US rejects preconditions.',
    severity: 'major' as const,
    tags: ['Diplomatic'],
    detail:
      'Back-channel mediated by Omani FM. Iran demands suspension of air campaign as precondition. NSC split — State Department favors engagement, DoD opposes pause.',
  },
  {
    turnNumber: 4,
    date: '22 March 2026',
    title: 'Hezbollah Northern Front Activated',
    narrative:
      'Hezbollah launches 340 rockets into northern Israel. Iron Dome at 87% intercept rate. Three civilians killed in Haifa. Israel mulling ground incursion.',
    severity: 'major' as const,
    tags: ['Military', 'Escalation'],
  },
]

const MOCK_RESOLUTION = {
  narrative:
    'US air campaign resumed after 48-hour pause for Oman talks. Iran responded with Hormuz mine reinforcement and proxy activation in Lebanon and Yemen. The Oman framework collapsed when US rejected preconditions. Oil hit $142/bbl. Congressional authorization debate intensifying.',
  actionOutcomes: [
    {
      actorId: 'united_states',
      decisionId: 'expand-air',
      succeeded: true,
      outcome: 'Secondary targets destroyed. Iranian air defense suppressed in western corridor.',
      parameterEffects: 'Military readiness −4 (Iran). Coalition cohesion −2.',
    },
    {
      actorId: 'iran',
      decisionId: 'proxy-disrupt',
      succeeded: true,
      outcome: 'Hezbollah activated. Proxy escalation chain triggered ahead of schedule.',
      parameterEffects: 'Hezbollah capability −8. Regional escalation +1 rung.',
    },
  ],
  reactionPhase:
    'Gulf States requested emergency US security guarantees. Russia moved additional naval assets to Mediterranean.',
  judgeScores: {
    plausibility: 87,
    consistency: 82,
    proportionality: 74,
    rationality: 91,
    cascadeLogic: 85,
    overallScore: 84,
  },
}

const MOCK_DISPATCH_LINES: DispatchLine[] = [
  { timestamp: '08:14:02', text: 'BRANCH: trunk // TURN 04 // PHASE: planning', type: 'info' },
  { timestamp: '08:14:03', text: 'Loading actor state snapshot...', type: 'default' },
  { timestamp: '08:14:04', text: 'Scenario snapshot loaded — 6 actors, 7 decisions available', type: 'confirmed' },
  { timestamp: '08:14:05', text: 'Awaiting turn plan submission', type: 'default' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelTab = 'chronicle' | 'decisions' | 'events'

interface Props {
  branchId: string
  scenarioId: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameView({ branchId, scenarioId: _scenarioId }: Props) {
  useRealtime(branchId)
  const { state, dispatch } = useGame()
  const [activeTab, setActiveTab] = useState<PanelTab>('chronicle')
  const [showObserver, setShowObserver] = useState(true)

  const selectedActorDetail = state.selectedActorId
    ? (MOCK_ACTOR_DETAILS[state.selectedActorId] ?? null)
    : null

  const lines: DispatchLine[] = state.resolutionProgress
    ? [{ timestamp: new Date().toISOString().slice(11, 19), text: state.resolutionProgress, type: 'default' as const }]
    : MOCK_DISPATCH_LINES

  const isRunning = state.turnPhase === 'resolution' || state.turnPhase === 'judging'

  return (
    <div className="flex flex-col border border-border-subtle">
      {/* Global indicators */}
      <GlobalIndicators
        indicators={[
          { label: 'OIL',        value: '$142/bbl',                                                variant: 'critical' },
          { label: 'TURN',       value: `${String(state.turnNumber || 4).padStart(2, '0')} / 12` },
          { label: 'PHASE',      value: (state.turnPhase || 'planning').toUpperCase()             },
          { label: 'ESCALATION', value: 'RUNG 6',                                                  variant: 'critical' },
          { label: 'HORMUZ',     value: 'CLOSED',                                                  variant: 'critical' },
        ]}
      />

      {/* Two-column body */}
      <div className="flex min-h-[520px] border-b border-border-subtle">

        {/* Left: actor list */}
        <div className="w-52 flex-shrink-0 border-r border-border-subtle overflow-y-auto">
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary px-4 py-2 border-b border-border-subtle bg-bg-surface-dim">
            Strategic Actors
          </div>
          <ActorList
            actors={MOCK_ACTORS}
            selectedActorId={state.selectedActorId}
            onSelect={(id) => dispatch({ type: 'SELECT_ACTOR', payload: id })}
          />
        </div>

        {/* Right: tabbed panels */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Tab bar */}
          <div className="flex bg-bg-surface-dim border-b border-border-subtle">
            {(['chronicle', 'decisions', 'events'] as PanelTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-mono text-2xs uppercase tracking-[0.1em] px-4 py-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'text-gold border-b-2 border-gold'
                    : 'text-text-tertiary border-b-2 border-transparent hover:text-text-secondary'
                }`}
              >
                {tab === 'chronicle' ? 'Chronicle' : tab === 'decisions' ? 'Decisions' : 'Last Turn'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chronicle' && (
              <ChronicleTimeline entries={MOCK_CHRONICLE_ENTRIES} />
            )}
            {activeTab === 'decisions' && (
              <DecisionCatalog
                decisions={MOCK_DECISIONS}
                onSelect={(id) => dispatch({ type: 'SELECT_DECISION', payload: id })}
              />
            )}
            {activeTab === 'events' && (
              <EventsTab resolution={MOCK_RESOLUTION} />
            )}
          </div>
        </div>
      </div>

      {/* Dispatch terminal */}
      <DispatchTerminal lines={lines} isRunning={isRunning} />

      {/* Actor detail slide-over */}
      {selectedActorDetail && (
        <ActorDetailPanel
          actor={selectedActorDetail}
          open={!!selectedActorDetail}
          onClose={() => dispatch({ type: 'SELECT_ACTOR', payload: null })}
        />
      )}

      {/* Observer overlay — shown on first load, dismissible */}
      <ObserverOverlay
        isVisible={showObserver}
        onDismiss={() => setShowObserver(false)}
      />
    </div>
  )
}
