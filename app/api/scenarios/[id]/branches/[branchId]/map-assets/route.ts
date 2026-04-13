import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStateAtTurn } from '@/lib/game/state-engine'
import type { MapAssetsResponse, MapAsset, MapAssetType, ShippingLane } from '@/lib/types/simulation'

const HORMUZ_COORDINATES: [number, number][] = [
  [56.27, 26.57],
  [56.56, 26.35],
  [56.83, 26.03],
  [57.06, 25.85],
  [57.33, 25.65],
]

const BAB_EL_MANDEB_COORDINATES: [number, number][] = [
  [43.18, 12.90],
  [43.35, 12.65],
  [43.52, 12.40],
  [43.68, 12.10],
]

const ACTOR_COLORS: Record<string, string> = {
  us:           '#4a90d9',
  iran:         '#c0392b',
  israel:       '#ffba20',
  saudi_arabia: '#5ebd8e',
  russia:       '#9b59b6',
  china:        '#4a90b8',
}

function facilityTypeToMapAssetType(type: string): MapAssetType {
  const map: Record<string, MapAssetType> = {
    nuclear_facility:  'nuclear_facility',
    oil_gas_facility:  'oil_gas_facility',
    military_base:     'military_base',
    carrier_group:     'carrier_group',
    missile_battery:   'missile_battery',
    naval_asset:       'naval_asset',
    air_defense:       'air_defense_battery',
    troop_deployment:  'troop_deployment',
  }
  return map[type] ?? 'military_base'
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; branchId: string } }
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const turnCommitId = searchParams.get('turnCommitId')

  if (!turnCommitId) {
    return NextResponse.json({ error: 'turnCommitId is required' }, { status: 400 })
  }

  const ASSET_TYPE_MAP: Record<string, string> = {
    nuclear_facility: 'nuclear_facility', oil_gas_facility: 'oil_gas_facility',
    military_base: 'military_base', carrier: 'carrier_group',
    carrier_group: 'carrier_group', naval_base: 'naval_asset',
    naval_asset: 'naval_asset', airbase: 'military_base',
    air_base: 'military_base', headquarters: 'military_base',
    missile_battery: 'missile_battery', air_defense: 'air_defense_battery',
    oil_terminal: 'oil_gas_facility', refinery: 'oil_gas_facility',
  }

  try {
    const [state, supabase] = await Promise.all([
      getStateAtTurn(params.branchId, turnCommitId),
      createClient(),
    ])

    // Always query actor_capabilities for rich metadata
    const { data: caps } = await supabase
      .from('actor_capabilities')
      .select('id, actor_id, name, short_name, asset_type, category, lat, lng, status, description, notes, strike_range_nm, threat_range_nm')
      .eq('scenario_id', state.scenario_id)
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    type CapRow = {
      id: string; actor_id: string; name: string; short_name: string | null
      asset_type: string | null; category: string | null; lat: number; lng: number
      status: string | null; description: string | null; notes: string | null
      strike_range_nm: number | null; threat_range_nm: number | null
    }
    const capRows = (caps ?? []) as CapRow[]

    // Build a name-normalised lookup from actor_capabilities for augmentation
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const capByNormName = new Map<string, CapRow>()
    for (const c of capRows) {
      capByNormName.set(normalise(c.name), c)
      if (c.short_name) capByNormName.set(normalise(c.short_name), c)
    }

    const assets: MapAsset[] = []

    // Primary path: facility_statuses (has live status/capacity from state engine)
    const facilityAssets = state.facility_statuses
      .filter(f => f.lat !== undefined && f.lng !== undefined)
    for (const f of facilityAssets) {
      const cap = capByNormName.get(normalise(f.name))
      const rawType = cap?.asset_type ?? cap?.category ?? f.type
      const isNaval = rawType === 'carrier' || rawType === 'carrier_group' || rawType === 'naval_base' || rawType === 'naval_asset'
      const locLabel = f.location_label ?? ''
      assets.push({
        id:                      `${f.actor_id}-${f.name.toLowerCase().replace(/\s+/g, '-')}`,
        actor_id:                f.actor_id,
        asset_type:              (ASSET_TYPE_MAP[rawType] ?? facilityTypeToMapAssetType(f.type)) as MapAssetType,
        category:                cap?.category ?? f.type,
        label:                   cap?.short_name ?? f.name,
        lat:                     f.lat!,
        lng:                     f.lng!,
        status:                  f.status,
        capacity_pct:            f.capacity_pct,
        actor_color:             ACTOR_COLORS[f.actor_id] ?? '#888888',
        tooltip:                 `${f.name} — ${f.status} (${f.capacity_pct}% capacity)${locLabel ? '. ' + locLabel : ''}`,
        description:             cap?.description ?? undefined,
        notes:                   cap?.notes ?? undefined,
        strike_range_nm:         cap?.strike_range_nm ?? undefined,
        threat_range_nm:         cap?.threat_range_nm ?? undefined,
        is_approximate_location: isNaval || f.type === 'carrier_group' || f.type === 'troop_deployment',
      })
    }

    // Merge: include actor_capabilities rows not already covered by facility_statuses.
    // This ensures naval/capability assets absent from the state engine are still rendered.
    const matchedNormNames = new Set(assets.map(a => normalise(a.label)))
    if (assets.length === 0) {
      // Pure fallback: state engine had no geocoords at all — use caps as primary source
      for (const cap of capRows) {
        const rawType = cap.asset_type ?? cap.category ?? 'military_base'
        const mapType = (ASSET_TYPE_MAP[rawType] ?? 'military_base') as MapAssetType
        const isNaval = rawType === 'carrier' || rawType === 'carrier_group' || rawType === 'naval_base' || rawType === 'naval_asset'
        assets.push({
          id:                      cap.id,
          actor_id:                cap.actor_id,
          asset_type:              mapType,
          category:                cap.category ?? rawType,
          label:                   cap.short_name ?? cap.name,
          lat:                     cap.lat,
          lng:                     cap.lng,
          status:                  cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational',
          capacity_pct:            100,
          actor_color:             ACTOR_COLORS[cap.actor_id] ?? '#888888',
          tooltip:                 cap.description ?? cap.name,
          description:             cap.description ?? undefined,
          notes:                   cap.notes ?? undefined,
          strike_range_nm:         cap.strike_range_nm ?? undefined,
          threat_range_nm:         cap.threat_range_nm ?? undefined,
          is_approximate_location: isNaval,
        })
      }
    } else {
      // Supplement: add capabilities not already represented in facility_statuses
      for (const cap of capRows) {
        const capLabel = cap.short_name ?? cap.name
        if (matchedNormNames.has(normalise(capLabel)) || matchedNormNames.has(normalise(cap.name))) continue
        const rawType = cap.asset_type ?? cap.category ?? 'military_base'
        const mapType = (ASSET_TYPE_MAP[rawType] ?? 'military_base') as MapAssetType
        const isNaval = rawType === 'carrier' || rawType === 'carrier_group' || rawType === 'naval_base' || rawType === 'naval_asset'
        assets.push({
          id:                      cap.id,
          actor_id:                cap.actor_id,
          asset_type:              mapType,
          category:                cap.category ?? rawType,
          label:                   capLabel,
          lat:                     cap.lat,
          lng:                     cap.lng,
          status:                  cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational',
          capacity_pct:            100,
          actor_color:             ACTOR_COLORS[cap.actor_id] ?? '#888888',
          tooltip:                 cap.description ?? cap.name,
          description:             cap.description ?? undefined,
          notes:                   cap.notes ?? undefined,
          strike_range_nm:         cap.strike_range_nm ?? undefined,
          threat_range_nm:         cap.threat_range_nm ?? undefined,
          is_approximate_location: isNaval,
        })
      }
    }

    // Bab-el-Mandeb throughput: derive from global economic stress as a proxy for
    // Houthi/regional activity. High stress → reduced throughput.
    const babThroughput = Math.round(Math.max(5, 100 - state.global_state.global_economic_stress * 0.8))

    const shipping_lanes: ShippingLane[] = [
      {
        id:             'strait_of_hormuz',
        label:          'Strait of Hormuz',
        throughput_pct: state.global_state.hormuz_throughput_pct,
        coordinates:    HORMUZ_COORDINATES,
      },
      {
        id:             'bab_el_mandeb',
        label:          'Bab-el-Mandeb',
        throughput_pct: babThroughput,
        coordinates:    BAB_EL_MANDEB_COORDINATES,
      },
    ]

    const response: MapAssetsResponse = {
      turn_commit_id: turnCommitId,
      as_of_date:     state.as_of_date,
      assets,
      shipping_lanes,
    }

    return NextResponse.json({ data: response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
