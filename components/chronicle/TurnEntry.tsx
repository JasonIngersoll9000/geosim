'use client'
import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Severity = 'critical' | 'major' | 'moderate' | 'minor'

interface EntryData {
  turnNumber: number
  date: string
  title: string
  narrative: string
  severity: Severity
  tags: string[]
  detail?: string
}

const severityBorderClass: Record<Severity, string> = {
  critical: 'border-l-status-critical',
  major:    'border-l-gold',
  moderate: 'border-l-status-stable',
  minor:    'border-l-border-hi',
}

export function TurnEntry({ entry }: { entry: EntryData }) {
  const [expanded, setExpanded] = useState(false)
  const shouldSkip = useReducedMotion()

  return (
    <motion.div
      data-severity={entry.severity}
      className={`pl-3 mb-7 border-l-2 ${severityBorderClass[entry.severity]}`}
      initial={shouldSkip ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="font-mono text-[8px] uppercase tracking-[0.06em] mb-1 text-text-tertiary">
        <span>Turn {entry.turnNumber} — </span><span>{entry.date}</span>
      </div>
      <div className="font-label font-bold text-[13px] uppercase tracking-[0.04em] mb-2 text-text-primary">
        {entry.title}
      </div>
      <div className="font-serif italic text-[13px] leading-[1.75] text-text-secondary">
        {entry.narrative}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {entry.tags.map(tag => (
          <span key={tag} className="font-mono text-[9px] px-[7px] py-[2px] bg-bg-surface-high text-text-secondary border border-border-subtle">
            {tag}
          </span>
        ))}
      </div>
      {entry.detail && (
        <div className="mt-2 border border-border-subtle">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex justify-between items-center px-3 py-2 font-mono text-[11px] transition-colors text-status-info"
            aria-expanded={expanded}
          >
            <span>Detail</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
          <div className={`chronicle-detail${expanded ? ' open' : ''}`}>
            <div className="px-3 pb-3 font-mono text-[11px] text-text-secondary bg-bg-surface">
              {entry.detail}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
