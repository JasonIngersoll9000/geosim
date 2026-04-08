# Comprehensive Iran Scenario Seed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse 20-event Iran seed with a fully enriched, paragraph-depth simulation covering all actors, national capabilities, key figure profiles, decision point identification, context chains, and chronicle entries — so a player loading at any turn gets a complete account of the situation.

**Architecture:** Four-phase pipeline (extract → user research → generate profiles → enrich), all intermediate output stored in local `data/` JSON files (gitignored), with a final seed script that drops the existing scenario data and repopulates all new tables. Branching from ground truth uses pre-seeded `decision_alternatives`; branching from a player branch generates decisions dynamically via the actor agent.

**Tech Stack:** TypeScript (strict), Bun runtime, `@anthropic-ai/sdk`, Supabase service client (`lib/supabase/service`), Vitest (node environment), `// @vitest-environment node` required on all test files.

**PREREQUISITE — Phase 2 research calls:** Before running Tasks 5–8, the user must complete all 9 research calls in `docs/Iran Research/research-prompts.md` and save the outputs to `data/`. Tasks 1–4 (migration, types, utils) can be completed immediately.

---

## File Structure

```
supabase/migrations/
  20260402000000_comprehensive_seed_schema.sql   NEW — actors, key_figures, actor_capabilities tables; alter turn_commits + scenarios

lib/types/
  database.ts                                    MODIFY — add ActorTableRow, KeyFigureRow, ActorCapabilityRow; extend TurnCommitRow, ScenarioRow
  simulation.ts                                  MODIFY — extend Actor with static identity fields; add ActorCapability; update KeyFigure

scripts/
  pipeline/
    types.ts                                     NEW — TimelineEvent, EnrichedEvent, ActorProfile, KeyFigureProfile, RawCapability
    utils.ts                                     NEW — mergeEvents, deduplicateEvents, buildContextChain, slugifyEventId
  extract-timeline.ts                            NEW — Phase 1: reads research docs, calls Claude, outputs data/iran-timeline-raw.json
  generate-profiles.ts                           NEW — Phase 3: reads capabilities JSON, calls Claude per actor/figure, outputs data/actor-profiles.json + data/key-figures.json
  enrich-timeline.ts                             NEW — Phase 4: enriches each event with briefing, chronicle, context chain; outputs data/iran-enriched.json
  seed-iran.ts                                   MODIFY — drop/reseed; populate actors, key_figures, actor_capabilities, enriched turn_commits

data/                                            GITIGNORED — intermediate JSON pipeline artifacts
  capabilities-us.json
  capabilities-iran.json
  capabilities-israel.json
  capabilities-russia-china.json
  capabilities-gulf-states.json
  relationship-netanyahu-trump.json
  relationship-iran-russia.json
  relationship-iran-china.json
  relationship-us-gulf-states.json
  iran-timeline-raw.json                         Phase 1 output / human review input
  actor-profiles.json                            Phase 3 output
  key-figures.json                               Phase 3 output
  iran-enriched.json                             Phase 4 output / seed-iran.ts input

tests/
  scripts/
    pipeline-utils.test.ts                       NEW — mergeEvents, deduplicateEvents, buildContextChain, slugifyEventId
    extract-timeline.test.ts                     NEW — extractionPrompt, parseExtractionResponse
    generate-profiles.test.ts                    NEW — actorPrompt, parseActorProfileResponse
    enrich-timeline.test.ts                      NEW — enrichmentPrompt, parseEnrichedResponse, buildContextChainString
```

---

## Task 1: Branch setup and gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Create the feature branch**

```bash
cd /mnt/c/Users/Jason\ Ingersoll/dev/GeoSim
git checkout -b feat/iran-seed-comprehensive
```

- [ ] **Step 2: Add `data/` to .gitignore**

Open `.gitignore` and add these lines at the end:

```
# Iran seed pipeline — intermediate JSON artifacts (gitignored, pushed to Supabase instead)
/data/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: create feat/iran-seed-comprehensive branch, gitignore data/"
```

---

## Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260402000000_comprehensive_seed_schema.sql`

**Context:** Never modify previously committed migrations. This file only adds new tables and new columns. The existing `turn_commits` and `scenarios` tables are altered with `ADD COLUMN IF NOT EXISTS` so re-running is safe.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260402000000_comprehensive_seed_schema.sql
-- Comprehensive Iran seed schema: new tables + column additions
-- NEVER modify previously committed migrations — only additive changes here.

-- ─────────────────────────────────────────────────────────────────────────────
-- New table: actors
-- Actors previously lived as JSONB inside turn_commits.scenario_snapshot.
-- This gives them proper rows so they are queryable and displayable independently.
-- Static identity columns (biographical_summary, leadership_profile, etc.) are
-- prime candidates for Anthropic prompt caching — they never change.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists actors (
  id                    text        not null,
  scenario_id           uuid        not null references scenarios(id) on delete cascade,
  name                  text        not null,
  short_name            text        not null,

  -- Static identity layer (cacheable as AI system prompt prefix — never changes per branch)
  biographical_summary  text        not null,
  leadership_profile    text        not null,
  win_condition         text        not null,
  strategic_doctrine    text        not null,
  historical_precedents text        not null,

  -- Initial dynamic state (seeded here; changes per turn via scenario_snapshot)
  initial_scores        jsonb       not null default '{}',
  intelligence_profile  jsonb       not null default '{}',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  primary key (id, scenario_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- New table: key_figures
-- Individual decision-makers with full biographical profiles, motivations, and
-- relationship models (including the Netanyahu-Trump asymmetric influence dynamic).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists key_figures (
  id               text        not null,
  scenario_id      uuid        not null references scenarios(id) on delete cascade,
  actor_id         text        not null,

  name             text        not null,
  title            text        not null,
  role             text        not null,

  -- All text fields are full paragraphs — never one-liners
  biography        text        not null,
  motivations      text        not null,
  decision_style   text        not null,
  current_context  text        not null,

  -- Inter-figure relationships (JSONB: [{figureId, actorId, influence_direction,
  --   dynamic, documented_instances[], override_condition?}])
  relationships    jsonb,

  provenance       text        not null default 'inferred',
  source_note      text,
  source_date      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  primary key (id, scenario_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- New table: actor_capabilities
-- Full national capabilities inventory — everything an actor can mobilize beyond
-- what is already in asset_registry (which covers theater-positioned assets only).
-- Answers "what cards does Trump hold that he hasn't played yet."
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists actor_capabilities (
  id                uuid        primary key default gen_random_uuid(),
  scenario_id       uuid        not null references scenarios(id) on delete cascade,
  actor_id          text        not null,

  category          text        not null check (category in ('military', 'diplomatic', 'economic', 'intelligence')),
  name              text        not null,
  description       text        not null,
  quantity          numeric,
  unit              text,

  deployment_status text        not null default 'available'
                                check (deployment_status in ('available', 'partially_deployed', 'degraded')),
  lead_time_days    int,
  political_cost    text,
  temporal_anchor   text        not null default 'January 2026',
  source_url        text,
  source_date       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists actor_capabilities_scenario_actor
  on actor_capabilities (scenario_id, actor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend turn_commits
-- ─────────────────────────────────────────────────────────────────────────────
alter table turn_commits
  add column if not exists full_briefing          text,
  add column if not exists chronicle_headline     text,
  add column if not exists chronicle_entry        text,
  add column if not exists chronicle_date_label   text,
  add column if not exists context_summary        text,
  add column if not exists is_decision_point      boolean not null default false,
  add column if not exists deciding_actor_id      text,
  add column if not exists decision_summary       text,
  add column if not exists decision_alternatives  jsonb,
  add column if not exists escalation_rung_before int,
  add column if not exists escalation_rung_after  int,
  add column if not exists escalation_direction   text
                           check (escalation_direction in ('up', 'down', 'lateral', 'none'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend scenarios
-- ─────────────────────────────────────────────────────────────────────────────
alter table scenarios
  add column if not exists background_context_enriched text,
  add column if not exists scenario_start_date         text,
  add column if not exists ground_truth_through_date   text;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260402000000_comprehensive_seed_schema.sql
git commit -m "feat: add comprehensive seed schema migration (actors, key_figures, actor_capabilities)"
```

---

## Task 3: TypeScript types

**Files:**
- Modify: `lib/types/database.ts`
- Modify: `lib/types/simulation.ts`
- Create: `tests/scripts/pipeline-utils.test.ts` (type shape verification)

**Context:** The existing `database.ts` uses Row/Insert/Update pattern. `TurnCommitRow` and `ScenarioRow` types must be extended to include the new columns. Do NOT rename or remove existing fields — only add. Check for an existing `ActorRow` in `database.ts`; if one exists, add the new table's type as `ActorTableRow` to avoid collision.

- [ ] **Step 1: Write type shape tests first**

```typescript
// tests/scripts/pipeline-utils.test.ts
// @vitest-environment node
import { describe, it, expectTypeOf } from 'vitest'
import type { ActorTableRow, KeyFigureRow, ActorCapabilityRow } from '../../lib/types/database'

describe('database type shapes', () => {
  it('ActorTableRow has required static identity fields', () => {
    expectTypeOf<ActorTableRow>().toHaveProperty('biographical_summary')
    expectTypeOf<ActorTableRow>().toHaveProperty('leadership_profile')
    expectTypeOf<ActorTableRow>().toHaveProperty('win_condition')
    expectTypeOf<ActorTableRow>().toHaveProperty('strategic_doctrine')
    expectTypeOf<ActorTableRow>().toHaveProperty('historical_precedents')
    expectTypeOf<ActorTableRow['initial_scores']>().toEqualTypeOf<Record<string, unknown>>()
  })

  it('KeyFigureRow has all paragraph-depth fields', () => {
    expectTypeOf<KeyFigureRow>().toHaveProperty('biography')
    expectTypeOf<KeyFigureRow>().toHaveProperty('motivations')
    expectTypeOf<KeyFigureRow>().toHaveProperty('decision_style')
    expectTypeOf<KeyFigureRow>().toHaveProperty('current_context')
    expectTypeOf<KeyFigureRow['relationships']>().toEqualTypeOf<Record<string, unknown> | null>()
  })

  it('ActorCapabilityRow has temporal_anchor', () => {
    expectTypeOf<ActorCapabilityRow>().toHaveProperty('temporal_anchor')
    expectTypeOf<ActorCapabilityRow>().toHaveProperty('deployment_status')
    expectTypeOf<ActorCapabilityRow['quantity']>().toEqualTypeOf<number | null>()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /mnt/c/Users/Jason\ Ingersoll/dev/GeoSim
node_modules/.bin/vitest run tests/scripts/pipeline-utils.test.ts
```

Expected: FAIL — `ActorTableRow`, `KeyFigureRow`, `ActorCapabilityRow` not found.

- [ ] **Step 3: Add new Row types to `lib/types/database.ts`**

Open `lib/types/database.ts`. At the end of the Row types section (after all existing `Row` types), add:

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive seed tables
// ─────────────────────────────────────────────────────────────────────────────

export interface ActorTableRow {
  id: string
  scenario_id: string
  name: string
  short_name: string
  biographical_summary: string
  leadership_profile: string
  win_condition: string
  strategic_doctrine: string
  historical_precedents: string
  initial_scores: Record<string, unknown>
  intelligence_profile: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface KeyFigureRow {
  id: string
  scenario_id: string
  actor_id: string
  name: string
  title: string
  role: string
  biography: string
  motivations: string
  decision_style: string
  current_context: string
  relationships: Record<string, unknown> | null
  provenance: string
  source_note: string | null
  source_date: string | null
  created_at: string
  updated_at: string
}

export interface ActorCapabilityRow {
  id: string
  scenario_id: string
  actor_id: string
  category: 'military' | 'diplomatic' | 'economic' | 'intelligence'
  name: string
  description: string
  quantity: number | null
  unit: string | null
  deployment_status: 'available' | 'partially_deployed' | 'degraded'
  lead_time_days: number | null
  political_cost: string | null
  temporal_anchor: string
  source_url: string | null
  source_date: string | null
  created_at: string
  updated_at: string
}
```

Then in the Insert types section, add:

```typescript
export type ActorTableInsert = Omit<ActorTableRow, 'created_at' | 'updated_at'> &
  Partial<Pick<ActorTableRow, 'created_at' | 'updated_at'>>

export type KeyFigureInsert = Omit<KeyFigureRow, 'created_at' | 'updated_at'> &
  Partial<Pick<KeyFigureRow, 'created_at' | 'updated_at'>>

export type ActorCapabilityInsert = Omit<ActorCapabilityRow, 'id' | 'created_at' | 'updated_at'> &
  Partial<Pick<ActorCapabilityRow, 'id' | 'created_at' | 'updated_at'>>
```

Then in the Update types section, add:

```typescript
export type ActorTableUpdate = Partial<Omit<ActorTableRow, 'id' | 'scenario_id'>> & { id: string; scenario_id: string }
export type KeyFigureUpdate = Partial<Omit<KeyFigureRow, 'id' | 'scenario_id'>> & { id: string; scenario_id: string }
export type ActorCapabilityUpdate = Partial<Omit<ActorCapabilityRow, 'id'>> & { id: string }
```

- [ ] **Step 4: Extend `TurnCommitRow` in `lib/types/database.ts`**

Find the existing `TurnCommitRow` interface and add these fields at the end, before the closing brace:

```typescript
  // Enriched content fields (populated by enrich-timeline.ts pipeline)
  full_briefing: string | null
  chronicle_headline: string | null
  chronicle_entry: string | null
  chronicle_date_label: string | null
  context_summary: string | null
  is_decision_point: boolean
  deciding_actor_id: string | null
  decision_summary: string | null
  decision_alternatives: Record<string, unknown> | null
  escalation_rung_before: number | null
  escalation_rung_after: number | null
  escalation_direction: 'up' | 'down' | 'lateral' | 'none' | null
```

- [ ] **Step 5: Extend `ScenarioRow` in `lib/types/database.ts`**

Find the existing `ScenarioRow` interface and add at the end:

```typescript
  background_context_enriched: string | null
  scenario_start_date: string | null
  ground_truth_through_date: string | null
```

- [ ] **Step 6: Add `ActorCapability` to `lib/types/simulation.ts`**

Open `lib/types/simulation.ts`. After the existing type definitions (do not modify any existing types), add:

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Actor capabilities — national inventory available for mobilization.
// Distinct from asset_registry (theater-positioned assets).
// ─────────────────────────────────────────────────────────────────────────────
export interface ActorCapability {
  id?: string
  scenarioId: string
  actorId: string
  category: 'military' | 'diplomatic' | 'economic' | 'intelligence'
  name: string
  description: string
  quantity?: number
  unit?: string
  deploymentStatus: 'available' | 'partially_deployed' | 'degraded'
  leadTimeDays?: number
  politicalCost?: string
  temporalAnchor: string
  sourceUrl?: string
  sourceDate?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// DecisionAlternative — pre-seeded alternate paths at ground truth decision points.
// Used when branching from ground truth (not generated dynamically).
// ─────────────────────────────────────────────────────────────────────────────
export interface DecisionAlternative {
  label: string
  description: string
  escalationDirection: 'up' | 'down' | 'lateral' | 'none'
  escalationLevel: number
  whyNotChosen: string
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
node_modules/.bin/vitest run tests/scripts/pipeline-utils.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 8: Run typecheck**

```bash
bun run typecheck
```

Expected: no errors on the new type definitions.

- [ ] **Step 9: Commit**

```bash
git add lib/types/database.ts lib/types/simulation.ts tests/scripts/pipeline-utils.test.ts
git commit -m "feat: add ActorTableRow, KeyFigureRow, ActorCapabilityRow types; extend TurnCommitRow + ScenarioRow"
```

---

## Task 4: Pipeline shared types and utilities

**Files:**
- Create: `scripts/pipeline/types.ts`
- Create: `scripts/pipeline/utils.ts`
- Modify: `tests/scripts/pipeline-utils.test.ts` (add utility function tests)

**Context:** All three pipeline scripts (`extract-timeline`, `generate-profiles`, `enrich-timeline`) share these types and utilities. Keeping them in `scripts/pipeline/` avoids duplication and makes the scripts easier to read.

- [ ] **Step 1: Add utility function tests to the existing test file**

Open `tests/scripts/pipeline-utils.test.ts` and add these tests after the existing type shape tests:

```typescript
import { describe, it, expect } from 'vitest'
import {
  slugifyEventId,
  mergeEvents,
  deduplicateEvents,
  buildContextChainString,
} from '../../scripts/pipeline/utils'
import type { TimelineEvent } from '../../scripts/pipeline/types'

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'evt_test_001',
    timestamp: '2026-02-28',
    timestamp_confidence: 'exact',
    title: 'Test Event',
    description: 'A test event description.',
    actors_involved: ['united_states'],
    dimension: 'military',
    is_decision: false,
    escalation_direction: 'none',
    source_excerpt: 'Source text.',
    ...overrides,
  }
}

describe('slugifyEventId', () => {
  it('generates a stable id from timestamp and title', () => {
    const event = makeEvent({ timestamp: '2026-02-28', title: 'Operation Epic Fury Authorized' })
    expect(slugifyEventId(event)).toBe('evt_20260228_operation_epic_fury_authorized')
  })

  it('lowercases and replaces spaces with underscores', () => {
    const event = makeEvent({ timestamp: '2026-03-01', title: 'Iran Fires Ballistic Missiles' })
    expect(slugifyEventId(event)).toBe('evt_20260301_iran_fires_ballistic_missiles')
  })

  it('strips non-alphanumeric characters', () => {
    const event = makeEvent({ timestamp: '2026-03-05', title: 'US/Israel Strike: Phase 2' })
    expect(slugifyEventId(event)).toBe('evt_20260305_usisrael_strike_phase_2')
  })
})

describe('mergeEvents', () => {
  it('merges two arrays into one sorted by timestamp', () => {
    const a = [makeEvent({ timestamp: '2026-03-01', id: 'a1' })]
    const b = [makeEvent({ timestamp: '2026-02-28', id: 'b1' })]
    const merged = mergeEvents([a, b])
    expect(merged[0].id).toBe('b1')
    expect(merged[1].id).toBe('a1')
  })

  it('handles empty arrays', () => {
    expect(mergeEvents([[], []])).toHaveLength(0)
  })

  it('preserves all events when no overlaps', () => {
    const a = [makeEvent({ id: 'a1' }), makeEvent({ id: 'a2' })]
    const b = [makeEvent({ id: 'b1' })]
    expect(mergeEvents([a, b])).toHaveLength(3)
  })
})

describe('deduplicateEvents', () => {
  it('flags events with identical ids as duplicates', () => {
    const events = [
      makeEvent({ id: 'evt_001', title: 'Event A' }),
      makeEvent({ id: 'evt_001', title: 'Event A duplicate' }),
      makeEvent({ id: 'evt_002', title: 'Event B' }),
    ]
    const result = deduplicateEvents(events)
    expect(result.events).toHaveLength(3) // all kept, duplicates flagged not removed
    expect(result.duplicates).toHaveLength(1)
    expect(result.duplicates[0].ids).toContain('evt_001')
  })

  it('flags same-timestamp same-title events even with different ids', () => {
    const events = [
      makeEvent({ id: 'evt_001', timestamp: '2026-02-28', title: 'US Launches Strikes' }),
      makeEvent({ id: 'evt_002', timestamp: '2026-02-28', title: 'US Launches Strikes' }),
    ]
    const result = deduplicateEvents(events)
    expect(result.duplicates).toHaveLength(1)
  })

  it('does not flag different events on same day', () => {
    const events = [
      makeEvent({ id: 'evt_001', timestamp: '2026-02-28', title: 'US Launches Strikes' }),
      makeEvent({ id: 'evt_002', timestamp: '2026-02-28', title: 'Israel Launches Strikes' }),
    ]
    const result = deduplicateEvents(events)
    expect(result.duplicates).toHaveLength(0)
  })
})

describe('buildContextChainString', () => {
  it('includes background, summaries, and last briefing', () => {
    const background = 'Background context paragraph.'
    const summaries = ['Turn 1 summary.', 'Turn 2 summary.']
    const lastBriefing = 'Full turn 3 briefing.'
    const result = buildContextChainString(background, summaries, lastBriefing)
    expect(result).toContain('Background context paragraph.')
    expect(result).toContain('Turn 1 summary.')
    expect(result).toContain('Turn 2 summary.')
    expect(result).toContain('Full turn 3 briefing.')
  })

  it('works with empty summaries (first event)', () => {
    const result = buildContextChainString('Background.', [], null)
    expect(result).toContain('Background.')
    expect(result).not.toContain('undefined')
    expect(result).not.toContain('null')
  })

  it('omits last briefing section when null', () => {
    const result = buildContextChainString('Background.', ['Summary 1.'], null)
    expect(result).not.toMatch(/PRECEDING TURN/i)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node_modules/.bin/vitest run tests/scripts/pipeline-utils.test.ts
```

Expected: FAIL — `scripts/pipeline/utils` not found.

- [ ] **Step 3: Create `scripts/pipeline/types.ts`**

```typescript
// scripts/pipeline/types.ts
// Shared types for the Iran seed enrichment pipeline.

export interface TimelineEvent {
  id: string
  timestamp: string // ISO date: YYYY-MM-DD
  timestamp_confidence: 'exact' | 'approximate' | 'period'
  title: string
  description: string
  actors_involved: string[]
  dimension: 'military' | 'diplomatic' | 'economic' | 'intelligence'
  is_decision: boolean
  deciding_actor?: string
  escalation_direction: 'up' | 'down' | 'lateral' | 'none'
  source_excerpt: string
  exclude?: boolean         // set true during human review to skip seeding
  _duplicateOf?: string     // set during deduplication to flag for human review
}

export interface ActorPerspectives {
  united_states?: string
  iran?: string
  israel?: string
  russia?: string
  china?: string
  gulf_states?: string
}

export interface FullBriefing {
  situation: string
  actor_perspectives: ActorPerspectives
  context: string
}

export interface ChronicleData {
  headline: string
  date_label: string
  entry: string
}

export interface DecisionAlternativeRaw {
  label: string
  description: string
  escalation_direction: 'up' | 'down' | 'lateral' | 'none'
  escalation_level: number
  why_not_chosen: string
}

export interface DecisionAnalysisRaw {
  is_decision_point: boolean
  deciding_actor_id?: string
  decision_summary?: string
  alternatives?: DecisionAlternativeRaw[]
}

export interface EscalationData {
  rung_before: number
  rung_after: number
  direction: 'up' | 'down' | 'lateral' | 'none'
}

export interface EnrichedEvent extends TimelineEvent {
  full_briefing: FullBriefing
  chronicle: ChronicleData
  context_summary: string
  decision_analysis: DecisionAnalysisRaw
  escalation: EscalationData
}

export interface ActorInitialScores {
  militaryStrength: number
  politicalStability: number
  economicHealth: number
  publicSupport: number
  internationalStanding: number
  escalationRung: number
}

export interface ActorIntelProfile {
  signalCapability: number
  humanCapability: number
  cyberCapability: number
  blindSpots: string[]
  intelSharingPartners: string[]
}

export interface ActorProfile {
  id: string           // 'united_states' | 'iran' | 'israel' | 'russia' | 'china' | 'gulf_states'
  name: string
  short_name: string
  biographical_summary: string
  leadership_profile: string
  win_condition: string
  strategic_doctrine: string
  historical_precedents: string
  initial_scores: ActorInitialScores
  intelligence_profile: ActorIntelProfile
}

export interface KeyFigureRelationship {
  figureId: string
  actorId: string
  description: string
  influence_direction: string
  dynamic: string
  documented_instances: string[]
  override_condition?: string
}

export interface KeyFigureProfile {
  id: string
  actor_id: string
  name: string
  title: string
  role: string
  biography: string
  motivations: string
  decision_style: string
  current_context: string
  relationships: KeyFigureRelationship[] | null
  provenance: 'verified' | 'inferred'
  source_note?: string
  source_date?: string
}

// From data/capabilities-*.json (user-run research calls)
export interface RawCapability {
  category: 'military' | 'diplomatic' | 'economic' | 'intelligence'
  name: string
  description: string
  quantity?: number
  unit?: string
  deployment_status: 'available' | 'partially_deployed' | 'degraded'
  lead_time_days?: number
  political_cost?: string
  temporal_anchor: string
  source?: string
  // Russia/China and Gulf states calls include an actor field
  actor?: string
}

export interface DuplicateCandidate {
  ids: string[]
  reason: 'same_id' | 'same_timestamp_and_title'
}

export interface DeduplicationResult {
  events: TimelineEvent[]
  duplicates: DuplicateCandidate[]
}
```

- [ ] **Step 4: Create `scripts/pipeline/utils.ts`**

```typescript
// scripts/pipeline/utils.ts
// Pure utility functions shared across pipeline scripts.
// No API calls, no file I/O — all functions are pure and testable.

import type { TimelineEvent, DeduplicationResult, DuplicateCandidate } from './types'

/**
 * Generates a stable event ID from timestamp and title.
 * Format: evt_YYYYMMDD_title_slug
 */
export function slugifyEventId(event: TimelineEvent): string {
  const datePart = event.timestamp.replace(/-/g, '')
  const titlePart = event.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  return `evt_${datePart}_${titlePart}`
}

/**
 * Merges multiple arrays of TimelineEvents into one array sorted chronologically.
 * Does not deduplicate — call deduplicateEvents separately for human review.
 */
export function mergeEvents(arrays: TimelineEvent[][]): TimelineEvent[] {
  const all = arrays.flat()
  return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

/**
 * Flags potential duplicates for human review.
 * Does NOT remove events — all events are returned so the human can decide.
 * Duplicates are flagged by: (1) identical id, or (2) identical timestamp + title.
 */
export function deduplicateEvents(events: TimelineEvent[]): DeduplicationResult {
  const duplicates: DuplicateCandidate[] = []

  // Group by id
  const byId = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const group = byId.get(event.id) ?? []
    group.push(event)
    byId.set(event.id, group)
  }
  for (const [id, group] of byId.entries()) {
    if (group.length > 1) {
      duplicates.push({ ids: [id], reason: 'same_id' })
    }
  }

  // Group by timestamp + title
  const byTimestampTitle = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const key = `${event.timestamp}::${event.title.toLowerCase().trim()}`
    const group = byTimestampTitle.get(key) ?? []
    group.push(event)
    byTimestampTitle.set(key, group)
  }
  for (const group of byTimestampTitle.values()) {
    if (group.length > 1) {
      const alreadyFlagged = duplicates.some(d => d.ids.some(id => group.map(e => e.id).includes(id)))
      if (!alreadyFlagged) {
        duplicates.push({ ids: group.map(e => e.id), reason: 'same_timestamp_and_title' })
      }
    }
  }

  return { events, duplicates }
}

/**
 * Builds the context chain string fed into each enrichment API call.
 * Format:
 *   BACKGROUND CONTEXT
 *   <background>
 *
 *   PRIOR TURN SUMMARIES
 *   <summaries, one per line>
 *
 *   PRECEDING TURN (FULL BRIEFING)  — only if lastBriefing is provided
 *   <lastBriefing>
 */
export function buildContextChainString(
  background: string,
  summaries: string[],
  lastBriefing: string | null
): string {
  const parts: string[] = [
    `BACKGROUND CONTEXT\n${background}`,
  ]

  if (summaries.length > 0) {
    parts.push(`PRIOR TURN SUMMARIES\n${summaries.join('\n\n')}`)
  }

  if (lastBriefing !== null) {
    parts.push(`PRECEDING TURN (FULL BRIEFING)\n${lastBriefing}`)
  }

  return parts.join('\n\n---\n\n')
}

/**
 * Reads a JSON file and returns its parsed contents.
 * Throws with a clear message if the file is missing (Phase 2 not yet run).
 */
export async function readJsonFile<T>(path: string): Promise<T> {
  const { readFile } = await import('fs/promises')
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Required data file not found: ${path}\n` +
        `Run the Phase 2 research calls first. See docs/Iran Research/research-prompts.md`
      )
    }
    throw err
  }
}

/**
 * Writes data to a JSON file, creating parent directories if needed.
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const { writeFile, mkdir } = await import('fs/promises')
  const { dirname } = await import('path')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8')
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
node_modules/.bin/vitest run tests/scripts/pipeline-utils.test.ts
```

Expected: PASS — all type shape tests + utility tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/pipeline/types.ts scripts/pipeline/utils.ts tests/scripts/pipeline-utils.test.ts
git commit -m "feat: add pipeline shared types and utilities"
```

---

## Task 5: Phase 1 — Timeline extraction script

**Files:**
- Create: `scripts/extract-timeline.ts`
- Create: `tests/scripts/extract-timeline.test.ts`

**Context:** Reads `research-military.md`, `research-political.md`, `research-economic.md` from `docs/Iran Research/`. Calls Claude once per doc with a narrow extraction instruction. Merges the three outputs, deduplicates, assigns stable IDs, and saves to `data/iran-timeline-raw.json`. Expected output: 60–100 events covering Feb 6 → Mar 19, 2026.

The script does NOT call the Anthropic API in tests — the API call is mocked. What we test is the prompt construction and response parsing logic.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scripts/extract-timeline.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildExtractionPrompt, parseExtractionResponse } from '../../scripts/extract-timeline'
import type { TimelineEvent } from '../../scripts/pipeline/types'

describe('buildExtractionPrompt', () => {
  it('includes the doc name and content', () => {
    const prompt = buildExtractionPrompt('research-military.md', 'Some military content.')
    expect(prompt).toContain('research-military.md')
    expect(prompt).toContain('Some military content.')
  })

  it('instructs Claude to output only JSON array', () => {
    const prompt = buildExtractionPrompt('research-military.md', 'content')
    expect(prompt).toContain('Output ONLY a JSON array')
    expect(prompt).toContain('No prose')
  })

  it('includes all required output fields', () => {
    const prompt = buildExtractionPrompt('test.md', 'content')
    expect(prompt).toContain('"timestamp"')
    expect(prompt).toContain('"timestamp_confidence"')
    expect(prompt).toContain('"is_decision"')
    expect(prompt).toContain('"escalation_direction"')
    expect(prompt).toContain('"source_excerpt"')
  })
})

describe('parseExtractionResponse', () => {
  it('parses a valid JSON array from Claude response', () => {
    const raw: TimelineEvent[] = [
      {
        id: '',
        timestamp: '2026-02-28',
        timestamp_confidence: 'exact',
        title: 'US authorizes airstrikes',
        description: 'Trump signed off on Operation Epic Fury.',
        actors_involved: ['united_states', 'iran'],
        dimension: 'military',
        is_decision: true,
        deciding_actor: 'united_states',
        escalation_direction: 'up',
        source_excerpt: 'Trump authorized...',
      },
    ]
    const events = parseExtractionResponse(JSON.stringify(raw), 'research-military.md')
    expect(events).toHaveLength(1)
    expect(events[0].timestamp).toBe('2026-02-28')
    expect(events[0].is_decision).toBe(true)
  })

  it('throws when response is not valid JSON', () => {
    expect(() => parseExtractionResponse('not json', 'research-military.md')).toThrow(
      'Failed to parse extraction response from research-military.md'
    )
  })

  it('throws when response is not an array', () => {
    expect(() => parseExtractionResponse('{"key": "value"}', 'research-military.md')).toThrow(
      'Extraction response from research-military.md is not an array'
    )
  })

  it('assigns stable ids to events that have empty id fields', () => {
    const raw = [
      {
        id: '',
        timestamp: '2026-03-01',
        timestamp_confidence: 'exact',
        title: 'Iran Retaliates',
        description: 'Iran fired 40 ballistic missiles.',
        actors_involved: ['iran'],
        dimension: 'military',
        is_decision: true,
        escalation_direction: 'up',
        source_excerpt: 'Iran fired...',
      },
    ]
    const events = parseExtractionResponse(JSON.stringify(raw), 'research-military.md')
    expect(events[0].id).toBe('evt_20260301_iran_retaliates')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node_modules/.bin/vitest run tests/scripts/extract-timeline.test.ts
```

Expected: FAIL — `buildExtractionPrompt` and `parseExtractionResponse` not found.

- [ ] **Step 3: Create `scripts/extract-timeline.ts`**

```typescript
// scripts/extract-timeline.ts
// Phase 1: Extract timeline events from Iran research documents.
//
// Usage:
//   bun run scripts/extract-timeline.ts
//
// Reads: docs/Iran Research/research-military.md
//        docs/Iran Research/research-political.md
//        docs/Iran Research/research-economic.md
//
// Writes: data/iran-timeline-raw.json
//
// After running: review data/iran-timeline-raw.json manually.
// - Set event.exclude = true for temporally contaminated events.
// - Resolve duplicate candidates flagged in the _duplicates key.
// Expected output: 60–100 events covering Feb 6 – Mar 19, 2026.

import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { mergeEvents, deduplicateEvents, slugifyEventId, writeJsonFile } from './pipeline/utils'
import type { TimelineEvent } from './pipeline/types'

const RESEARCH_DOCS = [
  'docs/Iran Research/research-military.md',
  'docs/Iran Research/research-political.md',
  'docs/Iran Research/research-economic.md',
]

export function buildExtractionPrompt(docName: string, content: string): string {
  return `You are extracting a chronological event list from a geopolitical research document.
Document: ${docName}

For every event, decision, or state change that can be anchored to a specific date or period, output a JSON object with this exact shape:
{
  "id": "",
  "timestamp": "YYYY-MM-DD",
  "timestamp_confidence": "exact" | "approximate" | "period",
  "title": "...",
  "description": "...",
  "actors_involved": ["united_states" | "iran" | "israel" | "russia" | "china" | "gulf_states"],
  "dimension": "military" | "diplomatic" | "economic" | "intelligence",
  "is_decision": true | false,
  "deciding_actor": "...",
  "escalation_direction": "up" | "down" | "lateral" | "none",
  "source_excerpt": "..."
}

Rules:
- Output ONLY a JSON array. No prose, no markdown, no commentary.
- Strict chronological order by timestamp.
- Do NOT include facts with no temporal anchor.
- Leave "id" as empty string — it will be assigned programmatically.
- "source_excerpt" must be an exact quote from the document supporting this event.
- If timestamp_confidence is "period", use the start date of the period.
- "is_decision" = true only for actor choices that could have gone differently. Consequence events (oil prices rising, casualties) are is_decision = false.

Document content:
${content}`
}

export function parseExtractionResponse(rawResponse: string, docName: string): TimelineEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawResponse.trim())
  } catch {
    throw new Error(`Failed to parse extraction response from ${docName}: not valid JSON`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Extraction response from ${docName} is not an array`)
  }

  return (parsed as TimelineEvent[]).map(event => ({
    ...event,
    id: event.id || slugifyEventId(event),
  }))
}

async function extractFromDoc(
  client: Anthropic,
  docPath: string
): Promise<TimelineEvent[]> {
  const docName = docPath.split('/').pop() ?? docPath
  console.log(`  Extracting from ${docName}...`)

  const content = await readFile(join(process.cwd(), docPath), 'utf-8')
  const prompt = buildExtractionPrompt(docName, content)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  const events = parseExtractionResponse(text, docName)
  console.log(`  → ${events.length} events extracted from ${docName}`)
  return events
}

async function main(): Promise<void> {
  const client = new Anthropic()

  console.log('Phase 1: Extracting timeline from research documents...\n')

  const allResults: TimelineEvent[][] = []
  for (const docPath of RESEARCH_DOCS) {
    const events = await extractFromDoc(client, docPath)
    allResults.push(events)
  }

  const merged = mergeEvents(allResults)
  const { events, duplicates } = deduplicateEvents(merged)

  console.log(`\nTotal events: ${events.length}`)
  console.log(`Duplicate candidates: ${duplicates.length}`)

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      totalEvents: events.length,
      duplicateCandidates: duplicates.length,
      instructions: [
        'Review this file before running generate-profiles.ts and enrich-timeline.ts.',
        'Set event.exclude = true for temporally contaminated events.',
        'Review _duplicates and set _duplicateOf on events you want excluded.',
      ],
    },
    _duplicates: duplicates,
    events,
  }

  await writeJsonFile('data/iran-timeline-raw.json', output)
  console.log('\n✓ Saved to data/iran-timeline-raw.json')
  console.log('Next: Review the file, then run scripts/generate-profiles.ts')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node_modules/.bin/vitest run tests/scripts/extract-timeline.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-timeline.ts tests/scripts/extract-timeline.test.ts
git commit -m "feat: add Phase 1 timeline extraction script"
```

---

## Task 6: Phase 3 — Actor and key figure profile generation

**Files:**
- Create: `scripts/generate-profiles.ts`
- Create: `tests/scripts/generate-profiles.test.ts`

**Context:** Reads capabilities JSON files from `data/` (user-run Phase 2 calls). Reads relevant sections from the research docs. Makes one Anthropic call per actor (6 actors) and one per key figure (~15 figures). Generates the Netanyahu-Trump relationship document. Outputs `data/actor-profiles.json` and `data/key-figures.json`.

**PREREQUISITE:** `data/capabilities-*.json` and `data/relationship-*.json` must exist before running this script. The script will throw with a clear error message if they don't.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scripts/generate-profiles.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildActorProfilePrompt,
  parseActorProfileResponse,
  buildKeyFigurePrompt,
  parseKeyFigureResponse,
  ACTOR_IDS,
  KEY_FIGURES,
} from '../../scripts/generate-profiles'
import type { RawCapability } from '../../scripts/pipeline/types'

function makeCapability(overrides: Partial<RawCapability> = {}): RawCapability {
  return {
    category: 'military',
    name: 'F-35 Strike Package',
    description: 'A paragraph about F-35 capabilities.',
    deployment_status: 'available',
    temporal_anchor: 'January 2026',
    ...overrides,
  }
}

describe('ACTOR_IDS', () => {
  it('includes all 6 actors', () => {
    expect(ACTOR_IDS).toContain('united_states')
    expect(ACTOR_IDS).toContain('iran')
    expect(ACTOR_IDS).toContain('israel')
    expect(ACTOR_IDS).toContain('russia')
    expect(ACTOR_IDS).toContain('china')
    expect(ACTOR_IDS).toContain('gulf_states')
  })
})

describe('KEY_FIGURES', () => {
  it('includes Trump and Netanyahu', () => {
    const ids = KEY_FIGURES.map(f => f.id)
    expect(ids).toContain('trump')
    expect(ids).toContain('netanyahu')
  })

  it('includes Mojtaba Khamenei', () => {
    const ids = KEY_FIGURES.map(f => f.id)
    expect(ids).toContain('mojtaba_khamenei')
  })

  it('every figure has actor_id, name, title', () => {
    for (const f of KEY_FIGURES) {
      expect(f.actor_id, `${f.id} missing actor_id`).toBeTruthy()
      expect(f.name, `${f.id} missing name`).toBeTruthy()
      expect(f.title, `${f.id} missing title`).toBeTruthy()
    }
  })
})

describe('buildActorProfilePrompt', () => {
  it('includes actor id and temporal anchor instruction', () => {
    const prompt = buildActorProfilePrompt('iran', [makeCapability()], 'Research content here.')
    expect(prompt).toContain('iran')
    expect(prompt).toContain('January 2026')
  })

  it('includes capabilities JSON in prompt', () => {
    const cap = makeCapability({ name: 'Shahab-3 Ballistic Missile' })
    const prompt = buildActorProfilePrompt('iran', [cap], 'Research.')
    expect(prompt).toContain('Shahab-3 Ballistic Missile')
  })

  it('instructs output of all required profile fields', () => {
    const prompt = buildActorProfilePrompt('iran', [], 'Research.')
    expect(prompt).toContain('biographical_summary')
    expect(prompt).toContain('leadership_profile')
    expect(prompt).toContain('win_condition')
    expect(prompt).toContain('strategic_doctrine')
    expect(prompt).toContain('historical_precedents')
  })
})

describe('parseActorProfileResponse', () => {
  it('parses a valid profile response', () => {
    const raw = {
      id: 'iran',
      name: 'Islamic Republic of Iran',
      short_name: 'Iran',
      biographical_summary: 'A paragraph about Iran.',
      leadership_profile: 'A paragraph about Iranian leadership.',
      win_condition: 'A paragraph about Iranian win conditions.',
      strategic_doctrine: 'A paragraph about Iranian doctrine.',
      historical_precedents: 'A paragraph about Iranian history.',
      initial_scores: { militaryStrength: 60, politicalStability: 40, economicHealth: 30, publicSupport: 55, internationalStanding: 35, escalationRung: 8 },
      intelligence_profile: { signalCapability: 50, humanCapability: 65, cyberCapability: 55, blindSpots: ['US satellite coverage'], intelSharingPartners: ['russia'] },
    }
    const profile = parseActorProfileResponse(JSON.stringify(raw), 'iran')
    expect(profile.id).toBe('iran')
    expect(profile.biographical_summary).toBeTruthy()
  })

  it('throws when required field is missing', () => {
    const raw = { id: 'iran', name: 'Iran' } // missing required fields
    expect(() => parseActorProfileResponse(JSON.stringify(raw), 'iran')).toThrow(
      'Actor profile for iran missing required field'
    )
  })
})

describe('buildKeyFigurePrompt', () => {
  it('includes figure name and role', () => {
    const figure = KEY_FIGURES.find(f => f.id === 'trump')!
    const prompt = buildKeyFigurePrompt(figure, 'Actor profile text.', 'Research mentions.')
    expect(prompt).toContain(figure.name)
    expect(prompt).toContain('biography')
    expect(prompt).toContain('decision_style')
    expect(prompt).toContain('current_context')
  })

  it('includes inferred vs verified instruction for Mojtaba', () => {
    const figure = KEY_FIGURES.find(f => f.id === 'mojtaba_khamenei')!
    const prompt = buildKeyFigurePrompt(figure, 'Actor profile.', 'Research.')
    expect(prompt).toContain('inferred')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node_modules/.bin/vitest run tests/scripts/generate-profiles.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `scripts/generate-profiles.ts`**

```typescript
// scripts/generate-profiles.ts
// Phase 3: Generate actor profiles and key figure biographies.
//
// Usage:
//   bun run scripts/generate-profiles.ts
//
// Reads:  data/capabilities-us.json
//         data/capabilities-iran.json
//         data/capabilities-israel.json
//         data/capabilities-russia-china.json
//         data/capabilities-gulf-states.json
//         data/relationship-netanyahu-trump.json
//         data/relationship-iran-russia.json
//         data/relationship-iran-china.json
//         data/relationship-us-gulf-states.json
//         docs/Iran Research/research-military.md
//         docs/Iran Research/research-political.md
//         docs/Iran Research/research-economic.md
//
// Writes: data/actor-profiles.json
//         data/key-figures.json

import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { readJsonFile, writeJsonFile } from './pipeline/utils'
import type { ActorProfile, KeyFigureProfile, RawCapability } from './pipeline/types'

export const ACTOR_IDS = ['united_states', 'iran', 'israel', 'russia', 'china', 'gulf_states'] as const
export type ActorId = typeof ACTOR_IDS[number]

export interface KeyFigureSeed {
  id: string
  actor_id: ActorId
  name: string
  title: string
  role: string
  inferredNote?: string // special instructions for figures with limited public record
}

export const KEY_FIGURES: KeyFigureSeed[] = [
  { id: 'trump', actor_id: 'united_states', name: 'Donald Trump', title: 'President of the United States', role: 'president' },
  { id: 'rubio', actor_id: 'united_states', name: 'Marco Rubio', title: 'Secretary of State', role: 'foreign_policy_principal' },
  { id: 'hegseth', actor_id: 'united_states', name: 'Pete Hegseth', title: 'Secretary of Defense', role: 'defense_secretary' },
  { id: 'netanyahu', actor_id: 'israel', name: 'Benjamin Netanyahu', title: 'Prime Minister of Israel', role: 'head_of_government' },
  { id: 'mojtaba_khamenei', actor_id: 'iran', name: 'Mojtaba Khamenei', title: 'Son of Supreme Leader / Emerging Power Figure', role: 'succession_figure',
    inferredNote: 'Mojtaba Khamenei has a very limited public record. His profile must be constructed primarily from inference based on his father\'s ideology, his IRGC relationships, and his known background. Every claim that is not directly documented must be labeled "inferred" in the biography and current_context fields.' },
  { id: 'pezeshkian', actor_id: 'iran', name: 'Masoud Pezeshkian', title: 'President of Iran', role: 'president' },
  { id: 'araghchi', actor_id: 'iran', name: 'Abbas Araghchi', title: 'Foreign Minister of Iran', role: 'foreign_minister' },
  { id: 'hajizadeh', actor_id: 'iran', name: 'Amir Ali Hajizadeh', title: 'IRGC Aerospace Force Commander', role: 'military_commander' },
  { id: 'qaani', actor_id: 'iran', name: 'Esmail Qaani', title: 'Quds Force Commander', role: 'proxy_commander' },
  { id: 'putin', actor_id: 'russia', name: 'Vladimir Putin', title: 'President of Russia', role: 'head_of_state' },
  { id: 'xi', actor_id: 'china', name: 'Xi Jinping', title: 'General Secretary / President of China', role: 'head_of_state' },
  { id: 'mbs', actor_id: 'gulf_states', name: 'Mohammed bin Salman', title: 'Crown Prince / Prime Minister of Saudi Arabia', role: 'de_facto_ruler' },
  { id: 'mbz', actor_id: 'gulf_states', name: 'Mohammed bin Zayed', title: 'President of the UAE', role: 'head_of_state' },
]

const REQUIRED_PROFILE_FIELDS = [
  'id', 'name', 'short_name', 'biographical_summary', 'leadership_profile',
  'win_condition', 'strategic_doctrine', 'historical_precedents',
  'initial_scores', 'intelligence_profile',
] as const

export function buildActorProfilePrompt(
  actorId: string,
  capabilities: RawCapability[],
  researchContent: string
): string {
  return `You are generating a comprehensive actor profile for a geopolitical simulation.
Actor: ${actorId}

TEMPORAL ANCHOR: Profile reflects the state of this actor as of January 2026 — before Operation Epic Fury began on February 28, 2026. Do not describe outcomes of the war.

CRITICAL: Every text field must be a full paragraph (minimum 4-5 sentences). No one-liners. The simulation uses these profiles as the cached system prompt fed to an AI agent — they must contain enough depth for the agent to make realistic decisions.

Capabilities inventory (from verified research, anchored to January 2026):
${JSON.stringify(capabilities, null, 2)}

Research document excerpts:
${researchContent}

Output a single JSON object with this exact shape:
{
  "id": "${actorId}",
  "name": "...",
  "short_name": "...",
  "biographical_summary": "[2-3 paragraphs: strategic culture, historical motivations, how this country makes decisions at the national level across decades]",
  "leadership_profile": "[Full paragraph: current leader(s), their biography and MO, past decisions that define current behavior, how they are processing THIS conflict specifically as of January 2026]",
  "win_condition": "[Full paragraph: what winning looks like for this actor — not a vague statement, but specific outcomes. What would they accept as a settlement vs. what would they fight on for.]",
  "strategic_doctrine": "[Full paragraph: risk tolerance, escalation ladder preferences, override conditions where political motivation beats strategic logic, red lines and what crosses them]",
  "historical_precedents": "[Full paragraph: 3-5 specific decisions this actor has made that most define their behavior going forward. Cite actual events, dates, outcomes.]",
  "initial_scores": {
    "militaryStrength": [0-100],
    "politicalStability": [0-100],
    "economicHealth": [0-100],
    "publicSupport": [0-100],
    "internationalStanding": [0-100],
    "escalationRung": [0-20, current position on escalation ladder as of Jan 2026]
  },
  "intelligence_profile": {
    "signalCapability": [0-100],
    "humanCapability": [0-100],
    "cyberCapability": [0-100],
    "blindSpots": ["...", "..."],
    "intelSharingPartners": ["...", "..."]
  }
}

Output ONLY the JSON object. No prose outside the JSON.`
}

export function parseActorProfileResponse(raw: string, actorId: string): ActorProfile {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    throw new Error(`Failed to parse actor profile response for ${actorId}: not valid JSON`)
  }

  const profile = parsed as Record<string, unknown>
  for (const field of REQUIRED_PROFILE_FIELDS) {
    if (!profile[field]) {
      throw new Error(`Actor profile for ${actorId} missing required field: ${field}`)
    }
  }

  return profile as unknown as ActorProfile
}

export function buildKeyFigurePrompt(
  figure: KeyFigureSeed,
  actorProfileText: string,
  researchMentions: string
): string {
  const inferredNote = figure.inferredNote
    ? `\nSPECIAL INSTRUCTION: ${figure.inferredNote}\n`
    : ''

  return `You are generating a key figure profile for a geopolitical simulation.
Figure: ${figure.name} (${figure.title})
Actor: ${figure.actor_id}
${inferredNote}
TEMPORAL ANCHOR: Profile reflects this figure's state as of January 2026.

CRITICAL: Every text field must be a full paragraph. These profiles are injected into the AI agent's system prompt — they must be deep enough for the agent to correctly model this figure's decision-making.

Actor's overall profile (for context):
${actorProfileText}

Research document mentions of this figure:
${researchMentions}

Output a single JSON object:
{
  "id": "${figure.id}",
  "actor_id": "${figure.actor_id}",
  "name": "${figure.name}",
  "title": "${figure.title}",
  "role": "${figure.role}",
  "biography": "[Full paragraph: who they are, how they got here, formative experiences, what shaped them]",
  "motivations": "[Full paragraph: what they personally want from this conflict — distinct from their country's official goals. Be specific about personal legacy, survival, ideology.]",
  "decision_style": "[Full paragraph: how they process decisions — instinct vs. process, who they listen to, what they fear, when political motivation overrides strategic logic]",
  "current_context": "[Full paragraph: how they are personally processing THIS specific situation as of January 2026. What pressures are they under? What have recent events cost them? What do they need to happen next?]",
  "relationships": [...],
  "provenance": "verified" | "inferred",
  "source_note": "..."
}

Output ONLY the JSON object. No prose outside the JSON.`
}

export function parseKeyFigureResponse(raw: string, figureId: string): KeyFigureProfile {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    throw new Error(`Failed to parse key figure response for ${figureId}: not valid JSON`)
  }

  const figure = parsed as Record<string, unknown>
  const required = ['id', 'actor_id', 'name', 'biography', 'motivations', 'decision_style', 'current_context']
  for (const field of required) {
    if (!figure[field]) {
      throw new Error(`Key figure ${figureId} missing required field: ${field}`)
    }
  }

  return figure as unknown as KeyFigureProfile
}

async function readResearchDocs(): Promise<Record<string, string>> {
  const docs: Record<string, string> = {}
  const paths = {
    military: 'docs/Iran Research/research-military.md',
    political: 'docs/Iran Research/research-political.md',
    economic: 'docs/Iran Research/research-economic.md',
  }
  for (const [key, path] of Object.entries(paths)) {
    docs[key] = await readFile(join(process.cwd(), path), 'utf-8')
  }
  return docs
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
}

async function loadCapabilities(actorId: string): Promise<RawCapability[]> {
  const capabilityFileMap: Record<string, string> = {
    united_states: 'data/capabilities-us.json',
    iran: 'data/capabilities-iran.json',
    israel: 'data/capabilities-israel.json',
    russia: 'data/capabilities-russia-china.json',
    china: 'data/capabilities-russia-china.json',
    gulf_states: 'data/capabilities-gulf-states.json',
  }
  const filePath = capabilityFileMap[actorId]
  if (!filePath) return []

  const all = await readJsonFile<RawCapability[]>(filePath)
  // Russia/China file has mixed actors — filter to only the relevant one
  if (actorId === 'russia' || actorId === 'china') {
    return all.filter(c => (c as RawCapability & { actor?: string }).actor === actorId)
  }
  return all
}

async function main(): Promise<void> {
  const client = new Anthropic()
  const docs = await readResearchDocs()
  const profiles: ActorProfile[] = []

  console.log('Phase 3: Generating actor profiles...\n')

  for (const actorId of ACTOR_IDS) {
    console.log(`  Generating profile for ${actorId}...`)
    const capabilities = await loadCapabilities(actorId)
    const researchContent = [docs.military, docs.political, docs.economic].join('\n\n---\n\n')
    const prompt = buildActorProfilePrompt(actorId, capabilities, researchContent)
    const raw = await callClaude(client, prompt)
    const profile = parseActorProfileResponse(raw, actorId)
    profiles.push(profile)
    console.log(`  ✓ ${actorId}`)
  }

  await writeJsonFile('data/actor-profiles.json', profiles)
  console.log(`\n✓ Saved ${profiles.length} actor profiles to data/actor-profiles.json`)

  console.log('\nGenerating key figure profiles...\n')
  const keyFigures: KeyFigureProfile[] = []

  for (const figure of KEY_FIGURES) {
    console.log(`  Generating profile for ${figure.name}...`)
    const actorProfile = profiles.find(p => p.id === figure.actor_id)
    const actorProfileText = actorProfile
      ? JSON.stringify(actorProfile, null, 2)
      : `Actor: ${figure.actor_id}`

    const allResearch = [docs.military, docs.political, docs.economic].join('\n\n')
    const nameVariants = [figure.name, figure.name.split(' ').pop() ?? figure.name]
    const relevantMentions = allResearch
      .split('\n')
      .filter(line => nameVariants.some(v => line.includes(v)))
      .join('\n')

    const prompt = buildKeyFigurePrompt(figure, actorProfileText, relevantMentions)
    const raw = await callClaude(client, prompt)
    const kf = parseKeyFigureResponse(raw, figure.id)
    keyFigures.push(kf)
    console.log(`  ✓ ${figure.name}`)
  }

  await writeJsonFile('data/key-figures.json', keyFigures)
  console.log(`\n✓ Saved ${keyFigures.length} key figure profiles to data/key-figures.json`)
  console.log('Next: Run scripts/enrich-timeline.ts')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests**

```bash
node_modules/.bin/vitest run tests/scripts/generate-profiles.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-profiles.ts tests/scripts/generate-profiles.test.ts
git commit -m "feat: add Phase 3 actor and key figure profile generation script"
```

---

## Task 7: Phase 4 — Event enrichment pipeline

**Files:**
- Create: `scripts/enrich-timeline.ts`
- Create: `tests/scripts/enrich-timeline.test.ts`

**Context:** The most important script. Processes each timeline event in chronological order, threading the context chain forward. Each API call receives the full context chain (background + prior summaries + last full briefing) and outputs: `full_briefing`, `chronicle`, `context_summary`, `decision_analysis`, `escalation`. Pauses after the first 10 events for a quality review checkpoint. Saves output incrementally so it can resume from interruption.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scripts/enrich-timeline.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildEnrichmentPrompt,
  parseEnrichedResponse,
  buildEnrichmentContext,
} from '../../scripts/enrich-timeline'
import type { TimelineEvent, ActorProfile } from '../../scripts/pipeline/types'

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'evt_20260228_op_epic_fury',
    timestamp: '2026-02-28',
    timestamp_confidence: 'exact',
    title: 'Trump Authorizes Operation Epic Fury',
    description: 'Trump signed the authorization order for Operation Epic Fury.',
    actors_involved: ['united_states', 'israel', 'iran'],
    dimension: 'military',
    is_decision: true,
    deciding_actor: 'united_states',
    escalation_direction: 'up',
    source_excerpt: 'Trump authorized...',
    ...overrides,
  }
}

function makeActorProfile(id: string): ActorProfile {
  return {
    id,
    name: id,
    short_name: id,
    biographical_summary: `${id} biographical summary paragraph.`,
    leadership_profile: `${id} leadership profile paragraph.`,
    win_condition: `${id} win condition paragraph.`,
    strategic_doctrine: `${id} doctrine paragraph.`,
    historical_precedents: `${id} precedents paragraph.`,
    initial_scores: { militaryStrength: 70, politicalStability: 60, economicHealth: 55, publicSupport: 50, internationalStanding: 60, escalationRung: 5 },
    intelligence_profile: { signalCapability: 70, humanCapability: 60, cyberCapability: 65, blindSpots: [], intelSharingPartners: [] },
  }
}

describe('buildEnrichmentContext', () => {
  it('includes background context', () => {
    const ctx = buildEnrichmentContext('Background paragraph.', [], null, [])
    expect(ctx).toContain('Background paragraph.')
  })

  it('includes prior summaries when present', () => {
    const ctx = buildEnrichmentContext('Background.', ['Turn 1 summary.', 'Turn 2 summary.'], null, [])
    expect(ctx).toContain('Turn 1 summary.')
    expect(ctx).toContain('Turn 2 summary.')
  })

  it('includes last briefing section when provided', () => {
    const ctx = buildEnrichmentContext('Background.', [], 'Full preceding briefing.', [])
    expect(ctx).toContain('Full preceding briefing.')
    expect(ctx).toContain('PRECEDING TURN')
  })

  it('excludes preceding turn section when lastBriefing is null', () => {
    const ctx = buildEnrichmentContext('Background.', [], null, [])
    expect(ctx).not.toContain('PRECEDING TURN')
  })
})

describe('buildEnrichmentPrompt', () => {
  it('includes the event title and timestamp', () => {
    const event = makeEvent()
    const profiles = [makeActorProfile('united_states'), makeActorProfile('iran')]
    const prompt = buildEnrichmentPrompt(event, 'context chain text', profiles)
    expect(prompt).toContain('Trump Authorizes Operation Epic Fury')
    expect(prompt).toContain('2026-02-28')
  })

  it('includes all required output fields', () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, 'context', [])
    expect(prompt).toContain('full_briefing')
    expect(prompt).toContain('chronicle')
    expect(prompt).toContain('context_summary')
    expect(prompt).toContain('decision_analysis')
    expect(prompt).toContain('escalation')
  })

  it('instructs paragraph-depth for all text fields', () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, 'context', [])
    expect(prompt).toContain('full paragraph')
  })
})

describe('parseEnrichedResponse', () => {
  it('parses a valid enrichment response', () => {
    const raw = {
      full_briefing: {
        situation: 'A situation paragraph.',
        actor_perspectives: { united_states: 'US perspective.', iran: 'Iran perspective.' },
        context: 'A context paragraph.',
      },
      chronicle: {
        headline: 'US Launches Strikes on Iran',
        date_label: 'Day 1 of Operation Epic Fury — February 28, 2026',
        entry: 'A four-paragraph chronicle entry.',
      },
      context_summary: 'A one-paragraph summary of this turn.',
      decision_analysis: {
        is_decision_point: true,
        deciding_actor_id: 'united_states',
        decision_summary: 'Trump authorized Operation Epic Fury.',
        alternatives: [{ label: 'Sanctions only', description: 'Paragraph.', escalation_direction: 'lateral', escalation_level: 3, why_not_chosen: 'Paragraph.' }],
      },
      escalation: { rung_before: 5, rung_after: 12, direction: 'up' },
    }
    const result = parseEnrichedResponse(JSON.stringify(raw), 'evt_test')
    expect(result.full_briefing.situation).toBeTruthy()
    expect(result.chronicle.headline).toBeTruthy()
    expect(result.context_summary).toBeTruthy()
    expect(result.decision_analysis.is_decision_point).toBe(true)
  })

  it('throws when required section is missing', () => {
    const raw = { chronicle: {}, context_summary: 'summary' } // missing full_briefing, etc.
    expect(() => parseEnrichedResponse(JSON.stringify(raw), 'evt_test')).toThrow(
      'Enrichment response for evt_test missing required section'
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node_modules/.bin/vitest run tests/scripts/enrich-timeline.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `scripts/enrich-timeline.ts`**

```typescript
// scripts/enrich-timeline.ts
// Phase 4: Enrich timeline events with briefings, chronicles, and context chain.
//
// Usage:
//   bun run scripts/enrich-timeline.ts
//   bun run scripts/enrich-timeline.ts --from=evt_20260310_xyz  # resume from event
//   bun run scripts/enrich-timeline.ts --no-pause               # skip quality checkpoint
//
// Reads:  data/iran-timeline-raw.json    (Phase 1 output, after human review)
//         data/actor-profiles.json       (Phase 3 output)
//         data/key-figures.json          (Phase 3 output)
//
// Writes: data/iran-enriched.json        (updated incrementally after each event)
//
// QUALITY CHECKPOINT: After the first 10 events, the script pauses and prints
// a review summary. Run with --no-pause to skip (for unattended runs after
// you've verified quality on the first batch).

import Anthropic from '@anthropic-ai/sdk'
import { readJsonFile, writeJsonFile, buildContextChainString } from './pipeline/utils'
import type { TimelineEvent, EnrichedEvent, ActorProfile, KeyFigureProfile } from './pipeline/types'

const QUALITY_CHECKPOINT_AFTER = 10

interface RawTimelineFile {
  _meta: Record<string, unknown>
  _duplicates: unknown[]
  events: TimelineEvent[]
}

interface EnrichedOutput {
  _meta: Record<string, unknown>
  events: EnrichedEvent[]
}

export function buildEnrichmentContext(
  background: string,
  priorSummaries: string[],
  lastFullBriefing: string | null,
  _actorProfiles: ActorProfile[]  // reserved for future use
): string {
  return buildContextChainString(background, priorSummaries, lastFullBriefing)
}

export function buildEnrichmentPrompt(
  event: TimelineEvent,
  contextChain: string,
  actorProfiles: ActorProfile[]
): string {
  const profileSummaries = actorProfiles
    .map(p => `${p.id}: ${p.strategic_doctrine}`)
    .join('\n\n')

  return `You are enriching a timeline event for a geopolitical simulation. Your output will be displayed to players as their intelligence briefing and as the historical chronicle.

CRITICAL: Every text field must be a full paragraph (minimum 4-5 sentences). This simulation uses these entries as the primary narrative — one-liners are unacceptable.

Event to enrich:
${JSON.stringify(event, null, 2)}

Context chain (what has happened so far):
${contextChain}

Actor strategic doctrines (for informing actor perspectives and why_not_chosen):
${profileSummaries}

Output a single JSON object with this exact shape:

{
  "full_briefing": {
    "situation": "[Full paragraph: what is happening RIGHT NOW as this event unfolds. Specific assets named, figures named, precise locations. No vagueness.]",
    "actor_perspectives": {
      "united_states": "[Full paragraph: what the US intelligence picture looks like — what they know, what they don't, how they are assessing the situation. Apply fog of war: the US doesn't know everything.]",
      "iran": "[Full paragraph: Iran's perspective — how they are interpreting events, what their intelligence shows, what their leadership is weighing.]",
      "israel": "[Full paragraph: Israel's perspective and assessment.]"
    },
    "context": "[Full paragraph: how this event connects to the larger arc — what led here, what it changes, what it sets up.]"
  },
  "chronicle": {
    "headline": "[Sharp, newspaper-style headline. Maximum 12 words. E.g.: 'Iran Retaliates: 40 Ballistic Missiles Strike Israeli Population Centers']",
    "date_label": "[E.g.: 'Day 3 of Operation Epic Fury — March 2, 2026']",
    "entry": "[4 paragraphs: (1) What happened — specific assets, figures, locations; (2) Human dimension — civilian impact, casualties, personal stories if applicable; (3) Economic and diplomatic consequences; (4) What this means going forward — what has changed, what is now possible that wasn't before.]"
  },
  "context_summary": "[One paragraph, 4-5 sentences. This summary will be fed as context to all future turns. It must capture: what happened, who decided it, what it cost, and what it changed. Future AI agents reading this must be able to understand the significance of this event without reading the full briefing.]",
  "decision_analysis": {
    "is_decision_point": true | false,
    "deciding_actor_id": "...",
    "decision_summary": "[One sentence: '[Actor] chose to [action]']",
    "alternatives": [
      {
        "label": "...",
        "description": "[Full paragraph: what this alternative would have looked like, who was advocating for it, what it would have required.]",
        "escalation_direction": "up" | "down" | "lateral" | "none",
        "escalation_level": [0-20],
        "why_not_chosen": "[Full paragraph: explain using the deciding actor's specific psychology, political constraints, and strategic doctrine why they went a different direction. Reference their known decision-making patterns.]"
      }
    ]
  },
  "escalation": {
    "rung_before": [0-20, the escalation level before this event],
    "rung_after": [0-20, the escalation level after this event],
    "direction": "up" | "down" | "lateral" | "none"
  }
}

Output ONLY the JSON object. No prose outside the JSON.`
}

interface EnrichmentResponseRaw {
  full_briefing: unknown
  chronicle: unknown
  context_summary: string
  decision_analysis: unknown
  escalation: unknown
}

export function parseEnrichedResponse(raw: string, eventId: string): EnrichedEvent['full_briefing'] extends unknown ? ReturnType<typeof _parseEnrichedInternal> : never {
  return _parseEnrichedInternal(raw, eventId)
}

function _parseEnrichedInternal(raw: string, eventId: string): {
  full_briefing: EnrichedEvent['full_briefing']
  chronicle: EnrichedEvent['chronicle']
  context_summary: string
  decision_analysis: EnrichedEvent['decision_analysis']
  escalation: EnrichedEvent['escalation']
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    throw new Error(`Failed to parse enrichment response for ${eventId}: not valid JSON`)
  }

  const res = parsed as EnrichmentResponseRaw
  const requiredSections = ['full_briefing', 'chronicle', 'context_summary', 'decision_analysis', 'escalation']
  for (const section of requiredSections) {
    if (!res[section as keyof EnrichmentResponseRaw]) {
      throw new Error(`Enrichment response for ${eventId} missing required section: ${section}`)
    }
  }

  return {
    full_briefing: res.full_briefing as EnrichedEvent['full_briefing'],
    chronicle: res.chronicle as EnrichedEvent['chronicle'],
    context_summary: res.context_summary,
    decision_analysis: res.decision_analysis as EnrichedEvent['decision_analysis'],
    escalation: res.escalation as EnrichedEvent['escalation'],
  }
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const noPause = args.includes('--no-pause')

  const client = new Anthropic()

  const rawFile = await readJsonFile<RawTimelineFile>('data/iran-timeline-raw.json')
  const profiles = await readJsonFile<ActorProfile[]>('data/actor-profiles.json')
  const _keyFigures = await readJsonFile<KeyFigureProfile[]>('data/key-figures.json')

  // Load existing enriched output for resumption
  let existingOutput: EnrichedOutput | null = null
  try {
    existingOutput = await readJsonFile<EnrichedOutput>('data/iran-enriched.json')
  } catch {
    // File doesn't exist yet — starting fresh
  }

  const alreadyEnriched = new Set<string>(
    existingOutput?.events.map(e => e.id) ?? []
  )
  const enrichedEvents: EnrichedEvent[] = existingOutput?.events ?? []

  // Filter events: exclude flagged events, skip already-enriched, apply --from= flag
  const events = rawFile.events.filter(e => !e.exclude)
  const startIndex = fromEventId
    ? events.findIndex(e => e.id === fromEventId)
    : 0
  const toProcess = events.slice(startIndex < 0 ? 0 : startIndex).filter(e => !alreadyEnriched.has(e.id))

  console.log(`Phase 4: Enriching ${toProcess.length} events (${alreadyEnriched.size} already done)\n`)

  // Background context comes from the first run — use a placeholder that seed-iran.ts will fill
  const BACKGROUND = 'BACKGROUND_PLACEHOLDER'
  const priorSummaries: string[] = enrichedEvents.map(e => e.context_summary)
  let lastFullBriefing: string | null =
    enrichedEvents.length > 0
      ? JSON.stringify(enrichedEvents[enrichedEvents.length - 1].full_briefing)
      : null

  for (let i = 0; i < toProcess.length; i++) {
    const event = toProcess[i]

    const contextChain = buildEnrichmentContext(BACKGROUND, priorSummaries, lastFullBriefing, profiles)
    const prompt = buildEnrichmentPrompt(event, contextChain, profiles)

    console.log(`  [${i + 1}/${toProcess.length}] ${event.id}...`)
    const raw = await callClaude(client, prompt)
    const enriched = _parseEnrichedInternal(raw, event.id)

    const enrichedEvent: EnrichedEvent = { ...event, ...enriched }
    enrichedEvents.push(enrichedEvent)

    // Update context chain for next call
    priorSummaries.push(enriched.context_summary)
    lastFullBriefing = JSON.stringify(enriched.full_briefing)

    // Save incrementally after every event
    await writeJsonFile('data/iran-enriched.json', {
      _meta: { lastUpdated: new Date().toISOString(), totalEnriched: enrichedEvents.length },
      events: enrichedEvents,
    })

    // Quality checkpoint after first QUALITY_CHECKPOINT_AFTER events
    if (!noPause && i === QUALITY_CHECKPOINT_AFTER - 1) {
      console.log(`\n── QUALITY CHECKPOINT ─────────────────────────────────────────`)
      console.log(`First ${QUALITY_CHECKPOINT_AFTER} events enriched. Review data/iran-enriched.json before continuing.`)
      console.log(`Check:`)
      console.log(`  1. Are briefings paragraph-depth? (minimum 4-5 sentences each field)`)
      console.log(`  2. Is the context section using prior summaries correctly?`)
      console.log(`  3. Are decision alternatives plausible and psychology-grounded?`)
      console.log(`  4. Is fog-of-war applied in actor perspectives?`)
      console.log(``)
      console.log(`To continue: bun run scripts/enrich-timeline.ts --from=${toProcess[QUALITY_CHECKPOINT_AFTER].id} --no-pause`)
      console.log(`─────────────────────────────────────────────────────────────────\n`)
      process.exit(0)
    }
  }

  console.log(`\n✓ Enrichment complete: ${enrichedEvents.length} events in data/iran-enriched.json`)
  console.log('Next: Run scripts/seed-iran.ts to push to Supabase')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests**

```bash
node_modules/.bin/vitest run tests/scripts/enrich-timeline.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/enrich-timeline.ts tests/scripts/enrich-timeline.test.ts
git commit -m "feat: add Phase 4 event enrichment pipeline script"
```

---

## Task 8: Updated seed-iran.ts

**Files:**
- Modify: `scripts/seed-iran.ts`
- Create: `tests/scripts/seed-iran.test.ts`

**Context:** The updated seed script drops any existing Iran scenario data (drop-and-reseed — the previous data was mock), then populates all new tables: `actors`, `key_figures`, `actor_capabilities`, and `turn_commits` with all enriched fields. The `--from=` flag still works for appending new events; the context chain tail is loaded from Supabase rather than recomputed.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scripts/seed-iran.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildScenarioInsert, buildActorInsert, buildTurnCommitInsert } from '../../scripts/seed-iran'
import type { ActorProfile, EnrichedEvent } from '../../scripts/pipeline/types'

function makeActorProfile(): ActorProfile {
  return {
    id: 'iran',
    name: 'Islamic Republic of Iran',
    short_name: 'Iran',
    biographical_summary: 'Iran biographical summary paragraph.',
    leadership_profile: 'Iran leadership profile paragraph.',
    win_condition: 'Iran win condition paragraph.',
    strategic_doctrine: 'Iran doctrine paragraph.',
    historical_precedents: 'Iran precedents paragraph.',
    initial_scores: { militaryStrength: 60, politicalStability: 40, economicHealth: 30, publicSupport: 55, internationalStanding: 35, escalationRung: 8 },
    intelligence_profile: { signalCapability: 50, humanCapability: 65, cyberCapability: 55, blindSpots: [], intelSharingPartners: [] },
  }
}

function makeEnrichedEvent(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: 'evt_20260228_op_epic_fury',
    timestamp: '2026-02-28',
    timestamp_confidence: 'exact',
    title: 'Trump Authorizes Operation Epic Fury',
    description: 'A description paragraph.',
    actors_involved: ['united_states'],
    dimension: 'military',
    is_decision: true,
    deciding_actor: 'united_states',
    escalation_direction: 'up',
    source_excerpt: 'Source text.',
    full_briefing: {
      situation: 'Situation paragraph.',
      actor_perspectives: { united_states: 'US perspective.', iran: 'Iran perspective.' },
      context: 'Context paragraph.',
    },
    chronicle: {
      headline: 'US Launches Strikes on Iran',
      date_label: 'Day 1 — February 28, 2026',
      entry: 'Chronicle entry four paragraphs.',
    },
    context_summary: 'Summary paragraph.',
    decision_analysis: {
      is_decision_point: true,
      deciding_actor_id: 'united_states',
      decision_summary: 'Trump authorized Operation Epic Fury.',
      alternatives: [],
    },
    escalation: { rung_before: 5, rung_after: 12, direction: 'up' },
    ...overrides,
  }
}

describe('buildScenarioInsert', () => {
  it('sets background_context_enriched when provided', () => {
    const insert = buildScenarioInsert('Enriched background paragraph.')
    expect(insert.background_context_enriched).toBe('Enriched background paragraph.')
    expect(insert.category).toBe('geopolitical_conflict')
    expect(insert.visibility).toBe('public')
  })
})

describe('buildActorInsert', () => {
  it('maps ActorProfile fields to ActorTableInsert shape', () => {
    const profile = makeActorProfile()
    const insert = buildActorInsert(profile, 'scenario-uuid-123')
    expect(insert.id).toBe('iran')
    expect(insert.scenario_id).toBe('scenario-uuid-123')
    expect(insert.biographical_summary).toBe(profile.biographical_summary)
    expect(insert.initial_scores).toEqual(profile.initial_scores)
  })
})

describe('buildTurnCommitInsert', () => {
  it('maps EnrichedEvent fields to TurnCommitInsert shape', () => {
    const event = makeEnrichedEvent()
    const insert = buildTurnCommitInsert(event, 'branch-uuid', null, 1)
    expect(insert.simulated_date).toBe('2026-02-28')
    expect(insert.full_briefing).toBe(JSON.stringify(event.full_briefing))
    expect(insert.chronicle_headline).toBe('US Launches Strikes on Iran')
    expect(insert.chronicle_entry).toBe(event.chronicle.entry)
    expect(insert.is_decision_point).toBe(true)
    expect(insert.deciding_actor_id).toBe('united_states')
    expect(insert.escalation_rung_before).toBe(5)
    expect(insert.escalation_rung_after).toBe(12)
    expect(insert.escalation_direction).toBe('up')
    expect(insert.is_ground_truth).toBe(true)
  })

  it('sets parent_commit_id correctly', () => {
    const event = makeEnrichedEvent()
    const insert = buildTurnCommitInsert(event, 'branch-uuid', 'parent-commit-id', 5)
    expect(insert.parent_commit_id).toBe('parent-commit-id')
    expect(insert.turn_number).toBe(5)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node_modules/.bin/vitest run tests/scripts/seed-iran.test.ts
```

Expected: FAIL — `buildScenarioInsert`, `buildActorInsert`, `buildTurnCommitInsert` not exported.

- [ ] **Step 3: Rewrite `scripts/seed-iran.ts`**

Replace the entire file with the following. The original file imported from `lib/scenarios/iran` which contained mock data — that import is removed. All data now comes from `data/iran-enriched.json`, `data/actor-profiles.json`, etc.

```typescript
/**
 * Seeds the comprehensive Iran scenario into Supabase.
 * DROP-AND-RESEED: Deletes any existing Iran scenario before inserting fresh data.
 *
 * Usage:
 *   bun run scripts/seed-iran.ts                        # full seed
 *   bun run scripts/seed-iran.ts --from=evt_id          # append new events (does not drop)
 *   bun run scripts/seed-iran.ts --dry-run              # validate without writing
 *
 * PREREQUISITES: Run the pipeline scripts first:
 *   1. bun run scripts/extract-timeline.ts              (Phase 1)
 *   2. [User runs 9 research calls — see docs/Iran Research/research-prompts.md]
 *   3. bun run scripts/generate-profiles.ts             (Phase 3)
 *   4. bun run scripts/enrich-timeline.ts               (Phase 4)
 */

import { createServiceClient } from '../lib/supabase/service'
import { readJsonFile } from './pipeline/utils'
import type {
  ActorProfile,
  KeyFigureProfile,
  EnrichedEvent,
  RawCapability,
} from './pipeline/types'
import type {
  ActorTableInsert,
  KeyFigureInsert,
  ActorCapabilityInsert,
} from '../lib/types/database'

const SCENARIO_NAME = 'Operation Epic Fury: Iran Conflict'
const SCENARIO_DESCRIPTION =
  'Ground truth timeline of the 2026 US-Israel joint strikes on Iran and the resulting regional conflict. ' +
  'Covers February 6, 2026 through present. Branch at any decision point to explore alternate histories.'

// ─────────────────────────────────────────────────────────────────────────────
// Pure builder functions (exported for testing)
// ─────────────────────────────────────────────────────────────────────────────

export function buildScenarioInsert(backgroundContextEnriched: string) {
  return {
    name: SCENARIO_NAME,
    description: SCENARIO_DESCRIPTION,
    category: 'geopolitical_conflict' as const,
    visibility: 'public' as const,
    background_context_enriched: backgroundContextEnriched,
    scenario_start_date: '2026-02-06',
  }
}

export function buildActorInsert(profile: ActorProfile, scenarioId: string): ActorTableInsert {
  return {
    id: profile.id,
    scenario_id: scenarioId,
    name: profile.name,
    short_name: profile.short_name,
    biographical_summary: profile.biographical_summary,
    leadership_profile: profile.leadership_profile,
    win_condition: profile.win_condition,
    strategic_doctrine: profile.strategic_doctrine,
    historical_precedents: profile.historical_precedents,
    initial_scores: profile.initial_scores as Record<string, unknown>,
    intelligence_profile: profile.intelligence_profile as Record<string, unknown>,
  }
}

export function buildKeyFigureInsert(figure: KeyFigureProfile, scenarioId: string): KeyFigureInsert {
  return {
    id: figure.id,
    scenario_id: scenarioId,
    actor_id: figure.actor_id,
    name: figure.name,
    title: figure.title,
    role: figure.role,
    biography: figure.biography,
    motivations: figure.motivations,
    decision_style: figure.decision_style,
    current_context: figure.current_context,
    relationships: (figure.relationships as Record<string, unknown>[] | null) as Record<string, unknown> | null,
    provenance: figure.provenance,
    source_note: figure.source_note ?? null,
    source_date: figure.source_date ?? null,
  }
}

export function buildCapabilityInsert(
  capability: RawCapability,
  scenarioId: string,
  actorId: string
): ActorCapabilityInsert {
  return {
    scenario_id: scenarioId,
    actor_id: actorId,
    category: capability.category,
    name: capability.name,
    description: capability.description,
    quantity: capability.quantity ?? null,
    unit: capability.unit ?? null,
    deployment_status: capability.deployment_status,
    lead_time_days: capability.lead_time_days ?? null,
    political_cost: capability.political_cost ?? null,
    temporal_anchor: capability.temporal_anchor,
    source_url: null,
    source_date: null,
  }
}

export function buildTurnCommitInsert(
  event: EnrichedEvent,
  branchId: string,
  parentCommitId: string | null,
  turnNumber: number
) {
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
    is_decision_point: event.decision_analysis.is_decision_point,
    deciding_actor_id: event.decision_analysis.deciding_actor_id ?? null,
    decision_summary: event.decision_analysis.decision_summary ?? null,
    decision_alternatives: event.decision_analysis.alternatives
      ? (event.decision_analysis.alternatives as unknown as Record<string, unknown>[])
      : null,
    escalation_rung_before: event.escalation.rung_before,
    escalation_rung_after: event.escalation.rung_after,
    escalation_direction: event.escalation.direction,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed orchestration
// ─────────────────────────────────────────────────────────────────────────────

interface SeedOptions {
  fromEventId?: string
  dryRun?: boolean
}

export async function seedIranScenario(options: SeedOptions = {}): Promise<{
  scenarioId: string
  branchId: string
  commitCount: number
}> {
  const { fromEventId, dryRun = false } = options

  // Load pipeline outputs
  const enrichedFile = await readJsonFile<{ events: EnrichedEvent[] }>('data/iran-enriched.json')
  const actorProfiles = await readJsonFile<ActorProfile[]>('data/actor-profiles.json')
  const keyFigures = await readJsonFile<KeyFigureProfile[]>('data/key-figures.json')

  // Load capabilities (best-effort — missing files are warnings, not errors)
  const capabilityFiles: Record<string, string> = {
    united_states: 'data/capabilities-us.json',
    iran: 'data/capabilities-iran.json',
    israel: 'data/capabilities-israel.json',
    russia: 'data/capabilities-russia-china.json',
    china: 'data/capabilities-russia-china.json',
    gulf_states: 'data/capabilities-gulf-states.json',
  }

  const allCapabilities: { actorId: string; capability: RawCapability }[] = []
  for (const [actorId, filePath] of Object.entries(capabilityFiles)) {
    try {
      const caps = await readJsonFile<RawCapability[]>(filePath)
      const filtered = actorId === 'russia' || actorId === 'china'
        ? caps.filter(c => (c as RawCapability & { actor?: string }).actor === actorId)
        : caps
      filtered.forEach(cap => allCapabilities.push({ actorId, capability: cap }))
    } catch {
      console.warn(`  ⚠ Capabilities file not found for ${actorId}: ${filePath} (skipping)`)
    }
  }

  const allEvents = enrichedFile.events
  const startIndex = fromEventId
    ? allEvents.findIndex(e => e.id === fromEventId)
    : 0

  if (fromEventId && startIndex === -1) {
    throw new Error(`--from event '${fromEventId}' not found in enriched timeline`)
  }

  const eventsToSeed = allEvents.slice(startIndex)
  const isAppend = !!fromEventId

  if (dryRun) {
    console.log(`[dry-run] Mode: ${isAppend ? 'append' : 'full drop-and-reseed'}`)
    console.log(`[dry-run] Events to seed: ${eventsToSeed.length}`)
    console.log(`[dry-run] Actors: ${actorProfiles.length}`)
    console.log(`[dry-run] Key figures: ${keyFigures.length}`)
    console.log(`[dry-run] Capabilities: ${allCapabilities.length}`)
    return { scenarioId: 'dry-run', branchId: 'dry-run', commitCount: eventsToSeed.length }
  }

  const supabase = createServiceClient()

  let scenarioId: string
  let branchId: string
  let parentCommitId: string | null = null
  let turnNumber = 1

  if (isAppend) {
    // Append mode: find existing scenario and branch head
    const { data: scenario } = await supabase
      .from('scenarios')
      .select('id, trunk_branch_id')
      .eq('name', SCENARIO_NAME)
      .single()

    if (!scenario) throw new Error('Cannot append: scenario not found. Run full seed first.')
    scenarioId = scenario.id
    branchId = scenario.trunk_branch_id as string

    const { data: headCommit } = await supabase
      .from('turn_commits')
      .select('id, turn_number')
      .eq('branch_id', branchId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single()

    parentCommitId = headCommit?.id ?? null
    turnNumber = (headCommit?.turn_number ?? 0) + 1
    console.log(`Appending to existing scenario ${scenarioId} from turn ${turnNumber}`)
  } else {
    // Full drop-and-reseed
    console.log('Dropping existing Iran scenario data...')
    const { data: existing } = await supabase
      .from('scenarios')
      .select('id')
      .eq('name', SCENARIO_NAME)

    for (const s of existing ?? []) {
      await supabase.from('actors').delete().eq('scenario_id', s.id)
      await supabase.from('key_figures').delete().eq('scenario_id', s.id)
      await supabase.from('actor_capabilities').delete().eq('scenario_id', s.id)
      await supabase.from('scenarios').delete().eq('id', s.id)
      console.log(`  ✓ Deleted scenario ${s.id}`)
    }

    // Build background context from first enriched event's context field
    const backgroundContext = allEvents[0]?.full_briefing?.context ??
      'Ground truth simulation of the 2026 Iran conflict beginning February 2026.'

    // Create scenario
    const { data: scenario, error: scenarioErr } = await supabase
      .from('scenarios')
      .insert(buildScenarioInsert(backgroundContext))
      .select()
      .single()

    if (scenarioErr || !scenario) throw new Error(`Failed to create scenario: ${scenarioErr?.message}`)
    scenarioId = scenario.id
    console.log(`✓ Created scenario: ${scenarioId}`)

    // Seed actors
    for (const profile of actorProfiles) {
      const { error } = await supabase.from('actors').insert(buildActorInsert(profile, scenarioId))
      if (error) console.warn(`  ⚠ Actor insert failed for ${profile.id}: ${error.message}`)
      else console.log(`  ✓ Actor: ${profile.id}`)
    }

    // Seed key figures
    for (const figure of keyFigures) {
      const { error } = await supabase.from('key_figures').insert(buildKeyFigureInsert(figure, scenarioId))
      if (error) console.warn(`  ⚠ Key figure insert failed for ${figure.id}: ${error.message}`)
      else console.log(`  ✓ Key figure: ${figure.name}`)
    }

    // Seed capabilities
    for (const { actorId, capability } of allCapabilities) {
      const { error } = await supabase
        .from('actor_capabilities')
        .insert(buildCapabilityInsert(capability, scenarioId, actorId))
      if (error) console.warn(`  ⚠ Capability insert failed (${actorId} / ${capability.name}): ${error.message}`)
    }
    console.log(`✓ Seeded ${allCapabilities.length} capabilities`)

    // Create ground truth trunk branch
    const { data: branch, error: branchErr } = await supabase
      .from('branches')
      .insert({
        scenario_id: scenarioId,
        name: 'Ground Truth Trunk',
        description: 'Verified real-world event timeline — Iran conflict from February 2026.',
        is_trunk: true,
        turn_timeframe: 'event-driven',
        game_mode: 'observer',
      })
      .select()
      .single()

    if (branchErr || !branch) throw new Error(`Failed to create branch: ${branchErr?.message}`)
    branchId = branch.id

    await supabase.from('scenarios').update({ trunk_branch_id: branchId }).eq('id', scenarioId)
    console.log(`✓ Created trunk branch: ${branchId}`)
  }

  // Seed turn commits
  console.log(`\nSeeding ${eventsToSeed.length} enriched events as turn commits...`)
  for (const event of eventsToSeed) {
    const insert = buildTurnCommitInsert(event, branchId, parentCommitId, turnNumber)
    const { data: commit, error } = await supabase
      .from('turn_commits')
      .insert(insert)
      .select('id')
      .single()

    if (error || !commit) {
      throw new Error(`Failed to create commit for ${event.id}: ${error?.message}`)
    }

    parentCommitId = commit.id
    turnNumber++
    console.log(`  ✓ [${turnNumber - 1}] ${event.id}`)
  }

  // Update branch head + scenario through date
  const lastEvent = eventsToSeed[eventsToSeed.length - 1]
  await supabase.from('branches').update({ head_commit_id: parentCommitId }).eq('id', branchId)
  await supabase.from('scenarios').update({ ground_truth_through_date: lastEvent.timestamp }).eq('id', scenarioId)

  console.log(`\n✓ Seed complete: ${eventsToSeed.length} events on trunk branch ${branchId}`)
  return { scenarioId, branchId, commitCount: eventsToSeed.length }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  seedIranScenario({ fromEventId, dryRun })
    .then(result => { console.log('Seed complete:', result); process.exit(0) })
    .catch(err => { console.error('Seed failed:', err); process.exit(1) })
}
```

- [ ] **Step 4: Run tests**

```bash
node_modules/.bin/vitest run tests/scripts/seed-iran.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Run all pipeline tests together**

```bash
node_modules/.bin/vitest run tests/scripts/
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-iran.ts tests/scripts/seed-iran.test.ts
git commit -m "feat: rewrite seed-iran.ts to populate actors, key_figures, actor_capabilities, enriched turn_commits"
```

---

## Execution Order Reference

```
Phase 1 (automated):  bun run scripts/extract-timeline.ts
                      → HUMAN REVIEW: data/iran-timeline-raw.json (30 min)

Phase 2 (user runs):  9 research calls per docs/Iran Research/research-prompts.md
                      → save to data/capabilities-*.json + data/relationship-*.json

Phase 3 (automated):  bun run scripts/generate-profiles.ts
                      → outputs data/actor-profiles.json + data/key-figures.json

Phase 4 (automated):  bun run scripts/enrich-timeline.ts
                      → pauses after first 10 events for quality review
                      → bun run scripts/enrich-timeline.ts --from=<id> --no-pause

Seed:                 bun run scripts/seed-iran.ts
                      → drops existing, populates all new tables
```

---

## Self-Review

**Spec coverage check:**
- ✅ Section 1 — all three new tables created (Task 2), TypeScript types added (Task 3)
- ✅ Section 1 — TurnCommitRow extended with all 12 new columns (Task 3)
- ✅ Section 1 — ScenarioRow extended with 3 new columns (Task 3)
- ✅ Section 1 — Netanyahu-Trump relationship modeled in key_figures relationships JSONB
- ✅ Section 2 — Phase 1 extract-timeline.ts (Task 5)
- ✅ Section 2 — Phase 2 user research calls documented (docs/Iran Research/research-prompts.md — pre-existing)
- ✅ Section 2 — Phase 3 generate-profiles.ts (Task 6)
- ✅ Section 2 — Phase 4 enrich-timeline.ts with quality checkpoint (Task 7)
- ✅ Section 3 — Decision alternatives seeded via enrich-timeline, stored in decision_alternatives JSONB
- ✅ Section 4 — --from= flag on both enrich-timeline.ts and seed-iran.ts for incremental updates
- ✅ Branching from ground truth: decision_alternatives pre-seeded in turn_commits
- ✅ Drop-and-reseed: seed-iran.ts deletes existing scenario by name before inserting
- ✅ data/ gitignored: Task 1
- ✅ Context chain architecture: buildContextChainString in utils.ts, threaded through enrich-timeline.ts
- ✅ Temporal anchor: enforced in buildActorProfilePrompt and buildKeyFigurePrompt
