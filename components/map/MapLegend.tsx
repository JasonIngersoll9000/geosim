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
    <div className="absolute bottom-3 left-3 bg-bg-surface border border-border-subtle px-2 py-1 font-mono text-[9px] flex flex-col gap-1">
      {actors.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1 text-text-secondary">
          <span className="inline-block w-2 h-2" style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  )
}
