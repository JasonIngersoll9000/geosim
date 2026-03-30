'use client'
import dynamic from 'next/dynamic'
import { FloatingMetricChip } from './FloatingMetricChip'
import { ChokepointMarker } from './ChokepointMarker'
import { MapLegend } from './MapLegend'
import type { GlobalState } from '@/lib/types/simulation'

const MapboxMap = dynamic(
  () => import('./MapboxMap').then(m => ({ default: m.MapboxMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#0A0F18' }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-tertiary">
          ACQUIRING INTELLIGENCE PICTURE…
        </span>
      </div>
    ),
  },
)

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface Props {
  globalState?: GlobalState
}

export function GameMap({ globalState }: Props) {
  const oilPrice = globalState?.oilPricePerBarrel ?? 142
  const oilCritical = oilPrice > 120

  const hormuzAsset = globalState?.criticalAssets?.find(a =>
    a.name.toLowerCase().includes('hormuz')
  )
  const hormuzClosed = hormuzAsset
    ? hormuzAsset.currentStatus.toLowerCase().includes('clos')
    : true

  const hormuzStatus: 'open' | 'contested' | 'blocked' = hormuzClosed ? 'blocked' : 'contested'

  return (
    <div className="relative w-full h-full" style={{ background: '#050A12' }}>

      {/* ── Map layer ── */}
      {TOKEN ? (
        <MapboxMap hormuzClosed={hormuzClosed} />
      ) : (
        /* Placeholder when token not configured */
        <>
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.05 }}
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
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(164,201,255,0.012) 4px)' }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-center px-8 py-5"
              style={{ border: '1px solid rgba(164,201,255,0.10)', background: 'rgba(5,10,18,0.75)' }}
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-tertiary mb-2">
                MAP CLASSIFIED
              </div>
              <div className="w-20 h-px bg-border-subtle mx-auto mb-2" style={{ opacity: 0.4 }} />
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary">
                SET NEXT_PUBLIC_MAPBOX_TOKEN
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CSS coordinate grid overlay on top of map ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.35 }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="geo-grid-major" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
          <pattern id="geo-grid-minor" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geo-grid-minor)" />
        <rect width="100%" height="100%" fill="url(#geo-grid-major)" />
      </svg>

      {/* ── Floating metric chips (top bar) ── */}
      <FloatingMetricChip
        label="OIL"
        value={`$${oilPrice}/bbl`}
        variant={oilCritical ? 'critical' : 'default'}
        style={{ top: 10, left: 10 }}
      />
      <FloatingMetricChip
        label="ESCALATION"
        value="RUNG 6"
        variant="critical"
        style={{ top: 10, right: 44 }}
      />

      {/* ── Chokepoint markers: Hormuz & Bab-el-Mandeb ── */}
      <ChokepointMarker
        label={`STRAIT OF HORMUZ // ${hormuzClosed ? 'CLOSED' : 'CONTESTED'}`}
        status={hormuzStatus}
        style={{ bottom: '34%', right: '20%' }}
      />
      <ChokepointMarker
        label="BAB-EL-MANDEB"
        status="contested"
        style={{ bottom: '12%', left: '8%' }}
      />

      {/* ── USS Nimitz carrier group chip ── */}
      <FloatingMetricChip
        label="USS NIMITZ"
        value="CSG-11"
        variant="default"
        style={{ bottom: '30%', right: '16%' }}
      />

      {/* ── Map legend ── */}
      <MapLegend />

      {/* ── Coordinate reference ── */}
      <div
        className="absolute bottom-2 right-2 font-mono text-[8px] uppercase tracking-[0.08em] pointer-events-none"
        style={{ color: 'rgba(164,201,255,0.25)' }}
      >
        24°N 56°E // PERSIAN GULF THEATER
      </div>
    </div>
  )
}
