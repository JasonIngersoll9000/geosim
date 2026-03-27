interface Props {
  currentRung: number
  maxRung?: number
  labels?: string[]
}

const DEFAULT_LABELS = ['Diplomacy', 'Sanctions', 'Covert', 'Proxy', 'Air', 'Naval', 'Ground', 'Nuclear']

export function EscalationLadder({ currentRung, maxRung = 8, labels = DEFAULT_LABELS }: Props) {
  return (
    <div className="flex gap-[3px] items-end">
      {Array.from({ length: maxRung }, (_, i) => {
        const rung = i + 1
        const isCurrent = rung === currentRung
        const isDanger = rung >= 6
        const height = 16 + rung * 8

        let bg = 'var(--bg-surface-high)'
        if (isCurrent) bg = 'var(--gold-dim)'
        else if (isDanger) bg = 'var(--status-critical-bg)'

        const border = isCurrent ? '1.5px solid var(--gold)' : 'none'

        return (
          <div key={rung} className="flex flex-col items-center flex-1">
            <div
              data-rung={rung}
              aria-current={isCurrent ? 'true' : undefined}
              className={`w-full ${isCurrent ? 'border-gold' : ''}`}
              style={{ height, background: bg, border }}
            />
            <div
              className="font-mono text-[8px] mt-[3px]"
              style={{ color: isCurrent ? 'var(--gold)' : 'var(--text-tertiary)' }}
            >
              {rung}
            </div>
          </div>
        )
      })}
    </div>
  )
}
