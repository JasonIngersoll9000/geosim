# Actor State Effects Pipeline — Design Spec

**Goal:** Add quantitative state tracking to the Iran scenario pipeline so that every
turn commit carries a cumulative actor state snapshot — capability scores, asset
inventories, infrastructure status, and global variables — grounded in research data
and event-by-event AI estimation.

**Architecture:** Six new pipeline scripts/steps that form Phase 5 of the Iran seed
pipeline. All outputs are JSON files in `data/` that feed `seed-iran.ts`, which pushes
them to four new Supabase tables. A decision-classification fix pass is included.

**Tech Stack:** Bun, TypeScript, Anthropic SDK (claude-sonnet-4-6), existing pipeline
utilities in `scripts/pipeline/`

---

## Data Flow

```
docs/Iran Research/research-gap-fill-results.md
+ data/capabilities-*.json
        │
        ▼
  parse-gap-fill.ts  →  data/iran-gap-fill.json
        │
        ▼
  score-state-effects.ts
  (reads iran-enriched.json + iran-gap-fill.json)
        │
        ▼
  data/iran-state-effects.json
        │
        ▼
  compute-state-snapshots.ts
  (reads iran-state-effects.json + actor-profiles.json + iran-gap-fill.json)
        │
        ▼
  data/iran-state-snapshots.json
        │
        ▼
  seed-iran.ts  →  Supabase (4 new tables + updated turn_commits)
```

---

## TypeScript Types (add to `scripts/pipeline/types.ts`)

```typescript
// --- Gap-fill research output ---

export interface GapFillData {
  as_of_date: string
  sources_summary: string
  asset_inventory: Record<string, ActorAssetInventory>        // keyed by actor_id
  depletion_rates: Record<string, ActorDepletionRates>        // keyed by actor_id
  infrastructure_status: FacilityStatus[]
  global_variable_timeline: GlobalVariablePoint[]
  casualties: Record<string, CasualtyData>                   // keyed by actor_id
  political_indicators: PoliticalIndicators
}

export interface ActorAssetInventory {
  [asset_type: string]: {
    estimated_remaining: number
    unit: string
    confidence: "high" | "medium" | "low"
    notes: string
  }
}

export interface ActorDepletionRates {
  [asset_type: string]: DepletionPeriod[]
}

export interface DepletionPeriod {
  rate_per_day: number          // negative = consumption/destruction
  effective_from: string        // ISO date
  effective_to?: string         // null = still active
  notes: string
}

export interface FacilityStatus {
  facility_id: string
  name: string
  actor_id: string
  facility_type: "nuclear" | "oil_gas" | "military_base" | "port" | "power_grid" | "civilian"
  status: "operational" | "degraded" | "destroyed"
  capacity_pct: number          // 0–100, % of pre-war capacity
  lat: number
  lng: number
  strike_date?: string          // date facility was first hit
  notes: string
}

export interface GlobalVariablePoint {
  date: string
  oil_price_usd: number
  hormuz_throughput_pct: number // % of pre-war normal traffic
  global_economic_stress: number // 0–100
  notes: string
}

export interface CasualtyData {
  military_cumulative: number
  civilian_cumulative: number
  as_of_date: string
  confidence: "high" | "medium" | "low"
}

export interface PoliticalIndicators {
  us_approval_pct: number
  us_congressional_status: string   // e.g. "no formal AUMF, growing dissent"
  iran_domestic_status: string
  nato_cohesion: string
  as_of_date: string
}

// --- State effects per event ---

export interface StateEffectsFile {
  _meta: { generated: string; events_processed: number }
  baseline_depletion_rates: Record<string, ActorDepletionRates>  // initial daily rates
  events: EventStateEffects[]
}

export interface EventStateEffects {
  event_id: string
  timestamp: string
  is_decision_revised: boolean        // corrected is_decision classification
  deciding_actor_revised?: string     // corrected deciding_actor if changed
  actor_deltas: Record<string, ActorStateDelta>
  asset_changes: AssetChange[]
  global_updates: Partial<GlobalVariablePoint>
  depletion_rate_changes: DepletionRateChange[]
  decision_nodes: DecisionNodeFlag[]
  confidence: "high" | "medium" | "low"
}

export interface ActorStateDelta {
  military_strength: number     // -100 to +100, additive
  political_stability: number
  economic_health: number
  public_support: number
  international_standing: number
  rationale: string
}

export interface AssetChange {
  actor_id: string
  asset_type: string
  quantity_delta: number         // negative = expended/destroyed
  facility_id?: string
  new_status?: "operational" | "degraded" | "destroyed"
  new_capacity_pct?: number
  notes: string
}

export interface DepletionRateChange {
  actor_id: string
  asset_type: string
  new_rate_per_day: number
  reason: string
}

export interface DecisionNodeFlag {
  is_major_decision_node: boolean
  label?: string                 // short player-facing label, e.g. "Operation Epic Fury"
  significance: "minor" | "significant" | "pivotal" | "game_changing"
}

// --- Cumulative state snapshots ---

export interface StateSnapshotsFile {
  _meta: { generated: string }
  initial_state: Record<string, ActorStateSnapshot>
  snapshots: TurnStateSnapshot[]
}

export interface ActorStateSnapshot {
  actor_id: string
  military_strength: number
  political_stability: number
  economic_health: number
  public_support: number
  international_standing: number
  asset_inventory: Record<string, number>  // asset_type → current count
}

export interface TurnStateSnapshot {
  event_id: string
  timestamp: string
  actor_states: Record<string, ActorStateSnapshot>
  global_state: {
    oil_price_usd: number
    hormuz_throughput_pct: number
    global_economic_stress: number
  }
  facility_statuses: FacilityStatus[]
  active_depletion_rates: Record<string, ActorDepletionRates>
}
```

---

## Supabase Migration (new file: `supabase/migrations/20260407000000_state_tracking.sql`)

```sql
-- Actor state snapshot per turn commit per actor
CREATE TABLE actor_state_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id           uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id             uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  turn_commit_id        uuid NOT NULL REFERENCES turn_commits(id) ON DELETE CASCADE,
  actor_id              text NOT NULL,
  military_strength     numeric NOT NULL CHECK (military_strength BETWEEN 0 AND 100),
  political_stability   numeric NOT NULL CHECK (political_stability BETWEEN 0 AND 100),
  economic_health       numeric NOT NULL CHECK (economic_health BETWEEN 0 AND 100),
  public_support        numeric NOT NULL CHECK (public_support BETWEEN 0 AND 100),
  international_standing numeric NOT NULL CHECK (international_standing BETWEEN 0 AND 100),
  asset_inventory       jsonb NOT NULL DEFAULT '{}',
  global_state          jsonb NOT NULL DEFAULT '{}',
  facility_statuses     jsonb NOT NULL DEFAULT '[]',
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON actor_state_snapshots (branch_id, turn_commit_id, actor_id);

-- Daily depletion rates — change over time as events shift the rate
CREATE TABLE daily_depletion_rates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id           uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id             uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  actor_id              text NOT NULL,
  asset_type            text NOT NULL,
  rate_per_day          numeric NOT NULL,   -- negative = daily consumption
  effective_from_date   date NOT NULL,
  effective_to_date     date,               -- null = currently active
  trigger_event_id      uuid REFERENCES turn_commits(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON daily_depletion_rates (branch_id, actor_id, asset_type, effective_from_date);

-- Threshold triggers — fire forced events when state crosses a threshold
CREATE TABLE threshold_triggers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id           uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id             uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  trigger_id            text NOT NULL,      -- e.g. "us_interceptors_critical"
  actor_id              text,               -- null = global trigger
  variable_path         text NOT NULL,      -- e.g. "asset_inventory.interceptors" or "global.oil_price_usd"
  threshold_value       numeric NOT NULL,
  direction             text NOT NULL CHECK (direction IN ('below', 'above')),
  sustained_days        integer NOT NULL DEFAULT 0,  -- days threshold must be exceeded before firing
  forced_event_template jsonb NOT NULL,
  status                text NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'triggered', 'disarmed')),
  triggered_at_event_id uuid REFERENCES turn_commits(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON threshold_triggers (branch_id, status);

-- Add state effect fields to turn_commits
ALTER TABLE turn_commits
  ADD COLUMN IF NOT EXISTS state_effects      jsonb,
  ADD COLUMN IF NOT EXISTS is_major_decision_node boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decision_node_label text,
  ADD COLUMN IF NOT EXISTS decision_node_significance text
    CHECK (decision_node_significance IN ('minor', 'significant', 'pivotal', 'game_changing'));
```

---

## Script 1: `scripts/parse-gap-fill.ts`

**Purpose:** Transform human-pasted research results markdown into structured JSON.

**Reads:**
- `docs/Iran Research/research-gap-fill-results.md`
- `data/capabilities-*.json` (for pre-war baseline context)

**Writes:** `data/iran-gap-fill.json`

**Behavior:**
- Reads the markdown file as a single string
- Reads all capabilities JSON files and combines into a baseline summary
- Calls Claude once with the full markdown + capabilities baseline as context
- Prompt instructs Claude to extract structured JSON matching `GapFillData` type
- Validates required top-level fields are present
- Writes output
- Supports `--dry-run` (prints extracted JSON, no write)

**Prompt shape:**
```
You are extracting structured data from research notes about the US-Iran
conflict (February–April 2026). The pre-war baselines are provided separately.
Focus on: current estimated status, depletion rates with effective dates,
inflection points, and confidence levels.

PRE-WAR BASELINES (from capabilities files):
[combined capabilities JSON summary]

RESEARCH NOTES:
[full markdown content]

Output ONLY a JSON object matching this exact shape:
[GapFillData type schema]
```

---

## Script 2: `scripts/score-state-effects.ts`

**Purpose:** AI pass over all 115 enriched events — estimates state deltas, asset
changes, global variable updates, depletion rate changes, and corrected decision
classification per event.

**Reads:**
- `data/iran-enriched.json`
- `data/iran-gap-fill.json`
- `data/actor-profiles.json`

**Writes:** `data/iran-state-effects.json` (incrementally, after each event)

**Behavior:**
- On first run, makes one initial Claude call to establish baseline daily depletion
  rates from gap-fill data and capabilities context
- Processes events in chronological order
- For each event, builds a prompt including:
  - The event (id, timestamp, title, description, full_briefing.situation, decision_analysis.decision_summary)
  - The current cumulative asset state (so Claude knows what's available to deplete)
  - Relevant gap-fill data for the event's date range (oil price, known depletion rates for this period)
  - The escalation direction and actors involved
- Claude returns `EventStateEffects` JSON
- Saves incrementally
- Supports `--from=evt_id` resume and `--dry-run` (prints first 3, no write)
- Retry logic identical to `enrich-timeline.ts` (6 retries, exponential backoff)
- `max_tokens: 4096`

**Decision classification criterion injected into every prompt:**
> A true decision point requires: (1) the designated actor's leadership made a
> deliberate choice, (2) to advance a strategic objective, (3) with meaningful
> alternatives available. Resignations in protest, casualties, economic indicators,
> foreign statements, and intelligence reports are NOT decision points regardless
> of their significance.

**Prompt output shape per event:**
```json
{
  "is_decision_revised": true,
  "deciding_actor_revised": "united_states",
  "actor_deltas": {
    "united_states": { "military_strength": -2, "political_stability": -3,
                       "economic_health": 0, "public_support": -4,
                       "international_standing": -5, "rationale": "..." },
    "iran": { ... },
    "israel": { ... },
    "russia": { ... },
    "china": { ... }
  },
  "asset_changes": [
    { "actor_id": "united_states", "asset_type": "tomahawk",
      "quantity_delta": -47, "notes": "Day 1 strike package" },
    { "actor_id": "iran", "asset_type": "s300_battery",
      "quantity_delta": -2, "facility_id": "tehran_air_defense",
      "new_status": "degraded", "new_capacity_pct": 40, "notes": "..." }
  ],
  "global_updates": { "oil_price_usd": 142, "hormuz_throughput_pct": 85 },
  "depletion_rate_changes": [],
  "decision_nodes": [{
    "is_major_decision_node": true,
    "label": "Operation Epic Fury",
    "significance": "game_changing"
  }],
  "confidence": "high"
}
```

---

## Script 3: `scripts/compute-state-snapshots.ts`

**Purpose:** Pure computation — no API calls. Replays all events in order, applying
daily depletion between events and event deltas at each event, to produce a
cumulative state snapshot at every turn commit.

**Reads:**
- `data/actor-profiles.json` (initial scores)
- `data/iran-state-effects.json` (deltas per event)
- `data/iran-gap-fill.json` (initial depletion rates, facility list, initial asset counts)
- `data/iran-enriched.json` (event timestamps for depletion calculation)

**Writes:** `data/iran-state-snapshots.json`

**Algorithm:**
```
1. Load initial actor states from actor_profiles.initial_scores
2. Load initial asset inventory from gap-fill (as_of pre-war)
3. Load initial facility statuses from gap-fill infrastructure_status
4. Load initial depletion rates from state-effects baseline_depletion_rates
5. Set current_date = scenario start date

For each event (chronological order):
  a. days_elapsed = event.timestamp - current_date
  b. For each actor, for each asset with an active depletion rate:
       asset_count += rate_per_day * days_elapsed  (clamp to 0)
  c. Apply actor_deltas to score variables (clamp to 0–100)
  d. Apply asset_changes to asset inventory
  e. Apply global_updates to global state
  f. Apply depletion_rate_changes (update active rates)
  g. Apply facility status changes from asset_changes
  h. Record snapshot: { event_id, timestamp, actor_states, global_state,
                        facility_statuses, active_depletion_rates }
  i. current_date = event.timestamp

6. Write StateSnapshotsFile
```

---

## Script 4: Updated `scripts/seed-iran.ts`

**Additional seeding (after existing turn_commits insert):**

1. For each `TurnStateSnapshot` in `iran-state-snapshots.json`:
   - For each actor: insert row into `actor_state_snapshots`
   - Update corresponding `turn_commits` row with `state_effects` JSONB,
     `is_major_decision_node`, `decision_node_label`, `decision_node_significance`

2. Insert all `daily_depletion_rates` rows from `StateEffectsFile.baseline_depletion_rates`
   plus any rate changes recorded in events

3. Insert pre-defined `threshold_triggers` rows (see Threshold Definitions below)

**Pre-defined threshold triggers seeded for every scenario:**
```typescript
const THRESHOLD_TRIGGERS = [
  {
    trigger_id: "us_interceptors_critical",
    actor_id: "united_states",
    variable_path: "asset_inventory.interceptors_total_pct",
    threshold_value: 0.20,
    direction: "below",
    sustained_days: 0,
    forced_event_template: {
      title: "Congress Debates Emergency Interceptor Resupply",
      dimension: "political",
      description: "US interceptor stockpiles fall below 20% of pre-war levels, triggering emergency DoD request to Congress."
    }
  },
  {
    trigger_id: "oil_price_crisis",
    actor_id: null,
    variable_path: "global.oil_price_usd",
    threshold_value: 200,
    direction: "above",
    sustained_days: 7,
    forced_event_template: {
      title: "IEA Emergency Summit — Oil at $200+",
      dimension: "economic",
      description: "Oil sustains above $200/barrel for seven days, triggering IEA emergency meeting and G7 economic response."
    }
  },
  {
    trigger_id: "us_public_support_floor",
    actor_id: "united_states",
    variable_path: "public_support",
    threshold_value: 35,
    direction: "below",
    sustained_days: 0,
    forced_event_template: {
      title: "Congressional War Powers Challenge Filed",
      dimension: "political",
      description: "US public support for the conflict falls below 35%, prompting bipartisan congressional challenge to war powers authorization."
    }
  },
  {
    trigger_id: "iran_civilian_casualties_threshold",
    actor_id: "iran",
    variable_path: "asset_inventory.civilian_casualties",
    threshold_value: 50000,
    direction: "above",
    sustained_days: 0,
    forced_event_template: {
      title: "ICC Opens Preliminary Investigation",
      dimension: "diplomatic",
      description: "Iranian civilian casualties exceed 50,000, triggering ICC preliminary investigation and UN emergency session."
    }
  },
  {
    trigger_id: "hormuz_near_closure",
    actor_id: null,
    variable_path: "global.hormuz_throughput_pct",
    threshold_value: 20,
    direction: "below",
    sustained_days: 3,
    forced_event_template: {
      title: "Global Oil Emergency Declared — Hormuz Near-Closure",
      dimension: "economic",
      description: "Strait of Hormuz throughput falls below 20% for three consecutive days, triggering global oil emergency declarations."
    }
  },
  {
    trigger_id: "israel_interceptors_critical",
    actor_id: "israel",
    variable_path: "asset_inventory.interceptors_total_pct",
    threshold_value: 0.15,
    direction: "below",
    sustained_days: 0,
    forced_event_template: {
      title: "Israel Requests Emergency US Interceptor Transfer",
      dimension: "military",
      description: "Israeli interceptor stocks fall below 15%, triggering emergency US resupply request and potential direct US ABM deployment."
    }
  }
]
```

---

## Tests

**`tests/scripts/parse-gap-fill.test.ts`**
- Parses a minimal valid markdown research doc and returns GapFillData shape
- Throws on missing required sections
- Handles missing optional fields gracefully
- Snapshot test on prompt string

**`tests/scripts/score-state-effects.test.ts`**
- `buildStateEffectsPrompt(event, currentState, gapFillContext)`:
  - Includes event title, situation, actors_involved
  - Includes decision classification criterion text
  - Includes current asset inventory context
  - Matches snapshot
- `parseStateEffectsResponse(raw, eventId)`:
  - Parses valid response
  - Strips markdown fences
  - Throws on missing actor_deltas / asset_changes
  - Throws on invalid JSON

**`tests/scripts/compute-state-snapshots.test.ts`**
- Clamps scores to 0–100 (never below, never above)
- Applies depletion correctly over N days (rate × days)
- Rate changes take effect from the correct event onward
- Snapshots accumulate correctly across 3 sequential test events
- Asset inventory never goes below 0

---

## File Checklist

| File | Action |
|------|--------|
| `scripts/pipeline/types.ts` | Add all new types above |
| `scripts/parse-gap-fill.ts` | Create |
| `scripts/score-state-effects.ts` | Create |
| `scripts/compute-state-snapshots.ts` | Create |
| `scripts/seed-iran.ts` | Add seeding for 4 new tables |
| `supabase/migrations/20260407000000_state_tracking.sql` | Create |
| `data/iran-gap-fill.json` | Generated by parse-gap-fill.ts |
| `data/iran-state-effects.json` | Generated by score-state-effects.ts |
| `data/iran-state-snapshots.json` | Generated by compute-state-snapshots.ts |
| `tests/scripts/parse-gap-fill.test.ts` | Create |
| `tests/scripts/score-state-effects.test.ts` | Create |
| `tests/scripts/compute-state-snapshots.test.ts` | Create |
| `docs/Iran Research/research-gap-fill-results.md` | Created by user (research paste) |
