'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { LayerState } from './MapLayerControls'
import type { PositionedAsset, City, MapAsset } from '@/lib/types/simulation'
import type { ChokepointId } from './ChokepointPopup'
import { createAssetMarkerElement } from './AssetMarker'
import { createCityMarkerElement } from './CityMarker'

// ─── Key cities GeoJSON ───────────────────────────────────────────────────────

const KEY_CITIES_DATA: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'TEHRAN',      type: 'capital'  }, geometry: { type: 'Point', coordinates: [51.389, 35.689] } },
    { type: 'Feature', properties: { name: 'BANDAR ABBAS', type: 'port'    }, geometry: { type: 'Point', coordinates: [56.267, 27.183] } },
    { type: 'Feature', properties: { name: 'NATANZ',       type: 'nuclear' }, geometry: { type: 'Point', coordinates: [51.727, 33.724] } },
    { type: 'Feature', properties: { name: 'FORDOW',       type: 'nuclear' }, geometry: { type: 'Point', coordinates: [49.599, 34.885] } },
    { type: 'Feature', properties: { name: 'BUSHEHR',      type: 'nuclear' }, geometry: { type: 'Point', coordinates: [50.846, 28.968] } },
    { type: 'Feature', properties: { name: 'BAGHDAD',      type: 'capital' }, geometry: { type: 'Point', coordinates: [44.366, 33.315] } },
    { type: 'Feature', properties: { name: 'DUBAI',        type: 'city'    }, geometry: { type: 'Point', coordinates: [55.271, 25.205] } },
    { type: 'Feature', properties: { name: 'MUSCAT',       type: 'city'    }, geometry: { type: 'Point', coordinates: [58.593, 23.588] } },
    { type: 'Feature', properties: { name: 'DOHA',         type: 'city'    }, geometry: { type: 'Point', coordinates: [51.531, 25.286] } },
  ],
}

// ─── Military bases GeoJSON ───────────────────────────────────────────────────

const MILITARY_BASES_DATA: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'AL UDEID AB',      nation: 'US',   type: 'airbase' }, geometry: { type: 'Point', coordinates: [51.315, 25.117] } },
    { type: 'Feature', properties: { name: 'PRINCE SULTAN AB', nation: 'US',   type: 'airbase' }, geometry: { type: 'Point', coordinates: [47.578, 24.063] } },
    { type: 'Feature', properties: { name: 'ALI AL SALEM AB',  nation: 'US',   type: 'airbase' }, geometry: { type: 'Point', coordinates: [47.668, 29.451] } },
    { type: 'Feature', properties: { name: 'CAMP LEMONNIER',   nation: 'US',   type: 'base'    }, geometry: { type: 'Point', coordinates: [43.150, 11.547] } },
    { type: 'Feature', properties: { name: 'OVDA AB',          nation: 'US/IL', type: 'airbase' }, geometry: { type: 'Point', coordinates: [34.938, 29.940] } },
    { type: 'Feature', properties: { name: 'NEVATIM AB',       nation: 'IL',   type: 'airbase' }, geometry: { type: 'Point', coordinates: [34.822, 31.206] } },
    { type: 'Feature', properties: { name: 'IRGC BANDAR IMAM', nation: 'IR',   type: 'naval'   }, geometry: { type: 'Point', coordinates: [49.073, 30.437] } },
  ],
}

// ─── Hormuz label point ───────────────────────────────────────────────────────

const HORMUZ_POINT_DATA = (closed: boolean): GeoJSON.Feature<GeoJSON.Point> => ({
  type: 'Feature',
  properties: { label: closed ? 'HORMUZ // CLOSED' : 'HORMUZ // CONTESTED' },
  geometry: { type: 'Point', coordinates: [56.45, 26.55] },
})

// ─── Bab-el-Mandeb label point ────────────────────────────────────────────────

const BABELMANDEB_POINT_DATA: GeoJSON.Feature<GeoJSON.Point> = {
  type: 'Feature',
  properties: { label: 'BAB-EL-MANDEB' },
  geometry: { type: 'Point', coordinates: [43.45, 12.6] },
}

// ─── Layer IDs managed by this component ────────────────────────────────────

const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11'
const TERRAIN_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'

const BORDER_LAYERS = ['admin-0-boundary', 'admin-0-boundary-bg', 'admin-0-boundary-disputed']
const NAME_LAYERS = ['country-label']

const _CUSTOM_LAYER_IDS = [
  'iran-border',
  'hormuz-point',
  'hormuz-label',
  'babelmandeb-label',
  'cities-dot',
  'cities-label',
  'bases-dot',
  'bases-label',
]

// ─── Component ────────────────────────────────────────────────────────────────

interface ScreenPos { x: number; y: number }

interface Props {
  hormuzClosed: boolean
  layerState: LayerState
  assets?: PositionedAsset[]
  selectedAssetId?: string | null
  onAssetClick?: (asset: PositionedAsset) => void
  cities?: City[]
  onCityClick?: (city: City) => void
  mapAssets?: MapAsset[]
  onMapAssetClick?: (asset: MapAsset, screenPos: ScreenPos) => void
  onChokepointClick?: (id: ChokepointId, screenPos: ScreenPos) => void
}

export function MapboxMap({ hormuzClosed, layerState, assets, selectedAssetId, onAssetClick, cities, onCityClick, mapAssets, onMapAssetClick, onChokepointClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const hormuzClosedRef = useRef(hormuzClosed)
  const layerStateRef = useRef(layerState)
  const onChokepointClickRef = useRef(onChokepointClick)
  const [webglFailed, setWebglFailed] = useState(false)
  const isTerrainRef = useRef(false)
  const chokepointListenersAttachedRef = useRef(false)
  const assetMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const cityMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const mapAssetMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())

  useEffect(() => { onChokepointClickRef.current = onChokepointClick }, [onChokepointClick])

  // ── Helper: add all custom sources + layers to the current map ───────────
  const setupCustomLayers = useCallback((map: mapboxgl.Map, closed: boolean, ls: LayerState) => {
    // ── Iran border highlight ──
    if (!map.getSource('iran-boundaries')) {
      map.addSource('iran-boundaries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
      })
    }
    if (!map.getLayer('iran-border')) {
      map.addLayer({
        id: 'iran-border',
        type: 'line',
        source: 'iran-boundaries',
        'source-layer': 'country_boundaries',
        filter: ['==', ['get', 'iso_3166_1'], 'IRN'],
        paint: {
          'line-color': 'rgba(192,57,43,0.65)',
          'line-width': 1.5,
          'line-opacity': 0.85,
        },
        layout: {
          visibility: ls.countryBorders ? 'visible' : 'none',
        },
      })
    }

    // ── Hormuz point label ──
    if (!map.getSource('hormuz-point-src')) {
      map.addSource('hormuz-point-src', {
        type: 'geojson',
        data: HORMUZ_POINT_DATA(closed),
      })
    } else {
      (map.getSource('hormuz-point-src') as mapboxgl.GeoJSONSource)
        .setData(HORMUZ_POINT_DATA(closed))
    }
    if (!map.getLayer('hormuz-point')) {
      map.addLayer({
        id: 'hormuz-point',
        type: 'circle',
        source: 'hormuz-point-src',
        paint: {
          'circle-radius': 4,
          'circle-color': closed ? 'rgba(192,57,43,0.85)' : 'rgba(255,186,32,0.8)',
          'circle-stroke-width': 1,
          'circle-stroke-color': closed ? 'rgba(192,57,43,0.5)' : 'rgba(255,186,32,0.4)',
        },
        layout: { visibility: ls.militaryAssets ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('hormuz-label')) {
      map.addLayer({
        id: 'hormuz-label',
        type: 'symbol',
        source: 'hormuz-point-src',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 9,
          'text-letter-spacing': 0.08,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.7],
          visibility: ls.militaryAssets ? 'visible' : 'none',
        },
        paint: {
          'text-color': closed ? 'rgba(192,57,43,0.95)' : 'rgba(255,186,32,0.9)',
          'text-halo-color': 'rgba(5,10,18,0.85)',
          'text-halo-width': 1.5,
        },
      })
    }

    // ── Bab-el-Mandeb point ──
    if (!map.getSource('babelmandeb-src')) {
      map.addSource('babelmandeb-src', {
        type: 'geojson',
        data: BABELMANDEB_POINT_DATA,
      })
    }
    if (!map.getLayer('babelmandeb-label')) {
      map.addLayer({
        id: 'babelmandeb-label',
        type: 'symbol',
        source: 'babelmandeb-src',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 9,
          'text-letter-spacing': 0.08,
          'text-anchor': 'bottom',
          visibility: ls.militaryAssets ? 'visible' : 'none',
        },
        paint: {
          'text-color': 'rgba(255,186,32,0.75)',
          'text-halo-color': 'rgba(5,10,18,0.85)',
          'text-halo-width': 1.5,
        },
      })
    }

    // ── Key cities ──
    if (!map.getSource('key-cities-src')) {
      map.addSource('key-cities-src', {
        type: 'geojson',
        data: KEY_CITIES_DATA,
      })
    }
    if (!map.getLayer('cities-dot')) {
      map.addLayer({
        id: 'cities-dot',
        type: 'circle',
        source: 'key-cities-src',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'type'], 'nuclear'], 3.5, 2.5],
          'circle-color': [
            'match', ['get', 'type'],
            'nuclear', 'rgba(255,186,32,0.8)',
            'capital', 'rgba(229,226,225,0.55)',
            'port',    'rgba(74,144,217,0.7)',
            'rgba(229,226,225,0.4)',
          ],
          'circle-stroke-width': ['case', ['==', ['get', 'type'], 'nuclear'], 1, 0],
          'circle-stroke-color': 'rgba(255,186,32,0.5)',
        },
        layout: { visibility: ls.keyCities ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('cities-label')) {
      map.addLayer({
        id: 'cities-label',
        type: 'symbol',
        source: 'key-cities-src',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 8,
          'text-letter-spacing': 0.08,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.6],
          visibility: ls.keyCities ? 'visible' : 'none',
        },
        paint: {
          'text-color': [
            'match', ['get', 'type'],
            'nuclear', 'rgba(255,186,32,0.9)',
            'capital', 'rgba(229,226,225,0.7)',
            'rgba(229,226,225,0.5)',
          ],
          'text-halo-color': 'rgba(5,10,18,0.9)',
          'text-halo-width': 1.5,
        },
      })
    }

    // ── Military bases ──
    if (!map.getSource('mil-bases-src')) {
      map.addSource('mil-bases-src', {
        type: 'geojson',
        data: MILITARY_BASES_DATA,
      })
    }
    if (!map.getLayer('bases-dot')) {
      map.addLayer({
        id: 'bases-dot',
        type: 'circle',
        source: 'mil-bases-src',
        paint: {
          'circle-radius': 3,
          'circle-color': [
            'match', ['get', 'nation'],
            'US',   'rgba(74,144,217,0.75)',
            'IL',   'rgba(255,186,32,0.75)',
            'US/IL','rgba(74,184,217,0.75)',
            'IR',   'rgba(192,57,43,0.75)',
            'rgba(229,226,225,0.4)',
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.2)',
        },
        layout: { visibility: ls.militaryBases ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('bases-label')) {
      map.addLayer({
        id: 'bases-label',
        type: 'symbol',
        source: 'mil-bases-src',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 7.5,
          'text-letter-spacing': 0.06,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
          visibility: ls.militaryBases ? 'visible' : 'none',
        },
        paint: {
          'text-color': 'rgba(229,226,225,0.55)',
          'text-halo-color': 'rgba(5,10,18,0.9)',
          'text-halo-width': 1.5,
        },
      })
    }
  }, [])

  // ── Helper: apply built-in layer visibility toggles ──────────────────────
  const applyBuiltinLayerVisibility = useCallback((map: mapboxgl.Map, ls: LayerState) => {
    for (const id of BORDER_LAYERS) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', ls.countryBorders ? 'visible' : 'none')
      }
    }
    for (const id of NAME_LAYERS) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', ls.countryNames ? 'visible' : 'none')
      }
    }
    if (map.getLayer('iran-border')) {
      map.setLayoutProperty('iran-border', 'visibility', ls.countryBorders ? 'visible' : 'none')
    }
  }, [])

  // ── Helper: apply custom layer visibility toggles ─────────────────────────
  const applyCustomLayerVisibility = useCallback((map: mapboxgl.Map, ls: LayerState) => {
    const militaryLayers  = ['hormuz-point', 'hormuz-label', 'babelmandeb-label']
    const cityLayers      = ['cities-dot', 'cities-label']
    const baseLayers      = ['bases-dot', 'bases-label']

    for (const id of militaryLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.militaryAssets ? 'visible' : 'none')
    }
    for (const id of cityLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.keyCities ? 'visible' : 'none')
    }
    for (const id of baseLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.militaryBases ? 'visible' : 'none')
    }

  }, [])

  // ── Helper: attach chokepoint click / cursor listeners ───────────────────
  // Guards via chokepointListenersAttachedRef to prevent duplicate handlers
  // accumulating across terrain style reloads.
  const setupChokepointListeners = useCallback((m: mapboxgl.Map) => {
    if (chokepointListenersAttachedRef.current) return
    chokepointListenersAttachedRef.current = true

    const clickableLayers = ['hormuz-point', 'babelmandeb-label'] as const
    for (const layerId of clickableLayers) {
      if (m.getLayer(layerId)) {
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = '' })
      }
    }
    if (m.getLayer('hormuz-point')) {
      m.on('click', 'hormuz-point', (e) => {
        onChokepointClickRef.current?.('strait_of_hormuz', { x: e.point.x, y: e.point.y })
      })
    }
    if (m.getLayer('babelmandeb-label')) {
      m.on('click', 'babelmandeb-label', (e) => {
        onChokepointClickRef.current?.('bab_el_mandeb', { x: e.point.x, y: e.point.y })
      })
    }
  }, [])

  // ── Initial map setup ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    if (!mapboxgl.supported()) { setWebglFailed(true); return }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    let map: mapboxgl.Map
    try {
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: [56, 28],
        zoom: 4.8,
        attributionControl: false,
        logoPosition: 'bottom-right',
      })
      map = mapRef.current
    } catch (e) {
      console.error('[War Game map] constructor failed:', e)
      setWebglFailed(true)
      return
    }

    map.on('error', (e) => {
      const msg = (e as { error?: { message?: string } })?.error?.message ?? ''
      if (msg.includes('token') || msg.includes('style')) {
        console.error('[War Game map]', msg)
      }
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    function onStyleLoad() {
      const ls   = layerStateRef.current
      const closed = hormuzClosedRef.current

      // Hide all symbol layers by default (classified aesthetic)
      const style = map.getStyle()
      if (style?.layers) {
        for (const layer of style.layers) {
          if (layer.type === 'symbol') {
            try { map.setLayoutProperty(layer.id, 'visibility', 'none') } catch { /* symbol layers that don't support visibility — expected */ }
          }
        }
      }

      // Re-apply built-in border/name visibility per current toggle state
      applyBuiltinLayerVisibility(map, ls)

      // Add all custom layers
      setupCustomLayers(map, closed, ls)

      // Wire chokepoint click handlers
      setupChokepointListeners(map)
    }

    map.on('load', onStyleLoad)

    return () => {
      cityMarkersRef.current.forEach(marker => marker.remove())
      cityMarkersRef.current.clear()
      mapAssetMarkersRef.current.forEach(marker => marker.remove())
      mapAssetMarkersRef.current.clear()
      try { map.remove() } catch (e) { console.warn('[MapboxMap] cleanup failed:', e) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync hormuzClosed prop ────────────────────────────────────────────────
  useEffect(() => {
    hormuzClosedRef.current = hormuzClosed
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    try {
      // Update Hormuz point source data
      if (map.getSource('hormuz-point-src')) {
        (map.getSource('hormuz-point-src') as mapboxgl.GeoJSONSource)
          .setData(HORMUZ_POINT_DATA(hormuzClosed))
      }
      // Update circle and label colours
      if (map.getLayer('hormuz-point')) {
        map.setPaintProperty('hormuz-point', 'circle-color',
          hormuzClosed ? 'rgba(192,57,43,0.85)' : 'rgba(255,186,32,0.8)')
      }
      if (map.getLayer('hormuz-label')) {
        map.setPaintProperty('hormuz-label', 'text-color',
          hormuzClosed ? 'rgba(192,57,43,0.95)' : 'rgba(255,186,32,0.9)')
      }
    } catch (e) {
      console.warn('[MapboxMap] hormuzClosed update failed:', e)
    }
  }, [hormuzClosed])

  // ── Sync layerState prop ──────────────────────────────────────────────────
  useEffect(() => {
    layerStateRef.current = layerState
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    // Terrain style switch
    const newTerrain = layerState.terrain
    if (newTerrain !== isTerrainRef.current) {
      isTerrainRef.current = newTerrain
      const nextStyle = newTerrain ? TERRAIN_STYLE : DARK_STYLE
      chokepointListenersAttachedRef.current = false
      map.setStyle(nextStyle)
      map.once('style.load', () => {
        const ls     = layerStateRef.current
        const closed = hormuzClosedRef.current
        // After style load: hide all default symbol layers
        const style = map.getStyle()
        if (style?.layers) {
          for (const layer of style.layers) {
            if (layer.type === 'symbol') {
              try { map.setLayoutProperty(layer.id, 'visibility', 'none') } catch { /* symbol layers that don't support visibility — expected */ }
            }
          }
        }
        applyBuiltinLayerVisibility(map, ls)
        setupCustomLayers(map, closed, ls)
        setupChokepointListeners(map)
      })
      return
    }

    // Non-terrain toggles
    applyBuiltinLayerVisibility(map, layerState)
    applyCustomLayerVisibility(map, layerState)
  }, [layerState, applyBuiltinLayerVisibility, applyCustomLayerVisibility, setupCustomLayers, setupChokepointListeners])

  // ── Asset markers ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !assets) return

    assetMarkersRef.current.forEach(marker => marker.remove())
    assetMarkersRef.current.clear()

    assets.forEach(asset => {
      const isUs = asset.actorId === 'us' || asset.actorId === 'united_states'
      const actorVisible =
        (isUs && layerState.usAssets) ||
        (asset.actorId === 'iran' && layerState.iranAssets) ||
        (asset.actorId === 'israel' && layerState.israelAssets) ||
        (asset.category === 'infrastructure' && layerState.infrastructure)

      if (!actorVisible) return

      const el = createAssetMarkerElement({
        actorId: asset.actorId,
        category: asset.category,
        shortName: asset.shortName,
        status: asset.status,
        onClick: () => onAssetClick?.(asset),
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([asset.position.lng, asset.position.lat])
        .addTo(map)

      assetMarkersRef.current.set(asset.id, marker)
    })
  }, [assets, layerState.usAssets, layerState.iranAssets, layerState.israelAssets, layerState.infrastructure, onAssetClick])

  // ── City markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    cityMarkersRef.current.forEach(marker => marker.remove())
    cityMarkersRef.current.clear()
    if (!map || !cities || !layerState.keyCities) return

    cities.forEach(city => {
      const el = createCityMarkerElement({
        city,
        onClick: () => onCityClick?.(city),
      })
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([city.position.lng, city.position.lat])
        .addTo(map)
      cityMarkersRef.current.set(city.id, marker)
    })
  }, [cities, layerState.keyCities, onCityClick])

  // ── MapAsset markers (Supabase-sourced live assets) ──────────────────────
  useEffect(() => {
    const map = mapRef.current
    mapAssetMarkersRef.current.forEach(marker => marker.remove())
    mapAssetMarkersRef.current.clear()
    if (!map || !mapAssets || mapAssets.length === 0) return

    mapAssets.forEach(asset => {
      const isUs     = asset.actor_id === 'us'
      const isIran   = asset.actor_id === 'iran'
      const isIsrael = asset.actor_id === 'israel'
      const isInfra  = asset.asset_type === 'oil_gas_facility' || asset.asset_type === 'nuclear_facility'
      const isNaval  = asset.asset_type === 'naval_asset' || asset.asset_type === 'carrier_group'

      const actorVisible =
        (isUs     && layerState.usAssets) ||
        (isIran   && layerState.iranAssets) ||
        (isIsrael && layerState.israelAssets) ||
        (isInfra  && layerState.infrastructure) ||
        (!isUs && !isIran && !isIsrael && !isInfra && layerState.militaryAssets)

      if (!actorVisible) return
      if (!layerState.militaryAssets && !isInfra) return

      const destroyed = asset.status === 'destroyed'
      const degraded  = asset.status === 'degraded'
      const color     = destroyed ? '#b43232' : degraded ? '#dcaa1e' : asset.actor_color

      const el = document.createElement('div')
      el.style.cssText = [
        'display:flex;align-items:center;gap:4px;cursor:pointer;pointer-events:auto;',
        destroyed ? 'opacity:0.45;' : '',
      ].join('')

      if (isNaval) {
        // Larger, distinctive naval marker
        const shipIcon = document.createElement('div')
        const size = asset.asset_type === 'carrier_group' ? 14 : 10
        shipIcon.style.cssText = [
          `width:${size}px;height:${size}px;flex-shrink:0;`,
          'transform:rotate(-90deg);',
          `color:${color};`,
          'font-size:' + (size + 2) + 'px;line-height:1;',
          degraded ? 'filter:brightness(0.8) saturate(0.7);' : '',
        ].join('')
        shipIcon.textContent = asset.asset_type === 'carrier_group' ? '▶' : '◀'

        const ring = document.createElement('div')
        ring.style.cssText = [
          `width:${size + 6}px;height:${size + 6}px;border-radius:50%;flex-shrink:0;`,
          'display:flex;align-items:center;justify-content:center;',
          `border:1.5px solid ${color};`,
          `background:${color}18;`,
          `box-shadow:0 0 6px ${color}44;`,
          destroyed ? 'opacity:0.5;' : '',
        ].join('')
        ring.appendChild(shipIcon)
        el.appendChild(ring)
      } else {
        // Standard dot marker
        const dot = document.createElement('div')
        const dotSize = isInfra ? 8 : 7
        dot.style.cssText = [
          `width:${dotSize}px;height:${dotSize}px;flex-shrink:0;`,
          isInfra ? 'border-radius:2px;' : 'border-radius:50%;',
          `background:${destroyed ? 'rgba(180,50,50,0.4)' : degraded ? 'rgba(220,170,30,0.7)' : `${color}bb`};`,
          `border:1.5px solid ${color};`,
          `box-shadow:0 0 0 2px ${color}1a;`,
        ].join('')
        el.appendChild(dot)
      }

      const label = document.createElement('div')
      label.style.cssText = [
        "font-family:'IBM Plex Mono',monospace;",
        `font-size:${isNaval ? 8 : 7}px;letter-spacing:0.07em;text-transform:uppercase;`,
        `color:${destroyed ? 'rgba(180,80,80,0.55)' : degraded ? 'rgba(220,170,30,0.9)' : `${color}ee`};`,
        'background:rgba(5,10,18,0.9);',
        `border:1px solid ${color}33;`,
        `padding:${isNaval ? '2px 5px' : '1px 4px'};white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;`,
        destroyed ? 'text-decoration:line-through;' : '',
        isNaval ? `font-weight:600;border-left:2px solid ${color};` : '',
      ].join('')
      label.textContent = asset.label
      label.title = asset.tooltip ?? asset.label

      el.appendChild(label)

      el.addEventListener('click', () => {
        const pos = map.project([asset.lng, asset.lat])
        onMapAssetClick?.(asset, { x: pos.x, y: pos.y })
      })
      el.addEventListener('mouseenter', () => { el.style.opacity = '0.85'; el.style.filter = 'brightness(1.15)' })
      el.addEventListener('mouseleave', () => { el.style.opacity = destroyed ? '0.45' : '1'; el.style.filter = '' })

      const anchor = isNaval ? 'center' : 'left'
      const marker = new mapboxgl.Marker({ element: el, anchor })
        .setLngLat([asset.lng, asset.lat])
        .addTo(map)

      mapAssetMarkersRef.current.set(asset.id, marker)
    })
  }, [mapAssets, layerState.usAssets, layerState.iranAssets, layerState.israelAssets, layerState.infrastructure, layerState.militaryAssets, onMapAssetClick])

  // ── Range rings ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nmToM = (nm: number) => nm * 1852

    ;['strike-ring-fill', 'threat-ring-fill'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id)
    })
    ;['selected-asset-strike-ring', 'selected-asset-threat-ring'].forEach(id => {
      if (map.getSource(id)) map.removeSource(id)
    })

    const selected = assets?.find(a => a.id === selectedAssetId)
    if (!selected) return

    if (layerState.strikeRings && selected.strikeRangeNm) {
      map.addSource('selected-asset-strike-ring', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [selected.position.lng, selected.position.lat] }, properties: {} },
      })
      map.addLayer({
        id: 'strike-ring-fill', type: 'circle', source: 'selected-asset-strike-ring',
        paint: {
          'circle-radius': { stops: [[0, 0], [20, nmToM(selected.strikeRangeNm) / 0.075]], base: 2 },
          'circle-color': 'transparent', 'circle-stroke-width': 1.5,
          'circle-stroke-color': '#2980b9', 'circle-opacity': 0, 'circle-stroke-opacity': 0.5,
        },
      })
    }

    if (layerState.threatRings && selected.threatRangeNm) {
      map.addSource('selected-asset-threat-ring', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [selected.position.lng, selected.position.lat] }, properties: {} },
      })
      map.addLayer({
        id: 'threat-ring-fill', type: 'circle', source: 'selected-asset-threat-ring',
        paint: {
          'circle-radius': { stops: [[0, 0], [20, nmToM(selected.threatRangeNm) / 0.075]], base: 2 },
          'circle-color': 'transparent', 'circle-stroke-width': 1.5,
          'circle-stroke-color': '#c0392b', 'circle-opacity': 0, 'circle-stroke-opacity': 0.4,
        },
      })
    }
  }, [selectedAssetId, assets, layerState.strikeRings, layerState.threatRings])

  // ─── Render ──────────────────────────────────────────────────────────────

  if (webglFailed) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#0A0F18' }}>
        <div
          className="text-center px-8 py-5"
          style={{ border: '1px solid rgba(164,201,255,0.10)', background: 'rgba(5,10,18,0.75)' }}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-tertiary mb-2">
            MAP CLASSIFIED // WEBGL UNAVAILABLE
          </div>
          <div className="w-20 h-px bg-border-subtle mx-auto mb-2" style={{ opacity: 0.4 }} />
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary">
            24°N 56°E // PERSIAN GULF THEATER
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: '#0A0F18' }} />
  )
}
