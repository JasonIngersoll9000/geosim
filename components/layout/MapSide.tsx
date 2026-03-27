interface Props {
  onCollapse: () => void
  children: React.ReactNode
}

export function MapSide({ onCollapse, children }: Props) {
  return (
    <div className="relative flex-[1.5] min-w-0 overflow-hidden" style={{ background: '#0A0F18' }}>
      {children}
      <button
        onClick={onCollapse}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-none flex items-center justify-center font-mono text-[10px] transition-all"
        style={{
          background: 'var(--bg-surface-low)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-tertiary)',
        }}
        title="Collapse map"
      >
        ‹
      </button>
    </div>
  )
}
