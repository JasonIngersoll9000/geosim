# Playable Game Bug Report
**Date:** 2026-04-09  
**Branch investigated:** main (after PR #50 merge)  
**Reporter:** Claude Code  

---

## Bug 1 — Actors query uses wrong column names → 400 error

**File:** `app/scenarios/[id]/page.tsx` lines ~326–344  
**Symptom:** `zaaewkegrmbqgsojlfum.supabase.co/rest/v1/actors?select=id%2Cname%2Ccountry_code` → 400; branch tree shows "Loading branches…" forever  
**Root cause:** The Supabase query selects `id, name, country_code` from the `actors` table. The actors table has no `id` column (primary key is `actor_id`) and no `country_code` column. Supabase returns 400 on invalid column names. The flag emoji in the actor option list also tries to use `country_code` as a key to look up flags.  
**Why it breaks the branch tree:** The `useEffect` in this component runs both the branches query AND the actors query. When the actors query fails, the error is swallowed silently, but `actorOptions` stays empty. The `setBranchRoot` call may still fire if branches succeed, but the overall component is in a degraded state.  
**Fix:** Change query to `.select('actor_id, name')` and use `actor_id` (not `country_code`) as the key into `FLAG_MAP`.

---

## Bug 2 — `GameMap` still calls hardcoded `/api/scenarios/iran-2026/cities` → 500

**File:** `components/map/GameMap.tsx` line ~79  
**Symptom:** `GET /api/scenarios/iran-2026/cities 500 (Internal Server Error)` in devtools  
**Root cause:** The old `/cities` fetch was never removed during Task 6. It still uses the hardcoded `iran-2026` scenario ID regardless of the `scenarioId` prop, and it points to a route (`/api/scenarios/[id]/cities`) that either doesn't exist or throws. Even if fixed to use `scenarioId`, key cities are already hardcoded as static GeoJSON in `MapboxMap.tsx` — this fetch is entirely redundant.  
**Fix:** Delete the cities fetch call entirely. Cities are already handled statically in `MapboxMap.tsx`.

---

## Bug 3 — `map-assets` route requires `turnCommitId` and returns 400 when missing

**File:** `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` lines ~46–50  
**Symptom:** `GET /api/scenarios/iran-2026/branches/trunk/map-assets 400 (Bad Request)` — also triggered when `turnCommitId` query param is absent or empty  
**Root cause:** The route calls `getStateAtTurn(branchId, turnCommitId)` and returns 400 if `turnCommitId` is not provided. On first load of the ground truth branch, `GameMap` may not yet have the `turnCommitId` from `initialData`, or the prop isn't being passed. The URL also shows `trunk` as the branchId in some older call paths — `trunk` is not a valid branch UUID.  
**Secondary cause:** `GameMap.tsx` has `branchId = ''` as a default prop, so when rendered before `initialData` is available, `branchId` is empty and the fetch constructs an invalid URL like `/api/scenarios/iran-2026/branches//map-assets`.  
**Fix:**  
1. Make `turnCommitId` optional in the map-assets route — if absent, skip `getStateAtTurn` and go directly to the `actor_capabilities` fallback (which always has coordinates).  
2. In `GameMap.tsx`, don't fetch when `branchId` is empty or falsy.  
3. Ensure `initialData.branch.headCommitId` is passed as `turnCommitId` from `GameView` → `GameMap`.

---

## Bug 4 — Map only shows USS Nimitz (placed on land) and Strait of Hormuz

**File:** `components/map/GameMap.tsx` and `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts`  
**Symptom:** Only one ship marker visible (USS Nimitz), positioned on land; no other military assets  
**Root cause:** Because of Bug 3 (400 on map-assets), the `actor_capabilities` fallback never executes. The single asset showing is likely a hardcoded default in `MapboxMap.tsx`, not a real DB result. The Nimitz being on land suggests a lat/lng value of approximately (36°N, 54°E) which is central Iran — the coordinates in the seed data may have lat/lng swapped for some assets.  
**Fix:** Fix Bug 3 first (make `turnCommitId` optional → fallback to `actor_capabilities`). Then audit the `actor_capabilities` seed data to confirm lat/lng values are correct (not swapped).

---

## Bug 5 — "Run Research Update" button visible in game UI

**File:** `components/game/ResearchUpdatePanel.tsx` line ~80  
**Symptom:** A "Run Research Update" button appears in the bottom-right of the game view, accessible to all users  
**Root cause:** `ResearchUpdatePanel` is an admin/developer tool (triggers a 7-stage AI research pipeline). It has no permission check — it renders unconditionally wherever it's included in the game layout.  
**Fix:** Either (a) remove `<ResearchUpdatePanel />` from `GameView.tsx` entirely (research updates are a backend admin operation), or (b) gate it behind `process.env.NEXT_PUBLIC_DEV_MODE === 'true'`. Option (a) is cleaner.

---

## Bug 6 — TopBar shows "Turn 4/12" hardcoded defaults

**File:** `components/ui/TopBar.tsx` lines ~24–25  
**Symptom:** Turn counter shows "4/12" instead of real values  
**Root cause:** TopBar has hardcoded default props `turnNumber = 4` and `totalTurns = 12`. The play page does pass real values, but if `gtCommits.length === 0` (ground truth commits not loaded) or `turnNumber === 0`, the defaults kick in. The real fix is twofold: remove the hardcoded defaults from TopBar, AND ensure the play page correctly computes `turnNumber` from `initialData`.  
**Why data may be missing:** If the branch record has no `head_commit_id` (e.g., ground truth branch seeded without a head pointer), `turnNumber` falls back to 0. Also `gtCommits.length` is 0 if `turn_commits` for the trunk branch returns empty.  
**Fix:** Remove hardcoded defaults from TopBar (`turnNumber = 0`, `totalTurns = 0`). Also verify the ground truth branch has a populated `head_commit_id` in Supabase and that `turn_commits` rows exist for it.

---

## Bug 7 — Actors tab is blank in GameView

**File:** `components/game/GameView.tsx` and `app/scenarios/[id]/play/[branchId]/page.tsx`  
**Symptom:** Right-side actors panel shows nothing  
**Root cause:** `initialData.actors` is empty. The play page fetches actors with `.eq('scenario_id', params.id)` where `params.id` is the scenario UUID (e.g., the UUID for the Iran scenario). However, if the `scenarios` table row for Iran uses a slug (`iran-2026`) as its ID but the URL parameter is a UUID, the query returns empty. Alternatively, if the actors table rows have a different `scenario_id` format than what's in the URL, they won't match.  
**Fix:** Verify that the `scenario_id` stored in the `actors` table matches the `id` format used in the URL (UUID vs slug). If the scenario is accessed by slug `iran-2026`, the actors' `scenario_id` must also be `iran-2026`. Log what `params.id` is on the server and what the actors query returns.

---

## Bug 8 — Chronicle/events tab is empty

**File:** `app/scenarios/[id]/play/[branchId]/page.tsx`  
**Symptom:** No events shown in the chronicle panel  
**Root cause:** Same as Bug 7 — `turn_commits` are queried with `.eq('branch_id', params.branchId)`. If `params.branchId` doesn't match any `branch_id` in `turn_commits`, the query returns empty. Also possible: the ground truth branch has commits seeded but `branch_id` in `turn_commits` doesn't match the branch UUID in the URL.  
**Fix:** Verify that the `branchId` in the URL (from the BranchTree navigation) matches the `branch_id` in `turn_commits` rows. Add a server-side log or error fallback to surface when queries return empty unexpectedly.

---

## Bug 9 — Decisions panel shows US-only decisions in observer mode

**File:** `components/game/GameView.tsx`  
**Symptom:** Decision panel shows decisions even in observer mode, and only shows US-perspective options  
**Root cause:** The decisions passed from `initialData.decisions` come from `IRAN_DECISIONS` in `lib/game/iran-decisions.ts`, which is a US-centric decision catalog (all 7 options are US strategic choices). In observer mode (`isTrunk = true`), the decisions panel should either be hidden entirely or show a read-only multi-actor view. Currently `isGtMode` is computed but not used to hide the decisions panel.  
**Fix:**  
1. In `GameView.tsx`, wrap the DecisionPanel/TurnPlanBuilder in `{!isGtMode && ...}` so it's hidden in observer mode.  
2. Long-term: replace the static US-only `IRAN_DECISIONS` with a multi-actor catalog or derive available decisions from the selected actor.

---

## Bug 10 — Actor status panel overlaps map layer toggles

**File:** `components/game/GameView.tsx` or `components/panels/ActorStatusPanel.tsx`  
**Symptom:** The actor status panel (left side) renders on top of the map layer toggle buttons  
**Root cause:** CSS z-index or absolute positioning conflict. The map layer toggle component uses absolute positioning and the actor panel likely has an overlapping stacking context.  
**Fix:** Audit z-index values and positioning of both components. The map layer toggles should have a higher z-index than any floating panels, or the panel should be moved to not overlap the toggle position.

---

## Bug 11 — "Branch creation is not available yet" placeholder text

**File:** `components/scenario/BranchTree.tsx` (likely)  
**Symptom:** Button or message says "Branch creation is not available yet"  
**Root cause:** Placeholder UI for a feature not yet implemented. This is expected — branch creation (forking from a ground truth node) was explicitly deferred to the next sprint.  
**Fix:** Either hide this UI element entirely for now, or change the text to be less jarring ("Branching available in Player Mode").

---

## Priority Order for Fixes

| Priority | Bug | Impact |
|----------|-----|--------|
| P0 | Bug 3 — map-assets 400 / make turnCommitId optional | Blocks all map assets |
| P0 | Bug 1 — actors query wrong columns | Breaks scenario browser |
| P0 | Bug 2 — hardcoded /cities call | Console error, 500 |
| P0 | Bug 7 — actors empty in play page | Blank actors tab |
| P0 | Bug 8 — chronicle empty | No game history visible |
| P1 | Bug 4 — map assets don't render | Core feature broken |
| P1 | Bug 5 — Research Update button | Admin tool exposed |
| P1 | Bug 9 — Decisions in observer mode | Wrong UI mode |
| P2 | Bug 6 — TopBar hardcoded defaults | Visual clutter |
| P2 | Bug 10 — Panel overlap | Layout issue |
| P3 | Bug 11 — Branch creation placeholder | Minor UX |
