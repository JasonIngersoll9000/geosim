export function EscalationBadge({ rung }: { rung: number }) {
  const color = rung >= 6 ? 'var(--status-critical)' : rung >= 4 ? 'var(--status-warning)' : 'var(--status-info)'
  const bg = rung >= 6 ? 'var(--status-critical-bg)' : rung >= 4 ? 'var(--status-warning-bg)' : 'var(--status-info-bg)'
  return (
    <span
      className="font-mono text-[9px] px-[7px] py-[2px] rounded-none border"
      style={{ color, background: bg, borderColor: color + '50' }}
    >
      Rung {rung}
    </span>
  )
}
