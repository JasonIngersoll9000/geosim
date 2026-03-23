# Iran Research Incorporation Design Spec
**Date:** 2026-03-22
**Branch:** issue-9-iran-research-incorporation (to be created)
**Status:** Approved for implementation

---

## 1. Problem Statement

The research pipeline (Issue #8) produces AI-generated scenarios from freeform descriptions. For the Iran conflict scenario — the flagship use case — we have verified, detailed research documents (`docs/Iran Research/`) covering military, political, and economic state as of 2026-03-18. Running the full 7-stage pipeline over this data risks hallucination, drift from verified facts, and wasted API cost on already-researched information.

This spec defines how to incorporate the verified research into the simulation in a way that:
- Locks verified facts (no AI override)
- Uses the pipeline only for structural fields the research docs don't provide
- Supports a living, updatable ground truth trunk
- Enables shared commit caching so repeated decision paths don't re-generate

---

## 2. Architecture Overview

```
lib/scenarios/iran/
  initial-state.ts     ← verified actor state, relationships, global state
  events.ts            ← ~25-35 verified events with impacts + escalation changes
  index.ts             ← barrel export

scripts/
  seed-iran.ts         ← chains events through applyEventImpact(), writes turn commits

lib/ai/research-pipeline.ts   ← modified: verifiedContext param, skip stages 1-4
lib/types/simulation.ts       ← modified: verificationStatus, branchDivergence
```

The ground truth trunk is a sequence of immutable `turn_commits` rows in Supabase, one per verified event. All users branch from this shared spine.

---

## 3. Data Structures

### 3a. Verification Status

Every field in actor state and every event carries a `verificationStatus`:

```typescript
type VerificationStatus = "verified" | "researched" | "inferred"
```

- `verified` — directly sourced from the Iran research docs (locked, not overridable by AI)
- `researched` — AI-sourced via web search during pipeline (can be corrected)
- `inferred` — AI-derived from context without a specific source (lowest confidence)

Applied to `EventImpact`, `ActorState` fields, and `Event` objects.

### 3b. Branch Divergence

`branchDivergence` is computed **server-side** at turn start and passed to agent API calls. It is derived from the branch row in Supabase:

```typescript
// Computed in the game loop controller before calling actor agents
const branchDivergence = branch.is_trunk
  ? 0
  : branch.fork_point_commit_id
    ? (currentTurnNumber - forkPointTurnNumber)
    : 0
```

This value is stored on the `branches` row as `current_divergence` (updated each turn) so it does not need to be recomputed on every agent call. It is passed to each `/api/ai/actor-agent` and `/api/ai/resolution-engine` call as a top-level field in the request body.

New field on `branches` table: `current_divergence integer not null default 0`

Controls how agents use web search:

| branchDivergence | Agent behavior |
|---|---|
| 0–3 | Use web search to verify facts; defer to research over priors |
| 4–9 | Blend: research for structure, strategic reasoning for outcomes |
| 10+ | No web search; pure strategic reasoning from motivations and capabilities |

### 3c. Commit Cache Key

A `turn_commit` stores the resolution of ALL actors' decisions simultaneously — it is not per-actor. The cache key must therefore cover the full set of actor decisions for a turn, sorted deterministically so order doesn't matter:

New fields on `turn_commits`:

```typescript
cache_key: string    // SHA-256 of: parentCommitId + JSON.stringify(
                     //   allActorDecisions.sort((a,b) => a.actorId.localeCompare(b.actorId))
                     //   .map(d => `${d.actorId}:${d.decisionId}:${d.selectedProfileId}:${JSON.stringify(d.parameters)}`)
                     // )
reuse_count: number  // how many branches reference this commit
```

The sort ensures that two branches where actors made the same decisions in different submission order produce the same hash.

---

## 4. Seed Data

### 4a. Initial State (`lib/scenarios/iran/initial-state.ts`)

A partial `Scenario` object populated only from verified research. Fields not in the research docs are left for the pipeline to generate.

Verified fields include:
- **US**: military readiness (82), Patriot reserves (~500), THAAD systems (7 pre-conflict), domestic support (44% public / 82 AIPAC policyInfluence), policy disconnect, key figures with dispositions
- **Iran**: overallReadiness (35 post-strikes), Shahed-136 stocks (~3,000), nuclear capability (threshold), regime stability (68), IRGC autonomy
- **Israel**: overallReadiness (78), multi-front status, March 31 budget deadline constraint
- **Russia/China**: escalation rungs (1-2), strategic postures
- **Gulf States**: oil exposure, relationship strain from THAAD removal
- **Global state**: oilPricePerBarrel (71 on Feb 27 pre-conflict), criticalAssets (Strait, Kharg, Ras Tanura, Abqaiq)
- **Relationships**: US-Iran (adversary, strength 5), Russia-Iran (patron, strength 72), US-Israel (ally, strained), etc.

All actor `constraints` pre-populated with status fields:
- Iran religious prohibition on nuclear use: `status: "active"` at start, `"removed"` after Ayatollah killed
- US no ground invasion without AUMF: `status: "active"`
- Israel March 31 budget deadline: hard constraint

### 4b. Events (`lib/scenarios/iran/events.ts`)

~25–35 events covering:

**Phase 2: Interwar period (July 2025 – Feb 2026)**
- Oman indirect nuclear talks (Feb 6, 2026)
- Oman FM announces "breakthrough within reach" (Feb 26, 2026)

**Phase 3: Operation Epic Fury (Feb 28, 2026 – Day 19)**
- Operation Epic Fury begins: 900 strikes in 12 hours (Feb 28)
- Ayatollah Khamenei killed (Feb 28) → removes nuclear religious constraint
- Mojtaba Khamenei assumes power, declares martyrdom (Feb 28)
- Strait of Hormuz closure announced (Day 2)
- First Shahed drone swarm: 340 drones, 89% intercepted (Day 3)
- IRGC mosaic defense activates: 31 autonomous commands (Day 3)
- Ras Tanura facility struck: Saudi oil output -15% (Day 5)
- US air defense reserves cross 60% threshold (Day 6)
- THAAD systems: 4 of 7 destroyed (Day 8)
- Joe Kent resignation (Day 10)
- Oil hits $142/bbl (Day 12)
- Gulf States joint statement criticizing US (Day 12)
- Iraqi militia activation: 300+ attacks on US forces (Day 14)
- China increases yuan-for-oil agreements (Day 15)
- Russia accelerates Ukraine offensive (Day 16)
- Nuclear breakout cascade: 2 of 3 constraints removed (Day 17)
- US domestic support drops to 31% (Day 18)
- Rubio press conference signals wavering (Day 19) ← current state

Each event includes:
- `verificationStatus: "verified"`
- `impacts[]` with actor state deltas
- `escalationChanges[]` where applicable
- `constraintCascade` references where applicable
- `intelConsequences[]` (what was revealed/concealed)

### 4c. Event-to-Commit Mapping

The ground truth trunk uses a **one commit per event** rule. Each event in `IRAN_EVENTS` becomes its own `turn_commit`, even if multiple events happen on the same real-world day. This maximizes branching granularity — users can branch from any event, not just weekly snapshots.

`simulated_date` on the commit is set to the event's `timestamp`. `turn_number` increments sequentially. There is no concept of "turns per week" on the ground truth trunk — it is event-driven, not time-driven.

The `turn_timeframe` on the trunk branch row is set to `"event-driven"` to distinguish it from user branches which default to `"1 week"`.

### 4d. Seed Script (`scripts/seed-iran.ts`)

```
1. Create scenario row in Supabase
2. Create ground truth trunk branch (is_trunk: true, turn_timeframe: "event-driven")
3. For each event in IRAN_EVENTS:
   a. Apply event to current state via applyEventImpact()
   b. Insert turn_commit:
      - branch_id: trunkBranchId
      - parent_commit_id: previousCommitId
      - turn_number: incrementing counter
      - simulated_date: event.timestamp
      - scenario_snapshot: current state after applying event
      - is_ground_truth: true
      - narrative_entry: event.description
   c. Update branch head_commit_id
4. Run pipeline stages 5-6 (escalation ladders + fog-of-war) with verifiedContext
5. Insert actors table entries with AI-generated escalation ladders
```

Supports `--from=<event_id>` flag for appending new events: finds the commit for that event, uses its `scenario_snapshot` as the starting state, and appends only events after it.

---

## 5. Pipeline Changes

### 5a. `verifiedContext` parameter

```typescript
async function runPopulatePipeline(
  jobId: string,
  scenarioId: string,
  userDescription: string,
  confirmedFrame: unknown,
  verifiedContext?: string   // <-- new optional param
)
```

When `verifiedContext` is present:
- **Skip stages 1–4** (actor profiles, state assessment, relationships, event timeline)
- **Inject into stages 5–6** as additional context block in the user prompt
- Stage 5 (escalation ladders) builds on the verified state data
- Stage 6 (fog-of-war) builds on verified events and relationships

For unverified scenarios: `verifiedContext` omitted, all 7 stages run as today.

### 5b. Populate route

```typescript
// app/api/scenarios/[id]/research/populate/route.ts
const { confirmedFrame, userDescription, verifiedContext } = body
```

---

## 6. Shared Commit Tree & Caching

### How it works

All users build on the same commit tree. When a user makes a decision:

1. Compute `cache_key = SHA-256(parentCommitId + actorId + decisionId + profileId + parameters)`
2. Query `turn_commits` for a row with this `cache_key`
3. **Cache hit**: return the existing commit. No API call. Increment `reuse_count`.
4. **Cache miss**: generate a new turn (full AI resolution), insert as new commit with this `cache_key`

The user's branch record simply points to the shared commit — multiple branches can reference the same `turn_commits` rows.

### Branch creation on cache miss

```
User A takes "Propose ceasefire" on Day 19
→ cache miss → generate → commit A1 (cache_key: abc123, reuse_count: 1)

User B takes same decision on Day 19
→ cache hit on commit A1 → reuse_count: 2
→ User B's branch record points to commit A1 (no new computation)

User C takes "Launch ground operation" on Day 19
→ cache miss → generate → commit C1 (new branch, separate path)
```

### Storage implication

Turn data is stored once. Branches are cheap pointers. The 100-user scenario that previously meant 100x API cost now means 1x for the first user + 0x for every repeat.

---

## 7. Ground Truth Trunk Updates

When a real-world event occurs after the seed data cutoff (e.g., US captures Kharg Island):

**MVP (manual):**
1. Add new `SeedEvent` to `lib/scenarios/iran/events.ts` with `verificationStatus: "verified"`
2. Run `bun run scripts/seed-iran.ts --from=<last_event_id>`
3. New commits appended to trunk HEAD
4. Existing user branches unaffected

**Post-class (automated):**
- `POST /api/scenarios/[id]/research/update-trunk` runs focused research prompt with web search
- New events parsed and staged for human review
- On approval, appended to trunk

**User notification:**
When a user's branch HEAD is behind the trunk HEAD, they see:

> "The ground truth trunk has advanced N turns since you branched. View what actually happened, or continue your alternative timeline."

Options:
1. Continue current branch (event never happened in their timeline)
2. Fork a new branch from updated trunk HEAD
3. Compare their branch vs. what actually happened

---

## 8. Future Extensibility

Iran is the only seeded scenario for now. Other scenarios use the full 7-stage pipeline without `verifiedContext`. Future path to verified scenarios:

1. Scenario creator runs pipeline → reviews output → marks fields as `verified` where confirmed
2. Creator can lock the scenario, promoting it to "verified scenario" status
3. The `verifiedContext` mechanism already supports this — just pass the reviewed output as context

This keeps the architecture general while optimizing for Iran specifically.

---

## 9. Files Created / Modified

### New files
```
lib/scenarios/iran/initial-state.ts
lib/scenarios/iran/events.ts
lib/scenarios/iran/index.ts
scripts/seed-iran.ts
```

### Modified files
```
lib/ai/research-pipeline.ts        — verifiedContext param, stage skip logic
app/api/scenarios/[id]/research/populate/route.ts  — accept verifiedContext
lib/types/simulation.ts            — verificationStatus, branchDivergence
lib/game/state-updates.ts          — no changes needed (applyEventImpact already works)
```

### Docs to update
```
docs/prd.md                        — Section 13.1 (ground truth trunk updates)
docs/research-pipeline.md          — verifiedContext pipeline variant
docs/api-routes.md                 — update-trunk endpoint, verifiedContext on populate
docs/geosim-data-model.ts          — verificationStatus type, branchDivergence
docs/agent-architecture.ts         — branchDivergence in GameContext
docs/scrum-issues.md               — new issue for this work
```

### GitHub issues to update
```
Issue #8  — note that research-pipeline.ts will need verifiedContext addition
Issue #37 — Seed Iran scenario: update acceptance criteria to match this spec
New issue — Iran research incorporation (this spec)
```

---

## 10. Acceptance Criteria

- [ ] `bun run scripts/seed-iran.ts` creates ground truth trunk with ~25-35 commits
- [ ] Each commit has `is_ground_truth: true` and correct `scenario_snapshot`
- [ ] All verified fields have `verificationStatus: "verified"`
- [ ] `runPopulatePipeline` with `verifiedContext` skips stages 1-4
- [ ] `branchDivergence` field present in game context passed to agents
- [ ] Cache hit returns existing commit without API call
- [ ] `--from=<event_id>` flag on seed script appends without re-seeding
- [ ] Unverified scenario pipeline (no verifiedContext) unchanged
- [ ] All existing tests still pass
- [ ] TypeScript strict mode: zero errors
