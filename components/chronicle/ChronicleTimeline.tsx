import { TurnEntry } from './TurnEntry'
import { EmptyState } from '@/components/game/EmptyState'

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

interface ChronicleTimelineProps {
  entries: React.ComponentProps<typeof TurnEntry>['entry'][]
  /** Pass true when the chronicle fetch errored out. */
  fetchError?: boolean
}

export function ChronicleTimeline({ entries, fetchError = false }: ChronicleTimelineProps) {
  if (fetchError) {
    return (
      <EmptyState
        variant="error"
        title="Chronicle Unavailable"
        body="Unable to load chronicle data. Check your connection or refresh the page."
      />
    )
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        variant="empty"
        title="No Chronicle Entries"
        body="Chronicle entries appear here after each resolved turn. Step through Ground Truth or submit a turn plan to begin."
      />
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
