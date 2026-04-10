'use client'
import type { City } from '@/lib/types/simulation'

const SEVERITY_COLOR: Record<string, string> = {
  catastrophic: '#e74c3c', severe: '#e67e22', moderate: '#f39c12', minor: '#f1c40f',
}
const SEVERITY_BG: Record<string, string> = {
  catastrophic: 'rgba(231,76,60,0.12)', severe: 'rgba(230,126,34,0.12)',
  moderate: 'rgba(243,156,18,0.12)', minor: 'rgba(241,196,15,0.12)',
}

interface Props { city: City | null; isOpen: boolean; onClose: () => void }

export function CityDetailPanel({ city, isOpen, onClose }: Props) {
  if (!city) return null
  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 50, width: 300, background: 'rgba(10,11,13,0.98)', borderLeft: '1px solid #2a2d32', transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.2s ease', overflow: 'auto', fontFamily: "'IBM Plex Mono', monospace", color: '#e8e6e0' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #1c1f23', position: 'sticky', top: 0, background: 'rgba(10,11,13,0.98)', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: '#e8e6e0', flex: 1 }}>{city.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 18, padding: 0, marginLeft: 8, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 10, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
          {city.country} · {(city.population / 1e6).toFixed(1)}M pop
        </div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ECONOMIC ROLE</div>
          <div style={{ fontSize: 10, color: '#c8c6c0', lineHeight: 1.5 }}>{city.economicRole}</div>
        </div>
        {city.infrastructureNodes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>INFRASTRUCTURE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {city.infrastructureNodes.map(node => (
                <span key={node} style={{ padding: '2px 6px', borderRadius: 2, fontSize: 8, background: '#0f1114', border: '1px solid #2a2d32', color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{node.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}
        {city.warImpacts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>WAR IMPACTS ({city.warImpacts.length})</div>
            {city.warImpacts.map((imp, i) => (
              <div key={i} style={{ padding: '6px 8px', background: SEVERITY_BG[imp.severity] ?? 'transparent', border: `1px solid ${(SEVERITY_COLOR[imp.severity] ?? '#2a2d32')}33`, borderRadius: 3, marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 8, color: SEVERITY_COLOR[imp.severity], textTransform: 'uppercase', letterSpacing: '0.1em' }}>{imp.severity}</span>
                  <span style={{ fontSize: 8, color: '#555', textTransform: 'uppercase' }}>{imp.category}</span>
                </div>
                <div style={{ fontSize: 10, color: '#c8c6c0', lineHeight: 1.4 }}>{imp.description}</div>
                {imp.estimatedValue != null && <div style={{ fontSize: 9, color: '#8a8880', marginTop: 3 }}>{imp.estimatedValue.toLocaleString()} {imp.unit}</div>}
                {imp.sourceUrl && <a href={imp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, color: '#5dade2', textDecoration: 'underline', display: 'block', marginTop: 2 }}>source</a>}
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: '8px 10px', background: '#0a0b0d', border: '1px solid #1c1f23', borderRadius: 3, fontSize: 9 }}>
          <div style={{ color: '#8a8880', marginBottom: 2 }}>{city.provenance.toUpperCase()}</div>
          {city.sourceUrl && <a href={city.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#5dade2', textDecoration: 'underline' }}>source</a>}
          {city.sourceDate && <span style={{ color: '#555', marginLeft: 8 }}>{city.sourceDate}</span>}
        </div>
      </div>
    </div>
  )
}
