# Playable Game Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 post-merge bugs blocking the playable game: broken API calls, wrong column names, hardcoded URLs, missing API fallbacks, exposed admin UI, and wrong CSS z-index.

**Architecture:** Each task is a standalone fix with no dependencies between tasks (except Task 2 depends on Task 1 reshaping the route response). All changes are on branch `fix/playable-game-bugs`. No new files except a favicon asset.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Vitest, Tailwind CSS

**Bug reference:** `docs/bugs/2026-04-09-playable-game-bugs.md` — read this file for full context on root causes.

---

## File Map

| File | Bugs Fixed |
|------|-----------|
| `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` | Bug 3 |
| `components/map/GameMap.tsx` | Bug 2, Bug 4 (response parsing) |
| `app/scenarios/[id]/page.tsx` | Bug 1, Bug 11 |
| `app/scenarios/[id]/play/[branchId]/page.tsx` | Bug 7, Bug 8 |
| `components/game/GameView.tsx` | Bug 5, Bug 9 |
| `components/ui/TopBar.tsx` | Bug 6 |
| `public/favicon.svg` | Issue #57 |
| `tests/api/map-assets.test.ts` | Bug 3 test |

---

### Task 1: Fix map-assets route — make `turnCommitId` optional (Bug 3)

**Files:**
- Modify: `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts:48-50`
- Modify: `tests/api/map-assets.test.ts` (add new test case)

**Context:** The route currently returns 400 if `turnCommitId` query param is missing. On first page load `GameMap` may not have the commit ID yet, so the map is blank. Fix: when `turnCommitId` is absent, skip `getStateAtTurn` and go straight to the `actor_capabilities` fallback (which always has lat/lng). The route's `params.id` is the scenario ID — use it directly for the fallback query.

- [ ] **Step 1: Add a failing test for the optional-turnCommitId case**

Open `tests/api/map-assets.test.ts`. Add this test at the end of the describe block:

```typescript
it('returns 200 with actor_capabilities assets when turnCommitId is missing', async () => {
  // The route should not 400 when turnCommitId is absent
  const req = new Request(
    'http://localhost:3000/api/scenarios/test-scenario/branches/test-branch/map-assets',
    { method: 'GET' }
  )
  const params = { id: 'test-scenario', branchId: 'test-branch' }

  // Mock supabase to return one capability row
  vi.mocked(createServerClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({
            data: [{
              id: 'cap-1',
              actor_id: 'iran',
              name: 'Fordow Nuclear Facility',
              asset_type: 'nuclear_facility',
              category: null,
              lat: 34.88,
              lng: 49.93,
              status: 'operational',
              description: 'Underground enrichment site',
            }],
            error: null,
          }),
        }),
      }),
      eq: vi.fn().mockReturnThis(),
    }),
  } as ReturnType<typeof createServerClient>)

  const { GET } = await import('@/app/api/scenarios/[id]/branches/[branchId]/map-assets/route')
  const response = await GET(req, { params })

  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.data.assets.length).toBeGreaterThan(0)
  expect(body.data.assets[0].actor_id).toBe('iran')
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test -- --run tests/api/map-assets.test.ts --reporter=verbose
```

Expected: FAIL — the route returns 400 when `turnCommitId` is missing.

- [ ] **Step 3: Rewrite the route GET handler**

Replace lines 37–140 of `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` with:

```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string; branchId: string } }
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const turnCommitId = searchParams.get('turnCommitId')

  try {
    const supabase = await createClient()
    const assets: MapAsset[] = []

    if (turnCommitId) {
      // Prefer state-engine data when we have a commit reference
      const state = await getStateAtTurn(params.branchId, turnCommitId)

      const stateAssets: MapAsset[] = state.facility_statuses
        .filter(f => f.lat !== undefined && f.lng !== undefined)
        .map(f => ({
          id:                      `${f.actor_id}-${f.name.toLowerCase().replace(/\s+/g, '-')}`,
          actor_id:                f.actor_id,
          asset_type:              facilityTypeToMapAssetType(f.type),
          label:                   f.name,
          lat:                     f.lat!,
          lng:                     f.lng!,
          status:                  f.status,
          capacity_pct:            f.capacity_pct,
          actor_color:             ACTOR_COLORS[f.actor_id] ?? '#888888',
          tooltip:                 `${f.name} — ${f.status} (${f.capacity_pct}% capacity). ${f.location_label}`,
          is_approximate_location: f.type === 'carrier_group' || f.type === 'troop_deployment',
        }))

      assets.push(...stateAssets)

      // Fallback within the turnCommitId path: if facility_statuses had no coordinates
      if (assets.length === 0) {
        await fillFromCapabilities(supabase, params.id, assets)
      }

      const shipping_lanes: ShippingLane[] = [
        {
          id:             'strait_of_hormuz',
          label:          'Strait of Hormuz',
          throughput_pct: state.global_state.hormuz_throughput_pct,
          coordinates:    HORMUZ_COORDINATES,
        },
      ]

      const response: MapAssetsResponse = {
        turn_commit_id: turnCommitId,
        as_of_date:     state.as_of_date,
        assets,
        shipping_lanes,
      }
      return NextResponse.json({ data: response })
    }

    // No turnCommitId — return static capability snapshot
    await fillFromCapabilities(supabase, params.id, assets)

    const shipping_lanes: ShippingLane[] = [
      {
        id:             'strait_of_hormuz',
        label:          'Strait of Hormuz',
        throughput_pct: 100,
        coordinates:    HORMUZ_COORDINATES,
      },
    ]

    const response: MapAssetsResponse = {
      turn_commit_id: '',
      as_of_date:     new Date().toISOString().split('T')[0],
      assets,
      shipping_lanes,
    }
    return NextResponse.json({ data: response })

  } catch (err) {
    console.error('[map-assets] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Also extract the actor_capabilities fetch into a helper function, inserted after the `ACTOR_COLORS` block and before the `facilityTypeToMapAssetType` function:

```typescript
async function fillFromCapabilities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scenarioId: string,
  assets: MapAsset[]
): Promise<void> {
  const { data: caps } = await supabase
    .from('actor_capabilities')
    .select('id, actor_id, name, asset_type, category, lat, lng, status, description')
    .eq('scenario_id', scenarioId)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (!caps) return

  const typeMap: Record<string, string> = {
    nuclear_facility: 'nuclear_facility', oil_gas_facility: 'oil_gas_facility',
    military_base: 'military_base', carrier: 'carrier_group',
    carrier_group: 'carrier_group', naval_base: 'naval_asset',
    airbase: 'military_base', headquarters: 'military_base',
    missile_battery: 'missile_battery',
  }

  for (const cap of caps as Array<{
    id: string; actor_id: string; name: string; asset_type: string | null
    category: string | null; lat: number; lng: number; status: string | null
    description: string | null
  }>) {
    const rawType = cap.asset_type ?? cap.category ?? 'military_base'
    assets.push({
      id:                      cap.id,
      actor_id:                cap.actor_id,
      asset_type:              (typeMap[rawType] ?? 'military_base') as MapAssetType,
      label:                   cap.name,
      lat:                     cap.lat,
      lng:                     cap.lng,
      status:                  cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational',
      capacity_pct:            100,
      actor_color:             ACTOR_COLORS[cap.actor_id] ?? '#888888',
      tooltip:                 cap.description ?? cap.name,
      is_approximate_location: rawType === 'carrier' || rawType === 'carrier_group',
    })
  }
}
```

Also remove the old inline fallback block (lines ~71-110 in the original — the `if (assets.length === 0)` block inside the try) since it is now handled by `fillFromCapabilities`.

- [ ] **Step 4: Run tests to verify passing**

```bash
bun run test -- --run tests/api/map-assets.test.ts --reporter=verbose
```

Expected: all tests pass including the new one.

- [ ] **Step 5: Commit**

```bash
git add app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts tests/api/map-assets.test.ts
git commit -m "fix: make turnCommitId optional in map-assets route, fallback to actor_capabilities"
```

---

### Task 2: Fix GameMap response parsing and remove hardcoded cities fetch (Bugs 2 & 4)

**Files:**
- Modify: `components/map/GameMap.tsx:69-83`

**Context:**
- Bug 2: `useEffect` at line ~79 fetches `/api/scenarios/iran-2026/cities` (hardcoded). Cities are already static GeoJSON in `MapboxMap.tsx`. Delete this useEffect entirely.
- Bug 4: The map-assets fetch (line 73-75) destructures `{ assets: data }` but the route returns `{ data: { assets } }`. Change the destructuring to match the `{ data, error }` API convention.

- [ ] **Step 1: Run existing tests to establish baseline**

```bash
bun run test -- --run --reporter=verbose 2>&1 | tail -10
```

Expected: all existing tests pass (note the count for comparison after fix).

- [ ] **Step 2: Fix the map-assets fetch response parsing**

In `components/map/GameMap.tsx`, find the first `useEffect` (around line 69-76):

```typescript
useEffect(() => {
  if (!branchId) return
  const url = `/api/scenarios/${scenarioId}/branches/${branchId}/map-assets${turnCommitId ? `?turnCommitId=${turnCommitId}` : ''}`
  fetch(url)
    .then(r => r.json())
    .then(({ assets: data }: { assets: MapAsset[] | null }) => { if (data) setMapAssets(data) })
    .catch(() => {})
}, [scenarioId, branchId, turnCommitId])
```

Replace with:

```typescript
useEffect(() => {
  if (!branchId) return
  const url = `/api/scenarios/${scenarioId}/branches/${branchId}/map-assets${turnCommitId ? `?turnCommitId=${turnCommitId}` : ''}`
  fetch(url)
    .then(r => r.json())
    .then(({ data }: { data: { assets: MapAsset[] } | null }) => {
      if (data?.assets) setMapAssets(data.assets)
    })
    .catch(() => {})
}, [scenarioId, branchId, turnCommitId])
```

- [ ] **Step 3: Delete the hardcoded cities fetch**

In `components/map/GameMap.tsx`, find and delete this entire `useEffect` block (around lines 78-83):

```typescript
useEffect(() => {
  fetch('/api/scenarios/iran-2026/cities')
    .then(r => r.json())
    .then(({ data }: { data: City[] | null }) => { if (data) setCities(data) })
    .catch(() => {})
}, [])
```

Delete the block. Cities are already hardcoded as static GeoJSON in `MapboxMap.tsx`.

- [ ] **Step 4: Check if `City` type and `cities` state are now unused**

After deleting the fetch, check if any other code in the file uses `cities` state or the `City` import. If `cities` state is only set in that deleted useEffect and only used by `MapboxMap`, check if `MapboxMap` receives `cities` as a prop.

Run:
```bash
bun run typecheck 2>&1 | grep -E "GameMap|cities|City" | head -20
```

If there are unused variable errors, remove the `useState` for `cities` and the `City` import from `GameMap.tsx`. If `cities` is passed as a prop to `MapboxMap`, keep the state but initialize it as `[]` — the static GeoJSON in MapboxMap already handles cities.

- [ ] **Step 5: Run tests to confirm no regressions**

```bash
bun run test -- --run --reporter=verbose 2>&1 | tail -10
```

Expected: same test count as baseline, all pass.

- [ ] **Step 6: Commit**

```bash
git add components/map/GameMap.tsx
git commit -m "fix: correct map-assets response parsing and remove hardcoded cities fetch"
```

---

### Task 3: Fix actors query column names in Scenario Hub (Bug 1)

**Files:**
- Modify: `app/scenarios/[id]/page.tsx:331-346`

**Context:** The Supabase query selects `id, name, country_code` from `actors`. The actors table has no `id` column (PK is `actor_id`) and no `country_code` column. Supabase returns 400, leaving `actorOptions` empty and the actor perspective selector blank.

- [ ] **Step 1: Fix the actors query**

In `app/scenarios/[id]/page.tsx`, find the actors fetch inside the `useEffect` (around line 329-332):

```typescript
supabase
  .from('actors')
  .select('id, name, country_code')
  .eq('scenario_id', params.id),
```

Replace with:

```typescript
supabase
  .from('actors')
  .select('actor_id, name')
  .eq('scenario_id', params.id),
```

- [ ] **Step 2: Fix the actorOptions mapping**

Find the actorOptions mapping (around lines 339-347):

```typescript
if (actorRes.data) {
  setActorOptions(
    actorRes.data.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      name: a.name as string,
      flag: ((a.country_code as string | null) ?? (a.name as string).slice(0, 3)).toUpperCase(),
    }))
  )
}
```

Replace with:

```typescript
if (actorRes.data) {
  setActorOptions(
    actorRes.data.map((a: Record<string, unknown>) => ({
      id: a.actor_id as string,
      name: a.name as string,
      flag: (a.name as string).slice(0, 3).toUpperCase(),
    }))
  )
}
```

- [ ] **Step 3: Run typecheck to confirm no type errors**

```bash
bun run typecheck 2>&1 | grep -E "page.tsx" | head -20
```

Expected: no errors from this file.

- [ ] **Step 4: Run all tests to confirm no regressions**

```bash
bun run test -- --run 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add "app/scenarios/[id]/page.tsx"
git commit -m "fix: correct actors query columns — actor_id not id, remove country_code"
```

---

### Task 4: Fix play page actors and chronicle queries (Bugs 7 & 8)

**Files:**
- Modify: `app/scenarios/[id]/play/[branchId]/page.tsx:44-65`

**Context:** Both bugs share the same root cause — if `params.id` is a URL slug (e.g., `iran-2026`) but the scenario row's PK is a UUID, then actors queried by `.eq('scenario_id', params.id)` return empty. Fix: use `scenario?.id` (the actual DB row ID returned from the first fetch) for all subsequent queries. Similarly, the chronicle query uses `params.branchId` — verify the branch record exists first and use `branch?.id`.

- [ ] **Step 1: Fix actors query to use fetched scenario ID**

In `app/scenarios/[id]/play/[branchId]/page.tsx`, find the actors fetch (around line 44-48):

```typescript
const { data: actorRows } = await supabase
  .from('actors')
  .select('actor_id, name, win_condition, lose_condition, strategic_posture, escalation_ladder')
  .eq('scenario_id', params.id)
```

Replace with:

```typescript
const { data: actorRows } = await supabase
  .from('actors')
  .select('actor_id, name, win_condition, lose_condition, strategic_posture, escalation_ladder')
  .eq('scenario_id', scenario?.id ?? params.id)
```

- [ ] **Step 2: Fix chronicle query to use fetched branch ID**

Find the turn_commits query (around line 61-65):

```typescript
const { data: commits } = await supabase
  .from('turn_commits')
  .select('turn_number, simulated_date, narrative_entry')
  .eq('branch_id', params.branchId)
  .order('turn_number', { ascending: true })
```

Replace with:

```typescript
const { data: commits } = await supabase
  .from('turn_commits')
  .select('turn_number, simulated_date, narrative_entry')
  .eq('branch_id', branch?.id ?? params.branchId)
  .order('turn_number', { ascending: true })
```

- [ ] **Step 3: Add dev-mode diagnostic logging**

After the `groundTruthCommits` fetch (around line 80), add:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[play page] params:', { id: params.id, branchId: params.branchId })
  console.log('[play page] scenario?.id:', scenario?.id)
  console.log('[play page] branch?.id:', branch?.id)
  console.log('[play page] actorRows?.length:', actorRows?.length ?? 0)
  console.log('[play page] commits?.length:', commits?.length ?? 0)
}
```

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "play" | head -10
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
bun run test -- --run 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add "app/scenarios/[id]/play/[branchId]/page.tsx"
git commit -m "fix: use fetched scenario.id and branch.id for actors and chronicle queries"
```

---

### Task 5: Remove ResearchUpdatePanel from GameView (Bug 5)

**Files:**
- Modify: `components/game/GameView.tsx`

**Context:** `<ResearchUpdatePanel>` is an admin/dev tool (triggers 7-stage AI pipeline). It's imported and rendered unconditionally in the observer mode section. Remove it from the game UI entirely — research updates are a backend admin operation.

- [ ] **Step 1: Remove the import**

In `components/game/GameView.tsx`, find and delete line 18:

```typescript
import { ResearchUpdatePanel } from '@/components/game/ResearchUpdatePanel'
```

- [ ] **Step 2: Remove the JSX block**

Find and delete this block (around lines 432-436):

```typescript
          {/* Ground truth research panel */}
          <div className="shrink-0 p-3 border-t border-border-subtle">
            <ResearchUpdatePanel scenarioId={scenarioId} />
          </div>
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "GameView" | head -10
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
bun run test -- --run 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add components/game/GameView.tsx
git commit -m "fix: remove ResearchUpdatePanel from game UI — admin-only tool"
```

---

### Task 6: Hide decisions panel in observer mode (Bug 9)

**Files:**
- Modify: `components/game/GameView.tsx`

**Context:** In observer (ground truth) mode, `isGtMode = true`. The decisions tab and content are still shown with only US decisions. In observer mode, the player has no actor — decisions are irrelevant. Fix: filter the PANEL_TABS list to exclude 'decisions' when `isGtMode` is true.

- [ ] **Step 1: Filter tabs based on mode**

In `components/game/GameView.tsx`, find the `PANEL_TABS` constant (around line 36-41):

```typescript
const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'actors',    label: 'ACTORS'    },
  { id: 'decisions', label: 'DECISIONS' },
  { id: 'events',    label: 'EVENTS'    },
  { id: 'chronicle', label: 'CHRONICLE' },
]
```

This is a module-level constant — it can't reference `isGtMode`. Instead, find where tabs are rendered (around line 360):

```typescript
{PANEL_TABS.map(({ id, label }) => (
```

Replace with:

```typescript
{PANEL_TABS.filter(t => !isGtMode || t.id !== 'decisions').map(({ id, label }) => (
```

- [ ] **Step 2: Also guard the decisions tab content**

Find the decisions tab content (around line 385-392):

```typescript
{activeTab === 'decisions' && (
  <DecisionCatalog
    decisions={initialData.decisions}
    onSelect={handleDecisionSelect}
    selectedPrimaryId={primaryAction?.id ?? null}
    selectedConcurrentIds={concurrentActions.map(a => a.id)}
  />
)}
```

Replace with:

```typescript
{activeTab === 'decisions' && !isGtMode && (
  <DecisionCatalog
    decisions={initialData.decisions}
    onSelect={handleDecisionSelect}
    selectedPrimaryId={primaryAction?.id ?? null}
    selectedConcurrentIds={concurrentActions.map(a => a.id)}
  />
)}
```

- [ ] **Step 3: Run typecheck and tests**

```bash
bun run typecheck 2>&1 | grep "GameView" | head -10
bun run test -- --run 2>&1 | tail -5
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/game/GameView.tsx
git commit -m "fix: hide decisions tab in observer (ground truth) mode"
```

---

### Task 7: Fix TopBar hardcoded defaults (Bug 6)

**Files:**
- Modify: `components/ui/TopBar.tsx:21-28`

**Context:** TopBar defaults `turnNumber = 4` and `totalTurns = 12`. When the game loads with real data but `turnNumber = 0` (empty branch), the defaults show "04/12" instead of real values. Change defaults to `0`.

- [ ] **Step 1: Update defaults**

In `components/ui/TopBar.tsx`, find:

```typescript
export function TopBar({
  scenarioName = "Iran Conflict Scenario",
  scenarioHref,
  turnNumber = 4,
  totalTurns = 12,
  phase = "Planning",
  gameMode = "Simulation",
}: TopBarProps) {
```

Replace with:

```typescript
export function TopBar({
  scenarioName = "Iran Conflict Scenario",
  scenarioHref,
  turnNumber = 0,
  totalTurns = 0,
  phase = "Planning",
  gameMode = "Simulation",
}: TopBarProps) {
```

- [ ] **Step 2: Handle zero display**

In the same file, find the turn counter span (around line 65-68):

```typescript
<span className="font-mono text-xs text-text-tertiary">
  TURN {String(turnNumber).padStart(2, "0")} /{" "}
  {String(totalTurns).padStart(2, "0")}
</span>
```

Replace with:

```typescript
<span className="font-mono text-xs text-text-tertiary">
  {turnNumber > 0 || totalTurns > 0
    ? `TURN ${String(turnNumber).padStart(2, '0')} / ${String(totalTurns).padStart(2, '0')}`
    : 'TURN — / —'}
</span>
```

- [ ] **Step 3: Run typecheck and tests**

```bash
bun run typecheck 2>&1 | grep "TopBar" | head -5
bun run test -- --run 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/TopBar.tsx
git commit -m "fix: remove hardcoded turn 4/12 defaults from TopBar"
```

---

### Task 8: Fix branch creation placeholder message (Bug 11)

**Files:**
- Modify: `app/scenarios/[id]/page.tsx:379`

**Context:** When a user clicks "Start New Branch," the handler immediately throws `'Branch creation is not available yet.'` This message is jarring — it implies a broken feature. Change it to explain it's available in player mode.

- [ ] **Step 1: Update the error message**

In `app/scenarios/[id]/page.tsx`, find (around line 379):

```typescript
      setBranchError('Branch creation is not available yet.')
```

Replace with:

```typescript
      setBranchError('Branching is available from the Play page after selecting a turn.')
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "page.tsx" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add "app/scenarios/[id]/page.tsx"
git commit -m "fix: improve branch creation placeholder message"
```

---

### Task 9: Add favicon (Issue #57)

**Files:**
- Create: `public/favicon.svg`

**Context:** The browser console shows a 404 for `/favicon.ico`. Next.js supports SVG favicons placed in `public/` or in `app/favicon.ico`. The simplest fix is a minimal SVG favicon in `public/`.

- [ ] **Step 1: Create the favicon**

Create `public/favicon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#050A12"/>
  <text x="4" y="24" font-family="monospace" font-size="20" font-weight="bold" fill="#ffba20">G</text>
</svg>
```

- [ ] **Step 2: Add favicon link to root layout**

Open `app/layout.tsx`. Check if there is already a `<link rel="icon">` tag or a `metadata.icons` export. If not, add:

In the `metadata` export (or create one if absent):

```typescript
export const metadata = {
  // ... existing fields ...
  icons: {
    icon: '/favicon.svg',
  },
}
```

If `app/layout.tsx` uses a `<head>` block with JSX, add:
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "layout" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add public/favicon.svg app/layout.tsx
git commit -m "fix: add SVG favicon to resolve 404"
```

---

### Task 10: Final check — typecheck, lint, full test run

**Files:** None modified — verification only.

- [ ] **Step 1: Run full typecheck**

```bash
bun run typecheck 2>&1 | tail -10
```

Expected: `Found 0 errors.`

- [ ] **Step 2: Run lint**

```bash
bun run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
bun run test -- --run --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Commit any cleanup**

If typecheck or lint surfaced minor issues (unused imports after deletions), fix them, then:

```bash
git add -u
git commit -m "fix: cleanup after bug fixes — unused imports and lint warnings"
```

---

## Self-Review

**Spec coverage:**
- Bug 1 (actors columns) → Task 3 ✅
- Bug 2 (hardcoded cities) → Task 2 ✅
- Bug 3 (map-assets 400) → Task 1 ✅
- Bug 4 (map empty) → Task 1 + Task 2 (response parsing) ✅
- Bug 5 (ResearchUpdatePanel) → Task 5 ✅
- Bug 6 (TopBar defaults) → Task 7 ✅
- Bug 7 (actors blank) → Task 4 ✅
- Bug 8 (chronicle empty) → Task 4 ✅
- Bug 9 (decisions in observer) → Task 6 ✅
- Bug 10 (panel z-index) → Not planned — z-index conflict requires visual inspection in browser; deferred to playwright validation after this plan executes.
- Bug 11 (branch creation text) → Task 8 ✅
- Issue #57 (favicon) → Task 9 ✅

**Deferred:** Bug 10 (z-index) requires browser-based visual debugging. After this plan is merged, run `geosim-playwright` to identify exact element overlap and fix in a follow-up commit.

**Placeholder scan:** None found.

**Type consistency:** `MapAssetsResponse` used consistently across Task 1 and Task 2. `ActorSummary.id` sourced from `actor_id` in both Task 3 and existing play page code.
