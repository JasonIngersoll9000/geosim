'use client'
import type { MapAsset } from '@/lib/types/simulation'

const STATUS_STYLES: Record<MapAsset['status'], { label: string; color: string; bg: string }> = {
  operational: { label: 'OPERATIONAL', color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  degraded:    { label: 'DEGRADED',    color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  destroyed:   { label: 'DESTROYED',   color: '#e74c3c', bg: 'rgba(192,57,43,0.15)' },
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  nuclear_facility:    'Nuclear Facility',
  oil_gas_facility:    'Oil / Gas Infrastructure',
  military_base:       'Military Base',
  carrier_group:       'Carrier Strike Group',
  missile_battery:     'Missile Battery',
  naval_asset:         'Naval Asset',
  air_defense_battery: 'Air Defense Battery',
  troop_deployment:    'Troop Deployment',
}

const ACTOR_LABELS: Record<string, string> = {
  us:           'United States',
  iran:         'Iran (IRGC/IRIN)',
  israel:       'Israel (IDF)',
  saudi_arabia: 'Saudi Arabia',
  russia:       'Russia',
  china:        'China',
}

interface Props {
  asset: MapAsset
  screenX: number
  screenY: number
  containerWidth: number
  containerHeight: number
  onClose: () => void
}

export function MapAssetPopup({ asset, screenX, screenY, containerWidth, containerHeight, onClose }: Props) {
  const POPUP_W = 240
  const POPUP_H = 260

  let left = screenX + 14
  let top  = screenY - POPUP_H / 2

  if (left + POPUP_W > containerWidth - 8) left = screenX - POPUP_W - 14
  if (top < 8) top = 8
  if (top + POPUP_H > containerHeight - 8) top = containerHeight - POPUP_H - 8

  const st = STATUS_STYLES[asset.status] ?? STATUS_STYLES.operational
  const isNaval = asset.asset_type === 'naval_asset' || asset.asset_type === 'carrier_group'
  const isDestroyed = asset.status === 'destroyed'
  const isDegraded  = asset.status === 'degraded'

  const navalIcon = asset.asset_type === 'carrier_group' ? '⬛' : '⬛'
  void navalIcon

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: POPUP_W,
        background: 'rgba(8,10,15,0.98)',
        border: `1px solid ${asset.actor_color}55`,
        borderLeft: `3px solid ${asset.actor_color}`,
        borderRadius: 3,
        padding: '10px 12px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#e8e6e0',
        pointerEvents: 'all',
        zIndex: 200,
        boxShadow: `0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px ${asset.actor_color}22`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12, fontWeight: 700,
            color: isDestroyed ? '#8a8880' : asset.actor_color,
            lineHeight: 1.2,
            textDecoration: isDestroyed ? 'line-through' : 'none',
          }}>
            {asset.label}
          </div>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            {ACTOR_LABELS[asset.actor_id] ?? asset.actor_id} · {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 14, padding: '0 0 0 6px', lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 2, fontSize: 9,
          fontWeight: 700, letterSpacing: '0.1em',
          color: st.color, background: st.bg,
          border: `1px solid ${st.color}44`,
        }}>
          {st.label}
        </span>
        {isNaval && (
          <span style={{ fontSize: 9, color: '#8a8880', letterSpacing: '0.06em' }}>NAVAL</span>
        )}
        {asset.is_approximate_location && (
          <span style={{ fontSize: 9, color: '#f39c12', letterSpacing: '0.06em' }}>~LOC</span>
        )}
      </div>

      {asset.description && (
        <div style={{
          fontSize: 10, color: isDegraded ? '#c8a850' : '#c8c6c0',
          lineHeight: 1.45, marginBottom: 8,
          fontFamily: "'Newsreader', serif",
          opacity: isDestroyed ? 0.5 : 1,
        }}>
          {asset.description.length > 120 ? asset.description.slice(0, 120) + '…' : asset.description}
        </div>
      )}

      {(asset.strike_range_nm != null || asset.threat_range_nm != null) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          {asset.strike_range_nm != null && (
            <div>
              <div style={{ fontSize: 8, color: '#8a8880', letterSpacing: '0.08em' }}>STRIKE RANGE</div>
              <div style={{ fontSize: 11, color: '#e74c3c', fontWeight: 600 }}>{asset.strike_range_nm} nm</div>
            </div>
          )}
          {asset.threat_range_nm != null && asset.threat_range_nm > 0 && (
            <div>
              <div style={{ fontSize: 8, color: '#8a8880', letterSpacing: '0.08em' }}>THREAT RANGE</div>
              <div style={{ fontSize: 11, color: '#f39c12', fontWeight: 600 }}>{asset.threat_range_nm} nm</div>
            </div>
          )}
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 6, borderTop: '1px solid #1c1f23',
      }}>
        <div style={{
          fontSize: 8, color: '#555',
          letterSpacing: '0.06em',
          fontStyle: 'italic',
        }}>
          {asset.capacity_pct < 100 ? `CAPACITY ${asset.capacity_pct}%` : 'FULL CAPACITY'}
          {asset.is_approximate_location && ' · APPROX LOCATION'}
        </div>
      </div>
    </div>
  )
}
