interface CascadeStep {
  condition: string
  constraintRemoved: string
}

interface Props {
  title: string
  steps: CascadeStep[]
  likelihood: number
  className?: string
}

export function ConstraintCascadeAlert({ title, steps, likelihood, className = '' }: Props) {
  return (
    <div
      className={`border-l-4 pl-3 py-2 rounded-none ${className}`}
      style={{ borderColor: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px]" style={{ color: 'var(--status-critical)' }}>⚠</span>
        <span
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.03em]"
          style={{ color: 'var(--status-critical)' }}
        >
          {title}
        </span>
        <span className="font-mono text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          {likelihood}%
        </span>
      </div>
      {steps.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {steps.map((step, i) => (
            <div key={i} className="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>→ </span>
              {step.condition} — <em style={{ color: 'var(--status-critical)' }}>{step.constraintRemoved} removed</em>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
