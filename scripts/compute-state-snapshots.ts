// scripts/compute-state-snapshots.ts
// Phase 5c: Compute cumulative TurnStateSnapshot per event by replaying
// state effects and daily depletion. Pure computation — zero API calls.
//
// Usage:
//   bun run scripts/compute-state-snapshots.ts
//   bun run scripts/compute-state-snapshots.ts --dry-run   # prints first 3, no write
//
// Reads:  data/iran-enriched.json
//         data/iran-state-effects.json
//         data/iran-gap-fill.json
//
// Writes: data/iran-state-snapshots.json

import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type {
  EnrichedEvent,
  EventStateEffects,
  ActorStateDelta,
  ActorStateSnapshot,
  TurnStateSnapshot,
  StateSnapshotsFile,
  GapFillData,
  FacilityStatus,
  ActorDepletionRates,
  StateEffectsFile,
  ActorProfile,
  RadarInstallation,
  RadarNetworkFile,
} from "./pipeline/types"

const ENRICHED_PATH = "data/iran-enriched.json"
const STATE_EFFECTS_PATH = "data/iran-state-effects.json"
const GAP_FILL_PATH = "data/iran-gap-fill.json"
const OUTPUT_PATH = "data/iran-state-snapshots.json"
const RADAR_NETWORK_PATH = "data/radar-network.json"

const ALL_ACTORS = ["united_states", "iran", "israel", "russia", "china"]

interface EnrichedFile {
  _meta: Record<string, unknown>
  events: EnrichedEvent[]
}

// ─── Exported pure functions (unit-testable surface) ─────────────────────────

/**
 * Returns the number of days between two ISO datetime strings (b - a).
 * Can be fractional. Returns 0 for identical timestamps.
 */
export function daysBetween(a: string, b: string): number {
  const msA = new Date(a).getTime()
  const msB = new Date(b).getTime()
  return (msB - msA) / (1000 * 60 * 60 * 24)
}

/**
 * Applies daily depletion rates to an asset inventory over a number of days.
 * Returns a NEW inventory (immutable). Floors each asset at 0.
 */
export function applyDailyDepletion(
  inventory: Record<string, number>,
  rates: Record<string, number>,
  days: number
): Record<string, number> {
  const result: Record<string, number> = { ...inventory }
  for (const [asset, rate] of Object.entries(rates)) {
    if (asset in result) {
      result[asset] = Math.max(0, result[asset] + rate * days)
    }
  }
  return result
}

export interface ActorDeltaWithId extends ActorStateDelta {
  actor_id: string
}

/**
 * Applies actor deltas to actor snapshots. Returns NEW snapshots (immutable).
 * Clamps all 5 dimensions to 0–100. Initializes unknown actors at 50.
 */
export function applyActorDeltas(
  snapshots: Record<string, ActorStateSnapshot>,
  deltas: ActorDeltaWithId[],
  _eventId: string
): Record<string, ActorStateSnapshot> {
  const result: Record<string, ActorStateSnapshot> = {}
  // Copy existing snapshots
  for (const [id, snap] of Object.entries(snapshots)) {
    result[id] = { ...snap, asset_inventory: { ...snap.asset_inventory } }
  }

  for (const delta of deltas) {
    const { actor_id, rationale: _rationale, ...dims } = delta
    if (!result[actor_id]) {
      // Initialize new actor at 50
      result[actor_id] = {
        actor_id,
        military_strength: 50,
        political_stability: 50,
        economic_health: 50,
        public_support: 50,
        international_standing: 50,
        asset_inventory: {},
      }
    } else {
      result[actor_id] = { ...result[actor_id], asset_inventory: { ...result[actor_id].asset_inventory } }
    }

    const snap = result[actor_id]
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    result[actor_id] = {
      ...snap,
      military_strength: clamp(snap.military_strength + (dims.military_strength ?? 0)),
      political_stability: clamp(snap.political_stability + (dims.political_stability ?? 0)),
      economic_health: clamp(snap.economic_health + (dims.economic_health ?? 0)),
      public_support: clamp(snap.public_support + (dims.public_support ?? 0)),
      international_standing: clamp(snap.international_standing + (dims.international_standing ?? 0)),
    }
  }

  return result
}

/**
 * Extracts asset inventory from GapFillData, including only high/medium
 * confidence assets. Returns { actor_id: { asset_type: quantity } }.
 */
export function buildInitialInventory(
  gapFill: GapFillData
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const [actorId, inventory] of Object.entries(gapFill.asset_inventory)) {
    result[actorId] = {}
    for (const [assetType, entry] of Object.entries(inventory)) {
      if (entry.confidence === "high" || entry.confidence === "medium") {
        result[actorId][assetType] = entry.estimated_remaining
      }
    }
  }
  return result
}

/**
 * Returns infrastructure_status from GapFillData as-is (already correct shape).
 */
export function buildInitialFacilityStatuses(gapFill: GapFillData): FacilityStatus[] {
  return gapFill.infrastructure_status
}

/**
 * Computes interceptor effectiveness for each actor/sector given radar status
 * as of a specific date. Degraded radars apply 50% of their leaker penalty;
 * destroyed radars apply 100%. Values are clamped to 0.01–1.0.
 *
 * This function is the canonical implementation — buildInitialInterceptorEffectiveness
 * delegates to it.
 */
export function computeInterceptorEffectiveness(
  radars: RadarInstallation[],
  asOfDate: string
): Record<string, Record<string, number>> {
  // Collect all sectors per actor and initialize at 1.0
  const effectiveness: Record<string, Record<string, number>> = {}

  // First pass: discover all actor/sector combinations
  for (const radar of radars) {
    if (!effectiveness[radar.actor_id]) {
      effectiveness[radar.actor_id] = {}
    }
    for (const sector of radar.sectors_covered) {
      if (effectiveness[radar.actor_id][sector] === undefined) {
        effectiveness[radar.actor_id][sector] = 1.0
      }
    }
  }

  // Second pass: apply degradations for non-operational radars active as of asOfDate
  for (const radar of radars) {
    if (radar.current_status === "operational") continue

    // Only apply if status_effective_date is on or before asOfDate
    if (radar.status_effective_date && radar.status_effective_date > asOfDate) continue

    // Fraction of penalty to apply: 50% for degraded, 100% for destroyed
    const penaltyFraction = radar.current_status === "degraded" ? 0.5 : 1.0
    const reduction =
      (radar.leaker_rate_increase_pct / 100) * radar.effectiveness_contribution * penaltyFraction

    for (const sector of radar.sectors_covered) {
      const current = effectiveness[radar.actor_id][sector] ?? 1.0
      effectiveness[radar.actor_id][sector] = Math.min(1.0, Math.max(0.01, current - reduction))
    }
  }

  return effectiveness
}

/**
 * Alias of computeInterceptorEffectiveness — used to build the initial
 * effectiveness baseline at the start of the event loop.
 */
export function buildInitialInterceptorEffectiveness(
  radars: RadarInstallation[],
  eventTimestamp: string
): Record<string, Record<string, number>> {
  return computeInterceptorEffectiveness(radars, eventTimestamp)
}

/**
 * Main computation: replays events applying state effects and daily depletion.
 * Returns one TurnStateSnapshot per event.
 */
export function computeSnapshots(
  events: EnrichedEvent[],
  effects: EventStateEffects[],
  gapFill: GapFillData,
  actorProfiles?: ActorProfile[],
  radars?: RadarInstallation[]
): TurnStateSnapshot[] {
  // Build effects lookup by event_id
  const effectsById = new Map<string, EventStateEffects>()
  for (const e of effects) {
    effectsById.set(e.event_id, e)
  }

  // Initialize actor states from profiles if provided, else fall back to 50
  const profileMap = new Map((actorProfiles ?? []).map(p => [p.id, p]))

  let actorStates: Record<string, ActorStateSnapshot> = {}
  for (const actorId of ALL_ACTORS) {
    const s = profileMap.get(actorId)?.initial_scores
    actorStates[actorId] = {
      actor_id: actorId,
      military_strength: s?.militaryStrength ?? 50,
      political_stability: s?.politicalStability ?? 50,
      economic_health: s?.economicHealth ?? 50,
      public_support: s?.publicSupport ?? 50,
      international_standing: s?.internationalStanding ?? 50,
      asset_inventory: {},
    }
  }

  // Initialize asset inventories from gap fill
  const initialInventory = buildInitialInventory(gapFill)
  for (const [actorId, inventory] of Object.entries(initialInventory)) {
    if (actorStates[actorId]) {
      actorStates[actorId] = { ...actorStates[actorId], asset_inventory: { ...inventory } }
    } else {
      actorStates[actorId] = {
        actor_id: actorId,
        military_strength: 50,
        political_stability: 50,
        economic_health: 50,
        public_support: 50,
        international_standing: 50,
        asset_inventory: { ...inventory },
      }
    }
  }

  // Initialize facility statuses
  let facilityStatuses: FacilityStatus[] = buildInitialFacilityStatuses(gapFill).map(f => ({ ...f }))

  // Initialize global state from earliest gap-fill timeline entry or defaults
  const timeline = gapFill.global_variable_timeline
  const firstPoint = timeline.length > 0
    ? timeline.reduce((min, p) => p.date < min.date ? p : min, timeline[0])
    : null

  let globalState = {
    oil_price_usd: firstPoint?.oil_price_usd ?? 85,
    hormuz_throughput_pct: firstPoint?.hormuz_throughput_pct ?? 100,
    global_economic_stress: firstPoint?.global_economic_stress ?? 0,
  }

  // Active depletion rates: actor_id → asset_type → rate_per_day
  // We track rates as a flat map for depletion application
  const activeRates: Record<string, Record<string, number>> = {}

  const snapshots: TurnStateSnapshot[] = []
  let previousTimestamp: string | null = null

  for (const event of events) {
    const eventEffects = effectsById.get(event.id) ?? null

    // Step 1: Compute days since previous event
    const days = previousTimestamp ? daysBetween(previousTimestamp, event.timestamp) : 0

    // Step 2: Apply daily depletion to each actor's inventory
    if (days > 0) {
      const newActorStates: Record<string, ActorStateSnapshot> = {}
      for (const [actorId, snap] of Object.entries(actorStates)) {
        const actorRates = activeRates[actorId] ?? {}
        const newInventory = applyDailyDepletion(snap.asset_inventory, actorRates, days)
        newActorStates[actorId] = { ...snap, asset_inventory: newInventory }
      }
      actorStates = newActorStates
    }

    // Step 3: Apply actor_deltas
    if (eventEffects && Object.keys(eventEffects.actor_deltas).length > 0) {
      const deltasWithId = Object.entries(eventEffects.actor_deltas).map(
        ([actor_id, delta]) => ({ actor_id, ...delta })
      )
      actorStates = applyActorDeltas(actorStates, deltasWithId, event.id)
    }

    // Step 4: Apply asset_changes
    if (eventEffects && eventEffects.asset_changes.length > 0) {
      const newActorStates: Record<string, ActorStateSnapshot> = {}
      for (const [id, snap] of Object.entries(actorStates)) {
        newActorStates[id] = { ...snap, asset_inventory: { ...snap.asset_inventory } }
      }
      for (const change of eventEffects.asset_changes) {
        const { actor_id, asset_type, quantity_delta, new_status, new_capacity_pct, facility_id: _facility_id, notes: _notes } = change
        // Ensure actor exists
        if (!newActorStates[actor_id]) {
          newActorStates[actor_id] = {
            actor_id,
            military_strength: 50,
            political_stability: 50,
            economic_health: 50,
            public_support: 50,
            international_standing: 50,
            asset_inventory: {},
          }
        }
        const snap = newActorStates[actor_id]
        const currentQty = snap.asset_inventory[asset_type] ?? 0
        newActorStates[actor_id] = {
          ...snap,
          asset_inventory: {
            ...snap.asset_inventory,
            [asset_type]: Math.max(0, currentQty + quantity_delta),
          },
        }

      }
      actorStates = newActorStates
    }

    // Step 5: Apply facility changes from asset_changes (new_status/new_capacity_pct + facility_id)
    if (eventEffects && eventEffects.asset_changes.length > 0) {
      for (const change of eventEffects.asset_changes) {
        const { facility_id, new_status, new_capacity_pct } = change
        if (facility_id && (new_status !== undefined || new_capacity_pct !== undefined)) {
          facilityStatuses = facilityStatuses.map(f => {
            if (f.facility_id === facility_id) {
              return {
                ...f,
                ...(new_status !== undefined ? { status: new_status } : {}),
                ...(new_capacity_pct !== undefined ? { capacity_pct: new_capacity_pct } : {}),
              }
            }
            return f
          })
        }
      }
    }

    // Step 6: Apply global_updates
    if (eventEffects && eventEffects.global_updates) {
      const u = eventEffects.global_updates
      globalState = {
        oil_price_usd: u.oil_price_usd ?? globalState.oil_price_usd,
        hormuz_throughput_pct: u.hormuz_throughput_pct ?? globalState.hormuz_throughput_pct,
        global_economic_stress: u.global_economic_stress ?? globalState.global_economic_stress,
      }
    }

    // Step 7: Update active depletion rates from this event's changes
    if (eventEffects && eventEffects.depletion_rate_changes?.length > 0) {
      for (const rateChange of eventEffects.depletion_rate_changes) {
        const { actor_id, asset_type, new_rate_per_day } = rateChange
        if (!activeRates[actor_id]) activeRates[actor_id] = {}
        activeRates[actor_id][asset_type] = new_rate_per_day
      }
    }

    // Step 8: Build active_depletion_rates snapshot (convert flat rates to ActorDepletionRates shape)
    const activeDepletionRatesSnapshot: Record<string, ActorDepletionRates> = {}
    for (const [actorId, assetRates] of Object.entries(activeRates)) {
      activeDepletionRatesSnapshot[actorId] = {}
      for (const [assetType, ratePerDay] of Object.entries(assetRates)) {
        activeDepletionRatesSnapshot[actorId][assetType] = [
          {
            rate_per_day: ratePerDay,
            effective_from: event.timestamp,
            notes: "active rate",
          },
        ]
      }
    }

    // Step 9: Compute interceptor effectiveness for this event's timestamp
    const interceptorEffectiveness = radars
      ? buildInitialInterceptorEffectiveness(radars, event.timestamp)
      : {}

    // Step 10: Produce snapshot
    snapshots.push({
      event_id: event.id,
      timestamp: event.timestamp,
      actor_states: JSON.parse(JSON.stringify(actorStates)) as Record<string, ActorStateSnapshot>,
      global_state: { ...globalState },
      facility_statuses: facilityStatuses.map(f => ({ ...f })),
      active_depletion_rates: activeDepletionRatesSnapshot,
      interceptor_effectiveness: interceptorEffectiveness,
    })

    previousTimestamp = event.timestamp
  }

  return snapshots
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes("--dry-run")

  console.log("Reading input files...")
  const enrichedFile = await readJsonFile<EnrichedFile>(ENRICHED_PATH)
  const stateEffectsFile = await readJsonFile<StateEffectsFile>(STATE_EFFECTS_PATH)
  const gapFill = await readJsonFile<GapFillData>(GAP_FILL_PATH)

  const events = enrichedFile.events
  const effects = stateEffectsFile.events

  let actorProfiles: ActorProfile[] = []
  try {
    const profilesRaw = await readJsonFile<unknown>("data/actor-profiles.json")
    // Handle both array and {actors: []} shapes
    actorProfiles = Array.isArray(profilesRaw)
      ? profilesRaw as ActorProfile[]
      : (profilesRaw as { actors: ActorProfile[] }).actors ?? []
    console.log(`Loaded ${actorProfiles.length} actor profiles`)
  } catch {
    console.warn("Warning: could not load data/actor-profiles.json — using default initial scores (50)")
  }

  let radarInstallations: RadarInstallation[] = []
  try {
    const radarFile = await readJsonFile<RadarNetworkFile>(RADAR_NETWORK_PATH)
    radarInstallations = radarFile.installations
    console.log(`Loaded ${radarInstallations.length} radar installations`)
  } catch {
    console.warn("Warning: could not load data/radar-network.json — interceptor_effectiveness will be empty")
  }

  console.log(`Computing snapshots for ${events.length} events...`)
  const snapshots = computeSnapshots(events, effects, gapFill, actorProfiles, radarInstallations)

  // Build initial_state from actor profiles (or fall back to 50)
  const profileMap = new Map(actorProfiles.map(p => [p.id, p]))
  const initialInventory = buildInitialInventory(gapFill)
  const initialState: Record<string, ActorStateSnapshot> = {}
  for (const actorId of ALL_ACTORS) {
    const s = profileMap.get(actorId)?.initial_scores
    initialState[actorId] = {
      actor_id: actorId,
      military_strength: s?.militaryStrength ?? 50,
      political_stability: s?.politicalStability ?? 50,
      economic_health: s?.economicHealth ?? 50,
      public_support: s?.publicSupport ?? 50,
      international_standing: s?.internationalStanding ?? 50,
      asset_inventory: initialInventory[actorId] ?? {},
    }
  }

  const output: StateSnapshotsFile = {
    _meta: { generated: new Date().toISOString() },
    initial_state: initialState,
    snapshots,
  }

  if (isDryRun) {
    console.log("\n--- DRY RUN: first 3 snapshots ---")
    console.log(JSON.stringify(snapshots.slice(0, 3), null, 2))
    console.log(`\nTotal snapshots that would be written: ${snapshots.length}`)
    return
  }

  await writeJsonFile(OUTPUT_PATH, output)
  console.log(`Written ${snapshots.length} snapshots to ${OUTPUT_PATH}`)
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
