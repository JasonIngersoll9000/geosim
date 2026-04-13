# Live State Engine & Actor Agent Integration — Design Spec

**Goal:** Wire the actor state pipeline (Spec 1) into live gameplay — depletion runs
continuously between turns, actor agents generate decisions constrained by real
available capacity, alternate branches maintain independent state, threshold triggers
fire forced events, and the map + actor panel display live state to the player.

**Architecture:** Four components added to the existing game loop: a state engine
library, actor agent integration updates, a threshold evaluator, and frontend data
contracts for the map layer and actor panel. No new pipeline scripts — this is
all runtime game logic.

**Tech Stack:** TypeScript, Supabase (read/write), Anthropic SDK, Next.js App Router,
Mapbox GL JS

**Depends on:** Spec 1 (Actor State Effects Pipeline) fully seeded to Supabase

---

## Component 1: State Engine (`lib/game/state-engine.ts`)

The state engine is the single source of truth for actor state at any point in a
branch. It reads from `actor_state_snapshots` and `daily_depletion_rates`, applies
continuous depletion, and handles branch forking.

### Types

```typescript
import type { ActorStateSnapshot, TurnStateSnapshot, FacilityStatus } from "@/lib/types/simulation"

export interface LiveActorState extends ActorStateSnapshot {
  // Derived availability flags — computed from inventory vs. thresholds
  asset_availability: Record<string, AssetAvailability>
}

export interface AssetAvailability {
  count: number
  pct_of_initial: number
  status: "available" | "constrained" | "exhausted"
  // constrained = below 25% of initial; exhausted = 0
}

export interface LiveGlobalState {
  oil_price_usd: number
  hormuz_throughput_pct: number
  global_economic_stress: number
}

export interface BranchStateAtTurn {
  branch_id: string
  turn_commit_id: string
  as_of_date: string
  actor_states: Record<string, LiveActorState>
  global_state: LiveGlobalState
  facility_statuses: FacilityStatus[]
  active_depletion_rates: Record<string, Record<string, number>>
}
```

### Functions

```typescript
/**
 * Load the actor state snapshot for a specific turn on a branch,
 * then apply daily depletion from that turn's date to `asOfDate`.
 * `asOfDate` defaults to the turn's timestamp (no extra depletion).
 */
export async function getStateAtTurn(
  branchId: string,
  turnCommitId: string,
  asOfDate?: string
): Promise<BranchStateAtTurn>

/**
 * Apply daily depletion rates from fromDate to toDate against the
 * given state. Clamps all asset counts to 0. Returns updated state.
 * Pure function — does not write to DB.
 */
export function applyDepletion(
  state: BranchStateAtTurn,
  fromDate: string,
  toDate: string
): BranchStateAtTurn

/**
 * Apply a resolved event's state effects to the current live state.
 * Updates scores (clamped 0–100), asset inventory, global state,
 * facility statuses, and depletion rates.
 * Pure function — caller writes result to DB.
 */
export function applyEventEffects(
  state: BranchStateAtTurn,
  effects: EventStateEffects
): BranchStateAtTurn

/**
 * Fork state for a new branch at the given turn.
 * Copies the snapshot and all active depletion rates to the new branch.
 * Writes new actor_state_snapshots rows and daily_depletion_rates rows.
 * Returns the forked BranchStateAtTurn.
 */
export async function forkStateForBranch(
  parentBranchId: string,
  forkTurnCommitId: string,
  newBranchId: string
): Promise<BranchStateAtTurn>

/**
 * Compute asset availability flags from current inventory vs.
 * initial inventory (from actor_profiles.initial_scores).
 * Pure function.
 */
export function computeAssetAvailability(
  actorId: string,
  currentInventory: Record<string, number>,
  initialInventory: Record<string, number>
): Record<string, AssetAvailability>

/**
 * Persist a BranchStateAtTurn to actor_state_snapshots.
 * Called after event resolution writes a new turn_commit.
 */
export async function persistStateSnapshot(
  scenarioId: string,
  branchId: string,
  turnCommitId: string,
  state: BranchStateAtTurn
): Promise<void>
```

### Depletion Calculation Detail

Between turns, depletion is proportional to real calendar days elapsed:

```
days_elapsed = daysBetween(lastTurnDate, currentTurnDate)
For each actor, for each asset with an active depletion rate:
  new_count = max(0, current_count + (rate_per_day × days_elapsed))
```

Depletion rates are retrieved from `daily_depletion_rates` where
`branch_id = currentBranch AND effective_from_date <= currentDate AND
(effective_to_date IS NULL OR effective_to_date > currentDate)`.

On alternate branches, depletion rates diverge from ground truth when a player
decision changes operational tempo (e.g. ceasefire → rates drop to 0 for that dyad;
escalation → rates increase). The actor agent determines new rates as part of
outcome resolution (see Component 2).

---

## Component 2: Actor Agent Integration (`lib/ai/actor-agent.ts`)

The actor agent currently generates decisions based on doctrine and narrative context.
It must also receive current state so alternatives are constrained by real capacity.

### State Context Block

Before building the actor agent prompt, load current state via `getStateAtTurn()`,
then serialize into a structured context block:

```typescript
export function buildStateContextBlock(
  actorId: string,
  state: BranchStateAtTurn
): string {
  const actor = state.actor_states[actorId]
  const scores = [
    `Military Strength: ${actor.military_strength}/100 (${trendLabel(actor)})`,
    `Political Stability: ${actor.political_stability}/100`,
    `Economic Health: ${actor.economic_health}/100`,
    `Public Support: ${actor.public_support}/100`,
    `International Standing: ${actor.international_standing}/100`,
  ].join("\n")

  const assets = Object.entries(actor.asset_availability)
    .map(([type, av]) =>
      `${type}: ${av.count} remaining (${Math.round(av.pct_of_initial * 100)}% of initial) — ${av.status.toUpperCase()}`
    )
    .join("\n")

  const globalCtx = [
    `Oil price: $${state.global_state.oil_price_usd}/barrel`,
    `Hormuz throughput: ${state.global_state.hormuz_throughput_pct}% of normal`,
    `Global economic stress: ${state.global_state.global_economic_stress}/100`,
  ].join("\n")

  const facilities = state.facility_statuses
    .filter(f => f.actor_id === actorId)
    .map(f => `${f.name}: ${f.status} (${f.capacity_pct}% capacity)`)
    .join("\n")

  return `
CURRENT ACTOR STATE — ${actorId.toUpperCase()}:
${scores}

ASSET INVENTORY:
${assets}

KEY FACILITIES:
${facilities}

GLOBAL CONTEXT:
${globalCtx}

CONSTRAINT RULE: Do not generate alternatives that require assets marked EXHAUSTED.
Flag alternatives requiring CONSTRAINED assets as high-risk and note the supply concern.
`
}
```

### Decision Generation Changes

The actor agent prompt receives the state context block injected after the doctrine
section and before the decision alternatives instruction. The agent is instructed:

1. Do not propose options requiring exhausted assets
2. Flag constrained-asset options as `"resource_risk": true` with a note
3. For each alternative, include estimated state effects: which assets would be
   expended, estimated score deltas for all actors, and whether any new depletion
   rates would change

### Outcome Resolution Changes

When the resolution engine processes a player decision on an alternate branch,
it must also determine:

1. **Asset consumption** for the chosen action (Tomahawks expended, interceptors
   used, casualties incurred, infrastructure damaged)
2. **Other actor responses** — what each non-deciding actor did in reaction and
   what assets they expended
3. **New depletion rates** if the decision changes the operational tempo
4. **Global variable updates** (does this event move oil price, Hormuz throughput?)

These are returned as an `EventStateEffects` object, which the game loop passes to
`applyEventEffects()` and then `persistStateSnapshot()`.

The resolution engine prompt receives the current state for ALL actors (not just
the deciding actor) so it can model realistic reactions constrained by each actor's
available capacity.

---

## Component 3: Threshold Evaluator (`lib/game/threshold-evaluator.ts`)

After every turn commit (both ground truth advancement and player decisions on
branches), evaluate all armed thresholds for the current branch.

### Types

```typescript
export interface ThresholdResult {
  triggered: boolean
  trigger_id: string
  forced_event: Partial<TimelineEvent> | null
}
```

### Function

```typescript
/**
 * Evaluate all armed thresholds for a branch against current state.
 * For triggers with sustained_days > 0, checks if the threshold has
 * been exceeded for the required number of consecutive days.
 * Returns any newly triggered events to be queued.
 * Writes triggered thresholds to DB (status = 'triggered').
 */
export async function evaluateThresholds(
  branchId: string,
  state: BranchStateAtTurn
): Promise<ThresholdResult[]>
```

### Resolution of Variable Paths

`variable_path` in `threshold_triggers` uses dot notation:

| Path | Source |
|------|--------|
| `asset_inventory.interceptors_total_pct` | sum of all interceptor types / initial sum, per actor |
| `asset_inventory.civilian_casualties` | cumulative civilian casualties tracked in asset_inventory |
| `global.oil_price_usd` | `state.global_state.oil_price_usd` |
| `global.hormuz_throughput_pct` | `state.global_state.hormuz_throughput_pct` |
| `public_support` | `state.actor_states[actor_id].public_support` |

### Forced Event Handling

When a threshold fires, `evaluateThresholds` returns a `forced_event` object
constructed from `forced_event_template`. The game loop queues this as the next
turn commit on the branch — the player cannot skip it. The event is processed
through the full enrichment path (briefing generated by narrator agent) but its
occurrence is mandatory.

---

## Component 4: Frontend Data Contracts

These interfaces define exactly what the map layer and actor panel components
receive. UI implementation is in separate tasks — this spec defines the data shape only.

### Map Layer API: `GET /api/scenarios/[id]/branches/[branchId]/map-assets`

Returns all assets visible on the map at a given turn:

```typescript
export interface MapAsset {
  id: string
  actor_id: string
  asset_type:
    | "carrier_group"
    | "military_base"
    | "missile_battery"
    | "nuclear_facility"
    | "oil_gas_facility"
    | "troop_deployment"
    | "naval_asset"
    | "air_defense_battery"
  label: string
  lat: number
  lng: number
  status: "operational" | "degraded" | "destroyed"
  capacity_pct: number           // 0–100
  actor_color: string            // hex, from actor profile
  tooltip: string                // 1–2 sentence detail for map popup
  is_approximate_location: boolean  // true for deployments, carrier groups
}

export interface MapAssetsResponse {
  turn_commit_id: string
  as_of_date: string
  assets: MapAsset[]
  shipping_lanes: ShippingLane[]
}

export interface ShippingLane {
  id: string                     // e.g. "strait_of_hormuz"
  label: string
  throughput_pct: number         // 0–100, drives visual styling
  coordinates: [number, number][] // GeoJSON LineString coordinates
}
```

### Actor Panel API: `GET /api/scenarios/[id]/branches/[branchId]/actor-panel/[actorId]`

```typescript
export interface ActorPanelResponse {
  actor_id: string
  actor_name: string
  turn_commit_id: string
  as_of_date: string

  scores: {
    military_strength:      ScoreWithTrend
    political_stability:    ScoreWithTrend
    economic_health:        ScoreWithTrend
    public_support:         ScoreWithTrend
    international_standing: ScoreWithTrend
  }

  asset_categories: AssetCategory[]

  facilities: {
    name: string
    type: string
    status: "operational" | "degraded" | "destroyed"
    capacity_pct: number
    location_label: string     // e.g. "Fordow, Iran" or "Arabian Sea"
  }[]

  reserve_capacity: {
    label: string              // e.g. "US Ground Forces (CONUS)"
    description: string        // e.g. "~50,000 Army troops available; 3–6 month mobilization at scale"
    mobilization_timeline: string
  }[]

  active_depletion_rates: {
    asset_type: string
    rate_per_day: number
    days_until_exhausted: number | null  // null if rate is 0 or count is 0
  }[]
}

export interface ScoreWithTrend {
  value: number
  trend: "up" | "down" | "stable"
  delta_since_start: number    // vs. initial_score
}

export interface AssetCategory {
  category: string             // e.g. "Precision Strike", "Air Defense", "Naval"
  items: AssetItem[]
}

export interface AssetItem {
  name: string                 // e.g. "Tomahawk TLAM"
  initial_count: number
  current_count: number
  daily_rate: number           // negative = depletion per day
  unit: string                 // e.g. "missiles", "batteries", "aircraft"
  status: "available" | "constrained" | "exhausted"
  days_until_exhausted: number | null
}
```

### API Route Implementation Notes

Both routes:
1. Load `actor_state_snapshots` for the requested `turn_commit_id` + `branch_id`
2. Apply depletion from snapshot date to requested date (default: snapshot date)
3. Compute `AssetAvailability` via `computeAssetAvailability()`
4. Compute trend by comparing to previous snapshot (N-1 turn) and initial scores
5. Build and return the response shape above

---

## Game Loop Integration Points

The game loop at `lib/game/game-loop.ts` needs three new integration points:

**After advancing ground truth (new turn commit from research update):**
```
resolvedEffects = outcome of research event
newState = applyEventEffects(currentState, resolvedEffects)
await persistStateSnapshot(scenarioId, branchId, newTurnCommitId, newState)
thresholdResults = await evaluateThresholds(branchId, newState)
// queue any forced events from thresholdResults
```

**After player submits decision on alternate branch:**
```
// 1. Get current state
currentState = await getStateAtTurn(branchId, lastTurnCommitId)
currentState = applyDepletion(currentState, lastTurnDate, now())

// 2. Resolve decision (actor agent + resolution engine)
// Resolution engine receives currentState for all actors
resolvedEffects = await resolveDecision(decision, currentState)

// 3. Update state
newState = applyEventEffects(currentState, resolvedEffects)
await persistStateSnapshot(scenarioId, branchId, newTurnCommitId, newState)

// 4. Evaluate thresholds
thresholdResults = await evaluateThresholds(branchId, newState)
```

**On branch creation (player forks from a commit):**
```
forkedState = await forkStateForBranch(parentBranchId, forkCommitId, newBranchId)
// forkedState is now the starting state for all decisions on the new branch
```

---

## Tests

**`tests/game/state-engine.test.ts`**
- `applyDepletion`: correctly depletes over N days, clamps to 0, handles 0-rate assets
- `applyDepletion`: rate changes effective from correct date boundary
- `applyEventEffects`: score deltas clamp to 0–100
- `applyEventEffects`: asset changes apply correctly, negative results clamped to 0
- `computeAssetAvailability`: correct status thresholds (< 25% = constrained, 0 = exhausted)
- `forkStateForBranch`: forked state is independent (mutations don't affect parent)

**`tests/game/threshold-evaluator.test.ts`**
- Fires immediately when threshold crossed (sustained_days = 0)
- Does not fire when sustained threshold not yet met (sustained_days = 7, only 3 elapsed)
- Fires when sustained threshold met
- Does not re-fire already triggered threshold
- Disarmed threshold never fires

**`tests/api/actor-panel.test.ts`**
- Returns correct score values from snapshot
- Trend is "down" when current < previous snapshot
- `days_until_exhausted` is null when daily_rate is 0
- `days_until_exhausted` correctly calculated when rate > 0

**`tests/api/map-assets.test.ts`**
- Returns assets for correct branch and turn
- Destroyed facilities are included with status "destroyed"
- `hormuz_throughput_pct` in shipping lane matches global state

---

## Implementation Order

This spec depends on Spec 1 being complete and seeded. Within this spec,
implement in this order:

1. State engine (`lib/game/state-engine.ts`) — foundation for everything else
2. State engine tests
3. Threshold evaluator (`lib/game/threshold-evaluator.ts`) + tests
4. Actor agent integration (`lib/ai/actor-agent.ts` updates)
5. API routes: actor panel + map assets
6. API route tests
7. Game loop integration points
8. Frontend components (separate tasks — consume these API contracts)

---

## File Checklist

| File | Action |
|------|--------|
| `lib/game/state-engine.ts` | Create |
| `lib/game/threshold-evaluator.ts` | Create |
| `lib/ai/actor-agent.ts` | Update — add state context block injection |
| `lib/types/simulation.ts` | Add `LiveActorState`, `BranchStateAtTurn`, `MapAsset`, `ActorPanelResponse` |
| `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` | Create |
| `app/api/scenarios/[id]/branches/[branchId]/actor-panel/[actorId]/route.ts` | Create |
| `lib/game/game-loop.ts` | Update — three integration points above |
| `tests/game/state-engine.test.ts` | Create |
| `tests/game/threshold-evaluator.test.ts` | Create |
| `tests/api/actor-panel.test.ts` | Create |
| `tests/api/map-assets.test.ts` | Create |
