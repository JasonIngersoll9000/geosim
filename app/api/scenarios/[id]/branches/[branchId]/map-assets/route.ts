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

async function fillFromCapabilities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scenarioId: string,
  assets: MapAsset[]
): Promise<void> {
  const { data: caps } = await supabase
    .from('actor_capabilities')
    .select('id, actor_id, name, asset_type, category, lat, lng, status, description')
    .eq('scenario_id', scenarioId)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (!caps) return

  const typeMap: Record<string, string> = {
    nuclear_facility: 'nuclear_facility', oil_gas_facility: 'oil_gas_facility',
    military_base: 'military_base', carrier: 'carrier_group',
    carrier_group: 'carrier_group', naval_base: 'naval_asset',
    airbase: 'military_base', headquarters: 'military_base',
    missile_battery: 'missile_battery',
  }

  for (const cap of caps as Array<{
    id: string; actor_id: string; name: string; asset_type: string | null
    category: string | null; lat: number; lng: number; status: string | null
    description: string | null
  }>) {
    const rawType = cap.asset_type ?? cap.category ?? 'military_base'
    assets.push({
      id:                      cap.id,
      actor_id:                cap.actor_id,
      asset_type:              (typeMap[rawType] ?? 'military_base') as MapAssetType,
      label:                   cap.name,
      lat:                     cap.lat,
      lng:                     cap.lng,
      status:                  cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational',
      capacity_pct:            100,
      actor_color:             ACTOR_COLORS[cap.actor_id] ?? '#888888',
      tooltip:                 cap.description ?? cap.name,
      is_approximate_location: rawType === 'carrier' || rawType === 'carrier_group',
    })
  }
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

  try {
    const supabase = await createClient()
    const assets: MapAsset[] = []

    if (turnCommitId) {
      // Prefer state-engine data when we have a commit reference
      const state = await getStateAtTurn(params.branchId, turnCommitId)

      const stateAssets: MapAsset[] = state.facility_statuses
        .filter(f => f.lat !== undefined && f.lng !== undefined)
        .map(f => ({
          id:                      `${f.actor_id}-${f.name.toLowerCase().replace(/\s+/g, '-')}`,
          actor_id:                f.actor_id,
          asset_type:              facilityTypeToMapAssetType(f.type),
          label:                   f.name,
          lat:                     f.lat!,
          lng:                     f.lng!,
          status:                  f.status,
          capacity_pct:            f.capacity_pct,
          actor_color:             ACTOR_COLORS[f.actor_id] ?? '#888888',
          tooltip:                 `${f.name} — ${f.status} (${f.capacity_pct}% capacity). ${f.location_label}`,
          is_approximate_location: f.type === 'carrier_group' || f.type === 'troop_deployment',
        }))

      assets.push(...stateAssets)

      // Fallback within the turnCommitId path: if facility_statuses had no coordinates
      if (assets.length === 0) {
        await fillFromCapabilities(supabase, params.id, assets)
      }

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
    }

    // No turnCommitId — return static capability snapshot
    await fillFromCapabilities(supabase, params.id, assets)

    const shipping_lanes: ShippingLane[] = [
      {
        id:             'strait_of_hormuz',
        label:          'Strait of Hormuz',
        throughput_pct: 100,
        coordinates:    HORMUZ_COORDINATES,
      },
    ]

    const response: MapAssetsResponse = {
      turn_commit_id: '',
      as_of_date:     new Date().toISOString().split('T')[0],
      assets,
      shipping_lanes,
    }
    return NextResponse.json({ data: response })

  } catch (err) {
    console.error('[map-assets] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
