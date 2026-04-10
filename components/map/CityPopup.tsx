'use client'
import type { City } from '@/lib/types/simulation'

const SEVERITY_COLOR: Record<string, string> = {
  catastrophic: '#e74c3c', severe: '#e67e22', moderate: '#f39c12', minor: '#f1c40f',
}

interface Props { city: City; onExpand: (city: City) => void; onClose: () => void }

export function CityPopup({ city, onExpand, onClose }: Props) {
  const topImpacts = city.warImpacts.slice(0, 3)
  return (
    <div style={{ background: 'rgba(10,11,13,0.97)', border: '1px solid #2a2d32', borderRadius: 3, width: 210, fontFamily: "'IBM Plex Mono', monospace", color: '#e8e6e0', fontSize: 10, pointerEvents: 'all', zIndex: 100 }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #1c1f23', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: '#e8e6e0' }}>{city.name}</div>
          <div style={{ fontSize: 9, color: '#8a8880', marginTop: 2 }}>{city.country.toUpperCase()} · POP {(city.population / 1e6).toFixed(1)}M</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 9, color: '#8a8880', marginBottom: 6 }}>{city.economicRole}</div>
        {topImpacts.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>WAR IMPACTS</div>
            {topImpacts.map((imp, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
                <span style={{ color: SEVERITY_COLOR[imp.severity] ?? '#f39c12', fontSize: 8, marginTop: 1 }}>&#9632;</span>
                <span style={{ fontSize: 9, color: '#c8c6c0', lineHeight: 1.3 }}>{imp.description}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onExpand(city)} style={{ width: '100%', padding: '4px 0', background: 'rgba(232,230,224,0.05)', border: '1px solid #2a2d32', borderRadius: 2, color: '#8a8880', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.08em' }}>
          FULL DETAILS →
        </button>
      </div>
    </div>
  )
}
