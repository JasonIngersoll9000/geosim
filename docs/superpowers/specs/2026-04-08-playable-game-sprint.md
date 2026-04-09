# Playable Game Sprint — Design Spec
**Date:** 2026-04-08  
**Branch:** feat/playable-game (new)  
**Goal:** Replace all mock data with real Supabase data; make the game playable end-to-end on the Iran ground truth branch.

---

## Scope

This sprint covers the minimum required to make GeoSim playable:
- All mock data replaced with real Iran seed data from Supabase
- Game UI fully wired: actors, map assets, chronicle, turn submission
- Two ways to advance: player turn plan OR ground truth playback
- No AI loop (Claude calls deferred to next sprint)
- No branching beyond ground truth (deferred to next sprint)

---

## Section 1: Architecture

**Approach: RSC server-side hydration**

The play page (`app/scenarios/[id]/play/[branchId]/page.tsx`) is already a server component and already renders `<GameView branchId scenarioId />`. This sprint makes it async and fetches all initial game data server-side using the Supabase service role key, then passes the data as props to GameView.

GameView becomes a pure display/interaction layer — it receives real data, removes all `MOCK_*` constants, and keeps all existing UI logic intact.

This matches the RSC→GameProvider pattern already established in the project and ensures the game loads fully populated on first render with no loading spinners.

---

## Section 2: Play Page — Server-Side Data Fetching

`app/scenarios/[id]/play/[branchId]/page.tsx` becomes async and performs these Supabase queries before rendering:

| Data | Source | Used for |
|------|--------|----------|
| Scenario metadata | `scenarios` table | Name, date, classification label |
| Branch record | `branches` table | Current turn number, label |
| Actors list | `actors` table | Actor panel, map overlays, actor control selector |
| Current game state | `getStateAtTurn(branchId, latestTurnCommitId)` | Asset availability, scores, facility statuses |
| Decision catalog | `actor_decisions` joined with `decisions` | Decisions panel per actor |
| Chronicle entries | `turn_commits` for this branch, ordered by turn | Chronicle timeline |
| Ground truth turn commits | `turn_commits` on ground truth branch, ordered by turn | Ground truth playback sequence |

All data is passed as typed props into `GameView`. The Iran seed data is fully populated, so no empty/loading states are needed on initial render.

---

## Section 3: GameView — Replace Mock Data

`components/game/GameView.tsx` receives new props replacing the `MOCK_*` constants:

**Remove:**
- `MOCK_ACTORS` → replaced by `actors: ActorSummary[]` prop
- `MOCK_ACTOR_DETAILS` → replaced by `actorDetails: Record<string, ActorDetail>` prop (from actor-panel API data or state)
- `MOCK_DECISIONS` → replaced by `decisions: DecisionOption[]` prop
- `MOCK_DECISION_DETAILS` → replaced by `decisionDetails: Record<string, DecisionDetail>` prop
- `MOCK_RESOLUTION` → removed (DispatchTerminal is fed from real SSE stream)
- `BASE_CHRONICLE` → replaced by `chronicle: ChronicleEntry[]` prop
- Hardcoded `turnNumber: 4` → replaced by real turn number from branch record

**Keep unchanged:**
- All UI layout, panels, tabs, and interaction logic
- `useRealtime(branchId)` — Supabase realtime subscription
- `ActorControlSelector` modal
- DispatchTerminal streaming display
- All component wiring

The `Props` interface expands to include the fetched data. Internal state (selected actor, active tab, primary action, concurrent actions, etc.) stays as-is.

---

## Section 4: Map — Real Assets + Click-to-Inspect

### 4a: Fix GameMap data source

`components/map/GameMap.tsx` currently calls hardcoded `/api/scenarios/iran-2026/assets`. Replace with:
```
/api/scenarios/${scenarioId}/branches/${branchId}/map-assets
```
`scenarioId` and `branchId` are passed as props from GameView → GameMap.

### 4b: Map-assets API — actor_capabilities fallback

The map-assets route (`app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts`) currently reads from `state.facility_statuses`, filtering for entries with `lat`/`lng`. If the seeded snapshots lack coordinates in `facility_statuses`, no assets appear.

Add a fallback: if `facility_statuses` returns 0 assets with valid coordinates, also query `actor_capabilities` directly (which always has `lat`/`lng` from the seed) and merge, mapping `category`/`asset_type` to `MapAssetType`. This ensures carrier groups, airbases, naval bases, nuclear facilities, and missile batteries all appear on the map.

### 4c: Asset info popup

`MapboxMap` already has `onAssetClick(id)` and `selectedAssetId` props. Add an `AssetInfoPanel` component that renders when `selectedAssetId` is set, positioned as an overlay on the map. It displays:
- Asset name and type icon
- Actor flag + name
- Operational status (OPERATIONAL / DEGRADED / DESTROYED) with color coding
- Capacity % bar
- Description from seed data

Clicking elsewhere or pressing Escape closes it.

---

## Section 5: Turn Advancement — Two Modes

### Mode A: Player Turn Plan

When the player submits their turn plan:

1. `useSubmitTurn` calls `POST /api/scenarios/[id]/branches/[branchId]/advance`  
   (Fix from current wrong path `/api/branches/[branchId]/advance`)

2. New endpoint (`app/api/scenarios/[id]/branches/[branchId]/advance/route.ts`):
   - Validates turn plan (prerequisites + resource checks via existing `lib/game/` logic)
   - Writes a `turn_commit` row to Supabase with the player's primary + concurrent actions
   - Calls `onPlayerDecision()` from `lib/game/game-loop.ts` (already implemented)
   - Streams back ~5 SSE `DispatchLine` events:
     - `"Turn plan received — validating prerequisites..."` (info)
     - `"Operational parameters confirmed."` (confirmed)
     - `"Applying effects to theater state..."` (info)
     - `"Threshold evaluation complete. [N] triggers assessed."` (info)
     - `"Turn [N] → Turn [N+1]. Awaiting next phase."` (confirmed)
   - NPC actors take no action this sprint

3. On stream completion, client refreshes state from the new `turn_commit_id`.

### Mode B: Ground Truth Advance

A "NEXT EVENT →" button in the game UI steps through the pre-seeded Iran ground truth timeline.

When clicked:
- Fetches the next `turn_commit` in sequence on the ground truth branch (by turn number, ordered ascending)
- Calls `GET /api/scenarios/[id]/branches/[branchId]/ground-truth-step?currentTurn=[N]`  
  Returns: next turn commit ID, event description, state delta
- Updates all displayed state: actor scores, map assets, chronicle
- DispatchTerminal shows the event description from the seed data as dispatch lines
- Turn counter increments

Both modes update the same display — actors panel, map, chronicle — using the same state refresh flow. The distinction is only the source of the advance.

The ground truth branch is read-only (no player turn submission on it). Player branches are for Mode A. On first load of the ground truth branch, only Mode B is available; on a player branch, only Mode A is available.

---

## Section 6: Scenarios List + Browser

### Scenarios list (`app/scenarios/page.tsx`)
- Remove `MOCK_SCENARIOS` entirely
- Remove the fallback `setScenarios(MOCK_SCENARIOS)` on API error
- If `/api/scenarios` fails, show an error state ("Unable to load scenarios")
- The Iran scenario from Supabase is the only entry shown

### Scenario browser (`app/scenarios/[id]/page.tsx`)
- Replace `MOCK_BRANCHES` with real branches fetched from Supabase `branches` table for this scenario
- Replace `MOCK_ACTORS` with real actors fetched from `actors` table
- BranchTree component unchanged — it already navigates to `/scenarios/[id]/play/[branchId]`

---

## Out of Scope (Next Sprint)

- Claude AI calls for NPC actor decisions
- Resolution engine (lib/ai/resolution-engine.ts)
- Judge evaluator + retry loop
- Narrator / chronicle AI writing
- Player branching (fork from ground truth node)
- Auth enforcement (dev bypass stays active)
- CI/CD GitHub Actions (#66)

---

## Files Touched

| File | Change |
|------|--------|
| `app/scenarios/[id]/play/[branchId]/page.tsx` | Make async, add server-side fetches, pass props |
| `components/game/GameView.tsx` | Remove MOCK_*, accept real data props |
| `components/map/GameMap.tsx` | Fix hardcoded API URL, accept scenarioId/branchId props |
| `components/map/AssetInfoPanel.tsx` | New — asset click popup |
| `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` | Add actor_capabilities fallback |
| `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts` | New — turn advance endpoint (SSE) |
| `app/api/scenarios/[id]/branches/[branchId]/ground-truth-step/route.ts` | New — ground truth step endpoint |
| `hooks/useSubmitTurn.ts` | Fix URL to match new advance route; add `scenarioId` param (GameView passes it) |
| `app/scenarios/page.tsx` | Remove MOCK_SCENARIOS fallback |
| `app/scenarios/[id]/page.tsx` | Replace MOCK_BRANCHES + MOCK_ACTORS with real fetches |
