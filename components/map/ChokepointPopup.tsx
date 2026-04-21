'use client'

export type ChokepointId = 'strait_of_hormuz' | 'bab_el_mandeb'

export interface ChokepointInfo {
  id: ChokepointId
  label: string
  status: 'open' | 'contested' | 'blocked'
  throughput_pct?: number
  screenX: number
  screenY: number
}

const CHOKEPOINT_DATA: Record<ChokepointId, { description: string; significance: string }> = {
  strait_of_hormuz: {
    description:
      'A 39km-wide strait between Iran and Oman. Approximately 20% of global petroleum liquids and 25% of global LNG transit here daily. The IRGCN controls the northern shore and maintains a doctrine of asymmetric naval warfare to threaten closure.',
    significance:
      'Closing Hormuz is Iran\'s most potent strategic lever — spiking oil prices to $200+/bbl and threatening Chinese/Indian/Japanese energy security. US 5th Fleet\'s core mission is maintaining free passage. Mine-clearing operations require 3–6 months even after the military threat is removed.',
  },
  bab_el_mandeb: {
    description:
      'A 29km-wide strait at the southern end of the Red Sea connecting to the Gulf of Aden. ~10% of global trade and significant European-Asian shipping passes through here. Houthi anti-ship missile and drone operations have disrupted commercial shipping since October 2023.',
    significance:
      'Houthi closure has forced commercial ships to reroute via the Cape of Good Hope, adding 10–14 days and significant cost. Serves as potential Houthi leverage against Saudi Arabia and Gulf states. US/UK naval strikes have degraded but not eliminated the threat.',
  },
}

const STATUS_CONFIG: Record<ChokepointInfo['status'], { label: string; color: string; bg: string }> = {
  open:      { label: 'OPEN',      color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  contested: { label: 'CONTESTED', color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  blocked:   { label: 'BLOCKED',   color: '#e74c3c', bg: 'rgba(192,57,43,0.15)' },
}

interface Props {
  chokepoint: ChokepointInfo
  containerWidth: number
  containerHeight: number
  onClose: () => void
}

export function ChokepointPopup({ chokepoint, containerWidth, containerHeight, onClose }: Props) {
  const POPUP_W = 260
  const POPUP_H = 240

  let left = chokepoint.screenX + 14
  let top  = chokepoint.screenY - POPUP_H / 2

  if (left + POPUP_W > containerWidth - 8) left = chokepoint.screenX - POPUP_W - 14
  if (top < 8) top = 8
  if (top + POPUP_H > containerHeight - 8) top = containerHeight - POPUP_H - 8

  const data = CHOKEPOINT_DATA[chokepoint.id]
  const st   = STATUS_CONFIG[chokepoint.status]

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: POPUP_W,
        background: 'rgba(8,10,15,0.98)',
        border: `1px solid ${st.color}44`,
        borderLeft: `3px solid ${st.color}`,
        borderRadius: 3,
        padding: '10px 12px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#e8e6e0',
        pointerEvents: 'all',
        zIndex: 200,
        boxShadow: `0 4px 20px rgba(0,0,0,0.7)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: st.color, letterSpacing: '0.02em' }}>
            {chokepoint.label}
          </div>
          <div style={{ fontSize: 9, color: '#8a8880', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            MARITIME CHOKEPOINT
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 14, padding: '0 0 0 6px', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 2, fontSize: 9,
          fontWeight: 700, letterSpacing: '0.1em',
          color: st.color, background: st.bg,
          border: `1px solid ${st.color}44`,
        }}>
          {st.label}
        </span>
        {chokepoint.throughput_pct != null && (
          <span style={{ fontSize: 9, color: '#8a8880' }}>
            {chokepoint.throughput_pct}% THROUGHPUT
          </span>
        )}
      </div>

      <div style={{
        fontSize: 10, color: '#c8c6c0', lineHeight: 1.5, marginBottom: 8,
        fontFamily: "'Newsreader', serif",
      }}>
        {data.description}
      </div>

      <div style={{ borderTop: '1px solid #1c1f23', paddingTop: 8 }}>
        <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          STRATEGIC SIGNIFICANCE
        </div>
        <div style={{ fontSize: 10, color: '#a0a0a0', lineHeight: 1.45, fontStyle: 'italic' }}>
          {data.significance.length > 160 ? data.significance.slice(0, 160) + '…' : data.significance}
        </div>
      </div>
    </div>
  )
}
