# Design Spec: Wire Player Decisions Through Full AI Pipeline

**Date:** 2026-04-15
**Status:** Approved
**Scope:** P0 — blocks playable game

## Problem

Two disconnected code paths exist for advancing turns:

1. **`/api/scenarios/[id]/branches/[branchId]/advance`** — called by the UI via `useSubmitTurn.ts`. Accepts player action IDs, inserts a turn_commit, applies empty state effects. No AI agents, no judge, no narrator. Returns SSE streaming lines (mostly fake mock text).

2. **`/api/game/turn`** — full orchestrator (410 lines). Runs all 4 AI agents (actor, resolution, judge+retry, narrator), persists state, advances branch head. Never called by the UI. Returns a single JSON blob.

Result: the player submits a turn, but AI actors never react, resolution never runs, and the narrative is never generated.

## Solution

Upgrade `/advance` to be the single entry point. It validates the request and returns instantly, then runs the full AI pipeline as a background task via `waitUntil`. Progress is delivered via Supabase Realtime broadcasts. `/api/game/turn` is deleted (its logic folds into `/advance`).

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Progress UI | Phase indicators (checklist) | Simpler than SSE line-by-line; matches war-room aesthetic without complexity |
| Decision catalog source | Server loads it | Preserves fog of war; client stays simple; no stale-catalog risk |
| Response model | Fire-and-forget (instant response) | Player never waits 30-60s; resilient to navigation/disconnect |
| Architecture | Upgrade existing `/advance` | No new endpoints; same client URL; one place for turn logic |
| Background execution | `waitUntil` from `@vercel/functions` | Keeps serverless function alive after response is sent; prevents Vercel from killing the pipeline mid-execution |

## Architecture

### Serverless execution model

Next.js App Router route handlers on Vercel run as serverless functions. Once the Response is returned, the function is normally terminated. A naked `runFullPipeline()` without `await` would be killed before AI agents finish.

**Fix:** Use `waitUntil()` from `@vercel/functions`. This extends the function lifetime past the response. The pipeline promise is passed to `waitUntil()` so Vercel keeps the function alive until it resolves or rejects.

```ts
import { waitUntil } from '@vercel/functions'

// Inside POST handler:
const pipelinePromise = runFullPipeline(...)
waitUntil(pipelinePromise)
return NextResponse.json({ turnCommitId, status: 'processing' })
```

**Fallback for local dev** (where `waitUntil` is unavailable): detect the environment and fall back to a detached promise. Local dev doesn't kill functions on response, so this works fine.

```ts
const isVercel = Boolean(process.env.VERCEL)
if (isVercel) {
  waitUntil(pipelinePromise)
} else {
  void pipelinePromise  // local dev: function stays alive naturally
}
```

**Timeout:** Vercel Pro allows up to 60s function execution. The full pipeline (5 actor agents parallel + resolution + judge retry + narrator) should complete in 30-50s. If it exceeds 60s, Vercel kills the function. The catch block won't run, leaving `turn_commits.current_phase` stuck at a mid-pipeline phase. This is handled by the stale-turn recovery mechanism (see Error Handling).

### Request flow

```
Player submits { primaryAction, concurrentActions, controlledActors }
       |
       v
  POST /advance
  - Authenticate (session client, same logic as /api/game/turn)
  - Validate request body
  - Check no turn already in progress (else 409)
  - Load branch + head commit (determine turnNumber, simulatedDate)
  - Insert turn_commits row (current_phase: 'submitted')
  - waitUntil(runFullPipeline(...))
  - Return { turnCommitId, turnNumber, status: 'processing' }  (~200ms)
       |
       v  (background via waitUntil)
  runFullPipeline(scenarioId, branchId, commitId, playerActions, ...)
       |
       +-- broadcast: turn_started { turnNumber, simulatedDate, phase: 'planning' }
       +-- Load actor profiles + scenario context from Supabase
       +-- Load branch state via getStateAtTurn()
       +-- Compute branch divergence via computeBranchDivergence()
       +-- loadDecisionCatalog(scenarioId) -> Record<actorId, Decision[]>
       +-- Adapt DecisionOption[] -> Decision[] (type mapping)
       +-- buildTurnPlanFromIds(actionIds, actorId, catalog) -> player TurnPlan
       +-- runActorAgent() x N AI actors (parallel via Promise.allSettled)
       +-- broadcast: resolution_progress { message: "...", phase: 'resolving' }
       +-- runResolutionEngine(allTurnPlans, branchState, flatCatalog, ...)
       +-- runJudge() -> retry if score < 40 (max 2 attempts)
       +-- broadcast: resolution_progress { message: "...", phase: 'judging' }
       +-- runNarrator(resolution, judge, ...)
       +-- broadcast: resolution_progress { message: "...", phase: 'narrating' }
       +-- applyEventEffects + persistStateSnapshot
       +-- Update turn_commits (current_phase: 'complete', + narrative/judge data)
       +-- Advance branch head_commit_id
       +-- broadcast: turn_completed { commitId, turnNumber, phase: 'complete' }
       |
       +-- On error at any point:
           +-- Update turn_commits (current_phase: 'failed')
           +-- broadcast: turn_failed { error: message, phase: 'failed' }
```

### Authentication and authorization

Ported from `/api/game/turn` (lines 62-127). The `/advance` route performs these checks **before** returning the instant response:

1. **Session validation:** Use session-scoped Supabase client to get authenticated user. Reject unauthenticated requests when auth is configured and `NEXT_PUBLIC_DEV_MODE` is not `true`.
2. **Branch ownership:** Load branch record. The `created_by` field determines ownership.
3. **Scenario visibility:** Load scenario's `visibility` field. Non-owners may only submit on public scenarios.
4. **Player permission:** Non-owners cannot set `playerActorId` (they can only observe).

The background pipeline uses the **service-role** Supabase client (already used in `/api/game/turn`) since auth is validated before the response.

### Data loading in the background pipeline

The following data must be loaded before AI agents can run. This logic is ported directly from `/api/game/turn` lines 156-185:

1. **Actor profiles:** `scenario_actors` table — `id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile`. Required by `runActorAgent`.
2. **Scenario context:** `scenarios` table — `name, description, critical_context`. Formatted as a string block for all AI prompts.
3. **Branch state:** `getStateAtTurn(branchId, headCommitId)` from `lib/game/state-engine.ts`. Required by resolution engine and actor agents.
4. **Branch divergence:** `computeBranchDivergence(supabase, branchId)` — count of commits on this branch. Used by actor agent to calibrate behavior on divergent timelines. This helper is moved from `/api/game/turn` to `lib/game/turn-helpers.ts`.

### Decision catalog loading and type adaptation

**The type problem:** `IRAN_DECISIONS` in `lib/game/iran-decisions.ts` is typed as `DecisionOption[]` (from `lib/types/panels.ts`). This is a UI-oriented type with fields `title`, `escalationDirection`, `resourceWeight`, `requiredAssets`. The AI pipeline expects `Decision` (from `lib/types/simulation.ts`) with fields `description`, `escalationLevel`, `isEscalation`, `costs`, `expectedOutcomes`.

**Solution:** New adapter function `adaptDecisionOptions(options: DecisionOption[]): Decision[]` maps the fields:

```ts
function adaptDecisionOptions(options: DecisionOption[]): Decision[] {
  return options.map(opt => ({
    id: opt.id,
    description: opt.title,  // best available field
    dimension: opt.dimension,
    escalationLevel: opt.escalationDirection === 'escalate' ? 1 : 0,
    isEscalation: opt.escalationDirection === 'escalate',
    isDeescalation: opt.escalationDirection === 'de-escalate',
  }))
}
```

This produces minimal `Decision` objects. The AI agents use `description` for context and `id` for plan construction. The full `Decision` type has many optional fields (`costs`, `expectedOutcomes`, `prerequisites`) — these are omitted for now and populated when the full decision catalog (#52) is built.

**The per-actor problem:** `IRAN_DECISIONS` is a flat array, not keyed by actor. All 7 decisions are US-oriented. For the MVP:

- `loadDecisionCatalog` assigns the full array to `united_states` (the player actor)
- AI actors (Iran, Israel, GCC, etc.) get empty arrays and therefore skip plan generation — they become "reactive only" (the resolution engine still models their responses based on state and scenario context)
- This is explicitly a known limitation, resolved by #52 (multi-actor decision catalog)

New helper `loadDecisionCatalog(scenarioId: string): Record<string, Decision[]>`:

```ts
export function loadDecisionCatalog(scenarioId: string): Record<string, Decision[]> {
  // Only Iran scenario exists
  const adapted = adaptDecisionOptions(IRAN_DECISIONS)
  return { united_states: adapted }
  // Future: load from DB keyed by actor
}
```

### Player actorId derivation

The request body contains `controlledActors: string[]` (an array). The player's `actorId` is `controlledActors[0]`. If `controlledActors` is empty or missing, the request is treated as observer mode (`playerActorId = null`, no player TurnPlan constructed).

### TurnPlan construction from action IDs

New helper `buildTurnPlanFromIds(primaryActionId, concurrentActionIds, actorId, catalog)`.

- Looks up action IDs in `catalog[actorId]`
- Splits resources: 1 primary alone = 100%. 1 primary + N concurrent = primary gets `100 - (N * 20)`%, each concurrent gets 20%.
- Returns a proper `TurnPlan` matching `lib/types/simulation.ts`
- Throws if action ID not found in catalog

### Resolution engine input

`runResolutionEngine` expects `decisionCatalog: Decision[]` (a flat array). The pipeline flattens the per-actor catalog:

```ts
const flatCatalog: Decision[] = Object.values(decisionCatalog).flat()
```

This matches the existing pattern at `/api/game/turn` line 255.

### Supabase Realtime broadcasts

New helper `broadcastTurnEvent(branchId, event, payload)`.

Uses service-role Supabase client to send on channel `branch:${branchId}`.

Broadcasts include a structured `phase` field for reliable UI mapping (not string matching on messages):

| Timing | Event | Payload |
|---|---|---|
| Pipeline start | `turn_started` | `{ turnNumber, simulatedDate, phase: 'planning' }` |
| After AI agents | `resolution_progress` | `{ message: "All actor plans generated", phase: 'resolving' }` |
| After resolution | `resolution_progress` | `{ message: "Actions resolved", phase: 'judging' }` |
| After judge | `resolution_progress` | `{ message: "Judge score: 84", phase: 'narrating' }` |
| After narrator | `resolution_progress` | `{ message: "Narrative generated", phase: 'finalizing' }` |
| Pipeline complete | `turn_completed` | `{ commitId, turnNumber, phase: 'complete' }` |
| Pipeline error | `turn_failed` | `{ error: "...", phase: 'failed' }` |

**Phase enum** used by both server and client:

```ts
export type TurnPhase = 'submitted' | 'planning' | 'resolving' | 'judging' | 'narrating' | 'finalizing' | 'complete' | 'failed'
```

DispatchTerminal maps phases to checklist items deterministically — no string parsing needed.

### Client: useRealtime.ts

Existing listeners for `turn_started`, `resolution_progress`, `turn_completed` are unchanged except:

1. `turn_completed` handler: the existing `SET_COMMIT` dispatch expects `{ commitId, turnNumber, snapshot }` where `snapshot` is typed as `Scenario`. Since we send `snapshot: undefined`, **update the GameProvider reducer** to handle missing snapshot: when `snapshot` is absent, the reducer sets `commitId` and `turnNumber` but triggers a re-fetch of scenario data instead of applying a snapshot directly.

2. New listener for `turn_failed`:
```ts
.on('broadcast', { event: 'turn_failed' }, ({ payload }) => {
  dispatch({ type: 'SET_TURN_PHASE', payload: 'failed' })
  dispatch({ type: 'SET_TURN_ERROR', payload: payload.error })
})
```

3. **New GameProvider action:** `SET_TURN_ERROR` — stores error message in state. DispatchTerminal reads it to show the error message alongside the "Retry Turn" button.

### Client: useSubmitTurn.ts

Simplified from ~240 lines to ~60 lines.

- POST to `/advance` with `{ primaryAction, concurrentActions, controlledActors }`
- Expect JSON response: `{ turnCommitId, turnNumber, status: 'processing' }`
- Set `isSubmitting = true` on submit, set to `false` when Realtime delivers `turn_completed` or `turn_failed`
- All mock streaming code deleted (`makeMockLines`, `parseStreamLine`, `DEV_MOCK_ENABLED` fallbacks, `getReader()` loop)

### Client: DispatchTerminal

Reads from GameProvider state (`turnPhase`, `resolutionProgress`). Uses the structured `phase` field from broadcasts to render a deterministic phase checklist:

```
Phase indicator UI:
  [done]        Turn submitted           (phase >= 'planning')
  [done]        Actor plans generated     (phase >= 'resolving')
  [current]     Resolving actions...      (phase == 'resolving')
  [pending]     Judging plausibility      (phase < 'judging')
  [pending]     Generating narrative      (phase < 'narrating')
  [pending]     Finalizing turn           (phase < 'finalizing')
```

`turn_completed` marks all phases done. `turn_failed` shows error + "Retry Turn" button.

## Error handling

### Pipeline crashes mid-way
- Catch block updates `turn_commits.current_phase = 'failed'`
- Broadcasts `turn_failed` with error message
- UI shows error state + "Retry Turn" button
- Retry = new POST to `/advance`, creates new turn_commits row

### Duplicate submission
- `/advance` checks for existing `turn_commits` where `branch_id` matches and `current_phase` NOT IN `('complete', 'failed')`
- Returns HTTP 409 `{ error: "Turn already in progress" }`

### Stale turns (Vercel timeout / unhandled crash)
- If the serverless function is killed by Vercel before the catch block runs (e.g., exceeds 60s timeout), `turn_commits.current_phase` stays stuck in a mid-pipeline state.
- The duplicate-submission check includes a **staleness timeout**: if the non-terminal `turn_commits` row is older than 5 minutes (`created_at < now() - interval '5 minutes'`), treat it as failed — update its `current_phase` to `'failed'` and allow the new submission.
- This prevents permanently blocked branches.

### Realtime disconnects
- `useRealtime.ts` already tracks connection status
- On reconnect/refresh, play page reads `turn_commits` from DB to recover state: if `current_phase` is `'complete'`, turn finished; if `'failed'`, show error; if still processing, re-subscribe and wait.
- DB is source of truth; broadcasts are convenience, not the record.

### Failed turn cleanup
- Failed `turn_commits` rows accumulate over time. Not blocking for MVP. Future cleanup: a scheduled job or manual admin query to delete `turn_commits` where `current_phase = 'failed'` and `created_at < now() - interval '7 days'`.

## Files changed

| File | Change |
|---|---|
| `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts` | Replace stub with instant-response + background pipeline via `waitUntil` |
| `hooks/useSubmitTurn.ts` | Simplify to plain POST (~240 -> ~60 lines) |
| `hooks/useRealtime.ts` | Add `turn_failed` listener |
| `components/game/DispatchTerminal.tsx` | Phase checklist instead of teletype lines |
| `components/providers/GameProvider.tsx` | Add `SET_TURN_ERROR` action; handle missing snapshot in `SET_COMMIT` |
| `lib/game/turn-helpers.ts` (new) | `loadDecisionCatalog`, `adaptDecisionOptions`, `buildTurnPlanFromIds`, `broadcastTurnEvent`, `computeBranchDivergence` |
| `lib/types/simulation.ts` | Add `TurnPhase` type |
| `tests/game/turn-helpers.test.ts` (new) | Unit tests for helpers |
| `tests/api/advance.test.ts` (existing) | Add integration tests for new behavior |
| `package.json` | Add `@vercel/functions` dependency |
| `supabase/migrations/YYYYMMDD_turn_phase_enum.sql` (new) | ALTER turn_phase enum: add 'submitted', 'resolving', 'narrating', 'finalizing', 'failed'; rename 'resolution' to 'resolving' |

## Migration note

The Postgres `turn_phase` enum currently has values `('planning', 'resolution', 'reaction', 'judging', 'complete')`. The new pipeline introduces phases `'submitted'`, `'resolving'`, `'narrating'`, `'finalizing'`, `'failed'`. A migration must ALTER the enum before deployment, or `INSERT` with the new values will throw a constraint error. The `GameState["turnPhase"]` type in `GameProvider.tsx` must also be updated to match (import `TurnPhase` from `simulation.ts`).

## AI actor filtering

AI actors are only passed to `runActorAgent` if they have non-empty decision catalogs: `availableDecisions[actorId]?.length > 0`. This matches `/api/game/turn` line 191-196. Actors with empty catalogs (all non-US actors in MVP) are skipped for plan generation — the resolution engine still models their reactive behavior from scenario context and state.

## Files deleted

| File | Reason |
|---|---|
| `app/api/game/turn/route.ts` | Logic folded into `/advance`; becomes dead code |

## Tests

### Unit tests (turn-helpers.test.ts)

- `loadDecisionCatalog`: returns decisions keyed by actor; throws for unknown scenario
- `adaptDecisionOptions`: maps DecisionOption fields to Decision fields correctly
- `buildTurnPlanFromIds`: correct TurnPlan shape; resource split math (100%, 80/20, 40/20/20/20); throws on unknown ID
- `broadcastTurnEvent`: calls `supabase.channel().send()` with correct event name and payload
- `computeBranchDivergence`: returns 0 for trunk, commit count for non-trunk

### Integration tests (advance.test.ts)

- Happy path: returns `{ turnCommitId, status: 'processing' }`, inserts turn_commits with `current_phase: 'submitted'`
- Duplicate: returns 409 when turn in progress
- Stale turn: allows submission when existing turn is older than 5 minutes
- Bad action ID: returns 400
- No auth: returns 401 when auth configured and no session

### Not tested here (deferred to P1)

- Full AI pipeline end-to-end (separate test suite for resolution, judge, narrator)
- Realtime broadcast delivery (Supabase infrastructure)
- DispatchTerminal rendering (frontend visual testing)

## Known limitations

- **Single-actor decisions:** Only US has decisions via `IRAN_DECISIONS`. AI actors get empty catalogs and skip plan generation. Resolved by #52 (multi-actor decision catalog).
- **No resource allocation UI:** Player cannot set `resourcePercent` per action. Uses defaults (primary=100% alone, or 80/20 split with concurrent). Future UI work.
- **No observer mode auto-advance:** Observer can trigger turns but this spec focuses on the player path.
- **Vercel timeout ceiling:** 60s on Pro plan. If pipeline exceeds this, the turn stales and must be retried. Monitor and optimize AI call latency as a follow-up.

## Out of scope

- Resource allocation UI (player setting `resourcePercent` per action)
- Multi-scenario decision catalogs (only Iran exists)
- Retry queue / dead-letter handling (player clicks "Retry" manually)
- Observer mode auto-advance
- Failed turn cleanup automation
