'use client'
import { useEffect, useRef } from 'react'
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

export function DispatchTerminal({ lines, isRunning }: Props) {
  const endRef      = useRef<HTMLDivElement>(null)
  const shouldSkip  = useReducedMotion()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  return (
    <div className="min-h-[400px] p-4 bg-bg-surface-dim border border-border-subtle font-mono overflow-y-auto">
      {lines.map((line, i) => (
        <motion.div
          key={`${line.timestamp}-${i}`}
          data-line-type={line.type}
          className={`flex gap-2 text-2xs mb-[2px] ${lineTypeClass[line.type]}`}
          initial={shouldSkip ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0 }}
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
  )
}
