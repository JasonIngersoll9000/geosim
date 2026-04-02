'use client'
import type { City } from '@/lib/types/simulation'

const SEVERITY_COLOR: Record<string, string> = {
  catastrophic: '#e74c3c', severe: '#e67e22', moderate: '#f39c12', minor: '#f1c40f',
}

export interface CityMarkerOptions {
  city: City
  onClick: () => void
}

export function createCityMarkerElement({ city, onClick }: CityMarkerOptions): HTMLElement {
  const el = document.createElement('div')
  const hasImpacts = city.warImpacts.length > 0
  const maxSeverity = hasImpacts
    ? (['catastrophic', 'severe', 'moderate', 'minor'] as const).find(s =>
        city.warImpacts.some(i => i.severity === s)) ?? 'minor'
    : null
  const dotColor = maxSeverity ? SEVERITY_COLOR[maxSeverity] : '#8a8880'

  el.style.cssText = `
    width: 10px; height: 10px; border-radius: 50%;
    background: ${dotColor}; border: 1.5px solid rgba(0,0,0,0.4);
    cursor: pointer; transition: transform 0.15s ease;
    box-shadow: 0 0 4px ${dotColor}66;
  `
  if (hasImpacts) {
    const badge = document.createElement('div')
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 7px; height: 7px; border-radius: 50%;
      background: ${dotColor}; border: 1px solid #0a0b0d;
      font-size: 5px; display: flex; align-items: center; justify-content: center;
      color: #0a0b0d; font-weight: bold;
    `
    badge.textContent = String(city.warImpacts.length)
    el.style.position = 'relative'
    el.appendChild(badge)
  }

  el.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)' })
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
  return el
}
