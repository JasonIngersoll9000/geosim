interface Props { items: string[] }

export function GlobalTicker({ items }: Props) {
  return (
    <div className="w-full overflow-hidden bg-bg-surface-dim border-b border-border-subtle px-4 py-1">
      <div className="flex items-center gap-3 font-mono text-[10px] text-text-secondary">
        {items.map((item, i) => (
          <span key={item} className="flex items-center gap-3 whitespace-nowrap">
            {item}
            {i < items.length - 1 && <span className="text-gold">|</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
