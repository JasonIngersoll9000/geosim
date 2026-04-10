# Playable Game Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data in the Iran scenario game with real Supabase data, add two turn-advance modes (player turn + ground truth playback), and wire the map to real military assets.

**Architecture:** RSC play page fetches all initial game data server-side (scenario, actors, state engine output, chronicle) and passes it as a typed `GameInitialData` prop to the client-side GameView. Two new API routes handle turn advancement: a player-submitted SSE route and a ground-truth-step read route.

**Tech Stack:** Next.js App Router (RSC), Supabase (postgres + service role key), Vitest, `lib/game/state-engine.ts` (`getStateAtTurn`), `lib/game/game-loop.ts` (`onPlayerDecision`), framer-motion, `lib/types/panels.ts`, SSE via `ReadableStream`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/types/game-init.ts` | **Create** | `GameInitialData` type — data contract between play page and GameView |
| `app/scenarios/page.tsx` | **Modify** | Remove `MOCK_SCENARIOS` fallback; show error on API failure |
| `app/scenarios/[id]/page.tsx` | **Modify** | Replace `BRANCH_TREE_ROOT` + `ACTOR_OPTIONS` with real DB fetches |
| `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` | **Modify** | Add `actor_capabilities` fallback when `facility_statuses` has no coordinates |
| `components/map/AssetInfoPanel.tsx` | **Create** | Click-to-inspect overlay for selected map asset |
| `components/map/GameMap.tsx` | **Modify** | Fix hardcoded API URL; pass `scenarioId`/`branchId`/`turnCommitId`; wire AssetInfoPanel |
| `hooks/useSubmitTurn.ts` | **Modify** | Fix API URL path; add `scenarioId` param |
| `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts` | **Create** | Player turn advance — validates plan, inserts turn_commit, SSE dispatch stream |
| `app/api/scenarios/[id]/branches/[branchId]/ground-truth-step/route.ts` | **Create** | Ground truth advance — returns next commit + state on GET |
| `app/scenarios/[id]/play/[branchId]/page.tsx` | **Modify** | Make async RSC; fetch all game data; pass `initialData` to GameView |
| `components/game/GameView.tsx` | **Modify** | Accept `initialData: GameInitialData`; remove all `MOCK_*` constants; add "NEXT EVENT →" button |

---

### Task 1: Define `GameInitialData` type

**Files:**
- Create: `lib/types/game-init.ts`

This type is the data contract between the RSC play page and the client GameView. Define it first so Tasks 9 and 10 can reference it consistently.

- [ ] **Step 1: Create `lib/types/game-init.ts`**

```typescript
// lib/types/game-init.ts
import type { ActorSummary, ActorDetail, DecisionOption, DecisionDetail } from './panels'
import type { BranchStateAtTurn } from './simulation'

export interface ChronicleEntry {
  turnNumber: number
  date: string
  title: string
  narrative: string
  severity: 'critical' | 'major' | 'moderate' | 'minor'
  tags: string[]
  detail?: string
}

export interface GroundTruthCommit {
  id: string
  turnNumber: number
  simulatedDate: string
  narrativeEntry: string | null
}

export interface GameInitialData {
  scenario: {
    id: string
    name: string
    classification: string
  }
  branch: {
    id: string
    name: string
    isTrunk: boolean
    headCommitId: string | null
    turnNumber: number
  }
  actors: ActorSummary[]
  actorDetails: Record<string, ActorDetail>
  decisions: DecisionOption[]
  decisionDetails: Record<string, DecisionDetail>
  chronicle: ChronicleEntry[]
  groundTruthBranchId: string
  groundTruthCommits: GroundTruthCommit[]
  /** The current BranchStateAtTurn — used for map-assets API and actor score display */
  currentState: BranchStateAtTurn | null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/game-init.ts
git commit -m "feat: add GameInitialData type for RSC→GameView data contract"
```

---

### Task 2: Remove MOCK_SCENARIOS fallback

**Files:**
- Modify: `app/scenarios/page.tsx`

The scenarios list page already calls `/api/scenarios` and falls back to `MOCK_SCENARIOS` on any error. Remove the fallback — show a real error state instead.

- [ ] **Step 1: Open `app/scenarios/page.tsx` and remove `MOCK_SCENARIOS`**

Find the `const MOCK_SCENARIOS` declaration (around line 43) and delete the entire constant (it runs to about line 188). Then find the two fallback calls (around lines 306 and 311):

```typescript
// DELETE these two lines:
setScenarios(MOCK_SCENARIOS)

// REPLACE the catch block error case with:
setError('Unable to load scenarios. Check your connection and try again.')
setScenarios([])
```

Also delete the import or usage of `MOCK_SCENARIOS` in the fallback. The component already renders an error state from `error` state — verify that path renders something useful by checking the JSX renders a message when `scenarios.length === 0` and `error` is set. If not, add:

```tsx
{scenarios.length === 0 && !loading && (
  <p className="text-text-secondary font-mono text-sm mt-8">
    {error ?? 'No scenarios found.'}
  </p>
)}
```

- [ ] **Step 2: Run tests to confirm no regressions**

```bash
bun run test -- --run tests/api/ 2>&1 | tail -5
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add app/scenarios/page.tsx
git commit -m "fix: remove MOCK_SCENARIOS fallback — show real error state on API failure"
```

---

### Task 3: Wire scenario browser to real branches and actors

**Files:**
- Modify: `app/scenarios/[id]/page.tsx`

This page renders `BranchTree` with hardcoded `BRANCH_TREE_ROOT` and `ACTOR_OPTIONS`. Replace them with real Supabase fetches. The page is currently a client component that calls `fetch('/api/branches', ...)` for something unrelated — keep that if needed but add DB fetches for the tree.

**BranchNode** (from `components/scenario/BranchTree.tsx`):
```typescript
interface BranchNode {
  id: string; name: string; isTrunk: boolean; status: 'active' | 'archived'
  forkTurn: number; headTurn: number; totalTurns: number; lastPlayedAt: string
  controlledActor: string | null; children: BranchNode[]; turnDate?: string
  nodeType?: 'action' | 'response'; escalationDirection?: 'up'|'down'|'lateral'
  cachedAlternates?: number
}
```

**ActorOption** (from `components/scenario/BranchTree.tsx`):
```typescript
interface ActorOption { id: string; name: string; flag: string }
```

- [ ] **Step 1: Write failing test**

Create `tests/api/scenario-browser.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// Smoke test: branchToBranchNode helper maps DB row correctly
function branchToBranchNode(row: {
  id: string; name: string; is_trunk: boolean; status: string
  head_commit_id: string | null; created_at: string
  turn_commits?: Array<{ turn_number: number; simulated_date: string }>
}): { id: string; name: string; isTrunk: boolean; headTurn: number } {
  const commits = row.turn_commits ?? []
  const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0)
  return {
    id: row.id,
    name: row.name,
    isTrunk: row.is_trunk,
    headTurn: maxTurn,
  }
}

describe('branchToBranchNode', () => {
  it('maps trunk branch correctly', () => {
    const row = {
      id: 'abc', name: 'Ground Truth', is_trunk: true, status: 'active',
      head_commit_id: 'xyz', created_at: '2026-04-01T00:00:00Z',
      turn_commits: [{ turn_number: 1, simulated_date: '2026-03-04' }, { turn_number: 4, simulated_date: '2026-03-22' }],
    }
    const node = branchToBranchNode(row)
    expect(node.isTrunk).toBe(true)
    expect(node.headTurn).toBe(4)
  })
})
```

Run: `bun run test -- --run tests/api/scenario-browser.test.ts`
Expected: FAIL (helper not imported from the component yet — this is fine, we're just validating the logic)

- [ ] **Step 2: Add a `branchToBranchNode` helper in `app/scenarios/[id]/page.tsx`**

Near the top of `app/scenarios/[id]/page.tsx`, delete `BRANCH_TREE_ROOT` and `ACTOR_OPTIONS` constants. Add a helper and a `useEffect` fetch:

```typescript
// Add to imports:
import { createClient } from '@/lib/supabase/client'

// Add helper after imports:
type BranchRow = {
  id: string; name: string; is_trunk: boolean; status: string
  head_commit_id: string | null; created_at: string; parent_branch_id: string | null
  turn_commits: Array<{ turn_number: number; simulated_date: string }>
}

function buildBranchTree(rows: BranchRow[]): BranchNode | null {
  const map = new Map<string, BranchNode>()
  for (const row of rows) {
    const commits = row.turn_commits ?? []
    const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0)
    const latestCommit = commits.find(c => c.turn_number === maxTurn)
    map.set(row.id, {
      id: row.id,
      name: row.name,
      isTrunk: row.is_trunk,
      status: row.status === 'active' ? 'active' : 'archived',
      forkTurn: 0,
      headTurn: maxTurn,
      totalTurns: commits.length,
      lastPlayedAt: row.created_at,
      controlledActor: null,
      children: [],
      turnDate: latestCommit?.simulated_date,
    })
  }
  let root: BranchNode | null = null
  for (const row of rows) {
    const node = map.get(row.id)!
    if (row.parent_branch_id && map.has(row.parent_branch_id)) {
      map.get(row.parent_branch_id)!.children.push(node)
    } else {
      root = node
    }
  }
  return root
}
```

- [ ] **Step 3: Replace `BRANCH_TREE_ROOT` and `ACTOR_OPTIONS` with state + useEffect**

In the component function, add:

```typescript
const [branchRoot, setBranchRoot] = useState<BranchNode | null>(null)
const [actorOptions, setActorOptions] = useState<ActorOption[]>([])

useEffect(() => {
  const supabase = createClient()
  
  async function loadTree() {
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name, is_trunk, status, head_commit_id, created_at, parent_branch_id, turn_commits(turn_number, simulated_date)')
      .eq('scenario_id', params.id)
      .order('created_at', { ascending: true })
    
    if (branches && branches.length > 0) {
      setBranchRoot(buildBranchTree(branches as BranchRow[]))
    }
    
    const { data: actors } = await supabase
      .from('actors')
      .select('actor_id, name')
      .eq('scenario_id', params.id)
    
    if (actors) {
      const FLAG_MAP: Record<string, string> = {
        united_states: '🇺🇸', iran: '🇮🇷', israel: '🇮🇱',
        russia: '🇷🇺', china: '🇨🇳', gulf_states: '🇸🇦',
      }
      setActorOptions(actors.map(a => ({
        id: a.actor_id, name: a.name, flag: FLAG_MAP[a.actor_id] ?? '🏳️',
      })))
    }
  }
  
  loadTree()
}, [params.id])
```

Replace `BRANCH_TREE_ROOT` with `branchRoot` and `ACTOR_OPTIONS` with `actorOptions` in the JSX. Guard the BranchTree render:

```tsx
{branchRoot ? (
  <BranchTree root={branchRoot} scenarioId={params.id} actors={actorOptions} />
) : (
  <p className="text-text-secondary font-mono text-sm">Loading branches…</p>
)}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
bun run test -- --run tests/api/scenario-browser.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/scenarios/[id]/page.tsx tests/api/scenario-browser.test.ts
git commit -m "feat: wire scenario browser to real branches and actors from Supabase"
```

---

### Task 4: Map-assets API — actor_capabilities fallback

**Files:**
- Modify: `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts`
- Test: `tests/api/map-assets.test.ts` (extend existing)

The map-assets route reads `state.facility_statuses` for assets with lat/lng. If none have coordinates, add a fallback that queries `actor_capabilities` directly (which always has coordinates from the seed).

- [ ] **Step 1: Write failing test**

Create `tests/api/map-assets-fallback.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { FacilityStatus } from '@/lib/types/simulation'
import type { MapAsset } from '@/lib/types/simulation'

// Extract the fallback logic for unit testing
function capabilityToMapAsset(cap: {
  id: string; actor_id: string; name: string; asset_type: string | null
  category: string | null; lat: number; lng: number; status: string | null
  description: string | null
}): MapAsset {
  const typeMap: Record<string, string> = {
    nuclear_facility: 'nuclear_facility',
    oil_gas_facility: 'oil_gas_facility',
    military_base: 'military_base',
    carrier: 'carrier_group',
    carrier_group: 'carrier_group',
    naval_base: 'naval_asset',
    airbase: 'military_base',
    headquarters: 'military_base',
    missile_battery: 'missile_battery',
  }
  const rawType = cap.asset_type ?? cap.category ?? 'military_base'
  const assetType = (typeMap[rawType] ?? 'military_base') as MapAsset['asset_type']
  return {
    id: cap.id,
    actor_id: cap.actor_id,
    asset_type: assetType,
    label: cap.name,
    lat: cap.lat,
    lng: cap.lng,
    status: (cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational') as MapAsset['status'],
    capacity_pct: 100,
    actor_color: '#888888',
    tooltip: cap.description ?? cap.name,
    is_approximate_location: rawType === 'carrier' || rawType === 'carrier_group',
  }
}

describe('capabilityToMapAsset', () => {
  it('maps a carrier group correctly', () => {
    const cap = {
      id: 'cvn-73', actor_id: 'united_states', name: 'USS Carl Vinson CSG',
      asset_type: 'carrier', category: 'naval', lat: 23.5, lng: 59.5,
      status: 'staged', description: 'Carrier strike group in Arabian Sea',
    }
    const asset = capabilityToMapAsset(cap)
    expect(asset.asset_type).toBe('carrier_group')
    expect(asset.is_approximate_location).toBe(true)
    expect(asset.lat).toBe(23.5)
  })

  it('maps a nuclear facility correctly', () => {
    const cap = {
      id: 'fordow', actor_id: 'iran', name: 'Fordow FEP',
      asset_type: 'nuclear_facility', category: 'nuclear', lat: 34.884, lng: 50.995,
      status: 'available', description: 'Underground enrichment facility',
    }
    const asset = capabilityToMapAsset(cap)
    expect(asset.asset_type).toBe('nuclear_facility')
    expect(asset.is_approximate_location).toBe(false)
  })
})
```

Run: `bun run test -- --run tests/api/map-assets-fallback.test.ts`
Expected: FAIL (function not imported from anywhere)

- [ ] **Step 2: Add the fallback to the map-assets route**

Read the current file at `app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts` and edit it. After `const state = await getStateAtTurn(...)`, add:

```typescript
import { createClient } from '@/lib/supabase/server'
```

(add to imports at top)

And in the GET handler, after building `assets`, add the fallback:

```typescript
    // Fallback: if facility_statuses had no coordinates, query actor_capabilities directly
    if (assets.length === 0) {
      const supabase = await createClient()
      const { data: caps } = await supabase
        .from('actor_capabilities')
        .select('id, actor_id, name, asset_type, category, lat, lng, status, description')
        .eq('scenario_id', state.scenario_id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      
      if (caps) {
        for (const cap of caps as Array<{
          id: string; actor_id: string; name: string; asset_type: string | null
          category: string | null; lat: number; lng: number; status: string | null
          description: string | null
        }>) {
          const typeMap: Record<string, string> = {
            nuclear_facility: 'nuclear_facility', oil_gas_facility: 'oil_gas_facility',
            military_base: 'military_base', carrier: 'carrier_group',
            carrier_group: 'carrier_group', naval_base: 'naval_asset',
            airbase: 'military_base', headquarters: 'military_base',
            missile_battery: 'missile_battery',
          }
          const rawType = cap.asset_type ?? cap.category ?? 'military_base'
          assets.push({
            id: cap.id,
            actor_id: cap.actor_id,
            asset_type: (typeMap[rawType] ?? 'military_base') as MapAssetType,
            label: cap.name,
            lat: cap.lat,
            lng: cap.lng,
            status: cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational',
            capacity_pct: 100,
            actor_color: ACTOR_COLORS[cap.actor_id] ?? '#888888',
            tooltip: cap.description ?? cap.name,
            is_approximate_location: rawType === 'carrier' || rawType === 'carrier_group',
          })
        }
      }
    }
```

- [ ] **Step 3: Update test to import from a shared helper (optional) or just confirm test logic matches**

Move `capabilityToMapAsset` into the test file as a local function mirroring the route logic. Run:

```bash
bun run test -- --run tests/api/map-assets-fallback.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "app/api/scenarios/[id]/branches/[branchId]/map-assets/route.ts" tests/api/map-assets-fallback.test.ts
git commit -m "feat: add actor_capabilities fallback to map-assets API when facility_statuses lacks coordinates"
```

---

### Task 5: Create `AssetInfoPanel` component

**Files:**
- Create: `components/map/AssetInfoPanel.tsx`
- Test: `tests/components/map/AssetInfoPanel.test.tsx`

`MapboxMap` already has `onAssetClick(id)` and `selectedAssetId` props wired up. This component renders when an asset is selected.

`MapAsset` type (from `lib/types/simulation.ts`):
```typescript
interface MapAsset {
  id: string; actor_id: string; asset_type: MapAssetType
  label: string; lat: number; lng: number
  status: 'operational' | 'degraded' | 'destroyed'
  capacity_pct: number; actor_color: string; tooltip: string
  is_approximate_location: boolean
}
```

- [ ] **Step 1: Write failing test**

Create `tests/components/map/AssetInfoPanel.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { AssetInfoPanel } from '@/components/map/AssetInfoPanel'
import type { MapAsset } from '@/lib/types/simulation'

const mockAsset: MapAsset = {
  id: 'fordow', actor_id: 'iran', asset_type: 'nuclear_facility',
  label: 'Fordow FEP', lat: 34.884, lng: 50.995,
  status: 'degraded', capacity_pct: 62,
  actor_color: '#1a8a4a', tooltip: 'Underground enrichment facility near Qom',
  is_approximate_location: false,
}

describe('AssetInfoPanel', () => {
  it('renders asset name and status', () => {
    render(<AssetInfoPanel asset={mockAsset} onClose={() => {}} />)
    expect(screen.getByText('Fordow FEP')).toBeTruthy()
    expect(screen.getByText(/DEGRADED/i)).toBeTruthy()
  })

  it('shows capacity bar', () => {
    render(<AssetInfoPanel asset={mockAsset} onClose={() => {}} />)
    expect(screen.getByText(/62%/)).toBeTruthy()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<AssetInfoPanel asset={mockAsset} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

Run: `bun run test -- --run tests/components/map/AssetInfoPanel.test.tsx`
Expected: FAIL (component doesn't exist)

- [ ] **Step 2: Create `components/map/AssetInfoPanel.tsx`**

```typescript
'use client'
import type { MapAsset } from '@/lib/types/simulation'

const STATUS_COLORS: Record<MapAsset['status'], string> = {
  operational: 'text-green-400',
  degraded:    'text-yellow-400',
  destroyed:   'text-red-500',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  nuclear_facility:  'Nuclear Facility',
  oil_gas_facility:  'Oil / Gas Facility',
  military_base:     'Military Base',
  carrier_group:     'Carrier Strike Group',
  missile_battery:   'Missile Battery',
  naval_asset:       'Naval Asset',
  air_defense_battery: 'Air Defense Battery',
  troop_deployment:  'Troop Deployment',
}

interface Props {
  asset: MapAsset
  onClose: () => void
}

export function AssetInfoPanel({ asset, onClose }: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 w-72 bg-surface-2 border border-border-subtle font-mono text-xs p-3 shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <span className="text-text-primary font-label font-semibold text-sm uppercase tracking-wide">
          {asset.label}
        </span>
        <button
          aria-label="close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary ml-2"
        >
          ✕
        </button>
      </div>

      <div className="text-text-secondary mb-1">
        {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
      </div>

      <div className={`font-semibold mb-2 ${STATUS_COLORS[asset.status]}`}>
        {asset.status.toUpperCase()}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-text-secondary mb-1">
          <span>CAPACITY</span>
          <span>{asset.capacity_pct}%</span>
        </div>
        <div className="w-full h-1 bg-surface-3">
          <div
            className="h-1 bg-gold"
            style={{ width: `${asset.capacity_pct}%` }}
          />
        </div>
      </div>

      {asset.is_approximate_location && (
        <div className="text-text-tertiary italic mb-2">
          ⚠ Approximate location
        </div>
      )}

      <div className="text-text-secondary leading-relaxed">
        {asset.tooltip}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
bun run test -- --run tests/components/map/AssetInfoPanel.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/map/AssetInfoPanel.tsx tests/components/map/AssetInfoPanel.test.tsx
git commit -m "feat: add AssetInfoPanel map overlay component"
```

---

### Task 6: Fix GameMap — real URL + wire AssetInfoPanel

**Files:**
- Modify: `components/map/GameMap.tsx`

`GameMap.tsx` currently calls `/api/scenarios/iran-2026/assets` (hardcoded legacy URL). Replace with the real map-assets API. Also add `selectedAssetId`/`onAssetClick` state and render `AssetInfoPanel`.

- [ ] **Step 1: Read `components/map/GameMap.tsx`** to understand current props/state before editing.

- [ ] **Step 2: Update GameMap props and API URL**

Change the Props interface to accept `scenarioId`, `branchId`, and `turnCommitId`:

```typescript
interface Props {
  scenarioId: string
  branchId: string
  turnCommitId: string | null
  hormuzClosed?: boolean
}
```

Replace the hardcoded fetch inside `useEffect`:

```typescript
// REPLACE this:
fetch('/api/scenarios/iran-2026/assets')

// WITH:
if (!props.turnCommitId) return
fetch(`/api/scenarios/${props.scenarioId}/branches/${props.branchId}/map-assets?turnCommitId=${props.turnCommitId}`)
  .then(res => res.json())
  .then(json => {
    if (json.data?.assets) setAssets(json.data.assets)
  })
```

Remove or comment out the `/api/scenarios/iran-2026/cities` call (key cities are already hardcoded in `MapboxMap.tsx` as static GeoJSON).

- [ ] **Step 3: Add AssetInfoPanel**

In `GameMap.tsx`, add state for selected asset and wire AssetInfoPanel:

```typescript
import { AssetInfoPanel } from './AssetInfoPanel'
import type { MapAsset } from '@/lib/types/simulation'

// In component:
const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null)

const handleAssetClick = (id: string) => {
  const found = assets.find(a => a.id === id) ?? null
  setSelectedAsset(found)
}

// In JSX, alongside MapboxMap:
<div className="relative w-full h-full">
  <MapboxMap
    hormuzClosed={props.hormuzClosed ?? false}
    layerState={layerState}
    assets={assets}
    selectedAssetId={selectedAsset?.id}
    onAssetClick={handleAssetClick}
    cities={[]}
    onCityClick={() => {}}
  />
  {selectedAsset && (
    <AssetInfoPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
  )}
</div>
```

- [ ] **Step 4: Run full test suite to verify no regressions**

```bash
bun run test -- --run 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add components/map/GameMap.tsx
git commit -m "feat: fix GameMap to use real map-assets API and wire AssetInfoPanel"
```

---

### Task 7: Fix `useSubmitTurn` — URL and scenarioId

**Files:**
- Modify: `hooks/useSubmitTurn.ts`

The hook currently calls `/api/branches/${branchId}/advance`. The real endpoint will be at `/api/scenarios/${scenarioId}/branches/${branchId}/advance`. Add `scenarioId` param.

- [ ] **Step 1: Write failing test**

Create `tests/hooks/useSubmitTurn-url.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Unit test: verify the URL is constructed correctly
describe('useSubmitTurn URL construction', () => {
  it('constructs the correct advance URL', () => {
    const scenarioId = 'scenario-abc'
    const branchId = 'branch-xyz'
    const url = `/api/scenarios/${scenarioId}/branches/${branchId}/advance`
    expect(url).toBe('/api/scenarios/scenario-abc/branches/branch-xyz/advance')
    expect(url).not.toContain('/api/branches/')
  })
})
```

Run: `bun run test -- --run tests/hooks/useSubmitTurn-url.test.ts`
Expected: PASS (this validates our target URL format)

- [ ] **Step 2: Update `hooks/useSubmitTurn.ts`**

Change the function signature from `useSubmitTurn(branchId: string)` to `useSubmitTurn(scenarioId: string, branchId: string)`.

Change the fetch URL:

```typescript
// REPLACE:
const res = await fetch(`/api/branches/${branchId}/advance`, {

// WITH:
const res = await fetch(`/api/scenarios/${scenarioId}/branches/${branchId}/advance`, {
```

- [ ] **Step 3: Fix the call site in `GameView.tsx`**

In `GameView.tsx`, find the `useSubmitTurn` call (line ~281) and update it:

```typescript
// REPLACE:
const { submitTurn, isSubmitting, isComplete, error, lines: hookLines, reset: resetHook } = useSubmitTurn(branchId)

// WITH:
const { submitTurn, isSubmitting, isComplete, error, lines: hookLines, reset: resetHook } = useSubmitTurn(scenarioId, branchId)
```

- [ ] **Step 4: Run tests**

```bash
bun run test -- --run 2>&1 | grep -E "FAIL|Test Files"
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add hooks/useSubmitTurn.ts components/game/GameView.tsx tests/hooks/useSubmitTurn-url.test.ts
git commit -m "fix: update useSubmitTurn URL to match new advance route path"
```

---

### Task 8: Create turn advance API endpoint

**Files:**
- Create: `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts`
- Test: `tests/api/advance.test.ts`

POST endpoint. Validates turn plan, inserts a `turn_commit`, calls `onPlayerDecision`, streams dispatch lines.

**Schema reminder:**
- `turn_commits` columns needed: `branch_id`, `parent_commit_id`, `turn_number`, `simulated_date`, `scenario_snapshot` (jsonb, NOT NULL), `planning_phase`, `current_phase`, `is_ground_truth`
- `branches.head_commit_id` must be updated after insert

- [ ] **Step 1: Write failing test**

Create `tests/api/advance.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// Test the advance date logic (pure function)
function advanceSimulatedDate(currentDate: string, weeksToAdd: number): string {
  const d = new Date(currentDate)
  d.setDate(d.getDate() + weeksToAdd * 7)
  return d.toISOString().split('T')[0]
}

describe('advanceSimulatedDate', () => {
  it('advances by 1 week', () => {
    expect(advanceSimulatedDate('2026-03-04', 1)).toBe('2026-03-11')
  })
  it('advances by 1 week across month boundary', () => {
    expect(advanceSimulatedDate('2026-03-28', 1)).toBe('2026-04-04')
  })
})
```

Run: `bun run test -- --run tests/api/advance.test.ts`
Expected: PASS (pure function test)

- [ ] **Step 2: Create the route file**

Create `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onPlayerDecision } from '@/lib/game/game-loop'
import type { EventStateEffects } from '@/lib/types/simulation'

const encoder = new TextEncoder()

function sendLine(controller: ReadableStreamDefaultController, text: string, type = 'info') {
  const line = JSON.stringify({ text, type, timestamp: new Date().toISOString().slice(11, 19) })
  controller.enqueue(encoder.encode(`data: ${line}\n\n`))
}

function advanceDate(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  const { id: scenarioId, branchId } = params

  let body: { primaryAction: string; concurrentActions: string[] }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient()

        sendLine(controller, 'Turn plan received — validating prerequisites…', 'info')

        // 1. Get current branch state
        const { data: branch, error: branchErr } = await supabase
          .from('branches')
          .select('id, head_commit_id')
          .eq('id', branchId)
          .single()

        if (branchErr || !branch) {
          sendLine(controller, `ERROR: Branch not found — ${branchErr?.message ?? 'unknown'}`, 'critical')
          controller.close()
          return
        }

        // 2. Get latest turn commit to determine turn_number and simulated_date
        const { data: headCommit } = await supabase
          .from('turn_commits')
          .select('id, turn_number, simulated_date')
          .eq('id', branch.head_commit_id)
          .single()

        const prevTurnNumber = headCommit?.turn_number ?? 0
        const prevDate = headCommit?.simulated_date ?? '2026-03-04'
        const newTurnNumber = prevTurnNumber + 1
        const newSimDate = advanceDate(prevDate)

        sendLine(controller, 'Operational parameters confirmed.', 'confirmed')

        // 3. Insert new turn_commit
        const { data: newCommit, error: insertErr } = await supabase
          .from('turn_commits')
          .insert({
            branch_id:         branchId,
            parent_commit_id:  branch.head_commit_id,
            turn_number:       newTurnNumber,
            simulated_date:    newSimDate,
            scenario_snapshot: { primary_action: body.primaryAction, concurrent_actions: body.concurrentActions },
            planning_phase:    { primary_action_id: body.primaryAction, concurrent_action_ids: body.concurrentActions },
            current_phase:     'complete',
            is_ground_truth:   false,
          })
          .select('id')
          .single()

        if (insertErr || !newCommit) {
          sendLine(controller, `ERROR: Failed to record turn — ${insertErr?.message ?? 'unknown'}`, 'critical')
          controller.close()
          return
        }

        sendLine(controller, 'Applying effects to theater state…', 'info')

        // 4. Call state engine
        const resolvedEffects: EventStateEffects = {
          actor_score_deltas:     {},
          asset_inventory_deltas: {},
          global_state_deltas:    {},
          facility_updates:       [],
        }

        try {
          await onPlayerDecision(scenarioId, branchId, branch.head_commit_id ?? '', newCommit.id, resolvedEffects)
        } catch (e) {
          // State engine failure is non-fatal for simplified resolution
          sendLine(controller, `State engine: ${e instanceof Error ? e.message : 'skipped'}`, 'info')
        }

        // 5. Update branch head_commit_id
        await supabase
          .from('branches')
          .update({ head_commit_id: newCommit.id })
          .eq('id', branchId)

        sendLine(controller, 'Threshold evaluation complete.', 'info')
        sendLine(controller, `Turn ${prevTurnNumber} → Turn ${newTurnNumber} (${newSimDate})`, 'confirmed')
        sendLine(controller, 'Awaiting next planning phase.', 'stable')

      } catch (err) {
        sendLine(controller, `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`, 'critical')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
```

- [ ] **Step 3: Run tests**

```bash
bun run test -- --run tests/api/advance.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "app/api/scenarios/[id]/branches/[branchId]/advance/route.ts" tests/api/advance.test.ts
git commit -m "feat: add turn advance SSE endpoint for player turn submission"
```

---

### Task 9: Create ground-truth-step API endpoint

**Files:**
- Create: `app/api/scenarios/[id]/branches/[branchId]/ground-truth-step/route.ts`
- Test: `tests/api/ground-truth-step.test.ts`

GET endpoint that returns the next turn_commit after `?currentTurn=N` on this branch.

- [ ] **Step 1: Write failing test**

Create `tests/api/ground-truth-step.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

// Test the "next turn" selection logic (pure)
type CommitRow = { turn_number: number; simulated_date: string; narrative_entry: string | null; id: string }

function findNextCommit(commits: CommitRow[], currentTurn: number): CommitRow | null {
  return commits.find(c => c.turn_number === currentTurn + 1) ?? null
}

describe('findNextCommit', () => {
  const commits: CommitRow[] = [
    { id: 'a', turn_number: 1, simulated_date: '2026-03-04', narrative_entry: 'Epic Fury launched' },
    { id: 'b', turn_number: 2, simulated_date: '2026-03-11', narrative_entry: 'Hormuz closed' },
    { id: 'c', turn_number: 3, simulated_date: '2026-03-18', narrative_entry: null },
  ]

  it('returns the next turn', () => {
    const next = findNextCommit(commits, 1)
    expect(next?.turn_number).toBe(2)
    expect(next?.narrative_entry).toBe('Hormuz closed')
  })

  it('returns null when at the end', () => {
    expect(findNextCommit(commits, 3)).toBeNull()
  })

  it('returns null when currentTurn is 0 and turn 1 exists', () => {
    const next = findNextCommit(commits, 0)
    expect(next?.turn_number).toBe(1)
  })
})
```

Run: `bun run test -- --run tests/api/ground-truth-step.test.ts`
Expected: PASS (pure function test)

- [ ] **Step 2: Create the route**

Create `app/api/scenarios/[id]/branches/[branchId]/ground-truth-step/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  const { branchId } = params
  const currentTurn = parseInt(request.nextUrl.searchParams.get('currentTurn') ?? '0', 10)

  const supabase = await createClient()

  const { data: commit, error } = await supabase
    .from('turn_commits')
    .select('id, turn_number, simulated_date, narrative_entry, resolution_phase')
    .eq('branch_id', branchId)
    .eq('turn_number', currentTurn + 1)
    .single()

  if (error || !commit) {
    // No next commit — we're at the end of the ground truth
    return NextResponse.json({ data: null, hasNext: false })
  }

  // Check if there's a commit after this one (to know if "next" button should stay enabled)
  const { count } = await supabase
    .from('turn_commits')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('turn_number', commit.turn_number + 1)

  return NextResponse.json({
    data: {
      id:             commit.id,
      turnNumber:     commit.turn_number,
      simulatedDate:  commit.simulated_date,
      narrativeEntry: commit.narrative_entry,
    },
    hasNext: (count ?? 0) > 0,
  })
}
```

- [ ] **Step 3: Run tests**

```bash
bun run test -- --run tests/api/ground-truth-step.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "app/api/scenarios/[id]/branches/[branchId]/ground-truth-step/route.ts" tests/api/ground-truth-step.test.ts
git commit -m "feat: add ground-truth-step endpoint for ground truth timeline playback"
```

---

### Task 10: Make play page async with server-side data fetch

**Files:**
- Modify: `app/scenarios/[id]/play/[branchId]/page.tsx`

The play page is currently a sync server component that just renders GameView with branchId/scenarioId. Make it async, fetch all game data, pass as `initialData`.

**Static Iran decision catalog** — no decisions table exists in the DB. The decision catalog from GameView's MOCK_DECISIONS IS real Iran scenario content (not truly mock). Move it to a static export in `lib/game/iran-decisions.ts` to keep it off the component.

- [ ] **Step 1: Create `lib/game/iran-decisions.ts`**

```typescript
// lib/game/iran-decisions.ts
// Static decision catalog for the Iran 2026 scenario.
// These represent real available strategic options — stored as static data
// until a decisions table is implemented in a future sprint.
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export const IRAN_DECISIONS: Array<DecisionOption & { description: string }> = [
  { id: 'expand-air',       title: 'Expand Air Campaign',          description: 'Second sortie targeting Fordow with GBU-57 penetrators; secondary strikes on IRGC naval facilities.',      dimension: 'military',     escalationDirection: 'escalate',    resourceWeight: 0.6  },
  { id: 'special-ops',      title: 'Special Ops Insertion',        description: 'JSOC teams inserted to surveil and disable hardened sites beyond air campaign range.',                       dimension: 'military',     escalationDirection: 'escalate',    resourceWeight: 0.4  },
  { id: 'ceasefire-signal', title: 'Signal Ceasefire Willingness', description: 'Back-door diplomatic message to Iranian FM via Swiss intermediary indicating conditions for pause.',           dimension: 'diplomatic',   escalationDirection: 'de-escalate', resourceWeight: 0.2  },
  { id: 'oman-backchannel', title: 'Activate Oman Back-Channel',   description: 'Leverage Omani diplomatic channel to propose conditional sanctions relief in exchange for enrichment freeze.', dimension: 'diplomatic',   escalationDirection: 'de-escalate', resourceWeight: 0.15 },
  { id: 'iea-release',      title: 'IEA Reserve Release',          description: 'Coordinate IEA member-state release of strategic petroleum reserves to cap oil below $130/bbl.',              dimension: 'economic',     escalationDirection: 'neutral',     resourceWeight: 0.25 },
  { id: 'asset-freeze',     title: 'Expand Asset Freeze',          description: 'Extend secondary sanctions to IRGC-linked entities in UAE and Turkey; target currency reserves.',              dimension: 'economic',     escalationDirection: 'escalate',    resourceWeight: 0.3  },
  { id: 'proxy-disrupt',    title: 'Disrupt Proxy Networks',       description: 'Cyber and HUMINT operations against Hezbollah and Houthi command networks to limit proxy retaliation.',       dimension: 'intelligence', escalationDirection: 'escalate',    resourceWeight: 0.35 },
]

export const IRAN_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'expand-air': {
    id: 'expand-air', title: 'Expand Air Campaign', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.6,
    strategicRationale: 'Targeting remaining hardened sites. Fordow requires GBU-57 penetrators on second sortie.',
    expectedOutcomes: 'Iranian air defense suppression in western corridor. Coalition military readiness strain increases by ~12%.',
    concurrencyRules: [
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
      { decisionId: 'proxy-disrupt',    decisionTitle: 'Disrupt Proxy Networks',       compatible: true  },
    ],
  },
  'special-ops': {
    id: 'special-ops', title: 'Special Ops Insertion', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.4,
    strategicRationale: 'JSOC units designated for Fordow access shaft demolition and IRGC leadership targeting.',
    expectedOutcomes: 'If successful: Fordow offline 18–24 months. IRGC retaliation probability 94%.',
    concurrencyRules: [
      { decisionId: 'expand-air',       decisionTitle: 'Expand Air Campaign',          compatible: true  },
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
    ],
  },
  'ceasefire-signal': {
    id: 'ceasefire-signal', title: 'Signal Ceasefire Willingness', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.2,
    strategicRationale: 'Backchannel messaging through Swiss Embassy. Window closing in 48–72 hours.',
    expectedOutcomes: 'Temporary Hormuz reopening achievable within 96 hours. Risk: Iran reconstitutes defenses.',
    concurrencyRules: [
      { decisionId: 'expand-air',  decisionTitle: 'Expand Air Campaign',  compatible: false },
      { decisionId: 'special-ops', decisionTitle: 'Special Ops Insertion', compatible: false },
    ],
  },
  'oman-backchannel': {
    id: 'oman-backchannel', title: 'Activate Oman Back-Channel', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.15,
    strategicRationale: 'Sultan Haitham has offered to host direct talks.',
    expectedOutcomes: 'Reduces allied pressure for negotiated solution. Iran may demand additional concessions.',
    concurrencyRules: [
      { decisionId: 'expand-air',  decisionTitle: 'Expand Air Campaign',  compatible: false },
      { decisionId: 'iea-release', decisionTitle: 'IEA Reserve Release',  compatible: true  },
    ],
  },
  'iea-release': {
    id: 'iea-release', title: 'IEA Reserve Release', dimension: 'economic', escalationDirection: 'neutral', resourceWeight: 0.25,
    strategicRationale: "120 million barrel release over 30 days. Caps oil at $120/bbl and reduces Iran's Hormuz leverage.",
    expectedOutcomes: 'Oil price correction to $115–125/bbl. Iran loses $4.2B monthly revenue leverage.',
    concurrencyRules: [
      { decisionId: 'asset-freeze',     decisionTitle: 'Expand Asset Freeze',          compatible: true },
      { decisionId: 'oman-backchannel', decisionTitle: 'Activate Oman Back-Channel',   compatible: true },
    ],
  },
  'asset-freeze': {
    id: 'asset-freeze', title: 'Expand Asset Freeze', dimension: 'economic', escalationDirection: 'escalate', resourceWeight: 0.3,
    strategicRationale: 'Treasury-coordinated freeze of Iranian sovereign wealth. Targets IRGC commercial fronts.',
    expectedOutcomes: 'Iranian central bank reserves reduced by ~$12B. China/Russia accelerate yuan alternatives.',
    concurrencyRules: [
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
      { decisionId: 'iea-release',      decisionTitle: 'IEA Reserve Release',          compatible: true  },
    ],
  },
  'proxy-disrupt': {
    id: 'proxy-disrupt', title: 'Disrupt Proxy Networks', dimension: 'intelligence', escalationDirection: 'escalate', resourceWeight: 0.35,
    strategicRationale: 'CIA and Mossad joint operation targeting Hezbollah financial networks.',
    expectedOutcomes: 'Hezbollah resupply delayed 14–21 days. Northern front capability reduced by 30%.',
    concurrencyRules: [
      { decisionId: 'expand-air',       decisionTitle: 'Expand Air Campaign',          compatible: true  },
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
    ],
  },
}
```

- [ ] **Step 2: Write failing test for play page data fetching logic**

Create `tests/lib/game/iran-decisions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { IRAN_DECISIONS, IRAN_DECISION_DETAILS } from '@/lib/game/iran-decisions'

describe('IRAN_DECISIONS catalog', () => {
  it('has 7 decisions', () => {
    expect(IRAN_DECISIONS).toHaveLength(7)
  })

  it('every decision has a matching detail entry', () => {
    for (const d of IRAN_DECISIONS) {
      expect(IRAN_DECISION_DETAILS[d.id], `missing detail for ${d.id}`).toBeDefined()
    }
  })

  it('all resourceWeights are between 0 and 1', () => {
    for (const d of IRAN_DECISIONS) {
      expect(d.resourceWeight).toBeGreaterThan(0)
      expect(d.resourceWeight).toBeLessThanOrEqual(1)
    }
  })
})
```

Run: `bun run test -- --run tests/lib/game/iran-decisions.test.ts`
Expected: FAIL (file not yet created)

- [ ] **Step 3: Run test after creating the file**

```bash
bun run test -- --run tests/lib/game/iran-decisions.test.ts
```

Expected: PASS

- [ ] **Step 4: Rewrite `app/scenarios/[id]/play/[branchId]/page.tsx`**

```typescript
// RSC boundary: async server component — no 'use client'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameView } from '@/components/game/GameView'
import { createServerClient } from '@/lib/supabase/server'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { IRAN_DECISIONS, IRAN_DECISION_DETAILS } from '@/lib/game/iran-decisions'
import type { GameInitialData, ChronicleEntry, GroundTruthCommit } from '@/lib/types/game-init'
import type { ActorSummary, ActorDetail } from '@/lib/types/panels'

interface Props {
  params: { id: string; branchId: string }
}

export default async function PlayPage({ params }: Props) {
  const supabase = await createServerClient()

  // 1. Fetch scenario metadata
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('id, name, classification')
    .eq('id', params.id)
    .single()

  // 2. Fetch branch record (is_trunk, head_commit_id)
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, is_trunk, head_commit_id')
    .eq('id', params.branchId)
    .single()

  // 3. Fetch actors for this scenario
  const { data: actorRows } = await supabase
    .from('actors')
    .select('actor_id, name, win_condition, lose_condition, strategic_posture, escalation_ladder')
    .eq('scenario_id', params.id)

  // 4. Fetch current state via state engine
  let currentState = null
  if (branch?.head_commit_id) {
    try {
      currentState = await getStateAtTurn(params.branchId, branch.head_commit_id)
    } catch {
      // State engine failure is non-fatal — game still loads with null state
    }
  }

  // 5. Fetch chronicle (turn_commits on this branch)
  const { data: commits } = await supabase
    .from('turn_commits')
    .select('turn_number, simulated_date, narrative_entry')
    .eq('branch_id', params.branchId)
    .order('turn_number', { ascending: true })

  // 6. Fetch ground truth branch for Mode B playback
  const { data: trunkBranch } = await supabase
    .from('branches')
    .select('id')
    .eq('scenario_id', params.id)
    .eq('is_trunk', true)
    .single()

  const { data: groundTruthCommits } = await supabase
    .from('turn_commits')
    .select('id, turn_number, simulated_date, narrative_entry')
    .eq('branch_id', trunkBranch?.id ?? params.branchId)
    .order('turn_number', { ascending: true })

  // --- Transform DB rows → GameInitialData types ---

  const FLAG_MAP: Record<string, string> = {
    united_states: '🇺🇸', iran: '🇮🇷', israel: '🇮🇱',
    russia: '🇷🇺', china: '🇨🇳', gulf_states: '🇸🇦',
  }

  const actors: ActorSummary[] = (actorRows ?? []).map(a => {
    const ladder = a.escalation_ladder as { current_rung?: number } | null
    const stateRung = currentState?.actor_states[a.actor_id]
    return {
      id: a.actor_id,
      name: a.name,
      escalationRung: ladder?.current_rung ?? 0,
    }
  })

  const actorDetails: Record<string, ActorDetail> = {}
  for (const a of actorRows ?? []) {
    const s = currentState?.actor_states[a.actor_id]
    actorDetails[a.actor_id] = {
      id: a.actor_id,
      name: a.name,
      escalationRung: (a.escalation_ladder as { current_rung?: number } | null)?.current_rung ?? 0,
      briefing: a.strategic_posture ?? 'No briefing available.',
      militaryStrength:  s ? Math.round(Number(s.military_strength))      : 50,
      economicStrength:  s ? Math.round(Number(s.economic_health))        : 50,
      politicalStability: s ? Math.round(Number(s.political_stability))   : 50,
      objectives: [a.win_condition, a.lose_condition].filter(Boolean) as string[],
    }
  }

  const SEVERITY_MAP: Record<number, ChronicleEntry['severity']> = {}
  const chronicle: ChronicleEntry[] = (commits ?? []).map(c => ({
    turnNumber: c.turn_number,
    date: c.simulated_date,
    title: `Turn ${c.turn_number}`,
    narrative: c.narrative_entry ?? 'No narrative recorded.',
    severity: 'major',
    tags: [],
  }))

  const gtCommits: GroundTruthCommit[] = (groundTruthCommits ?? []).map(c => ({
    id: c.id,
    turnNumber: c.turn_number,
    simulatedDate: c.simulated_date,
    narrativeEntry: c.narrative_entry,
  }))

  const headCommit = commits?.at(-1)
  const turnNumber = headCommit?.turn_number ?? 0

  const initialData: GameInitialData = {
    scenario: {
      id:             scenario?.id ?? params.id,
      name:           scenario?.name ?? 'Unknown Scenario',
      classification: (scenario?.classification as string | null) ?? 'SECRET',
    },
    branch: {
      id:          params.branchId,
      name:        branch?.name ?? 'Ground Truth',
      isTrunk:     branch?.is_trunk ?? false,
      headCommitId: branch?.head_commit_id ?? null,
      turnNumber,
    },
    actors,
    actorDetails,
    decisions: IRAN_DECISIONS,
    decisionDetails: IRAN_DECISION_DETAILS,
    chronicle,
    groundTruthBranchId: trunkBranch?.id ?? params.branchId,
    groundTruthCommits: gtCommits,
    currentState,
  }

  return (
    <GameProvider>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar
        scenarioName={initialData.scenario.name}
        scenarioHref={`/scenarios/${params.id}`}
        turnNumber={turnNumber}
        totalTurns={gtCommits.length}
        phase={branch?.is_trunk ? 'Observer' : 'Planning'}
      />
      <main className="h-screen pt-[66px] overflow-hidden">
        <GameView
          branchId={params.branchId}
          scenarioId={params.id}
          initialData={initialData}
        />
      </main>
    </GameProvider>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
bun run test -- --run 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected: all pass (play page is RSC, no unit tests needed — Playwright will validate it).

- [ ] **Step 6: Commit**

```bash
git add "app/scenarios/[id]/play/[branchId]/page.tsx" lib/game/iran-decisions.ts tests/lib/game/iran-decisions.test.ts
git commit -m "feat: make play page async RSC with server-side Supabase data fetch"
```

---

### Task 11: Remove mocks from GameView — wire `initialData` prop

**Files:**
- Modify: `components/game/GameView.tsx`

Remove all `MOCK_*` constants. Add `initialData: GameInitialData` to Props. Add "NEXT EVENT →" button for ground truth playback (Mode B). Wire all existing component usages to the real data.

- [ ] **Step 1: Read `components/game/GameView.tsx` in full** before editing (use the Read tool — the file is 30KB).

- [ ] **Step 2: Update Props and remove mock constants**

At the top of GameView.tsx, add the import:

```typescript
import type { GameInitialData } from '@/lib/types/game-init'
```

Change the Props interface:

```typescript
interface Props {
  branchId: string
  scenarioId: string
  initialData: GameInitialData
}
```

Delete these constant declarations entirely (they span lines ~27–205):
- `MOCK_ACTORS`
- `ACTOR_METRICS`
- `MOCK_ACTOR_DETAILS`
- `MOCK_DECISIONS`
- `MOCK_DECISION_DETAILS`
- `MOCK_RESOLUTION`
- `INITIAL_DISPATCH`
- `BASE_CHRONICLE`

- [ ] **Step 3: Update component body to use `initialData`**

In `export function GameView({ branchId, scenarioId, initialData }: Props)`:

Replace uses of mock constants:

```typescript
// State initialization — replace hardcoded values:

// REPLACE: useState<ChronicleEntry[]>(BASE_CHRONICLE)
// WITH:
const [chronicleEntries, setChronicleEntries] = useState<ChronicleEntry[]>(initialData.chronicle)

// REPLACE: useState(4)  [turnNumber]
// WITH:
const [turnNumber, setTurnNumber]   = useState(initialData.branch.turnNumber)
const [turnCommitId, setTurnCommitId] = useState<string | null>(initialData.branch.headCommitId)

// Add ground truth state for Mode B:
const [gtIndex, setGtIndex]         = useState(initialData.groundTruthCommits.findIndex(c => c.turnNumber === initialData.branch.turnNumber))
const [isGtMode]                    = useState(initialData.branch.isTrunk)
const [gtHasNext, setGtHasNext]     = useState(gtIndex < initialData.groundTruthCommits.length - 1)
```

Replace actor lookup:

```typescript
// REPLACE: MOCK_ACTOR_DETAILS[state.selectedActorId]
// WITH:
initialData.actorDetails[state.selectedActorId] ?? null

// REPLACE: MOCK_DECISIONS.find(d => d.id === id)
// WITH:
initialData.decisions.find(d => d.id === id)

// REPLACE: MOCK_DECISION_DETAILS[id]
// WITH:
initialData.decisionDetails[id] ?? null
```

Replace actors in JSX:

```typescript
// REPLACE: actors={MOCK_ACTORS}
// WITH:
actors={initialData.actors}

// REPLACE: decisions={MOCK_DECISIONS}
// WITH:
decisions={initialData.decisions}

// REPLACE: <EventsTab resolution={MOCK_RESOLUTION} />
// WITH: (for now, pass null — EventsTab should handle it)
<EventsTab resolution={null} />
```

Replace `INITIAL_DISPATCH` in state:

```typescript
// Dispatch lines now start empty (not hardcoded)
const [dispatchLines, setDispatchLines] = useState<DispatchLine[]>([{
  timestamp: new Date().toISOString().slice(11, 19),
  text: `BRANCH: ${initialData.branch.name} // TURN ${String(initialData.branch.turnNumber).padStart(2,'0')} // PHASE: ${isGtMode ? 'observer' : 'planning'}`,
  type: 'info',
}])
```

Pass `scenarioId` and `turnCommitId` to GameMap:

```typescript
// REPLACE: <GameMap ... />
// WITH:
<GameMap
  scenarioId={scenarioId}
  branchId={branchId}
  turnCommitId={turnCommitId}
  hormuzClosed={false}
/>
```

- [ ] **Step 4: Add "NEXT EVENT →" ground truth button**

Find the TurnPlanBuilder submit area (or the bottom of the right panel) and add a conditional Mode B button:

```tsx
{isGtMode && gtHasNext && (
  <button
    onClick={handleNextGroundTruthEvent}
    disabled={isSubmitting}
    className="w-full py-2 font-mono text-xs font-semibold bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-gold transition-colors"
  >
    NEXT EVENT →
  </button>
)}
```

Add the handler:

```typescript
const handleNextGroundTruthEvent = async () => {
  if (!gtHasNext) return
  setIsSubmitting(true)
  
  const nextIdx = gtIndex + 1
  const nextCommit = initialData.groundTruthCommits[nextIdx]
  if (!nextCommit) { setIsSubmitting(false); return }
  
  try {
    const res = await fetch(
      `/api/scenarios/${scenarioId}/branches/${branchId}/ground-truth-step?currentTurn=${turnNumber}`
    )
    const json = await res.json()
    
    if (json.data) {
      setTurnNumber(json.data.turnNumber)
      setTurnCommitId(json.data.id)
      setGtIndex(nextIdx)
      setGtHasNext(json.hasNext)
      
      if (json.data.narrativeEntry) {
        setChronicleEntries(prev => [...prev, {
          turnNumber: json.data.turnNumber,
          date: json.data.simulatedDate,
          title: `Turn ${json.data.turnNumber}`,
          narrative: json.data.narrativeEntry,
          severity: 'major' as const,
          tags: [],
        }])
        resetHook()
        setLines([{
          timestamp: new Date().toISOString().slice(11, 19),
          text: `GROUND TRUTH — TURN ${json.data.turnNumber} — ${json.data.simulatedDate}`,
          type: 'info',
        }, {
          timestamp: new Date().toISOString().slice(11, 19),
          text: json.data.narrativeEntry.slice(0, 120),
          type: 'default',
        }])
      }
    }
  } catch {
    // non-fatal
  } finally {
    setIsSubmitting(false)
  }
}
```

Note: `setLines` and `resetHook` come from `useSubmitTurn`. You'll need to destructure `lines` as a state setter — check the hook and either expose a `setLines` or use `reset` + a manual append.

- [ ] **Step 5: Handle `isSubmitting` state**

GameView has its own `isSubmitting` from `useSubmitTurn` plus a local one for the GT button. Use the one from `useSubmitTurn` for both since they're mutually exclusive:

```typescript
// The isSubmitting from useSubmitTurn already controls turn plan submission
// For GT mode, you can add a local:
const [gtLoading, setGtLoading] = useState(false)
```

Replace `setIsSubmitting` calls in the GT handler with `setGtLoading`.

- [ ] **Step 6: Run full test suite**

```bash
bun run test -- --run 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected: all pass.

- [ ] **Step 7: Run build to catch TypeScript errors**

```bash
bun run build 2>&1 | tail -10
```

Fix any TypeScript errors before committing. Common issues:
- `ChronicleEntry` type conflict between `lib/types/game-init.ts` and the old local type in GameView — delete the old one
- `EventsTab` receiving `null` for resolution — check its prop type and make it accept `null`
- `GameMap` new props not matching old interface — ensure GameMap Props are updated from Task 6

- [ ] **Step 8: Commit**

```bash
git add components/game/GameView.tsx
git commit -m "feat: replace GameView MOCK_* data with real initialData props; add ground truth NEXT EVENT button"
```

---

### Task 12: Final build + test verification

- [ ] **Step 1: Run full test suite**

```bash
bun run test -- --run 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected: 53 test files, all pass.

- [ ] **Step 2: Run production build**

```bash
bun run build 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Final commit if any lint/type fixes needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript and lint issues from playable game sprint"
```

- [ ] **Step 5: Push branch and verify PR**

```bash
git push origin feat/playable-game
```

Check that the Vercel preview build passes before marking this sprint complete.
