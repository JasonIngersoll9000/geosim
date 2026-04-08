import type {
  BranchStateAtTurn,
  EventStateEffects,
  FacilityStatus,
  LiveActorState,
  AssetAvailability,
  LiveGlobalState,
} from '@/lib/types/simulation'
import { createClient } from '@/lib/supabase/server'

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

// ── Async DB functions ────────────────────────────────────────────────────────

/**
 * Load the actor state snapshot for a specific turn on a branch,
 * then apply daily depletion from snapshot date to asOfDate (if later).
 */
export async function getStateAtTurn(
  branchId: string,
  turnCommitId: string,
  asOfDate?: string
): Promise<BranchStateAtTurn> {
  const supabase = await createClient()

  const { data: snapshots, error: snapshotsError } = await supabase
    .from('actor_state_snapshots')
    .select('*')
    .eq('branch_id', branchId)
    .eq('turn_commit_id', turnCommitId)

  if (snapshotsError) throw new Error(`Failed to load snapshots: ${snapshotsError.message}`)
  if (!snapshots || snapshots.length === 0) {
    throw new Error(`No state snapshots found for branch ${branchId} at turn ${turnCommitId}`)
  }

  const scenarioId: string = (snapshots[0] as Record<string, unknown>).scenario_id as string
  const snapshotDate: string = ((snapshots[0] as Record<string, unknown>).created_at as string).split('T')[0]

  // Active depletion rates for this branch at snapshot date
  const { data: rates, error: ratesError } = await supabase
    .from('daily_depletion_rates')
    .select('*')
    .eq('branch_id', branchId)
    .lte('effective_from_date', snapshotDate)
    .or(`effective_to_date.is.null,effective_to_date.gt.${snapshotDate}`)

  if (ratesError) throw new Error(`Failed to load depletion rates: ${ratesError.message}`)

  // Initial inventories from actor_capabilities
  const actorIds: string[] = (snapshots as Record<string, unknown>[]).map(s => s.actor_id as string)
  const { data: capabilities, error: capError } = await supabase
    .from('actor_capabilities')
    .select('actor_id, name, quantity')
    .eq('scenario_id', scenarioId)
    .in('actor_id', actorIds)

  if (capError) throw new Error(`Failed to load capabilities: ${capError.message}`)

  // Build initial_inventories
  const initial_inventories: Record<string, Record<string, number>> = {}
  for (const cap of (capabilities ?? []) as { actor_id: string; name: string; quantity: number | null }[]) {
    if (!initial_inventories[cap.actor_id]) initial_inventories[cap.actor_id] = {}
    if (cap.quantity != null) initial_inventories[cap.actor_id][cap.name] = cap.quantity
  }

  // Build active_depletion_rates
  const active_depletion_rates: Record<string, Record<string, number>> = {}
  for (const rate of (rates ?? []) as { actor_id: string; asset_type: string; rate_per_day: number }[]) {
    if (!active_depletion_rates[rate.actor_id]) active_depletion_rates[rate.actor_id] = {}
    active_depletion_rates[rate.actor_id][rate.asset_type] = Number(rate.rate_per_day)
  }

  // Build actor_states + extract global state
  const actor_states: Record<string, LiveActorState> = {}
  let global_state: LiveGlobalState = { oil_price_usd: 0, hormuz_throughput_pct: 100, global_economic_stress: 0 }
  let facility_statuses: FacilityStatus[] = []

  for (const snap of snapshots as Record<string, unknown>[]) {
    const actorId = snap.actor_id as string
    const inventory = (snap.asset_inventory ?? {}) as Record<string, number>
    const initialInv = initial_inventories[actorId] ?? {}
    actor_states[actorId] = {
      actor_id: actorId,
      military_strength:      Number(snap.military_strength),
      political_stability:    Number(snap.political_stability),
      economic_health:        Number(snap.economic_health),
      public_support:         Number(snap.public_support),
      international_standing: Number(snap.international_standing),
      asset_inventory:        inventory,
      global_state:           (snap.global_state ?? {}) as Record<string, number>,
      facility_statuses:      (snap.facility_statuses ?? []) as FacilityStatus[],
      asset_availability:     computeAssetAvailability(actorId, inventory, initialInv),
    }
    const gs = snap.global_state as Record<string, number> | null
    if (gs?.oil_price_usd !== undefined) {
      global_state = {
        oil_price_usd:          gs.oil_price_usd,
        hormuz_throughput_pct:  gs.hormuz_throughput_pct ?? 100,
        global_economic_stress: gs.global_economic_stress ?? 0,
      }
    }
    if (facility_statuses.length === 0 && snap.facility_statuses) {
      facility_statuses = snap.facility_statuses as FacilityStatus[]
    }
  }

  const baseState: BranchStateAtTurn = {
    scenario_id: scenarioId,
    branch_id: branchId,
    turn_commit_id: turnCommitId,
    as_of_date: snapshotDate,
    actor_states,
    global_state,
    facility_statuses,
    active_depletion_rates,
    initial_inventories,
  }

  if (asOfDate && asOfDate > snapshotDate) {
    return applyDepletion(baseState, snapshotDate, asOfDate)
  }

  return baseState
}

/**
 * Persist a BranchStateAtTurn to actor_state_snapshots.
 * Called after event resolution writes a new turn_commit.
 */
export async function persistStateSnapshot(
  scenarioId: string,
  branchId: string,
  turnCommitId: string,
  state: BranchStateAtTurn
): Promise<void> {
  const supabase = await createClient()

  const rows = Object.entries(state.actor_states).map(([actorId, actorState]) => ({
    scenario_id:            scenarioId,
    branch_id:              branchId,
    turn_commit_id:         turnCommitId,
    actor_id:               actorId,
    military_strength:      actorState.military_strength,
    political_stability:    actorState.political_stability,
    economic_health:        actorState.economic_health,
    public_support:         actorState.public_support,
    international_standing: actorState.international_standing,
    asset_inventory:        actorState.asset_inventory,
    global_state:           state.global_state,
    facility_statuses:      state.facility_statuses,
    interceptor_effectiveness: {},
  }))

  const { error } = await supabase.from('actor_state_snapshots').insert(rows)
  if (error) throw new Error(`Failed to persist snapshot: ${error.message}`)
}

/**
 * Fork state for a new branch at the given turn.
 * Deep-copies snapshots and depletion rates to the new branch_id.
 */
export async function forkStateForBranch(
  parentBranchId: string,
  forkTurnCommitId: string,
  newBranchId: string
): Promise<BranchStateAtTurn> {
  const supabase = await createClient()
  const parentState = await getStateAtTurn(parentBranchId, forkTurnCommitId)

  // Deep copy — mutations to fork must not affect parent
  const forkedState: BranchStateAtTurn = JSON.parse(JSON.stringify(parentState))
  forkedState.branch_id = newBranchId

  // Persist actor snapshots for the new branch
  const rows = Object.entries(forkedState.actor_states).map(([actorId, actorState]) => ({
    scenario_id:            forkedState.scenario_id,
    branch_id:              newBranchId,
    turn_commit_id:         forkTurnCommitId,
    actor_id:               actorId,
    military_strength:      actorState.military_strength,
    political_stability:    actorState.political_stability,
    economic_health:        actorState.economic_health,
    public_support:         actorState.public_support,
    international_standing: actorState.international_standing,
    asset_inventory:        actorState.asset_inventory,
    global_state:           forkedState.global_state,
    facility_statuses:      forkedState.facility_statuses,
    interceptor_effectiveness: {},
  }))
  await supabase.from('actor_state_snapshots').insert(rows)

  // Copy active depletion rates to new branch
  const depletionRows = Object.entries(forkedState.active_depletion_rates).flatMap(
    ([actorId, rates]) =>
      Object.entries(rates).map(([assetType, rate]) => ({
        scenario_id:         forkedState.scenario_id,
        branch_id:           newBranchId,
        actor_id:            actorId,
        asset_type:          assetType,
        rate_per_day:        rate,
        effective_from_date: forkedState.as_of_date,
      }))
  )
  if (depletionRows.length > 0) {
    await supabase.from('daily_depletion_rates').insert(depletionRows)
  }

  return forkedState
}
