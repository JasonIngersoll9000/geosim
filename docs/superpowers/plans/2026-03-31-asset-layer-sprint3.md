# Asset Layer Sprint 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a positioned military asset layer to GeoSim — asset types, database tables, Iran scenario seed data, asset API routes, and map rendering with click popups and range rings.

**Architecture:** New `asset_registry` Supabase table stores assets as living records. Turn commit deltas record state changes without mutating registry rows. Map renders Mapbox markers per asset; clicking opens a popup that expands to a slide-over detail panel. Research updates go through a manual trigger → approval flow.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase (PostgreSQL), Mapbox GL JS, Vitest (node env), Tailwind CSS + inline styles (GeoSim pattern), `bun` for all script execution.

**Spec:** `docs/superpowers/specs/2026-03-31-asset-layer-sprint3-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/types/simulation.ts` | Modify | Add `PositionedAsset`, `AssetCapability`, `AssetStatus`, `AssetCategory`, `AssetStateDelta` |
| `lib/types/database.ts` | Modify | Add `AssetRegistryRow`, `AssetResearchLogRow` DB types |
| `supabase/migrations/20260331000000_asset_registry.sql` | Create | `asset_registry` + `asset_research_log` tables, `turn_date` on `turn_commits` |
| `scripts/seed-iran.ts` | Modify | Add asset seed section (US/Israel/Iran assets + force pools) |
| `app/api/scenarios/[id]/assets/route.ts` | Create | `GET` list assets, `POST` add asset |
| `app/api/scenarios/[id]/assets/[assetId]/route.ts` | Create | `PATCH` update asset |
| `app/api/assets/research/route.ts` | Create | `POST` trigger research update |
| `app/api/assets/research/[logId]/route.ts` | Create | `GET` research log entry |
| `app/api/assets/research/[logId]/approve/route.ts` | Create | `POST` approve + apply changes |
| `app/api/assets/research/[logId]/reject/route.ts` | Create | `POST` reject changes |
| `components/map/AssetMarker.tsx` | Create | Mapbox marker element per asset (color, icon, status) |
| `components/map/AssetPopup.tsx` | Create | Compact popup: name, status, top capabilities, expand button |
| `components/map/AssetDetailPanel.tsx` | Create | Slide-over panel: full capabilities, range info, provenance |
| `components/map/MapLayerControls.tsx` | Modify | Add asset + range ring toggles to `LayerState` |
| `components/map/MapboxMap.tsx` | Modify | Accept `assets` prop, render markers, range ring layers |
| `components/map/GameMap.tsx` | Modify | Fetch assets, manage selected asset state, wire `AssetDetailPanel` |
| `components/game/ResearchUpdatePanel.tsx` | Create | Trigger button, status display, diff approval UI |
| `components/map/CityMarker.tsx` | Create | City dot marker with impact severity color + badge |
| `components/map/CityPopup.tsx` | Create | Compact city popup: name, pop, role, impact list |
| `components/map/CityDetailPanel.tsx` | Create | Slide-over: full city data, war impacts, source links |
| `components/game/ActorStatusPanel.tsx` | Create | 5-metric actor gauges with trend arrows + source links |
| `app/api/scenarios/[id]/cities/route.ts` | Create | `GET` list cities, `POST` add city |
| `app/api/scenarios/[id]/cities/[cityId]/route.ts` | Create | `PATCH` update city |
| `tests/api/assets.test.ts` | Create | Asset API route unit tests |
| `tests/api/cities.test.ts` | Create | City type + API unit tests |
| `tests/game/asset-types.test.ts` | Create | Type validation tests |
| `tests/scripts/seed-iran-assets.test.ts` | Create | Asset seed shape tests |

---

## Task 1: Asset Types

**Files:**
- Modify: `lib/types/simulation.ts`
- Create: `tests/game/asset-types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/game/asset-types.test.ts
import { describe, it, expect } from 'vitest'
import type {
  AssetCategory,
  AssetStatus,
  AssetCapability,
  PositionedAsset,
  AssetStateDelta,
} from '@/lib/types/simulation'

describe('PositionedAsset type shape', () => {
  it('accepts a valid US carrier asset', () => {
    const asset: PositionedAsset = {
      id: 'cvn-72',
      scenarioId: 'iran-2026',
      actorId: 'us',
      name: 'USS Abraham Lincoln (CVN-72)',
      shortName: 'CVN-72',
      category: 'naval',
      assetType: 'carrier',
      description: 'Nimitz-class carrier, CSG-12',
      position: { lat: 23.5, lng: 59.5 },
      zone: 'arabian_sea',
      status: 'staged',
      capabilities: [
        { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
        { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
        { name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' },
      ],
      strikeRangeNm: 1200,
      threatRangeNm: 300,
      provenance: 'researched',
      effectiveFrom: '2025-01-01',
      discoveredAt: '2025-08-01T00:00:00Z',
      notes: 'Flagship of CSG-12. SM-6 depleted from prior AAW operations.',
    }
    expect(asset.id).toBe('cvn-72')
    expect(asset.category).toBe('naval')
    expect(asset.capabilities).toHaveLength(3)
    expect(asset.capabilities[0].current).toBeLessThanOrEqual(asset.capabilities[0].max)
  })

  it('accepts a valid AssetStateDelta', () => {
    const delta: AssetStateDelta = {
      assetId: 'cvn-72',
      field: 'capabilities',
      previousValue: [{ name: 'SM-6 (AAW)', current: 80, max: 80, unit: 'missiles' }],
      newValue: [{ name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' }],
      cause: 'AAW defense against Shahab salvo',
      turnDate: '2025-10-26',
    }
    expect(delta.field).toBe('capabilities')
    expect(delta.assetId).toBe('cvn-72')
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
bun run test -- --run tests/game/asset-types.test.ts
```

Expected: FAIL with type errors or import errors.

- [ ] **Step 3: Add types to `lib/types/simulation.ts`**

Add after the existing `VerificationStatus` type and before `RelationshipType`:

```typescript
export type AssetCategory =
  | 'naval'
  | 'air'
  | 'ground'
  | 'missile'
  | 'nuclear'
  | 'infrastructure'
  | 'cyber'
  | 'air_defense'

export type AssetStatus =
  | 'available'     // ready, in home position
  | 'mobilizing'    // orders issued, preparing to move
  | 'transiting'    // en route to theater
  | 'staged'        // in theater, not yet engaged
  | 'engaged'       // actively executing an operation
  | 'degraded'      // damaged, reduced capability
  | 'destroyed'     // eliminated
  | 'withdrawn'     // pulled back from theater

export interface AssetCapability {
  name: string           // e.g. "SM-6 (AAW)", "Strike Aircraft"
  current: number
  max: number
  unit: string           // "missiles", "aircraft", "battalions"
}

export interface PositionedAsset {
  id: string             // e.g. "cvn-72", "al-udeid-ab"
  scenarioId: string
  actorId: string
  name: string
  shortName: string      // used on map label
  category: AssetCategory
  assetType: string      // "carrier" | "air_base" | "missile_site" | "refinery" etc.
  description: string
  position: { lat: number; lng: number }
  zone: string           // "persian_gulf" | "arabian_sea" | "red_sea" etc.
  status: AssetStatus
  capabilities: AssetCapability[]
  strikeRangeNm?: number
  threatRangeNm?: number
  provenance: VerificationStatus
  effectiveFrom: string  // ISO date
  discoveredAt: string   // ISO timestamp
  researchedAt?: string  // ISO timestamp
  notes: string
}

export interface AssetStateDelta {
  assetId: string
  field: 'status' | 'capabilities' | 'position' | 'zone'
  previousValue: unknown
  newValue: unknown
  cause: string
  turnDate: string       // ISO date
}
```

Also add `assetDeltas?: AssetStateDelta[]` to the `TurnResolution` interface (find it in the file and append the field).

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test -- --run tests/game/asset-types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/types/simulation.ts tests/game/asset-types.test.ts
git commit -m "feat: add PositionedAsset, AssetStatus, AssetCapability, AssetStateDelta types"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260331000000_asset_registry.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260331000000_asset_registry.sql

-- ── asset_registry ────────────────────────────────────────────────────────────
CREATE TABLE asset_registry (
  id TEXT NOT NULL,
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  category TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  zone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  capabilities JSONB NOT NULL DEFAULT '[]',
  strike_range_nm INTEGER,
  threat_range_nm INTEGER,
  provenance TEXT NOT NULL DEFAULT 'inferred',
  effective_from DATE NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  researched_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, scenario_id)
);

CREATE INDEX idx_asset_registry_scenario ON asset_registry(scenario_id);
CREATE INDEX idx_asset_registry_actor    ON asset_registry(scenario_id, actor_id);
CREATE INDEX idx_asset_registry_zone     ON asset_registry(scenario_id, zone);

ALTER TABLE asset_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_registry_select" ON asset_registry
  FOR SELECT USING (true);

CREATE POLICY "asset_registry_insert" ON asset_registry
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "asset_registry_update" ON asset_registry
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── asset_research_log ────────────────────────────────────────────────────────
CREATE TABLE asset_research_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES profiles(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: pending | running | awaiting_approval | approved | rejected
  summary TEXT,
  proposed_changes JSONB,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_research_log_scenario ON asset_research_log(scenario_id);
CREATE INDEX idx_research_log_status   ON asset_research_log(scenario_id, status);

ALTER TABLE asset_research_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "research_log_select" ON asset_research_log
  FOR SELECT USING (true);

CREATE POLICY "research_log_insert" ON asset_research_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "research_log_update" ON asset_research_log
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── turn_commits: add turn_date ───────────────────────────────────────────────
ALTER TABLE turn_commits ADD COLUMN IF NOT EXISTS turn_date DATE;

-- Backfill: scenario start 2025-01-01 + turn_number * 7 days (provisional)
UPDATE turn_commits
SET turn_date = ('2025-01-01'::DATE + (turn_number * 7) * INTERVAL '1 day')::DATE
WHERE turn_date IS NULL;

-- updated_at trigger for asset_registry
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_registry_updated_at
  BEFORE UPDATE ON asset_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Apply migration locally**

```bash
bun run supabase migration up
# or if using supabase CLI directly:
# supabase db push
```

Expected: Migration applied with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260331000000_asset_registry.sql
git commit -m "feat: add asset_registry and asset_research_log migrations, turn_date on turn_commits"
```

---

## Task 3: Database Types

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Add Row/Insert/Update types**

Find the end of the existing type definitions in `lib/types/database.ts` and add before the `Database` interface:

```typescript
// ── Asset Registry ─────────────────────────────────────────────────────────

export interface AssetCapabilityRecord {
  name: string
  current: number
  max: number
  unit: string
}

export interface AssetRegistryRow {
  id: string
  scenario_id: string
  actor_id: string
  name: string
  short_name: string
  category: string
  asset_type: string
  description: string
  lat: number
  lng: number
  zone: string
  status: string
  capabilities: AssetCapabilityRecord[]
  strike_range_nm: number | null
  threat_range_nm: number | null
  provenance: string
  effective_from: string
  discovered_at: string
  researched_at: string | null
  notes: string
  created_at: string
  updated_at: string
}

export type AssetRegistryInsert = Omit<
  AssetRegistryRow,
  'created_at' | 'updated_at' | 'discovered_at'
> & {
  discovered_at?: string
}

export type AssetRegistryUpdate = Partial<
  Omit<AssetRegistryRow, 'id' | 'scenario_id' | 'created_at'>
>

// ── Asset Research Log ─────────────────────────────────────────────────────

export interface ProposedAssetChange {
  type: 'upsert' | 'status_update' | 'capability_update' | 'new_asset'
  assetId: string
  changes: Partial<AssetRegistryRow>
  rationale: string
}

export interface AssetResearchLogRow {
  id: string
  scenario_id: string
  triggered_by: string | null
  triggered_at: string
  status: 'pending' | 'running' | 'awaiting_approval' | 'approved' | 'rejected'
  summary: string | null
  proposed_changes: ProposedAssetChange[] | null
  approved_at: string | null
  approved_by: string | null
}

export type AssetResearchLogInsert = Omit<
  AssetResearchLogRow,
  'id' | 'triggered_at' | 'approved_at' | 'approved_by'
>
```

Then add the tables to the `Database['public']['Tables']` interface:

```typescript
asset_registry: {
  Row: AssetRegistryRow
  Insert: AssetRegistryInsert
  Update: AssetRegistryUpdate
}
asset_research_log: {
  Row: AssetResearchLogRow
  Insert: AssetResearchLogInsert
  Update: Partial<AssetResearchLogRow>
}
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No new errors related to the new types.

- [ ] **Step 3: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat: add AssetRegistryRow, AssetResearchLogRow database types"
```

---

## Task 4: Asset API Routes

**Files:**
- Create: `app/api/scenarios/[id]/assets/route.ts`
- Create: `app/api/scenarios/[id]/assets/[assetId]/route.ts`
- Create: `tests/api/assets.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/api/assets.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('GET /api/scenarios/[id]/assets', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns assets for a scenario', async () => {
    const mockAssets = [
      { id: 'cvn-72', scenario_id: 'iran-2026', name: 'USS Abraham Lincoln', actor_id: 'us', status: 'staged' },
      { id: 'al-udeid-ab', scenario_id: 'iran-2026', name: 'Al Udeid Air Base', actor_id: 'us', status: 'available' },
    ]
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockAssets, error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const { GET } = await import('@/app/api/scenarios/[id]/assets/route')
    const request = new Request('http://localhost/api/scenarios/iran-2026/assets')
    const response = await GET(request, { params: Promise.resolve({ id: 'iran-2026' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.error).toBeNull()
  })

  it('filters by actorId query param', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // second .eq call returns the result
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    const { GET } = await import('@/app/api/scenarios/[id]/assets/route')
    const request = new Request('http://localhost/api/scenarios/iran-2026/assets?actorId=us')
    const response = await GET(request, { params: Promise.resolve({ id: 'iran-2026' }) })

    expect(mockSupabase.eq).toHaveBeenCalledWith('actor_id', 'us')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/api/assets.test.ts
```

Expected: FAIL — route file does not exist.

- [ ] **Step 3: Create `app/api/scenarios/[id]/assets/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scenarioId } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const actorId = searchParams.get('actorId')

  let query = supabase
    .from('asset_registry')
    .select('*')
    .eq('scenario_id', scenarioId)

  if (actorId) query = query.eq('actor_id', actorId)

  const { data, error } = await query
  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }
  return Response.json({ data, error: null })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scenarioId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  if (!body.id || !body.actor_id || !body.name) {
    return Response.json({ data: null, error: 'id, actor_id, and name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('asset_registry')
    .insert({ ...body, scenario_id: scenarioId })
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }
  return Response.json({ data, error: null }, { status: 201 })
}
```

- [ ] **Step 4: Create `app/api/scenarios/[id]/assets/[assetId]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id: scenarioId, assetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  // Never allow overwriting id or scenario_id
  const { id: _id, scenario_id: _sid, ...updates } = body

  const { data, error } = await supabase
    .from('asset_registry')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', assetId)
    .eq('scenario_id', scenarioId)
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }
  return Response.json({ data, error: null })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun run test -- --run tests/api/assets.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/scenarios/[id]/assets/route.ts "app/api/scenarios/[id]/assets/[assetId]/route.ts" tests/api/assets.test.ts
git commit -m "feat: add asset registry API routes (GET, POST, PATCH)"
```

---

## Task 5: Research API Routes

**Files:**
- Create: `app/api/assets/research/route.ts`
- Create: `app/api/assets/research/[logId]/route.ts`
- Create: `app/api/assets/research/[logId]/approve/route.ts`
- Create: `app/api/assets/research/[logId]/reject/route.ts`

- [ ] **Step 1: Create `app/api/assets/research/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { scenarioId } = body as { scenarioId?: string }
  if (!scenarioId) {
    return Response.json({ data: null, error: 'scenarioId is required' }, { status: 400 })
  }

  // Create log entry with pending status
  const { data: logEntry, error: logError } = await supabase
    .from('asset_research_log')
    .insert({
      scenario_id: scenarioId,
      triggered_by: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (logError) {
    return Response.json({ data: null, error: logError.message }, { status: 500 })
  }

  // TODO (issue #31): trigger actual research pipeline here
  // For now, mark as awaiting_approval with empty proposed_changes
  // so the UI flow is testable end-to-end
  const { data, error } = await supabase
    .from('asset_research_log')
    .update({
      status: 'awaiting_approval',
      summary: 'Research pipeline not yet implemented (issue #31). No changes proposed.',
      proposed_changes: [],
    })
    .eq('id', logEntry.id)
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }
  return Response.json({ data, error: null }, { status: 201 })
}
```

- [ ] **Step 2: Create `app/api/assets/research/[logId]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_research_log')
    .select('*')
    .eq('id', logId)
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 404 })
  }
  return Response.json({ data, error: null })
}
```

- [ ] **Step 3: Create `app/api/assets/research/[logId]/approve/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { ProposedAssetChange } from '@/lib/types/database'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch the log entry
  const { data: logEntry, error: fetchError } = await supabase
    .from('asset_research_log')
    .select('*')
    .eq('id', logId)
    .single()

  if (fetchError || !logEntry) {
    return Response.json({ data: null, error: 'Log entry not found' }, { status: 404 })
  }
  if (logEntry.status !== 'awaiting_approval') {
    return Response.json({ data: null, error: `Cannot approve: status is ${logEntry.status}` }, { status: 400 })
  }

  const changes = (logEntry.proposed_changes ?? []) as ProposedAssetChange[]

  // Apply each proposed change
  for (const change of changes) {
    const { error: upsertError } = await supabase
      .from('asset_registry')
      .upsert({ id: change.assetId, ...change.changes })

    if (upsertError) {
      return Response.json(
        { data: null, error: `Failed applying change for ${change.assetId}: ${upsertError.message}` },
        { status: 500 }
      )
    }
  }

  // Mark log entry as approved
  const { data, error } = await supabase
    .from('asset_research_log')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id })
    .eq('id', logId)
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }
  return Response.json({ data, error: null })
}
```

- [ ] **Step 4: Create `app/api/assets/research/[logId]/reject/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('asset_research_log')
    .update({ status: 'rejected', approved_by: user.id })
    .eq('id', logId)
    .eq('status', 'awaiting_approval')
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }
  return Response.json({ data, error: null })
}
```

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/assets/
git commit -m "feat: add research pipeline trigger/approve/reject API routes"
```

---

## Task 6: Iran Scenario Asset Seed

**Files:**
- Modify: `scripts/seed-iran.ts`
- Modify: `tests/scripts/seed-iran.test.ts` (add asset assertions)

Before editing, read the current seed script to understand its structure:

```bash
# Run this to see current seed script structure
head -80 scripts/seed-iran.ts
```

- [ ] **Step 1: Add asset seed data to `scripts/seed-iran.ts`**

After the existing actor/relationship/event inserts, add a `seedAssets` function and call it. Insert the following at the end of the seed script (before the final `main()` call):

```typescript
// ─── Asset Registry Seed ────────────────────────────────────────────────────

const SCENARIO_ID = 'iran-2026' // match existing scenario id in seed

const IRAN_ASSETS: AssetRegistryInsert[] = [
  // ── US Assets ─────────────────────────────────────────────────────────────
  {
    id: 'cvn-72', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'USS Abraham Lincoln (CVN-72)', short_name: 'CVN-72',
    category: 'naval', asset_type: 'carrier',
    description: 'Nimitz-class carrier, flagship of CSG-12. Strike range ~1,200nm with F/A-18.',
    lat: 23.5, lng: 59.5, zone: 'arabian_sea', status: 'staged',
    capabilities: [
      { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
      { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
      { name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' },
      { name: 'Sorties/day', current: 120, max: 120, unit: 'sorties' },
    ],
    strike_range_nm: 1200, threat_range_nm: 300,
    provenance: 'researched', effective_from: '2025-01-01',
    notes: 'Position as of Aug 2025. SM-6 depleted from AAW operations. Research pipeline must update.',
  },
  {
    id: 'cvn-75', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'USS Harry S. Truman (CVN-75)', short_name: 'CVN-75',
    category: 'naval', asset_type: 'carrier',
    description: 'Nimitz-class carrier, operating in Eastern Mediterranean / Red Sea.',
    lat: 33.0, lng: 33.0, zone: 'eastern_mediterranean', status: 'staged',
    capabilities: [
      { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
      { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
      { name: 'SM-6 (AAW)', current: 80, max: 80, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 300,
    provenance: 'researched', effective_from: '2025-01-01',
    notes: 'Position as of Aug 2025. Research pipeline must update.',
  },
  {
    id: 'al-udeid-ab', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'Al Udeid Air Base', short_name: 'Al Udeid',
    category: 'air', asset_type: 'air_base',
    description: 'Main US air hub in CENTCOM. F-35A, B-52H bombers, KC-135 tankers. ~10,000 personnel.',
    lat: 25.117, lng: 51.315, zone: 'qatar', status: 'available',
    capabilities: [
      { name: 'F-35A', current: 24, max: 24, unit: 'aircraft' },
      { name: 'B-52H', current: 6, max: 6, unit: 'aircraft' },
      { name: 'KC-135 Tankers', current: 12, max: 12, unit: 'aircraft' },
      { name: 'Personnel', current: 10000, max: 10000, unit: 'personnel' },
    ],
    strike_range_nm: 2500, threat_range_nm: 600,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Permanent USAF installation. B-52s enable strikes on hardened targets (Fordow).',
  },
  {
    id: 'ali-al-salem-ab', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'Ali Al Salem Air Base', short_name: 'Ali Al Salem',
    category: 'air', asset_type: 'air_base',
    description: 'US air base in Kuwait. F/A-18, support aircraft.',
    lat: 29.347, lng: 47.520, zone: 'kuwait', status: 'available',
    capabilities: [
      { name: 'F/A-18', current: 24, max: 24, unit: 'aircraft' },
    ],
    strike_range_nm: 1500, threat_range_nm: 400,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Permanent installation.',
  },
  {
    id: 'al-dhafra-ab', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'Al Dhafra Air Base', short_name: 'Al Dhafra',
    category: 'air', asset_type: 'air_base',
    description: 'US air base in UAE. F-22 Raptors, tankers, ISR aircraft.',
    lat: 24.248, lng: 54.548, zone: 'uae', status: 'available',
    capabilities: [
      { name: 'F-22 Raptor', current: 12, max: 12, unit: 'aircraft' },
      { name: 'KC-46 Tankers', current: 8, max: 8, unit: 'aircraft' },
    ],
    strike_range_nm: 1800, threat_range_nm: 400,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Permanent installation.',
  },
  {
    id: '5th-fleet-hq', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: '5th Fleet HQ — Bahrain', short_name: '5th Fleet HQ',
    category: 'naval', asset_type: 'headquarters',
    description: 'US Naval Forces Central Command. Command and control for all naval operations in CENTCOM AOR.',
    lat: 26.217, lng: 50.610, zone: 'bahrain', status: 'available',
    capabilities: [{ name: 'Command & Control', current: 1, max: 1, unit: 'operational' }],
    threat_range_nm: 200,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Fixed installation. High-value target.',
  },
  {
    id: 'thaad-israel', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'THAAD Battery (Israel-deployed)', short_name: 'THAAD-IL',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'Terminal High Altitude Area Defense battery deployed to Israel. Intercepts ballistic missiles in terminal phase.',
    lat: 31.5, lng: 34.8, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Interceptors', current: 48, max: 48, unit: 'missiles' }],
    threat_range_nm: 150,
    provenance: 'researched', effective_from: '2024-10-01',
    notes: 'Deployed post-Oct 2024 Iranian barrage. US-operated.',
  },
  {
    id: 'patriot-qatar', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'Patriot Battery — Qatar', short_name: 'PAC-3 Qatar',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'PAC-3 Patriot battery defending Al Udeid and Doha.',
    lat: 25.2, lng: 51.5, zone: 'qatar', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 48, max: 48, unit: 'missiles' }],
    threat_range_nm: 100,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Count unverified. Research pipeline must update.',
  },
  {
    id: 'patriot-kuwait', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'Patriot Battery — Kuwait', short_name: 'PAC-3 Kuwait',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'PAC-3 Patriot battery defending Ali Al Salem and Kuwait City.',
    lat: 29.4, lng: 47.6, zone: 'kuwait', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 48, max: 48, unit: 'missiles' }],
    threat_range_nm: 100,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Count unverified. Research pipeline must update.',
  },
  {
    id: 'patriot-uae', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'Patriot Battery — UAE', short_name: 'PAC-3 UAE',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'PAC-3 Patriot battery defending Al Dhafra and Abu Dhabi.',
    lat: 24.4, lng: 54.4, zone: 'uae', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 48, max: 48, unit: 'missiles' }],
    threat_range_nm: 100,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Count unverified. Research pipeline must update.',
  },
  {
    id: 'kc135-udeid', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'KC-135/KC-46 Tanker Wing (Al Udeid)', short_name: 'Tanker Wing',
    category: 'air', asset_type: 'air_refueling',
    description: 'Air refueling assets enabling long-range strike from Gulf bases. Critical for F-35 and B-52 strike range extension.',
    lat: 25.117, lng: 51.315, zone: 'qatar', status: 'available',
    capabilities: [
      { name: 'KC-135', current: 12, max: 12, unit: 'aircraft' },
      { name: 'KC-46', current: 6, max: 6, unit: 'aircraft' },
    ],
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Enables ~500nm range extension for strike aircraft. High-value target for Iran.',
  },
  // ── US Ground Forces (generic pool) ────────────────────────────────────────
  {
    id: 'us-ground-staging', scenario_id: SCENARIO_ID, actor_id: 'us',
    name: 'US Ground Forces (Kuwait/Qatar Staging)', short_name: 'US Ground',
    category: 'ground', asset_type: 'ground_force_pool',
    description: 'Combined US Army/Marine ground forces staged in Kuwait and Qatar. Not yet committed to ground operations.',
    lat: 29.4, lng: 47.6, zone: 'kuwait', status: 'staged',
    capabilities: [{ name: 'Personnel', current: 20000, max: 20000, unit: 'personnel' }],
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Approximate. Research pipeline must update.',
  },

  // ── Israeli Assets ─────────────────────────────────────────────────────────
  {
    id: 'nevatim-ab', scenario_id: SCENARIO_ID, actor_id: 'israel',
    name: 'Nevatim Air Base', short_name: 'Nevatim',
    category: 'air', asset_type: 'air_base',
    description: 'Primary Israeli long-range strike base. Home of F-35I Adir. Used in Oct 2024 strikes on Iran.',
    lat: 31.208, lng: 35.012, zone: 'israel', status: 'available',
    capabilities: [
      { name: 'F-35I Adir', current: 50, max: 50, unit: 'aircraft' },
      { name: 'F-16I Sufa', current: 30, max: 30, unit: 'aircraft' },
    ],
    strike_range_nm: 2000, threat_range_nm: 300,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Primary platform for deep strikes into Iran. F-35I used in Oct 2024.',
  },
  {
    id: 'hatzerim-ab', scenario_id: SCENARIO_ID, actor_id: 'israel',
    name: 'Hatzerim Air Base', short_name: 'Hatzerim',
    category: 'air', asset_type: 'air_base',
    description: 'Major IAF base. F-16I fighters, drone operations.',
    lat: 31.233, lng: 34.667, zone: 'israel', status: 'available',
    capabilities: [{ name: 'F-16I Sufa', current: 40, max: 40, unit: 'aircraft' }],
    strike_range_nm: 1800, threat_range_nm: 300,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Permanent installation.',
  },
  {
    id: 'iron-dome-south', scenario_id: SCENARIO_ID, actor_id: 'israel',
    name: 'Iron Dome Batteries (South)', short_name: 'Iron Dome S',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'Iron Dome batteries defending southern Israel and border areas. Partially depleted from prior barrages.',
    lat: 31.5, lng: 34.5, zone: 'israel', status: 'degraded',
    capabilities: [{ name: 'Tamir Interceptors', current: 60, max: 80, unit: 'missiles' }],
    threat_range_nm: 70,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Depleted from Apr 2024 and Oct 2024 Iranian barrages. US resupply ongoing.',
  },
  {
    id: 'iron-dome-north', scenario_id: SCENARIO_ID, actor_id: 'israel',
    name: 'Iron Dome Batteries (North)', short_name: 'Iron Dome N',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'Iron Dome batteries defending northern Israel, Tel Aviv metro.',
    lat: 32.8, lng: 35.2, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Tamir Interceptors', current: 80, max: 80, unit: 'missiles' }],
    threat_range_nm: 70,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Research pipeline must update post-2025 exchanges.',
  },
  {
    id: 'arrow-3-battery', scenario_id: SCENARIO_ID, actor_id: 'israel',
    name: 'Arrow-3 Battery', short_name: 'Arrow-3',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'Exoatmospheric interceptor for ballistic missiles. Only system capable of intercepting Shahab-3 class in boost/midcourse phase.',
    lat: 32.1, lng: 34.9, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Arrow-3 Interceptors', current: 36, max: 36, unit: 'missiles' }],
    threat_range_nm: 2400,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Critical for defense against Shahab/Kheibar Shekan. Limited supply.',
  },
  {
    id: 'dimona', scenario_id: SCENARIO_ID, actor_id: 'israel',
    name: 'Negev Nuclear Research Center (Dimona)', short_name: 'Dimona',
    category: 'nuclear', asset_type: 'nuclear_facility',
    description: 'Israels primary nuclear weapons research facility. Officially unacknowledged. Considered existential target by Iran.',
    lat: 30.867, lng: 35.150, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Nuclear Capability', current: 1, max: 1, unit: 'operational' }],
    threat_range_nm: 0,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Officially unconfirmed. Strike on this facility = existential escalation.',
  },

  // ── Iranian Assets ─────────────────────────────────────────────────────────
  {
    id: 'fordow', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Fordow Fuel Enrichment Plant', short_name: 'Fordow',
    category: 'nuclear', asset_type: 'nuclear_facility',
    description: 'Underground enrichment facility near Qom. Buried 80m under mountain. Resistant to all but the largest bunker-busters (GBU-57).',
    lat: 34.884, lng: 50.995, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'Enrichment Capacity (IR-6 centrifuges)', current: 1044, max: 1044, unit: 'centrifuges' },
    ],
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Primary strategic target. Hardened against conventional strikes. Only B-2 with GBU-57 can penetrate.',
  },
  {
    id: 'natanz', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Natanz Enrichment Facility', short_name: 'Natanz',
    category: 'nuclear', asset_type: 'nuclear_facility',
    description: 'Main Iranian enrichment complex. Above-ground halls and underground halls. Partially damaged in prior sabotage operations.',
    lat: 33.723, lng: 51.727, zone: 'central_iran', status: 'degraded',
    capabilities: [
      { name: 'IR-1 Centrifuges', current: 5000, max: 19000, unit: 'centrifuges' },
    ],
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Degraded from Stuxnet, explosions, and Israeli operations. Still operational.',
  },
  {
    id: 'arak-ir40', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Arak IR-40 Heavy Water Reactor', short_name: 'Arak',
    category: 'nuclear', asset_type: 'nuclear_facility',
    description: 'Heavy water reactor capable of producing weapons-grade plutonium. Redesigned under JCPOA but status uncertain after JCPOA collapse.',
    lat: 34.190, lng: 49.231, zone: 'central_iran', status: 'available',
    capabilities: [{ name: 'Plutonium Production Potential', current: 1, max: 1, unit: 'operational' }],
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Strike risk: radioactive contamination of Arak and surroundings.',
  },
  {
    id: 'bandar-abbas-naval', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Bandar Abbas Naval Base', short_name: 'Bandar Abbas',
    category: 'naval', asset_type: 'naval_base',
    description: 'Primary IRIN and IRGCN base. Controls the Strait of Hormuz. Home of submarines, destroyers, and fast-attack craft.',
    lat: 27.167, lng: 56.283, zone: 'strait_of_hormuz', status: 'available',
    capabilities: [
      { name: 'IRGC Fast-Attack Craft', current: 50, max: 50, unit: 'vessels' },
      { name: 'Submarines (Kilo-class)', current: 3, max: 3, unit: 'vessels' },
    ],
    threat_range_nm: 200,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Key node for any Strait of Hormuz mining or blockade operation.',
  },
  {
    id: 'chabahar-naval', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Chabahar Naval Base', short_name: 'Chabahar',
    category: 'naval', asset_type: 'naval_base',
    description: 'IRIN naval base on Gulf of Oman. Strategic depth away from Strait of Hormuz.',
    lat: 25.291, lng: 60.641, zone: 'gulf_of_oman', status: 'available',
    capabilities: [{ name: 'Naval Vessels', current: 20, max: 20, unit: 'vessels' }],
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Less exposed than Bandar Abbas.',
  },
  {
    id: 'kharg-island', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Kharg Island Oil Terminal', short_name: 'Kharg Island',
    category: 'infrastructure', asset_type: 'oil_terminal',
    description: 'Handles ~80% of Iranian oil exports. Destruction would cripple Iranian oil revenue. Major economic target.',
    lat: 29.233, lng: 50.317, zone: 'persian_gulf', status: 'available',
    capabilities: [
      { name: 'Export Capacity (mb/d)', current: 2.5, max: 2.5, unit: 'million barrels/day' },
    ],
    threat_range_nm: 0,
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Strike = 6-12 month oil export disruption. Oil price +$30-60/bbl.',
  },
  {
    id: 'abadan-refinery', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Abadan Refinery Complex', short_name: 'Abadan',
    category: 'infrastructure', asset_type: 'oil_refinery',
    description: 'One of Irans largest refineries. Domestic fuel production. Strike causes domestic fuel shortages.',
    lat: 30.340, lng: 48.304, zone: 'southwest_iran', status: 'available',
    capabilities: [
      { name: 'Refining Capacity (kb/d)', current: 400, max: 400, unit: 'thousand barrels/day' },
    ],
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Civilian infrastructure. Strike = domestic fuel crisis in Iran.',
  },
  {
    id: 'bandar-imam-refinery', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Bandar Imam Khomeini Refinery', short_name: 'Bandar Imam Ref.',
    category: 'infrastructure', asset_type: 'oil_refinery',
    description: 'Major export refinery. Petrochemical complex. Key Iranian economic infrastructure.',
    lat: 30.447, lng: 49.125, zone: 'southwest_iran', status: 'available',
    capabilities: [
      { name: 'Refining Capacity (kb/d)', current: 220, max: 220, unit: 'thousand barrels/day' },
    ],
    provenance: 'verified', effective_from: '2024-01-01',
    notes: 'Combined with Abadan, these refineries supply most domestic Iranian fuel.',
  },
  {
    id: 'shahab-site-west', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Shahab / Kheibar Shekan Launch Site (West)', short_name: 'Missile Site W',
    category: 'missile', asset_type: 'missile_site',
    description: 'Western Iran missile launch complex. Shahab-3 (2,000km range), Kheibar Shekan (2,000km). Targets Israel and Gulf states.',
    lat: 34.5, lng: 47.0, zone: 'western_iran', status: 'available',
    capabilities: [
      { name: 'Shahab-3 / Kheibar Shekan', current: 50, max: 200, unit: 'missiles' },
    ],
    strike_range_nm: 1080, // 2000km
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Approximate location from open-source imagery. Depleted from Apr + Oct 2024 barrages.',
  },
  {
    id: 'shahab-site-central', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Shahab / Kheibar Shekan Launch Site (Central)', short_name: 'Missile Site C',
    category: 'missile', asset_type: 'missile_site',
    description: 'Central Iran missile complex. Diverse inventory: Shahab, Emad, Ghadr.',
    lat: 35.0, lng: 51.5, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'Ballistic Missiles (mixed)', current: 80, max: 300, unit: 'missiles' },
    ],
    strike_range_nm: 1080,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Depleted from prior barrages. Research pipeline must update.',
  },
  {
    id: 'isfahan-air-defense', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Isfahan Air Defense Complex', short_name: 'Isfahan AD',
    category: 'air_defense', asset_type: 'air_defense_battery',
    description: 'S-300 and Bavar-373 batteries defending central Iran nuclear sites.',
    lat: 32.627, lng: 51.695, zone: 'central_iran', status: 'degraded',
    capabilities: [
      { name: 'S-300 Interceptors', current: 24, max: 48, unit: 'missiles' },
    ],
    threat_range_nm: 150,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Degraded from Oct 2024 Israeli strikes. Research pipeline must update.',
  },
  // ── Iranian Force Pools ────────────────────────────────────────────────────
  {
    id: 'iran-shahed-pool', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'Shahed-136 Drone Stockpile', short_name: 'Shahed Pool',
    category: 'missile', asset_type: 'drone_stockpile',
    description: 'Iranian one-way attack drone. ~$20K/unit vs $3M Patriot interceptor. Saturation tactic.',
    lat: 35.0, lng: 51.0, zone: 'central_iran', status: 'available',
    capabilities: [{ name: 'Shahed-136', current: 2000, max: 3000, unit: 'drones' }],
    strike_range_nm: 1350, // 2500km
    provenance: 'inferred', effective_from: '2024-01-01',
    notes: 'Quantity estimated. Production ~300/month. Depleted from exports to Russia and own use.',
  },
  {
    id: 'iran-irgc-naval', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'IRGC Fast-Attack Craft (Strait of Hormuz)', short_name: 'IRGC FAC',
    category: 'naval', asset_type: 'naval_force_pool',
    description: 'IRGC Navy fast-attack craft and patrol boats. Swarm tactics against carriers in confined waters.',
    lat: 26.6, lng: 56.5, zone: 'strait_of_hormuz', status: 'available',
    capabilities: [{ name: 'Fast-Attack Craft', current: 100, max: 100, unit: 'vessels' }],
    threat_range_nm: 100,
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Asymmetric threat to US carrier groups in Strait. Mines + FAC combination is primary Hormuz denial strategy.',
  },
  {
    id: 'iran-ground-irgc', scenario_id: SCENARIO_ID, actor_id: 'iran',
    name: 'IRGC Ground Forces', short_name: 'IRGC Ground',
    category: 'ground', asset_type: 'ground_force_pool',
    description: 'IRGC ground forces. Primary defensive force inside Iran. Not optimized for offensive operations beyond borders.',
    lat: 35.7, lng: 51.4, zone: 'central_iran', status: 'available',
    capabilities: [{ name: 'Personnel', current: 150000, max: 150000, unit: 'personnel' }],
    provenance: 'researched', effective_from: '2024-01-01',
    notes: 'Defensive posture. Proxy forces (Hezbollah, Houthis, PMF) not modeled here.',
  },
]

async function seedAssets(supabase: SupabaseClient) {
  console.log('Seeding asset registry...')
  const { error } = await supabase
    .from('asset_registry')
    .upsert(IRAN_ASSETS, { onConflict: 'id,scenario_id' })

  if (error) {
    console.error('Asset seed failed:', error.message)
    throw error
  }
  console.log(`✓ Seeded ${IRAN_ASSETS.length} assets`)
}
```

Add `await seedAssets(supabase)` to the existing `main()` function, after the existing actor seeds.

Add the necessary imports at the top of the file:
```typescript
import type { AssetRegistryInsert } from '@/lib/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
```

- [ ] **Step 2: Add assertions to `tests/scripts/seed-iran.test.ts`**

Open the existing test file and add:

```typescript
describe('Iran scenario asset seed', () => {
  it('defines assets for all three main actors', () => {
    const actorIds = new Set(IRAN_ASSETS.map(a => a.actor_id))
    expect(actorIds).toContain('us')
    expect(actorIds).toContain('iran')
    expect(actorIds).toContain('israel')
  })

  it('all assets have valid categories', () => {
    const validCategories = ['naval','air','ground','missile','nuclear','infrastructure','cyber','air_defense']
    for (const asset of IRAN_ASSETS) {
      expect(validCategories).toContain(asset.category)
    }
  })

  it('all capabilities have current <= max', () => {
    for (const asset of IRAN_ASSETS) {
      for (const cap of asset.capabilities) {
        expect(cap.current).toBeLessThanOrEqual(cap.max)
      }
    }
  })

  it('all fixed infrastructure is marked verified', () => {
    const fixedTypes = ['nuclear_facility', 'oil_terminal', 'oil_refinery', 'air_base', 'naval_base']
    const fixed = IRAN_ASSETS.filter(a => fixedTypes.includes(a.asset_type))
    for (const asset of fixed) {
      expect(['verified', 'researched']).toContain(asset.provenance)
    }
  })
})
```

Note: you'll need to export `IRAN_ASSETS` from `scripts/seed-iran.ts` for the test import, or define the array in a separate module (`scripts/iran-asset-data.ts`) that both the seed script and test import.

- [ ] **Step 3: Run tests**

```bash
bun run test -- --run tests/scripts/seed-iran.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-iran.ts tests/scripts/seed-iran.test.ts
git commit -m "feat: add Iran scenario asset seed data (US/Israel/Iran, 30 assets)"
```

---

## Task 7: Actor Motivation Seed (Israel + US)

**Files:**
- Modify: `scripts/seed-iran.ts` (actor records for `us` and `israel`)

The Iran scenario seed script populates actors with `objectives`, `decisionFactors`, etc. Update the `us` and `israel` actor entries to explicitly capture divergent motivations.

- [ ] **Step 1: Update Israel actor entry**

Find the Israel actor object in `scripts/seed-iran.ts` and update/add these fields:

```typescript
// In the Israel actor definition:
winCondition: 'Iran permanently unable to reconstitute as a regional power. US military presence in the Middle East sustained long-term. Iranian nuclear program eliminated. Proxy network (Hezbollah, Hamas, Houthis) degraded to non-threatening levels.',
loseCondition: 'US-Iran diplomatic deal that leaves the Iranian state intact and functional. US regional military withdrawal. Iran achieves nuclear deterrent capability — even threshold status changes the strategic equation irreversibly.',
stakesLevel: 'existential',
// Add to decisionFactors:
decisionFactors: [
  // ... existing factors ...
  {
    name: 'Regional Hegemony Drive',
    description: 'Israel seeks to be the dominant regional power in the Middle East. A weakened, fragmented Iran is the primary path to this. Actions that keep the US engaged and Iran unable to rebuild are strategically rational — even if they conflict with stated US preferences.',
    weight: 95,
    currentValue: 'high',
  },
  {
    name: 'US Commitment Preservation',
    description: 'Maintaining US military involvement is a core strategic interest. Israel may take actions that constrain US options for de-escalation or diplomacy if those options risk US withdrawal from the conflict.',
    weight: 90,
    currentValue: 'critical',
  },
  {
    name: 'Moderate Elimination',
    description: 'Iranian political figures who might negotiate or seek de-escalation represent a threat to the conflict continuing. Targeting them (directly or indirectly) is consistent with Israels strategic logic.',
    weight: 70,
    currentValue: 'active',
  },
]
```

- [ ] **Step 2: Update US actor entry**

```typescript
// In the US actor definition:
winCondition: 'Iranian nuclear program eliminated. Regional oil flows and Strait of Hormuz protected. No wider regional war involving China or Russia. Domestic political sustainability — no quagmire narrative. Demonstrable deterrence re-established.',
loseCondition: 'Regional quagmire with no exit. Oil price shock above $200/bbl. Conflict expansion drawing in China (Taiwan) or Russia. Significant American casualties without clear strategic gain. Loss of Gulf state partnerships.',
stakesLevel: 'critical',
// Add to decisionFactors:
decisionFactors: [
  // ... existing factors ...
  {
    name: 'Alliance Friction Tolerance',
    description: 'US and Israel have different win conditions. The US may prefer negotiated off-ramps that Israel would actively sabotage. The US must weigh the cost of restraining Israel against the cost of being drawn into an expanding conflict.',
    weight: 75,
    currentValue: 'high_tension',
  },
  {
    name: 'Escalation Ceiling',
    description: 'The US is sensitive to actions that could draw in China or Russia, or that could destabilize Gulf state partners. Nuclear escalation is categorically unacceptable. The US has a lower escalation ceiling than Israel.',
    weight: 85,
    currentValue: 'active_constraint',
  },
]
```

- [ ] **Step 3: Run seed test**

```bash
bun run test -- --run tests/scripts/seed-iran.test.ts
```

Expected: PASS (no new test assertions needed for this step — covered by existing actor shape tests)

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-iran.ts
git commit -m "feat: add Israel/US divergent motivations to Iran scenario actor seed"
```

---

## Task 8: AssetMarker Component

**Files:**
- Create: `components/map/AssetMarker.tsx`

This component creates a DOM element that gets mounted as a Mapbox GL marker. It does NOT use React DOM rendering — it returns a raw `HTMLElement` used by `new mapboxgl.Marker(element)`.

- [ ] **Step 1: Create `components/map/AssetMarker.tsx`**

```typescript
// components/map/AssetMarker.tsx
'use client'
import type { AssetCategory, AssetStatus } from '@/lib/types/simulation'

// Color per actor id
const ACTOR_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  us:      { border: '#2980b9', bg: 'rgba(41,128,185,0.25)', text: '#5dade2' },
  israel:  { border: '#27ae60', bg: 'rgba(39,174,96,0.25)',  text: '#2ecc71' },
  iran:    { border: '#c0392b', bg: 'rgba(192,57,43,0.25)',  text: '#e74c3c' },
  default: { border: '#e67e22', bg: 'rgba(230,126,34,0.25)', text: '#f39c12' },
}

// Icon per category
const CATEGORY_ICONS: Record<AssetCategory, string> = {
  naval:          '⛵',
  air:            '✈',
  ground:         '⬛',
  missile:        '🎯',
  nuclear:        '☢',
  infrastructure: '🛢',
  cyber:          '💻',
  air_defense:    '🛡',
}

// Status modifiers
const STATUS_STYLES: Record<AssetStatus, { opacity: number; extra: string }> = {
  available:  { opacity: 1,   extra: '' },
  mobilizing: { opacity: 0.8, extra: 'border-style: dashed;' },
  transiting: { opacity: 0.8, extra: 'border-style: dashed;' },
  staged:     { opacity: 1,   extra: '' },
  engaged:    { opacity: 1,   extra: 'box-shadow: 0 0 6px rgba(255,186,32,0.6);' },
  degraded:   { opacity: 0.7, extra: 'box-shadow: 0 0 6px rgba(230,126,34,0.5);' },
  destroyed:  { opacity: 0.3, extra: '' },
  withdrawn:  { opacity: 0.5, extra: '' },
}

export interface AssetMarkerOptions {
  actorId: string
  category: AssetCategory
  shortName: string
  status: AssetStatus
  onClick: () => void
}

/**
 * Creates a DOM element for use as a mapboxgl.Marker.
 * Usage: new mapboxgl.Marker(createAssetMarkerElement(opts)).setLngLat([lng, lat]).addTo(map)
 */
export function createAssetMarkerElement(opts: AssetMarkerOptions): HTMLElement {
  const colors = ACTOR_COLORS[opts.actorId] ?? ACTOR_COLORS.default
  const icon = CATEGORY_ICONS[opts.category] ?? '●'
  const statusStyle = STATUS_STYLES[opts.status] ?? STATUS_STYLES.available

  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    cursor: pointer; opacity: ${statusStyle.opacity};
  `

  const circle = document.createElement('div')
  circle.style.cssText = `
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    background: ${colors.bg};
    border: 2px solid ${colors.border};
    color: ${colors.text};
    ${statusStyle.extra}
    transition: transform 0.15s ease;
  `
  circle.textContent = icon

  const label = document.createElement('div')
  label.style.cssText = `
    margin-top: 2px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px; letter-spacing: 0.08em;
    color: rgba(232,230,224,0.6);
    background: rgba(0,0,0,0.65);
    padding: 1px 4px; border-radius: 2px;
    white-space: nowrap; pointer-events: none;
  `
  label.textContent = opts.shortName

  // Destroyed: overlay X
  if (opts.status === 'destroyed') {
    const x = document.createElement('div')
    x.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: rgba(192,57,43,0.8); pointer-events: none;
    `
    x.textContent = '✕'
    wrapper.style.position = 'relative'
    wrapper.appendChild(x)
  }

  wrapper.appendChild(circle)
  wrapper.appendChild(label)
  wrapper.addEventListener('click', (e) => { e.stopPropagation(); opts.onClick() })
  wrapper.addEventListener('mouseenter', () => { circle.style.transform = 'scale(1.15)' })
  wrapper.addEventListener('mouseleave', () => { circle.style.transform = 'scale(1)' })

  return wrapper
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/AssetMarker.tsx
git commit -m "feat: add AssetMarker DOM element factory for Mapbox markers"
```

---

## Task 9: AssetPopup Component

**Files:**
- Create: `components/map/AssetPopup.tsx`

- [ ] **Step 1: Create `components/map/AssetPopup.tsx`**

```typescript
// components/map/AssetPopup.tsx
'use client'
import type { PositionedAsset } from '@/lib/types/simulation'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  available:  { label: 'AVAILABLE',  color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  mobilizing: { label: 'MOBILIZING', color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  transiting: { label: 'TRANSITING', color: '#5dade2', bg: 'rgba(41,128,185,0.15)' },
  staged:     { label: 'STAGED',     color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  engaged:    { label: 'ENGAGED',    color: '#ffba20', bg: 'rgba(255,186,32,0.15)' },
  degraded:   { label: 'DEGRADED',   color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  destroyed:  { label: 'DESTROYED',  color: '#e74c3c', bg: 'rgba(192,57,43,0.15)' },
  withdrawn:  { label: 'WITHDRAWN',  color: '#8a8880', bg: 'rgba(138,136,128,0.15)' },
}

interface Props {
  asset: PositionedAsset
  onExpand: (asset: PositionedAsset) => void
  onClose: () => void
}

export function AssetPopup({ asset, onExpand, onClose }: Props) {
  const badge = STATUS_BADGE[asset.status] ?? STATUS_BADGE.available
  const topCaps = asset.capabilities.slice(0, 3)

  return (
    <div
      style={{
        position: 'absolute',
        background: 'rgba(10,11,13,0.97)',
        border: '1px solid #2a2d32',
        borderRadius: 4,
        padding: '10px 12px',
        width: 220,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#e8e6e0',
        pointerEvents: 'all',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: '#ffba20', lineHeight: 1.2, flex: 1 }}>
          {asset.name}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 14, padding: 0, marginLeft: 6, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Actor + type */}
      <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {asset.actorId.toUpperCase()} · {asset.assetType.replace(/_/g, ' ')}
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 2, fontSize: 9,
          fontWeight: 600, letterSpacing: '0.1em',
          color: badge.color, background: badge.bg,
          border: `1px solid ${badge.color}33`,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Top capabilities */}
      {topCaps.map(cap => {
        const pct = cap.max > 0 ? cap.current / cap.max : 1
        const valColor = pct >= 0.75 ? '#2ecc71' : pct >= 0.4 ? '#f39c12' : '#e74c3c'
        return (
          <div key={cap.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #1c1f23' }}>
            <span style={{ color: '#8a8880', fontSize: 10 }}>{cap.name}</span>
            <span style={{ color: valColor, fontSize: 10 }}>{cap.current}/{cap.max}</span>
          </div>
        )
      })}

      {/* Expand button */}
      <button
        onClick={() => onExpand(asset)}
        style={{
          marginTop: 10, width: '100%', padding: '5px 0',
          background: 'rgba(255,186,32,0.08)',
          border: '1px solid rgba(255,186,32,0.25)',
          borderRadius: 2, color: '#ffba20',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em',
        }}
      >
        FULL DETAILS →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/AssetPopup.tsx
git commit -m "feat: add AssetPopup compact map popup component"
```

---

## Task 10: AssetDetailPanel Component

**Files:**
- Create: `components/map/AssetDetailPanel.tsx`

First, find the SlideOverPanel component:

```bash
find components -name "SlideOverPanel*"
```

Note the exact path and props interface, then use it in the panel below.

- [ ] **Step 1: Create `components/map/AssetDetailPanel.tsx`**

```typescript
// components/map/AssetDetailPanel.tsx
'use client'
import type { PositionedAsset } from '@/lib/types/simulation'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  available:  { label: 'AVAILABLE',  color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  mobilizing: { label: 'MOBILIZING', color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  transiting: { label: 'TRANSITING', color: '#5dade2', bg: 'rgba(41,128,185,0.15)' },
  staged:     { label: 'STAGED',     color: '#2ecc71', bg: 'rgba(39,174,96,0.15)' },
  engaged:    { label: 'ENGAGED',    color: '#ffba20', bg: 'rgba(255,186,32,0.15)' },
  degraded:   { label: 'DEGRADED',   color: '#f39c12', bg: 'rgba(230,126,34,0.15)' },
  destroyed:  { label: 'DESTROYED',  color: '#e74c3c', bg: 'rgba(192,57,43,0.15)' },
  withdrawn:  { label: 'WITHDRAWN',  color: '#8a8880', bg: 'rgba(138,136,128,0.15)' },
}

const PROVENANCE_LABEL: Record<string, string> = {
  verified:   'VERIFIED (open source)',
  researched: 'RESEARCHED (AI pipeline)',
  inferred:   'INFERRED (estimated)',
}

interface Props {
  asset: PositionedAsset | null
  isOpen: boolean
  onClose: () => void
}

export function AssetDetailPanel({ asset, isOpen, onClose }: Props) {
  if (!asset) return null

  const badge = STATUS_BADGE[asset.status] ?? STATUS_BADGE.available

  return (
    <div
      style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 50,
        width: 300,
        background: 'rgba(10,11,13,0.98)',
        borderLeft: '1px solid #2a2d32',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.2s ease',
        overflow: 'auto',
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#e8e6e0',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #1c1f23', position: 'sticky', top: 0, background: 'rgba(10,11,13,0.98)', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: '#ffba20', lineHeight: 1.3, flex: 1 }}>
            {asset.name}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 18, padding: 0, marginLeft: 8, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
          {asset.actorId.toUpperCase()} · {asset.category.toUpperCase()} · {asset.assetType.replace(/_/g, ' ').toUpperCase()}
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Status */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>STATUS</div>
          <span style={{
            padding: '3px 8px', borderRadius: 2, fontSize: 10,
            fontWeight: 600, letterSpacing: '0.1em',
            color: badge.color, background: badge.bg,
            border: `1px solid ${badge.color}44`,
          }}>
            {badge.label}
          </span>
        </div>

        {/* Zone */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LOCATION</div>
          <div style={{ fontSize: 11 }}>
            {asset.zone.replace(/_/g, ' ').toUpperCase()}
            <span style={{ color: '#8a8880', marginLeft: 8, fontSize: 10 }}>
              {asset.position.lat.toFixed(2)}°N {asset.position.lng.toFixed(2)}°E
            </span>
          </div>
        </div>

        {/* Capabilities */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>CAPABILITIES</div>
          {asset.capabilities.map(cap => {
            const pct = cap.max > 0 ? cap.current / cap.max : 1
            const valColor = pct >= 0.75 ? '#2ecc71' : pct >= 0.4 ? '#f39c12' : '#e74c3c'
            return (
              <div key={cap.name} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: '#c8c6c0' }}>{cap.name}</span>
                  <span style={{ fontSize: 10, color: valColor }}>{cap.current} / {cap.max} {cap.unit}</span>
                </div>
                <div style={{ height: 3, background: '#1c1f23', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: valColor, borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Range */}
        {(asset.strikeRangeNm ?? asset.threatRangeNm) && (
          <div style={{ marginBottom: 12, padding: '8px 10px', background: '#0f1114', border: '1px solid #1c1f23', borderRadius: 3 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>RANGE</div>
            {asset.strikeRangeNm && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: '#5dade2' }}>⬤ Strike Range</span>
                <span>{asset.strikeRangeNm.toLocaleString()} nm</span>
              </div>
            )}
            {asset.threatRangeNm && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#e74c3c' }}>⬤ Threat Exposure</span>
                <span>{asset.threatRangeNm.toLocaleString()} nm</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {asset.description && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ASSESSMENT</div>
            <div style={{ fontSize: 10, color: '#c8c6c0', lineHeight: 1.5, fontFamily: "'Newsreader', serif" }}>
              {asset.description}
            </div>
          </div>
        )}

        {/* Notes */}
        {asset.notes && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>NOTES</div>
            <div style={{ fontSize: 10, color: '#8a8880', lineHeight: 1.4, fontStyle: 'italic' }}>
              {asset.notes}
            </div>
          </div>
        )}

        {/* Provenance */}
        <div style={{ padding: '8px 10px', background: '#0a0b0d', border: '1px solid #1c1f23', borderRadius: 3, fontSize: 9 }}>
          <div style={{ color: '#8a8880', marginBottom: 2 }}>
            {PROVENANCE_LABEL[asset.provenance] ?? asset.provenance.toUpperCase()}
          </div>
          {asset.researchedAt && (
            <div style={{ color: '#8a8880' }}>
              Last updated: {new Date(asset.researchedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/map/AssetDetailPanel.tsx
git commit -m "feat: add AssetDetailPanel slide-over with capabilities, range, provenance"
```

---

## Task 11: MapLayerControls Extension

**Files:**
- Modify: `components/map/MapLayerControls.tsx`

- [ ] **Step 1: Add new fields to `LayerState` and new toggle items**

Open `components/map/MapLayerControls.tsx`. Add 4 new fields to `LayerState`:

```typescript
export interface LayerState {
  countryNames:   boolean
  countryBorders: boolean
  terrain:        boolean
  militaryAssets: boolean
  militaryBases:  boolean
  keyCities:      boolean
  // New:
  usAssets:       boolean
  iranAssets:     boolean
  israelAssets:   boolean
  infrastructure: boolean
  strikeRings:    boolean
  threatRings:    boolean
}
```

In the `MapLayerControls` component render, add the new toggles after the existing ones:

```tsx
{/* existing toggles ... */}
<div style={{ borderTop: '1px solid #1a1a1a', marginTop: 4, paddingTop: 4 }}>
  <div style={{ padding: '2px 8px 4px', fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
    Assets
  </div>
  <ToggleItem label="US Assets"      active={layers.usAssets}       onToggle={() => onToggle('usAssets')} />
  <ToggleItem label="Iran Assets"    active={layers.iranAssets}      onToggle={() => onToggle('iranAssets')} />
  <ToggleItem label="Israel Assets"  active={layers.israelAssets}    onToggle={() => onToggle('israelAssets')} />
  <ToggleItem label="Infrastructure" active={layers.infrastructure}  onToggle={() => onToggle('infrastructure')} />
</div>
<div style={{ borderTop: '1px solid #1a1a1a', marginTop: 4, paddingTop: 4 }}>
  <div style={{ padding: '2px 8px 4px', fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
    Rings
  </div>
  <ToggleItem label="Strike Rings"  active={layers.strikeRings}  onToggle={() => onToggle('strikeRings')} />
  <ToggleItem label="Threat Rings"  active={layers.threatRings}  onToggle={() => onToggle('threatRings')} />
</div>
```

- [ ] **Step 2: Update `DEFAULT_LAYERS` in `GameMap.tsx`**

Open `components/map/GameMap.tsx` and add the new defaults:

```typescript
const DEFAULT_LAYERS: LayerState = {
  countryNames:   false,
  countryBorders: true,
  terrain:        false,
  militaryAssets: true,
  militaryBases:  false,
  keyCities:      false,
  // New:
  usAssets:       true,
  iranAssets:     true,
  israelAssets:   true,
  infrastructure: true,
  strikeRings:    false,
  threatRings:    false,
}
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors. All callers of `LayerState` will need the new fields — fix any that don't have them.

- [ ] **Step 4: Commit**

```bash
git add components/map/MapLayerControls.tsx components/map/GameMap.tsx
git commit -m "feat: add asset and range ring toggles to MapLayerControls"
```

---

## Task 12: MapboxMap and GameMap — Wire Asset Rendering

**Files:**
- Modify: `components/map/MapboxMap.tsx`
- Modify: `components/map/GameMap.tsx`

- [ ] **Step 1: Add asset props and rendering to `MapboxMap.tsx`**

Open `components/map/MapboxMap.tsx`. Add to the `Props` interface:

```typescript
interface Props {
  hormuzClosed: boolean
  layerState: LayerState
  // New:
  assets?: PositionedAsset[]
  selectedAssetId?: string | null
  onAssetClick?: (asset: PositionedAsset) => void
}
```

Add imports at the top:
```typescript
import type { PositionedAsset } from '@/lib/types/simulation'
import { createAssetMarkerElement } from './AssetMarker'
```

Inside the component, add a ref to track markers:
```typescript
const assetMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
```

Add a `useEffect` that re-renders asset markers when `assets` or `layerState` changes. Place this after the existing map initialization effects:

```typescript
useEffect(() => {
  const map = mapRef.current
  if (!map || !assets) return

  // Remove all existing asset markers
  assetMarkersRef.current.forEach(marker => marker.remove())
  assetMarkersRef.current.clear()

  // Add markers for visible assets
  assets.forEach(asset => {
    const actorVisible =
      (asset.actorId === 'us'     && layerState.usAssets) ||
      (asset.actorId === 'iran'   && layerState.iranAssets) ||
      (asset.actorId === 'israel' && layerState.israelAssets) ||
      (asset.category === 'infrastructure' && layerState.infrastructure)

    if (!actorVisible) return

    const el = createAssetMarkerElement({
      actorId: asset.actorId,
      category: asset.category,
      shortName: asset.shortName,
      status: asset.status,
      onClick: () => onAssetClick?.(asset),
    })

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([asset.position.lng, asset.position.lat])
      .addTo(map)

    assetMarkersRef.current.set(asset.id, marker)
  })
}, [assets, layerState.usAssets, layerState.iranAssets, layerState.israelAssets, layerState.infrastructure, onAssetClick])
```

Add a `useEffect` for range rings (add/remove Mapbox circle layers when selected asset changes):

```typescript
const STRIKE_RING_SOURCE = 'selected-asset-strike-ring'
const THREAT_RING_SOURCE  = 'selected-asset-threat-ring'

useEffect(() => {
  const map = mapRef.current
  if (!map) return

  // Helper: nm to meters
  const nmToM = (nm: number) => nm * 1852

  // Remove existing ring layers/sources
  ;['strike-ring-fill', 'threat-ring-fill'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id)
  })
  ;[STRIKE_RING_SOURCE, THREAT_RING_SOURCE].forEach(id => {
    if (map.getSource(id)) map.removeSource(id)
  })

  const selected = assets?.find(a => a.id === selectedAssetId)
  if (!selected) return

  if (layerState.strikeRings && selected.strikeRangeNm) {
    map.addSource(STRIKE_RING_SOURCE, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [selected.position.lng, selected.position.lat] },
        properties: {},
      },
    })
    map.addLayer({
      id: 'strike-ring-fill',
      type: 'circle',
      source: STRIKE_RING_SOURCE,
      paint: {
        'circle-radius': {
          stops: [[0, 0], [20, nmToM(selected.strikeRangeNm) / 0.075]],
          base: 2,
        },
        'circle-color': 'transparent',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#2980b9',
        'circle-opacity': 0,
        'circle-stroke-opacity': 0.5,
      },
    })
  }

  if (layerState.threatRings && selected.threatRangeNm) {
    map.addSource(THREAT_RING_SOURCE, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [selected.position.lng, selected.position.lat] },
        properties: {},
      },
    })
    map.addLayer({
      id: 'threat-ring-fill',
      type: 'circle',
      source: THREAT_RING_SOURCE,
      paint: {
        'circle-radius': {
          stops: [[0, 0], [20, nmToM(selected.threatRangeNm) / 0.075]],
          base: 2,
        },
        'circle-color': 'transparent',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#c0392b',
        'circle-opacity': 0,
        'circle-stroke-opacity': 0.4,
      },
    })
  }
}, [selectedAssetId, assets, layerState.strikeRings, layerState.threatRings])
```

**Note:** The circle-radius stops for map range rings are an approximation. Mapbox GL's `circle-radius` in pixels at zoom level doesn't directly correspond to geographic distance. A more accurate approach uses a GeoJSON polygon computed from turf.js (`@turf/circle`). If turf is already a dependency, use it. If not, the approximation above is acceptable for Sprint 3.

- [ ] **Step 2: Wire assets into `GameMap.tsx`**

Open `components/map/GameMap.tsx`. Add state for assets and selected asset:

```typescript
import type { PositionedAsset } from '@/lib/types/simulation'
import { AssetDetailPanel } from './AssetDetailPanel'
import { AssetPopup } from './AssetPopup'
import { useEffect, useState } from 'react'

// Inside GameMap component, add:
const [assets, setAssets] = useState<PositionedAsset[]>([])
const [selectedAsset, setSelectedAsset] = useState<PositionedAsset | null>(null)
const [popupAsset, setPopupAsset] = useState<PositionedAsset | null>(null)
const [detailOpen, setDetailOpen] = useState(false)

// Fetch assets for the current scenario
useEffect(() => {
  // scenarioId should come from props or context — wire appropriately
  // For now, hardcode the Iran scenario id
  const scenarioId = 'iran-2026'
  fetch(`/api/scenarios/${scenarioId}/assets`)
    .then(r => r.json())
    .then(({ data }) => {
      if (data) setAssets(data)
    })
    .catch(() => {/* silently fail — map still renders */})
}, [])

function handleAssetClick(asset: PositionedAsset) {
  setPopupAsset(asset)
  setSelectedAsset(asset)
}

function handleExpand(asset: PositionedAsset) {
  setPopupAsset(null)
  setSelectedAsset(asset)
  setDetailOpen(true)
}
```

Pass the new props to `MapboxMap` and add the `AssetPopup` and `AssetDetailPanel` to the JSX:

```tsx
// In the return JSX of GameMap, after the MapboxMap:
<MapboxMap
  hormuzClosed={hormuzClosed}
  layerState={layers}
  assets={assets}
  selectedAssetId={selectedAsset?.id ?? null}
  onAssetClick={handleAssetClick}
/>

{popupAsset && (
  <div style={{ position: 'absolute', /* position relative to clicked marker — approximate center */ top: '30%', left: '30%', zIndex: 50 }}>
    <AssetPopup
      asset={popupAsset}
      onExpand={handleExpand}
      onClose={() => setPopupAsset(null)}
    />
  </div>
)}

<AssetDetailPanel
  asset={selectedAsset}
  isOpen={detailOpen}
  onClose={() => { setDetailOpen(false); setSelectedAsset(null) }}
/>
```

**Note on popup positioning:** The `AssetPopup` in this step is positioned approximately. Proper positioning relative to the Mapbox marker requires passing the pixel coordinates from the `onAssetClick` handler. Enhance `handleAssetClick` to accept `{ asset, x, y }` coordinates from a `MouseEvent` in the marker click handler if needed — this is a polish task.

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Fix any type errors before proceeding.

- [ ] **Step 4: Run dev server and verify map renders**

```bash
bun run dev
```

Open `http://localhost:3000/play/trunk`. Map should show asset markers for all seeded assets. Clicking a marker should show the popup; clicking "FULL DETAILS →" should open the slide panel.

- [ ] **Step 5: Commit**

```bash
git add components/map/MapboxMap.tsx components/map/GameMap.tsx
git commit -m "feat: wire asset markers and range rings into MapboxMap and GameMap"
```

---

## Task 13: ResearchUpdatePanel

**Files:**
- Create: `components/game/ResearchUpdatePanel.tsx`

- [ ] **Step 1: Create `components/game/ResearchUpdatePanel.tsx`**

```typescript
// components/game/ResearchUpdatePanel.tsx
'use client'
import { useState } from 'react'
import type { AssetResearchLogRow, ProposedAssetChange } from '@/lib/types/database'

interface Props {
  scenarioId: string
  onApproved?: () => void  // callback to refresh assets after approval
}

export function ResearchUpdatePanel({ scenarioId, onApproved }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'reviewing' | 'done' | 'error'>('idle')
  const [logEntry, setLogEntry] = useState<AssetResearchLogRow | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function triggerResearch() {
    setStatus('running')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/assets/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      })
      const { data, error } = await res.json()
      if (error) { setErrorMsg(error); setStatus('error'); return }
      setLogEntry(data)
      setStatus('reviewing')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  async function approve() {
    if (!logEntry) return
    const res = await fetch(`/api/assets/research/${logEntry.id}/approve`, { method: 'POST' })
    const { error } = await res.json()
    if (error) { setErrorMsg(error); setStatus('error'); return }
    setStatus('done')
    onApproved?.()
  }

  async function reject() {
    if (!logEntry) return
    await fetch(`/api/assets/research/${logEntry.id}/reject`, { method: 'POST' })
    setStatus('idle')
    setLogEntry(null)
  }

  const changes = (logEntry?.proposed_changes ?? []) as ProposedAssetChange[]

  return (
    <div style={{
      background: 'rgba(10,11,13,0.97)', border: '1px solid #2a2d32',
      borderRadius: 4, padding: 16, fontFamily: "'IBM Plex Mono', monospace",
      color: '#e8e6e0', minWidth: 280,
    }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: '#ffba20', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Ground Truth Research
      </div>

      {status === 'idle' && (
        <button
          onClick={triggerResearch}
          style={{
            width: '100%', padding: '8px 0',
            background: 'rgba(255,186,32,0.1)', border: '1px solid rgba(255,186,32,0.3)',
            borderRadius: 3, color: '#ffba20', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em',
          }}
        >
          RUN RESEARCH UPDATE
        </button>
      )}

      {status === 'running' && (
        <div style={{ fontSize: 10, color: '#8a8880', textAlign: 'center', padding: '8px 0' }}>
          QUERYING RESEARCH PIPELINE…
        </div>
      )}

      {status === 'reviewing' && logEntry && (
        <div>
          <div style={{ fontSize: 10, color: '#c8c6c0', marginBottom: 10, lineHeight: 1.5 }}>
            {logEntry.summary}
          </div>

          {changes.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', marginBottom: 6 }}>
                Proposed Changes ({changes.length})
              </div>
              {changes.map((c, i) => (
                <div key={i} style={{ padding: '4px 8px', background: '#0f1114', borderRadius: 2, marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: '#ffba20' }}>{c.type.toUpperCase()}</span>
                  {' '}<span style={{ color: '#c8c6c0' }}>{c.assetId}</span>
                  <div style={{ color: '#8a8880', marginTop: 2 }}>{c.rationale}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 12 }}>
              No asset changes proposed. Data enrichment only.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={approve}
              style={{
                flex: 1, padding: '6px 0',
                background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)',
                borderRadius: 3, color: '#2ecc71', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              }}
            >
              APPROVE
            </button>
            <button
              onClick={reject}
              style={{
                flex: 1, padding: '6px 0',
                background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: 3, color: '#e74c3c', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              }}
            >
              REJECT
            </button>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div>
          <div style={{ fontSize: 10, color: '#2ecc71', marginBottom: 8 }}>
            ✓ Research approved and applied.
          </div>
          <button
            onClick={() => { setStatus('idle'); setLogEntry(null) }}
            style={{
              width: '100%', padding: '6px 0',
              background: 'transparent', border: '1px solid #2a2d32',
              borderRadius: 3, color: '#8a8880', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            }}
          >
            RUN ANOTHER UPDATE
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div style={{ fontSize: 10, color: '#e74c3c', marginBottom: 8 }}>
            Error: {errorMsg}
          </div>
          <button
            onClick={() => { setStatus('idle'); setErrorMsg(null) }}
            style={{
              padding: '4px 8px', background: 'transparent', border: '1px solid #2a2d32',
              borderRadius: 3, color: '#8a8880', cursor: 'pointer', fontSize: 10,
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `ResearchUpdatePanel` to game view**

Open the game view page (likely `app/play/[branchId]/page.tsx` or the `GameView` component). Import and add the panel in the game UI — e.g., as a collapsible section in the sidebar or a floating button. Exact placement depends on the current layout; place it somewhere accessible but not intrusive.

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/game/ResearchUpdatePanel.tsx
git commit -m "feat: add ResearchUpdatePanel with trigger/review/approve/reject flow"
```

---

## Task 14: City Layer — Types, DB, Seed, and API

**Files:**
- Modify: `lib/types/simulation.ts`
- Modify: `lib/types/database.ts`
- Modify: `supabase/migrations/20260331000000_asset_registry.sql`
- Create: `app/api/scenarios/[id]/cities/route.ts`
- Create: `app/api/scenarios/[id]/cities/[cityId]/route.ts`
- Modify: `scripts/seed-iran.ts`
- Create: `tests/api/cities.test.ts`

- [ ] **Step 1: Add `City`, `CityImpact`, `ActorStatusSnapshot` types to `lib/types/simulation.ts`**

Open `lib/types/simulation.ts` and add after the `AssetStateDelta` interface:

```typescript
export interface CityImpact {
  category: 'displacement' | 'infrastructure' | 'casualties' | 'economic' | 'political'
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic'
  description: string
  estimatedValue?: number
  unit?: string
  sourceUrl?: string
  sourceDate?: string
}

export interface City {
  id: string
  scenarioId: string
  name: string
  country: string
  population: number
  economicRole: string
  position: { lat: number; lng: number }
  zone: string
  infrastructureNodes: string[]
  warImpacts: CityImpact[]
  provenance: ProvenanceLevel
  sourceUrl?: string
  sourceDate?: string
  researchedAt?: string
}

export interface ActorStatusSnapshot {
  actorId: string
  turnDate: string
  politicalStability: number    // 0–100
  economicHealth: number        // 0–100
  militaryReadiness: number     // 0–100
  publicSupport: number         // 0–100
  internationalIsolation: number // 0–100
  sourceUrl?: string
  notes?: string
}

export interface CityStateDelta {
  cityId: string
  field: 'war_impacts' | 'population' | 'infrastructure_nodes'
  addedImpact?: CityImpact
  previousValue?: unknown
  newValue?: unknown
  cause: string
  turnDate: string
}
```

Also add `sourceUrl?: string` and `sourceDate?: string` to the `PositionedAsset` interface (after `researchedAt?: string`).

- [ ] **Step 2: Write failing tests**

```typescript
// tests/api/cities.test.ts
import { describe, it, expect } from 'vitest'
import type { City, CityImpact, ActorStatusSnapshot, CityStateDelta } from '@/lib/types/simulation'

describe('City types', () => {
  it('accepts a valid City object', () => {
    const city: City = {
      id: 'tehran',
      scenarioId: 'test-scenario',
      name: 'Tehran',
      country: 'Iran',
      population: 9400000,
      economicRole: 'Political capital, industrial hub',
      position: { lat: 35.6892, lng: 51.3890 },
      zone: 'central_iran',
      infrastructureNodes: ['oil_refinery', 'military_command'],
      warImpacts: [],
      provenance: 'researched',
      sourceUrl: 'https://example.com/tehran',
      sourceDate: '2025-08-01',
    }
    expect(city.id).toBe('tehran')
    expect(city.warImpacts).toHaveLength(0)
  })

  it('accepts a CityImpact with all fields', () => {
    const impact: CityImpact = {
      category: 'displacement',
      severity: 'severe',
      description: '500,000 residents evacuated north of Tehran',
      estimatedValue: 500000,
      unit: 'people',
      sourceUrl: 'https://example.com/tehran-displacement',
      sourceDate: '2025-10-15',
    }
    expect(impact.severity).toBe('severe')
  })

  it('accepts an ActorStatusSnapshot', () => {
    const snap: ActorStatusSnapshot = {
      actorId: 'iran',
      turnDate: '2025-10-15',
      politicalStability: 45,
      economicHealth: 30,
      militaryReadiness: 70,
      publicSupport: 60,
      internationalIsolation: 80,
    }
    expect(snap.politicalStability).toBe(45)
  })

  it('accepts a CityStateDelta', () => {
    const delta: CityStateDelta = {
      cityId: 'isfahan',
      field: 'war_impacts',
      addedImpact: {
        category: 'infrastructure',
        severity: 'moderate',
        description: 'Power grid disruption from nearby strike',
      },
      cause: 'US strike on Fordow enrichment facility',
      turnDate: '2025-10-26',
    }
    expect(delta.field).toBe('war_impacts')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
bun run test -- --run tests/api/cities.test.ts
```

Expected: FAIL — types not yet defined (if types added in Step 1, they'll pass; verify import resolves).

- [ ] **Step 4: Add `city_registry` table to migration**

Open `supabase/migrations/20260331000000_asset_registry.sql` and add after the `asset_research_log` table:

```sql
-- City registry
CREATE TABLE city_registry (
  id              text NOT NULL,
  scenario_id     uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name            text NOT NULL,
  country         text NOT NULL,
  population      integer,
  economic_role   text,
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  zone            text NOT NULL,
  infrastructure_nodes jsonb NOT NULL DEFAULT '[]',
  war_impacts     jsonb NOT NULL DEFAULT '[]',
  provenance      text NOT NULL DEFAULT 'inferred',
  source_url      text,
  source_date     date,
  researched_at   timestamptz,
  PRIMARY KEY (id, scenario_id)
);
ALTER TABLE city_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city_registry_select" ON city_registry FOR SELECT USING (true);
CREATE POLICY "city_registry_service" ON city_registry FOR ALL USING (auth.role() = 'service_role');

-- Actor status source url
ALTER TABLE actors ADD COLUMN IF NOT EXISTS source_url text;

-- Actor snapshots on turn commits
ALTER TABLE turn_commits ADD COLUMN IF NOT EXISTS actor_snapshots jsonb NOT NULL DEFAULT '[]';
ALTER TABLE turn_commits ADD COLUMN IF NOT EXISTS city_state_deltas jsonb NOT NULL DEFAULT '[]';
```

- [ ] **Step 5: Add DB types to `lib/types/database.ts`**

Open `lib/types/database.ts` and add `CityRegistryRow` and `CityRegistryInsert`:

```typescript
export interface CityRegistryRow {
  id: string
  scenario_id: string
  name: string
  country: string
  population: number | null
  economic_role: string | null
  lat: number
  lng: number
  zone: string
  infrastructure_nodes: string[]
  war_impacts: import('./simulation').CityImpact[]
  provenance: string
  source_url: string | null
  source_date: string | null
  researched_at: string | null
}

export type CityRegistryInsert = Omit<CityRegistryRow, 'researched_at'> & {
  researched_at?: string | null
}
```

- [ ] **Step 6: Create city API routes**

Create `app/api/scenarios/[id]/cities/route.ts`:

```typescript
// app/api/scenarios/[id]/cities/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CityRegistryInsert } from '@/lib/types/database'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('city_registry')
    .select('*')
    .eq('scenario_id', params.id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const body: CityRegistryInsert = await req.json()
  const { data, error } = await supabase
    .from('city_registry')
    .insert({ ...body, scenario_id: params.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

Create `app/api/scenarios/[id]/cities/[cityId]/route.ts`:

```typescript
// app/api/scenarios/[id]/cities/[cityId]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; cityId: string } }
) {
  const supabase = createClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('city_registry')
    .update(body)
    .eq('id', params.cityId)
    .eq('scenario_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 7: Add Iran city seed data to `scripts/seed-iran.ts`**

Open `scripts/seed-iran.ts` and add the city seed array after the asset seed section:

```typescript
const IRAN_CITIES = [
  {
    id: 'tehran', name: 'Tehran', country: 'Iran', population: 9400000,
    economic_role: 'Political capital, military command, industrial hub',
    lat: 35.6892, lng: 51.3890, zone: 'central_iran',
    infrastructure_nodes: ['military_command', 'oil_refinery', 'air_defense'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Tehran', source_date: '2025-01-01',
  },
  {
    id: 'isfahan', name: 'Isfahan', country: 'Iran', population: 2200000,
    economic_role: 'Industrial center, nuclear facility adjacency',
    lat: 32.6546, lng: 51.6680, zone: 'central_iran',
    infrastructure_nodes: ['nuclear_adjacency', 'steel_industry'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Isfahan', source_date: '2025-01-01',
  },
  {
    id: 'bandar-abbas-city', name: 'Bandar Abbas', country: 'Iran', population: 600000,
    economic_role: 'Strait of Hormuz gateway, naval base, port',
    lat: 27.1832, lng: 56.2666, zone: 'strait_of_hormuz',
    infrastructure_nodes: ['naval_base', 'port', 'oil_terminal'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Bandar_Abbas', source_date: '2025-01-01',
  },
  {
    id: 'baghdad', name: 'Baghdad', country: 'Iraq', population: 8100000,
    economic_role: 'Political capital, oil pipeline hub, US military presence',
    lat: 33.3152, lng: 44.3661, zone: 'iraq',
    infrastructure_nodes: ['oil_pipeline', 'us_base_proximity', 'port'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Baghdad', source_date: '2025-01-01',
  },
  {
    id: 'basra', name: 'Basra', country: 'Iraq', population: 1800000,
    economic_role: 'Primary oil export terminal, southern Iraq gateway',
    lat: 30.5085, lng: 47.7804, zone: 'southern_iraq',
    infrastructure_nodes: ['oil_terminal', 'port', 'refinery'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Basra', source_date: '2025-01-01',
  },
  {
    id: 'erbil', name: 'Erbil', country: 'Iraq', population: 1500000,
    economic_role: 'Kurdish capital, US base proximity, regional logistics',
    lat: 36.1912, lng: 44.0092, zone: 'northern_iraq',
    infrastructure_nodes: ['us_base_proximity', 'airport'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Erbil', source_date: '2025-01-01',
  },
  {
    id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', population: 7700000,
    economic_role: 'Saudi political capital, Aramco headquarters',
    lat: 24.7136, lng: 46.6753, zone: 'saudi_arabia',
    infrastructure_nodes: ['oil_headquarters', 'air_defense', 'military_command'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Riyadh', source_date: '2025-01-01',
  },
  {
    id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', population: 4300000,
    economic_role: 'Economic center, main civilian population zone, tech hub',
    lat: 32.0853, lng: 34.7818, zone: 'israel',
    infrastructure_nodes: ['ben_gurion_airport', 'port_ashdod', 'financial_center'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Tel_Aviv', source_date: '2025-01-01',
  },
  {
    id: 'jerusalem', name: 'Jerusalem', country: 'Israel', population: 950000,
    economic_role: 'Political and symbolic capital',
    lat: 31.7683, lng: 35.2137, zone: 'israel',
    infrastructure_nodes: ['government_center'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Jerusalem', source_date: '2025-01-01',
  },
  {
    id: 'kuwait-city', name: 'Kuwait City', country: 'Kuwait', population: 3000000,
    economic_role: 'Political capital, US staging area, oil hub',
    lat: 29.3759, lng: 47.9774, zone: 'kuwait',
    infrastructure_nodes: ['us_base_staging', 'oil_terminal', 'port'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Kuwait_City', source_date: '2025-01-01',
  },
  {
    id: 'dubai', name: 'Dubai', country: 'UAE', population: 3500000,
    economic_role: 'Regional financial hub, logistics, Al Dhafra AB proximity',
    lat: 25.2048, lng: 55.2708, zone: 'uae',
    infrastructure_nodes: ['financial_hub', 'port_jebel_ali', 'airport'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Dubai', source_date: '2025-01-01',
  },
  {
    id: 'doha', name: 'Doha', country: 'Qatar', population: 2400000,
    economic_role: 'Qatar capital, Al Udeid AB host, LNG export hub',
    lat: 25.2854, lng: 51.5310, zone: 'qatar',
    infrastructure_nodes: ['us_air_base_host', 'lng_terminal', 'financial_hub'],
    war_impacts: [], provenance: 'verified',
    source_url: 'https://en.wikipedia.org/wiki/Doha', source_date: '2025-01-01',
  },
]

// In the seed function, after inserting assets:
const { error: cityError } = await supabase
  .from('city_registry')
  .upsert(
    IRAN_CITIES.map(c => ({ ...c, scenario_id: scenarioId })),
    { onConflict: 'id,scenario_id' }
  )
if (cityError) throw new Error(`City seed failed: ${cityError.message}`)
console.log(`Seeded ${IRAN_CITIES.length} cities`)
```

- [ ] **Step 8: Run tests**

```bash
bun run test -- --run tests/api/cities.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add lib/types/simulation.ts lib/types/database.ts \
  supabase/migrations/20260331000000_asset_registry.sql \
  app/api/scenarios/[id]/cities/route.ts \
  "app/api/scenarios/[id]/cities/[cityId]/route.ts" \
  scripts/seed-iran.ts tests/api/cities.test.ts
git commit -m "feat: add City types, city_registry DB table, city API routes, and Iran city seed"
```

---

## Task 15: City Map Components

**Files:**
- Create: `components/map/CityMarker.tsx`
- Create: `components/map/CityPopup.tsx`
- Create: `components/map/CityDetailPanel.tsx`
- Modify: `components/map/MapLayerControls.tsx` (cities toggle)
- Modify: `components/map/MapboxMap.tsx` (city marker rendering)
- Modify: `components/map/GameMap.tsx` (fetch cities, wire panel)

- [ ] **Step 1: Create `components/map/CityMarker.tsx`**

```typescript
// components/map/CityMarker.tsx
'use client'
import type { City } from '@/lib/types/simulation'

export interface CityMarkerOptions {
  city: City
  onClick: () => void
}

export function createCityMarkerElement({ city, onClick }: CityMarkerOptions): HTMLElement {
  const el = document.createElement('div')
  const hasImpacts = city.warImpacts.length > 0
  const maxSeverity = hasImpacts
    ? (['catastrophic', 'severe', 'moderate', 'minor'] as const).find(s =>
        city.warImpacts.some(i => i.severity === s)
      ) ?? 'minor'
    : null

  const impactColor = maxSeverity === 'catastrophic' ? '#e74c3c'
    : maxSeverity === 'severe' ? '#e67e22'
    : maxSeverity === 'moderate' ? '#f39c12'
    : maxSeverity === 'minor' ? '#f1c40f'
    : '#8a8880'

  Object.assign(el.style, {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: hasImpacts ? impactColor : '#c8c6c0',
    border: `1.5px solid ${hasImpacts ? impactColor : '#8a8880'}`,
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'transform 0.15s ease',
    position: 'relative',
  })

  el.title = city.name

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.6)' })
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick() })

  // Impact count badge
  if (hasImpacts) {
    const badge = document.createElement('div')
    Object.assign(badge.style, {
      position: 'absolute', top: '-6px', right: '-6px',
      width: '10px', height: '10px', borderRadius: '50%',
      background: impactColor, color: '#fff',
      fontSize: '7px', fontWeight: '700', fontFamily: 'monospace',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid #0a0b0d',
    })
    badge.textContent = String(city.warImpacts.length)
    el.appendChild(badge)
  }

  return el
}
```

- [ ] **Step 2: Create `components/map/CityPopup.tsx`**

```typescript
// components/map/CityPopup.tsx
'use client'
import type { City } from '@/lib/types/simulation'

interface Props {
  city: City
  onExpand: (city: City) => void
  onClose: () => void
}

const SEVERITY_COLOR: Record<string, string> = {
  catastrophic: '#e74c3c',
  severe: '#e67e22',
  moderate: '#f39c12',
  minor: '#f1c40f',
}

export function CityPopup({ city, onExpand, onClose }: Props) {
  return (
    <div style={{
      background: 'rgba(10,11,13,0.97)',
      border: '1px solid #2a2d32',
      borderRadius: 3,
      width: 210,
      fontFamily: "'IBM Plex Mono', monospace",
      color: '#e8e6e0',
      fontSize: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #1c1f23', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: '#e8e6e0' }}>
            {city.name}
          </div>
          <div style={{ fontSize: 9, color: '#8a8880', marginTop: 2 }}>
            {city.country.toUpperCase()} · POP {(city.population / 1e6).toFixed(1)}M
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
        >×</button>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 9, color: '#8a8880', marginBottom: 4 }}>{city.economicRole}</div>

        {city.warImpacts.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              War Impacts
            </div>
            {city.warImpacts.slice(0, 3).map((impact, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: SEVERITY_COLOR[impact.severity] ?? '#8a8880',
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 9, color: '#c8c6c0', lineHeight: 1.3 }}>{impact.description}</span>
              </div>
            ))}
            {city.warImpacts.length > 3 && (
              <div style={{ fontSize: 9, color: '#8a8880', marginTop: 2 }}>
                +{city.warImpacts.length - 3} more impacts
              </div>
            )}
          </div>
        )}

        {city.warImpacts.length === 0 && (
          <div style={{ fontSize: 9, color: '#8a8880', marginTop: 4 }}>No impacts recorded.</div>
        )}

        <button
          onClick={() => onExpand(city)}
          style={{
            marginTop: 8, width: '100%', padding: '5px 0',
            background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2d32',
            borderRadius: 2, color: '#c8c6c0', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.06em',
          }}
        >
          FULL DETAILS →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/map/CityDetailPanel.tsx`**

```typescript
// components/map/CityDetailPanel.tsx
'use client'
import type { City } from '@/lib/types/simulation'

interface Props {
  city: City | null
  isOpen: boolean
  isGroundTruth: boolean
  branchDivergenceDate?: string
  onClose: () => void
}

const SEVERITY_COLOR: Record<string, string> = {
  catastrophic: '#e74c3c',
  severe: '#e67e22',
  moderate: '#f39c12',
  minor: '#f1c40f',
}

const SEVERITY_BG: Record<string, string> = {
  catastrophic: 'rgba(231,76,60,0.12)',
  severe: 'rgba(230,126,34,0.12)',
  moderate: 'rgba(243,156,18,0.12)',
  minor: 'rgba(241,196,15,0.08)',
}

export function CityDetailPanel({ city, isOpen, isGroundTruth, branchDivergenceDate, onClose }: Props) {
  if (!isOpen || !city) return null

  const grouped = city.warImpacts.reduce<Record<string, typeof city.warImpacts>>((acc, impact) => {
    acc[impact.category] = acc[impact.category] ?? []
    acc[impact.category].push(impact)
    return acc
  }, {})

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, height: '100vh',
      width: 320, background: 'rgba(10,11,13,0.98)',
      borderLeft: '1px solid #2a2d32', zIndex: 100,
      overflowY: 'auto', fontFamily: "'IBM Plex Mono', monospace",
      color: '#e8e6e0', fontSize: 10,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #1c1f23', position: 'sticky', top: 0, background: 'rgba(10,11,13,0.98)', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: '#e8e6e0', lineHeight: 1.3 }}>
              {city.name}
            </div>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
              {city.country} · {(city.population / 1e6).toFixed(1)}M POPULATION
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8a8880', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}
          >×</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Economic Role */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>STRATEGIC ROLE</div>
          <div style={{ fontSize: 10, color: '#c8c6c0', lineHeight: 1.5, fontFamily: "'Newsreader', serif" }}>{city.economicRole}</div>
        </div>

        {/* Infrastructure Nodes */}
        {city.infrastructureNodes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>INFRASTRUCTURE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {city.infrastructureNodes.map(node => (
                <span key={node} style={{
                  padding: '2px 6px', borderRadius: 2, fontSize: 8,
                  background: '#0f1114', border: '1px solid #2a2d32', color: '#8a8880',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {node.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* War Impacts */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            WAR IMPACTS {city.warImpacts.length > 0 ? `(${city.warImpacts.length})` : ''}
          </div>
          {city.warImpacts.length === 0 ? (
            <div style={{ fontSize: 10, color: '#8a8880' }}>No impacts recorded on this branch.</div>
          ) : (
            Object.entries(grouped).map(([category, impacts]) => (
              <div key={category} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {category}
                </div>
                {impacts.map((impact, i) => (
                  <div key={i} style={{
                    padding: '6px 8px', borderRadius: 2, marginBottom: 4,
                    background: SEVERITY_BG[impact.severity] ?? 'rgba(255,255,255,0.03)',
                    border: `1px solid ${SEVERITY_COLOR[impact.severity] ?? '#2a2d32'}44`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{
                        fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: SEVERITY_COLOR[impact.severity] ?? '#8a8880',
                      }}>
                        {impact.severity}
                      </span>
                      {impact.sourceUrl && (
                        <a
                          href={isGroundTruth ? impact.sourceUrl : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={!isGroundTruth
                            ? `Source applies to ground truth branch. This branch diverges at ${branchDivergenceDate ?? 'an earlier point'}.`
                            : undefined}
                          style={{
                            color: isGroundTruth ? '#5dade2' : '#555',
                            fontSize: 8,
                            textDecoration: 'underline',
                            cursor: isGroundTruth ? 'pointer' : 'help',
                          }}
                        >
                          {`[source${impact.sourceDate ? ` · ${impact.sourceDate}` : ''}]`}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#c8c6c0', lineHeight: 1.4 }}>{impact.description}</div>
                    {impact.estimatedValue !== undefined && (
                      <div style={{ fontSize: 9, color: '#8a8880', marginTop: 2 }}>
                        Est: {impact.estimatedValue.toLocaleString()} {impact.unit ?? ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Provenance */}
        <div style={{ padding: '8px 10px', background: '#0a0b0d', border: '1px solid #1c1f23', borderRadius: 3, fontSize: 9 }}>
          <div style={{ color: '#8a8880', marginBottom: 2 }}>
            {city.provenance.toUpperCase()}
          </div>
          {city.sourceUrl && (
            <a
              href={isGroundTruth ? city.sourceUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={!isGroundTruth
                ? `Source applies to ground truth. Branch diverges at ${branchDivergenceDate ?? 'earlier point'}.`
                : undefined}
              style={{
                color: isGroundTruth ? '#5dade2' : '#555',
                fontSize: 9,
                textDecoration: 'underline',
                cursor: isGroundTruth ? 'pointer' : 'help',
              }}
            >
              {`[source${city.sourceDate ? ` · ${city.sourceDate}` : ''}]`}
            </a>
          )}
          {city.researchedAt && (
            <div style={{ color: '#8a8880', marginTop: 2 }}>
              Last updated: {new Date(city.researchedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add cities toggle to `MapLayerControls`**

Open `components/map/MapLayerControls.tsx`. Add `cities` and `cityImpacts` to `LayerState`:

```typescript
export interface LayerState {
  // ... existing fields ...
  usAssets:       boolean
  iranAssets:     boolean
  israelAssets:   boolean
  infrastructure: boolean
  strikeRings:    boolean
  threatRings:    boolean
  // New:
  cities:         boolean
  cityImpacts:    boolean
}
```

Add to the toggles render section:

```tsx
<div style={{ borderTop: '1px solid #1a1a1a', marginTop: 4, paddingTop: 4 }}>
  <div style={{ padding: '2px 8px 4px', fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
    Cities
  </div>
  <ToggleItem label="Cities"       active={layers.cities}      onToggle={() => onToggle('cities')} />
  <ToggleItem label="War Impacts"  active={layers.cityImpacts} onToggle={() => onToggle('cityImpacts')} />
</div>
```

Update `DEFAULT_LAYERS` in `GameMap.tsx`:

```typescript
cities:         true,
cityImpacts:    true,
```

- [ ] **Step 5: Wire city markers into `MapboxMap.tsx`**

Add city marker props and rendering to `MapboxMap.tsx`:

```typescript
// Add to Props interface:
cities?: City[]
selectedCityId?: string | null
onCityClick?: (city: City) => void

// Add imports:
import type { City } from '@/lib/types/simulation'
import { createCityMarkerElement } from './CityMarker'

// Add ref:
const cityMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())

// Add useEffect after asset markers effect:
useEffect(() => {
  const map = mapRef.current
  if (!map || !cities) return

  cityMarkersRef.current.forEach(m => m.remove())
  cityMarkersRef.current.clear()

  if (!layerState.cities) return

  cities.forEach(city => {
    const el = createCityMarkerElement({
      city,
      onClick: () => onCityClick?.(city),
    })
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([city.position.lng, city.position.lat])
      .addTo(map)
    cityMarkersRef.current.set(city.id, marker)
  })
}, [cities, layerState.cities, layerState.cityImpacts, onCityClick])
```

- [ ] **Step 6: Wire cities into `GameMap.tsx`**

Add city state and fetch alongside the existing asset state:

```typescript
const [cities, setCities] = useState<City[]>([])
const [selectedCity, setSelectedCity] = useState<City | null>(null)
const [cityPopup, setCityPopup] = useState<City | null>(null)
const [cityDetailOpen, setCityDetailOpen] = useState(false)

useEffect(() => {
  const scenarioId = 'iran-2026'
  fetch(`/api/scenarios/${scenarioId}/cities`)
    .then(r => r.json())
    .then(({ data }) => { if (data) setCities(data) })
    .catch(() => {})
}, [])

function handleCityClick(city: City) {
  setCityPopup(city)
  setSelectedCity(city)
}

function handleCityExpand(city: City) {
  setCityPopup(null)
  setSelectedCity(city)
  setCityDetailOpen(true)
}
```

Add to JSX:

```tsx
<MapboxMap
  {/* existing props */}
  cities={cities}
  selectedCityId={selectedCity?.id ?? null}
  onCityClick={handleCityClick}
/>

{cityPopup && (
  <div style={{ position: 'absolute', top: '30%', left: '35%', zIndex: 50 }}>
    <CityPopup
      city={cityPopup}
      onExpand={handleCityExpand}
      onClose={() => setCityPopup(null)}
    />
  </div>
)}

<CityDetailPanel
  city={selectedCity}
  isOpen={cityDetailOpen}
  isGroundTruth={isGroundTruth}
  onClose={() => { setCityDetailOpen(false); setSelectedCity(null) }}
/>
```

- [ ] **Step 7: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add components/map/CityMarker.tsx components/map/CityPopup.tsx \
  components/map/CityDetailPanel.tsx components/map/MapLayerControls.tsx \
  components/map/MapboxMap.tsx components/map/GameMap.tsx
git commit -m "feat: add city layer — CityMarker, CityPopup, CityDetailPanel with war impacts"
```

---

## Task 16: Actor Status Dashboard

**Files:**
- Create: `components/game/ActorStatusPanel.tsx`
- Modify: `components/map/GameMap.tsx` (render ActorStatusPanel)

- [ ] **Step 1: Create `components/game/ActorStatusPanel.tsx`**

```typescript
// components/game/ActorStatusPanel.tsx
'use client'
import type { ActorStatusSnapshot } from '@/lib/types/simulation'

interface Props {
  snapshots: ActorStatusSnapshot[]                        // one per actor, current turn
  previousSnapshots?: ActorStatusSnapshot[]              // prior turn, for trend arrows
  isGroundTruth: boolean
}

const METRIC_LABELS: Record<keyof Omit<ActorStatusSnapshot, 'actorId' | 'turnDate' | 'sourceUrl' | 'notes'>, string> = {
  politicalStability:    'Political Stability',
  economicHealth:        'Economic Health',
  militaryReadiness:     'Military Readiness',
  publicSupport:         'Public Support',
  internationalIsolation: 'Int\'l Isolation',
}

function metricColor(value: number): string {
  if (value >= 70) return '#2ecc71'
  if (value >= 40) return '#f39c12'
  return '#e74c3c'
}

function trendArrow(current: number, previous?: number): string {
  if (previous === undefined) return ''
  const diff = current - previous
  if (diff > 3) return '↑'
  if (diff < -3) return '↓'
  return '→'
}

function trendColor(current: number, previous?: number): string {
  if (previous === undefined) return '#8a8880'
  const diff = current - previous
  if (diff > 3) return '#2ecc71'
  if (diff < -3) return '#e74c3c'
  return '#8a8880'
}

const ACTOR_LABELS: Record<string, string> = {
  us: 'UNITED STATES',
  iran: 'IRAN',
  israel: 'ISRAEL',
  saudi_arabia: 'SAUDI ARABIA',
}

export function ActorStatusPanel({ snapshots, previousSnapshots, isGroundTruth }: Props) {
  if (snapshots.length === 0) return null

  return (
    <div style={{
      background: 'rgba(10,11,13,0.97)',
      border: '1px solid #2a2d32',
      borderRadius: 4,
      fontFamily: "'IBM Plex Mono', monospace",
      color: '#e8e6e0',
      fontSize: 10,
      minWidth: 240,
    }}>
      <div style={{
        padding: '8px 12px 6px',
        borderBottom: '1px solid #1c1f23',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 10, fontWeight: 600,
        color: '#ffba20', textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        Actor Status
      </div>

      {snapshots.map(snap => {
        const prev = previousSnapshots?.find(p => p.actorId === snap.actorId)
        const metrics = Object.entries(METRIC_LABELS) as [keyof typeof METRIC_LABELS, string][]

        return (
          <div key={snap.actorId} style={{ padding: '8px 12px', borderBottom: '1px solid #1c1f23' }}>
            <div style={{
              fontSize: 9, color: '#8a8880',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: 6,
            }}>
              {ACTOR_LABELS[snap.actorId] ?? snap.actorId.toUpperCase()}
              {snap.sourceUrl && (
                <a
                  href={isGroundTruth ? snap.sourceUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={!isGroundTruth ? 'Source applies to ground truth branch.' : undefined}
                  style={{
                    marginLeft: 6,
                    color: isGroundTruth ? '#5dade2' : '#444',
                    fontSize: 8, textDecoration: 'underline',
                    cursor: isGroundTruth ? 'pointer' : 'help',
                  }}
                >
                  [source]
                </a>
              )}
            </div>

            {metrics.map(([key, label]) => {
              const value = snap[key] as number
              const prevValue = prev?.[key] as number | undefined
              const arrow = trendArrow(value, prevValue)
              const arrowClr = trendColor(value, prevValue)
              const barColor = metricColor(value)

              return (
                <div key={key} style={{ marginBottom: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: '#c8c6c0' }}>{label}</span>
                    <span style={{ fontSize: 9, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: barColor }}>{value}</span>
                      {arrow && <span style={{ color: arrowClr, fontSize: 10 }}>{arrow}</span>}
                    </span>
                  </div>
                  <div style={{ height: 2, background: '#1c1f23', borderRadius: 1 }}>
                    <div style={{
                      height: '100%',
                      width: `${value}%`,
                      background: barColor,
                      borderRadius: 1,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}

            {snap.notes && (
              <div style={{ marginTop: 4, fontSize: 8, color: '#8a8880', lineHeight: 1.4, fontStyle: 'italic' }}>
                {snap.notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Wire `ActorStatusPanel` into `GameMap.tsx`**

Add actor snapshot state:

```typescript
import { ActorStatusPanel } from '../game/ActorStatusPanel'

const [actorSnapshots, setActorSnapshots] = useState<ActorStatusSnapshot[]>([])
const [prevActorSnapshots, setPrevActorSnapshots] = useState<ActorStatusSnapshot[]>([])
```

For now, seed with static initial data matching the Iran scenario actor states (the resolution engine will write real snapshots into turn commits in Sprint 4):

```typescript
// Temporary static seed until resolution engine writes real snapshots
useEffect(() => {
  setActorSnapshots([
    { actorId: 'us',     turnDate: '2025-10-01', politicalStability: 72, economicHealth: 68, militaryReadiness: 90, publicSupport: 55, internationalIsolation: 25 },
    { actorId: 'iran',   turnDate: '2025-10-01', politicalStability: 48, economicHealth: 28, militaryReadiness: 65, publicSupport: 58, internationalIsolation: 82 },
    { actorId: 'israel', turnDate: '2025-10-01', politicalStability: 61, economicHealth: 58, militaryReadiness: 88, publicSupport: 72, internationalIsolation: 45 },
  ])
}, [])
```

Add panel to JSX (collapsible, bottom-left corner or sidebar):

```tsx
<div style={{ position: 'absolute', bottom: 60, left: 12, zIndex: 40 }}>
  <ActorStatusPanel
    snapshots={actorSnapshots}
    previousSnapshots={prevActorSnapshots}
    isGroundTruth={isGroundTruth}
  />
</div>
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/game/ActorStatusPanel.tsx components/map/GameMap.tsx
git commit -m "feat: add ActorStatusPanel with 5-metric gauges and trend arrows"
```

---

## Task 17: Provenance Source Links in AssetDetailPanel

**Files:**
- Modify: `components/map/AssetDetailPanel.tsx`

- [ ] **Step 1: Update provenance section in `AssetDetailPanel.tsx`**

Open `components/map/AssetDetailPanel.tsx`. The `Props` interface already has `asset: PositionedAsset`. Add `isGroundTruth` and `branchDivergenceDate` props:

```typescript
interface Props {
  asset: PositionedAsset | null
  isOpen: boolean
  isGroundTruth: boolean
  branchDivergenceDate?: string
  onClose: () => void
}
```

Replace the existing provenance section at the bottom of the panel (the `{/* Provenance */}` block) with:

```tsx
{/* Provenance */}
<div style={{ padding: '8px 10px', background: '#0a0b0d', border: '1px solid #1c1f23', borderRadius: 3, fontSize: 9 }}>
  <div style={{ color: '#8a8880', marginBottom: 2 }}>
    {PROVENANCE_LABEL[asset.provenance] ?? asset.provenance.toUpperCase()}
  </div>
  {asset.sourceUrl && (
    <a
      href={isGroundTruth ? asset.sourceUrl : undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={!isGroundTruth
        ? `Source applies to ground truth branch. This branch diverges at ${branchDivergenceDate ?? 'an earlier point'}.`
        : undefined}
      style={{
        color: isGroundTruth ? '#5dade2' : '#555',
        fontSize: 9,
        textDecoration: 'underline',
        cursor: isGroundTruth ? 'pointer' : 'help',
        display: 'block',
        marginBottom: 2,
      }}
    >
      {`[source${asset.sourceDate ? ` · ${asset.sourceDate}` : ''}]`}
    </a>
  )}
  {asset.researchedAt && (
    <div style={{ color: '#8a8880' }}>
      Last updated: {new Date(asset.researchedAt).toLocaleDateString()}
    </div>
  )}
</div>
```

Update `GameMap.tsx` to pass `isGroundTruth` to `AssetDetailPanel` and `CityDetailPanel`:

```tsx
<AssetDetailPanel
  asset={selectedAsset}
  isOpen={detailOpen}
  isGroundTruth={isGroundTruth}
  onClose={() => { setDetailOpen(false); setSelectedAsset(null) }}
/>
```

`isGroundTruth` should be a prop on `GameMap` itself, passed down from the page component (the page knows whether the branch being viewed is the trunk).

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/map/AssetDetailPanel.tsx components/map/GameMap.tsx
git commit -m "feat: add source URL hyperlinks to AssetDetailPanel with ground-truth branch awareness"
```

---

## Task 18: Final Integration Check

- [ ] **Step 1: Run all tests**

```bash
bun run test -- --run
```

Expected: All tests PASS. Fix any failures before proceeding.

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Run lint**

```bash
bun run lint
```

Fix any ESLint errors (remember: no `// comments` inside JSX, unused vars must be prefixed `_`).

- [ ] **Step 4: Run dev and do a manual smoke test**

```bash
bun run dev
```

Verify:
- [ ] `/play/trunk` — map renders with asset markers and city dots
- [ ] Clicking a US asset (CVN-72) shows popup with capabilities
- [ ] Popup "FULL DETAILS →" opens asset slide panel with `[source]` link
- [ ] Clicking Tehran city dot shows city popup; "FULL DETAILS →" opens city panel
- [ ] Layer controls show asset, ring, and city toggles
- [ ] Toggling "Iran Assets" off hides Iranian markers
- [ ] Toggling "Cities" off hides city dots
- [ ] ActorStatusPanel visible with US/Iran/Israel gauges
- [ ] ResearchUpdatePanel appears in UI and can be triggered

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: Sprint 3 asset layer complete — positioned assets, map rendering, research flow"
```

---

## Self-Review Checklist

After writing this plan, verified against spec:

- [x] `PositionedAsset` type (+ `sourceUrl`, `sourceDate`) — Task 1
- [x] `AssetStateDelta` type — Task 1
- [x] `City`, `CityImpact`, `ActorStatusSnapshot`, `CityStateDelta` types — Task 14
- [x] `asset_registry` table — Task 2
- [x] `asset_research_log` table — Task 2
- [x] `city_registry` table — Task 14
- [x] `actor_snapshots` + `city_state_deltas` columns on `turn_commits` — Task 14
- [x] `source_url` on `actors` table — Task 14
- [x] `turn_date` column — Task 2
- [x] Database types — Task 3
- [x] Asset API GET/POST — Task 4
- [x] Asset API PATCH — Task 4
- [x] City API GET/POST/PATCH — Task 14
- [x] Research trigger/approve/reject API — Task 5
- [x] Iran scenario asset seed (30 assets, all three actors) — Task 6
- [x] Iran scenario city seed (12 cities) — Task 14
- [x] Israel + US divergent motivations — Task 7
- [x] `AssetMarker` DOM factory — Task 8
- [x] `AssetPopup` compact popup — Task 9
- [x] `AssetDetailPanel` slide-over + source links — Tasks 10, 17
- [x] `CityMarker` DOM factory — Task 15
- [x] `CityPopup` compact popup — Task 15
- [x] `CityDetailPanel` slide-over with war impacts + source links — Task 15
- [x] `LayerState` extension (assets + rings + cities) — Tasks 11, 15
- [x] Range ring layers in MapboxMap — Task 12
- [x] Asset fetch + state in GameMap — Task 12
- [x] City fetch + state in GameMap — Task 15
- [x] `ActorStatusPanel` with trend arrows + source links — Task 16
- [x] `ResearchUpdatePanel` — Task 13
- [x] Actor motivation seed (Israel/US) — Task 7
- [x] Real dates on turn commits (migration) — Task 2
- [x] `isGroundTruth` prop wired through GameMap → panels — Tasks 15, 17
