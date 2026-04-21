import type { TurnPhase } from '@/lib/types/simulation'

const colors: Record<TurnPhase, string> = {
  submitted:  'var(--status-info)',
  planning:   'var(--status-info)',
  resolving:  'var(--gold)',
  judging:    'var(--status-stable)',
  narrating:  'var(--status-warning)',
  finalizing: 'var(--gold)',
  complete:   'var(--text-tertiary)',
  failed:     'var(--status-critical)',
}

export function TurnPhaseIndicator({ phase }: { phase: TurnPhase }) {
  return (
    <span
      className="font-sans text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: colors[phase] }}
    >
      {phase}
    </span>
  )
}
