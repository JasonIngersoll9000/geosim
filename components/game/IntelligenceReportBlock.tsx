interface Props {
  header: string
  body: string
  className?: string
}

export function IntelligenceReportBlock({ header, body, className = '' }: Props) {
  return (
    <div
      className={`border-l-4 pl-3 py-2 bg-bg-surface-dim ${className}`}
      style={{ borderColor: 'var(--gold)' }}
    >
      <div className="font-mono text-[10px] text-gold uppercase tracking-[0.06em] mb-1">
        [{header}]
      </div>
      <div className="font-mono text-[11px] text-text-secondary leading-relaxed">
        {body}
      </div>
    </div>
  )
}
