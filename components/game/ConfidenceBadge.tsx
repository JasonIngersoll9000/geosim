type Confidence = 'confirmed' | 'high' | 'moderate' | 'low' | 'unverified' | 'disputed'

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const high = ['confirmed', 'high']
  const mid = ['moderate']
  const color = high.includes(confidence)
    ? 'var(--status-stable)'
    : mid.includes(confidence)
    ? 'var(--status-warning)'
    : 'var(--status-critical)'
  return (
    <span className="font-mono text-[9px] px-[7px] py-[2px] rounded-none" style={{ color }}>
      {confidence.toUpperCase()}
    </span>
  )
}
