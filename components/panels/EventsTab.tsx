'use client'

export interface TurnEvent {
  actorId: string
  actorName: string
  actorColor: string
  actionTitle: string
  dimension: string
  rationale?: string
}

export interface EscalationChange {
  actorId: string
  actorName: string
  previousRung: number
  newRung: number
  rationale: string
}

export interface TurnResolutionData {
  turnNumber: number
  simulatedDate: string
  chronicleHeadline: string
  narrativeSummary: string
  judgeScore: number
  events: TurnEvent[]
  escalationChanges: EscalationChange[]
}

interface Props {
  resolution: TurnResolutionData | null
}

const DIMENSION_COLOR: Record<string, string> = {
  military:      '#ffb4ac',
  economic:      '#a4c9ff',
  diplomatic:    '#5ebd8e',
  intelligence:  '#c9a9ff',
  political:     '#ffba20',
  information:   '#9ecfff',
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 80 ? '#5ebd8e' : value >= 60 ? '#ffba20' : '#ffb4ac'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-surface-high overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-2xs shrink-0" style={{ color }}>{value}/100</span>
    </div>
  )
}

export function EventsTab({ resolution }: Props) {
  if (!resolution) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3" style={{ minHeight: 240 }}>
        <div className="w-8 h-px" style={{ background: 'var(--border-subtle)' }} />
        <div className="font-mono text-2xs uppercase tracking-[0.12em] text-text-tertiary">
          No Events Yet
        </div>
        <p className="font-serif italic text-sm text-text-tertiary leading-relaxed max-w-[220px]">
          Submit a turn plan to see resolution events and actor actions here.
        </p>
      </div>
    )
  }

  const { turnNumber, simulatedDate, chronicleHeadline, narrativeSummary, judgeScore, events, escalationChanges } = resolution

  return (
    <div className="flex flex-col gap-0">
      {/* Turn header */}
      <div className="px-4 py-3 bg-bg-surface-dim border-b border-border-subtle">
        <div className="font-mono text-2xs text-text-tertiary mb-1">
          TURN {String(turnNumber).padStart(2, '0')} · {simulatedDate}
        </div>
        <p className="font-label font-semibold text-md text-text-primary leading-tight">
          {chronicleHeadline}
        </p>
      </div>

      {/* Narrative summary */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
          Resolution Narrative
        </div>
        <p className="font-serif italic text-sm leading-[1.75] text-text-secondary">
          {narrativeSummary}
        </p>
      </div>

      {/* Actor actions */}
      {events.length > 0 && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            Actor Actions
          </div>
          <div className="flex flex-col gap-2">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 bg-bg-surface border border-border-subtle">
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ background: ev.actorColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-label font-semibold text-base text-text-primary">{ev.actorName}</span>
                    <span
                      className="font-mono text-[8px] px-1 border"
                      style={{
                        color: DIMENSION_COLOR[ev.dimension] ?? '#8a8880',
                        borderColor: (DIMENSION_COLOR[ev.dimension] ?? '#8a8880') + '40',
                      }}
                    >
                      {ev.dimension.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-sans text-sm text-text-secondary">{ev.actionTitle}</div>
                  {ev.rationale && (
                    <div className="font-mono text-2xs text-text-tertiary mt-1 leading-snug">
                      {ev.rationale}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation changes */}
      {escalationChanges.length > 0 && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            Escalation Changes
          </div>
          <div className="flex flex-col gap-2">
            {escalationChanges.map((ec, i) => {
              const escalated = ec.newRung > ec.previousRung
              return (
                <div key={i} className="px-3 py-2 bg-bg-surface border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-label font-semibold text-base text-text-primary">{ec.actorName}</span>
                    <span className={`font-mono text-2xs ${escalated ? 'text-status-critical' : 'text-status-stable'}`}>
                      {escalated ? '▲' : '▼'}
                    </span>
                    <span className="font-mono text-2xs text-text-tertiary">
                      R{ec.previousRung} → R{ec.newRung}
                    </span>
                  </div>
                  <div className="font-mono text-2xs text-text-tertiary leading-snug">{ec.rationale}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Judge score */}
      <div className="px-4 py-3">
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
          Resolution Quality
        </div>
        <ScoreBar value={judgeScore} />
        <div className="font-mono text-2xs text-text-tertiary mt-1.5">
          {judgeScore >= 80
            ? 'High-fidelity simulation — historically grounded'
            : judgeScore >= 60
            ? 'Plausible resolution — minor deviations from precedent'
            : 'Low-confidence resolution — significant implausibilities'}
        </div>
      </div>
    </div>
  )
}
