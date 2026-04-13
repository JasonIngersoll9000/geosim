'use client'
import { useEffect, useRef, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type LineType = 'default' | 'critical' | 'confirmed' | 'info' | 'stable'

export interface DispatchLine {
  timestamp: string
  text: string
  type: LineType
}

interface Props {
  lines: DispatchLine[]
  isRunning: boolean
}

const lineTypeClass: Record<LineType, string> = {
  default:   'text-text-secondary',
  critical:  'text-status-critical',
  confirmed: 'text-gold',
  info:      'text-status-info',
  stable:    'text-status-stable',
}

type ResolutionPhase = 'planning' | 'resolving' | 'judging' | 'narrating' | 'complete'

const PHASES: Array<{ id: ResolutionPhase; label: string }> = [
  { id: 'planning',   label: 'PLANNING'   },
  { id: 'resolving',  label: 'RESOLVING'  },
  { id: 'judging',    label: 'JUDGING'    },
  { id: 'narrating',  label: 'NARRATING'  },
]

function detectPhase(lines: DispatchLine[]): ResolutionPhase {
  const allText = lines.map(l => l.text.toLowerCase()).join(' ')
  if (
    allText.includes('turn') && allText.includes('complete') &&
    (allText.includes('chronicle') || allText.includes('narrat') || allText.includes('briefing') || allText.includes('awaiting next'))
  ) return 'complete'
  if (allText.includes('judg') || allText.includes('plausibility') || allText.includes('rationality') || allText.includes('score')) return 'judging'
  if (
    allText.includes('resolution phase') || allText.includes('applying effects') ||
    allText.includes('executing') || allText.includes('outcome narrative') ||
    allText.includes('operational parameters') || allText.includes('threshold')
  ) return 'resolving'
  return 'planning'
}

export function DispatchTerminal({ lines, isRunning }: Props) {
  const endRef     = useRef<HTMLDivElement>(null)
  const shouldSkip = useReducedMotion()

  const phase = useMemo(() => detectPhase(lines), [lines])

  const phaseIndex = phase === 'complete'
    ? PHASES.length
    : PHASES.findIndex(p => p.id === phase)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  return (
    <div className="flex flex-col h-full bg-bg-surface-dim border border-border-subtle overflow-hidden">
      {/* Phase progress bar */}
      <div className="shrink-0 border-b border-border-subtle bg-bg-surface-dim px-4 py-2">
        <div className="flex items-center gap-1">
          {PHASES.map((p, i) => {
            const isActive    = phaseIndex === i
            const isCompleted = phaseIndex > i
            return (
              <div key={p.id} className="flex items-center gap-1 flex-1">
                <div className="flex flex-col items-center gap-0.5 flex-1">
                  <div
                    className={`h-[2px] w-full transition-all duration-500 ${
                      isCompleted
                        ? 'bg-gold'
                        : isActive
                        ? 'bg-status-info'
                        : 'bg-border-subtle'
                    }`}
                  />
                  <span className={`font-mono text-[7px] uppercase tracking-[0.1em] transition-colors ${
                    isCompleted
                      ? 'text-gold'
                      : isActive
                      ? 'text-status-info'
                      : 'text-text-tertiary'
                  }`}>
                    {p.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <span className={`font-mono text-[7px] shrink-0 transition-colors ${
                    isCompleted ? 'text-gold' : 'text-border-subtle'
                  }`}>›</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-4 font-mono">
        {lines.map((line, i) => (
          <motion.div
            key={`${line.timestamp}-${i}`}
            data-line-type={line.type}
            className={`flex gap-2 text-2xs mb-[2px] ${lineTypeClass[line.type]}`}
            initial={shouldSkip ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0, delay: shouldSkip ? 0 : i * 0.04 }}
          >
            <span className="text-text-tertiary shrink-0">[{line.timestamp}]</span>
            <span>{line.text}</span>
          </motion.div>
        ))}
        {isRunning && (
          <div data-cursor className="text-gold text-2xs cursor-blink mt-1">▋</div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
