'use client'
import { FloatingMetricChip } from './FloatingMetricChip'
import { MapLegend } from './MapLegend'
import type { GlobalState } from '@/lib/types/simulation'

interface Props {
  globalState?: GlobalState
}

export function GameMap({ globalState }: Props) {
  const oilPrice = globalState?.oilPricePerBarrel ?? 142
  const oilCritical = oilPrice > 120

  return (
    <div className="relative w-full h-full" style={{ background: '#050A12' }}>

      {/* CSS coordinate grid overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.07 }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="map-grid-major" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#a4c9ff" strokeWidth="0.5" />
          </pattern>
          <pattern id="map-grid-minor" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#a4c9ff" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid-minor)" />
        <rect width="100%" height="100%" fill="url(#map-grid-major)" />
      </svg>

      {/* Horizontal scan-line effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(164,201,255,0.012) 4px)',
        }}
        aria-hidden="true"
      />

      {/* Center classified message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-center px-8 py-5"
          style={{
            border: '1px solid rgba(164,201,255,0.10)',
            background: 'rgba(5,10,18,0.75)',
          }}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-tertiary mb-2">
            MAP CLASSIFIED
          </div>
          <div className="w-20 h-px bg-border-subtle mx-auto mb-2" style={{ opacity: 0.4 }} />
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary">
            LOADING INTELLIGENCE PICTURE
          </div>
        </div>
      </div>

      {/* Floating metric chips — top row */}
      <FloatingMetricChip
        label="OIL"
        value={`$${oilPrice}/bbl`}
        variant={oilCritical ? 'critical' : 'default'}
        style={{ top: 10, left: 10 }}
      />
      <FloatingMetricChip
        label="HORMUZ"
        value="CLOSED"
        variant="critical"
        style={{ top: 10, left: 140 }}
      />
      <FloatingMetricChip
        label="ESCALATION"
        value="RUNG 6"
        variant="critical"
        style={{ top: 10, right: 44 }}
      />

      {/* Map legend — top right */}
      <MapLegend />

      {/* Coordinate label — bottom right */}
      <div
        className="absolute bottom-2 right-2 font-mono text-[8px] uppercase tracking-[0.08em]"
        style={{ color: 'rgba(164,201,255,0.25)' }}
      >
        24°N 56°E // PERSIAN GULF THEATER
      </div>
    </div>
  )
}
