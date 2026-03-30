'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

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
const PANEL_W    = 284

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
  const { node } = state
  const [selectedActor, setSelectedActor] = useState<string>(
    node.controlledActor
      ? (actors.find(a => a.name === node.controlledActor)?.id ?? 'observer')
      : 'observer'
  )

  // Clamp panel so it stays within the container horizontally
  const clampedLeft = Math.min(Math.max(state.panelLeft, 0), Math.max(containerWidth - PANEL_W - 8, 0))

  const borderColor = node.isTrunk ? GOLD : (node.status === 'archived' ? '#3a3a3a' : BRANCH_DIM)

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
        <span className="font-label text-[11px] font-semibold uppercase tracking-[0.05em] text-text-primary leading-tight">
          {node.name}
        </span>
        <button
          onClick={onClose}
          className="font-mono text-[11px] text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-1">
        <MetaRow label="TURN" value={`${String(node.headTurn).padStart(2, '0')} / ${String(node.totalTurns).padStart(2, '0')}`} />
        <MetaRow label="LAST ACTIVE" value={node.lastPlayedAt} />
        <MetaRow
          label="STATUS"
          value={node.isTrunk ? 'GROUND TRUTH' : node.status.toUpperCase()}
          valueColor={node.isTrunk ? GOLD : (node.status === 'active' ? '#7ab87a' : '#5a5a5a')}
        />
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

function ActorChip({ id, label, selected, onSelect }: { id: string; label: string; selected: boolean; onSelect: () => void }) {
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
    (e: React.MouseEvent, node: BranchNode, row: number) => {
      e.stopPropagation()
      if (panel?.node.id === node.id) { setPanel(null); return }
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      // Position panel just below the click point, relative to the container
      const panelLeft = e.clientX - rect.left - 20
      const panelTop  = e.clientY - rect.top  + 14
      setPanel({ node, panelLeft, panelTop })
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
          {/* ── Turn number labels ── */}
          {Array.from({ length: root.totalTurns }, (_, i) => {
            const t = i + 1
            const x = turnX(t)
            const resolved = t <= root.headTurn
            return (
              <text
                key={`lbl-${t}`}
                x={x} y={16}
                textAnchor="middle"
                fontFamily="'IBM Plex Mono', monospace"
                fontSize={9}
                fill={resolved ? 'rgba(255,186,32,0.6)' : 'rgba(255,255,255,0.12)'}
                letterSpacing="0.08em"
              >
                T{String(t).padStart(2, '0')}
              </text>
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
            return (
              <g key={`tn-${t}`} data-node="1">
                {resolved ? (
                  <circle cx={x} cy={trunkY} r={isHead ? TRUNK_R + 1 : TRUNK_R}
                    fill={isHead ? GOLD : '#0d0d0d'}
                    stroke={GOLD} strokeWidth={isHead ? 2.5 : 2}
                    style={{ cursor: 'pointer' }}
                    onClick={e => handleNodeClick(e, root, 0)}
                  />
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

            // headTurn must be >= forkTurn (absolute turn semantics)
            const safeHeadTurn = Math.max(node.headTurn, node.forkTurn)
            const headX = turnX(safeHeadTurn)

            const isActive     = node.status === 'active'
            const lineColor    = isActive ? BRANCH_DIM : ARCHIVED
            const strokeColor  = isActive ? '#ffba20' : '#3a3a3a'

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
                  cx={headX} cy={branchY} r={BRANCH_R}
                  fill={isActive ? '#0d0d0d' : '#141414'}
                  stroke={strokeColor} strokeWidth={isActive ? 2 : 1.5}
                  style={{ cursor: 'pointer' }}
                  data-node="1"
                  onClick={e => handleNodeClick(e, node, row)}
                />

                {/* Pulse ring on active head nodes */}
                {isActive && (
                  <circle cx={headX} cy={branchY} r={BRANCH_R + 4}
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
