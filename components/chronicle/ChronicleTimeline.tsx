import { TurnEntry } from './TurnEntry'

type Severity = 'critical' | 'major' | 'moderate' | 'minor'

const dotBorderClass: Record<Severity, string> = {
  critical: 'border-status-critical',
  major:    'border-gold',
  moderate: 'border-status-stable',
  minor:    'border-border-hi',
}

const severityLabel: Record<Severity, string> = {
  critical: 'Critical event',
  major:    'Major event',
  moderate: 'Notable event',
  minor:    'Minor development',
}

export function ChronicleTimeline({ entries }: { entries: React.ComponentProps<typeof TurnEntry>['entry'][] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3" style={{ minHeight: 200 }}>
        <div className="w-8 h-px" style={{ background: 'var(--border-subtle)' }} />
        <div className="font-mono text-2xs uppercase tracking-[0.12em] text-text-tertiary">
          No Chronicle Entries
        </div>
        <p className="font-serif italic text-sm text-text-tertiary leading-relaxed max-w-[240px]">
          Chronicle entries appear here after each resolved turn. Step through Ground Truth or submit a turn plan to begin.
        </p>
      </div>
    )
  }

  return (
    <div className="relative pl-7 pt-5">
      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border-subtle" />
      {entries.map((entry) => (
        <div key={entry.turnNumber} className="relative mb-1">
          <div
            className={`absolute -left-7 top-1 w-3 h-3 z-10 bg-bg-base border-2 ${dotBorderClass[entry.severity]}`}
            title={severityLabel[entry.severity]}
          />
          <TurnEntry entry={entry} />
        </div>
      ))}
    </div>
  )
}
