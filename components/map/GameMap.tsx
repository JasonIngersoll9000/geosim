'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FloatingMetricChip } from './FloatingMetricChip'
import { MapLegend } from './MapLegend'
import { MapLayerControls } from './MapLayerControls'
import { AssetDetailPanel } from './AssetDetailPanel'
import { AssetInfoPanel } from './AssetInfoPanel'
import { AssetPopup } from './AssetPopup'
import { CityPopup } from './CityPopup'
import { CityDetailPanel } from './CityDetailPanel'
import { ActorStatusPanel } from '@/components/game/ActorStatusPanel'
import type { LayerState } from './MapLayerControls'
import type { GlobalState, MapAsset, PositionedAsset, City } from '@/lib/types/simulation'

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

const DEFAULT_LAYERS: LayerState = {
  countryNames:   false,
  countryBorders: true,
  terrain:        false,
  militaryAssets: true,
  militaryBases:  false,
  keyCities:      false,
  usAssets:       true,
  iranAssets:     true,
  israelAssets:   true,
  infrastructure: true,
  strikeRings:    false,
  threatRings:    false,
}

interface Props {
  globalState?: GlobalState
  scenarioId?: string
  branchId?: string
  turnCommitId?: string | null
}

export function GameMap({ globalState, scenarioId = 'iran-2026', branchId = '', turnCommitId = null }: Props) {
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS)
  const [assets, _setAssets] = useState<PositionedAsset[]>([])
  const [mapAssets, setMapAssets] = useState<MapAsset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<PositionedAsset | null>(null)
  const [popupAsset, setPopupAsset] = useState<PositionedAsset | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [cityPopup, setCityPopup] = useState<City | null>(null)
  const [cityDetailOpen, setCityDetailOpen] = useState(false)

  const selectedMapAsset = mapAssets.find(a => a.id === selectedAssetId) ?? null

  useEffect(() => {
    if (!branchId || !turnCommitId) return
    const url = `/api/scenarios/${scenarioId}/branches/${branchId}/map-assets?turnCommitId=${turnCommitId}`
    fetch(url)
      .then(r => r.json())
      .then(({ data }: { data: { assets?: MapAsset[] } | null }) => {
        if (data?.assets) setMapAssets(data.assets)
      })
      .catch(() => {})
  }, [scenarioId, branchId, turnCommitId])

  useEffect(() => {
    if (!scenarioId) return
    fetch(`/api/scenarios/${scenarioId}/cities`)
      .then(r => r.json())
      .then(({ data }: { data: City[] | null }) => { if (data) setCities(data) })
      .catch(() => {})
  }, [scenarioId])

  function handleAssetClick(asset: PositionedAsset) {
    setPopupAsset(asset)
    setSelectedAsset(asset)
    setSelectedAssetId(asset.id)
  }

  function handleMapAssetClick(asset: MapAsset) {
    setSelectedAssetId(asset.id)
  }

  function handleExpand(asset: PositionedAsset) {
    setPopupAsset(null)
    setSelectedAsset(asset)
    setDetailOpen(true)
  }

  function handleCityClick(city: City) {
    setCityPopup(city)
    setSelectedCity(city)
  }

  function handleCityExpand(city: City) {
    setCityPopup(null)
    setSelectedCity(city)
    setCityDetailOpen(true)
  }

  const oilPrice   = globalState?.oilPricePerBarrel ?? 142
  const oilCritical = oilPrice > 120

  const hormuzAsset = globalState?.criticalAssets?.find(a =>
    a.name.toLowerCase().includes('hormuz')
  )
  const hormuzClosed = hormuzAsset
    ? hormuzAsset.currentStatus.toLowerCase().includes('clos')
    : true

  const _hormuzStatus: 'open' | 'contested' | 'blocked' = hormuzClosed ? 'blocked' : 'contested'

  function toggleLayer(key: keyof LayerState) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="relative w-full h-full" style={{ background: '#050A12' }}>

      {/* ── Map layer ── */}
      {TOKEN ? (
        <>
          <MapboxMap
            hormuzClosed={hormuzClosed}
            layerState={layers}
            assets={assets}
            selectedAssetId={selectedAsset?.id ?? null}
            onAssetClick={handleAssetClick}
            cities={cities}
            onCityClick={handleCityClick}
            mapAssets={mapAssets}
            onMapAssetClick={handleMapAssetClick}
          />
          {popupAsset && (
            <div style={{ position: 'absolute', top: '30%', left: '30%', zIndex: 50 }}>
              <AssetPopup asset={popupAsset} onExpand={handleExpand} onClose={() => setPopupAsset(null)} />
            </div>
          )}
          {cityPopup && (
            <div style={{ position: 'absolute', top: '35%', left: '32%', zIndex: 50 }}>
              <CityPopup city={cityPopup} onExpand={handleCityExpand} onClose={() => setCityPopup(null)} />
            </div>
          )}
          <CityDetailPanel
            city={selectedCity}
            isOpen={cityDetailOpen}
            onClose={() => { setCityDetailOpen(false); setSelectedCity(null) }}
          />
        </>
      ) : (
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
          {/* Placeholder chokepoint overlays */}
          <div
            className="absolute font-mono text-[9px] px-2 py-[2px] border"
            style={{
              bottom: '34%', right: '20%',
              color: hormuzClosed ? 'var(--status-critical)' : 'var(--status-warning)',
              borderColor: hormuzClosed ? 'var(--status-critical)' : 'var(--status-warning)',
              background: 'var(--bg-surface)',
            }}
          >
            STRAIT OF HORMUZ // {hormuzClosed ? 'CLOSED' : 'CONTESTED'}
          </div>
          <div
            className="absolute font-mono text-[9px] px-2 py-[2px] border"
            style={{
              bottom: '12%', left: '8%',
              color: 'var(--status-warning)',
              borderColor: 'var(--status-warning)',
              background: 'var(--bg-surface)',
            }}
          >
            BAB-EL-MANDEB
          </div>
          <FloatingMetricChip
            label="USS NIMITZ"
            value="CSG-11"
            variant="default"
            style={{ bottom: '30%', right: '16%' }}
          />
        </>
      )}

      {/* ── CSS coordinate grid overlay ── */}
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

      {/* ── Floating metric chips ── */}
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

      {/* ── Map layer controls ── */}
      {TOKEN && (
        <MapLayerControls layers={layers} onToggle={toggleLayer} />
      )}

      {/* ── Asset detail panel ── */}
      <AssetDetailPanel
        asset={selectedAsset}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedAsset(null) }}
      />

      {/* ── Asset info panel (map-assets click-to-inspect) ── */}
      {selectedMapAsset && (
        <AssetInfoPanel
          asset={selectedMapAsset}
          onClose={() => setSelectedAssetId(null)}
        />
      )}

      {/* ── Actor status panel ── */}
      <div style={{ position: 'absolute', bottom: 28, right: 10, zIndex: 40 }}>
        <ActorStatusPanel isGroundTruth={true} />
      </div>

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
