'use client'

import { useState } from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { useGame } from '@/components/providers/GameProvider'
import { GameLayout } from '@/components/layout/GameLayout'
import { GameMap } from '@/components/map/GameMap'
import { GlobalIndicators } from '@/components/panels/GlobalIndicators'
import { ActorList } from '@/components/panels/ActorList'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'
import { DecisionCatalog } from '@/components/panels/DecisionCatalog'
import { DecisionDetailPanel } from '@/components/panels/DecisionDetailPanel'
import { TurnPlanBuilder } from '@/components/panels/TurnPlanBuilder'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'
import { EventsTab } from '@/components/panels/EventsTab'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'
import { ObserverOverlay } from '@/components/panels/ObserverOverlay'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { DispatchLine } from '@/components/game/DispatchTerminal'
import type { ActorSummary, ActorDetail, DecisionOption, DecisionDetail, ActionSlot } from '@/lib/types/panels'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACTORS: ActorSummary[] = [
  { id: 'united_states', name: 'United States', escalationRung: 5 },
  { id: 'iran',          name: 'Iran',          escalationRung: 6 },
  { id: 'israel',        name: 'Israel',        escalationRung: 6 },
  { id: 'russia',        name: 'Russia',        escalationRung: 1 },
  { id: 'china',         name: 'China',         escalationRung: 1 },
  { id: 'gulf_states',   name: 'Gulf States',   escalationRung: 2 },
]

const ACTOR_METRICS: Record<string, { military: number; economic: number; political: number }> = {
  united_states: { military: 58, economic: 71, political: 44 },
  iran:          { military: 42, economic: 29, political: 68 },
  israel:        { military: 74, economic: 62, political: 71 },
  russia:        { military: 77, economic: 51, political: 82 },
  china:         { military: 83, economic: 88, political: 79 },
  gulf_states:   { military: 38, economic: 67, political: 54 },
}

const MOCK_ACTOR_DETAILS: Record<string, ActorDetail> = {
  united_states: {
    id: 'united_states', name: 'United States', escalationRung: 5,
    briefing: 'Leading coalition air campaign. Carrier group positioned in Persian Gulf. Domestic support eroding as oil prices spike. Congressional opposition mounting against ground deployment.',
    militaryStrength: 58, economicStrength: 71, politicalStability: 44,
    objectives: ['Neutralize Iranian nuclear capability', 'Prevent Strait of Hormuz closure', 'Maintain coalition cohesion', 'Limit domestic political exposure'],
  },
  iran: {
    id: 'iran', name: 'Iran', escalationRung: 6,
    briefing: 'Executing asymmetric attrition strategy. Strait of Hormuz closed, oil exports disrupted. Proxy networks activated across region. Leadership dispersed to hardened sites.',
    militaryStrength: 42, economicStrength: 29, politicalStability: 68,
    objectives: ['Impose unacceptable economic cost on coalition', 'Preserve regime continuity', 'Maintain Hormuz leverage', 'Activate proxy escalation chains'],
  },
  israel: {
    id: 'israel', name: 'Israel', escalationRung: 6,
    briefing: 'Multi-front existential posture. Iron Dome operating at capacity. Hezbollah northern front active. Public support high but sustainability window narrowing.',
    militaryStrength: 74, economicStrength: 62, politicalStability: 71,
    objectives: ['Degrade Iranian nuclear infrastructure', 'Suppress Hezbollah northern rocket capability', 'Secure US extended deterrence commitment'],
  },
  russia: {
    id: 'russia', name: 'Russia', escalationRung: 1,
    briefing: 'Strategic patience mode. Providing intelligence to Iran to extend US overextension. Oil revenue up 38%. Watching for NATO distraction opportunity.',
    militaryStrength: 77, economicStrength: 51, politicalStability: 82,
    objectives: ['Maximize US resource commitment in Middle East', 'Exploit oil revenue windfall', 'Observe NATO response coherence'],
  },
  china: {
    id: 'china', name: 'China', escalationRung: 1,
    briefing: 'Passive beneficiary. Oil imports secured via alternative routes. Reducing Taiwan Strait provocation to avoid two-front pressure on US. BRICS coordination active.',
    militaryStrength: 83, economicStrength: 88, politicalStability: 79,
    objectives: ['Secure alternative oil supply chains', 'Avoid US–China escalation while US is distracted', 'Advance BRICS reserve currency position'],
  },
  gulf_states: {
    id: 'gulf_states', name: 'Gulf States', escalationRung: 2,
    briefing: 'UAE, Saudi Arabia, Qatar caught in crossfire. Oil output down 15%. US basing rights under domestic pressure. Reviewing alignment commitments.',
    militaryStrength: 38, economicStrength: 67, politicalStability: 54,
    objectives: ['Preserve sovereign territory from spillover', 'Maintain US security guarantees without political cost', 'Protect oil infrastructure'],
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

const MOCK_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'expand-air': {
    id: 'expand-air', title: 'Expand Air Campaign', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.6,
    strategicRationale: 'Targeting remaining hardened sites. Fordow requires GBU-57 penetrators on second sortie. Secondary targets include IRGC command nodes and Bandar Abbas naval facilities.',
    expectedOutcomes: 'Iranian air defense suppression in western corridor. Fordow secondary strike window opens. Coalition military readiness strain increases by approximately 12%.',
    concurrencyRules: [
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
      { decisionId: 'proxy-disrupt',    decisionTitle: 'Disrupt Proxy Networks',       compatible: true  },
      { decisionId: 'oman-backchannel', decisionTitle: 'Activate Oman Back-Channel',   compatible: false },
    ],
  },
  'special-ops': {
    id: 'special-ops', title: 'Special Ops Insertion', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.4,
    strategicRationale: 'JSOC units designated for Fordow access shaft demolition and IRGC leadership targeting. Deniable operation with 72-hour window before satellite coverage.',
    expectedOutcomes: 'If successful: Fordow knocked offline 18–24 months. High casualty risk to operators. IRGC retaliation probability 94%.',
    concurrencyRules: [
      { decisionId: 'expand-air', decisionTitle: 'Expand Air Campaign', compatible: true },
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
    ],
  },
  'ceasefire-signal': {
    id: 'ceasefire-signal', title: 'Signal Ceasefire Willingness', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.2,
    strategicRationale: 'Backchannel messaging through Swiss Embassy indicates Iran would pause Hormuz mining in exchange for suspension of air campaign. Window closing in 48–72 hours.',
    expectedOutcomes: 'Temporary Hormuz reopening achievable within 96 hours. Risk: Iran uses pause to reconstitute air defenses and resupply proxy networks.',
    concurrencyRules: [
      { decisionId: 'expand-air', decisionTitle: 'Expand Air Campaign', compatible: false },
      { decisionId: 'special-ops', decisionTitle: 'Special Ops Insertion', compatible: false },
    ],
  },
  'oman-backchannel': {
    id: 'oman-backchannel', title: 'Activate Oman Back-Channel', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.15,
    strategicRationale: 'Oman has historically mediated US-Iran contacts. Sultan Haitham has offered to host direct talks. This move buys diplomatic credibility without committing to ceasefire.',
    expectedOutcomes: 'Reduces allied pressure for negotiated solution. Keeps Hormuz negotiations alive. Iran may interpret as weakness and demand additional concessions.',
    concurrencyRules: [
      { decisionId: 'expand-air', decisionTitle: 'Expand Air Campaign', compatible: false },
      { decisionId: 'iea-release', decisionTitle: 'IEA Reserve Release', compatible: true },
    ],
  },
  'iea-release': {
    id: 'iea-release', title: 'IEA Reserve Release', dimension: 'economic', escalationDirection: 'neutral', resourceWeight: 0.25,
    strategicRationale: 'Coordinated IEA strategic reserve release of 120 million barrels over 30 days. Designed to cap oil at $120/bbl and reduce Iran\'s economic leverage from Hormuz closure.',
    expectedOutcomes: 'Oil price correction to $115–125/bbl within 5 days. Allied political cohesion improves. Iran loses $4.2B monthly revenue leverage.',
    concurrencyRules: [
      { decisionId: 'asset-freeze', decisionTitle: 'Expand Asset Freeze', compatible: true },
      { decisionId: 'oman-backchannel', decisionTitle: 'Activate Oman Back-Channel', compatible: true },
    ],
  },
  'asset-freeze': {
    id: 'asset-freeze', title: 'Expand Asset Freeze', dimension: 'economic', escalationDirection: 'escalate', resourceWeight: 0.3,
    strategicRationale: 'Treasury-coordinated freeze of Iranian sovereign wealth held in EU and Gulf state accounts. Targets IRGC commercial fronts and Bank Mellat correspondent relationships.',
    expectedOutcomes: 'Iranian central bank reserves reduced by estimated $12B. IRGC procurement channels disrupted. China and Russia likely to accelerate yuan-denominated alternatives.',
    concurrencyRules: [
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
      { decisionId: 'iea-release', decisionTitle: 'IEA Reserve Release', compatible: true },
    ],
  },
  'proxy-disrupt': {
    id: 'proxy-disrupt', title: 'Disrupt Proxy Networks', dimension: 'intelligence', escalationDirection: 'escalate', resourceWeight: 0.35,
    strategicRationale: 'CIA and Mossad joint operation targeting Hezbollah financial networks and weapons shipment routes through Syria. Disrupting the Fordow decision clock.',
    expectedOutcomes: 'Hezbollah resupply delayed 14–21 days. Northern front rocket capability reduced by 30%. Risk of Iranian direct retaliation against CIA assets in Iraq.',
    concurrencyRules: [
      { decisionId: 'expand-air', decisionTitle: 'Expand Air Campaign', compatible: true },
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
    ],
  },
}

const MOCK_CHRONICLE_ENTRIES = [
  {
    turnNumber: 1, date: '4 March 2026', title: 'Operation Epic Fury Launched',
    narrative: 'Joint US-Israeli decapitation strike targeting 14 nuclear facilities. Three sites hardened beyond conventional penetration. Fordow partially intact.',
    severity: 'critical' as const, tags: ['Military', 'Nuclear'],
    detail: 'B-2 sorties from Diego Garcia, F-35I from Nevatim. Carrier group CVN-73 launched 64 Tomahawks. Fordow bunker penetration failed.',
  },
  {
    turnNumber: 2, date: '8 March 2026', title: 'Strait of Hormuz Closed',
    narrative: 'IRGC mining operation closes Hormuz. 22 tankers rerouted. Oil spikes to $142/bbl. Gulf States emergency session convened.',
    severity: 'critical' as const, tags: ['Economic', 'Military'],
    detail: 'MCM assets deployed. US 5th Fleet estimating 72–96 hours to clear main channel.',
  },
  {
    turnNumber: 3, date: '14 March 2026', title: 'Oman Diplomatic Breakthrough',
    narrative: 'Oman announces framework for temporary ceasefire. Iran signals willingness to negotiate Hormuz reopening. US rejects preconditions.',
    severity: 'major' as const, tags: ['Diplomatic'],
  },
  {
    turnNumber: 4, date: '22 March 2026', title: 'Hezbollah Northern Front Activated',
    narrative: 'Hezbollah launches 340 rockets into northern Israel. Iron Dome at 87% intercept rate. Three civilians killed in Haifa.',
    severity: 'major' as const, tags: ['Military', 'Escalation'],
  },
]

const MOCK_RESOLUTION = {
  narrative: 'US air campaign resumed after 48-hour pause for Oman talks. Iran responded with Hormuz mine reinforcement and proxy activation in Lebanon and Yemen. The Oman framework collapsed when US rejected preconditions. Oil hit $142/bbl.',
  actionOutcomes: [
    { actorId: 'united_states', decisionId: 'expand-air', succeeded: true, outcome: 'Secondary targets destroyed. Iranian air defense suppressed in western corridor.', parameterEffects: 'Military readiness −4 (Iran). Coalition cohesion −2.' },
    { actorId: 'iran', decisionId: 'proxy-disrupt', succeeded: true, outcome: 'Hezbollah activated. Proxy escalation chain triggered ahead of schedule.', parameterEffects: 'Hezbollah capability −8. Regional escalation +1 rung.' },
  ],
  reactionPhase: 'Gulf States requested emergency US security guarantees. Russia moved additional naval assets to Mediterranean.',
  judgeScores: { plausibility: 87, consistency: 82, proportionality: 74, rationality: 91, cascadeLogic: 85, overallScore: 84 },
}

const MOCK_DISPATCH_LINES: DispatchLine[] = [
  { timestamp: '08:14:02', text: 'BRANCH: trunk // TURN 04 // PHASE: planning', type: 'info' },
  { timestamp: '08:14:03', text: 'Loading actor state snapshot...', type: 'default' },
  { timestamp: '08:14:04', text: 'Scenario snapshot loaded — 6 actors, 7 decisions available', type: 'confirmed' },
  { timestamp: '08:14:05', text: 'Awaiting turn plan submission', type: 'default' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelTab = 'actors' | 'decisions' | 'events' | 'chronicle'

interface Props {
  branchId: string
  scenarioId: string
}

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'actors',    label: 'ACTORS'    },
  { id: 'decisions', label: 'DECISIONS' },
  { id: 'events',    label: 'EVENTS'    },
  { id: 'chronicle', label: 'CHRONICLE' },
]

// ─── Actors tab inner component ───────────────────────────────────────────────

function ActorsPanel({
  actors,
  selectedActorId,
  onSelect,
}: {
  actors: ActorSummary[]
  selectedActorId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border-subtle">
        {actors.map((actor) => {
          const metrics = ACTOR_METRICS[actor.id]
          const isSelected = actor.id === selectedActorId
          return (
            <button
              key={actor.id}
              data-actor-id={actor.id}
              onClick={() => onSelect(actor.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                isSelected
                  ? 'bg-bg-surface border-l-2 border-gold'
                  : 'bg-transparent hover:bg-bg-surface-dim border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-label text-sm font-semibold text-text-primary">{actor.name}</span>
                <span className="font-mono text-2xs text-text-tertiary">RUNG {actor.escalationRung}</span>
              </div>
              {metrics && (
                <div className="flex flex-col gap-1">
                  {([
                    { label: 'MIL', value: metrics.military },
                    { label: 'ECO', value: metrics.economic },
                    { label: 'POL', value: metrics.political },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-mono text-2xs text-text-tertiary w-6 shrink-0">{label}</span>
                      <ProgressBar value={value} />
                      <span className="font-mono text-2xs text-text-tertiary w-6 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameView({ branchId, scenarioId: _scenarioId }: Props) {
  useRealtime(branchId)
  const { state, dispatch } = useGame()

  const [activeTab, setActiveTab] = useState<PanelTab>('actors')
  const [showObserver, setShowObserver] = useState(false)
  const [selectedDecisionDetail, setSelectedDecisionDetail] = useState<DecisionDetail | null>(null)
  const [decisionPanelOpen, setDecisionPanelOpen] = useState(false)
  const [primaryAction, setPrimaryAction] = useState<ActionSlot | null>(null)
  const [concurrentActions, setConcurrentActions] = useState<ActionSlot[]>([])

  const selectedActorDetail = state.selectedActorId
    ? (MOCK_ACTOR_DETAILS[state.selectedActorId] ?? null)
    : null

  const lines: DispatchLine[] = state.resolutionProgress
    ? [{ timestamp: new Date().toISOString().slice(11, 19), text: state.resolutionProgress, type: 'default' as const }]
    : MOCK_DISPATCH_LINES

  const isRunning = state.turnPhase === 'resolution' || state.turnPhase === 'judging'

  function handleDecisionSelect(id: string) {
    const decision = MOCK_DECISIONS.find(d => d.id === id)
    const detail = MOCK_DECISION_DETAILS[id] ?? null

    // Open detail panel
    if (detail) {
      setSelectedDecisionDetail(detail)
      setDecisionPanelOpen(true)
    }

    // Add to turn plan builder
    if (decision) {
      const slot: ActionSlot = { id: decision.id, title: decision.title, dimension: decision.dimension }
      if (!primaryAction) {
        setPrimaryAction(slot)
      } else if (concurrentActions.length < 3 && !concurrentActions.find(a => a.id === id) && primaryAction.id !== id) {
        setConcurrentActions(prev => [...prev, slot])
      }
    }
  }

  function handleTurnSubmit() {
    dispatch({ type: 'SET_TURN_PHASE', payload: 'resolution' })
  }

  // ─── Map content ────────────────────────────────────────────────────────────

  const mapContent = <GameMap />

  // ─── Panel content ───────────────────────────────────────────────────────────

  const panelContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Global indicators bar */}
      <GlobalIndicators
        indicators={[
          { label: 'OIL',        value: '$142/bbl',                                              variant: 'critical' },
          { label: 'TURN',       value: `${String(state.turnNumber || 4).padStart(2, '0')} / 12` },
          { label: 'PHASE',      value: (state.turnPhase || 'planning').toUpperCase()            },
          { label: 'ESCALATION', value: 'RUNG 6',                                                variant: 'critical' },
        ]}
      />

      {/* Tab strip */}
      <div className="flex border-b border-border-subtle bg-bg-surface-dim shrink-0">
        {PANEL_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`font-label text-[10px] font-semibold uppercase tracking-[0.06em] px-3 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === id
                ? 'text-gold border-gold'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'actors' && (
          <ActorsPanel
            actors={MOCK_ACTORS}
            selectedActorId={state.selectedActorId}
            onSelect={(id) => dispatch({ type: 'SELECT_ACTOR', payload: id })}
          />
        )}
        {activeTab === 'decisions' && (
          <DecisionCatalog
            decisions={MOCK_DECISIONS}
            onSelect={handleDecisionSelect}
          />
        )}
        {activeTab === 'events' && (
          <EventsTab resolution={MOCK_RESOLUTION} />
        )}
        {activeTab === 'chronicle' && (
          <ChronicleTimeline entries={MOCK_CHRONICLE_ENTRIES} />
        )}
      </div>

      {/* Turn plan builder — fixed at bottom when on decisions tab */}
      {activeTab === 'decisions' && (
        <div className="shrink-0">
          <TurnPlanBuilder
            primaryAction={primaryAction}
            concurrentActions={concurrentActions}
            onSubmit={handleTurnSubmit}
          />
        </div>
      )}

      {/* Dispatch terminal */}
      <div className="shrink-0" style={{ maxHeight: '140px' }}>
        <DispatchTerminal lines={lines} isRunning={isRunning} />
      </div>
    </div>
  )

  return (
    <>
      <GameLayout mapContent={mapContent} panelContent={panelContent} />

      {/* Actor dossier slide-over */}
      {selectedActorDetail && (
        <ActorDetailPanel
          actor={selectedActorDetail}
          open={!!selectedActorDetail}
          onClose={() => dispatch({ type: 'SELECT_ACTOR', payload: null })}
        />
      )}

      {/* Decision detail slide-over */}
      <DecisionDetailPanel
        open={decisionPanelOpen}
        onClose={() => setDecisionPanelOpen(false)}
        decision={selectedDecisionDetail}
      />

      {/* Observer overlay */}
      <ObserverOverlay
        isVisible={showObserver}
        onDismiss={() => setShowObserver(false)}
      />
    </>
  )
}
