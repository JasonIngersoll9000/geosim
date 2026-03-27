interface Props {
  icon?: string
  label: string
  value: string
  variant?: 'default' | 'critical' | 'warning'
  style?: React.CSSProperties  // ONLY for positioning (top/bottom/left/right)
}

export function FloatingMetricChip({ icon, label, value, variant = 'default', style }: Props) {
  const valueClass =
    variant === 'critical' ? 'text-status-critical' :
    variant === 'warning'  ? 'text-status-warning' :
    'text-text-secondary'

  return (
    <div
      className="absolute font-mono text-[9px] flex items-center gap-1 px-2 py-[3px] bg-bg-surface border border-border-subtle"
      style={style}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      <span className="text-text-tertiary">{label}:</span>
      <strong className={valueClass}>{value}</strong>
    </div>
  )
}
