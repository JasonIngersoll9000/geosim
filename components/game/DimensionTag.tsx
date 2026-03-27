type Dimension = 'military' | 'economic' | 'diplomatic' | 'intelligence' | 'political'

const styles: Record<Dimension, { color: string; bg: string }> = {
  military:     { color: 'var(--status-critical)', bg: 'var(--status-critical-bg)' },
  economic:     { color: 'var(--status-stable)',   bg: 'var(--status-stable-bg)' },
  diplomatic:   { color: 'var(--status-info)',     bg: 'var(--status-info-bg)' },
  intelligence: { color: 'var(--gold)',            bg: 'var(--gold-dim)' },
  political:    { color: '#A899E0',                bg: 'rgba(123,104,200,0.15)' },
}

export function DimensionTag({ dimension }: { dimension: Dimension }) {
  const s = styles[dimension] ?? styles.military
  return (
    <span
      className="font-mono text-[9px] px-[7px] py-[2px] rounded-none border capitalize"
      style={{ color: s.color, background: s.bg, borderColor: s.color + '50' }}
    >
      {dimension}
    </span>
  )
}
