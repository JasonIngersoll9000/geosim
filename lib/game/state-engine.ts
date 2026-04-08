import type {
  BranchStateAtTurn,
  EventStateEffects,
  FacilityStatus,
  LiveActorState,
  AssetAvailability,
} from '@/lib/types/simulation'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Pure functions ────────────────────────────────────────────────────────────

/**
 * Compute asset availability flags from current inventory vs. initial inventory.
 * Only assets present in initialInventory are included in the result.
 * constrained = < 25% of initial; exhausted = 0.
 */
export function computeAssetAvailability(
  _actorId: string,
  currentInventory: Record<string, number>,
  initialInventory: Record<string, number>
): Record<string, AssetAvailability> {
  const result: Record<string, AssetAvailability> = {}
  for (const [assetType, initial] of Object.entries(initialInventory)) {
    const count = currentInventory[assetType] ?? 0
    const pct_of_initial = initial > 0 ? count / initial : 0
    let status: AssetAvailability['status']
    if (count === 0) {
      status = 'exhausted'
    } else if (pct_of_initial < 0.25) {
      status = 'constrained'
    } else {
      status = 'available'
    }
    result[assetType] = { count, pct_of_initial, status }
  }
  return result
}

/**
 * Apply daily depletion rates from fromDate to toDate.
 * Pure — does not write to DB. Clamps asset counts to 0.
 * Re-computes asset_availability after applying depletion.
 */
export function applyDepletion(
  state: BranchStateAtTurn,
  fromDate: string,
  toDate: string
): BranchStateAtTurn {
  const days = daysBetween(fromDate, toDate)
  if (days <= 0) return state

  const updatedActorStates: Record<string, LiveActorState> = {}

  for (const [actorId, actorState] of Object.entries(state.actor_states)) {
    const rates = state.active_depletion_rates[actorId] ?? {}
    const newInventory: Record<string, number> = { ...actorState.asset_inventory }

    for (const [assetType, ratePerDay] of Object.entries(rates)) {
      const current = newInventory[assetType] ?? 0
      newInventory[assetType] = Math.max(0, current + ratePerDay * days)
    }

    const initialInventory = state.initial_inventories[actorId] ?? {}
    updatedActorStates[actorId] = {
      ...actorState,
      asset_inventory: newInventory,
      asset_availability: computeAssetAvailability(actorId, newInventory, initialInventory),
    }
  }

  return { ...state, actor_states: updatedActorStates }
}

/**
 * Apply a resolved event's state effects to current live state.
 * Pure — caller persists result to DB. Clamps scores to 0–100, assets to 0.
 */
export function applyEventEffects(
  state: BranchStateAtTurn,
  effects: EventStateEffects
): BranchStateAtTurn {
  // Deep-copy actor states so we don't mutate originals
  const updatedActorStates: Record<string, LiveActorState> = Object.fromEntries(
    Object.entries(state.actor_states).map(([id, s]) => [id, { ...s, asset_inventory: { ...s.asset_inventory } }])
  )

  // Score deltas
  for (const [actorId, deltas] of Object.entries(effects.actor_score_deltas)) {
    const actor = updatedActorStates[actorId]
    if (!actor) continue
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    updatedActorStates[actorId] = {
      ...actor,
      military_strength:      deltas.military_strength      !== undefined ? clamp(actor.military_strength      + deltas.military_strength)      : actor.military_strength,
      political_stability:    deltas.political_stability    !== undefined ? clamp(actor.political_stability    + deltas.political_stability)    : actor.political_stability,
      economic_health:        deltas.economic_health        !== undefined ? clamp(actor.economic_health        + deltas.economic_health)        : actor.economic_health,
      public_support:         deltas.public_support         !== undefined ? clamp(actor.public_support         + deltas.public_support)         : actor.public_support,
      international_standing: deltas.international_standing !== undefined ? clamp(actor.international_standing + deltas.international_standing) : actor.international_standing,
    }
  }

  // Asset inventory deltas
  for (const [actorId, assetDeltas] of Object.entries(effects.asset_inventory_deltas)) {
    const actor = updatedActorStates[actorId]
    if (!actor) continue
    const newInventory = { ...actor.asset_inventory }
    for (const [assetType, delta] of Object.entries(assetDeltas)) {
      newInventory[assetType] = Math.max(0, (newInventory[assetType] ?? 0) + delta)
    }
    const initialInventory = state.initial_inventories[actorId] ?? {}
    updatedActorStates[actorId] = {
      ...actor,
      asset_inventory: newInventory,
      asset_availability: computeAssetAvailability(actorId, newInventory, initialInventory),
    }
  }

  // Global state
  const g = effects.global_state_deltas
  const newGlobalState = {
    oil_price_usd:          g.oil_price_usd          !== undefined ? state.global_state.oil_price_usd          + g.oil_price_usd          : state.global_state.oil_price_usd,
    hormuz_throughput_pct:  g.hormuz_throughput_pct  !== undefined ? state.global_state.hormuz_throughput_pct  + g.hormuz_throughput_pct  : state.global_state.hormuz_throughput_pct,
    global_economic_stress: g.global_economic_stress !== undefined ? state.global_state.global_economic_stress + g.global_economic_stress : state.global_state.global_economic_stress,
  }

  // Facility updates — upsert by actor_id+name
  const updatedFacilities: FacilityStatus[] = [...state.facility_statuses]
  for (const update of effects.facility_updates) {
    const idx = updatedFacilities.findIndex(f => f.actor_id === update.actor_id && f.name === update.name)
    if (idx >= 0) {
      updatedFacilities[idx] = update
    } else {
      updatedFacilities.push(update)
    }
  }

  // New depletion rates
  const updatedRates: Record<string, Record<string, number>> = {}
  for (const [actorId, rates] of Object.entries(state.active_depletion_rates)) {
    updatedRates[actorId] = { ...rates }
  }
  for (const rate of effects.new_depletion_rates) {
    if (!updatedRates[rate.actor_id]) updatedRates[rate.actor_id] = {}
    updatedRates[rate.actor_id][rate.asset_type] = rate.rate_per_day
  }

  return {
    ...state,
    actor_states: updatedActorStates,
    global_state: newGlobalState,
    facility_statuses: updatedFacilities,
    active_depletion_rates: updatedRates,
  }
}
