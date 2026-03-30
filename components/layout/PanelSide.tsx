interface Props {
  mapCollapsed: boolean
  onExpandMap: () => void
  children: React.ReactNode
}

export function PanelSide({ mapCollapsed, onExpandMap, children }: Props) {
  return (
    <div
      className={`flex flex-col overflow-hidden transition-all duration-200 ${mapCollapsed ? 'flex-1' : 'w-[380px]'}`}
      style={{ background: 'var(--bg-surface-low)', borderLeft: '1px solid var(--border-subtle)' }}
    >
      {mapCollapsed && (
        <button
          onClick={onExpandMap}
          className="self-start m-2 px-2 py-1 font-mono text-[9px] rounded-none transition-all"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)',
          }}
        >
          › Show Map
        </button>
      )}
      {children}
    </div>
  )
}
