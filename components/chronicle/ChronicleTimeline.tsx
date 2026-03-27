import { TurnEntry } from './TurnEntry'

type Severity = 'critical' | 'major' | 'minor'

const dotBorderClass: Record<Severity, string> = {
  critical: 'border-status-critical',
  major:    'border-gold',
  minor:    'border-border-hi',
}

export function ChronicleTimeline({ entries }: { entries: React.ComponentProps<typeof TurnEntry>['entry'][] }) {
  return (
    <div className="relative pl-7 pt-5">
      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border-subtle" />
      {entries.map((entry) => (
        <div key={entry.turnNumber} className="relative mb-1">
          <div className={`absolute -left-7 top-1 w-3 h-3 z-10 bg-bg-base border-2 ${dotBorderClass[entry.severity]}`} />
          <TurnEntry entry={entry} />
        </div>
      ))}
    </div>
  )
}
