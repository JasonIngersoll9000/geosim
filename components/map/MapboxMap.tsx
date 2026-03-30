'use client'
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// ─── GeoJSON data ────────────────────────────────────────────────────────────

const IRAN_POLYGON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: { name: 'Iran' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [44.0, 37.5], [46.0, 38.5], [48.5, 39.5], [51.0, 41.0],
      [53.5, 41.5], [56.0, 41.5], [59.0, 41.0], [62.5, 38.0],
      [63.5, 37.0], [63.5, 33.5], [60.5, 29.5], [58.0, 25.5],
      [56.5, 27.0], [54.5, 26.5], [52.5, 29.0], [50.0, 30.0],
      [48.5, 31.0], [47.5, 30.5], [46.0, 32.5], [44.5, 36.0],
      [44.0, 37.5],
    ]],
  },
}

const US_NAVY_POLYGON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: { name: 'US Navy Presence' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [48.0, 23.0], [56.0, 22.5], [59.5, 23.5], [60.5, 24.5],
      [58.5, 25.5], [56.5, 26.5], [55.5, 26.5], [55.0, 24.5],
      [53.0, 24.0], [50.0, 24.5], [48.0, 24.0], [48.0, 23.0],
    ]],
  },
}

const HORMUZ_LINE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: [
      [55.8, 26.7], [56.3, 26.5], [56.7, 26.4], [57.1, 26.3],
    ],
  },
}

// ─── Dash animation sequences ─────────────────────────────────────────────────
const DASH_SEQUENCES = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
  [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 3, 3],
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  hormuzClosed: boolean
}

export function MapboxMap({ hormuzClosed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const hormuzRef = useRef(hormuzClosed)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    hormuzRef.current = hormuzClosed
    if (mapRef.current?.getLayer('hormuz-line')) {
      mapRef.current.setLayoutProperty(
        'hormuz-line', 'visibility',
        hormuzClosed ? 'visible' : 'none',
      )
      mapRef.current.setLayoutProperty(
        'hormuz-label', 'visibility',
        hormuzClosed ? 'visible' : 'none',
      )
    }
  }, [hormuzClosed])

  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    try {
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [56, 26],
        zoom: 5,
        attributionControl: false,
        logoPosition: 'bottom-right',
      })
    } catch {
      setWebglFailed(true)
      return
    }

    const map = mapRef.current!

    map.on('error', () => { /* suppress non-critical tile errors */ })

    // Small dark navigation control
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right',
    )

    map.on('load', () => {
      // ── Remove all text/symbol labels for classified look ──
      const style = map.getStyle()
      if (style?.layers) {
        for (const layer of style.layers) {
          if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        }
      }

      // ── Iran fill ──
      map.addSource('iran', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [IRAN_POLYGON] },
        generateId: true,
      })
      map.addLayer({
        id: 'iran-fill',
        type: 'fill',
        source: 'iran',
        paint: {
          'fill-color': 'rgba(192,57,43,0.1)',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.22, 0.1],
        },
      })
      map.addLayer({
        id: 'iran-outline',
        type: 'line',
        source: 'iran',
        paint: { 'line-color': 'rgba(192,57,43,0.35)', 'line-width': 0.75 },
      })

      // ── US Navy presence fill ──
      map.addSource('us-navy', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [US_NAVY_POLYGON] },
        generateId: true,
      })
      map.addLayer({
        id: 'us-navy-fill',
        type: 'fill',
        source: 'us-navy',
        paint: {
          'fill-color': 'rgba(74,144,217,0.08)',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.18, 0.08],
        },
      })
      map.addLayer({
        id: 'us-navy-outline',
        type: 'line',
        source: 'us-navy',
        paint: { 'line-color': 'rgba(74,144,217,0.25)', 'line-width': 0.75 },
      })

      // ── Hover interactivity ──
      let hoveredIranId: string | number | null = null
      map.on('mousemove', 'iran-fill', (e) => {
        if (e.features?.[0]) {
          if (hoveredIranId !== null) {
            map.setFeatureState({ source: 'iran', id: hoveredIranId }, { hover: false })
          }
          hoveredIranId = e.features[0].id ?? null
          if (hoveredIranId !== null) {
            map.setFeatureState({ source: 'iran', id: hoveredIranId }, { hover: true })
          }
          map.getCanvas().style.cursor = 'crosshair'
        }
      })
      map.on('mouseleave', 'iran-fill', () => {
        if (hoveredIranId !== null) {
          map.setFeatureState({ source: 'iran', id: hoveredIranId }, { hover: false })
        }
        hoveredIranId = null
        map.getCanvas().style.cursor = ''
      })

      let hoveredNavyId: string | number | null = null
      map.on('mousemove', 'us-navy-fill', (e) => {
        if (e.features?.[0]) {
          if (hoveredNavyId !== null) {
            map.setFeatureState({ source: 'us-navy', id: hoveredNavyId }, { hover: false })
          }
          hoveredNavyId = e.features[0].id ?? null
          if (hoveredNavyId !== null) {
            map.setFeatureState({ source: 'us-navy', id: hoveredNavyId }, { hover: true })
          }
        }
      })
      map.on('mouseleave', 'us-navy-fill', () => {
        if (hoveredNavyId !== null) {
          map.setFeatureState({ source: 'us-navy', id: hoveredNavyId }, { hover: false })
        }
        hoveredNavyId = null
      })

      // ── Hormuz chokepoint dashed line ──
      map.addSource('hormuz-line', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [HORMUZ_LINE] },
      })
      map.addLayer({
        id: 'hormuz-line',
        type: 'line',
        source: 'hormuz-line',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          visibility: hormuzRef.current ? 'visible' : 'none',
        },
        paint: {
          'line-color': 'rgba(192,57,43,0.9)',
          'line-width': 2.5,
          'line-dasharray': [2, 4],
        },
      })

      // Animate the dash offset
      let step = 0
      function animateDash() {
        step = (step + 1) % DASH_SEQUENCES.length
        if (map.getLayer('hormuz-line') && hormuzRef.current) {
          map.setPaintProperty('hormuz-line', 'line-dasharray', DASH_SEQUENCES[step])
        }
        animFrameRef.current = requestAnimationFrame(animateDash)
      }
      animFrameRef.current = requestAnimationFrame(animateDash)

      // ── Hormuz text label (symbol layer via GeoJSON point) ──
      map.addSource('hormuz-label-src', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { label: 'HORMUZ // CLOSED' },
          geometry: { type: 'Point', coordinates: [56.45, 26.55] },
        },
      })
      map.addLayer({
        id: 'hormuz-label',
        type: 'symbol',
        source: 'hormuz-label-src',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 9,
          'text-letter-spacing': 0.08,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.5],
          visibility: hormuzRef.current ? 'visible' : 'none',
        },
        paint: {
          'text-color': 'rgba(192,57,43,0.95)',
          'text-halo-color': 'rgba(5,10,18,0.8)',
          'text-halo-width': 1.5,
        },
      })

      // ── Bab-el-Mandeb chokepoint label ──
      map.addSource('babelmandeb-src', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { label: 'BAB-EL-MANDEB' },
          geometry: { type: 'Point', coordinates: [43.45, 12.6] },
        },
      })
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
        },
        paint: {
          'text-color': 'rgba(255,186,32,0.8)',
          'text-halo-color': 'rgba(5,10,18,0.8)',
          'text-halo-width': 1.5,
        },
      })

      // ── USS Nimitz carrier group marker ──
      const nimitzEl = document.createElement('div')
      nimitzEl.style.cssText = `
        width: 10px; height: 10px;
        background: rgba(74,144,217,0.9);
        border: 1.5px solid rgba(74,144,217,1);
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgba(74,144,217,0.2);
        cursor: pointer;
      `
      new mapboxgl.Marker({ element: nimitzEl })
        .setLngLat([57.5, 24.5])
        .addTo(map)
    })

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
      map.remove()
    }
  }, [])

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
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0A0F18' }}
    />
  )
}
