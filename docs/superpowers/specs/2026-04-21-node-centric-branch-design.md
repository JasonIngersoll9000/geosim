# Node-Centric Branch Architecture Design
*Date: 2026-04-21 | Author: Jason Ingersoll + Claude*

## Overview

Introduces the **node** as the primary unit of navigation and interaction. A node is a specific `turn_commit` row — identified by its `commitId`. Every player action (browse, fork, play, interject) is anchored to a node rather than a branch.

Solves three problems in one coherent design:
1. Branch creation is broken (no `forkTurn` passed, `head_commit_id` never set)
2. Chronicle shows all 115 turns regardless of current node
3. Decision options are static catalog entries unrelated to actual game state

Future work deferred: decision fidelity sub-decisions (Issue #60), cross-branch outcome learning (Issue #61), unified single-page play experience (Issue #59).

---

## Core Principles

### Shared branch tree
One branch per unique decision path. Multiple players who make the same choice at the same node land on the same branch — no AI runs twice for the same decision. A branch is created only when a genuinely new `(fork_node, actor, primary_action)` combination is played for the first time.

### Lazy AI, aggressive caching
- Decision options are generated once per `(commitId, actorId)` and cached on `turn_commits.decision_options_cache`
- Resolution pipeline runs once per new branch and is never re-run for the same branch
- AI is invoked only for: (a) first player to request decision options at a node, (b) first player to take a genuinely new action at a node (new branch), (c) ground truth research updates

### Information scoping
Players only see chronicle entries up to the turn of the node they are browsing. No future turns bleed through. The API enforces this server-side.

---

## Architecture

### What is a node?

A node = one `turn_commits` row. It has:
- A `commitId` (UUID primary key)
- A `branch_id` (which branch it belongs to)
- A `turn_number` (its position in the timeline)
- A `parent_commit_id` (the node before it on the same branch)

Navigation is commit-to-commit. Prev/next = the adjacent commits on the same branch, resolved by `turn_number ± 1`.

### Branch deduplication key

When a player forks from node N with actor A and action X, a `decision_key` is computed:

```
decision_key = "{actorId}::{primaryAction}"
// e.g. "us::launch_airstrikes" or "iran::close_hormuz"
```

Before creating a new branch, the API queries:
```sql
SELECT id FROM branches
WHERE fork_point_commit_id = :commitId
  AND decision_key = :decisionKey
LIMIT 1
```

If found → player joins existing branch (no AI). If not found → new branch created, pipeline fires.

---

## Database Changes

### Migration

```sql
-- branches: deduplication key for shared-tree lookup
ALTER TABLE branches
  ADD COLUMN decision_key VARCHAR(255);

CREATE INDEX idx_branches_fork_decision
  ON branches(fork_point_commit_id, decision_key)
  WHERE decision_key IS NOT NULL;

-- turn_commits: cached decision options per actor
ALTER TABLE turn_commits
  ADD COLUMN decision_options_cache JSONB;
-- Format: { "us": [DecisionOption, ...], "iran": [...] }
-- Null until first player requests options for this node/actor combination.
```

### No new tables
All new state fits in existing tables. `decision_options_cache` is a write-once JSONB blob per `(commitId, actorId)` pair.

---

## API Surface

Three new routes. All additive — no existing routes modified.

### `GET /api/nodes/[commitId]`

Returns all data needed to render a node view.

**Response:**
```ts
{
  node_meta: {
    commitId: string
    turnNumber: number
    simulatedDate: string
    branchId: string
    isTrunk: boolean
    parentBranchId: string | null
    decisionKey: string | null        // what decision created this branch
  }
  chronicle: ChronicleEntry[]         // turns scoped to turn_number <= this node's turn_number
                                      // branch-lineage aware: trunk ancestry + branch divergence
  child_branches: Array<{
    branchId: string
    name: string
    decisionKey: string               // "us::launch_airstrikes" — shows what path was taken
    actorId: string
    headTurn: number
    // playerCount deferred to Issue #60 — requires auth analytics (Issue #40 must land first)
  }>
  prev_commit_id: string | null       // null if first turn on this branch
  next_commit_id: string | null       // null if at branch head
}
```

**Chronicle scoping logic (server-side):**
- If branch is trunk: `SELECT ... WHERE branch_id = :branchId AND turn_number <= :thisTurn`
- If branch is forked: trunk commits `turn_number <= fork_turn` UNION branch commits `turn_number <= thisTurn`, deduplicated by turn_number (branch wins on conflict)

### `GET /api/nodes/[commitId]/decision-options?actor=[actorId]`

Returns contextual decision options for a specific actor at this node. Cached after first generation.

**Cache check:**
```ts
// Read turn_commits.decision_options_cache->>actorId
// If populated: return immediately
// If null: generate, store, return
```

**Generation (Issue #32 deliverable — `generateDecisionOptions`):**
1. Call `getStateAtTurn(branchId, commitId)` to get current asset inventories, force readiness, escalation rungs, economic stress
2. Call Claude with: game state + actor profile + NEUTRALITY_PREAMBLE + instruction to generate contextual options
3. Produce 6–8 options, each with:

```ts
type DecisionOption = {
  id: string                          // stable slug: "launch_airstrikes"
  label: string                       // "Launch Precision Airstrikes"
  description: string                 // 2–3 sentence explanation of what this does
  category: 'military' | 'diplomatic' | 'economic' | 'intelligence' | 'information'
  prerequisites_met: boolean          // false if required assets are below threshold
  effectiveness_note?: string         // populated when prerequisites_met=false:
                                      // "Diminished — ground forces insufficient for sustained campaign"
  escalation_delta: number            // expected escalation rung change (-2 to +4)
  already_explored: boolean           // true if a child branch already exists for this option
  existing_branch_id?: string         // if already_explored: navigate here instead of forking
}
```

**Asset-awareness:** Options are graded against current `facility_statuses` and `asset_availability` from the state engine. A ground invasion option with `troop_deployment` assets at < 30% of required threshold gets `prerequisites_met: false` and an effectiveness note. The option is never hidden — the player can attempt it, but the consequence of the gamble is clear.

**Response:**
```ts
{
  commitId: string
  actorId: string
  options: DecisionOption[]
  cached: boolean                     // true if served from cache
  as_of_date: string
}
```

### `POST /api/nodes/[commitId]/fork`

Creates or joins a branch from this node.

**Request body:**
```ts
{
  actorId: string
  primaryAction: string               // decision option id
  concurrentActions?: string[]
  branchName?: string                 // optional custom name; defaults to "US → Launch Airstrikes"
}
```

**Flow:**
1. Validate commitId exists, actor is valid for this scenario
2. Compute `decision_key = "{actorId}::{primaryAction}"`
3. Query for existing branch with matching `fork_point_commit_id` + `decision_key`
4. **If found:** return `{ branchId, joined: true, turnCommitId: branch.head_commit_id }`
5. **If not found:**
   - Create branch row with `fork_point_commit_id`, `decision_key`, auto-generated name
   - Call `forkStateForBranch(parentBranchId, commitId, newBranchId)` to copy state snapshots
   - If fork fails: roll back branch row, return 500
   - Fire `runFullPipeline` in background (via `waitUntil` on Vercel, `void` locally)
   - Return `{ branchId, joined: false, processing: true }`

**Response:**
```ts
{
  branchId: string
  joined: boolean                     // true = existing branch navigated to
  processing: boolean                 // true = new branch, pipeline running
  turnCommitId?: string               // for joined branches: the head commit to navigate to
}
```

---

## UI Changes

### Node navigation

The `TopBar` "TURN XX / YY" display is fixed to read from the actual loaded node (not the branch head). Flanked by `←` / `→` buttons that:
- Call `GET /api/nodes/[commitId]` for `prev_commit_id` / `next_commit_id`
- Push `?turn=N` to the URL (shallow routing, no full page reload)
- Disable when at the start or head of the branch

The URL for a specific node: `/scenarios/[id]/play/[branchId]?turn=N`

### "Take Control" interject flow

Available on any node that is not the current branch head when the branch is `isTrunk` or the player does not own the branch. Appears as a button in the game view bottom bar.

**Flow:**
1. Player clicks "Take Control Here"
2. Actor picker modal — list of scenario actors with status chips (escalation rung, stability). Player picks one.
3. `GET /api/nodes/[commitId]/decision-options?actor=X` fires
   - Loading state: "Generating options based on current situation…"
   - If cached: instant
4. Decision cards render. Each shows:
   - Label + description
   - Category badge
   - Escalation delta indicator (`↑ +2 rungs`)
   - `⚠ Diminished effectiveness — [reason]` warning tag if `prerequisites_met: false`
   - "3 players took this path →" CTA if `already_explored: true`
5. Player selects an option
6. "Fork here" button fires `POST /api/nodes/[commitId]/fork`
7. Response handling:
   - `joined: true` → navigate to existing branch with toast: "Joined an existing path — N others have taken this route"
   - `joined: false, processing: true` → navigate to new branch's play page; DispatchTerminal shows processing animation

### BranchTree visual layout

Replace the current equal-spacing layout with depth-based positioning:

```
Y position = 1 - (forkTurn / totalTrunkTurns)   // 0 = bottom, 1 = top (GT level)
```

- Ground truth: top rail (Y = 1.0), horizontal, full width
- A branch forking at turn 1 of 115: Y ≈ 0.01 (nearly at bottom — earliest possible divergence)
- A branch forking at turn 100 of 115: Y ≈ 0.13 (close to GT — shares most of ground truth)
- Multiple branches at the same fork turn stack vertically within their Y band (equal spacing within band)

Nodes are rendered as dots on their branch's horizontal rail. Connecting lines drop vertically from the GT rail to the branch rail at the fork turn, then continue horizontally.

Node dots are clickable → navigate to `/scenarios/[id]/play/[branchId]?turn=N`.

The "browse branches" modal in the play view is removed (the hub BranchTree replaces it).

### Chronicle display fix

In `ChronicleTimeline`, update field priority:

```ts
// Main body (long-form, seeded detail or AI narrator):
const mainContent = entry.chronicle_entry ?? entry.narrative_entry ?? ''

// Full Briefing expandable (AI-generated narrator output):
const fullBriefing = entry.narrative_entry ?? entry.full_briefing ?? ''

// Only render the Full Briefing button if:
// - fullBriefing exists
// - fullBriefing is meaningfully longer than mainContent (> 200 chars more)
// - fullBriefing !== mainContent
const showFullBriefing = fullBriefing.length > mainContent.length + 200
```

---

## Issue #32 Deliverable: `generateDecisionOptions`

New function in `lib/ai/actor-agent.ts` (or a new `lib/ai/decision-generator.ts`):

```ts
async function generateDecisionOptions(
  commitId: string,
  actorId: string,
  opts?: { client?: SupabaseClient }
): Promise<DecisionOption[]>
```

**Prompt structure:**
1. System (cached): NEUTRALITY_PREAMBLE + actor profile + scenario context
2. User (fresh per call): current game state block (from `getStateAtTurn`) formatted as:
   - Actor's current escalation rung + available assets + force readiness
   - Other actors' visible escalation posture (fog-of-war applied)
   - Current economic stress, Hormuz throughput, Bab-el-Mandeb status
   - Last 3 chronicle entries (context for what just happened)
3. Instruction: "Generate 6–8 distinct, contextually grounded decision options for {actor} at this moment. Each must be achievable given the actor's current assets and posture. Flag any option where available assets fall below the minimum threshold for effective execution."

**Output schema (Claude structured output / tool_use):**
```ts
type DecisionOptionsOutput = {
  options: Array<{
    id: string
    label: string
    description: string
    category: string
    prerequisites_met: boolean
    effectiveness_note?: string
    escalation_delta: number
  }>
}
```

After generation, merge with `already_explored` and `existing_branch_id` from the child_branches query (done in the API route, not in the AI function).

Cache write:
```ts
await supabase
  .from('turn_commits')
  .update({
    decision_options_cache: {
      ...existingCache,
      [actorId]: options,
    }
  })
  .eq('id', commitId)
```

---

## Narrator Context Scoping (Chronicle Quality for Player Branches)

When the narrator runs for a player branch turn, it must only receive chronicle entries from turns ≤ the current turn. This prevents future-information leakage into the narrative.

In `runNarrator` (called from `runFullPipeline`), the `scenarioContext` and prior chronicle summary must be built from:
```ts
const priorChronicle = await getChronicleUpToTurn(branchId, turnNumber - 1)
// uses the same branch-lineage logic as GET /api/nodes/[commitId]
```

This ensures the narrator's "what just happened" context is faithful to what the player would actually know at that moment.

---

## Error Handling

| Scenario | Response |
|---|---|
| `GET /api/nodes/[commitId]` — commitId not found | 404 `{ error: 'Node not found' }` |
| Chronicle query fails | 200 with `{ chronicle: [], error: 'Chronicle unavailable' }` — don't block page render |
| `GET .../decision-options` — AI call fails | 503 `{ error: 'Options unavailable — try again' }` — client shows retry button, never silently empty |
| `POST .../fork` — forkStateForBranch fails | Roll back branch row, return 500 with message |
| `POST .../fork` — pipeline fires but fails async | Branch row remains, `current_phase = 'failed'` — existing failure handling covers this |

---

## Testing

**`tests/api/nodes.test.ts`**
- Chronicle scoping: assert that turns > node's turn_number are excluded from response
- Trunk branch: all trunk commits up to N
- Forked branch: trunk ancestry up to fork_turn + branch commits after
- Deduplication: POST /api/nodes/[commitId]/fork with same `decision_key` twice → second call returns `joined: true` with same `branchId`
- Options cache: second GET to decision-options returns `cached: true` with no AI invocation

**`tests/ai/decision-generator.test.ts`**
- Mock Claude response; assert output conforms to `DecisionOption[]` schema
- Assert `prerequisites_met: false` when state engine reports key assets below threshold
- Assert NEUTRALITY_PREAMBLE is present in the system prompt

**Existing tests:** `advance.test.ts` unchanged — the pipeline is the same for new-branch forks.

---

## Dependency Map

```
This spec (Approach B — node-centric API)
  ├── PR 1 (backend): DB migration + 3 new API routes + generateDecisionOptions
  │     └── Closes: Issue #32 (actor agent / decision generation), Issue #38 (branch creation)
  │
  └── PR 2 (frontend): node nav UI + BranchTree layout + Take Control flow + chronicle fix
        └── Closes: Issue #37 (turn submission UX improvements), Issue #53 (observer mode nav)

Future (depends on this spec being complete):
  Issue #59 — Unified play experience (Approach C)
  Issue #60 — Decision fidelity / tactical sub-decisions
  Issue #61 — Cross-branch outcome learning
```

---

## Out of Scope

- **Decision sub-decisions (Issue #60):** Complex decisions like ground invasions will eventually support follow-up tactical parameter questions. Deferred — sub-decision `decision_key` extension (`"us::ground_invasion::coordinated_air"`) is designed to be additive.
- **Cross-branch outcome learning (Issue #61):** Resolution engine using prior similar-branch results as prior context. Needs separate design; no changes here block its future addition.
- **Unified play experience (Issue #59):** Moving BranchTree into the play view as a collapsible sidebar. This spec's API is what Issue #59 will consume. No rework needed.
