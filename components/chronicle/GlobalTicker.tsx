'use client'

interface Props {
  items: string[]
}

export function GlobalTicker({ items }: Props) {
  const doubled = [...items, ...items]

  return (
    <div
      className="w-full overflow-hidden bg-bg-surface-dim border-b border-border-subtle"
      style={{ height: '28px' }}
      aria-label="Live intelligence feed"
    >
      <div className="flex items-center h-full">
        {/* ticker-track class drives the CSS animation in globals.css */}
        <div className="ticker-track flex items-center whitespace-nowrap gap-0">
          {doubled.map((item, i) => (
            <span
              key={i}
              className="flex items-center font-mono text-[10px] text-text-secondary"
            >
              <span className="px-6">{item}</span>
              <span className="text-gold opacity-60">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
