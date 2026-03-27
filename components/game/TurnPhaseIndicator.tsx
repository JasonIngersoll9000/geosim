type Phase = 'planning' | 'resolution' | 'reaction' | 'judging' | 'complete'

export function TurnPhaseIndicator({ phase }: { phase: Phase }) {
  const colors: Record<Phase, string> = {
    planning:   'var(--status-info)',
    resolution: 'var(--gold)',
    reaction:   'var(--status-warning)',
    judging:    'var(--status-stable)',
    complete:   'var(--text-tertiary)',
  }
  return (
    <span
      className="font-sans text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: colors[phase] }}
    >
      {phase}
    </span>
  )
}
