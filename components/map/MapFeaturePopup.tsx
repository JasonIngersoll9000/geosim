'use client'

export interface StaticFeatureInfo {
  name: string
  type: string
  nation?: string
  capability?: string
  screenX: number
  screenY: number
}

const TYPE_LABELS: Record<string, string> = {
  capital:    'CAPITAL CITY',
  city:       'MAJOR CITY',
  port:       'STRATEGIC PORT',
  nuclear:    'NUCLEAR FACILITY',
  airbase:    'AIR BASE',
  base:       'MILITARY BASE',
  naval:      'NAVAL BASE',
  naval_asset:'NAVAL ASSET',
  radar:      'RADAR INSTALLATION',
  missile:    'MISSILE BATTERY',
}

const NATION_COLORS: Record<string, string> = {
  US:   '#4a90d9',
  IL:   '#4fc3f7',
  IR:   '#c0392b',
  SA:   '#f39c12',
  AE:   '#8e44ad',
  QA:   '#27ae60',
  OM:   '#16a085',
  KW:   '#2c3e50',
  IQ:   '#7f8c8d',
  LB:   '#e74c3c',
  SY:   '#95a5a6',
  YE:   '#d35400',
  'US/IL': '#4a90d9',
}

const NATION_LABELS: Record<string, string> = {
  US: 'UNITED STATES', IL: 'ISRAEL', IR: 'IRAN', SA: 'SAUDI ARABIA',
  AE: 'UAE', QA: 'QATAR', OM: 'OMAN', KW: 'KUWAIT', IQ: 'IRAQ',
  LB: 'LEBANON', SY: 'SYRIA', YE: 'YEMEN', 'US/IL': 'US / ISRAEL',
}

interface Props {
  feature: StaticFeatureInfo
  containerWidth: number
  containerHeight: number
  onClose: () => void
}

export function MapFeaturePopup({ feature, containerWidth, containerHeight, onClose }: Props) {
  const POPUP_W = 210
  const POPUP_H = 130

  let left = feature.screenX + 14
  let top  = feature.screenY - POPUP_H / 2
  if (left + POPUP_W > containerWidth - 8) left = feature.screenX - POPUP_W - 14
  if (top < 8) top = 8
  if (top + POPUP_H > containerHeight - 8) top = containerHeight - POPUP_H - 8

  const nationColor = feature.nation ? (NATION_COLORS[feature.nation] ?? '#8a8880') : '#8a8880'
  const typeLabel   = TYPE_LABELS[feature.type] ?? feature.type.toUpperCase().replace(/_/g, ' ')

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12, fontWeight: 700, color: '#e5e2e1', lineHeight: 1.2, flex: 1,
        }}>
          {feature.name}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#8a8880',
            cursor: 'pointer', fontSize: 14, padding: '0 0 0 6px', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{
          padding: '2px 5px', fontSize: 8, letterSpacing: '0.1em', fontWeight: 600,
          color: nationColor, background: `${nationColor}18`,
          border: `1px solid ${nationColor}44`, borderRadius: 2,
        }}>
          {feature.nation ? (NATION_LABELS[feature.nation] ?? feature.nation) : 'UNKNOWN'}
        </span>
        <span style={{ fontSize: 8, color: '#5a5856', letterSpacing: '0.1em' }}>
          {typeLabel}
        </span>
      </div>

      {feature.capability && (
        <div style={{
          fontFamily: "'Newsreader', serif", fontSize: 10,
          color: '#8a8880', lineHeight: 1.5, marginBottom: 4,
        }}>
          {feature.capability}
        </div>
      )}
    </div>
  )
}
