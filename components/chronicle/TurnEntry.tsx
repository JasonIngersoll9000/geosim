'use client'
import { useState } from 'react'

type Severity = 'critical' | 'major' | 'minor'

interface EntryData {
  turnNumber: number
  date: string
  title: string
  narrative: string
  severity: Severity
  tags: string[]
  detail?: string
}

// Static map — no inline styles
const severityBorderClass: Record<Severity, string> = {
  critical: 'border-l-status-critical',
  major:    'border-l-gold',
  minor:    'border-l-border-hi',
}

export function TurnEntry({ entry }: { entry: EntryData }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      data-severity={entry.severity}
      className={`pl-3 mb-7 border-l-2 ${severityBorderClass[entry.severity]}`}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.04em] mb-1 text-text-tertiary">
        <span>Turn {entry.turnNumber} — </span><span>{entry.date}</span>
      </div>
      <div className="font-sans font-bold text-[15px] uppercase tracking-[0.02em] mb-2 text-text-primary">
        {entry.title}
      </div>
      <div className="font-serif italic text-[15px] leading-[1.75] text-text-secondary">
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
          {/* CSS max-height transition via .chronicle-detail / .chronicle-detail.open */}
          <div className={`chronicle-detail${expanded ? ' open' : ''}`}>
            <div className="px-3 pb-3 font-mono text-[11px] text-text-secondary bg-bg-surface">
              {entry.detail}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
