interface ActorLegendItem {
  label: string
  color: string  // hex color for the dot
}

interface Props {
  actors?: ActorLegendItem[]
}

// TODO Task 14: replace with live actor list
const DEFAULT_ACTORS: ActorLegendItem[] = [
  { label: 'US', color: '#4A90D9' },
  { label: 'Iran', color: '#E04545' },
  { label: 'Israel', color: '#4fc3f7' },
]


export function MapLegend({ actors = DEFAULT_ACTORS }: Props) {
  return (
    <div
      style={{
        background: 'rgba(10,15,24,0.92)',
        border: '1px solid #1e1e1e',
        borderLeft: '2px solid rgba(255,186,32,0.15)',
        minWidth: 100,
      }}
    >
      <div
        style={{ borderBottom: '1px solid #1e1e1e', padding: '3px 8px' }}
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-tertiary">
          Legend
        </span>
      </div>
      <div className="px-2 py-1 font-mono text-[9px] flex flex-col gap-[3px]">
        {/* Actor colors */}
        {actors.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-[5px] text-text-secondary">
            <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1e1e1e', margin: '2px 0' }} />
        {/* Icon type guide */}
        <div className="flex items-center gap-[5px] text-text-tertiary" style={{ fontSize: 8 }}>
          <span style={{ color: 'rgba(229,226,225,0.5)' }}>▲</span> Airbase
        </div>
        <div className="flex items-center gap-[5px] text-text-tertiary" style={{ fontSize: 8 }}>
          <span style={{ color: 'rgba(229,226,225,0.5)' }}>◆</span> Naval Base
        </div>
        <div className="flex items-center gap-[5px] text-text-tertiary" style={{ fontSize: 8 }}>
          <span style={{ color: 'rgba(229,226,225,0.5)' }}>■</span> Ground Base
        </div>
        <div className="flex items-center gap-[5px] text-text-tertiary" style={{ fontSize: 8 }}>
          <span style={{ color: '#ffba20' }}>●</span> Nuclear Site
        </div>
        <div className="flex items-center gap-[5px] text-text-tertiary" style={{ fontSize: 8 }}>
          <span style={{ color: '#4a90d9' }}>▶</span> Carrier Group
        </div>
      </div>
    </div>
  )
}
