import { NextResponse } from 'next/server'
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
  const { searchParams } = new URL(request.url)
  const turnCommitId = searchParams.get('turnCommitId')

  if (!turnCommitId) {
    return NextResponse.json({ error: 'turnCommitId is required' }, { status: 400 })
  }

  try {
    const state = await getStateAtTurn(params.branchId, turnCommitId)

    const assets: MapAsset[] = state.facility_statuses
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
