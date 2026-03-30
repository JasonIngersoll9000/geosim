'use client'

interface Props {
  items: string[]
}

export function GlobalTicker({ items }: Props) {
  return (
    <div
      className="w-full overflow-hidden bg-bg-surface-dim border-b border-border-subtle"
      style={{ height: '28px' }}
      aria-label="Live intelligence feed"
    >
      <div className="flex items-center h-full">
        <div className="ticker-track flex items-center whitespace-nowrap">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center font-mono text-[10px] text-text-secondary"
            >
              <span className="px-6">{item}</span>
              <span className="text-text-tertiary">|</span>
            </span>
          ))}
          {/* Seamless-loop copy — content rendered via CSS, not DOM text nodes */}
          {items.map((item, i) => (
            <span
              key={`dup-${i}`}
              className="ticker-dup-item"
              data-item={item}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
