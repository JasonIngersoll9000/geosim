import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveScenarioId } from '@/lib/supabase/resolve-scenario'
import { getStateAtTurn } from '@/lib/game/state-engine'
import type { ActorPanelResponse, ActorPanelAssetGroup, AssetItem } from '@/lib/types/simulation'

// Asset category grouping — extend as actor inventories grow
const ASSET_CATEGORY_MAP: Record<string, string> = {
  tomahawk:       'Precision Strike',
  jassm:          'Precision Strike',
  f35:            'Air Power',
  f22:            'Air Power',
  b2:             'Air Power',
  patriot:        'Air Defense',
  thaad:          'Air Defense',
  carrier_strike: 'Naval',
  destroyer:      'Naval',
  submarine:      'Naval',
  soldier:        'Ground Forces',
  marine:         'Ground Forces',
}

function getCategory(assetType: string): string {
  return ASSET_CATEGORY_MAP[assetType] ?? 'Other'
}

const ACTOR_NAMES: Record<string, string> = {
  us:           'United States',
  iran:         'Islamic Republic of Iran',
  israel:       'State of Israel',
  saudi_arabia: 'Saudi Arabia',
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; branchId: string; actorId: string } }
) {
  const { searchParams } = new URL(request.url)
  const turnCommitId = searchParams.get('turnCommitId')

  // Baseline path: no turnCommitId — return capability counts from actor_capabilities
  if (!turnCommitId) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }
    try {
      const supabase = await createClient()
      const scenarioId = await resolveScenarioId(supabase, params.id)
      const { data: caps } = await supabase
        .from('actor_capabilities')
        .select('id, name, asset_type, category, quantity, status, description')
        .eq('scenario_id', scenarioId)
        .eq('actor_id', params.actorId)

      const grouped: Record<string, AssetItem[]> = {}
      for (const cap of (caps ?? []) as Array<{
        id: string; name: string; asset_type: string | null; category: string | null
        quantity: number | null; status: string | null; description: string | null
      }>) {
        const category = getCategory(cap.asset_type ?? cap.category ?? cap.name)
        const qty = cap.quantity ?? 1
        const item: AssetItem = {
          name:                 cap.name,
          initial_count:        qty,
          current_count:        qty,
          daily_rate:           0,
          unit:                 'units',
          status:               cap.status === 'destroyed' ? 'exhausted' : cap.status === 'degraded' ? 'constrained' : 'available',
          days_until_exhausted: null,
        }
        if (!grouped[category]) grouped[category] = []
        grouped[category].push(item)
      }

      const asset_categories: ActorPanelAssetGroup[] = Object.entries(grouped).map(
        ([category, items]) => ({ category, items })
      )

      const response: ActorPanelResponse = {
        actor_id:              params.actorId,
        actor_name:            ACTOR_NAMES[params.actorId] ?? params.actorId,
        turn_commit_id:        '',
        as_of_date:            new Date().toISOString().slice(0, 10),
        scores: {
          military_strength:      { value: 50, trend: 'stable', delta_since_start: 0 },
          political_stability:    { value: 50, trend: 'stable', delta_since_start: 0 },
          economic_health:        { value: 50, trend: 'stable', delta_since_start: 0 },
          public_support:         { value: 50, trend: 'stable', delta_since_start: 0 },
          international_standing: { value: 50, trend: 'stable', delta_since_start: 0 },
        },
        asset_categories,
        facilities:            [],
        reserve_capacity:      [],
        active_depletion_rates: [],
      }
      return NextResponse.json({ data: response })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  try {
    const state = await getStateAtTurn(params.branchId, turnCommitId)
    const actorState = state.actor_states[params.actorId]

    if (!actorState) {
      return NextResponse.json(
        { error: `Actor ${params.actorId} not found in state` },
        { status: 404 }
      )
    }

    const actorRates = state.active_depletion_rates[params.actorId] ?? {}
    const initialInv = state.initial_inventories[params.actorId] ?? {}

    // Build asset_categories grouped by category
    const grouped: Record<string, AssetItem[]> = {}
    for (const [assetType, current] of Object.entries(actorState.asset_inventory)) {
      const category = getCategory(assetType)
      const initial = initialInv[assetType] ?? current
      const rate = actorRates[assetType] ?? 0
      const availability = actorState.asset_availability[assetType]

      const days_until_exhausted = rate < 0 && current > 0
        ? Math.floor(current / Math.abs(rate))
        : null

      const item: AssetItem = {
        name:                 assetType,
        initial_count:        initial,
        current_count:        current,
        daily_rate:           rate,
        unit:                 'units',
        status:               availability?.status ?? 'available',
        days_until_exhausted,
      }

      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }

    const asset_categories: ActorPanelAssetGroup[] = Object.entries(grouped).map(
      ([category, items]) => ({ category, items })
    )

    // Active depletion rates summary
    const active_depletion_rates = Object.entries(actorRates).map(([asset_type, ratePerDay]) => {
      const current = actorState.asset_inventory[asset_type] ?? 0
      const days_until_exhausted = ratePerDay < 0 && current > 0
        ? Math.floor(current / Math.abs(ratePerDay))
        : null
      return { asset_type, rate_per_day: ratePerDay, days_until_exhausted }
    })

    const response: ActorPanelResponse = {
      actor_id:       params.actorId,
      actor_name:     ACTOR_NAMES[params.actorId] ?? params.actorId,
      turn_commit_id: turnCommitId,
      as_of_date:     state.as_of_date,
      scores: {
        military_strength:      { value: actorState.military_strength,      trend: 'stable', delta_since_start: 0 },
        political_stability:    { value: actorState.political_stability,    trend: 'stable', delta_since_start: 0 },
        economic_health:        { value: actorState.economic_health,        trend: 'stable', delta_since_start: 0 },
        public_support:         { value: actorState.public_support,         trend: 'stable', delta_since_start: 0 },
        international_standing: { value: actorState.international_standing, trend: 'stable', delta_since_start: 0 },
      },
      asset_categories,
      facilities: actorState.facility_statuses
        .filter(f => f.actor_id === params.actorId)
        .map(f => ({
          name:           f.name,
          type:           f.type,
          status:         f.status,
          capacity_pct:   f.capacity_pct,
          location_label: f.location_label,
        })),
      reserve_capacity: [],
      active_depletion_rates,
    }

    return NextResponse.json({ data: response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
