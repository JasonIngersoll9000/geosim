'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useRealtime } from '@/hooks/useRealtime'
import { useUser } from '@/hooks/useUser'
import { useGame } from '@/components/providers/GameProvider'
import { useSubmitTurn } from '@/hooks/useSubmitTurn'
import { GameLayout } from '@/components/layout/GameLayout'
import { GameMap } from '@/components/map/GameMap'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'
import { DecisionCatalog } from '@/components/panels/DecisionCatalog'
import { DecisionDetailPanel } from '@/components/panels/DecisionDetailPanel'
import { TurnPlanBuilder } from '@/components/panels/TurnPlanBuilder'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'
import { EventsTab } from '@/components/panels/EventsTab'
import type { TurnResolutionData } from '@/components/panels/EventsTab'
import { ActorControlSelector } from '@/components/game/ActorControlSelector'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'
import { ObserverOverlay } from '@/components/panels/ObserverOverlay'
import { TurnPhaseIndicator } from '@/components/game/TurnPhaseIndicator'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Tooltip } from '@/components/ui/Tooltip'
import type { DispatchLine } from '@/components/game/DispatchTerminal'
import type { ActorSummary, ActorDetail, DecisionDetail, ActionSlot } from '@/lib/types/panels'
import type { GameInitialData, ChronicleEntry } from '@/lib/types/game-init'
import { getActorColor, getRelationshipStance, isAdversaryActor, hasLimitedIntel } from '@/lib/game/actor-meta'
import { inferIntelConfidence, applyFogOfWarToActorDetail, parseIntelProfile, applyScoreNoise } from '@/lib/game/fow-panel'

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
  viewerActorId,
  onSelect,
}: {
  actors: ActorSummary[]
  actorMetrics: Record<string, { military: number; economic: number; political: number }>
  selectedActorId: string | null
  viewerActorId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border-subtle">
        {actors.map((actor) => {
          const rawMetrics = actorMetrics[actor.id]
          const isSelected = actor.id === selectedActorId
          // Recompute stance client-side if we know who the controlled actor is
          const liveStance = viewerActorId
            ? getRelationshipStance(actor.id, viewerActorId)
            : actor.relationshipStance
          const stance = STANCE_LABEL[liveStance] ?? STANCE_LABEL.neutral
          const isAdv = liveStance === 'adversary'
          const color = actor.actorColor
          // Apply deterministic estimation noise to adversary metrics.
          // Uses applyScoreNoise() from fow-panel.ts (seeded by actor ID) so the
          // believed values are stable across renders — mirroring the fixed
          // IntelligencePicture.believedX snapshot that the simulation engine carries.
          const actorSeed = actor.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
          const metrics = (rawMetrics && isAdv) ? {
            military:  applyScoreNoise(rawMetrics.military,  'unverified', actorSeed),
            economic:  applyScoreNoise(rawMetrics.economic,  'unverified', actorSeed + 1),
            political: applyScoreNoise(rawMetrics.political, 'unverified', actorSeed + 2),
          } : rawMetrics

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
                    fontFamily: isAdv ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif",
                    fontSize: 9,
                    color: isAdv ? '#6a6860' : 'rgba(229,226,225,0.4)',
                    letterSpacing: isAdv ? '0.04em' : undefined,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box' as const,
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {isAdv ? '[OBJ. CLASSIFIED]' : actor.primaryObjective}
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
                      <span className="font-mono text-2xs text-text-tertiary w-6 text-right">
                        {isAdv ? `~${value}` : value}
                      </span>
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
  const { state, dispatch } = useGame()
  const { submitTurn, isSubmitting, isComplete, error, lines: hookLines, resolutionSummary, reset: resetHook } = useSubmitTurn(scenarioId, branchId)
  const shouldSkip = useReducedMotion()
  const router = useRouter()
  const { user } = useUser()

  const actorMetrics = buildActorMetrics(initialData.actorDetails)

  // Live global indicators derived from state snapshot
  const oilPriceUsd = initialData.currentState?.global_state?.oil_price_usd ?? null
  const maxEscalationRung = Object.values(initialData.actorDetails).reduce<number>((max, d) => {
    const rung = (d as { escalationRung?: number }).escalationRung ?? 0
    return rung > max ? rung : max
  }, 0)

  const [controlledActors, setControlledActors]             = useState<string[] | null>(null)
  const [forkingBranch, setForkingBranch]                   = useState(false)
  const [activeTab, setActiveTab]                           = useState<PanelTab>('actors')
  const [showObserver, setShowObserver]                     = useState(true)
  const [omniscientMode, setOmniscientMode]                 = useState(false)
  const [selectedDecisionDetail, setSelectedDecisionDetail] = useState<DecisionDetail | null>(null)
  const [decisionPanelOpen, setDecisionPanelOpen]           = useState(false)
  const [primaryAction, setPrimaryAction]                   = useState<ActionSlot | null>(null)
  const [concurrentActions, setConcurrentActions]           = useState<ActionSlot[]>([])
  const [chronicleEntries, setChronicleEntries]             = useState<ChronicleEntry[]>(initialData.chronicle)
  const [lastTurnResolution, setLastTurnResolution]         = useState<TurnResolutionData | null>(null)
  const [cascadeAlerts, setCascadeAlerts]                   = useState<Array<{ decisionId: string; decisionTitle: string }>>([])
  const [showCascadeAlerts, setShowCascadeAlerts]           = useState(false)
  const [turnNumber, setTurnNumber]                         = useState(initialData.branch.turnNumber)
  const [turnCommitId, setTurnCommitId]                     = useState<string | null>(initialData.branch.headCommitId)
  const [dispatchLines, setDispatchLines]                   = useState<DispatchLine[]>([{
    timestamp: new Date().toISOString().slice(11, 19),
    text: `BRANCH: ${initialData.branch.name} // TURN ${String(initialData.branch.turnNumber).padStart(2, '0')} // PHASE: ${initialData.branch.isTrunk ? 'observer' : 'planning'}`,
    type: 'info',
  }])

  // ── Realtime: observer live-updates ─────────────────────────────────────────
  // In observer mode (no controlled actors), refresh server data when a new
  // turn_commits INSERT fires so chronicle + actor state update without reload.
  const isObserverMode = controlledActors === null || controlledActors.length === 0
  const { status: realtimeStatus } = useRealtime(branchId, {
    onTurnCommit: isObserverMode
      ? (payload) => {
          // Directly update client state from the realtime payload so new
          // chronicle entries appear immediately without waiting for a
          // full page re-render (router.refresh updates server components
          // but doesn't reset initialized client state).
          const rtShort = payload.chronicle_entry ?? payload.narrative_entry ?? 'Turn resolved.'
          const rtLong  = payload.narrative_entry ?? ''
          const rtDetail = payload.chronicle_entry && rtLong && rtLong.trim() !== rtShort.trim()
            ? rtLong
            : undefined
          const newEntry: ChronicleEntry = {
            turnNumber: payload.turn_number,
            date:       payload.simulated_date ?? new Date().toISOString().slice(0, 10),
            title:      payload.chronicle_headline ?? `Turn ${payload.turn_number}`,
            narrative:  rtShort,
            detail:     rtDetail,
            severity: 'major',
            tags: [],
          }
          setChronicleEntries(prev => {
            // Avoid duplicate entries if the commit was already appended locally
            const exists = prev.some(e => e.turnNumber === payload.turn_number)
            return exists ? prev : [...prev, newEntry]
          })
          setTurnNumber(payload.turn_number)
          // Also refresh server components (actor scores, branch state, etc.)
          router.refresh()
        }
      : undefined,
  })

  // Viewer identity — derived from controlledActors so both the actor list and
  // dossier slide-over use the same perspective. Null before the user chooses a
  // controlled actor (observer mode); list uses the server-rendered stance in that case.
  const componentViewerActorId: string | null = controlledActors?.[0] ?? null

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

  // Auto-append chronicle entry and build EventsTab data when turn completes
  useEffect(() => {
    if (!isComplete) return
    dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })

    const allSubmittedActions = primaryAction ? [primaryAction, ...concurrentActions] : [...concurrentActions]
    const actionTitles = allSubmittedActions.map(a => a.title)
    const actorId = controlledActors?.[0] ?? 'us'
    const actorDetail = initialData.actorDetails[actorId]

    // Build events list from server resolution summary if available, else from submitted plan
    const actorActions = resolutionSummary?.actorActions ?? allSubmittedActions.map(slot => ({
      actorId,
      actionId: slot.id,
      isPrimary: slot.id === primaryAction?.id,
    }))

    const events = actorActions.map(a => {
      const decision = initialData.decisions.find(d => d.id === a.actionId) ?? initialData.decisions.find(d => d.title === a.actionId)
      return {
        actorId: a.actorId,
        actorName: initialData.actorDetails[a.actorId]?.name ?? actorDetail?.name ?? a.actorId,
        actorColor: getActorColor(a.actorId),
        actionTitle: decision?.title ?? a.actionId,
        dimension: decision?.dimension ?? 'unknown',
      }
    })

    const resolvedTurnNumber = resolutionSummary?.turnNumber ?? turnNumber + 1
    const rawSimDate = resolutionSummary?.simulatedDate ?? null
    const simulatedDate = rawSimDate
      ? (() => {
          const d = new Date(rawSimDate)
          return isNaN(d.getTime()) ? rawSimDate : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        })()
      : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

    const headline = primaryAction
      ? `Turn ${resolvedTurnNumber} — ${primaryAction.title}`
      : `Turn ${resolvedTurnNumber} Complete`

    const escalationChanges = (resolutionSummary?.escalationChanges ?? []).map(ec => ({
      actorId: ec.actorId,
      actorName: initialData.actorDetails[ec.actorId]?.name ?? ec.actorId,
      previousRung: ec.previousRung,
      newRung: ec.newRung,
      rationale: ec.rationale,
    }))

    setLastTurnResolution({
      turnNumber: resolvedTurnNumber,
      simulatedDate,
      chronicleHeadline: headline,
      narrativeSummary: `Resolution complete. Actions executed: ${actionTitles.join(', ')}.`,
      judgeScore: resolutionSummary?.judgeScore ?? 0,
      events,
      escalationChanges,
    })

    // Surface newly-unlocked decisions from constraint cascade detection
    const cascades = resolutionSummary?.constraintCascades ?? []
    if (cascades.length > 0) {
      setCascadeAlerts(cascades.map(c => ({ decisionId: c.decisionId, decisionTitle: c.decisionTitle })))
      setShowCascadeAlerts(true)
    }

    const newEntry: ChronicleEntry = {
      turnNumber: resolvedTurnNumber,
      date: simulatedDate,
      title: headline,
      narrative: `Resolution complete. Actions executed: ${actionTitles.join(', ')}.`,
      severity: 'major',
      tags: primaryAction ? [primaryAction.dimension.charAt(0).toUpperCase() + primaryAction.dimension.slice(1)] : [],
    }
    setChronicleEntries(prev => [...prev, newEntry])

    // Reset TurnPlanBuilder immediately on completion
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
      // Refresh server components (TopBar turn counter, actor scores, branch state)
      // so the turn number in TopBar stays in sync with the indicators bar.
      router.refresh()
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
        // Pass forkTurn (current turn) and parentBranchId so the API can set
        // the correct fork_point_commit_id on the newly created branch.
        body: JSON.stringify({
          scenarioId,
          forkTurn:       turnNumber,
          parentBranchId: branchId,
        }),
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

  const handlePrevGroundTruthEvent = () => {
    if (gtIndex <= 0) return
    const newIndex = gtIndex - 1
    const commit = initialData.groundTruthCommits[newIndex]
    if (!commit) return
    setGtIndex(newIndex)
    setTurnNumber(commit.turnNumber)
    setTurnCommitId(commit.id)
    setGtHasNext(true) // always has next after going back
    setDispatchLines([{
      timestamp: new Date().toISOString().slice(11, 19),
      text: `GROUND TRUTH — TURN ${commit.turnNumber} — ${commit.simulatedDate}`,
      type: 'info',
    }])
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
      <div className="flex items-center gap-4 px-4 py-2 bg-bg-surface-dim border-b border-border-subtle font-mono text-2xs shrink-0 overflow-x-auto">
        <span className="text-text-tertiary shrink-0">OIL: <span className="text-status-critical">{oilPriceUsd !== null ? `$${oilPriceUsd}/bbl` : '—'}</span></span>
        <span className="text-text-tertiary shrink-0">
          TURN: <span className="text-text-secondary">
            {String(turnNumber).padStart(2, '0')} / {String(initialData.groundTruthCommits.length || 12).padStart(2, '0')}
          </span>
        </span>
        <span className="text-text-tertiary shrink-0">
          PHASE: <TurnPhaseIndicator phase={state.turnPhase || 'planning'} />
        </span>
        <span className="text-text-tertiary shrink-0">ESCALATION: <span className="text-status-critical">{maxEscalationRung > 0 ? `RUNG ${maxEscalationRung}` : '—'}</span></span>
        {/* User actor assignment — shows when user has chosen an actor to control */}
        {componentViewerActorId && (
          <span className="text-text-tertiary shrink-0 ml-auto">
            PLAYING:{' '}
            <span className="text-gold">
              {initialData.actors.find(a => a.id === componentViewerActorId)?.shortName ?? componentViewerActorId.toUpperCase()}
            </span>
            {user?.email && (
              <span className="text-text-tertiary ml-1">
                [{user.email.split('@')[0]?.toUpperCase()}]
              </span>
            )}
          </span>
        )}
        {/* Realtime connection status — visible in observer mode */}
        {isObserverMode && (
          <span className={`shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] ${
            componentViewerActorId ? '' : 'ml-auto'
          } ${
            realtimeStatus === 'connected'    ? 'text-status-stable'   :
            realtimeStatus === 'error'        ? 'text-status-critical' :
            realtimeStatus === 'disconnected' ? 'text-text-tertiary'   :
            'text-text-tertiary animate-pulse'
          }`}>
            {realtimeStatus === 'connected'    ? '● LIVE'         :
             realtimeStatus === 'error'        ? '● RT ERROR'     :
             realtimeStatus === 'disconnected' ? '○ OFFLINE'      :
             '○ CONNECTING'}
          </span>
        )}
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

          {/* Footer: constraint cascade alerts + completion return button or error dismiss */}
          {!isSubmitting && (isComplete || !!error) && (
            <div className="shrink-0 border-t border-border-subtle bg-bg-surface-dim">
              {/* Constraint cascade alert banner */}
              {isComplete && showCascadeAlerts && cascadeAlerts.length > 0 && (
                <div className="px-4 py-3 border-b border-[#2a3a1f] bg-[#0f1a0a]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#6ab04c]">
                      ● {cascadeAlerts.length} DECISION{cascadeAlerts.length > 1 ? 'S' : ''} NEWLY UNLOCKED
                    </span>
                    <button
                      onClick={() => setShowCascadeAlerts(false)}
                      className="font-mono text-[9px] text-text-tertiary hover:text-text-secondary"
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {cascadeAlerts.map(c => (
                      <li key={c.decisionId} className="font-mono text-[10px] text-[#9fd36e] flex items-center gap-1.5">
                        <span className="text-[#6ab04c]">→</span>
                        {c.decisionTitle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-4">
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
              .filter(({ id }) => !(isGtMode && id === 'decisions') && !(omniscientMode && id === 'decisions'))
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
                viewerActorId={componentViewerActorId}
                onSelect={(id) => dispatch({ type: 'SELECT_ACTOR', payload: id })}
              />
            )}
            {activeTab === 'decisions' && !isGtMode && !omniscientMode && (
              <DecisionCatalog
                decisions={initialData.decisions}
                onSelect={handleDecisionSelect}
                selectedPrimaryId={primaryAction?.id ?? null}
                selectedConcurrentIds={concurrentActions.map(a => a.id)}
              />
            )}
            {activeTab === 'events' && (
              <EventsTab resolution={lastTurnResolution} />
            )}
            {activeTab === 'chronicle' && (
              <ChronicleTimeline entries={chronicleEntries} />
            )}
          </div>

          {/* Turn plan builder — fixed at bottom when on decisions tab (not in GT mode, not in omniscient) */}
          {activeTab === 'decisions' && !isGtMode && !omniscientMode && (
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

          {/* PREV / NEXT EVENT / FORK — ground truth observer navigation */}
          {isGtMode && (
            <div className="shrink-0 px-3 pt-2 flex gap-2">
              {/* Back button — visible once at least one step has been taken */}
              <button
                onClick={handlePrevGroundTruthEvent}
                disabled={gtIndex <= 0}
                className="py-2 px-3 font-mono text-xs border border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-hi transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                title="Previous turn"
              >
                ← PREV
              </button>

              {gtHasNext ? (
                <Tooltip content="Step forward to the next resolved turn in the Ground Truth timeline." placement="top" maxWidth={200} display="flex">
                  <button
                    onClick={handleNextGroundTruthEvent}
                    disabled={gtLoading}
                    className="flex-1 py-2 font-mono text-xs font-semibold bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {gtLoading ? 'LOADING…' : 'NEXT EVENT →'}
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content="Create a diverging timeline from this turn. You take control and make decisions independently from the Ground Truth." placement="top" maxWidth={220} display="flex">
                  <button
                    onClick={() => void handleForkNewBranch()}
                    disabled={forkingBranch}
                    className="flex-1 py-2 font-mono text-xs font-semibold border border-gold text-gold hover:bg-gold hover:text-bg-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forkingBranch ? 'CREATING BRANCH…' : 'FORK NEW BRANCH →'}
                  </button>
                </Tooltip>
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

      {/* Actor dossier slide-over — apply FOW transformation client-side so that
          viewerActorId reflects the actual controlled actor (not the server default).
          The server pre-populates all fields; the client re-derives stance, isAdversary,
          hasLimitedIntel, and intelConfidence, then applies actual field redaction via
          applyFogOfWarToActorDetail() — mirroring the simulation engine's IntelligencePicture logic. */}
      {selectedActorDetail && (() => {
        const viewerActorId = controlledActors?.[0] ?? 'us'
        const viewerIntelProfile = parseIntelProfile(
          (initialData.actorDetails[viewerActorId]?.intelligenceProfile ?? null) as Record<string, unknown> | null
        )
        const stance          = getRelationshipStance(selectedActorDetail.id, viewerActorId)
        const isAdv           = isAdversaryActor(selectedActorDetail.id, viewerActorId)
        const limitedIntel    = hasLimitedIntel(selectedActorDetail.id, viewerActorId)
        const intelConfidence = inferIntelConfidence(viewerIntelProfile, stance)

        // Omniscient mode: bypass fog-of-war entirely — show all intel as confirmed
        const fowActor = omniscientMode
          ? applyFogOfWarToActorDetail({
              ...selectedActorDetail,
              viewerActorId: selectedActorDetail.id, // view as self = full intel
              relationshipStance: 'ally' as const,
              isAdversary:     false,
              hasLimitedIntel: false,
              intelConfidence: 'high' as const,
            })
          : applyFogOfWarToActorDetail({
              ...selectedActorDetail,
              viewerActorId,
              relationshipStance: stance,
              isAdversary:     isAdv,
              hasLimitedIntel: limitedIntel,
              intelConfidence,
            })

        return (
          <ActorDetailPanel
            actor={fowActor}
            open={!!selectedActorDetail}
            onClose={() => dispatch({ type: 'SELECT_ACTOR', payload: null })}
          />
        )
      })()}

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
        actors={initialData.actors}
        perspectiveActorId={componentViewerActorId}
        omniscientMode={omniscientMode}
        onChangePerspective={(actorId) => {
          // Switching perspective changes the *viewer* but never nullifies controlledActors
          // (null = actor not yet chosen; we never revert to the actor-picker from inside a session)
          if (actorId) setControlledActors([actorId])
        }}
        onToggleOmniscient={() => setOmniscientMode(prev => !prev)}
      />
    </>
  )
}
