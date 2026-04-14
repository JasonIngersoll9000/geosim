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
    // Iran
    { type: 'Feature', properties: { name: 'TEHRAN',       type: 'capital', nation: 'IR' }, geometry: { type: 'Point', coordinates: [51.389,  35.689] } },
    { type: 'Feature', properties: { name: 'BANDAR ABBAS', type: 'port',    nation: 'IR' }, geometry: { type: 'Point', coordinates: [56.267,  27.183] } },
    { type: 'Feature', properties: { name: 'NATANZ',       type: 'nuclear', nation: 'IR' }, geometry: { type: 'Point', coordinates: [51.727,  33.724] } },
    { type: 'Feature', properties: { name: 'FORDOW',       type: 'nuclear', nation: 'IR' }, geometry: { type: 'Point', coordinates: [49.599,  34.885] } },
    { type: 'Feature', properties: { name: 'BUSHEHR',      type: 'nuclear', nation: 'IR' }, geometry: { type: 'Point', coordinates: [50.846,  28.968] } },
    { type: 'Feature', properties: { name: 'ISFAHAN',      type: 'city',    nation: 'IR' }, geometry: { type: 'Point', coordinates: [51.677,  32.661] } },
    { type: 'Feature', properties: { name: 'AHVAZ',        type: 'port',    nation: 'IR' }, geometry: { type: 'Point', coordinates: [48.671,  31.319] } },
    // Israel
    { type: 'Feature', properties: { name: 'TEL AVIV',     type: 'city',    nation: 'IL' }, geometry: { type: 'Point', coordinates: [34.781,  32.085] } },
    { type: 'Feature', properties: { name: 'JERUSALEM',    type: 'capital', nation: 'IL' }, geometry: { type: 'Point', coordinates: [35.213,  31.768] } },
    { type: 'Feature', properties: { name: 'HAIFA',        type: 'port',    nation: 'IL' }, geometry: { type: 'Point', coordinates: [34.989,  32.794] } },
    // Gulf States
    { type: 'Feature', properties: { name: 'RIYADH',       type: 'capital', nation: 'SA' }, geometry: { type: 'Point', coordinates: [46.722,  24.688] } },
    { type: 'Feature', properties: { name: 'DUBAI',        type: 'city',    nation: 'AE' }, geometry: { type: 'Point', coordinates: [55.271,  25.205] } },
    { type: 'Feature', properties: { name: 'ABU DHABI',    type: 'capital', nation: 'AE' }, geometry: { type: 'Point', coordinates: [54.366,  24.466] } },
    { type: 'Feature', properties: { name: 'DOHA',         type: 'capital', nation: 'QA' }, geometry: { type: 'Point', coordinates: [51.531,  25.286] } },
    { type: 'Feature', properties: { name: 'MUSCAT',       type: 'capital', nation: 'OM' }, geometry: { type: 'Point', coordinates: [58.593,  23.588] } },
    { type: 'Feature', properties: { name: 'KUWAIT CITY',  type: 'capital', nation: 'KW' }, geometry: { type: 'Point', coordinates: [47.978,  29.370] } },
    // Others
    { type: 'Feature', properties: { name: 'BAGHDAD',      type: 'capital', nation: 'IQ' }, geometry: { type: 'Point', coordinates: [44.366,  33.315] } },
    { type: 'Feature', properties: { name: 'BEIRUT',       type: 'capital', nation: 'LB' }, geometry: { type: 'Point', coordinates: [35.495,  33.889] } },
    { type: 'Feature', properties: { name: 'DAMASCUS',     type: 'capital', nation: 'SY' }, geometry: { type: 'Point', coordinates: [36.292,  33.510] } },
    { type: 'Feature', properties: { name: "SANA'A",       type: 'capital', nation: 'YE' }, geometry: { type: 'Point', coordinates: [44.206,  15.354] } },
    { type: 'Feature', properties: { name: 'ADEN',         type: 'port',    nation: 'YE' }, geometry: { type: 'Point', coordinates: [45.037,  12.779] } },
  ],
}

// ─── Nation → dot color ───────────────────────────────────────────────────────

const CITY_NATION_COLORS: mapboxgl.Expression = [
  'match', ['get', 'nation'],
  'IR',  'rgba(192,57,43,0.85)',
  'IL',  'rgba(79,195,247,0.85)',
  'US',  'rgba(41,128,185,0.85)',
  'SA',  'rgba(243,156,18,0.85)',
  'AE',  'rgba(142,68,173,0.75)',
  'QA',  'rgba(39,174,96,0.75)',
  'OM',  'rgba(22,160,133,0.75)',
  'KW',  'rgba(44,62,80,0.75)',
  'IQ',  'rgba(127,140,141,0.75)',
  'LB',  'rgba(231,76,60,0.75)',
  'SY',  'rgba(149,165,166,0.75)',
  'YE',  'rgba(211,84,0,0.75)',
  'rgba(229,226,225,0.45)',
]

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

// ─── Geo circle helper (true geographic radius) ──────────────────────────────

function geoCircle(
  lng: number, lat: number, radiusKm: number, steps = 72,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const RAD = Math.PI / 180
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const a  = (i / steps) * 2 * Math.PI
    const dLng = (radiusKm / (111.32 * Math.cos(lat * RAD))) * Math.cos(a)
    const dLat = (radiusKm / 110.574) * Math.sin(a)
    coords.push([lng + dLng, lat + dLat])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }
}

// ─── Static naval markers ─────────────────────────────────────────────────────

const STATIC_NAVAL_DATA: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'USS NIMITZ (CSG-11)', type: 'carrier_group', nation: 'US',
        capability: 'Carrier Strike Group 11. 70 aircraft, Tomahawk cruise missiles, SM-6 air defense.' },
      geometry: { type: 'Point', coordinates: [62.0, 21.5] } },
    { type: 'Feature', properties: { name: 'USS EISENHOWER (CSG-2)', type: 'carrier_group', nation: 'US',
        capability: 'Carrier Strike Group 2. Operating in Red Sea / Gulf of Aden to counter Houthi threats.' },
      geometry: { type: 'Point', coordinates: [43.5, 14.0] } },
    { type: 'Feature', properties: { name: 'USS GERALD R. FORD (CSG-12)', type: 'carrier_group', nation: 'US',
        capability: 'Carrier Strike Group 12. Deployed to Eastern Mediterranean for deterrence operations.' },
      geometry: { type: 'Point', coordinates: [30.0, 34.5] } },
    { type: 'Feature', properties: { name: 'IRGCN FAST ATTACK CRAFT', type: 'naval_unit', nation: 'IR',
        capability: 'IRGC Navy fast-attack and mine-laying vessels. Doctrine: swarm tactics in Hormuz.' },
      geometry: { type: 'Point', coordinates: [56.3, 27.2] } },
    { type: 'Feature', properties: { name: 'IRGCN BANDAR LARAK', type: 'naval_unit', nation: 'IR',
        capability: 'IRGC naval base. Torpedo boats and anti-ship missile systems covering Hormuz eastern flank.' },
      geometry: { type: 'Point', coordinates: [56.85, 26.85] } },
    { type: 'Feature', properties: { name: 'INS SAAR-6 CORVETTES', type: 'naval_unit', nation: 'IL',
        capability: 'Israeli Navy Sa\'ar 6-class corvettes equipped with C-Dome naval missile defense.' },
      geometry: { type: 'Point', coordinates: [34.9, 32.8] } },
  ],
}

// ─── Strike rings GeoJSON (missile strike envelopes) ─────────────────────────

const STRIKE_RINGS_DATA: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: 'FeatureCollection',
  features: [
    // Iran Shahab-3 / Emad MRBM range (~2000km) from Isfahan missile complex
    Object.assign(geoCircle(51.677, 32.661, 2000), { properties: { nation: 'IR', label: 'IRAN MRBM 2000km' } }),
    // Iran Shahed-136 UAS range (~2500km) from western Iran
    Object.assign(geoCircle(47.0, 34.5, 1500), { properties: { nation: 'IR', label: 'IRAN UAV 1500km' } }),
    // US Al Udeid strike radius (B-1B ~2400km with AAR, F-15E ~600km unrefueled)
    Object.assign(geoCircle(51.315, 25.117, 800), { properties: { nation: 'US', label: 'AL UDEID 800km' } }),
    // Israel Nevatim F-35 range (~1500km)
    Object.assign(geoCircle(34.822, 31.206, 1500), { properties: { nation: 'IL', label: 'NEVATIM F-35 1500km' } }),
  ],
}

// ─── Threat rings GeoJSON (SAM / radar coverage) ──────────────────────────────

const THREAT_RINGS_DATA: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: 'FeatureCollection',
  features: [
    // Iran S-300 / Bavar-373 coverage over Tehran (~200km)
    Object.assign(geoCircle(51.389, 35.689, 200), { properties: { nation: 'IR', label: 'TEHRAN SAM 200km' } }),
    // Iran S-300 coverage over Natanz nuclear facility (~200km)
    Object.assign(geoCircle(51.727, 33.724, 180), { properties: { nation: 'IR', label: 'NATANZ SAM 180km' } }),
    // Iran Fordow SAM coverage (~150km)
    Object.assign(geoCircle(49.599, 34.885, 150), { properties: { nation: 'IR', label: 'FORDOW SAM 150km' } }),
    // US THAAD / Patriot coverage at Al Udeid (~100km)
    Object.assign(geoCircle(51.315, 25.117, 100), { properties: { nation: 'US', label: 'AL UDEID THAAD 100km' } }),
    // US Arrow-3 / Iron Dome layered coverage Israel (~150km)
    Object.assign(geoCircle(34.9, 31.5, 150), { properties: { nation: 'IL', label: 'ISRAEL AIR DEF 150km' } }),
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

export interface StaticFeatureClickInfo {
  name: string
  type: string
  nation?: string
  capability?: string
  screenX: number
  screenY: number
}

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
  onStaticFeatureClick?: (info: StaticFeatureClickInfo) => void
}

export function MapboxMap({ hormuzClosed, layerState, assets, selectedAssetId, onAssetClick, cities, onCityClick, mapAssets, onMapAssetClick, onChokepointClick, onStaticFeatureClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const hormuzClosedRef = useRef(hormuzClosed)
  const layerStateRef = useRef(layerState)
  const onChokepointClickRef = useRef(onChokepointClick)
  const onStaticFeatureClickRef = useRef(onStaticFeatureClick)
  const [webglFailed, setWebglFailed] = useState(false)
  const isTerrainRef = useRef(false)
  const chokepointListenersAttachedRef = useRef(false)
  const assetMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const cityMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const mapAssetMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())

  useEffect(() => { onChokepointClickRef.current = onChokepointClick }, [onChokepointClick])
  useEffect(() => { onStaticFeatureClickRef.current = onStaticFeatureClick }, [onStaticFeatureClick])

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
          'circle-radius': ['case',
            ['==', ['get', 'type'], 'nuclear'], 4,
            ['==', ['get', 'type'], 'capital'], 3.5,
            3,
          ],
          'circle-color': CITY_NATION_COLORS,
          'circle-stroke-width': ['case', ['==', ['get', 'type'], 'nuclear'], 1.5, 1],
          'circle-stroke-color': ['case',
            ['==', ['get', 'type'], 'nuclear'], 'rgba(255,186,32,0.7)',
            ['==', ['get', 'type'], 'capital'], 'rgba(255,255,255,0.25)',
            'rgba(255,255,255,0.12)',
          ],
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
          'text-color': ['case',
            ['==', ['get', 'type'], 'nuclear'], 'rgba(255,186,32,0.95)',
            'rgba(229,226,225,0.7)',
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
          'circle-radius': ['case', ['==', ['get', 'type'], 'airbase'], 4.5, 3.5],
          'circle-color': [
            'match', ['get', 'nation'],
            'US',    'rgba(41,128,185,0.75)',
            'IL',    'rgba(79,195,247,0.75)',
            'US/IL', 'rgba(60,160,200,0.75)',
            'IR',    'rgba(192,57,43,0.75)',
            'SA',    'rgba(243,156,18,0.75)',
            'rgba(229,226,225,0.4)',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
        layout: { visibility: ls.militaryBases ? 'visible' : 'none' },
      })
    }
    // Type-differentiation symbol: ▲ for airbase, ◆ for naval, ■ for ground base
    if (!map.getLayer('bases-type-symbol')) {
      map.addLayer({
        id: 'bases-type-symbol',
        type: 'symbol',
        source: 'mil-bases-src',
        layout: {
          'text-field': [
            'match', ['get', 'type'],
            'airbase', '▲',
            'naval',   '◆',
            '■',
          ],
          'text-font': ['Arial Unicode MS Regular'],
          'text-size': 8,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          visibility: ls.militaryBases ? 'visible' : 'none',
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.85)',
        },
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
          'text-offset': [0, 0.7],
          visibility: ls.militaryBases ? 'visible' : 'none',
        },
        paint: {
          'text-color': 'rgba(229,226,225,0.55)',
          'text-halo-color': 'rgba(5,10,18,0.9)',
          'text-halo-width': 1.5,
        },
      })
    }

    // ── Static naval asset markers ──
    if (!map.getSource('static-naval-src')) {
      map.addSource('static-naval-src', {
        type: 'geojson',
        data: STATIC_NAVAL_DATA,
      })
    }
    if (!map.getLayer('naval-dot')) {
      map.addLayer({
        id: 'naval-dot',
        type: 'circle',
        source: 'static-naval-src',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'type'], 'carrier_group'], 6, 4],
          'circle-color': [
            'match', ['get', 'nation'],
            'US',  'rgba(41,128,185,0.8)',
            'IL',  'rgba(79,195,247,0.8)',
            'IR',  'rgba(192,57,43,0.8)',
            'rgba(229,226,225,0.5)',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': [
            'match', ['get', 'nation'],
            'US',  'rgba(41,128,185,0.5)',
            'IL',  'rgba(79,195,247,0.5)',
            'IR',  'rgba(192,57,43,0.5)',
            'rgba(229,226,225,0.3)',
          ],
          'circle-blur': 0.1,
        },
        layout: { visibility: ls.militaryAssets ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('naval-type-symbol')) {
      map.addLayer({
        id: 'naval-type-symbol',
        type: 'symbol',
        source: 'static-naval-src',
        layout: {
          'text-field': ['case', ['==', ['get', 'type'], 'carrier_group'], '▶', '◀'],
          'text-font': ['Arial Unicode MS Regular'],
          'text-size': 7,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          visibility: ls.militaryAssets ? 'visible' : 'none',
        },
        paint: { 'text-color': 'rgba(255,255,255,0.9)' },
      })
    }
    if (!map.getLayer('naval-label')) {
      map.addLayer({
        id: 'naval-label',
        type: 'symbol',
        source: 'static-naval-src',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 7.5,
          'text-letter-spacing': 0.06,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.7],
          visibility: ls.militaryAssets ? 'visible' : 'none',
        },
        paint: {
          'text-color': 'rgba(229,226,225,0.6)',
          'text-halo-color': 'rgba(5,10,18,0.9)',
          'text-halo-width': 1.5,
        },
      })
    }

    // ── Strike rings (missile strike envelopes, shown when strikeRings toggled) ──
    if (!map.getSource('strike-rings-src')) {
      map.addSource('strike-rings-src', {
        type: 'geojson',
        data: STRIKE_RINGS_DATA,
      })
    }
    if (!map.getLayer('strike-rings-fill')) {
      map.addLayer({
        id: 'strike-rings-fill',
        type: 'fill',
        source: 'strike-rings-src',
        paint: {
          'fill-color': [
            'match', ['get', 'nation'],
            'US',  'rgba(41,128,185,0.04)',
            'IL',  'rgba(79,195,247,0.04)',
            'IR',  'rgba(192,57,43,0.06)',
            'rgba(255,186,32,0.04)',
          ],
        },
        layout: { visibility: ls.strikeRings ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('strike-rings-line')) {
      map.addLayer({
        id: 'strike-rings-line',
        type: 'line',
        source: 'strike-rings-src',
        paint: {
          'line-color': [
            'match', ['get', 'nation'],
            'US',  'rgba(41,128,185,0.5)',
            'IL',  'rgba(79,195,247,0.5)',
            'IR',  'rgba(192,57,43,0.6)',
            'rgba(255,186,32,0.5)',
          ],
          'line-width': 1,
          'line-dasharray': [4, 4],
        },
        layout: { visibility: ls.strikeRings ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('strike-rings-label')) {
      map.addLayer({
        id: 'strike-rings-label',
        type: 'symbol',
        source: 'strike-rings-src',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Mono Medium', 'Arial Unicode MS Regular'],
          'text-size': 7,
          'text-anchor': 'top',
          'symbol-placement': 'line',
          'text-letter-spacing': 0.06,
          visibility: ls.strikeRings ? 'visible' : 'none',
        },
        paint: {
          'text-color': [
            'match', ['get', 'nation'],
            'US',  'rgba(41,128,185,0.7)',
            'IL',  'rgba(79,195,247,0.7)',
            'IR',  'rgba(192,57,43,0.7)',
            'rgba(255,186,32,0.7)',
          ],
          'text-halo-color': 'rgba(5,10,18,0.9)',
          'text-halo-width': 1.5,
        },
      })
    }

    // ── Threat rings (SAM / radar coverage, shown when threatRings toggled) ──
    if (!map.getSource('threat-rings-src')) {
      map.addSource('threat-rings-src', {
        type: 'geojson',
        data: THREAT_RINGS_DATA,
      })
    }
    if (!map.getLayer('threat-rings-fill')) {
      map.addLayer({
        id: 'threat-rings-fill',
        type: 'fill',
        source: 'threat-rings-src',
        paint: {
          'fill-color': [
            'match', ['get', 'nation'],
            'IR',  'rgba(192,57,43,0.07)',
            'US',  'rgba(41,128,185,0.05)',
            'rgba(255,186,32,0.04)',
          ],
        },
        layout: { visibility: ls.threatRings ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer('threat-rings-line')) {
      map.addLayer({
        id: 'threat-rings-line',
        type: 'line',
        source: 'threat-rings-src',
        paint: {
          'line-color': [
            'match', ['get', 'nation'],
            'IR',  'rgba(192,57,43,0.7)',
            'US',  'rgba(41,128,185,0.6)',
            'rgba(255,186,32,0.6)',
          ],
          'line-width': 0.8,
          'line-dasharray': [2, 3],
        },
        layout: { visibility: ls.threatRings ? 'visible' : 'none' },
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
    const militaryLayers  = ['hormuz-point', 'hormuz-label', 'babelmandeb-label',
                              'naval-dot', 'naval-type-symbol', 'naval-label']
    const cityLayers      = ['cities-dot', 'cities-label']
    const baseLayers      = ['bases-dot', 'bases-type-symbol', 'bases-label']
    const strikeRingLayers = ['strike-rings-fill', 'strike-rings-line', 'strike-rings-label']
    const threatRingLayers = ['threat-rings-fill', 'threat-rings-line']

    for (const id of militaryLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.militaryAssets ? 'visible' : 'none')
    }
    for (const id of cityLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.keyCities ? 'visible' : 'none')
    }
    for (const id of baseLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.militaryBases ? 'visible' : 'none')
    }
    for (const id of strikeRingLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.strikeRings ? 'visible' : 'none')
    }
    for (const id of threatRingLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', ls.threatRings ? 'visible' : 'none')
    }
  }, [])

  // ── Helper: attach chokepoint + static feature click / cursor listeners ──
  // Guards via chokepointListenersAttachedRef to prevent duplicate handlers
  // accumulating across terrain style reloads.
  const setupChokepointListeners = useCallback((m: mapboxgl.Map) => {
    if (chokepointListenersAttachedRef.current) return
    chokepointListenersAttachedRef.current = true

    // Chokepoints
    const chokepointLayers = ['hormuz-point', 'babelmandeb-label'] as const
    for (const layerId of chokepointLayers) {
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

    // Cities — click on city dot
    const cityClickLayers = ['cities-dot', 'cities-label']
    for (const layerId of cityClickLayers) {
      if (m.getLayer(layerId)) {
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = '' })
        m.on('click', layerId, (e) => {
          const f = e.features?.[0]
          if (!f) return
          const p = f.properties as Record<string, string>
          onStaticFeatureClickRef.current?.({
            name:       p.name ?? 'UNKNOWN',
            type:       p.type ?? 'city',
            nation:     p.nation,
            screenX:    e.point.x,
            screenY:    e.point.y,
          })
        })
      }
    }

    // Military bases
    const baseClickLayers = ['bases-dot', 'bases-type-symbol']
    for (const layerId of baseClickLayers) {
      if (m.getLayer(layerId)) {
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = '' })
        m.on('click', layerId, (e) => {
          const f = e.features?.[0]
          if (!f) return
          const p = f.properties as Record<string, string>
          onStaticFeatureClickRef.current?.({
            name:    p.name ?? 'UNKNOWN',
            type:    p.type ?? 'base',
            nation:  p.nation,
            screenX: e.point.x,
            screenY: e.point.y,
          })
        })
      }
    }

    // Naval markers
    const navalClickLayers = ['naval-dot', 'naval-type-symbol', 'naval-label']
    for (const layerId of navalClickLayers) {
      if (m.getLayer(layerId)) {
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = '' })
        m.on('click', layerId, (e) => {
          const f = e.features?.[0]
          if (!f) return
          const p = f.properties as Record<string, string>
          onStaticFeatureClickRef.current?.({
            name:       p.name ?? 'UNKNOWN',
            type:       p.type ?? 'naval_asset',
            nation:     p.nation,
            capability: p.capability,
            screenX:    e.point.x,
            screenY:    e.point.y,
          })
        })
      }
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
