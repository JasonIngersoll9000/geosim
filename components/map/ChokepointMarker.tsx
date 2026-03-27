interface Props {
  label: string
  status: 'open' | 'contested' | 'blocked'
  style?: React.CSSProperties  // positioning only
}

export function ChokepointMarker({ label, status, style }: Props) {
  const statusClass =
    status === 'blocked'   ? 'text-status-critical border-status-critical' :
    status === 'contested' ? 'text-status-warning border-status-warning' :
    'text-gold border-gold'

  return (
    <div
      className={`absolute font-mono text-[9px] px-2 py-[2px] border ${statusClass} bg-bg-surface`}
      style={style}
    >
      {label}
    </div>
  )
}
