# Iran Research Incorporation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporate verified Iran research docs into a seeded ground truth trunk, extend the pipeline with a `verifiedContext` skip path, and add cache-key infrastructure for shared commit reuse.

**Architecture:** Verified actor state and ~25-35 events are encoded in `lib/scenarios/iran/` as TypeScript constants, then a seed script chains them through `applyEventImpact()` to produce immutable `turn_commits` in Supabase. The pipeline gains an optional `verifiedContext` param that skips stages 1-4 and injects verified data into stages 5-6. A standalone `computeCacheKey()` utility is added now for use by the game loop (Issue #17).

**Tech Stack:** TypeScript, Supabase (postgres), Vitest, `bun`, `@anthropic-ai/sdk`, `crypto.createHash`

**Spec:** `docs/superpowers/specs/2026-03-22-iran-research-incorporation-design.md`

**Research source docs (READ THESE before Tasks 5-6):**
- `docs/Iran Research/research-military.md`
- `docs/Iran Research/research-political.md`
- `docs/Iran Research/research-economic.md`

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `lib/scenarios/iran/initial-state.ts` | Verified actor state snapshot at Feb 27, 2026 (pre-Epic Fury) |
| `lib/scenarios/iran/events.ts` | ~25-35 verified events with impacts, escalation changes, constraint refs |
| `lib/scenarios/iran/index.ts` | Barrel export |
| `lib/game/cache-key.ts` | `computeCacheKey(parentCommitId, actorDecisions[])` utility |
| `scripts/seed-iran.ts` | One-shot script: creates scenario → trunk → commits from events |
| `supabase/migrations/20260322000000_trunk_caching.sql` | Adds `current_divergence` to branches; `cache_key`, `reuse_count` to turn_commits |
| `tests/game/cache-key.test.ts` | Unit tests for cache key determinism |
| `tests/scripts/seed-iran.test.ts` | Integration smoke test for seed script output shape |

### Modified files
| File | Change |
|---|---|
| `lib/types/simulation.ts` | Add `VerificationStatus`, `SeedEvent`; add `verificationStatus?` to `Event` and `EventImpact` |
| `lib/types/database.ts` | Add `current_divergence`, `cache_key`, `reuse_count` to branch/commit DB types |
| `lib/ai/research-pipeline.ts` | Add `verifiedContext?: string` param; skip stages 1-4 when present |
| `app/api/scenarios/[id]/research/populate/route.ts` | Accept `verifiedContext` from request body |
| `tests/api/research-pipeline.test.ts` | Add tests for verifiedContext skip behavior |

### Docs/issues (Task 1 — before code tasks begin)
`docs/prd.md`, `docs/research-pipeline.md`, `docs/api-routes.md`, `docs/geosim-data-model.ts`, `docs/agent-architecture.ts`, `docs/scrum-issues.md`, `.claude/skills/seed-iran-scenario.md`, GitHub issues #8, #37, new issue

---

## Task 1: Documentation, issues, and skill updates

**Files:**
- Modify: `docs/prd.md`
- Modify: `docs/research-pipeline.md`
- Modify: `docs/api-routes.md`
- Modify: `docs/geosim-data-model.ts`
- Modify: `docs/agent-architecture.ts`
- Modify: `docs/scrum-issues.md`
- Modify: `.claude/skills/seed-iran-scenario.md`

- [ ] **Step 1: Check for existing GitHub issues to avoid duplicates**

```bash
gh issue list --label "ai-pipeline" --state open
gh issue list --search "iran research incorporation" --state open
```

Verify no existing issue for Iran research incorporation before creating.

- [ ] **Step 2: Create new GitHub issue for Iran research incorporation**

```bash
gh issue create \
  --title "feat: Iran research incorporation and ground truth trunk" \
  --label "sprint-1,P0-critical,ai-pipeline,game-logic" \
  --assignee "@me" \
  --milestone "Sprint 1: Foundation" \
  --body "$(cat <<'EOF'
## Description
Incorporates verified Iran research docs into the simulation as a seeded
ground truth trunk. Adds verifiedContext pipeline variant, shared commit
caching infrastructure, and branchDivergence for grounding decay.

Spec: \`docs/superpowers/specs/2026-03-22-iran-research-incorporation-design.md\`
Plan: \`docs/superpowers/plans/2026-03-22-iran-research-incorporation.md\`

## Key changes
- \`lib/scenarios/iran/\` — verified actor state + ~25-35 events as TypeScript constants
- \`scripts/seed-iran.ts\` — CLI script that chains events → Supabase turn_commits (one per event)
- \`lib/game/cache-key.ts\` — SHA-256 cache key for shared commit tree
- \`lib/ai/research-pipeline.ts\` — optional \`verifiedContext\` param skips stages 1-4
- DB migration: \`current_divergence\` on branches, \`cache_key\`/\`reuse_count\` on turn_commits

## Acceptance criteria
- [ ] \`bun run scripts/seed-iran.ts\` creates trunk with ~25-35 commits, all \`is_ground_truth: true\`
- [ ] All verified fields have \`verificationStatus: 'verified'\`
- [ ] \`runPopulatePipeline\` skips stages 1-4 when \`verifiedContext\` provided
- [ ] \`computeCacheKey\` is deterministic and order-independent (7 tests pass)
- [ ] \`--from\` flag appends without re-seeding
- [ ] \`branchDivergence\` passed to actor-agent and resolution-engine calls
- [ ] All existing tests still pass
- [ ] TypeScript strict mode: zero errors
EOF
)"
```

Save the returned issue number (e.g. `#45`) — you will use it in Step 10.

- [ ] **Step 3: Add comment to Issue #8 noting verifiedContext addition**

```bash
gh issue comment 8 --body "Note: \`lib/ai/research-pipeline.ts\` will receive an optional \`verifiedContext?: string\` parameter as part of Issue #<NEW_ISSUE_NUMBER> (Iran research incorporation). When present, stages 1-4 are skipped and the verified context is injected into stages 5-6. The existing unverified pipeline (no \`verifiedContext\`) is unchanged."
```

- [ ] **Step 4: Add comment to Issue #37 noting the seed script approach**

```bash
gh issue comment 37 --body "Updated acceptance criteria: the Iran scenario is now seeded via \`bun run scripts/seed-iran.ts\` (not the HTTP pipeline). This script chains verified events from \`lib/scenarios/iran/events.ts\` through \`applyEventImpact()\` to produce one \`turn_commit\` per event on the ground truth trunk. See spec: \`docs/superpowers/specs/2026-03-22-iran-research-incorporation-design.md\` and Issue #<NEW_ISSUE_NUMBER>."
```

- [ ] **Step 5: Update `docs/prd.md` — Section 13.1**

Add to the "Ground Truth Trunk" section:

> **Update mechanism (MVP):** Add new event to `lib/scenarios/iran/events.ts`, run `bun run scripts/seed-iran.ts --from=<last_event_id>`. Appends only new commits from that event forward. Existing user branches are unaffected.
>
> **User notification:** When a branch is behind trunk HEAD, users see the trunk advance count and options: continue their branch, fork from updated trunk, or compare timelines.

- [ ] **Step 6: Update `docs/research-pipeline.md`**

Add a "Verified Context Variant" section describing:
- `verifiedContext` optional param on `runPopulatePipeline`
- Which stages are skipped when present (1-4)
- Which stages still run (5-6) and how they use the context
- When to use it (seeded/verified scenarios only)

- [ ] **Step 7: Update `docs/api-routes.md`**

In the `POST /api/scenarios/[id]/research/populate` entry, add:
```
Optional body field: verifiedContext?: string
  — When present, skips stages 1-4 and injects into stages 5-6.
  — Used for pre-seeded verified scenarios (Iran).
```

In the `POST /api/scenarios/[id]/research/update-trunk` entry, add detail about the MVP manual process.

- [ ] **Step 8: Update `docs/geosim-data-model.ts`**

Add `VerificationStatus` type and update `Event`, `EventImpact`, `SeedEvent` to match the implementation.

Add `current_divergence: number` to the `ScenarioBranch` interface (the DB column mirrors the TypeScript field).

Also add `branchDivergence` as a field in the `ScenarioBranch` TypeScript interface to reflect the computed value passed to agents:

```typescript
interface ScenarioBranch {
  // ... existing fields ...
  current_divergence: number   // stored in DB; updated each turn
  // branchDivergence is derived from current_divergence and passed to agents —
  // it is not a separate stored field but documents the intent
}
```

- [ ] **Step 9: Update `docs/agent-architecture.ts`**

Add `branchDivergence` to the `GameConfig` / `ActorAgentContext` interfaces and document its effect on web search behavior.

- [ ] **Step 10: Update `docs/scrum-issues.md`**

Add new issue entry (use the issue number from Step 2):

```markdown
**Issue #<NEW_ISSUE_NUMBER>: Iran research incorporation and ground truth trunk**
Labels: sprint-1, P0-critical, ai-pipeline, game-logic
Assignee: @partner-b
Milestone: Sprint 1

## Description
Incorporates verified Iran research docs into the simulation as a seeded
ground truth trunk. Adds verifiedContext pipeline variant, shared commit
caching infrastructure, and branchDivergence for grounding decay.

## Acceptance criteria
- [ ] seed-iran.ts creates trunk with ~25-35 commits, all is_ground_truth: true
- [ ] All verified fields have verificationStatus: 'verified'
- [ ] runPopulatePipeline skips stages 1-4 when verifiedContext provided
- [ ] computeCacheKey is deterministic and order-independent
- [ ] --from flag appends without re-seeding
- [ ] branchDivergence passed to actor-agent and resolution-engine calls
- [ ] All existing tests still pass
```

Add to Issue #8 notes: `lib/ai/research-pipeline.ts` receives a `verifiedContext` param in Issue #<NEW_ISSUE_NUMBER>.

Update Issue #37 acceptance criteria to reference this spec and seed script.

- [ ] **Step 11: Update `.claude/skills/seed-iran-scenario.md`**

Replace the entire file content with the new seed script approach. The old skill described running the HTTP pipeline (POST to `/api/scenarios`, polling `/research/status`, etc.). The new approach uses a CLI script:

```markdown
---
name: seed-iran-scenario
description: Use when populating the Iran conflict scenario into Supabase by running the seed script that chains verified events into turn commits on the ground truth trunk
---

## Description
Run `scripts/seed-iran.ts` to seed the Iran conflict ground truth trunk into Supabase.
The script chains verified events from `lib/scenarios/iran/events.ts` through
`applyEventImpact()` to produce one immutable `turn_commit` per event.

## Prerequisites
- Supabase is running (local or remote) with migrations applied, including
  `supabase/migrations/20260322000000_trunk_caching.sql`
- `ANTHROPIC_API_KEY` set in `.env.local` (used for stages 5-6: escalation ladders + fog-of-war)
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`

## Usage

### Full seed (first time)
```bash
bun run scripts/seed-iran.ts
```
Creates the scenario record, ground truth trunk branch, and one `turn_commit` per
verified event (~25-35 commits). Sets `is_ground_truth: true` on all commits.

### Append new events (after adding to `lib/scenarios/iran/events.ts`)
```bash
bun run scripts/seed-iran.ts --from=<event_id>
```
Finds the commit for `<event_id>`, uses its `scenario_snapshot` as starting state,
and appends only events that come after it. Existing user branches are unaffected.

### Dry run (validate without writing to Supabase)
```bash
bun run scripts/seed-iran.ts --dry-run
```

## Steps

### 1. Verify environment
```bash
bun run typecheck   # confirm no type errors before seeding
```
Check `.env.local` has all three required vars.

### 2. Apply the trunk caching migration (if not yet applied)
```bash
supabase db push
```
The migration adds `current_divergence` to `branches` and `cache_key`/`reuse_count`
to `turn_commits`.

### 3. Run the seed script
```bash
bun run scripts/seed-iran.ts
```
Expected output:
```
✓ Seeded N events as turn commits on trunk branch <branch-id>
Seed complete: { scenarioId: '...', branchId: '...', commitCount: N }
```

### 4. Verify commits in Supabase
Query the `turn_commits` table for the trunk branch. Verify:
- [ ] `N` rows exist (one per event)
- [ ] All have `is_ground_truth: true`
- [ ] `simulated_date` values are chronologically ordered
- [ ] `scenario_snapshot` is non-null on each row

### 5. Verify scenario is playable
- Navigate to `/scenarios/{SCENARIO_ID}/play/{BRANCH_ID}` in the browser
- Confirm map shows Middle East with actor colors
- Confirm actors panel shows all 8+ actors with correct escalation rungs

## Constraints
- Never re-seed over an existing trunk — create a new scenario record instead
- Do not commit `.env.local` after running
- The `--from` flag uses a substring match on `narrative_entry` — if the event id
  is not found, the script will fall back to full re-seed from the initial state
- Research pipeline stages 5-6 (escalation ladders + fog-of-war) run with
  `verifiedContext` injected — results may vary; verify key facts against
  `docs/Iran Research/` ground truth documents after seeding
```

- [ ] **Step 12: Commit**

```bash
git add docs/ .claude/skills/seed-iran-scenario.md
git commit -m "docs: update docs, GitHub issues, and seed skill for Iran research incorporation"
```

---

## Task 2: TypeScript type additions

**Files:**
- Modify: `lib/types/simulation.ts`

- [ ] **Step 1: Add `VerificationStatus` and update `Event` / `EventImpact`**

Open `lib/types/simulation.ts`. Add after the existing type aliases near the top:

```typescript
// Provenance of a fact — how was it established?
export type VerificationStatus = 'verified' | 'researched' | 'inferred'
```

In the `Event` interface, add one optional field:
```typescript
verificationStatus?: VerificationStatus
```

In the `EventImpact` interface, add:
```typescript
verificationStatus?: VerificationStatus
```

Add a `SeedEvent` type (used by seed data files):
```typescript
// A seed event is a verified Event with verificationStatus required
export type SeedEvent = Event & { verificationStatus: VerificationStatus }
```

- [ ] **Step 2: Verify typecheck passes**

```bash
bun run typecheck
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types/simulation.ts
git commit -m "feat: add VerificationStatus type and SeedEvent to simulation types"
```

---

## Task 3: Database migration

**Files:**
- Create: `supabase/migrations/20260322000000_trunk_caching.sql`
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260322000000_trunk_caching.sql

-- Track how many turns a branch has diverged from the ground truth trunk.
-- Updated by the game loop controller at each turn start.
alter table branches
  add column current_divergence integer not null default 0;

-- Shared commit caching: cache_key enables commit reuse across branches
-- that made identical decisions from the same parent.
alter table turn_commits
  add column cache_key text,
  add column reuse_count integer not null default 0;

-- Index for fast cache lookups during turn resolution
create index idx_turn_commits_cache_key on turn_commits(cache_key)
  where cache_key is not null;
```

- [ ] **Step 2: Add types to `lib/types/database.ts`**

Find the `Branch` row type (look for the interface that mirrors the `branches` table) and add:
```typescript
current_divergence: number
```

Find the `TurnCommit` row type and add:
```typescript
cache_key: string | null
reuse_count: number
```

- [ ] **Step 3: Verify typecheck**

```bash
bun run typecheck
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260322000000_trunk_caching.sql lib/types/database.ts
git commit -m "feat: add current_divergence to branches and cache_key/reuse_count to turn_commits"
```

---

## Task 4: Cache key utility (TDD)

**Files:**
- Create: `lib/game/cache-key.ts`
- Create: `tests/game/cache-key.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/game/cache-key.test.ts
import { describe, it, expect } from 'vitest'
import { computeCacheKey } from '../../lib/game/cache-key'

const baseDecisions = [
  { actorId: 'iran', decisionId: 'close_strait', selectedProfileId: 'full_closure', parameters: { timing: 'immediate' } },
  { actorId: 'united_states', decisionId: 'air_campaign', selectedProfileId: 'surgical', parameters: { scale: 'limited' } },
]

describe('computeCacheKey', () => {
  it('returns a non-empty string', () => {
    const key = computeCacheKey('parent-123', baseDecisions)
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(0)
  })

  it('is deterministic — same inputs produce same key', () => {
    const key1 = computeCacheKey('parent-123', baseDecisions)
    const key2 = computeCacheKey('parent-123', baseDecisions)
    expect(key1).toBe(key2)
  })

  it('is order-independent — actor submission order does not matter', () => {
    const reversed = [...baseDecisions].reverse()
    const key1 = computeCacheKey('parent-123', baseDecisions)
    const key2 = computeCacheKey('parent-123', reversed)
    expect(key1).toBe(key2)
  })

  it('changes when parent commit changes', () => {
    const key1 = computeCacheKey('parent-123', baseDecisions)
    const key2 = computeCacheKey('parent-456', baseDecisions)
    expect(key1).not.toBe(key2)
  })

  it('changes when any decision changes', () => {
    const modified = [
      { ...baseDecisions[0], selectedProfileId: 'selective_closure' },
      baseDecisions[1],
    ]
    const key1 = computeCacheKey('parent-123', baseDecisions)
    const key2 = computeCacheKey('parent-123', modified)
    expect(key1).not.toBe(key2)
  })

  it('changes when parameters change', () => {
    const modified = [
      { ...baseDecisions[0], parameters: { timing: 'delayed' } },
      baseDecisions[1],
    ]
    const key1 = computeCacheKey('parent-123', baseDecisions)
    const key2 = computeCacheKey('parent-123', modified)
    expect(key1).not.toBe(key2)
  })

  it('changes when an actor is added or removed from the decision set', () => {
    const withExtra = [
      ...baseDecisions,
      { actorId: 'israel', decisionId: 'air_strike', selectedProfileId: 'surgical', parameters: {} },
    ]
    const key1 = computeCacheKey('parent-123', baseDecisions)
    const key2 = computeCacheKey('parent-123', withExtra)
    expect(key1).not.toBe(key2)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/game/cache-key.test.ts
```
Expected: FAIL — `computeCacheKey` not found.

- [ ] **Step 3: Implement**

```typescript
// lib/game/cache-key.ts
import { createHash } from 'crypto'

interface ActorDecision {
  actorId: string
  decisionId: string
  selectedProfileId: string | null
  parameters: Record<string, unknown>
}

/**
 * Compute a deterministic cache key for a resolved turn.
 * Order-independent: actor submission order does not affect the key.
 * Used to identify whether an identical turn has already been computed
 * by another branch, enabling commit reuse without re-calling the AI.
 */
export function computeCacheKey(
  parentCommitId: string,
  actorDecisions: ActorDecision[]
): string {
  // Sort by actorId so submission order doesn't matter
  const sorted = [...actorDecisions].sort((a, b) =>
    a.actorId.localeCompare(b.actorId)
  )

  const payload =
    parentCommitId +
    '|' +
    sorted
      .map(
        d =>
          `${d.actorId}:${d.decisionId}:${d.selectedProfileId ?? 'null'}:${JSON.stringify(d.parameters)}`
      )
      .join('|')

  return createHash('sha256').update(payload).digest('hex')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun run test -- --run tests/game/cache-key.test.ts
```
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/game/cache-key.ts tests/game/cache-key.test.ts
git commit -m "feat: add computeCacheKey utility for shared commit tree caching"
```

---

## Task 5: Iran initial state seed data

**Files:**
- Create: `lib/scenarios/iran/initial-state.ts`

> **Before writing this file**, read `docs/Iran Research/research-military.md`, `research-political.md`, and `research-economic.md` in full. Extract the specific numbers listed below. The state represents Feb 27, 2026 — one day before Operation Epic Fury begins.

- [ ] **Step 1: Create the initial state file**

The file exports one constant: `IRAN_INITIAL_STATE`. It is a partial object that matches the structure of `Scenario` from `lib/types/simulation.ts` but only populates fields where verified data exists.

Key verified values to include (cross-reference with research docs):

**United States:**
- `military.overallReadiness`: 82
- `military.assets`: Patriot PAC-3 (~500), THAAD (7 systems), F-35A/F-15E (~240), Tomahawk (~700), B-2 (20), carrier strike groups (2 deployed)
- `economic.overallHealth`: 62, `warCostTolerance`: 70
- `political.influenceChannels`: `general_public` (supportForCurrentPolicy: 44, policyInfluence: 25), `israel_lobby` (supportForCurrentPolicy: 95, policyInfluence: 82), `defense_establishment` (supportForCurrentPolicy: 60, policyInfluence: 70)
- `political.policyDisconnect`: gapSeverity: 38 (pre-conflict, will grow), bipartisanConsensus: true
- `keyFigures`: Trump (hawk, active), Rubio (pragmatist, active), Hegseth (hawk, active)
- `constraints`: `{ description: 'No ground invasion without AUMF or major trigger', status: 'active', severity: 'soft' }`

**Iran:**
- `military.overallReadiness`: 72 (pre-strikes — this is the starting state before Epic Fury)
- `military.assets`: Shahed-136 (~3000), ballistic missiles (~3000), air defense (S-300 batteries), naval mines (stockpile)
- `military.nuclear`: capability: 'threshold', estimatedWarheads: null, constraints: ['Ayatollah fatwa', 'deterrence', 'international isolation']
- `economic.overallHealth`: 28, sanctionsExposure: 85, warCostTolerance: 65
- `economic.energyInfrastructure`: Kharg Island (90% of exports), Strait of Hormuz (open), oilProductionCapacity: '3.4M bbl/day'
- `political.regimeStability`: 72, leadershipCohesion: 78
- `keyFigures`: Khamenei (supreme leader, active), Mojtaba Khamenei (IRGC-adjacent, active), Pezeshkian (president, pragmatist)
- `constraints`: `{ description: "Religious prohibition on nuclear weapons (Ayatollah's fatwa)", status: 'active', severity: 'hard' }`, `{ description: 'Nuclear deterrence — attack not yet happened', status: 'active', severity: 'soft' }`

**Israel:**
- `military.overallReadiness`: 78
- `economic.overallHealth`: 58, warCostTolerance: 55
- `constraints`: `{ description: 'March 31 budget deadline — multi-front war threatens budget passage', status: 'active', severity: 'soft' }`
- `keyFigures`: Netanyahu (hawk, active), Gallant (pragmatist, active)

**Russia:**
- escalation rung: 1 (observer/opportunist)
- `intelligence.intelSharingPartners`: `[{ actorId: 'iran', description: 'Providing US movement data and satellite imagery' }]`

**China:**
- escalation rung: 1 (strategic patience)
- `economic.keyLeverages`: ['yuan-for-oil agreements', 'BRI infrastructure', 'semiconductor exports to Iran']

**Gulf States (composite — Saudi Arabia, UAE, Qatar, Bahrain):**
- escalation rung: 2
- `diplomatic.internationalStanding`: 65
- Pre-conflict: still hosting US forces but reviewing commitments

**Global state:**
- `oilPricePerBarrel`: 71 (EIA Feb 27, 2026 pre-conflict)
- `globalStabilityIndex`: 52
- `criticalAssets`: Strait of Hormuz (open), Kharg Island (operational), Ras Tanura (operational), Abqaiq (operational)

```typescript
// lib/scenarios/iran/initial-state.ts
// Verified snapshot of the Iran conflict scenario on Feb 27, 2026
// (one day before Operation Epic Fury begins)
// Source: docs/Iran Research/research-military.md, research-political.md, research-economic.md
// All numeric values are verified from research documents — do not change without updating source docs

import type { Actor, Scenario } from '../../types/simulation'

// ... (populate from research docs — see key values above)
export const IRAN_INITIAL_STATE: Omit<Scenario, 'id' | 'phases' | 'currentPhaseId' | 'eventHistory'> & {
  actors: Omit<Actor, 'intelligencePicture'>[]
} = {
  name: 'US-Israel-Iran Conflict 2025–2026',
  description: 'The ongoing conflict beginning with Operation Epic Fury on Feb 28, 2026...',
  timestamp: '2026-02-27T00:00:00Z',
  backgroundContext: 'One day before joint US-Israel strikes began. Iran had agreed to transfer enriched uranium abroad per Oman-brokered talks announced Feb 26.',
  // ... actors, relationships, globalState
}
```

- [ ] **Step 2: Verify typecheck**

```bash
bun run typecheck
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/scenarios/iran/initial-state.ts
git commit -m "feat: add verified Iran initial state seed data (Feb 27 2026)"
```

---

## Task 6: Iran events seed data

**Files:**
- Create: `lib/scenarios/iran/events.ts`

> **Read `docs/Iran Research/research-military.md` sections on the timeline before writing this file.** The events must be chronologically ordered and sourced from the research docs.

- [ ] **Step 1: Create events file**

Each event must include: `id`, `timestamp`, `title`, `description`, `initiatedBy`, `targetedActors`, `dimension`, `impacts[]`, `verificationStatus: 'verified'`, and where applicable `escalationChanges[]`, `intelConsequences[]`.

Required events (minimum set — add more from research docs):

```typescript
// lib/scenarios/iran/events.ts
import type { SeedEvent } from '../../types/simulation'

export const IRAN_EVENTS: SeedEvent[] = [
  // Phase 2: Interwar period
  {
    id: 'evt_oman_talks_feb6',
    timestamp: '2026-02-06T00:00:00Z',
    title: 'Oman indirect nuclear talks begin',
    description: 'Indirect nuclear talks between US and Iran resume via Oman intermediaries.',
    initiatedBy: 'united_states',
    targetedActors: ['iran'],
    dimension: 'diplomatic',
    verificationStatus: 'verified',
    impacts: [],
  },
  {
    id: 'evt_oman_breakthrough_feb26',
    timestamp: '2026-02-26T00:00:00Z',
    title: 'Oman FM announces "breakthrough within reach"',
    description: 'Oman Foreign Minister announces Iran agreed to transfer enriched uranium abroad and accept full IAEA verification.',
    initiatedBy: 'gulf_states',
    targetedActors: ['iran', 'united_states'],
    dimension: 'diplomatic',
    verificationStatus: 'verified',
    impacts: [],
  },
  // Phase 3: Operation Epic Fury
  {
    id: 'evt_epic_fury_begins',
    timestamp: '2026-02-28T00:00:00Z',
    title: 'Operation Epic Fury begins: 900 strikes in 12 hours',
    description: 'Joint US-Israel strike package hits Iranian leadership, military infrastructure, and nuclear facilities. Over 900 precision strikes in 12 hours.',
    initiatedBy: 'united_states',
    targetedActors: ['iran'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'iran', dimension: 'military', field: 'overallReadiness', previousValue: 72, newValue: 35, description: 'Severe degradation from coordinated strikes', magnitude: 'critical', verificationStatus: 'verified' },
    ],
    escalationChanges: [
      { actorId: 'united_states', previousRung: 4, newRung: 5, rationale: 'Full-scale air campaign launched' },
      { actorId: 'iran', previousRung: 3, newRung: 6, rationale: 'Responding to existential strikes' },
    ],
  },
  {
    id: 'evt_khamenei_killed',
    timestamp: '2026-02-28T06:00:00Z',
    title: 'Ayatollah Khamenei killed in bunker strike',
    description: 'Supreme Leader Ayatollah Ali Khamenei killed in precision bunker strike. Netanyahu shared Khamenei location with Trump on Feb 23.',
    initiatedBy: 'united_states',
    targetedActors: ['iran'],
    dimension: 'political',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'iran', dimension: 'political', field: 'leadershipCohesion', previousValue: 78, newValue: 45, description: 'Supreme leader killed — temporary leadership vacuum', magnitude: 'critical', verificationStatus: 'verified' },
    ],
    escalationChanges: [],
    intelConsequences: [
      { actorId: 'iran', revealed: 'Khamenei bunker location compromised — IRGC now dispersing leadership' },
    ],
  },
  {
    id: 'evt_mojtaba_assumes_power',
    timestamp: '2026-02-28T18:00:00Z',
    title: 'Mojtaba Khamenei assumes power, declares martyrdom',
    description: 'Mojtaba Khamenei appears on state TV flanked by IRGC commanders, declares his father a martyr and promises retaliation.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'political',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'iran', dimension: 'political', field: 'regimeStability', previousValue: 55, newValue: 68, description: 'Martyrdom narrative unifies regime — decapitation backfires', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_strait_closure_day2',
    timestamp: '2026-03-01T00:00:00Z',
    title: 'Strait of Hormuz closure announced (Day 2)',
    description: 'IRGC commander announces Strait of Hormuz closed to all non-allied shipping.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'gulf_states'],
    dimension: 'economic',
    verificationStatus: 'verified',
    impacts: [
      { actorId: '__global__', dimension: 'economic', field: 'oilPricePerBarrel', previousValue: 71, newValue: 104, description: 'Strait closure triggers oil spike', magnitude: 'critical', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_first_drone_swarm_day3',
    timestamp: '2026-03-02T00:00:00Z',
    title: 'First Shahed drone swarm: 340 drones, 89% intercepted (Day 3)',
    description: '340 Shahed-136 drones launched at Israeli air bases and US positions. 89% intercepted but US expended ~200 Patriot missiles.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'military', field: 'overallReadiness', previousValue: 82, newValue: 78, description: 'Air defense reserve drawdown begins', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_irgc_mosaic_day3',
    timestamp: '2026-03-02T12:00:00Z',
    title: 'IRGC mosaic defense activates: 31 autonomous commands (Day 3)',
    description: 'IRGC activates decentralized mosaic defense — 31 autonomous commands operating independently. Decapitation strikes have limited effect.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [],
    intelConsequences: [
      { actorId: 'united_states', concealed: 'IRGC command structure far more resilient than assessed — 31 autonomous nodes now operational' },
    ],
  },
  {
    id: 'evt_ras_tanura_day5',
    timestamp: '2026-03-04T00:00:00Z',
    title: 'Ras Tanura facility struck: Saudi oil output -15% (Day 5)',
    description: 'Iranian ballistic missiles strike Ras Tanura oil processing facility. Saudi oil output reduced 15%.',
    initiatedBy: 'iran',
    targetedActors: ['gulf_states'],
    dimension: 'economic',
    verificationStatus: 'verified',
    impacts: [
      { actorId: '__global__', dimension: 'economic', field: 'oilPricePerBarrel', previousValue: 104, newValue: 118, description: 'Saudi output disruption adds to oil pressure', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_air_defense_60pct_day6',
    timestamp: '2026-03-05T00:00:00Z',
    title: 'US air defense reserves cross 60% threshold (Day 6)',
    description: 'Sustained drone attrition depletes US Patriot reserves below 60%. Pentagon begins resupply planning.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'military', field: 'overallReadiness', previousValue: 78, newValue: 72, description: 'Air defense reserves critically depleting', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_thaad_day8',
    timestamp: '2026-03-07T00:00:00Z',
    title: 'THAAD systems: 4 of 7 destroyed (Day 8)',
    description: 'Precision Iranian strikes destroy 4 of 7 THAAD systems. Remaining coverage creates gaps in upper-tier defense.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'military', field: 'overallReadiness', previousValue: 72, newValue: 65, description: 'THAAD coverage severely degraded', magnitude: 'critical', verificationStatus: 'verified' },
    ],
    intelConsequences: [
      { actorId: 'iran', revealed: 'THAAD positions confirmed via satellite — 3 remaining operational units identified' },
    ],
  },
  {
    id: 'evt_kent_resignation_day10',
    timestamp: '2026-03-09T00:00:00Z',
    title: 'Joe Kent resignation (Day 10)',
    description: 'Director of Counterterrorism Joe Kent resigns, publicly stating the war serves Israel\'s interests, not America\'s.',
    initiatedBy: 'united_states',
    targetedActors: [],
    dimension: 'political',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'political', field: 'leadershipCohesion', previousValue: 72, newValue: 65, description: 'Public dissent fractures administration', magnitude: 'moderate', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_oil_142_day12',
    timestamp: '2026-03-11T00:00:00Z',
    title: 'Oil hits $142/bbl (Day 12)',
    description: 'Sustained Strait closure and Ras Tanura disruption push oil to $142/barrel.',
    initiatedBy: '__global__',
    targetedActors: ['gulf_states', 'united_states'],
    dimension: 'economic',
    verificationStatus: 'verified',
    impacts: [
      { actorId: '__global__', dimension: 'economic', field: 'oilPricePerBarrel', previousValue: 118, newValue: 142, description: 'Oil at $142/bbl — global economic pressure', magnitude: 'critical', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_gulf_statement_day12',
    timestamp: '2026-03-11T12:00:00Z',
    title: 'Gulf States joint statement criticizing US (Day 12)',
    description: 'UAE, Saudi Arabia, Qatar, and Bahrain issue joint statement criticizing US military operations and calling for immediate ceasefire.',
    initiatedBy: 'gulf_states',
    targetedActors: ['united_states'],
    dimension: 'diplomatic',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'diplomatic', field: 'allianceStrength', previousValue: 58, newValue: 45, description: 'Gulf alliance fraying under war pressure', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_iraqi_militia_day14',
    timestamp: '2026-03-13T00:00:00Z',
    title: 'Iraqi militia activation: 300+ attacks on US forces (Day 14)',
    description: 'Islamic Resistance in Iraq activates, launching 300+ rocket and drone attacks on US bases across Iraq and Syria.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'military', field: 'overallReadiness', previousValue: 65, newValue: 60, description: 'Secondary front opens — forces pinned down in Iraq/Syria', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_china_yuan_oil_day15',
    timestamp: '2026-03-14T00:00:00Z',
    title: 'China increases yuan-for-oil agreements (Day 15)',
    description: 'China announces expanded yuan-denominated oil purchase agreements with Gulf states and Iran, accelerating petrodollar erosion.',
    initiatedBy: 'china',
    targetedActors: ['united_states'],
    dimension: 'economic',
    verificationStatus: 'verified',
    impacts: [],
  },
  {
    id: 'evt_russia_ukraine_day16',
    timestamp: '2026-03-15T00:00:00Z',
    title: 'Russia accelerates Ukraine offensive (Day 16)',
    description: 'Russia launches major offensive operations in Ukraine, exploiting US attention and resources diverted to Middle East.',
    initiatedBy: 'russia',
    targetedActors: ['united_states'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [],
  },
  {
    id: 'evt_nuclear_cascade_day17',
    timestamp: '2026-03-16T00:00:00Z',
    title: 'Nuclear breakout cascade: 2 of 3 constraints removed (Day 17)',
    description: 'Ayatollah death removed religious prohibition; ongoing attack removed deterrence constraint. Only international isolation risk remains. Nuclear breakout now rational from Iran\'s perspective.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'military',
    verificationStatus: 'verified',
    impacts: [],
  },
  {
    id: 'evt_us_support_31pct_day18',
    timestamp: '2026-03-17T00:00:00Z',
    title: 'US domestic support drops to 31% (Day 18)',
    description: 'Polling shows US public support for the war drops to 31%, down 13 points since the conflict began.',
    initiatedBy: '__global__',
    targetedActors: ['united_states'],
    dimension: 'political',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'political', field: 'supportForCurrentPolicy', previousValue: 44, newValue: 31, description: 'War fatigue accelerating', magnitude: 'major', verificationStatus: 'verified' },
    ],
  },
  {
    id: 'evt_rubio_wavering_day19',
    timestamp: '2026-03-18T00:00:00Z',
    title: 'Rubio press conference signals wavering (Day 19 — current state)',
    description: 'Secretary of State Rubio gives press conference using phrase "Israel\'s security objectives" three times without saying "America\'s." Washington reporters note the shift.',
    initiatedBy: 'united_states',
    targetedActors: [],
    dimension: 'political',
    verificationStatus: 'verified',
    impacts: [
      { actorId: 'united_states', dimension: 'political', field: 'leadershipCohesion', previousValue: 65, newValue: 58, description: 'Senior officials publicly signaling policy doubts', magnitude: 'moderate', verificationStatus: 'verified' },
    ],
  },
]
```

- [ ] **Step 2: Verify typecheck**

```bash
bun run typecheck
```
Expected: zero errors.

- [ ] **Step 3: Verify event count and ordering**

```bash
bun run -e "import { IRAN_EVENTS } from './lib/scenarios/iran/events'; console.log('Event count:', IRAN_EVENTS.length); console.log('First:', IRAN_EVENTS[0].id); console.log('Last:', IRAN_EVENTS[IRAN_EVENTS.length-1].id);"
```
Expected: ~20 events minimum, first is interwar, last is rubio_wavering.

- [ ] **Step 4: Commit**

```bash
git add lib/scenarios/iran/events.ts
git commit -m "feat: add verified Iran conflict event timeline (Feb 2026 - Day 19)"
```

---

## Task 7: Barrel export

**Files:**
- Create: `lib/scenarios/iran/index.ts`

- [ ] **Step 1: Create barrel**

```typescript
// lib/scenarios/iran/index.ts
export { IRAN_INITIAL_STATE } from './initial-state'
export { IRAN_EVENTS } from './events'
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add lib/scenarios/iran/index.ts
git commit -m "feat: add lib/scenarios/iran barrel export"
```

---

## Task 8: Seed script

**Files:**
- Create: `scripts/seed-iran.ts`
- Create: `tests/scripts/seed-iran.test.ts`

The seed script is run once (or appended with `--from`) to populate the Supabase ground truth trunk. It is NOT an API route — it is a CLI script.

- [ ] **Step 1: Write smoke test first**

This test mocks Supabase and verifies the seed script calls insert the right number of commits and sets the right fields.

```typescript
// tests/scripts/seed-iran.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase service client
vi.mock('../../lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockResolvedValue({ data: { id: `mock-${table}-id` }, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
    }))
  }))
}))

// Mock Anthropic (stages 5-6 are called but we don't care about output in this test)
vi.mock('../../lib/ai/anthropic', () => ({
  callClaude: vi.fn().mockResolvedValue({ escalationLadders: [], constraintCascades: [] })
}))

import { IRAN_EVENTS } from '../../lib/scenarios/iran/events'
import { seedIranScenario } from '../../scripts/seed-iran'

describe('seedIranScenario', () => {
  it('creates one turn_commit per event', async () => {
    const { createServiceClient } = await import('../../lib/supabase/service')
    const mockClient = createServiceClient() as ReturnType<typeof createServiceClient>

    await seedIranScenario({ dryRun: true })

    // Should attempt to insert one commit per event
    const insertCalls = (mockClient.from('turn_commits').insert as ReturnType<typeof vi.fn>).mock.calls
    expect(insertCalls.length).toBe(IRAN_EVENTS.length)
  })

  it('each commit has is_ground_truth: true', async () => {
    const { createServiceClient } = await import('../../lib/supabase/service')
    const mockClient = createServiceClient() as ReturnType<typeof createServiceClient>

    await seedIranScenario({ dryRun: true })

    const insertCalls = (mockClient.from('turn_commits').insert as ReturnType<typeof vi.fn>).mock.calls
    for (const [payload] of insertCalls) {
      expect(payload.is_ground_truth).toBe(true)
    }
  })

  it('commits are ordered by event timestamp', async () => {
    const { createServiceClient } = await import('../../lib/supabase/service')
    const mockClient = createServiceClient() as ReturnType<typeof createServiceClient>

    await seedIranScenario({ dryRun: true })

    const insertCalls = (mockClient.from('turn_commits').insert as ReturnType<typeof vi.fn>).mock.calls
    const dates = insertCalls.map(([p]: [{ simulated_date: string }]) => p.simulated_date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/scripts/seed-iran.test.ts
```
Expected: FAIL — `seedIranScenario` not found.

- [ ] **Step 3: Implement the seed script**

```typescript
// scripts/seed-iran.ts
/**
 * Seeds the Iran conflict ground truth trunk into Supabase.
 *
 * Usage:
 *   bun run scripts/seed-iran.ts                     # full seed
 *   bun run scripts/seed-iran.ts --from=evt_kharg    # append from event
 *   bun run scripts/seed-iran.ts --dry-run           # validate without writing
 */
import { IRAN_INITIAL_STATE, IRAN_EVENTS } from '../lib/scenarios/iran'
import { applyEventImpact } from '../lib/game/state-updates'
import { createServiceClient } from '../lib/supabase/service'
import { callClaude } from '../lib/ai/anthropic'
import type { Scenario, SeedEvent } from '../lib/types/simulation'

interface SeedOptions {
  fromEventId?: string
  dryRun?: boolean
}

export async function seedIranScenario(options: SeedOptions = {}) {
  const { fromEventId, dryRun = false } = options
  const supabase = createServiceClient()

  // 1. Create or find scenario
  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .insert({
      name: IRAN_INITIAL_STATE.name,
      description: IRAN_INITIAL_STATE.description,
      category: 'geopolitical_conflict',
      critical_context: IRAN_INITIAL_STATE.backgroundContext,
      visibility: 'public',
      // created_by: use a system user id or env var SEED_USER_ID
    })
    .select()
    .single()

  if (scenarioError) throw new Error(`Failed to create scenario: ${scenarioError.message}`)

  // 2. Create ground truth trunk branch
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .insert({
      scenario_id: scenario.id,
      name: 'Ground Truth Trunk',
      description: 'Verified real-world event timeline',
      is_trunk: true,
      turn_timeframe: 'event-driven',
      game_mode: 'observer',
      current_divergence: 0,
      // created_by: system user
    })
    .select()
    .single()

  if (branchError) throw new Error(`Failed to create branch: ${branchError.message}`)

  // 3. Determine starting state and events
  let currentState: Scenario = {
    ...IRAN_INITIAL_STATE,
    id: scenario.id,
    phases: [],
    currentPhaseId: 'phase_3_epic_fury',
    eventHistory: [],
  } as unknown as Scenario

  let events = IRAN_EVENTS
  let turnNumber = 1
  let parentCommitId: string | null = null

  if (fromEventId) {
    // Find the commit for the fromEventId and use its snapshot.
    // TODO: This uses a substring match on narrative_entry which is fragile — if the
    // narrative format changes the lookup may fail silently. A future improvement is
    // to store event_id as a dedicated metadata field on ground truth turn_commits.
    const { data: fromCommit } = await supabase
      .from('turn_commits')
      .select('id, scenario_snapshot, turn_number')
      .eq('branch_id', branch.id)
      .like('narrative_entry', `%${fromEventId}%`)
      .single()

    if (fromCommit) {
      currentState = fromCommit.scenario_snapshot as unknown as Scenario
      turnNumber = fromCommit.turn_number + 1
      parentCommitId = fromCommit.id
      const fromIndex = events.findIndex((e: SeedEvent) => e.id === fromEventId)
      events = events.slice(fromIndex + 1)
    }
  }

  // 4. Chain events into commits
  for (const event of events) {
    currentState = applyEventImpact(currentState, event)

    if (!dryRun) {
      const { data: commit, error: commitError } = await supabase
        .from('turn_commits')
        .insert({
          branch_id: branch.id,
          parent_commit_id: parentCommitId,
          turn_number: turnNumber,
          simulated_date: event.timestamp,
          scenario_snapshot: currentState,
          is_ground_truth: true,
          narrative_entry: `${event.id}: ${event.description}`,
          current_phase: 'complete',
          reuse_count: 0,
        })
        .select()
        .single()

      if (commitError) throw new Error(`Failed to insert commit for ${event.id}: ${commitError.message}`)

      // Update branch HEAD
      await supabase
        .from('branches')
        .update({ head_commit_id: commit.id })
        .eq('id', branch.id)

      parentCommitId = commit.id
    }

    turnNumber++
  }

  // 5. Run pipeline stages 5-6 for escalation ladders + fog-of-war
  if (!dryRun) {
    const verifiedContext = JSON.stringify({ actors: currentState.actors, relationships: currentState.relationships })
    // Stage 5: escalation ladders
    // Stage 6: fog-of-war
    // (pipeline functions accept verifiedContext — see Task 9)
    // Insert actors table entries with AI-generated escalation ladders
  }

  console.log(`✓ Seeded ${events.length} events as turn commits on trunk branch ${branch.id}`)
  return { scenarioId: scenario.id, branchId: branch.id, commitCount: events.length }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  seedIranScenario({ fromEventId, dryRun })
    .then(result => {
      console.log('Seed complete:', result)
      process.exit(0)
    })
    .catch(err => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
```

- [ ] **Step 4: Run tests**

```bash
bun run test -- --run tests/scripts/seed-iran.test.ts
```
Expected: 3 passing.

- [ ] **Step 5: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-iran.ts tests/scripts/seed-iran.test.ts
git commit -m "feat: add seed-iran script with event-chaining and --from append support"
```

---

## Task 9: Pipeline `verifiedContext` changes (TDD)

**Files:**
- Modify: `lib/ai/research-pipeline.ts`
- Modify: `app/api/scenarios/[id]/research/populate/route.ts`
- Modify: `tests/api/research-pipeline.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/api/research-pipeline.test.ts` (find the `runPopulatePipeline` describe block and add):

```typescript
describe('runPopulatePipeline — verifiedContext', () => {
  it('skips stages 1-4 when verifiedContext is provided', async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify({ escalationLadders: [], constraintCascades: [] })))

    await runPopulatePipeline('job-1', 'scenario-1', 'Iran conflict', mockFrame, 'verified-context-string')

    // callClaude should only be called for stages 5 and 6 (2 calls), not 6 total
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('injects verifiedContext into stage 5 prompt when provided', async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify({ escalationLadders: [], constraintCascades: [] })))

    await runPopulatePipeline('job-1', 'scenario-1', 'Iran conflict', mockFrame, 'my-verified-context')

    const calls = mockCreate.mock.calls
    // First call is stage 5 — user prompt should contain the verified context
    const stage5UserPrompt = calls[0][0].messages[0].content as string
    expect(stage5UserPrompt).toContain('my-verified-context')
  })

  it('runs all 6 stages when verifiedContext is NOT provided', async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify([])))

    await runPopulatePipeline('job-1', 'scenario-1', 'Iran conflict', mockFrame)

    // stages 1, 2, 3+4 (parallel = 2 calls), 5, 6 = 6 total
    expect(mockCreate).toHaveBeenCalledTimes(6)
  })
})
```

Also add a route test:

```typescript
describe('POST /api/scenarios/[id]/research/populate', () => {
  it('passes verifiedContext from request body to runPopulatePipeline', async () => {
    const runSpy = vi.spyOn(pipelineModule, 'runPopulatePipeline').mockResolvedValue(undefined)

    const req = new Request('http://localhost/api/scenarios/test-id/research/populate', {
      method: 'POST',
      body: JSON.stringify({
        confirmedFrame: mockFrame,
        userDescription: 'Iran conflict',
        verifiedContext: 'my-verified-context',
      }),
    })

    await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(runSpy).toHaveBeenCalledWith(
      expect.any(String),
      'test-id',
      'Iran conflict',
      mockFrame,
      'my-verified-context'
    )
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/api/research-pipeline.test.ts
```
Expected: new tests FAIL.

- [ ] **Step 3: Update `runPopulatePipeline` signature**

In `lib/ai/research-pipeline.ts`, update the function signature:

```typescript
export async function runPopulatePipeline(
  jobId: string,
  scenarioId: string,
  userDescription: string,
  confirmedFrame: unknown,
  verifiedContext?: string   // <-- add this
): Promise<void> {
```

- [ ] **Step 4: Add skip logic for stages 1-4**

Inside `runPopulatePipeline`, wrap the stages 1-4 section:

```typescript
let stage1Result: unknown
let stage2Result: unknown
let stage3Result: unknown
let stage4Result: unknown

if (!verifiedContext) {
  // Stage 1: Actor profiles
  updateJob(jobId, { stage: 'stage1', progress: 'Running Stage 1: Actor profiles...' })
  stage1Result = await runStage(/* stage 1 args */)

  // Stage 2: State assessment
  updateJob(jobId, { stage: 'stage2', progress: 'Running Stage 2: State assessment...' })
  stage2Result = await runStage(/* stage 2 args */)

  // Stages 3 & 4 in parallel
  updateJob(jobId, { stage: 'stage3_4', progress: 'Running Stages 3 & 4 in parallel...' })
  ;[stage3Result, stage4Result] = await Promise.all([
    runStage(/* stage 3 */),
    runStage(/* stage 4 */),
  ])
}
```

- [ ] **Step 5: Inject `verifiedContext` into stages 5 and 6 prompts**

Where the Stage 5 user prompt is constructed, add a conditional block:

```typescript
const stage5UserContent = [
  verifiedContext
    ? `<verified_context>\n${verifiedContext}\n</verified_context>\n\nThe verified context above contains pre-researched actor state and relationships. Use it as the factual foundation for building escalation ladders. Do not contradict it.\n\n`
    : '',
  // ... existing prompt content with stage1-4 outputs (empty strings if skipped)
].join('')
```

Same pattern for Stage 6.

- [ ] **Step 6: Update the populate route**

In `app/api/scenarios/[id]/research/populate/route.ts`:

```typescript
const { confirmedFrame, userDescription, verifiedContext } = body as {
  confirmedFrame: unknown
  userDescription: string
  verifiedContext?: string
}

void runPopulatePipeline(job.jobId, id, userDescription, confirmedFrame, verifiedContext)
```

- [ ] **Step 7: Wire `branchDivergence` into agent API calls**

The spec (Section 3b) requires `current_divergence` from the branch row to be passed as `branchDivergence` in the request body to each `/api/ai/actor-agent` and `/api/ai/resolution-engine` call.

In the game loop controller (`app/api/branches/[id]/turns/resolve/route.ts` or equivalent), before calling actor agents, read `current_divergence` from the branch row and include it in the agent request bodies:

```typescript
// Fetch branch to get current divergence
const { data: branch } = await supabase
  .from('branches')
  .select('current_divergence')
  .eq('id', branchId)
  .single()

const branchDivergence = branch?.current_divergence ?? 0

// Pass to each agent call
const actorAgentBody = {
  actorId,
  fogOfWarContext,
  scenarioFrame,
  branchDivergence,   // <-- top-level field
}

const resolutionBody = {
  fullScenario,
  turnPlans,
  branchDivergence,   // <-- top-level field
}
```

If the game loop controller routes don't exist yet (they're Issue #17), add a note in the file or create a placeholder comment at the call sites in the existing AI agent route handlers.

- [ ] **Step 8: Run all tests**

```bash
bun run test -- --run
```
Expected: all tests pass including new ones.

- [ ] **Step 9: Typecheck + lint**

```bash
bun run typecheck && bun run lint
```

- [ ] **Step 10: Commit**

```bash
git add lib/ai/research-pipeline.ts app/api/scenarios/[id]/research/populate/route.ts tests/api/research-pipeline.test.ts
git commit -m "feat: add verifiedContext to populate pipeline — skips stages 1-4 for verified scenarios"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full test suite**

```bash
bun run test -- --run
```
Expected: all tests pass (no regressions).

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```
Expected: zero errors.

- [ ] **Step 3: Lint**

```bash
bun run lint
```
Expected: no errors.

- [ ] **Step 4: Build**

```bash
bun run build
```
Expected: build succeeds.

- [ ] **Step 5: Final commit if any cleanup needed, then push**

```bash
git log --oneline -10
```
Verify clean commit history, then open PR referencing the new issue.
