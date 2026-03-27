interface Indicator {
  label: string
  value: string
  variant?: 'default' | 'critical' | 'warning'
}

interface Props {
  indicators: Indicator[]
}

const variantClass: Record<string, string> = {
  critical: 'text-status-critical',
  warning:  'text-status-warning',
  default:  'text-text-secondary',
}

export function GlobalIndicators({ indicators }: Props) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-bg-surface-dim border-b border-border-subtle font-mono text-2xs">
      {indicators.map(({ label, value, variant = 'default' }) => (
        <div key={label} className="flex items-center gap-1">
          <span className="text-text-tertiary">{label}:</span>
          <span className={variantClass[variant] ?? variantClass['default']}>{value}</span>
        </div>
      ))}
    </div>
  )
}
