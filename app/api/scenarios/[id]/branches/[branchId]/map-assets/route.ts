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

const ACTOR_COLORS: Record<string, string> = {
  us:           '#1a3a6e',
  iran:         '#1a8a4a',
  israel:       '#002b7f',
  saudi_arabia: '#006c35',
  russia:       '#cc0000',
  china:        '#de2910',
}

const CAP_TYPE_MAP: Record<string, string> = {
  nuclear_facility: 'nuclear_facility',
  oil_gas_facility: 'oil_gas_facility',
  military_base:    'military_base',
  carrier:          'carrier_group',
  carrier_group:    'carrier_group',
  naval_base:       'naval_asset',
  airbase:          'military_base',
  headquarters:     'military_base',
  missile_battery:  'missile_battery',
  air_defense:      'air_defense_battery',
  troop_deployment: 'troop_deployment',
}

type CapRow = {
  id: string
  actor_id: string
  name: string
  asset_type: string | null
  category: string | null
  lat: number
  lng: number
  status: string | null
  description: string | null
}

async function fillFromCapabilities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scenarioId: string,
  statusOverrides?: Map<string, { status: string; capacity_pct: number; tooltip: string }>
): Promise<MapAsset[]> {
  const { data: caps } = await supabase
    .from('actor_capabilities')
    .select('id, actor_id, name, asset_type, category, lat, lng, status, description')
    .eq('scenario_id', scenarioId)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (!caps) return []

  return (caps as CapRow[]).map(cap => {
    const rawType = cap.asset_type ?? cap.category ?? 'military_base'
    const mappedType = (CAP_TYPE_MAP[rawType] ?? 'military_base') as MapAssetType
    const override = statusOverrides?.get(cap.id)

    const status: MapAsset['status'] = override
      ? (override.status as MapAsset['status'])
      : cap.status === 'destroyed' ? 'destroyed'
      : cap.status === 'degraded'  ? 'degraded'
      : 'operational'

    return {
      id:                      cap.id,
      actor_id:                cap.actor_id,
      asset_type:              mappedType,
      label:                   cap.name,
      lat:                     cap.lat,
      lng:                     cap.lng,
      status,
      capacity_pct:            override?.capacity_pct ?? 100,
      actor_color:             ACTOR_COLORS[cap.actor_id] ?? '#888888',
      tooltip:                 override?.tooltip ?? cap.description ?? cap.name,
      is_approximate_location: rawType === 'carrier' || rawType === 'carrier_group' || rawType === 'troop_deployment',
    }
  })
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
  const scenarioId = params.id

  try {
    const supabase = await createClient()

    if (!turnCommitId) {
      const assets = await fillFromCapabilities(supabase, scenarioId)
      const response: MapAssetsResponse = {
        turn_commit_id: '',
        as_of_date:     new Date().toISOString().slice(0, 10),
        assets,
        shipping_lanes: [{
          id:             'strait_of_hormuz',
          label:          'Strait of Hormuz',
          throughput_pct: 0,
          coordinates:    HORMUZ_COORDINATES,
        }],
      }
      return NextResponse.json({ data: response })
    }

    const state = await getStateAtTurn(params.branchId, turnCommitId)

    // Build facility status overrides keyed by capability name (for matching)
    const nameToOverride = new Map<string, { status: string; capacity_pct: number; tooltip: string }>()
    for (const f of state.facility_statuses) {
      nameToOverride.set(f.name.toLowerCase(), {
        status:       f.status,
        capacity_pct: f.capacity_pct,
        tooltip:      `${f.name} — ${f.status} (${f.capacity_pct}% capacity). ${f.location_label ?? ''}`,
      })
    }

    // Build id-keyed overrides (best-effort match)
    const { data: caps } = await supabase
      .from('actor_capabilities')
      .select('id, name')
      .eq('scenario_id', scenarioId)

    const idOverrides = new Map<string, { status: string; capacity_pct: number; tooltip: string }>()
    if (caps) {
      for (const cap of caps as Array<{ id: string; name: string }>) {
        const override = nameToOverride.get(cap.name.toLowerCase())
        if (override) idOverrides.set(cap.id, override)
      }
    }

    const assets = await fillFromCapabilities(supabase, scenarioId, idOverrides)

    const shipping_lanes: ShippingLane[] = [
      {
        id:             'strait_of_hormuz',
        label:          'Strait of Hormuz',
        throughput_pct: state.global_state.hormuz_throughput_pct,
        coordinates:    HORMUZ_COORDINATES,
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
