# Actor State Effects Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add quantitative state tracking to the Iran scenario pipeline — per-actor score deltas, asset depletion, infrastructure status, and global variables — then seed them to Supabase.

**Architecture:** Five tasks executed in order: (1) types + migration, (2) parse-gap-fill.ts, (3) score-state-effects.ts, (4) compute-state-snapshots.ts, (5) seed-iran.ts updates. All scripts follow the existing pipeline pattern: incremental saves, `--from=` resume, `--dry-run`, exponential backoff retry. `compute-state-snapshots.ts` is pure computation with no API calls.

**Tech Stack:** Bun, TypeScript strict, Anthropic SDK (claude-sonnet-4-6), Supabase service client, Vitest

**Prerequisite before running scripts:** `docs/Iran Research/research-gap-fill-results.md` must exist with pasted research output.

---

## File Map

| File | Action |
|------|--------|
| `scripts/pipeline/types.ts` | Modify — append new types |
| `supabase/migrations/20260407000000_state_tracking.sql` | Create |
| `scripts/parse-gap-fill.ts` | Create |
| `scripts/score-state-effects.ts` | Create |
| `scripts/compute-state-snapshots.ts` | Create |
| `scripts/seed-iran.ts` | Modify — fix escalation fields + seed 3 new tables |
| `tests/scripts/parse-gap-fill.test.ts` | Create |
| `tests/scripts/score-state-effects.test.ts` | Create |
| `tests/scripts/compute-state-snapshots.test.ts` | Create |

---

## Task 1: Types + Supabase Migration

**Files:**
- Modify: `scripts/pipeline/types.ts`
- Create: `supabase/migrations/20260407000000_state_tracking.sql`

- [ ] **Step 1: Append new types to `scripts/pipeline/types.ts`**

Add after the last export in the file:

```typescript
// ─── Gap-fill research output ────────────────────────────────────────────────

export interface GapFillData {
  as_of_date: string
  sources_summary: string
  asset_inventory: Record<string, ActorAssetInventory>     // keyed by actor_id
  depletion_rates: Record<string, ActorDepletionRates>     // keyed by actor_id
  infrastructure_status: FacilityStatus[]
  global_variable_timeline: GlobalVariablePoint[]
  casualties: Record<string, CasualtyData>                 // keyed by actor_id
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

export type ActorDepletionRates = Record<string, DepletionPeriod[]>

export interface DepletionPeriod {
  rate_per_day: number        // negative = consumption/destruction
  effective_from: string      // ISO date YYYY-MM-DD
  effective_to?: string       // undefined = currently active
  notes: string
}

export interface FacilityStatus {
  facility_id: string
  name: string
  actor_id: string
  facility_type: "nuclear" | "oil_gas" | "military_base" | "port" | "power_grid" | "civilian"
  status: "operational" | "degraded" | "destroyed"
  capacity_pct: number        // 0–100
  lat: number
  lng: number
  strike_date?: string
  notes: string
}

export interface GlobalVariablePoint {
  date: string
  oil_price_usd: number
  hormuz_throughput_pct: number  // % of pre-war normal traffic
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
  us_congressional_status: string
  iran_domestic_status: string
  nato_cohesion: string
  as_of_date: string
}

// ─── State effects per event ─────────────────────────────────────────────────

export interface StateEffectsFile {
  _meta: { generated: string; events_processed: number }
  baseline_depletion_rates: Record<string, ActorDepletionRates>
  events: EventStateEffects[]
}

export interface EventStateEffects {
  event_id: string
  timestamp: string
  is_decision_revised: boolean
  deciding_actor_revised?: string
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
  quantity_delta: number
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
  label?: string
  significance: "minor" | "significant" | "pivotal" | "game_changing"
}

// ─── Cumulative state snapshots ───────────────────────────────────────────────

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

export interface StateSnapshotsFile {
  _meta: { generated: string }
  initial_state: Record<string, ActorStateSnapshot>
  snapshots: TurnStateSnapshot[]
}
```

- [ ] **Step 2: Create the Supabase migration**

Create `supabase/migrations/20260407000000_state_tracking.sql`:

```sql
-- Actor state snapshot per turn commit per actor
CREATE TABLE actor_state_snapshots (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id              uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  turn_commit_id         uuid NOT NULL REFERENCES turn_commits(id) ON DELETE CASCADE,
  actor_id               text NOT NULL,
  military_strength      numeric NOT NULL CHECK (military_strength BETWEEN 0 AND 100),
  political_stability    numeric NOT NULL CHECK (political_stability BETWEEN 0 AND 100),
  economic_health        numeric NOT NULL CHECK (economic_health BETWEEN 0 AND 100),
  public_support         numeric NOT NULL CHECK (public_support BETWEEN 0 AND 100),
  international_standing numeric NOT NULL CHECK (international_standing BETWEEN 0 AND 100),
  asset_inventory        jsonb NOT NULL DEFAULT '{}',
  global_state           jsonb NOT NULL DEFAULT '{}',
  facility_statuses      jsonb NOT NULL DEFAULT '[]',
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON actor_state_snapshots (branch_id, turn_commit_id, actor_id);

-- Daily depletion rates with effective date ranges
CREATE TABLE daily_depletion_rates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id           uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  actor_id            text NOT NULL,
  asset_type          text NOT NULL,
  rate_per_day        numeric NOT NULL,
  effective_from_date date NOT NULL,
  effective_to_date   date,
  trigger_event_id    uuid REFERENCES turn_commits(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON daily_depletion_rates (branch_id, actor_id, asset_type, effective_from_date);

-- Threshold triggers — fire forced events when state crosses a value
CREATE TABLE threshold_triggers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id              uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  trigger_id             text NOT NULL,
  actor_id               text,
  variable_path          text NOT NULL,
  threshold_value        numeric NOT NULL,
  direction              text NOT NULL CHECK (direction IN ('below', 'above')),
  sustained_days         integer NOT NULL DEFAULT 0,
  forced_event_template  jsonb NOT NULL,
  status                 text NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'triggered', 'disarmed')),
  triggered_at_event_id  uuid REFERENCES turn_commits(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON threshold_triggers (branch_id, status);

-- Extend turn_commits with state tracking fields
ALTER TABLE turn_commits
  ADD COLUMN IF NOT EXISTS state_effects               jsonb,
  ADD COLUMN IF NOT EXISTS is_major_decision_node      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decision_node_label         text,
  ADD COLUMN IF NOT EXISTS decision_node_significance  text
    CHECK (decision_node_significance IN ('minor', 'significant', 'pivotal', 'game_changing'));
```

- [ ] **Step 3: Run tests to confirm nothing is broken before proceeding**

```bash
bun run test -- --run tests/scripts/
```

Expected: all existing tests pass (enrich-timeline, rescore-escalation, escalation-framework)

- [ ] **Step 4: Commit**

```bash
git add scripts/pipeline/types.ts supabase/migrations/20260407000000_state_tracking.sql
git commit -m "feat: add actor state tracking types and Supabase migration"
```

---

## Task 2: `parse-gap-fill.ts` (TDD)

**Files:**
- Create: `tests/scripts/parse-gap-fill.test.ts`
- Create: `scripts/parse-gap-fill.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/scripts/parse-gap-fill.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildCapabilitiesSummary,
  buildGapFillPrompt,
  parseGapFillResponse,
} from "../../scripts/parse-gap-fill"
import type { RawCapability, GapFillData } from "../../scripts/pipeline/types"

function makeCapability(overrides: Partial<RawCapability> = {}): RawCapability {
  return {
    category: "military",
    name: "Tomahawk TLAM",
    description: "Land-attack cruise missile",
    quantity: 4000,
    unit: "missiles",
    deployment_status: "available",
    lead_time_days: 30,
    temporal_anchor: "2026-02-01",
    actor: "united_states",
    ...overrides,
  }
}

function makeValidGapFill(): GapFillData {
  return {
    as_of_date: "2026-04-07",
    sources_summary: "Test sources.",
    asset_inventory: {
      united_states: {
        tomahawk: { estimated_remaining: 2800, unit: "missiles", confidence: "medium", notes: "Estimate" },
      },
    },
    depletion_rates: {
      united_states: {
        tomahawk: [{ rate_per_day: -45, effective_from: "2026-02-28", notes: "Strike rate" }],
      },
    },
    infrastructure_status: [
      {
        facility_id: "fordow",
        name: "Fordow Enrichment Facility",
        actor_id: "iran",
        facility_type: "nuclear",
        status: "destroyed",
        capacity_pct: 0,
        lat: 34.88,
        lng: 50.99,
        strike_date: "2026-03-01",
        notes: "Destroyed by GBU-57",
      },
    ],
    global_variable_timeline: [
      { date: "2026-04-07", oil_price_usd: 185, hormuz_throughput_pct: 35, global_economic_stress: 65, notes: "" },
    ],
    casualties: {
      iran: { military_cumulative: 8000, civilian_cumulative: 12000, as_of_date: "2026-04-07", confidence: "low" },
    },
    political_indicators: {
      us_approval_pct: 44,
      us_congressional_status: "No formal AUMF, growing dissent",
      iran_domestic_status: "Rally-around-flag, limited dissent",
      nato_cohesion: "Fractured — most members refusing participation",
      as_of_date: "2026-04-07",
    },
  }
}

describe("buildCapabilitiesSummary", () => {
  it("includes actor names and capability names", () => {
    const caps: Record<string, RawCapability[]> = {
      united_states: [makeCapability()],
    }
    const summary = buildCapabilitiesSummary(caps)
    expect(summary).toContain("united_states")
    expect(summary).toContain("Tomahawk TLAM")
    expect(summary).toContain("4000")
  })

  it("handles multiple actors", () => {
    const caps: Record<string, RawCapability[]> = {
      united_states: [makeCapability()],
      iran: [makeCapability({ name: "Shahab-3", actor: "iran" })],
    }
    const summary = buildCapabilitiesSummary(caps)
    expect(summary).toContain("iran")
    expect(summary).toContain("Shahab-3")
  })
})

describe("buildGapFillPrompt", () => {
  it("includes the research markdown content", () => {
    const prompt = buildGapFillPrompt("## Military\nTomahawks: 2800 remaining.", "caps summary")
    expect(prompt).toContain("Tomahawks: 2800 remaining.")
  })

  it("includes the capabilities summary", () => {
    const prompt = buildGapFillPrompt("research notes", "caps summary text here")
    expect(prompt).toContain("caps summary text here")
  })

  it("instructs focus on depletion trends not pre-war baseline", () => {
    const prompt = buildGapFillPrompt("notes", "caps")
    expect(prompt).toContain("depletion")
    expect(prompt).toContain("pre-war")
  })

  it("requests all required top-level fields", () => {
    const prompt = buildGapFillPrompt("notes", "caps")
    expect(prompt).toContain("asset_inventory")
    expect(prompt).toContain("depletion_rates")
    expect(prompt).toContain("infrastructure_status")
    expect(prompt).toContain("global_variable_timeline")
    expect(prompt).toContain("casualties")
    expect(prompt).toContain("political_indicators")
  })

  it("matches snapshot (change-control gate)", () => {
    const prompt = buildGapFillPrompt("## Section\nSome notes.", "actor: US\n  tomahawk: 4000")
    expect(prompt).toMatchSnapshot()
  })
})

describe("parseGapFillResponse", () => {
  it("parses a valid gap-fill response", () => {
    const raw = JSON.stringify(makeValidGapFill())
    const result = parseGapFillResponse(raw)
    expect(result.as_of_date).toBe("2026-04-07")
    expect(result.asset_inventory["united_states"]["tomahawk"].estimated_remaining).toBe(2800)
    expect(result.infrastructure_status[0].facility_id).toBe("fordow")
    expect(result.global_variable_timeline[0].oil_price_usd).toBe(185)
  })

  it("strips markdown fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(makeValidGapFill()) + "\n```"
    expect(() => parseGapFillResponse(raw)).not.toThrow()
  })

  it("throws on invalid JSON", () => {
    expect(() => parseGapFillResponse("not json")).toThrow("not valid JSON")
  })

  it("throws when asset_inventory is missing", () => {
    const { asset_inventory: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: asset_inventory")
  })

  it("throws when depletion_rates is missing", () => {
    const { depletion_rates: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: depletion_rates")
  })

  it("throws when infrastructure_status is missing", () => {
    const { infrastructure_status: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: infrastructure_status")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun run test -- --run tests/scripts/parse-gap-fill.test.ts
```

Expected: FAIL with "Cannot find module '../../scripts/parse-gap-fill'"

- [ ] **Step 3: Implement `scripts/parse-gap-fill.ts`**

```typescript
// scripts/parse-gap-fill.ts
// Phase 5a: Parse gap-fill research results markdown into structured JSON.
//
// Usage:
//   bun run scripts/parse-gap-fill.ts
//   bun run scripts/parse-gap-fill.ts --dry-run
//
// Reads:  docs/Iran Research/research-gap-fill-results.md
//         data/capabilities-*.json  (pre-war baselines as context)
//
// Writes: data/iran-gap-fill.json

import Anthropic from "@anthropic-ai/sdk"
import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type { GapFillData, RawCapability } from "./pipeline/types"
import { readFile } from "fs/promises"

const RESEARCH_MARKDOWN_PATH = "docs/Iran Research/research-gap-fill-results.md"

const CAPABILITY_FILES: Record<string, string> = {
  united_states: "data/capabilities-us.json",
  iran: "data/capabilities-iran.json",
  israel: "data/capabilities-israel.json",
  russia: "data/capabilities-russia-china.json",
  china: "data/capabilities-russia-china.json",
  gulf_states: "data/capabilities-gulf-states.json",
}

export function buildCapabilitiesSummary(caps: Record<string, RawCapability[]>): string {
  return Object.entries(caps)
    .map(([actorId, items]) => {
      const lines = items
        .map(c => `  - ${c.name}: ${c.quantity ?? "?"} ${c.unit ?? ""} (${c.deployment_status})`)
        .join("\n")
      return `${actorId}:\n${lines}`
    })
    .join("\n\n")
}

export function buildGapFillPrompt(markdown: string, capabilitiesSummary: string): string {
  return `You are extracting structured data from research notes about the US-Iran conflict
(February–April 2026). Pre-war baselines are provided — focus on depletion trends,
current estimated status, inflection dates, and confidence levels.

PRE-WAR BASELINES (from capabilities files):
${capabilitiesSummary}

RESEARCH NOTES:
${markdown}

Output ONLY a single JSON object with this exact shape:
{
  "as_of_date": "YYYY-MM-DD",
  "sources_summary": "One sentence summarizing source quality.",
  "asset_inventory": {
    "actor_id": {
      "asset_type": {
        "estimated_remaining": [number],
        "unit": "missiles|aircraft|batteries|etc",
        "confidence": "high|medium|low",
        "notes": "One sentence."
      }
    }
  },
  "depletion_rates": {
    "actor_id": {
      "asset_type": [
        {
          "rate_per_day": [negative number],
          "effective_from": "YYYY-MM-DD",
          "effective_to": "YYYY-MM-DD or omit if still active",
          "notes": "One sentence."
        }
      ]
    }
  },
  "infrastructure_status": [
    {
      "facility_id": "slug_id",
      "name": "Full name",
      "actor_id": "actor_id",
      "facility_type": "nuclear|oil_gas|military_base|port|power_grid|civilian",
      "status": "operational|degraded|destroyed",
      "capacity_pct": [0-100],
      "lat": [number],
      "lng": [number],
      "strike_date": "YYYY-MM-DD or omit",
      "notes": "One sentence."
    }
  ],
  "global_variable_timeline": [
    {
      "date": "YYYY-MM-DD",
      "oil_price_usd": [number],
      "hormuz_throughput_pct": [0-100],
      "global_economic_stress": [0-100],
      "notes": "One sentence."
    }
  ],
  "casualties": {
    "actor_id": {
      "military_cumulative": [number],
      "civilian_cumulative": [number],
      "as_of_date": "YYYY-MM-DD",
      "confidence": "high|medium|low"
    }
  },
  "political_indicators": {
    "us_approval_pct": [number],
    "us_congressional_status": "One sentence.",
    "iran_domestic_status": "One sentence.",
    "nato_cohesion": "One sentence.",
    "as_of_date": "YYYY-MM-DD"
  }
}

Output ONLY the JSON. No prose outside the JSON.`
}

export function parseGapFillResponse(raw: string): GapFillData {
  let parsed: unknown
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    const content = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error("Failed to parse gap-fill response: not valid JSON")
  }

  const res = parsed as Record<string, unknown>
  for (const field of ["asset_inventory", "depletion_rates", "infrastructure_status", "global_variable_timeline", "casualties", "political_indicators"]) {
    if (res[field] === undefined) {
      throw new Error(`Gap-fill response missing field: ${field}`)
    }
  }

  return res as unknown as GapFillData
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  // Load research markdown
  let markdown: string
  try {
    markdown = await readFile(RESEARCH_MARKDOWN_PATH, "utf-8")
  } catch {
    throw new Error(
      `Research results not found at ${RESEARCH_MARKDOWN_PATH}\n` +
      `Run the prompts in docs/Iran Research/research-gap-fill-prompts.md first.`
    )
  }

  // Load capabilities for pre-war baseline context
  const capsByActor: Record<string, RawCapability[]> = {}
  for (const [actorId, filePath] of Object.entries(CAPABILITY_FILES)) {
    try {
      const caps = await readJsonFile<RawCapability[]>(filePath)
      const filtered = actorId === "russia" || actorId === "china"
        ? caps.filter(c => (c as RawCapability & { actor?: string }).actor === actorId)
        : caps
      capsByActor[actorId] = filtered
    } catch {
      // Missing capability file is non-fatal
    }
  }

  const capabilitiesSummary = buildCapabilitiesSummary(capsByActor)
  const prompt = buildGapFillPrompt(markdown, capabilitiesSummary)

  console.log("Calling Claude to parse gap-fill research...")
  const client = new Anthropic()
  const raw = await client.messages
    .create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    })
    .then(r => r.content[0].type === "text" ? r.content[0].text : "")

  const gapFill = parseGapFillResponse(raw)

  if (dryRun) {
    console.log("[dry-run] Parsed gap-fill data:")
    console.log(JSON.stringify(gapFill, null, 2))
    return
  }

  await writeJsonFile("data/iran-gap-fill.json", gapFill)
  console.log(`✓ Written to data/iran-gap-fill.json`)
  console.log(`  Actors with inventory: ${Object.keys(gapFill.asset_inventory).join(", ")}`)
  console.log(`  Facilities tracked: ${gapFill.infrastructure_status.length}`)
  console.log(`  Timeline points: ${gapFill.global_variable_timeline.length}`)
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
bun run test -- --run tests/scripts/parse-gap-fill.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Update snapshots**

```bash
bun run test -- --run tests/scripts/parse-gap-fill.test.ts -u
```

- [ ] **Step 6: Commit**

```bash
git add scripts/parse-gap-fill.ts tests/scripts/parse-gap-fill.test.ts
git commit -m "feat: add parse-gap-fill.ts — Phase 5a pipeline script"
```

---

## Task 3: `score-state-effects.ts` (TDD)

**Files:**
- Create: `tests/scripts/score-state-effects.test.ts`
- Create: `scripts/score-state-effects.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/scripts/score-state-effects.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildStateEffectsPrompt,
  parseStateEffectsResponse,
  buildBaselineDepletionPrompt,
  parseBaselineDepletionResponse,
} from "../../scripts/score-state-effects"
import type { EnrichedEvent, GapFillData, EventStateEffects, ActorDepletionRates } from "../../scripts/pipeline/types"

function makeEnrichedEvent(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: "evt_20260228_op_epic_fury",
    timestamp: "2026-02-28",
    timestamp_confidence: "exact",
    title: "US Launches Operation Epic Fury",
    description: "US and Israel launch coordinated strikes on Iran.",
    actors_involved: ["united_states", "israel", "iran"],
    dimension: "military",
    is_decision: true,
    deciding_actor: "united_states",
    escalation_direction: "up",
    source_excerpt: "Trump authorized the operation.",
    full_briefing: {
      situation: "Coalition forces launched strikes across Iran.",
      actor_perspectives: { united_states: "US perspective.", iran: "Iran perspective.", israel: "Israel perspective." },
      context: "Context paragraph.",
    },
    chronicle: { headline: "US-Israel Strike Iran", date_label: "Day 1", entry: "Chronicle." },
    context_summary: "Context summary.",
    decision_analysis: {
      is_decision_point: true,
      deciding_actor_id: "united_states",
      decision_summary: "Trump chose to launch Operation Epic Fury.",
      alternatives: [],
    },
    escalation: {
      by_actor: {
        united_states: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes." },
        iran: { rung: 5, level: 2, level_name: "Covert / Deniable Operations", criteria_rationale: "Proxy activations." },
        israel: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes." },
        russia: { rung: 2, level: 1, level_name: "Crisis Onset", criteria_rationale: "Diplomatic support." },
        china: { rung: 1, level: 0, level_name: "Baseline Competition", criteria_rationale: "Observer posture." },
      },
      perceived: {
        iran_perceives_us: { estimated_rung: 12, confidence: "moderate", rationale: "Iran overestimates." },
        us_perceives_iran: { estimated_rung: 6, confidence: "high", rationale: "SIGINT." },
        israel_perceives_iran: { estimated_rung: 7, confidence: "moderate", rationale: "Mossad." },
        russia_perceives_us: { estimated_rung: 10, confidence: "low", rationale: "Limited view." },
        china_perceives_us: { estimated_rung: 9, confidence: "low", rationale: "Observer." },
      },
      dyads: {
        us_iran: { highest_threshold_crossed: "thresh_overt_force", thresholds_intact: ["thresh_total_war"], escalation_asymmetry: 3, last_crossing_event_id: "evt_test" },
        israel_iran: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_israel: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_houthis: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        iran_houthis: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_hezbollah: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        iran_hezbollah: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_iraqi_militia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        iran_iraqi_militia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_russia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_china: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      },
      global_ceiling: 8,
      direction: "up",
    },
    ...overrides,
  }
}

function makeGapFill(): GapFillData {
  return {
    as_of_date: "2026-04-07",
    sources_summary: "Test sources.",
    asset_inventory: {
      united_states: { tomahawk: { estimated_remaining: 2800, unit: "missiles", confidence: "medium", notes: "" } },
    },
    depletion_rates: {
      united_states: { tomahawk: [{ rate_per_day: -45, effective_from: "2026-02-28", notes: "Strike rate" }] },
    },
    infrastructure_status: [],
    global_variable_timeline: [
      { date: "2026-02-28", oil_price_usd: 140, hormuz_throughput_pct: 90, global_economic_stress: 40, notes: "" },
    ],
    casualties: {},
    political_indicators: {
      us_approval_pct: 52, us_congressional_status: "No AUMF",
      iran_domestic_status: "Rally-around-flag", nato_cohesion: "Fractured",
      as_of_date: "2026-04-07",
    },
  }
}

function makeValidStateEffects(): EventStateEffects {
  return {
    event_id: "evt_20260228_op_epic_fury",
    timestamp: "2026-02-28",
    is_decision_revised: true,
    deciding_actor_revised: "united_states",
    actor_deltas: {
      united_states: { military_strength: -3, political_stability: -2, economic_health: -1, public_support: -5, international_standing: -8, rationale: "Day 1 strikes launched." },
      iran: { military_strength: -15, political_stability: -5, economic_health: -10, public_support: 8, international_standing: -3, rationale: "Significant strikes on infrastructure." },
      israel: { military_strength: -2, political_stability: 0, economic_health: -1, public_support: 2, international_standing: -4, rationale: "Participated in strikes." },
      russia: { military_strength: 0, political_stability: 0, economic_health: 3, public_support: 0, international_standing: 2, rationale: "Observer, oil price benefit." },
      china: { military_strength: 0, political_stability: 0, economic_health: -4, public_support: 0, international_standing: 0, rationale: "Oil import disruption." },
    },
    asset_changes: [
      { actor_id: "united_states", asset_type: "tomahawk", quantity_delta: -120, notes: "Day 1 strike package." },
      { actor_id: "iran", asset_type: "s300_battery", quantity_delta: -2, facility_id: "tehran_air_defense", new_status: "degraded", new_capacity_pct: 50, notes: "Two batteries destroyed." },
    ],
    global_updates: { oil_price_usd: 142, hormuz_throughput_pct: 88 },
    depletion_rate_changes: [],
    decision_nodes: [{ is_major_decision_node: true, label: "Operation Epic Fury", significance: "game_changing" }],
    confidence: "high",
  }
}

describe("buildBaselineDepletionPrompt", () => {
  it("includes actor IDs from gap-fill", () => {
    const prompt = buildBaselineDepletionPrompt(makeGapFill())
    expect(prompt).toContain("united_states")
  })

  it("includes depletion rate data from gap-fill", () => {
    const prompt = buildBaselineDepletionPrompt(makeGapFill())
    expect(prompt).toContain("tomahawk")
    expect(prompt).toContain("-45")
  })
})

describe("parseBaselineDepletionResponse", () => {
  it("parses valid baseline depletion rates", () => {
    const rates: Record<string, ActorDepletionRates> = {
      united_states: {
        tomahawk: [{ rate_per_day: -45, effective_from: "2026-02-28", notes: "Strike rate" }],
      },
    }
    const result = parseBaselineDepletionResponse(JSON.stringify(rates))
    expect(result["united_states"]["tomahawk"][0].rate_per_day).toBe(-45)
  })

  it("throws on invalid JSON", () => {
    expect(() => parseBaselineDepletionResponse("not json")).toThrow("not valid JSON")
  })
})

describe("buildStateEffectsPrompt", () => {
  it("includes event id and title", () => {
    const event = makeEnrichedEvent()
    const prompt = buildStateEffectsPrompt(event, { united_states: { tomahawk: 3880 } }, makeGapFill())
    expect(prompt).toContain("evt_20260228_op_epic_fury")
    expect(prompt).toContain("US Launches Operation Epic Fury")
  })

  it("includes current asset inventory", () => {
    const event = makeEnrichedEvent()
    const prompt = buildStateEffectsPrompt(event, { united_states: { tomahawk: 3880 } }, makeGapFill())
    expect(prompt).toContain("3880")
    expect(prompt).toContain("tomahawk")
  })

  it("includes decision classification criterion", () => {
    const event = makeEnrichedEvent()
    const prompt = buildStateEffectsPrompt(event, {}, makeGapFill())
    expect(prompt).toContain("deliberate choice")
    expect(prompt).toContain("strategic objective")
  })

  it("includes the situation from full_briefing", () => {
    const event = makeEnrichedEvent()
    const prompt = buildStateEffectsPrompt(event, {}, makeGapFill())
    expect(prompt).toContain("Coalition forces launched strikes across Iran.")
  })

  it("requests all required output fields", () => {
    const event = makeEnrichedEvent()
    const prompt = buildStateEffectsPrompt(event, {}, makeGapFill())
    expect(prompt).toContain("actor_deltas")
    expect(prompt).toContain("asset_changes")
    expect(prompt).toContain("global_updates")
    expect(prompt).toContain("decision_nodes")
    expect(prompt).toContain("is_decision_revised")
  })

  it("matches snapshot (change-control gate)", () => {
    const event = makeEnrichedEvent()
    const prompt = buildStateEffectsPrompt(event, { united_states: { tomahawk: 3880 } }, makeGapFill())
    expect(prompt).toMatchSnapshot()
  })
})

describe("parseStateEffectsResponse", () => {
  it("parses a valid state effects response", () => {
    const raw = JSON.stringify(makeValidStateEffects())
    const result = parseStateEffectsResponse(raw, "evt_test")
    expect(result.actor_deltas["united_states"].military_strength).toBe(-3)
    expect(result.asset_changes[0].quantity_delta).toBe(-120)
    expect(result.decision_nodes[0].significance).toBe("game_changing")
  })

  it("strips markdown fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(makeValidStateEffects()) + "\n```"
    expect(() => parseStateEffectsResponse(raw, "evt_test")).not.toThrow()
  })

  it("throws on invalid JSON", () => {
    expect(() => parseStateEffectsResponse("not json", "evt_test")).toThrow("not valid JSON")
  })

  it("throws when actor_deltas is missing", () => {
    const { actor_deltas: _omit, ...rest } = makeValidStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test"))
      .toThrow("missing field: actor_deltas")
  })

  it("throws when asset_changes is missing", () => {
    const { asset_changes: _omit, ...rest } = makeValidStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test"))
      .toThrow("missing field: asset_changes")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun run test -- --run tests/scripts/score-state-effects.test.ts
```

Expected: FAIL with "Cannot find module '../../scripts/score-state-effects'"

- [ ] **Step 3: Implement `scripts/score-state-effects.ts`**

```typescript
// scripts/score-state-effects.ts
// Phase 5b: AI pass to estimate state deltas, asset changes, and decision
// reclassification for every enriched event.
//
// Usage:
//   bun run scripts/score-state-effects.ts
//   bun run scripts/score-state-effects.ts --from=evt_id
//   bun run scripts/score-state-effects.ts --dry-run      # prints first 3, no write
//
// Reads:  data/iran-enriched.json
//         data/iran-gap-fill.json
// Writes: data/iran-state-effects.json (incrementally)

import Anthropic from "@anthropic-ai/sdk"
import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type {
  EnrichedEvent,
  GapFillData,
  EventStateEffects,
  StateEffectsFile,
  ActorDepletionRates,
} from "./pipeline/types"

interface EnrichedFile { _meta: Record<string, unknown>; events: EnrichedEvent[] }
interface StateEffectsOutput { _meta: Record<string, unknown>; baseline_depletion_rates: Record<string, ActorDepletionRates>; events: EventStateEffects[] }

export function buildBaselineDepletionPrompt(gapFill: GapFillData): string {
  return `Based on the following research data about the US-Iran conflict, extract the
baseline daily depletion rates for each actor's assets as of the start of active
hostilities (approximately 2026-02-28).

RESEARCH DATA (depletion rates section):
${JSON.stringify(gapFill.depletion_rates, null, 2)}

ASSET INVENTORY (for context):
${JSON.stringify(gapFill.asset_inventory, null, 2)}

Output ONLY a JSON object keyed by actor_id, then asset_type, then an array of
DepletionPeriod objects:
{
  "actor_id": {
    "asset_type": [
      { "rate_per_day": [negative number], "effective_from": "YYYY-MM-DD",
        "effective_to": "YYYY-MM-DD or omit", "notes": "..." }
    ]
  }
}

Output ONLY the JSON. No prose.`
}

export function parseBaselineDepletionResponse(raw: string): Record<string, ActorDepletionRates> {
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    const content = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim()
    return JSON.parse(content) as Record<string, ActorDepletionRates>
  } catch {
    throw new Error("Failed to parse baseline depletion response: not valid JSON")
  }
}

export function buildStateEffectsPrompt(
  event: EnrichedEvent,
  currentInventory: Record<string, Record<string, number>>,
  gapFill: GapFillData
): string {
  const inventorySummary = Object.entries(currentInventory)
    .map(([actor, assets]) =>
      `${actor}: ${Object.entries(assets).map(([k, v]) => `${k}=${v}`).join(", ")}`
    )
    .join("\n")

  // Find relevant gap-fill context for this event's date
  const relevantGlobal = gapFill.global_variable_timeline
    .filter(p => p.date <= event.timestamp)
    .at(-1)

  return `You are estimating the quantitative state effects of a single geopolitical event
on each actor's capability scores, asset inventory, infrastructure, and global variables.

DECISION CLASSIFICATION CRITERION:
A true decision point requires: (1) the actor's leadership made a DELIBERATE CHOICE,
(2) to advance a STRATEGIC OBJECTIVE, (3) with MEANINGFUL ALTERNATIVES available.
Resignations in protest, casualties, economic indicators, foreign statements, and
intelligence reports are NOT decision points regardless of significance.

EVENT:
ID: ${event.id}
Date: ${event.timestamp}
Title: ${event.title}
Description: ${event.description}
Actors involved: ${event.actors_involved.join(", ")}
Dimension: ${event.dimension}
Current is_decision: ${event.is_decision} (deciding_actor: ${event.deciding_actor ?? "none"})

What happened (from briefing):
${event.full_briefing.situation}

Decision taken (if any):
${event.decision_analysis.decision_summary ?? "Not a decision point"}

CURRENT ASSET INVENTORY (before this event):
${inventorySummary || "No prior inventory data"}

RESEARCH CONTEXT FOR THIS DATE RANGE:
Oil price: $${relevantGlobal?.oil_price_usd ?? "unknown"}/barrel
Hormuz throughput: ${relevantGlobal?.hormuz_throughput_pct ?? "unknown"}% of normal

Output ONLY a JSON object:
{
  "event_id": "${event.id}",
  "timestamp": "${event.timestamp}",
  "is_decision_revised": [true/false — apply the criterion above],
  "deciding_actor_revised": "actor_id or omit",
  "actor_deltas": {
    "united_states": { "military_strength": [-100 to +100], "political_stability": [...],
      "economic_health": [...], "public_support": [...], "international_standing": [...],
      "rationale": "One sentence." },
    "iran": { ... },
    "israel": { ... },
    "russia": { ... },
    "china": { ... }
  },
  "asset_changes": [
    { "actor_id": "...", "asset_type": "...", "quantity_delta": [number],
      "facility_id": "... or omit", "new_status": "operational|degraded|destroyed or omit",
      "new_capacity_pct": [0-100 or omit], "notes": "..." }
  ],
  "global_updates": { "oil_price_usd": [number or omit], "hormuz_throughput_pct": [number or omit],
    "global_economic_stress": [number or omit] },
  "depletion_rate_changes": [
    { "actor_id": "...", "asset_type": "...", "new_rate_per_day": [number], "reason": "..." }
  ],
  "decision_nodes": [
    { "is_major_decision_node": [true/false], "label": "Short label or omit",
      "significance": "minor|significant|pivotal|game_changing" }
  ],
  "confidence": "high|medium|low"
}

Output ONLY the JSON. No prose.`
}

export function parseStateEffectsResponse(raw: string, eventId: string): EventStateEffects {
  let parsed: unknown
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    const content = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse state effects for ${eventId}: not valid JSON`)
  }

  const res = parsed as Record<string, unknown>
  for (const field of ["actor_deltas", "asset_changes", "global_updates", "decision_nodes"]) {
    if (res[field] === undefined) {
      throw new Error(`State effects for ${eventId} missing field: ${field}`)
    }
  }

  return res as unknown as EventStateEffects
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const MAX_RETRIES = 6
  let delay = 15000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages
        .stream({ model: "claude-sonnet-4-6", max_tokens: 4096, messages: [{ role: "user", content: prompt }] })
        .finalText()
    } catch (err: unknown) {
      const msg = String(err)
      const isRetryable = msg.includes("overloaded") || msg.includes("529") ||
        msg.includes("rate_limit") || msg.includes("429") ||
        msg.includes("timed out") || msg.includes("timeout") ||
        msg.includes("ECONNRESET") || msg.includes("ECONNREFUSED") || msg.includes("socket")
      if (isRetryable && attempt < MAX_RETRIES) {
        console.log(`  [retry ${attempt}/${MAX_RETRIES - 1}] waiting ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
        delay = Math.min(delay * 2, 120000)
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith("--from="))?.split("=")[1]
  const dryRun = args.includes("--dry-run")

  const client = new Anthropic()
  const enrichedFile = await readJsonFile<EnrichedFile>("data/iran-enriched.json")
  const gapFill = await readJsonFile<GapFillData>("data/iran-gap-fill.json")

  // Load existing output for resumption
  let existing: StateEffectsOutput | null = null
  try { existing = await readJsonFile<StateEffectsOutput>("data/iran-state-effects.json") } catch { /* fresh */ }

  const alreadyDone = new Set(existing?.events.map(e => e.event_id) ?? [])
  const completedEvents: EventStateEffects[] = existing?.events ?? []

  let baselineRates = existing?.baseline_depletion_rates ?? null

  // Generate baseline depletion rates on first run
  if (!baselineRates) {
    console.log("Generating baseline depletion rates...")
    const baselinePrompt = buildBaselineDepletionPrompt(gapFill)
    const baselineRaw = await callClaude(client, baselinePrompt)
    baselineRates = parseBaselineDepletionResponse(baselineRaw)
    console.log(`✓ Baseline rates for: ${Object.keys(baselineRates).join(", ")}`)
  }

  const allEvents = enrichedFile.events
  const startIndex = fromEventId ? allEvents.findIndex(e => e.id === fromEventId) : 0
  const toProcess = allEvents
    .slice(startIndex < 0 ? 0 : startIndex)
    .filter(e => !alreadyDone.has(e.id))

  console.log(`Phase 5b: Scoring state effects for ${toProcess.length} events (${alreadyDone.size} done)\n`)

  // Build running inventory from already-completed events
  const currentInventory: Record<string, Record<string, number>> = {}
  for (const done of completedEvents) {
    for (const change of done.asset_changes) {
      if (!currentInventory[change.actor_id]) currentInventory[change.actor_id] = {}
      currentInventory[change.actor_id][change.asset_type] =
        (currentInventory[change.actor_id][change.asset_type] ?? 0) + change.quantity_delta
    }
  }

  const dryRunLimit = 3
  let processed = 0

  for (let i = 0; i < toProcess.length; i++) {
    const event = toProcess[i]

    if (dryRun && processed >= dryRunLimit) {
      console.log(`[dry-run] Stopping after ${dryRunLimit} events.`)
      break
    }

    console.log(`  [${i + 1}/${toProcess.length}] ${event.id}...`)

    const prompt = buildStateEffectsPrompt(event, currentInventory, gapFill)
    const raw = await callClaude(client, prompt)
    const effects = parseStateEffectsResponse(raw, event.id)

    if (dryRun) {
      console.log(JSON.stringify(effects, null, 2))
      processed++
      continue
    }

    // Update running inventory
    for (const change of effects.asset_changes) {
      if (!currentInventory[change.actor_id]) currentInventory[change.actor_id] = {}
      currentInventory[change.actor_id][change.asset_type] =
        Math.max(0, (currentInventory[change.actor_id][change.asset_type] ?? 0) + change.quantity_delta)
    }

    completedEvents.push(effects)

    await writeJsonFile("data/iran-state-effects.json", {
      _meta: { generated: new Date().toISOString(), events_processed: completedEvents.length },
      baseline_depletion_rates: baselineRates,
      events: completedEvents,
    } satisfies StateEffectsFile)

    processed++
  }

  if (!dryRun) {
    console.log(`\n✓ State effects complete: ${completedEvents.length} events in data/iran-state-effects.json`)
    console.log("Next: bun run scripts/compute-state-snapshots.ts")
  }
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
bun run test -- --run tests/scripts/score-state-effects.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Update snapshots**

```bash
bun run test -- --run tests/scripts/score-state-effects.test.ts -u
```

- [ ] **Step 6: Commit**

```bash
git add scripts/score-state-effects.ts tests/scripts/score-state-effects.test.ts
git commit -m "feat: add score-state-effects.ts — Phase 5b pipeline script"
```

---

## Task 4: `compute-state-snapshots.ts` (TDD)

**Files:**
- Create: `tests/scripts/compute-state-snapshots.test.ts`
- Create: `scripts/compute-state-snapshots.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/scripts/compute-state-snapshots.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  daysBetween,
  applyDailyDepletion,
  applyActorDeltas,
  buildInitialInventory,
  buildInitialFacilityStatuses,
} from "../../scripts/compute-state-snapshots"
import type { ActorStateDelta, GapFillData } from "../../scripts/pipeline/types"

function makeGapFill(): GapFillData {
  return {
    as_of_date: "2026-04-07",
    sources_summary: "Test.",
    asset_inventory: {
      united_states: {
        tomahawk: { estimated_remaining: 4000, unit: "missiles", confidence: "high", notes: "" },
        b2_bomber: { estimated_remaining: 20, unit: "aircraft", confidence: "high", notes: "" },
      },
      iran: {
        ballistic_missile: { estimated_remaining: 3000, unit: "missiles", confidence: "medium", notes: "" },
      },
    },
    depletion_rates: {},
    infrastructure_status: [
      {
        facility_id: "fordow",
        name: "Fordow Enrichment Facility",
        actor_id: "iran",
        facility_type: "nuclear",
        status: "operational",
        capacity_pct: 100,
        lat: 34.88,
        lng: 50.99,
        notes: "Pre-war.",
      },
    ],
    global_variable_timeline: [],
    casualties: {},
    political_indicators: {
      us_approval_pct: 52,
      us_congressional_status: "No AUMF",
      iran_domestic_status: "Stable",
      nato_cohesion: "United",
      as_of_date: "2026-02-01",
    },
  }
}

describe("daysBetween", () => {
  it("returns 0 for same date", () => {
    expect(daysBetween("2026-02-28", "2026-02-28")).toBe(0)
  })

  it("returns 1 for consecutive days", () => {
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1)
  })

  it("returns correct count across month boundary", () => {
    expect(daysBetween("2026-02-01", "2026-03-01")).toBe(28)
  })

  it("returns correct count for 30 days", () => {
    expect(daysBetween("2026-03-01", "2026-03-31")).toBe(30)
  })
})

describe("applyDailyDepletion", () => {
  it("reduces asset count by rate × days", () => {
    const inventory = { tomahawk: 4000 }
    const rates = { tomahawk: -45 }
    const result = applyDailyDepletion(inventory, rates, 10)
    expect(result.tomahawk).toBe(3550)
  })

  it("clamps to 0 — never goes negative", () => {
    const inventory = { tomahawk: 100 }
    const rates = { tomahawk: -45 }
    const result = applyDailyDepletion(inventory, rates, 10)
    expect(result.tomahawk).toBe(0)
  })

  it("leaves assets without a rate unchanged", () => {
    const inventory = { tomahawk: 4000, b2_bomber: 20 }
    const rates = { tomahawk: -45 }
    const result = applyDailyDepletion(inventory, rates, 5)
    expect(result.b2_bomber).toBe(20)
  })

  it("handles 0 days — no depletion", () => {
    const inventory = { tomahawk: 4000 }
    const rates = { tomahawk: -45 }
    const result = applyDailyDepletion(inventory, rates, 0)
    expect(result.tomahawk).toBe(4000)
  })

  it("does not mutate the input inventory", () => {
    const inventory = { tomahawk: 4000 }
    applyDailyDepletion(inventory, { tomahawk: -45 }, 5)
    expect(inventory.tomahawk).toBe(4000)
  })
})

describe("applyActorDeltas", () => {
  it("adds deltas to scores", () => {
    const scores = { military_strength: 80, political_stability: 70, economic_health: 65, public_support: 55, international_standing: 60 }
    const deltas: ActorStateDelta = { military_strength: -3, political_stability: -2, economic_health: -1, public_support: -5, international_standing: -8, rationale: "test" }
    const result = applyActorDeltas(scores, deltas)
    expect(result.military_strength).toBe(77)
    expect(result.public_support).toBe(50)
    expect(result.international_standing).toBe(52)
  })

  it("clamps scores to minimum 0", () => {
    const scores = { military_strength: 2, political_stability: 70, economic_health: 65, public_support: 55, international_standing: 60 }
    const deltas: ActorStateDelta = { military_strength: -10, political_stability: 0, economic_health: 0, public_support: 0, international_standing: 0, rationale: "test" }
    const result = applyActorDeltas(scores, deltas)
    expect(result.military_strength).toBe(0)
  })

  it("clamps scores to maximum 100", () => {
    const scores = { military_strength: 98, political_stability: 70, economic_health: 65, public_support: 55, international_standing: 60 }
    const deltas: ActorStateDelta = { military_strength: 5, political_stability: 0, economic_health: 0, public_support: 0, international_standing: 0, rationale: "test" }
    const result = applyActorDeltas(scores, deltas)
    expect(result.military_strength).toBe(100)
  })

  it("does not mutate input scores", () => {
    const scores = { military_strength: 80, political_stability: 70, economic_health: 65, public_support: 55, international_standing: 60 }
    const deltas: ActorStateDelta = { military_strength: -3, political_stability: 0, economic_health: 0, public_support: 0, international_standing: 0, rationale: "test" }
    applyActorDeltas(scores, deltas)
    expect(scores.military_strength).toBe(80)
  })
})

describe("buildInitialInventory", () => {
  it("builds inventory keyed by actor_id with asset counts", () => {
    const result = buildInitialInventory(makeGapFill())
    expect(result["united_states"]["tomahawk"]).toBe(4000)
    expect(result["united_states"]["b2_bomber"]).toBe(20)
    expect(result["iran"]["ballistic_missile"]).toBe(3000)
  })
})

describe("buildInitialFacilityStatuses", () => {
  it("returns facility statuses from gap-fill", () => {
    const result = buildInitialFacilityStatuses(makeGapFill())
    expect(result).toHaveLength(1)
    expect(result[0].facility_id).toBe("fordow")
    expect(result[0].status).toBe("operational")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun run test -- --run tests/scripts/compute-state-snapshots.test.ts
```

Expected: FAIL with "Cannot find module '../../scripts/compute-state-snapshots'"

- [ ] **Step 3: Implement `scripts/compute-state-snapshots.ts`**

```typescript
// scripts/compute-state-snapshots.ts
// Phase 5c: Pure computation — replays enriched events in order, applying daily
// depletion between events and event deltas at each event, to produce cumulative
// actor state snapshots. No API calls.
//
// Usage:
//   bun run scripts/compute-state-snapshots.ts
//
// Reads:  data/actor-profiles.json
//         data/iran-enriched.json
//         data/iran-state-effects.json
//         data/iran-gap-fill.json
// Writes: data/iran-state-snapshots.json

import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type {
  ActorProfile,
  EnrichedEvent,
  StateEffectsFile,
  GapFillData,
  ActorStateSnapshot,
  TurnStateSnapshot,
  StateSnapshotsFile,
  ActorStateDelta,
  FacilityStatus,
  ActorDepletionRates,
} from "./pipeline/types"

interface ActorScores {
  military_strength: number
  political_stability: number
  economic_health: number
  public_support: number
  international_standing: number
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(fromDate).getTime()
  const to = new Date(toDate).getTime()
  return Math.max(0, Math.round((to - from) / (1000 * 60 * 60 * 24)))
}

export function applyDailyDepletion(
  inventory: Record<string, number>,
  rates: Record<string, number>,
  days: number
): Record<string, number> {
  const result = { ...inventory }
  for (const [assetType, rate] of Object.entries(rates)) {
    if (result[assetType] !== undefined) {
      result[assetType] = Math.max(0, result[assetType] + rate * days)
    }
  }
  return result
}

export function applyActorDeltas(scores: ActorScores, deltas: ActorStateDelta): ActorScores {
  const clamp = (v: number) => Math.min(100, Math.max(0, v))
  return {
    military_strength: clamp(scores.military_strength + deltas.military_strength),
    political_stability: clamp(scores.political_stability + deltas.political_stability),
    economic_health: clamp(scores.economic_health + deltas.economic_health),
    public_support: clamp(scores.public_support + deltas.public_support),
    international_standing: clamp(scores.international_standing + deltas.international_standing),
  }
}

export function buildInitialInventory(gapFill: GapFillData): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const [actorId, assets] of Object.entries(gapFill.asset_inventory)) {
    result[actorId] = {}
    for (const [assetType, data] of Object.entries(assets)) {
      result[actorId][assetType] = data.estimated_remaining
    }
  }
  return result
}

export function buildInitialFacilityStatuses(gapFill: GapFillData): FacilityStatus[] {
  return gapFill.infrastructure_status.map(f => ({ ...f }))
}

// Get the active depletion rate for an actor/asset at a given date
function getActiveRates(
  actorId: string,
  allRates: Record<string, ActorDepletionRates>,
  asOfDate: string
): Record<string, number> {
  const actorRates = allRates[actorId]
  if (!actorRates) return {}

  const result: Record<string, number> = {}
  for (const [assetType, periods] of Object.entries(actorRates)) {
    const active = periods
      .filter(p => p.effective_from <= asOfDate && (!p.effective_to || p.effective_to > asOfDate))
      .at(-1)
    if (active) {
      result[assetType] = active.rate_per_day
    }
  }
  return result
}

async function main(): Promise<void> {
  const profiles = await readJsonFile<ActorProfile[]>("data/actor-profiles.json")
  const enrichedFile = await readJsonFile<{ events: EnrichedEvent[] }>("data/iran-enriched.json")
  const effectsFile = await readJsonFile<StateEffectsFile>("data/iran-state-effects.json")
  const gapFill = await readJsonFile<GapFillData>("data/iran-gap-fill.json")

  const effectsByEventId = new Map(effectsFile.events.map(e => [e.event_id, e]))

  // Build initial state from actor profiles
  const actorScores: Record<string, ActorScores> = {}
  for (const profile of profiles) {
    actorScores[profile.id] = {
      military_strength: profile.initial_scores.militaryStrength,
      political_stability: profile.initial_scores.politicalStability,
      economic_health: profile.initial_scores.economicHealth,
      public_support: profile.initial_scores.publicSupport,
      international_standing: profile.initial_scores.internationalStanding,
    }
  }

  // Build initial asset inventory and facilities from gap-fill
  const actorInventory = buildInitialInventory(gapFill)
  let facilityStatuses = buildInitialFacilityStatuses(gapFill)

  // Build initial depletion rates from baseline
  const allDepletionRates: Record<string, ActorDepletionRates> = { ...effectsFile.baseline_depletion_rates }

  // Seed global state from first gap-fill point
  const initialGlobal = gapFill.global_variable_timeline[0] ?? {
    oil_price_usd: 85, hormuz_throughput_pct: 100, global_economic_stress: 10
  }
  let globalState = {
    oil_price_usd: initialGlobal.oil_price_usd,
    hormuz_throughput_pct: initialGlobal.hormuz_throughput_pct,
    global_economic_stress: initialGlobal.global_economic_stress,
  }

  // Build initial snapshot record
  const initialState: Record<string, ActorStateSnapshot> = {}
  for (const profile of profiles) {
    initialState[profile.id] = {
      actor_id: profile.id,
      ...actorScores[profile.id],
      asset_inventory: { ...(actorInventory[profile.id] ?? {}) },
    }
  }

  const snapshots: TurnStateSnapshot[] = []
  let prevDate = enrichedFile.events[0]?.timestamp ?? "2026-02-06"

  console.log(`Computing snapshots for ${enrichedFile.events.length} events...`)

  for (const event of enrichedFile.events) {
    const effects = effectsByEventId.get(event.id)

    // 1. Apply daily depletion since last event
    const days = daysBetween(prevDate, event.timestamp)
    if (days > 0) {
      for (const actorId of Object.keys(actorInventory)) {
        const activeRates = getActiveRates(actorId, allDepletionRates, event.timestamp)
        actorInventory[actorId] = applyDailyDepletion(actorInventory[actorId] ?? {}, activeRates, days)
      }
    }

    // 2. Apply event deltas
    if (effects) {
      for (const [actorId, delta] of Object.entries(effects.actor_deltas)) {
        if (actorScores[actorId]) {
          actorScores[actorId] = applyActorDeltas(actorScores[actorId], delta)
        }
      }

      // 3. Apply asset changes
      for (const change of effects.asset_changes) {
        if (!actorInventory[change.actor_id]) actorInventory[change.actor_id] = {}
        actorInventory[change.actor_id][change.asset_type] = Math.max(
          0,
          (actorInventory[change.actor_id][change.asset_type] ?? 0) + change.quantity_delta
        )
        // Update facility status if specified
        if (change.facility_id && change.new_status) {
          facilityStatuses = facilityStatuses.map(f =>
            f.facility_id === change.facility_id
              ? { ...f, status: change.new_status!, capacity_pct: change.new_capacity_pct ?? f.capacity_pct }
              : f
          )
        }
      }

      // 4. Apply global updates
      if (effects.global_updates.oil_price_usd !== undefined) globalState.oil_price_usd = effects.global_updates.oil_price_usd
      if (effects.global_updates.hormuz_throughput_pct !== undefined) globalState.hormuz_throughput_pct = effects.global_updates.hormuz_throughput_pct
      if (effects.global_updates.global_economic_stress !== undefined) globalState.global_economic_stress = effects.global_updates.global_economic_stress

      // 5. Apply depletion rate changes
      for (const change of effects.depletion_rate_changes) {
        if (!allDepletionRates[change.actor_id]) allDepletionRates[change.actor_id] = {}
        if (!allDepletionRates[change.actor_id][change.asset_type]) allDepletionRates[change.actor_id][change.asset_type] = []
        // Close the previous period
        const existing = allDepletionRates[change.actor_id][change.asset_type]
        if (existing.length > 0 && !existing[existing.length - 1].effective_to) {
          existing[existing.length - 1].effective_to = event.timestamp
        }
        existing.push({ rate_per_day: change.new_rate_per_day, effective_from: event.timestamp, notes: change.reason })
      }
    }

    // 6. Record snapshot
    const actorStates: Record<string, ActorStateSnapshot> = {}
    for (const profile of profiles) {
      actorStates[profile.id] = {
        actor_id: profile.id,
        ...actorScores[profile.id],
        asset_inventory: { ...(actorInventory[profile.id] ?? {}) },
      }
    }

    snapshots.push({
      event_id: event.id,
      timestamp: event.timestamp,
      actor_states: actorStates,
      global_state: { ...globalState },
      facility_statuses: facilityStatuses.map(f => ({ ...f })),
      active_depletion_rates: JSON.parse(JSON.stringify(allDepletionRates)) as Record<string, ActorDepletionRates>,
    })

    prevDate = event.timestamp
  }

  const output: StateSnapshotsFile = {
    _meta: { generated: new Date().toISOString() },
    initial_state: initialState,
    snapshots,
  }

  await writeJsonFile("data/iran-state-snapshots.json", output)
  console.log(`✓ Written data/iran-state-snapshots.json (${snapshots.length} snapshots)`)
  console.log("Next: bun run scripts/seed-iran.ts")
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
bun run test -- --run tests/scripts/compute-state-snapshots.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/compute-state-snapshots.ts tests/scripts/compute-state-snapshots.test.ts
git commit -m "feat: add compute-state-snapshots.ts — Phase 5c pipeline script"
```

---

## Task 5: Update `seed-iran.ts`

**Files:**
- Modify: `scripts/seed-iran.ts`

Two changes: (1) fix the broken `escalation_rung_before/after` references (the old flat
escalation format no longer exists), (2) add seeding for the three new tables.

- [ ] **Step 1: Fix `buildTurnCommitInsert` — update escalation fields and add state columns**

Replace the existing `buildTurnCommitInsert` function (lines 112–144) with:

```typescript
export function buildTurnCommitInsert(
  event: EnrichedEvent,
  branchId: string,
  parentCommitId: string | null,
  turnNumber: number,
  stateEffects?: EventStateEffects
) {
  const nodeFlag = stateEffects?.decision_nodes?.[0]

  return {
    branch_id: branchId,
    parent_commit_id: parentCommitId,
    turn_number: turnNumber,
    simulated_date: event.timestamp,
    scenario_snapshot: {} as Record<string, unknown>,
    is_ground_truth: true,
    current_phase: 'complete' as const,
    narrative_entry: event.chronicle.headline,

    // Enriched content fields
    full_briefing: JSON.stringify(event.full_briefing),
    chronicle_headline: event.chronicle.headline,
    chronicle_entry: event.chronicle.entry,
    chronicle_date_label: event.chronicle.date_label,
    context_summary: event.context_summary,
    is_decision_point: stateEffects?.is_decision_revised ?? event.decision_analysis.is_decision_point,
    deciding_actor_id: stateEffects?.deciding_actor_revised ?? event.decision_analysis.deciding_actor_id ?? null,
    decision_summary: event.decision_analysis.decision_summary ?? null,
    decision_alternatives: event.decision_analysis.alternatives
      ? (event.decision_analysis.alternatives as unknown as Record<string, unknown>[])
      : null,
    // Escalation — use global_ceiling from new three-layer structure
    escalation_rung_before: event.escalation.global_ceiling,
    escalation_rung_after: event.escalation.global_ceiling,
    escalation_direction: event.escalation.direction,
    // State tracking fields
    state_effects: stateEffects ? (stateEffects as unknown as Record<string, unknown>) : null,
    is_major_decision_node: nodeFlag?.is_major_decision_node ?? false,
    decision_node_label: nodeFlag?.label ?? null,
    decision_node_significance: nodeFlag?.significance ?? null,
  }
}
```

Add the import at the top of the file (after the existing imports):

```typescript
import type { EventStateEffects, StateSnapshotsFile, StateEffectsFile, GapFillData } from './pipeline/types'
```

- [ ] **Step 2: Add `buildStateSnapshotInsert`, `buildDepletionRateInsert`, and threshold trigger constants**

Add after `buildTurnCommitInsert`:

```typescript
export function buildStateSnapshotInsert(
  scenarioId: string,
  branchId: string,
  turnCommitId: string,
  actorId: string,
  snapshot: import('./pipeline/types').ActorStateSnapshot,
  globalState: { oil_price_usd: number; hormuz_throughput_pct: number; global_economic_stress: number },
  facilityStatuses: import('./pipeline/types').FacilityStatus[]
) {
  return {
    scenario_id: scenarioId,
    branch_id: branchId,
    turn_commit_id: turnCommitId,
    actor_id: actorId,
    military_strength: snapshot.military_strength,
    political_stability: snapshot.political_stability,
    economic_health: snapshot.economic_health,
    public_support: snapshot.public_support,
    international_standing: snapshot.international_standing,
    asset_inventory: snapshot.asset_inventory as unknown as Record<string, unknown>,
    global_state: globalState as unknown as Record<string, unknown>,
    facility_statuses: facilityStatuses as unknown as Record<string, unknown>[],
  }
}

export function buildDepletionRateInsert(
  scenarioId: string,
  branchId: string,
  actorId: string,
  assetType: string,
  period: import('./pipeline/types').DepletionPeriod
) {
  return {
    scenario_id: scenarioId,
    branch_id: branchId,
    actor_id: actorId,
    asset_type: assetType,
    rate_per_day: period.rate_per_day,
    effective_from_date: period.effective_from,
    effective_to_date: period.effective_to ?? null,
    notes: period.notes,
  }
}

const THRESHOLD_TRIGGER_TEMPLATES = [
  {
    trigger_id: "us_interceptors_critical",
    actor_id: "united_states",
    variable_path: "asset_inventory.interceptors_total_pct",
    threshold_value: 0.20,
    direction: "below" as const,
    sustained_days: 0,
    forced_event_template: {
      title: "Congress Debates Emergency Interceptor Resupply",
      dimension: "political",
      description: "US interceptor stockpiles fall below 20% of pre-war levels, triggering emergency DoD request to Congress.",
    },
  },
  {
    trigger_id: "oil_price_crisis",
    actor_id: null,
    variable_path: "global.oil_price_usd",
    threshold_value: 200,
    direction: "above" as const,
    sustained_days: 7,
    forced_event_template: {
      title: "IEA Emergency Summit — Oil at $200+",
      dimension: "economic",
      description: "Oil sustains above $200/barrel for seven days, triggering IEA emergency meeting and G7 economic response.",
    },
  },
  {
    trigger_id: "us_public_support_floor",
    actor_id: "united_states",
    variable_path: "public_support",
    threshold_value: 35,
    direction: "below" as const,
    sustained_days: 0,
    forced_event_template: {
      title: "Congressional War Powers Challenge Filed",
      dimension: "political",
      description: "US public support falls below 35%, prompting bipartisan challenge to war powers authorization.",
    },
  },
  {
    trigger_id: "iran_civilian_casualties_threshold",
    actor_id: "iran",
    variable_path: "asset_inventory.civilian_casualties",
    threshold_value: 50000,
    direction: "above" as const,
    sustained_days: 0,
    forced_event_template: {
      title: "ICC Opens Preliminary Investigation",
      dimension: "diplomatic",
      description: "Iranian civilian casualties exceed 50,000, triggering ICC preliminary investigation.",
    },
  },
  {
    trigger_id: "hormuz_near_closure",
    actor_id: null,
    variable_path: "global.hormuz_throughput_pct",
    threshold_value: 20,
    direction: "below" as const,
    sustained_days: 3,
    forced_event_template: {
      title: "Global Oil Emergency Declared",
      dimension: "economic",
      description: "Strait of Hormuz throughput below 20% for three consecutive days.",
    },
  },
  {
    trigger_id: "israel_interceptors_critical",
    actor_id: "israel",
    variable_path: "asset_inventory.interceptors_total_pct",
    threshold_value: 0.15,
    direction: "below" as const,
    sustained_days: 0,
    forced_event_template: {
      title: "Israel Requests Emergency US Interceptor Transfer",
      dimension: "military",
      description: "Israeli interceptor stocks fall below 15%.",
    },
  },
]
```

- [ ] **Step 3: Load state data files in `seedIranScenario` and wire into turn commit seeding**

In `seedIranScenario`, after loading the existing files, add:

```typescript
// Load Phase 5 state tracking outputs (optional — graceful if not yet run)
let stateEffectsFile: StateEffectsFile | null = null
let snapshotsFile: StateSnapshotsFile | null = null
try {
  stateEffectsFile = await readJsonFile<StateEffectsFile>('data/iran-state-effects.json')
  snapshotsFile = await readJsonFile<StateSnapshotsFile>('data/iran-state-snapshots.json')
  console.log(`✓ Loaded state effects (${stateEffectsFile.events.length} events) and snapshots`)
} catch {
  console.warn('  ⚠ State tracking files not found — seeding without state data (run Phase 5 scripts first)')
}

const effectsByEventId = new Map(stateEffectsFile?.events.map(e => [e.event_id, e]) ?? [])
const snapshotByEventId = new Map(snapshotsFile?.snapshots.map(s => [s.event_id, s]) ?? [])
```

- [ ] **Step 4: Pass state effects into `buildTurnCommitInsert` and seed state snapshots after each commit**

Replace the turn commit seeding loop with:

```typescript
// Seed turn commits
console.log(`\nSeeding ${eventsToSeed.length} enriched events as turn commits...`)
const commitIdByEventId = new Map<string, string>()

for (const event of eventsToSeed) {
  const stateEffects = effectsByEventId.get(event.id)
  const insert = buildTurnCommitInsert(event, branchId, parentCommitId, turnNumber, stateEffects)
  const { data: commit, error } = await supabase
    .from('turn_commits')
    .insert(insert)
    .select('id')
    .single()

  if (error || !commit) {
    throw new Error(`Failed to create commit for ${event.id}: ${error?.message}`)
  }

  commitIdByEventId.set(event.id, commit.id)
  parentCommitId = commit.id
  turnNumber++
  console.log(`  ✓ [${turnNumber - 1}] ${event.id}`)
}

// Seed actor state snapshots
if (snapshotsFile) {
  console.log('\nSeeding actor state snapshots...')
  for (const snapshot of snapshotsFile.snapshots) {
    const commitId = commitIdByEventId.get(snapshot.event_id)
    if (!commitId) continue

    for (const [actorId, actorState] of Object.entries(snapshot.actor_states)) {
      const { error } = await supabase
        .from('actor_state_snapshots')
        .insert(buildStateSnapshotInsert(
          scenarioId, branchId, commitId, actorId,
          actorState, snapshot.global_state, snapshot.facility_statuses
        ))
      if (error) console.warn(`  ⚠ State snapshot failed (${actorId} / ${snapshot.event_id}): ${error.message}`)
    }
  }
  console.log(`✓ Seeded state snapshots for ${snapshotsFile.snapshots.length} events`)

  // Seed depletion rates
  console.log('Seeding depletion rates...')
  for (const [actorId, assetRates] of Object.entries(stateEffectsFile!.baseline_depletion_rates)) {
    for (const [assetType, periods] of Object.entries(assetRates)) {
      for (const period of periods) {
        const { error } = await supabase
          .from('daily_depletion_rates')
          .insert(buildDepletionRateInsert(scenarioId, branchId, actorId, assetType, period))
        if (error) console.warn(`  ⚠ Depletion rate failed (${actorId}/${assetType}): ${error.message}`)
      }
    }
  }
  console.log('✓ Seeded depletion rates')
}

// Seed threshold triggers
console.log('Seeding threshold triggers...')
for (const template of THRESHOLD_TRIGGER_TEMPLATES) {
  const { error } = await supabase.from('threshold_triggers').insert({
    scenario_id: scenarioId,
    branch_id: branchId,
    ...template,
    forced_event_template: template.forced_event_template as unknown as Record<string, unknown>,
  })
  if (error) console.warn(`  ⚠ Threshold trigger failed (${template.trigger_id}): ${error.message}`)
}
console.log(`✓ Seeded ${THRESHOLD_TRIGGER_TEMPLATES.length} threshold triggers`)
```

- [ ] **Step 5: Run all tests to confirm nothing is broken**

```bash
bun run test -- --run tests/scripts/
```

Expected: all tests pass across all script tests

- [ ] **Step 6: Run typecheck**

```bash
bun run typecheck
```

Expected: no type errors

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-iran.ts
git commit -m "feat: update seed-iran.ts — state snapshots, depletion rates, threshold triggers"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
bun run test -- --run
```

Expected: all tests pass

- [ ] **Verify pipeline can run end-to-end (dry-run)**

```bash
# Only if research results file exists:
bun run scripts/parse-gap-fill.ts --dry-run
# After running parse-gap-fill for real:
bun run scripts/score-state-effects.ts --dry-run
bun run scripts/compute-state-snapshots.ts
bun run scripts/seed-iran.ts --dry-run
```

- [ ] **Final commit if any cleanup needed, then open PR**

```bash
git push origin feat/iran-seed-comprehensive
gh pr create --title "feat: actor state effects pipeline (Phase 5)" --body "$(cat <<'EOF'
## Summary
- Adds quantitative state tracking to the Iran scenario pipeline
- New types: GapFillData, StateEffectsFile, EventStateEffects, TurnStateSnapshot
- New scripts: parse-gap-fill.ts, score-state-effects.ts, compute-state-snapshots.ts
- Updated seed-iran.ts: seeds actor_state_snapshots, daily_depletion_rates, threshold_triggers
- New Supabase migration: 20260407000000_state_tracking.sql

## Test Plan
- [ ] All existing tests pass (bun run test -- --run)
- [ ] bun run typecheck passes
- [ ] parse-gap-fill.ts --dry-run succeeds (requires research-gap-fill-results.md)
- [ ] seed-iran.ts --dry-run succeeds

Closes #[issue]
EOF
)"
```
