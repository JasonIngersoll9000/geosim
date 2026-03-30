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
        <div className="ticker-track flex items-center whitespace-nowrap gap-0">
          {/* Visible first copy — separator is in DOM for test assertions */}
          {items.map((item, i) => (
            <span
              key={i}
              className="flex items-center font-mono text-[10px] text-text-secondary"
            >
              <span className="px-6">{item}</span>
              <span className="text-text-tertiary">|</span>
            </span>
          ))}
          {/* Seamless-loop duplicate — fully hidden from a11y and DOM text queries */}
          <span aria-hidden="true">
            {items.map((item, i) => (
              <span
                key={`dup-${i}`}
                className="inline-flex items-center font-mono text-[10px] text-text-secondary"
              >
                <span className="px-6">{item}</span>
                <span className="text-text-tertiary">|</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
