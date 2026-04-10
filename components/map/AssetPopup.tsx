'use client'
import type { PositionedAsset } from '@/lib/types/simulation'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  available:  { label: 'AVAILABLE',  color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  mobilizing: { label: 'MOBILIZING', color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  transiting: { label: 'TRANSITING', color: '#5dade2', bg: 'rgba(41,128,185,0.15)' },
  staged:     { label: 'STAGED',     color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  engaged:    { label: 'ENGAGED',    color: '#ffba20', bg: 'rgba(255,186,32,0.15)' },
  degraded:   { label: 'DEGRADED',   color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  destroyed:  { label: 'DESTROYED',  color: '#e74c3c', bg: 'rgba(192,57,43,0.15)' },
  withdrawn:  { label: 'WITHDRAWN',  color: '#8a8880', bg: 'rgba(138,136,128,0.15)' },
}

interface Props {
  asset: PositionedAsset
  onExpand: (asset: PositionedAsset) => void
  onClose: () => void
}

export function AssetPopup({ asset, onExpand, onClose }: Props) {
  const badge = STATUS_BADGE[asset.status] ?? STATUS_BADGE.available
  const topCaps = asset.capabilities.slice(0, 3)

  return (
    <div
      style={{
        position: 'absolute',
        background: 'rgba(10,11,13,0.97)',
        border: '1px solid #2a2d32',
        borderRadius: 4,
        padding: '10px 12px',
        width: 220,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#e8e6e0',
        pointerEvents: 'all',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: '#ffba20', lineHeight: 1.2, flex: 1 }}>
          {asset.name}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 14, padding: 0, marginLeft: 6, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {asset.actorId.toUpperCase()} · {asset.assetType.replace(/_/g, ' ')}
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 2, fontSize: 9,
          fontWeight: 600, letterSpacing: '0.1em',
          color: badge.color, background: badge.bg,
          border: `1px solid ${badge.color}33`,
        }}>
          {badge.label}
        </span>
      </div>

      {topCaps.map(cap => {
        const pct = cap.max > 0 ? cap.current / cap.max : 1
        const valColor = pct >= 0.75 ? '#2ecc71' : pct >= 0.4 ? '#f39c12' : '#e74c3c'
        return (
          <div key={cap.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #1c1f23' }}>
            <span style={{ color: '#8a8880', fontSize: 10 }}>{cap.name}</span>
            <span style={{ color: valColor, fontSize: 10 }}>{cap.current}/{cap.max}</span>
          </div>
        )
      })}

      <button
        onClick={() => onExpand(asset)}
        style={{
          marginTop: 10, width: '100%', padding: '5px 0',
          background: 'rgba(255,186,32,0.08)',
          border: '1px solid rgba(255,186,32,0.25)',
          borderRadius: 2, color: '#ffba20',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em',
        }}
      >
        FULL DETAILS →
      </button>
    </div>
  )
}
