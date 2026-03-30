'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { LayerState } from './MapLayerControls'

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

interface Props {
  hormuzClosed: boolean
  layerState: LayerState
}

export function MapboxMap({ hormuzClosed, layerState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const nimitzMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const hormuzClosedRef = useRef(hormuzClosed)
  const layerStateRef = useRef(layerState)
  const [webglFailed, setWebglFailed] = useState(false)
  const isTerrainRef = useRef(false)

  // ── Helper: build the Nimitz DOM marker element ──────────────────────────
  const buildNimitzElement = useCallback(() => {
    const el = document.createElement('div')
    el.style.cssText = 'display:flex;align-items:center;gap:5px;cursor:pointer;pointer-events:auto;'
    const dot = document.createElement('div')
    dot.style.cssText = [
      'width:8px;height:8px;flex-shrink:0;',
      'background:rgba(74,144,217,0.9);',
      'border:1.5px solid rgba(74,144,217,1);',
      'border-radius:50%;',
      'box-shadow:0 0 0 3px rgba(74,144,217,0.15);',
    ].join('')
    const label = document.createElement('div')
    label.style.cssText = [
      "font-family:'IBM Plex Mono',monospace;",
      'font-size:8px;letter-spacing:0.08em;text-transform:uppercase;',
      'color:rgba(74,144,217,0.9);',
      'background:rgba(5,10,18,0.85);',
      'border:1px solid rgba(74,144,217,0.35);',
      'padding:1px 5px;white-space:nowrap;',
    ].join('')
    label.textContent = 'USS NIMITZ // CSG-11'
    el.appendChild(dot)
    el.appendChild(label)
    return el
  }, [])

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

    // Toggle Nimitz marker (DOM marker — use display style)
    if (nimitzMarkerRef.current) {
      const el = nimitzMarkerRef.current.getElement()
      el.style.display = ls.militaryAssets ? '' : 'none'
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
      console.error('[GeoSim map] constructor failed:', e)
      setWebglFailed(true)
      return
    }

    map.on('error', (e) => {
      const msg = (e as { error?: { message?: string } })?.error?.message ?? ''
      if (msg.includes('token') || msg.includes('style')) {
        console.error('[GeoSim map]', msg)
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

      // USS Nimitz marker at Strait of Hormuz approach lane (open water)
      if (nimitzMarkerRef.current) {
        nimitzMarkerRef.current.remove()
        nimitzMarkerRef.current = null
      }
      const nimitzEl = buildNimitzElement()
      nimitzEl.style.display = ls.militaryAssets ? '' : 'none'
      nimitzMarkerRef.current = new mapboxgl.Marker({
        element: nimitzEl,
        anchor: 'left',
      })
        .setLngLat([56.5, 24.0])
        .addTo(map)
    }

    map.on('load', onStyleLoad)

    return () => {
      if (nimitzMarkerRef.current) {
        nimitzMarkerRef.current.remove()
        nimitzMarkerRef.current = null
      }
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

        // Re-add Nimitz marker after style reset
        if (nimitzMarkerRef.current) {
          nimitzMarkerRef.current.remove()
          nimitzMarkerRef.current = null
        }
        const reloadNimitzEl = buildNimitzElement()
        reloadNimitzEl.style.display = ls.militaryAssets ? '' : 'none'
        nimitzMarkerRef.current = new mapboxgl.Marker({
          element: reloadNimitzEl,
          anchor: 'left',
        })
          .setLngLat([56.5, 24.0])
          .addTo(map)
      })
      return
    }

    // Non-terrain toggles
    applyBuiltinLayerVisibility(map, layerState)
    applyCustomLayerVisibility(map, layerState)
  }, [layerState, applyBuiltinLayerVisibility, applyCustomLayerVisibility, setupCustomLayers, buildNimitzElement])

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
