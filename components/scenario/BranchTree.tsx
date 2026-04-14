'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Scenario-state snapshot for a single actor at a given turn */
export interface ActorSnapshot {
  actorId: string
  actorName: string
  /** Escalation rung 1 (ceasefire) → 10 (full-scale war) */
  escalationRung: number
  /** Military readiness score 0–100 */
  military: number
  /** Economic stability score 0–100 */
  economic: number
  /** Political cohesion score 0–100 */
  political: number
}

/** Per-turn event data for trunk / branch nodes */
export interface TurnData {
  turn: number
  /** Human-readable in-world date, e.g. "Apr 1 2025" */
  date?: string
  /** Chronicle headline / event label for this turn */
  label?: string
  /** Visual significance tier */
  significance: 'high' | 'medium' | 'low'
  /** Actor-level state snapshot at this turn */
  actorSnapshots?: ActorSnapshot[]
}

/**
 * All turn values are ABSOLUTE (1-indexed global turn number).
 * Invariant: headTurn >= forkTurn for every non-trunk node.
 */
export interface BranchNode {
  id: string
  name: string
  isTrunk: boolean
  status: 'active' | 'archived'
  /** The absolute turn index on the PARENT branch at which this branch diverges. 0 for trunk root. */
  forkTurn: number
  /** The absolute turn index of the current head of this branch. Must be >= forkTurn. */
  headTurn: number
  totalTurns: number
  lastPlayedAt: string
  controlledActor: string | null
  children: BranchNode[]
  /** ISO date string for the in-world date of the head turn */
  turnDate?: string
  /** Whether this branch head represents an actor action or a response */
  nodeType?: 'action' | 'response'
  /** Escalation direction relative to parent branch */
  escalationDirection?: 'up' | 'down' | 'lateral'
  /** Number of cached alternate responses available at this node */
  cachedAlternates?: number
  /** Per-turn event data (for trunk: all resolved turns; for branches: at least the head) */
  turns?: TurnData[]
}

export interface ActorOption {
  id: string
  name: string
  flag: string
}

interface Props {
  root: BranchNode
  scenarioId: string
  actors: ActorOption[]
}

// ─── Layout constants ────────────────────────────────────────────────────────

const STEP_X     = 88    // px per turn slot
const ROW_HEIGHT = 66    // px per lane
const PAD_X      = 36    // left/right SVG padding
const PAD_TOP    = 40    // top padding (turn labels)
const PAD_BOTTOM = 24
const TRUNK_R    = 7
const BRANCH_R   = 5
const GOLD       = '#ffba20'
const GOLD_DIM   = 'rgba(255,186,32,0.28)'
const BRANCH_DIM = '#5a4f32'
const ARCHIVED   = '#2e2e2e'
const LINE_GREY  = '#2a2a2a'
const PANEL_W    = 300

// Significance-based styling
const SIG_HIGH_FILL   = '#2a0a0a'
const SIG_HIGH_STROKE = '#e74c3c'
const SIG_HIGH_R      = TRUNK_R + 4
const SIG_MED_R       = TRUNK_R + 1
const SIG_MED_STROKE  = '#e8a020'

// ─── Layout helpers ──────────────────────────────────────────────────────────

interface LayoutRow {
  node: BranchNode
  parentId: string | null
  row: number
}

function flattenTree(root: BranchNode): LayoutRow[] {
  const result: LayoutRow[] = []
  let rowIdx = 0
  function traverse(node: BranchNode, parentId: string | null) {
    result.push({ node, parentId, row: rowIdx })
    rowIdx++
    for (const child of node.children) traverse(child, node.id)
  }
  traverse(root, null)
  return result
}

function turnX(turn: number) {
  return PAD_X + (turn - 1) * STEP_X
}

function rowY(row: number) {
  return PAD_TOP + row * ROW_HEIGHT
}

// ─── Panel state ─────────────────────────────────────────────────────────────

interface PanelState {
  node: BranchNode
  /** Left edge of panel, relative to the outer container div (scroll-independent) */
  panelLeft: number
  /** Top edge of panel, relative to the outer container div */
  panelTop: number
  /** When clicking a specific trunk turn, the per-turn event data */
  activeTurn?: TurnData
}

// ─── Node info panel ─────────────────────────────────────────────────────────

function NodePanel({
  state,
  actors,
  scenarioId,
  containerWidth,
  onClose,
}: {
  state: PanelState
  actors: ActorOption[]
  scenarioId: string
  containerWidth: number
  onClose: () => void
}) {
  const router = useRouter()
  const { node, activeTurn } = state
  const [selectedActor, setSelectedActor] = useState<string>(
    node.controlledActor
      ? (actors.find(a => a.name === node.controlledActor)?.id ?? 'observer')
      : 'observer'
  )

  // Clamp panel so it stays within the container horizontally
  const clampedLeft = Math.min(Math.max(state.panelLeft, 0), Math.max(containerWidth - PANEL_W - 8, 0))

  const borderColor = node.isTrunk ? GOLD : (node.status === 'archived' ? '#3a3a3a' : BRANCH_DIM)

  // Resolve display values: prefer turn-specific data when available
  const displayDate = activeTurn?.date ?? (
    node.turnDate
      ? new Date(node.turnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : undefined
  )
  const displayTurn = activeTurn?.turn ?? node.headTurn
  const eventLabel  = activeTurn?.label
  const sigLevel    = activeTurn?.significance

  function handleEnter() {
    const actorParam = selectedActor !== 'observer' ? `?actor=${selectedActor}` : ''
    router.push(`/scenarios/${scenarioId}/play/${node.id}${actorParam}`)
  }

  return (
    <div
      data-panel="1"
      className="absolute z-20 p-4 flex flex-col gap-3"
      style={{
        top: state.panelTop,
        left: clampedLeft,
        width: PANEL_W,
        background: '#0d0d0d',
        border: '1px solid #1a1a1a',
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary">
            {node.isTrunk ? '● GROUND TRUTH' : `⎇ ${node.name}`}
          </span>
          <span className="font-label text-[11px] font-semibold uppercase tracking-[0.05em] text-text-primary leading-tight">
            T{String(displayTurn).padStart(2, '0')}
            {displayDate ? ` — ${displayDate}` : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-[11px] text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Event label (chronicle headline) */}
      {eventLabel && (
        <div
          style={{
            fontSize: 10,
            color: sigLevel === 'high' ? '#e74c3c' : GOLD,
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1.5,
            letterSpacing: '0.02em',
            borderLeft: `2px solid ${sigLevel === 'high' ? '#e74c3c44' : GOLD_DIM}`,
            paddingLeft: 8,
          }}
        >
          {eventLabel}
        </div>
      )}

      {/* Significance badge */}
      {sigLevel && sigLevel !== 'low' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            padding: '1px 6px',
            fontSize: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: "'IBM Plex Mono', monospace",
            color: sigLevel === 'high' ? '#e74c3c' : '#e8a020',
            background: sigLevel === 'high' ? 'rgba(231,76,60,0.12)' : 'rgba(232,160,32,0.12)',
            border: `1px solid ${sigLevel === 'high' ? '#e74c3c44' : '#e8a02044'}`,
          }}>
            {sigLevel === 'high' ? '⚠ HIGH SIGNIFICANCE' : 'NOTABLE EVENT'}
          </span>
        </div>
      )}

      {/* Actor state snapshots at this turn */}
      {activeTurn?.actorSnapshots && activeTurn.actorSnapshots.length > 0 && (
        <div style={{ borderTop: '1px solid #1c1c1c', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>
            SCENARIO STATE — T{String(displayTurn).padStart(2, '0')}
          </span>
          {activeTurn.actorSnapshots.map(snap => (
            <ActorStateRow key={snap.actorId} snap={snap} />
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-col gap-1">
        {/* Node type badge + escalation direction */}
        {(node.nodeType || node.escalationDirection) && (
          <div className="flex items-center" style={{ marginBottom: 4 }}>
            {node.nodeType && (
              <span style={{
                padding: '1px 5px', borderRadius: 2, fontSize: 8,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: node.nodeType === 'action' ? '#5dade2' : '#f39c12',
                background: node.nodeType === 'action' ? 'rgba(41,128,185,0.15)' : 'rgba(230,126,34,0.15)',
                border: `1px solid ${node.nodeType === 'action' ? '#2980b944' : '#e67e2244'}`,
                marginRight: 6,
              }}>
                {node.nodeType.toUpperCase()}
              </span>
            )}
            {node.escalationDirection && (
              <span style={{
                fontSize: 10,
                color: node.escalationDirection === 'up' ? '#e74c3c' : node.escalationDirection === 'down' ? '#2ecc71' : '#f39c12',
              }}>
                {node.escalationDirection === 'up' ? '↑ ESCALATING' : node.escalationDirection === 'down' ? '↓ DE-ESCALATING' : '→ STABLE'}
              </span>
            )}
          </div>
        )}

        <MetaRow label="TURN" value={`${String(displayTurn).padStart(2, '0')} / ${String(node.totalTurns).padStart(2, '0')}`} />
        <MetaRow
          label="STATUS"
          value={node.isTrunk ? 'GROUND TRUTH' : node.status.toUpperCase()}
          valueColor={node.isTrunk ? GOLD : (node.status === 'active' ? '#7ab87a' : '#5a5a5a')}
        />

        {/* Cached alternates count */}
        {(node.cachedAlternates ?? 0) > 0 && (
          <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
            {node.cachedAlternates}{node.cachedAlternates !== 1 ? ' alternates' : ' alternate'}{' cached'}
          </div>
        )}
      </div>

      {/* Actor selector (not shown for trunk) */}
      {!node.isTrunk && (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary">
            SELECT ACTOR
          </span>
          <div className="flex flex-wrap gap-1">
            <ActorChip id="observer" label="OBS" selected={selectedActor === 'observer'} onSelect={() => setSelectedActor('observer')} />
            {actors.map(a => (
              <ActorChip key={a.id} id={a.id} label={a.flag} selected={selectedActor === a.id} onSelect={() => setSelectedActor(a.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Enter CTA */}
      <button
        onClick={handleEnter}
        className="w-full font-mono text-[11px] uppercase tracking-[0.08em] py-2 transition-colors"
        style={{ background: 'rgba(255,186,32,0.10)', border: '1px solid rgba(255,186,32,0.35)', color: GOLD }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,186,32,0.18)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,186,32,0.10)' }}
      >
        ENTER SIMULATION →
      </button>
    </div>
  )
}

function MetaRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-tertiary">{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.04em]" style={{ color: valueColor ?? 'var(--text-secondary)' }}>
        {value}
      </span>
    </div>
  )
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 1 }} />
    </div>
  )
}

function ActorStateRow({ snap }: { snap: ActorSnapshot }) {
  const rungColor = snap.escalationRung >= 8 ? '#e74c3c' : snap.escalationRung >= 6 ? '#e8a020' : '#2ecc71'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {snap.actorName}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: rungColor, letterSpacing: '0.04em' }}>
          RUNG {snap.escalationRung}/10
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: '#444', width: 18 }}>MIL</span>
        <MiniBar value={snap.military} color="#5dade2" />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: '#444', width: 18 }}>ECO</span>
        <MiniBar value={snap.economic} color="#2ecc71" />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: '#444', width: 18 }}>POL</span>
        <MiniBar value={snap.political} color="#e8a020" />
      </div>
    </div>
  )
}

function ActorChip({ id: _id, label, selected, onSelect }: { id: string; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="font-mono text-[9px] px-2 py-0.5 border uppercase tracking-[0.04em] transition-colors"
      style={
        selected
          ? { color: GOLD, background: 'rgba(255,186,32,0.12)', borderColor: 'rgba(255,186,32,0.5)' }
          : { color: 'var(--text-tertiary)', background: 'transparent', borderColor: '#2a2a2a' }
      }
    >
      {label}
    </button>
  )
}

// ─── Main BranchTree component ───────────────────────────────────────────────

export function BranchTree({ root, scenarioId, actors }: Props) {
  const shouldSkip = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<PanelState | null>(null)

  const rows = flattenTree(root)
  const maxRow = rows.length - 1
  const svgW = PAD_X * 2 + (root.totalTurns - 1) * STEP_X
  const svgH = PAD_TOP + (maxRow + 1) * ROW_HEIGHT + PAD_BOTTOM

  const rowById = Object.fromEntries(rows.map(r => [r.node.id, r]))

  /**
   * Compute panel position from the mouse click event.
   * Uses clientX/clientY + container bounding rect to stay scroll-aware.
   */
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, node: BranchNode, _row: number, activeTurn?: TurnData) => {
      e.stopPropagation()
      if (panel?.node.id === node.id && panel?.activeTurn?.turn === activeTurn?.turn) {
        setPanel(null)
        return
      }
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const panelLeft = e.clientX - rect.left - 20
      const panelTop  = e.clientY - rect.top  + 14
      setPanel({ node, panelLeft, panelTop, activeTurn })
    },
    [panel]
  )

  function closePanel() { setPanel(null) }

  const trunkY = rowY(0)

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={e => {
        const target = e.target as HTMLElement
        if (!target.closest('[data-panel]') && !target.closest('[data-node]')) closePanel()
      }}
    >
      {/* Horizontally scrollable SVG */}
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ background: '#080808', border: '1px solid #1a1a1a' }}
      >
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: 'block', minWidth: svgW }}
        >
          {/* ── Turn number + date labels ── */}
          {Array.from({ length: root.totalTurns }, (_, i) => {
            const t = i + 1
            const x = turnX(t)
            const resolved = t <= root.headTurn
            const td = root.turns?.find(d => d.turn === t)
            return (
              <g key={`lbl-${t}`}>
                <text
                  x={x} y={16}
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={9}
                  fill={resolved ? 'rgba(255,186,32,0.6)' : 'rgba(255,255,255,0.12)'}
                  letterSpacing="0.08em"
                >
                  T{String(t).padStart(2, '0')}
                </text>
                {td?.date && resolved && (
                  <text
                    x={x} y={28}
                    textAnchor="middle"
                    fontFamily="'IBM Plex Mono', monospace"
                    fontSize={7}
                    fill="rgba(255,186,32,0.35)"
                    letterSpacing="0.04em"
                  >
                    {td.date}
                  </text>
                )}
              </g>
            )
          })}

          {/* ── Trunk background line (full span, dim) ── */}
          <line x1={turnX(1)} y1={trunkY} x2={turnX(root.totalTurns)} y2={trunkY}
            stroke={LINE_GREY} strokeWidth={1.5} />

          {/* ── Trunk gold resolved segment ── */}
          <line x1={turnX(1)} y1={trunkY} x2={turnX(root.headTurn)} y2={trunkY}
            stroke={GOLD} strokeWidth={3}
            style={shouldSkip ? undefined : {
              strokeDasharray: (root.headTurn - 1) * STEP_X,
              strokeDashoffset: (root.headTurn - 1) * STEP_X,
              animation: 'drawLine 0.8s ease-out 0.1s forwards',
            }}
          />

          {/* ── Trunk nodes ── */}
          {Array.from({ length: root.totalTurns }, (_, i) => {
            const t = i + 1
            const x = turnX(t)
            const resolved = t <= root.headTurn
            const isHead = t === root.headTurn
            const td = root.turns?.find(d => d.turn === t)
            const sig = td?.significance ?? 'low'

            // Significance-based sizing and color
            const nodeR      = sig === 'high' ? SIG_HIGH_R : sig === 'medium' ? SIG_MED_R : (isHead ? TRUNK_R + 1 : TRUNK_R)
            const nodeStroke = sig === 'high' ? SIG_HIGH_STROKE : sig === 'medium' ? SIG_MED_STROKE : GOLD
            const nodeFill   = sig === 'high' ? SIG_HIGH_FILL : '#0d0d0d'

            return (
              <g key={`tn-${t}`} data-node="1">
                {resolved ? (
                  <>
                    <circle cx={x} cy={trunkY} r={nodeR}
                      fill={isHead ? (sig === 'high' ? SIG_HIGH_STROKE : GOLD) : nodeFill}
                      stroke={nodeStroke} strokeWidth={isHead ? 2.5 : sig !== 'low' ? 2.5 : 2}
                      style={{ cursor: 'pointer' }}
                      onClick={e => handleNodeClick(e, root, 0, td)}
                    />
                    {/* Significance indicator dot for high events */}
                    {sig === 'high' && !isHead && (
                      <circle cx={x + nodeR - 2} cy={trunkY - nodeR + 2} r={3}
                        fill={SIG_HIGH_STROKE}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    {/* On-tree event label: truncated headline below high/medium nodes */}
                    {td?.label && sig !== 'low' && (
                      <text
                        x={x} y={trunkY + nodeR + 10}
                        textAnchor="middle"
                        fontFamily="'IBM Plex Mono', monospace"
                        fontSize={6}
                        fill={sig === 'high' ? 'rgba(231,76,60,0.7)' : 'rgba(232,160,32,0.55)'}
                        letterSpacing="0.02em"
                        style={{ pointerEvents: 'none' }}
                      >
                        {td.label.length > 22 ? td.label.slice(0, 20) + '…' : td.label}
                      </text>
                    )}
                  </>
                ) : (
                  <circle cx={x} cy={trunkY} r={TRUNK_R - 2}
                    fill="none" stroke="rgba(255,186,32,0.12)"
                    strokeWidth={1} strokeDasharray="3 2"
                  />
                )}
              </g>
            )
          })}

          {/* ── Trunk head pulse ring ── */}
          <circle cx={turnX(root.headTurn)} cy={trunkY} r={TRUNK_R + 5}
            fill="none" stroke={GOLD_DIM} strokeWidth={1}
            style={shouldSkip ? { opacity: 0.4 } : { animation: 'pulseRing 2.4s ease-out infinite' }}
          />

          {/* ── Branch lanes ── */}
          {rows.filter(r => !r.node.isTrunk).map(({ node, parentId, row }) => {
            const parentRow = parentId ? rowById[parentId] : null
            const parentRowIndex = parentRow?.row ?? 0
            const parentRowY = rowY(parentRowIndex)

            const forkX   = turnX(node.forkTurn)
            const branchY = rowY(row)

            const safeHeadTurn = Math.max(node.headTurn, node.forkTurn)
            const headX = turnX(safeHeadTurn)

            const isActive     = node.status === 'active'
            const lineColor    = isActive ? BRANCH_DIM : ARCHIVED
            const strokeColor  = isActive ? '#ffba20' : '#3a3a3a'

            // Head turn significance for branch node
            const headTd   = node.turns?.find(d => d.turn === safeHeadTurn)
            const headSig  = headTd?.significance ?? 'low'
            const bNodeR   = headSig === 'high' ? BRANCH_R + 3 : headSig === 'medium' ? BRANCH_R + 1 : BRANCH_R

            return (
              <g key={node.id}>
                {/* Vertical dashed connector from parent row down to this lane */}
                <line
                  x1={forkX} y1={parentRowY + TRUNK_R}
                  x2={forkX} y2={branchY}
                  stroke={lineColor} strokeWidth={1.5} strokeDasharray="4 3"
                />

                {/* Horizontal branch line from fork to head */}
                {headX > forkX && (
                  <line
                    x1={forkX} y1={branchY}
                    x2={headX} y2={branchY}
                    stroke={lineColor} strokeWidth={1.5}
                  />
                )}

                {/* Fork marker on parent line */}
                <circle cx={forkX} cy={parentRowY} r={3} fill={lineColor} />

                {/* Branch name label */}
                <text
                  x={forkX + 6} y={branchY - 7}
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={8}
                  fill={isActive ? 'rgba(255,186,32,0.5)' : 'rgba(255,255,255,0.2)'}
                  letterSpacing="0.04em"
                >
                  {node.name}
                </text>

                {/* Head node (clickable) */}
                <circle
                  cx={headX} cy={branchY} r={bNodeR}
                  fill={isActive ? '#0d0d0d' : '#141414'}
                  stroke={headSig === 'high' ? SIG_HIGH_STROKE : strokeColor}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ cursor: 'pointer' }}
                  data-node="1"
                  onClick={e => handleNodeClick(e, node, row, headTd)}
                />

                {/* Pulse ring on active head nodes */}
                {isActive && (
                  <circle cx={headX} cy={branchY} r={bNodeR + 4}
                    fill="none" stroke={GOLD_DIM} strokeWidth={1}
                    style={shouldSkip ? { opacity: 0.4 } : { animation: 'pulseRing 2s ease-out infinite' }}
                  />
                )}

                {/* Turn number inside branch head node */}
                <text
                  x={headX} y={branchY + 3.5}
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={7}
                  fill={isActive ? GOLD : '#555'}
                  style={{ pointerEvents: 'none' }}
                >
                  {safeHeadTurn}
                </text>
              </g>
            )
          })}
        </svg>

        {/* CSS keyframe animations */}
        <style>{`
          @keyframes pulseRing {
            0%   { opacity: 0.7; }
            100% { opacity: 0; }
          }
          @keyframes drawLine {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>

      {/* ── Inline node info panel ── */}
      {panel && (
        <NodePanel
          state={panel}
          actors={actors}
          scenarioId={scenarioId}
          containerWidth={containerRef.current?.clientWidth ?? 800}
          onClose={closePanel}
        />
      )}
    </div>
  )
}
