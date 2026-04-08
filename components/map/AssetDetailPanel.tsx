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

const PROVENANCE_LABEL: Record<string, string> = {
  verified:   'VERIFIED (open source)',
  researched: 'RESEARCHED (AI pipeline)',
  inferred:   'INFERRED (estimated)',
}

interface Props {
  asset: PositionedAsset | null
  isOpen: boolean
  onClose: () => void
}

export function AssetDetailPanel({ asset, isOpen, onClose }: Props) {
  if (!asset) return null
  const badge = STATUS_BADGE[asset.status] ?? STATUS_BADGE.available

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 50,
      width: 300,
      background: 'rgba(10,11,13,0.98)',
      borderLeft: '1px solid #2a2d32',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.2s ease',
      overflow: 'auto',
      fontFamily: "'IBM Plex Mono', monospace",
      color: '#e8e6e0',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #1c1f23', position: 'sticky', top: 0, background: 'rgba(10,11,13,0.98)', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: '#ffba20', lineHeight: 1.3, flex: 1 }}>
            {asset.name}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 18, padding: 0, marginLeft: 8, lineHeight: 1 }}>
            ×
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
          {asset.actorId.toUpperCase()} · {asset.category.toUpperCase()} · {asset.assetType.replace(/_/g, ' ').toUpperCase()}
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Status */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>STATUS</div>
          <span style={{ padding: '3px 8px', borderRadius: 2, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: badge.color, background: badge.bg, border: `1px solid ${badge.color}44` }}>
            {badge.label}
          </span>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LOCATION</div>
          <div style={{ fontSize: 11 }}>
            {asset.zone.replace(/_/g, ' ').toUpperCase()}
            <span style={{ color: '#8a8880', marginLeft: 8, fontSize: 10 }}>
              {asset.position.lat.toFixed(2)}°N {asset.position.lng.toFixed(2)}°E
            </span>
          </div>
        </div>

        {/* Capabilities */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>CAPABILITIES</div>
          {asset.capabilities.map(cap => {
            const pct = cap.max > 0 ? cap.current / cap.max : 1
            const valColor = pct >= 0.75 ? '#2ecc71' : pct >= 0.4 ? '#f39c12' : '#e74c3c'
            return (
              <div key={cap.name} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: '#c8c6c0' }}>{cap.name}</span>
                  <span style={{ fontSize: 10, color: valColor }}>{cap.current} / {cap.max} {cap.unit}</span>
                </div>
                <div style={{ height: 3, background: '#1c1f23', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: valColor, borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Range (optional fields) */}
        {(asset.strikeRangeNm != null || asset.threatRangeNm != null) && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>RANGE</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {asset.strikeRangeNm != null && (
                <div>
                  <div style={{ fontSize: 9, color: '#8a8880' }}>STRIKE</div>
                  <div style={{ fontSize: 12, color: '#e74c3c' }}>{asset.strikeRangeNm} nm</div>
                </div>
              )}
              {asset.threatRangeNm != null && (
                <div>
                  <div style={{ fontSize: 9, color: '#8a8880' }}>THREAT</div>
                  <div style={{ fontSize: 12, color: '#f39c12' }}>{asset.threatRangeNm} nm</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {asset.description && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ASSESSMENT</div>
            <div style={{ fontSize: 10, color: '#c8c6c0', lineHeight: 1.5, fontFamily: "'Newsreader', serif" }}>
              {asset.description}
            </div>
          </div>
        )}

        {/* Notes */}
        {asset.notes && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>NOTES</div>
            <div style={{ fontSize: 10, color: '#8a8880', lineHeight: 1.4, fontStyle: 'italic' }}>{asset.notes}</div>
          </div>
        )}

        {/* Provenance + source */}
        <div style={{ padding: '8px 10px', background: '#0a0b0d', border: '1px solid #1c1f23', borderRadius: 3, fontSize: 9 }}>
          <div style={{ color: '#8a8880', marginBottom: 4 }}>
            {PROVENANCE_LABEL[asset.provenance] ?? asset.provenance.toUpperCase()}
          </div>
          {asset.sourceUrl && (
            <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: '#5dade2', textDecoration: 'underline', display: 'block', marginBottom: 2 }}>
              source
            </a>
          )}
          {asset.sourceDate && (
            <div style={{ color: '#555' }}>as of {asset.sourceDate}</div>
          )}
          {asset.researchedAt && (
            <div style={{ color: '#555' }}>updated {new Date(asset.researchedAt).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  )
}
