'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useRealtime } from '@/hooks/useRealtime'
import { useGame } from '@/components/providers/GameProvider'
import { useSubmitTurn } from '@/hooks/useSubmitTurn'
import { GameLayout } from '@/components/layout/GameLayout'
import { GameMap } from '@/components/map/GameMap'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'
import { DecisionCatalog } from '@/components/panels/DecisionCatalog'
import { DecisionDetailPanel } from '@/components/panels/DecisionDetailPanel'
import { TurnPlanBuilder } from '@/components/panels/TurnPlanBuilder'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'
import { ActorControlSelector } from '@/components/game/ActorControlSelector'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'
import { ObserverOverlay } from '@/components/panels/ObserverOverlay'
import { TurnPhaseIndicator } from '@/components/game/TurnPhaseIndicator'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { DispatchLine } from '@/components/game/DispatchTerminal'
import type { ActorSummary, ActorDetail, DecisionDetail, ActionSlot } from '@/lib/types/panels'
import type { GameInitialData, ChronicleEntry } from '@/lib/types/game-init'

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelTab = 'actors' | 'decisions' | 'events' | 'chronicle'

interface Props {
  branchId: string
  scenarioId: string
  initialData: GameInitialData
}

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'actors',    label: 'ACTORS'    },
  { id: 'decisions', label: 'DECISIONS' },
  { id: 'events',    label: 'EVENTS'    },
  { id: 'chronicle', label: 'CHRONICLE' },
]

// ─── Actors tab inner component ───────────────────────────────────────────────

const STANCE_LABEL: Record<string, { label: string; color: string }> = {
  ally:       { label: 'ALLY',    color: '#5ebd8e' },
  adversary:  { label: 'ADV.',    color: '#e74c3c' },
  rival:      { label: 'RIVAL',   color: '#e67e22' },
  proxy:      { label: 'PROXY',   color: '#4a90d9' },
  neutral:    { label: 'NEUT.',   color: '#8a8880' },
}

function ActorsPanel({
  actors,
  actorMetrics,
  selectedActorId,
  onSelect,
}: {
  actors: ActorSummary[]
  actorMetrics: Record<string, { military: number; economic: number; political: number }>
  selectedActorId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border-subtle">
        {actors.map((actor) => {
          const metrics = actorMetrics[actor.id]
          const isSelected = actor.id === selectedActorId
          const stance = STANCE_LABEL[actor.relationshipStance] ?? STANCE_LABEL.neutral
          const color = actor.actorColor

          return (
            <button
              key={actor.id}
              data-actor-id={actor.id}
              onClick={() => onSelect(actor.id)}
              style={{
                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                padding: '10px 14px 10px 13px',
                background: isSelected ? `${color}0a` : 'transparent',
                transition: 'background 0.15s, border-left-color 0.15s',
              }}
            >
              {/* Row 1: name + stance badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: color, boxShadow: isSelected ? `0 0 5px ${color}` : 'none',
                }} />
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13, fontWeight: 600, color: '#e5e2e1', flex: 1, lineHeight: 1.2,
                }}>
                  {actor.name}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                  color: stance.color, flexShrink: 0,
                }}>
                  {stance.label}
                </span>
              </div>

              {/* Row 2: rung name */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 16, marginBottom: metrics ? 6 : 0 }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, color, letterSpacing: '0.08em', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  R{actor.escalationRung} · {actor.escalationRungName.toUpperCase().slice(0, 20)}
                </span>
                {actor.primaryObjective && (
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 9, color: 'rgba(229,226,225,0.4)', lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box' as const,
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {actor.primaryObjective}
                  </span>
                )}
              </div>

              {/* Row 3: metric bars */}
              {metrics && (
                <div style={{ paddingLeft: 16 }} className="flex flex-col gap-1">
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

// ─── Derive actor metrics from ActorDetail records ────────────────────────────

function buildActorMetrics(
  actorDetails: Record<string, ActorDetail>
): Record<string, { military: number; economic: number; political: number }> {
  const result: Record<string, { military: number; economic: number; political: number }> = {}
  for (const [id, detail] of Object.entries(actorDetails)) {
    result[id] = {
      military: detail.militaryStrength,
      economic: detail.economicStrength,
      political: detail.politicalStability,
    }
  }
  return result
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameView({ branchId, scenarioId, initialData }: Props) {
  useRealtime(branchId)
  const { state, dispatch } = useGame()
  const { submitTurn, isSubmitting, isComplete, error, lines: hookLines, reset: resetHook } = useSubmitTurn(scenarioId, branchId)
  const shouldSkip = useReducedMotion()
  const router = useRouter()

  const actorMetrics = buildActorMetrics(initialData.actorDetails)

  const [controlledActors, setControlledActors]             = useState<string[] | null>(null)
  const [forkingBranch, setForkingBranch]                   = useState(false)
  const [activeTab, setActiveTab]                           = useState<PanelTab>('actors')
  const [showObserver, setShowObserver]                     = useState(true)
  const [selectedDecisionDetail, setSelectedDecisionDetail] = useState<DecisionDetail | null>(null)
  const [decisionPanelOpen, setDecisionPanelOpen]           = useState(false)
  const [primaryAction, setPrimaryAction]                   = useState<ActionSlot | null>(null)
  const [concurrentActions, setConcurrentActions]           = useState<ActionSlot[]>([])
  const [chronicleEntries, setChronicleEntries]             = useState<ChronicleEntry[]>(initialData.chronicle)
  const [turnNumber, setTurnNumber]                         = useState(initialData.branch.turnNumber)
  const [turnCommitId, setTurnCommitId]                     = useState<string | null>(initialData.branch.headCommitId)
  const [dispatchLines, setDispatchLines]                   = useState<DispatchLine[]>([{
    timestamp: new Date().toISOString().slice(11, 19),
    text: `BRANCH: ${initialData.branch.name} // TURN ${String(initialData.branch.turnNumber).padStart(2, '0')} // PHASE: ${initialData.branch.isTrunk ? 'observer' : 'planning'}`,
    type: 'info',
  }])

  // Ground truth mode
  const isGtMode = initialData.branch.isTrunk
  const [gtIndex, setGtIndex]     = useState(
    Math.max(0, initialData.groundTruthCommits.findIndex(c => c.turnNumber === initialData.branch.turnNumber))
  )
  const [gtHasNext, setGtHasNext] = useState(
    initialData.groundTruthCommits.length > 0 &&
    gtIndex < initialData.groundTruthCommits.length - 1
  )
  const [gtLoading, setGtLoading] = useState(false)

  // Show terminal mode during resolution, completion, or on a non-fallback error
  const showTerminal = isSubmitting || isComplete || !!error

  // Auto-append chronicle entry and switch to CHRONICLE tab when turn completes
  useEffect(() => {
    if (!isComplete) return
    dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })

    // Chronicle append — capture action titles before reset
    const nextTurn = turnNumber + 1
    const actionTitles = [primaryAction, ...concurrentActions]
      .filter(Boolean).map(a => a!.title)
    const newEntry: ChronicleEntry = {
      turnNumber: nextTurn,
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      title: primaryAction
        ? `Turn ${nextTurn} — ${primaryAction.title}`
        : `Turn ${nextTurn} Complete`,
      narrative: `Resolution complete. Actions executed: ${actionTitles.join(', ')}. Judged at 86/100.`,
      severity: 'major',
      tags: primaryAction ? [primaryAction.dimension.charAt(0).toUpperCase() + primaryAction.dimension.slice(1)] : [],
    }
    setChronicleEntries(prev => [...prev, newEntry])

    // Reset TurnPlanBuilder immediately on completion (not deferred to button click)
    setPrimaryAction(null)
    setConcurrentActions([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete])

  const selectedActorDetail = state.selectedActorId
    ? (initialData.actorDetails[state.selectedActorId] ?? null)
    : null

  function handleDecisionSelect(id: string) {
    const detail = initialData.decisionDetails[id] ?? null
    if (detail) {
      setSelectedDecisionDetail(detail)
      setDecisionPanelOpen(true)
    }
  }

  function handleDecisionCommit(id: string) {
    const decision = initialData.decisions.find(d => d.id === id)
    if (!decision) return
    const slot: ActionSlot = { id: decision.id, title: decision.title, dimension: decision.dimension }
    if (!primaryAction) {
      setPrimaryAction(slot)
    } else if (
      concurrentActions.length < 3 &&
      !concurrentActions.find(a => a.id === id) &&
      primaryAction.id !== id
    ) {
      setConcurrentActions(prev => [...prev, slot])
    }
  }

  async function handleTurnSubmit() {
    if (!primaryAction) return
    dispatch({ type: 'SET_TURN_PHASE', payload: 'resolution' })
    setActiveTab('decisions') // stay on decisions tab header (terminal covers it)
    await submitTurn({ primaryAction, concurrentActions, controlledActors: controlledActors ?? [] })
  }

  function handleReturnToPlanning() {
    // Only advance turn on successful completion — not on error dismiss
    if (isComplete) {
      setTurnNumber(prev => prev + 1)
      setActiveTab('chronicle')
    } else {
      // Error dismiss: clear plan slots and stay on decisions so user can retry
      setPrimaryAction(null)
      setConcurrentActions([])
      setActiveTab('decisions')
    }
    resetHook()
    dispatch({ type: 'SET_TURN_PHASE', payload: 'planning' })
  }

  function handleRemovePrimary() {
    // Promote first concurrent to primary if available
    if (concurrentActions.length > 0) {
      setPrimaryAction(concurrentActions[0])
      setConcurrentActions(prev => prev.slice(1))
    } else {
      setPrimaryAction(null)
    }
  }

  function handleRemoveConcurrent(id: string) {
    setConcurrentActions(prev => prev.filter(a => a.id !== id))
  }

  const handleForkNewBranch = async () => {
    setForkingBranch(true)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      })
      if (res.ok) {
        const json = await res.json() as { id?: string }
        if (json.id) {
          router.push(`/scenarios/${scenarioId}/play/${json.id}`)
          return
        }
      }
    } catch {
      // non-fatal
    } finally {
      setForkingBranch(false)
    }
  }

  const handleNextGroundTruthEvent = async () => {
    if (!gtHasNext || gtLoading) return
    setGtLoading(true)
    try {
      const res = await fetch(
        `/api/scenarios/${scenarioId}/branches/${branchId}/ground-truth-step?currentTurn=${turnNumber}`
      )
      const json = await res.json() as {
        data: { id: string; turnNumber: number; simulatedDate: string; narrativeEntry: string | null } | null
        hasNext: boolean
      }
      if (json.data) {
        const nextIdx = gtIndex + 1
        setTurnNumber(json.data.turnNumber)
        setTurnCommitId(json.data.id)
        setGtIndex(nextIdx)
        setGtHasNext(json.hasNext)
        if (json.data.narrativeEntry) {
          setChronicleEntries(prev => [...prev, {
            turnNumber: json.data!.turnNumber,
            date: json.data!.simulatedDate,
            title: `Turn ${json.data!.turnNumber}`,
            narrative: json.data!.narrativeEntry!,
            severity: 'major' as const,
            tags: [],
          }])
        }
        setDispatchLines([{
          timestamp: new Date().toISOString().slice(11, 19),
          text: `GROUND TRUTH — TURN ${json.data.turnNumber} — ${json.data.simulatedDate}`,
          type: 'info',
        }])
      }
    } catch {
      // non-fatal
    } finally {
      setGtLoading(false)
    }
  }

  // ─── Map content ────────────────────────────────────────────────────────────

  const mapContent = (
    <GameMap
      scenarioId={scenarioId}
      branchId={branchId}
      turnCommitId={turnCommitId}
    />
  )

  // ─── Panel content ───────────────────────────────────────────────────────────

  const panelContent = (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Global indicators bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-bg-surface-dim border-b border-border-subtle font-mono text-2xs shrink-0">
        <span className="text-text-tertiary">OIL: <span className="text-status-critical">$142/bbl</span></span>
        <span className="text-text-tertiary">
          TURN: <span className="text-text-secondary">{String(turnNumber).padStart(2, '0')} / 12</span>
        </span>
        <span className="text-text-tertiary">
          PHASE: <TurnPhaseIndicator phase={state.turnPhase || 'planning'} />
        </span>
        <span className="text-text-tertiary">ESCALATION: <span className="text-status-critical">RUNG 6</span></span>
      </div>

      {/* ── Terminal mode: full panel DispatchTerminal during resolution ── */}
      {showTerminal ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Terminal header */}
          <div className="shrink-0 px-4 py-2 bg-bg-surface-dim border-b border-border-subtle flex items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-[0.12em] text-text-tertiary">
              {isSubmitting ? 'RESOLUTION IN PROGRESS' : error && !isComplete ? 'SUBMISSION FAILED' : 'RESOLUTION COMPLETE'}
            </span>
            {isComplete && !isSubmitting && (
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em] text-status-stable">
                ● TURN {turnNumber} RESOLVED
              </span>
            )}
          </div>

          {/* Full-height terminal — reuse <DispatchTerminal /> */}
          <div className="flex-1 overflow-hidden min-h-0">
            <DispatchTerminal lines={hookLines} isRunning={isSubmitting} />
          </div>

          {/* Footer: completion return button or error dismiss */}
          {!isSubmitting && (isComplete || !!error) && (
            <div className="shrink-0 p-4 border-t border-border-subtle bg-bg-surface-dim">
              {error && !isComplete && (
                <div className="font-mono text-2xs text-status-critical mb-3">{error}</div>
              )}
              <button
                onClick={handleReturnToPlanning}
                className="w-full py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] border border-gold text-gold hover:bg-gold hover:text-bg-base transition-colors"
              >
                {isComplete
                  ? `RETURN TO PLANNING // TURN ${turnNumber + 1} →`
                  : 'DISMISS ERROR — RETURN TO PLANNING →'
                }
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Normal planning mode: tabs + content ── */
        <>
          {/* Tab strip — fades in on mount */}
          <motion.div
            className="flex border-b border-border-subtle bg-bg-surface-dim shrink-0"
            initial={shouldSkip ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {PANEL_TABS
              .filter(({ id }) => !(isGtMode && id === 'decisions'))
              .map(({ id, label }) => (
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
          </motion.div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'actors' && (
              <ActorsPanel
                actors={initialData.actors}
                actorMetrics={actorMetrics}
                selectedActorId={state.selectedActorId}
                onSelect={(id) => dispatch({ type: 'SELECT_ACTOR', payload: id })}
              />
            )}
            {activeTab === 'decisions' && !isGtMode && (
              <DecisionCatalog
                decisions={initialData.decisions}
                onSelect={handleDecisionSelect}
                selectedPrimaryId={primaryAction?.id ?? null}
                selectedConcurrentIds={concurrentActions.map(a => a.id)}
              />
            )}
            {activeTab === 'events' && (
              <ChronicleTimeline entries={chronicleEntries} />
            )}
            {activeTab === 'chronicle' && (
              <ChronicleTimeline entries={chronicleEntries} />
            )}
          </div>

          {/* Turn plan builder — fixed at bottom when on decisions tab (not in GT mode) */}
          {activeTab === 'decisions' && !isGtMode && (
            <div className="shrink-0">
              <TurnPlanBuilder
                primaryAction={primaryAction}
                concurrentActions={concurrentActions}
                onSubmit={handleTurnSubmit}
                onRemovePrimary={handleRemovePrimary}
                onRemoveConcurrent={handleRemoveConcurrent}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {/* NEXT EVENT / FORK button — ground truth observer mode */}
          {isGtMode && (
            <div className="shrink-0 px-3 pt-2">
              {gtHasNext ? (
                <button
                  onClick={handleNextGroundTruthEvent}
                  disabled={gtLoading}
                  className="w-full py-2 font-mono text-xs font-semibold bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {gtLoading ? 'LOADING…' : 'NEXT EVENT →'}
                </button>
              ) : (
                <button
                  onClick={() => void handleForkNewBranch()}
                  disabled={forkingBranch}
                  className="w-full py-2 font-mono text-xs font-semibold border border-gold text-gold hover:bg-gold hover:text-bg-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forkingBranch ? 'CREATING BRANCH…' : 'FORK NEW BRANCH →'}
                </button>
              )}
            </div>
          )}

          {/* Dispatch terminal footer — initial state lines */}
          <div className="shrink-0 overflow-hidden" style={{ height: '120px' }}>
            <DispatchTerminal lines={dispatchLines} isRunning={false} />
          </div>

        </>
      )}
    </div>
  )

  if (controlledActors === null && !isGtMode) {
    return (
      <ActorControlSelector
        actors={initialData.actors}
        onConfirm={setControlledActors}
      />
    )
  }

  return (
    <>
      <GameLayout
        mapContent={mapContent}
        panelContent={panelContent}
        exitHref={`/scenarios/${scenarioId}`}
      />

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
        onSelect={() => selectedDecisionDetail && handleDecisionCommit(selectedDecisionDetail.id)}
        alreadySelected={
          !!selectedDecisionDetail && (
            primaryAction?.id === selectedDecisionDetail.id ||
            concurrentActions.some(a => a.id === selectedDecisionDetail.id)
          )
        }
      />

      {/* Observer overlay */}
      <ObserverOverlay
        isVisible={showObserver}
        onDismiss={() => setShowObserver(false)}
      />
    </>
  )
}
