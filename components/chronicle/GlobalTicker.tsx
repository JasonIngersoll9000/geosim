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
        {/*
          ticker-track drives the CSS animation in globals.css.
          The first copy is visible to assistive tech; the second is aria-hidden
          to avoid duplicate query matches in tests while preserving seamless looping.
        */}
        <div className="ticker-track flex items-center whitespace-nowrap gap-0">
          {/* Visible first copy */}
          {items.map((item, i) => (
            <span
              key={i}
              className="flex items-center font-mono text-[10px] text-text-secondary"
            >
              <span className="px-6">{item}</span>
              <span aria-hidden="true" className="text-text-tertiary">|</span>
            </span>
          ))}
          {/* Duplicate for seamless wrap — hidden from assistive tech and DOM queries */}
          <span aria-hidden="true" className="flex items-center">
            {items.map((item, i) => (
              <span
                key={`dup-${i}`}
                className="flex items-center font-mono text-[10px] text-text-secondary"
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
