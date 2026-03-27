'use client'
import { useRef } from 'react'
import { FloatingMetricChip } from './FloatingMetricChip'
import type { GlobalState } from '@/lib/types/simulation'

interface Props {
  globalState?: GlobalState
}

export function GameMap({ globalState }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={mapRef} className="relative w-full h-full bg-bg-base">
      {/* Mapbox canvas will mount here */}
      {globalState && (
        <>
          <FloatingMetricChip
            label="Oil"
            value={`$${globalState.oilPricePerBarrel}/bbl`}
            variant={globalState.oilPricePerBarrel > 120 ? 'critical' : 'default'}
            style={{ bottom: 40, left: 10 }}
          />
          <FloatingMetricChip
            label="Stability"
            value={String(globalState.globalStabilityIndex)}
            variant="default"
            style={{ bottom: 40, left: 160 }}
          />
        </>
      )}
    </div>
  )
}
