'use client'
import type { AssetCategory, AssetStatus } from '@/lib/types/simulation'

const ACTOR_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  us:            { border: '#2980b9', bg: 'rgba(41,128,185,0.25)', text: '#5dade2' },
  united_states: { border: '#2980b9', bg: 'rgba(41,128,185,0.25)', text: '#5dade2' },
  israel:        { border: '#27ae60', bg: 'rgba(39,174,96,0.25)',  text: '#2ecc71' },
  iran:          { border: '#c0392b', bg: 'rgba(192,57,43,0.25)',  text: '#e74c3c' },
  default:       { border: '#e67e22', bg: 'rgba(230,126,34,0.25)', text: '#f39c12' },
}

const CATEGORY_ICONS: Record<AssetCategory, string> = {
  naval:          '⛵',
  air:            '✈',
  ground:         '⬛',
  missile:        '🎯',
  nuclear:        '☢',
  infrastructure: '🛢',
  cyber:          '💻',
  air_defense:    '🛡',
}

const STATUS_STYLES: Record<AssetStatus, { opacity: number; extra: string }> = {
  available:  { opacity: 1,   extra: '' },
  mobilizing: { opacity: 0.8, extra: 'border-style: dashed;' },
  transiting: { opacity: 0.8, extra: 'border-style: dashed;' },
  staged:     { opacity: 1,   extra: '' },
  engaged:    { opacity: 1,   extra: 'box-shadow: 0 0 6px rgba(255,186,32,0.6);' },
  degraded:   { opacity: 0.7, extra: 'box-shadow: 0 0 6px rgba(230,126,34,0.5);' },
  destroyed:  { opacity: 0.3, extra: '' },
  withdrawn:  { opacity: 0.5, extra: '' },
}

export interface AssetMarkerOptions {
  actorId: string
  category: AssetCategory
  shortName: string
  status: AssetStatus
  onClick: () => void
}

/**
 * Creates a DOM element for use as a mapboxgl.Marker.
 * Usage: new mapboxgl.Marker(createAssetMarkerElement(opts)).setLngLat([lng, lat]).addTo(map)
 */
export function createAssetMarkerElement(opts: AssetMarkerOptions): HTMLElement {
  const colors = ACTOR_COLORS[opts.actorId] ?? ACTOR_COLORS.default
  const icon = CATEGORY_ICONS[opts.category] ?? '●'
  const statusStyle = STATUS_STYLES[opts.status] ?? STATUS_STYLES.available

  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    cursor: pointer; opacity: ${statusStyle.opacity};
  `

  const circle = document.createElement('div')
  circle.style.cssText = `
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    background: ${colors.bg};
    border: 2px solid ${colors.border};
    color: ${colors.text};
    ${statusStyle.extra}
    transition: transform 0.15s ease;
  `
  circle.textContent = icon

  const label = document.createElement('div')
  label.style.cssText = `
    margin-top: 2px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px; letter-spacing: 0.08em;
    color: rgba(232,230,224,0.6);
    background: rgba(0,0,0,0.65);
    padding: 1px 4px; border-radius: 2px;
    white-space: nowrap; pointer-events: none;
  `
  label.textContent = opts.shortName

  if (opts.status === 'destroyed') {
    const x = document.createElement('div')
    x.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: rgba(192,57,43,0.8); pointer-events: none;
    `
    x.textContent = '✕'
    wrapper.style.position = 'relative'
    wrapper.appendChild(x)
  }

  wrapper.appendChild(circle)
  wrapper.appendChild(label)
  wrapper.addEventListener('click', (e) => { e.stopPropagation(); opts.onClick() })
  wrapper.addEventListener('mouseenter', () => { circle.style.transform = 'scale(1.15)' })
  wrapper.addEventListener('mouseleave', () => { circle.style.transform = 'scale(1)' })

  return wrapper
}
