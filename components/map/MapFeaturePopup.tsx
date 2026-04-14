'use client'
import { getNationHex } from '@/lib/game/actor-colors'

export interface StaticFeatureInfo {
  name: string
  type: string
  nation?: string
  capability?: string
  status?: string
  screenX: number
  screenY: number
}

const TYPE_LABELS: Record<string, string> = {
  capital:     'CAPITAL CITY',
  city:        'MAJOR CITY',
  port:        'STRATEGIC PORT',
  nuclear:     'NUCLEAR FACILITY',
  airbase:     'AIR BASE',
  base:        'MILITARY BASE',
  naval:       'NAVAL BASE',
  naval_unit:  'NAVAL ASSET',
  carrier_group: 'CARRIER STRIKE GROUP',
  missile:     'MISSILE BATTERY',
  radar:       'RADAR INSTALLATION',
}

const NATION_LABELS: Record<string, string> = {
  US: 'UNITED STATES', IL: 'ISRAEL', IR: 'IRAN', SA: 'SAUDI ARABIA',
  AE: 'UAE', QA: 'QATAR', OM: 'OMAN', KW: 'KUWAIT', IQ: 'IRAQ',
  LB: 'LEBANON', SY: 'SYRIA', YE: 'YEMEN', 'US/IL': 'US / ISRAEL',
}

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  OPERATIONAL: { label: 'OPERATIONAL', color: '#2ecc71' },
  ACTIVE:      { label: 'ACTIVE',      color: '#2ecc71' },
  ALERT:       { label: 'ALERT',       color: '#f39c12' },
  DEPLOYED:    { label: 'DEPLOYED',    color: '#4a90d9' },
  MONITORED:   { label: 'MONITORED',   color: '#f39c12' },
  CONTESTED:   { label: 'CONTESTED',   color: '#e74c3c' },
  UNKNOWN:     { label: 'UNKNOWN',     color: '#8a8880' },
}

const TYPE_DEFAULT_STATUS: Record<string, string> = {
  capital:     'ACTIVE',
  city:        'ACTIVE',
  port:        'ACTIVE',
  nuclear:     'MONITORED',
  airbase:     'OPERATIONAL',
  base:        'OPERATIONAL',
  naval:       'OPERATIONAL',
  naval_unit:  'DEPLOYED',
  carrier_group: 'DEPLOYED',
  missile:     'ALERT',
  radar:       'ACTIVE',
}

interface Props {
  feature: StaticFeatureInfo
  containerWidth: number
  containerHeight: number
  onClose: () => void
}

export function MapFeaturePopup({ feature, containerWidth, containerHeight, onClose }: Props) {
  const POPUP_W = 220
  const POPUP_H = 150

  let left = feature.screenX + 14
  let top  = feature.screenY - POPUP_H / 2
  if (left + POPUP_W > containerWidth - 8) left = feature.screenX - POPUP_W - 14
  if (top < 8) top = 8
  if (top + POPUP_H > containerHeight - 8) top = containerHeight - POPUP_H - 8

  const nationColor  = feature.nation ? getNationHex(feature.nation) : '#8a8880'
  const typeLabel    = TYPE_LABELS[feature.type] ?? feature.type.toUpperCase().replace(/_/g, ' ')
  const rawStatus    = feature.status ?? TYPE_DEFAULT_STATUS[feature.type] ?? 'ACTIVE'
  const statusConf   = STATUS_COLORS[rawStatus] ?? { label: rawStatus, color: '#8a8880' }

  return (
    <div
      style={{
        position: 'absolute', left, top, width: POPUP_W, zIndex: 200,
        background: 'rgba(8,10,15,0.97)',
        border: `1px solid ${nationColor}44`,
        borderLeft: `3px solid ${nationColor}`,
        borderRadius: 3, padding: '9px 11px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11, color: '#e8e6e0', pointerEvents: 'all',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12, fontWeight: 700, color: '#e5e2e1', lineHeight: 1.2, flex: 1,
        }}>
          {feature.name}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8a8880',
            cursor: 'pointer', fontSize: 14, padding: '0 0 0 6px', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Nation + type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          padding: '2px 5px', fontSize: 8, letterSpacing: '0.1em', fontWeight: 600,
          color: nationColor, background: `${nationColor}18`,
          border: `1px solid ${nationColor}44`, borderRadius: 2,
        }}>
          {feature.nation ? (NATION_LABELS[feature.nation] ?? feature.nation) : 'UNKNOWN'}
        </span>
        <span style={{ fontSize: 8, color: '#5a5856', letterSpacing: '0.09em' }}>
          {typeLabel}
        </span>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: statusConf.color, flexShrink: 0, display: 'inline-block',
        }} />
        <span style={{ fontSize: 9, color: statusConf.color, letterSpacing: '0.08em' }}>
          {statusConf.label}
        </span>
      </div>

      {/* Capability description */}
      {feature.capability && (
        <div style={{
          fontFamily: "'Newsreader', serif", fontSize: 10,
          color: '#8a8880', lineHeight: 1.5,
          borderTop: '1px solid #1a1a1a', paddingTop: 6,
        }}>
          {feature.capability.length > 140
            ? feature.capability.slice(0, 140) + '…'
            : feature.capability}
        </div>
      )}
    </div>
  )
}
