# Sprint 3: Positioned Asset Layer

**Date:** 2026-03-31  
**Sprint:** 3 — Real Data + AI Pipeline  
**Status:** Approved for implementation

---

## Goal

Add a positioned military asset layer to GeoSim. Every actor's military assets gain real-world coordinates, a persistent identity in the database, and a clickable map presence. The ground truth branch reflects the best available open-source intelligence on asset positions for the Iran scenario. This is the data foundation that Sprint 4 builds the decision prerequisite system on top of.

---

## What This Sprint Does NOT Include

- Asset state machine (mobilizing → transiting → staged) — Sprint 4
- Decision prerequisites linked to asset positions — Sprint 4
- "Step In" intervention popup — Sprint 4
- Multi-turn asset transitions — Sprint 4
- Automated research cron jobs — Sprint 4

---

## 1. Data Model

### 1.1 New Type: `PositionedAsset`

Add to `lib/types/simulation.ts`:

```typescript
export type AssetCategory =
  | "naval"
  | "air"
  | "ground"
  | "missile"
  | "nuclear"
  | "infrastructure"
  | "cyber"
  | "air_defense";

export type AssetStatus =
  | "available"       // ready, in home position
  | "mobilizing"      // orders issued, preparing to move
  | "transiting"      // en route to theater
  | "staged"          // in theater, not yet engaged
  | "engaged"         // actively participating in operations
  | "degraded"        // damaged, reduced capability
  | "destroyed"       // eliminated, no longer functional
  | "withdrawn";      // pulled back from theater

export interface AssetCapability {
  name: string;              // e.g. "SM-6 (AAW)", "Strike Aircraft", "Tomahawk TLAM"
  current: number;
  max: number;
  unit: string;              // "missiles", "aircraft", "battalions", etc.
}

export interface PositionedAsset {
  id: string;                // persistent identity, e.g. "cvn-72", "al-udeid-ab"
  scenarioId: string;
  actorId: string;           // owner actor id
  name: string;              // e.g. "USS Abraham Lincoln (CVN-72)"
  shortName: string;         // e.g. "CVN-72" — used on map label
  category: AssetCategory;
  assetType: string;         // "carrier" | "air_base" | "missile_site" | "refinery" etc.
  description: string;       // capabilities narrative, displayed in detail panel

  // Position
  position: { lat: number; lng: number };
  zone: string;              // named theater: "persian_gulf" | "arabian_sea" | "red_sea" | "eastern_mediterranean" | "central_iran" | "strait_of_hormuz"

  // Current state
  status: AssetStatus;
  capabilities: AssetCapability[];

  // Range (for map rings)
  strikeRangeNm?: number;    // how far this asset can strike
  threatRangeNm?: number;    // how far adversary weapons can reach it (threat exposure)

  // Registry metadata
  provenance: VerificationStatus;  // "verified" | "researched" | "inferred"
  effectiveFrom: string;     // ISO date — when this asset entered the scenario
  discoveredAt: string;      // ISO date — when our engine captured it
  researchedAt?: string;     // ISO date — last research pipeline update
  notes: string;
}
```

### 1.2 Asset State Delta (embedded in turn commits)

When a turn resolves and assets change state, the change is recorded as a delta in the turn commit's JSON payload. The registry row itself is NOT mutated after initial seed — history is reconstructed by replaying deltas.

```typescript
export interface AssetStateDelta {
  assetId: string;
  field: "status" | "capabilities" | "position" | "zone";
  previousValue: unknown;
  newValue: unknown;
  cause: string;             // e.g. "Shahab-3 strike", "carrier group reposition order"
  turnDate: string;          // ISO date of the turn this occurred
}
```

Add `assetDeltas: AssetStateDelta[]` to the `TurnResolution` type.

---

## 2. Database

### 2.1 New Table: `asset_registry`

```sql
CREATE TABLE asset_registry (
  id TEXT PRIMARY KEY,                        -- e.g. "cvn-72"
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_registry_scenario ON asset_registry(scenario_id);
CREATE INDEX idx_asset_registry_actor ON asset_registry(actor_id);
CREATE INDEX idx_asset_registry_zone ON asset_registry(zone);

-- RLS: assets readable by anyone with scenario access
ALTER TABLE asset_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_registry_select" ON asset_registry
  FOR SELECT USING (true);
CREATE POLICY "asset_registry_insert" ON asset_registry
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "asset_registry_update" ON asset_registry
  FOR UPDATE USING (auth.role() = 'authenticated');
```

Add `asset_registry` to `lib/types/database.ts` with Row/Insert/Update types.

### 2.2 Research Update Log Table

```sql
CREATE TABLE asset_research_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES profiles(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | awaiting_approval | approved | rejected
  summary TEXT,                            -- AI-generated summary of what changed
  proposed_changes JSONB,                  -- array of proposed asset upserts
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id)
);
```

---

## 3. Iran Scenario Seed Data

Extends the existing seed script (issue #27). All assets marked with appropriate `provenance`. Mobile assets marked `provenance: "researched"` with `researched_at` set to the research date. Fixed infrastructure marked `provenance: "verified"`.

**Data is accurate as of August 2025 (knowledge cutoff). Research pipeline (issue #31) must be run to update to March 2026 before ground truth use.**

### US Assets

| id | name | type | position | zone | provenance |
|----|------|------|----------|------|------------|
| cvn-72 | USS Abraham Lincoln (CVN-72) | carrier | ~23.5°N, 59.5°E | arabian_sea | researched |
| cvn-75 | USS Harry S. Truman (CVN-75) | carrier | ~33°N, 33°E | eastern_mediterranean | researched |
| al-udeid-ab | Al Udeid Air Base | air_base | 25.117°N, 51.315°E | qatar | verified |
| ali-al-salem-ab | Ali Al Salem Air Base | air_base | 29.347°N, 47.520°E | kuwait | verified |
| al-dhafra-ab | Al Dhafra Air Base | air_base | 24.248°N, 54.548°E | uae | verified |
| 5th-fleet-hq | 5th Fleet HQ Bahrain | headquarters | 26.217°N, 50.610°E | bahrain | verified |
| thaad-israel | THAAD Battery (Israel-deployed) | air_defense | 31.5°N, 34.8°E | israel | researched |
| patriot-qatar | Patriot Battery — Qatar | air_defense | 25.2°N, 51.5°E | qatar | researched |
| patriot-kuwait | Patriot Battery — Kuwait | air_defense | 29.4°N, 47.6°E | kuwait | researched |
| patriot-uae | Patriot Battery — UAE | air_defense | 24.4°N, 54.4°E | uae | researched |
| patriot-saudi | Patriot Battery — Saudi Arabia | air_defense | 24.7°N, 46.7°E | saudi_arabia | researched |
| kc135-udeid | KC-135/KC-46 Tanker Wing (Al Udeid) | air_refueling | 25.117°N, 51.315°E | qatar | researched |

**Capabilities to seed (examples):**
- CVN-72: Strike Aircraft 48/48, Tomahawk TLAM 90/90, SM-6 (AAW) 80/80, F/A-18 sorties/day 120/120
- Al Udeid: F-35A 24/24, B-52H 6/6, KC-135 12/12, personnel 10000/10000
- THAAD: Interceptors 48/48

### Israeli Assets

| id | name | type | position | zone | provenance |
|----|------|------|----------|------|------------|
| nevatim-ab | Nevatim Air Base | air_base | 31.208°N, 35.012°E | israel | verified |
| hatzerim-ab | Hatzerim Air Base | air_base | 31.233°N, 34.667°E | israel | verified |
| iron-dome-south | Iron Dome Batteries (South) | air_defense | 31.5°N, 34.5°E | israel | researched |
| iron-dome-north | Iron Dome Batteries (North) | air_defense | 32.8°N, 35.2°E | israel | researched |
| arrow-3-battery | Arrow-3 Battery | air_defense | 32.1°N, 34.9°E | israel | researched |
| dimona | Negev Nuclear Research Center | nuclear | 30.867°N, 35.150°E | israel | verified |

**Capabilities:**
- Nevatim: F-35I Adir 50/50 (used in Oct 2024 strikes), F-16I 30/30
- Iron Dome South: Interceptors 60/80 (partially depleted from Apr/Oct 2024 barrages)
- Arrow-3: Interceptors 36/36

### Iranian Assets

| id | name | type | position | zone | provenance |
|----|------|------|----------|------|------------|
| fordow | Fordow Enrichment Facility | nuclear | 34.884°N, 50.995°E | central_iran | verified |
| natanz | Natanz Enrichment Facility | nuclear | 33.723°N, 51.727°E | central_iran | verified |
| arak-ir40 | Arak IR-40 Reactor | nuclear | 34.190°N, 49.231°E | central_iran | verified |
| bandar-abbas-naval | Bandar Abbas Naval Base | naval_base | 27.167°N, 56.283°E | strait_of_hormuz | verified |
| chabahar-naval | Chabahar Naval Base | naval_base | 25.291°N, 60.641°E | gulf_of_oman | verified |
| kharg-island | Kharg Island Oil Terminal | infrastructure | 29.233°N, 50.317°E | persian_gulf | verified |
| abadan-refinery | Abadan Refinery Complex | infrastructure | 30.340°N, 48.304°E | southwest_iran | verified |
| bandar-imam-refinery | Bandar Imam Khomeini Refinery | infrastructure | 30.447°N, 49.125°E | southwest_iran | verified |
| shahab-site-west | Shahab / Kheibar Shekan Launch Site (West) | missile_site | 34.5°N, 47.0°E | western_iran | researched |
| shahab-site-central | Shahab / Kheibar Shekan Launch Site (Central) | missile_site | 35.0°N, 51.5°E | central_iran | researched |
| irgc-radar-south | IRGC Air Defense Radar (South) | radar | 27.5°N, 56.0°E | southern_iran | researched |
| isfahan-air | Isfahan Air Defense Complex | air_defense | 32.627°N, 51.695°E | central_iran | verified |

### Generic Force Pools (zone-positioned, not individually named)

| id | name | category | zone | quantity |
|----|------|----------|------|----------|
| iran-shahed-pool | Shahed-136 Drone Stockpile | missile | central_iran | ~2000 remaining (estimated) |
| iran-irgc-naval | IRGC Fast-Attack Craft | naval | strait_of_hormuz | ~100 vessels |
| us-ground-staging | US Ground Forces (Kuwait/Qatar staging) | ground | kuwait | ~20,000 personnel |
| iran-ground-irgc | IRGC Ground Forces | ground | western_iran | ~150,000 personnel |

---

## 4. Research Pipeline Integration

### 4.1 Manual Trigger + Approval Flow

New API route: `POST /api/assets/research`

Flow:
1. User clicks "Update Ground Truth" in the UI
2. API triggers a targeted research call (Claude with web search) asking: "What significant military events, deployments, or asset changes have occurred in the Iran conflict since [last_researched_at]?"
3. AI returns proposed changes: new assets to add, status updates, capability changes, new turn commits if significant events are found
4. Changes are written to `asset_research_log` with `status: "awaiting_approval"`
5. UI shows a diff view: "Research found X changes. Review and approve."
6. User approves → changes applied to `asset_registry`, new turn commits written if applicable
7. User rejects → log entry marked `rejected`, nothing applied

### 4.2 Non-Turn Research Updates

If the research run finds no consequential decision points (no new turn warranted), the data is still used to:
- Update `capabilities` on existing assets (refined counts, depletion estimates)
- Correct `position` coordinates
- Add newly discovered assets
- Update `provenance` from `inferred` to `researched`
- Fill in `description` and `notes` fields

These updates are still subject to the approval flow but are marked as "enrichment only" (no new turn commit).

### 4.3 Catch-Up for Missed Updates

If `last_researched_at` is more than 7 days ago, the research prompt asks for a chronological reconstruction: "List all significant military events between [date A] and [date B] in chronological order." The AI returns multiple proposed turn commits with dates, and the approval UI shows them in sequence. User can approve all, approve selectively, or reject.

---

## 5. Frontend

### 5.1 New Components

**`components/map/AssetMarker.tsx`**
- Renders a Mapbox marker for a `PositionedAsset`
- Color-coded by actor: US blue (#2980b9), Iran red (#c0392b), Israel green (#27ae60), Infrastructure orange (#e67e22)
- Icon varies by `assetCategory` (ship, plane, base, missile, nuclear, oil, radar symbols)
- `status` drives visual state: active = solid border, degraded = dimmed + pulsing orange ring, destroyed = greyed + X overlay, transiting = dashed border
- Click → triggers popup

**`components/map/AssetPopup.tsx`**
- Compact popup (220px) anchored above marker
- Shows: name, actor badge, status badge, top 3 capability rows (current/max with color coding), "Expand →" button
- On expand: fires `onExpand(asset)` callback which opens `AssetDetailPanel`
- On map click elsewhere: closes

**`components/map/AssetDetailPanel.tsx`**
- Full slide-over panel (uses existing `SlideOverPanel` component)
- Sections: identity (name, actor, type, zone), status badge + state machine progress bar, full capabilities table, range info, provenance + research date, notes
- Sprint 4 addition: "Available Decisions" section using this asset

**Range rings** — rendered as Mapbox `circle` layers when an asset is selected:
- Blue dashed circle: `strikeRangeNm` converted to meters, actor's color at 30% opacity
- Red dashed circle: `threatRangeNm` — shows how exposed the asset is

### 5.2 `MapLayerControls.tsx` additions

New toggles:
- US Assets (on by default)
- Iranian Assets (on by default)
- Israeli Assets (on by default)
- Infrastructure (on by default)
- Strike Range Rings (off by default)
- Threat Range Rings (off by default)

### 5.3 `GameMap.tsx` / `MapboxMap.tsx` changes

- Add `assets: PositionedAsset[]` prop
- Render `<AssetMarker>` for each asset, filtered by layer control toggles
- Manage selected asset state; pass to `AssetPopup` and `AssetDetailPanel`
- Add range ring layers to Mapbox style when asset is selected

### 5.4 Research Update UI

New panel in the scenario admin / game view: "Ground Truth Research"
- Shows `last_researched_at` date
- "Run Research Update" button → triggers `POST /api/assets/research`
- If `status: "awaiting_approval"`, shows diff view with proposed changes
- Approve / Reject buttons

---

## 6. API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/scenarios/[id]/assets` | Fetch all assets for a scenario |
| POST | `/api/scenarios/[id]/assets` | Add a new asset (admin) |
| PATCH | `/api/scenarios/[id]/assets/[assetId]` | Update asset (admin) |
| POST | `/api/assets/research` | Trigger research update |
| GET | `/api/assets/research/[logId]` | Get research log entry + proposed changes |
| POST | `/api/assets/research/[logId]/approve` | Approve and apply proposed changes |
| POST | `/api/assets/research/[logId]/reject` | Reject proposed changes |

---

## 7. Turn Model: Real Dates

Replace abstract turn number references in the UI with dates.

- `turn_commits.turn_date` (new column, `DATE` type) alongside existing `turn_number`
- Display as: "October 26, 2025" not "Turn 14"
- Branch tree nodes labeled with dates
- Research log entries show date ranges

Migration: add `turn_date DATE` column to `turn_commits`. Backfill with estimated dates from the Iran scenario seed (scenario start date + turn_number * 7 days as a provisional estimate). The research pipeline (issue #31) will overwrite these with actual event dates once the ground truth is populated.

---

## 8. Actor Motivation: Implementation Notes

**This is the highest-priority correctness requirement.** Every actor agent operates exclusively from its own objectives and win/lose conditions. "Ally" is a relationship type, not a coordination guarantee.

For the Iran scenario seed, the following must be captured in actor data:

**Israel:**
- `winCondition`: Iran permanently unable to reconstitute as regional power. US military presence in Middle East sustained long-term. Iranian nuclear program eliminated. Proxy network degraded.
- `loseCondition`: US-Iran diplomatic deal leaving Iranian state intact. US regional withdrawal. Iran achieves nuclear deterrent capability.
- Key `decisionFactors`: Regional hegemony is the primary driver. Actions that keep the US engaged — including those that undermine US diplomatic channels — are strategically rational from Israel's perspective.

**United States:**
- `winCondition`: Iranian nuclear program eliminated. Regional oil flows protected. No wider war. Domestic political sustainability.
- `loseCondition`: Regional quagmire. Oil shock. Conflict expansion drawing in China/Russia. Significant US casualties. Political backlash.
- Key `decisionFactors`: May prefer negotiated off-ramps that Israel would actively work to prevent.

The resolution engine must model cross-ally friction: Israel taking actions against US diplomatic preferences is not an edge case — it is the expected behavior.

---

## 9. City Layer

### 9.1 New Types

Add to `lib/types/simulation.ts`:

```typescript
export interface CityImpact {
  category: 'displacement' | 'infrastructure' | 'casualties' | 'economic' | 'political'
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic'
  description: string
  estimatedValue?: number   // e.g., 50000 displaced, 2000000000 USD damage
  unit?: string             // e.g., "people", "USD"
  sourceUrl?: string
  sourceDate?: string
}

export interface City {
  id: string
  scenarioId: string
  name: string
  country: string
  population: number
  economicRole: string        // e.g., "oil refining hub", "political capital", "strait gateway"
  position: { lat: number; lng: number }
  zone: string
  infrastructureNodes: string[] // e.g., ["oil_terminal", "air_base", "port", "nuclear_facility"]
  warImpacts: CityImpact[]
  provenance: ProvenanceLevel
  sourceUrl?: string
  sourceDate?: string
  researchedAt?: string
}
```

### 9.2 Database Table: `city_registry`

Add to the Sprint 3 migration:

```sql
CREATE TABLE city_registry (
  id            text NOT NULL,
  scenario_id   uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name          text NOT NULL,
  country       text NOT NULL,
  population    integer,
  economic_role text,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  zone          text NOT NULL,
  infrastructure_nodes jsonb NOT NULL DEFAULT '[]',
  war_impacts   jsonb NOT NULL DEFAULT '[]',
  provenance    text NOT NULL DEFAULT 'inferred',
  source_url    text,
  source_date   date,
  researched_at timestamptz,
  PRIMARY KEY (id, scenario_id)
);
ALTER TABLE city_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city_registry_select" ON city_registry FOR SELECT USING (true);
```

### 9.3 Iran Scenario City Seed

| id | name | country | population | economicRole | zone |
|----|------|---------|-----------|-------------|------|
| tehran | Tehran | Iran | 9400000 | Political capital, industrial hub | central_iran |
| isfahan | Isfahan | Iran | 2200000 | Industrial, nuclear adjacency | central_iran |
| bandar-abbas-city | Bandar Abbas | Iran | 600000 | Strait gateway, port | strait_of_hormuz |
| baghdad | Baghdad | Iraq | 8100000 | Political capital, oil pipeline hub | iraq |
| basra | Basra | Iraq | 1800000 | Oil export terminal, southern Iraq | southern_iraq |
| erbil | Erbil | Iraq | 1500000 | Kurdish capital, US base proximity | northern_iraq |
| riyadh | Riyadh | Saudi Arabia | 7700000 | Political capital, oil hub | saudi_arabia |
| tel-aviv | Tel Aviv | Israel | 4300000 | Economic center, main population zone | israel |
| jerusalem | Jerusalem | Israel | 950000 | Political capital, symbolic | israel |
| kuwait-city | Kuwait City | Kuwait | 3000000 | Political capital, US staging area | kuwait |
| dubai | Dubai | UAE | 3500000 | Financial hub, regional logistics | uae |
| doha | Doha | Qatar | 2400000 | Political capital, US air base host | qatar |

### 9.4 Components

**`components/map/CityMarker.tsx`**
- Small circular marker (8px), white fill with grey border
- On hover: expands to show city name label
- Click → triggers `CityPopup`
- Distinct from asset markers: no category icon, no actor color

**`components/map/CityPopup.tsx`**
- Compact (200px): name, country, population formatted, economic role
- If `warImpacts.length > 0`: shows impact count badge in red ("3 impacts")
- "View Details →" button → opens `CityDetailPanel`

**`components/map/CityDetailPanel.tsx`**
- Slide-over (same pattern as `AssetDetailPanel`)
- Sections: identity (name, country, pop, economic role, zone), infrastructure nodes list, war impacts list grouped by category + severity (with `[source]` links), provenance

### 9.5 Layer Control Addition

Add toggle to `MapLayerControls`: **Cities** (on by default) and **City War Impacts** (on by default, colors impact severity on marker).

---

## 10. Actor Status Dashboard

### 10.1 Actor State Extension

The existing `actors` table already has `political_stability`, `economic_health`, `military_readiness` (0–100 integers). Add `source_url` to the actors table via migration. Extend the simulation type:

```typescript
export interface ActorStatusSnapshot {
  actorId: string
  turnDate: string              // ISO date when this was current
  politicalStability: number    // 0–100
  economicHealth: number        // 0–100
  militaryReadiness: number     // 0–100
  publicSupport: number         // 0–100 (domestic support for current policy)
  internationalIsolation: number // 0–100 (higher = more isolated)
  sourceUrl?: string
  notes?: string
}
```

The resolution engine writes an `ActorStatusSnapshot` into `turn_commits` JSON for each actor affected by that turn's events. The research pipeline updates the actor row in Supabase directly (same approval flow as assets).

### 10.2 Component: `ActorStatusPanel`

**`components/game/ActorStatusPanel.tsx`**
- Compact card per actor: 5 metric gauges with trend arrow (↑ ↓ → vs previous turn snapshot)
- Metric colors: ≥ 70 green, 40–69 amber, < 40 red
- Trend arrows derived by comparing current snapshot to prior turn's snapshot
- Clicking a metric row shows a tooltip with the `notes` field and `[source]` link
- Panel scrollable if > 3 actors

Display placement: collapsible sidebar section in the game view, labeled "ACTOR STATUS". Available for all actors simultaneously — user can see all actors' health in one panel.

### 10.3 Update Frequency

- Research pipeline: updates actor row in `actors` table after approval
- Resolution engine: writes per-actor snapshot to `turn_commits.actor_snapshots JSONB` on every turn commit
- UI reads from the latest turn commit's snapshots for trend comparison

---

## 11. Provenance & Source URLs

### 11.1 Field Additions

Every researched entity gains:

```typescript
sourceUrl?: string    // direct URL to source (news article, OSINT, official release)
sourceDate?: string   // ISO date of source publication
```

Fields added to: `PositionedAsset`, `City`, `CityImpact`, `ActorStatusSnapshot`. For `TurnCommit`, add `sourceUrls: string[]` (a turn may cite multiple sources).

These fields are already included in the `City` and `CityImpact` type definitions above. Add them to `PositionedAsset` in Task 1.

### 11.2 Display Rules

In all detail panels (`AssetDetailPanel`, `CityDetailPanel`), the provenance section renders:

```tsx
{entity.sourceUrl && (
  <a
    href={isGroundTruth ? entity.sourceUrl : undefined}
    target="_blank"
    rel="noopener noreferrer"
    title={!isGroundTruth ? `Source applies to ground truth branch. This branch diverges at ${branchDivergenceDate}.` : undefined}
    style={{
      color: isGroundTruth ? '#5dade2' : '#555',
      fontSize: 9,
      textDecoration: 'underline',
      cursor: isGroundTruth ? 'pointer' : 'help',
    }}
  >
    [source{entity.sourceDate ? ` · ${entity.sourceDate}` : ''}]
  </a>
)}
```

`isGroundTruth` is `true` when the current branch is the trunk branch. Pass as a prop from `GameMap`.

### 11.3 Research Pipeline: Source Extraction

The research AI prompt must explicitly request sources:
> "For every claim, return a `sourceUrl` pointing to an open-source reference (news article, government release, OSINT report, satellite imagery report). If no direct URL is available, omit the field rather than fabricating one."

The `ProposedAssetChange` type gains `sourceUrl?: string` and `sourceDate?: string`.

---

## 12. Implementation Tasks (for writing-plans)

1. Add `PositionedAsset` (+ `sourceUrl`, `sourceDate`), `AssetCapability`, `AssetStatus`, `AssetCategory`, `AssetStateDelta` types to `lib/types/simulation.ts`
2. Add `City`, `CityImpact`, `ActorStatusSnapshot` types to `lib/types/simulation.ts`
3. Add `asset_registry`, `asset_research_log`, `city_registry` tables to Supabase migration; add `source_url` to `actors`; add `turn_date` + `actor_snapshots` to `turn_commits`
4. Add database types to `lib/types/database.ts`
5. Write Iran scenario asset seed data (extend issue #27 seed script)
6. Write Iran scenario city seed data (12 cities)
7. API routes: `GET/POST /api/scenarios/[id]/assets`, `PATCH /api/scenarios/[id]/assets/[assetId]`
8. API routes: `GET/POST /api/scenarios/[id]/cities`, `PATCH /api/scenarios/[id]/cities/[cityId]`
9. API routes: research trigger, log fetch, approve, reject
10. `AssetMarker.tsx` component
11. `AssetPopup.tsx` component
12. `AssetDetailPanel.tsx` component (with `[source]` link)
13. `CityMarker.tsx` component
14. `CityPopup.tsx` component
15. `CityDetailPanel.tsx` component (with war impacts + `[source]` links)
16. Range ring layers in `MapboxMap.tsx`
17. `GameMap.tsx` — wire assets + cities prop, layer toggles, selected state, `isGroundTruth` prop
18. `MapLayerControls.tsx` — add asset, ring, cities, city impact toggles
19. `ActorStatusPanel.tsx` — 5-metric gauges with trend arrows + source links
20. Research Update UI panel
21. Update actor seed data: Israel and US win/lose conditions and decision factors

---

## Dependencies

- Issue #27 (Iran scenario Supabase seed) — this spec extends it; implement together
- Issue #28 (Replace mock data) — asset API feeds the map; implement after #27
- Issue #31 (Research pipeline) — the research approval flow calls into the existing pipeline

---

## Out of Scope

See Sprint 4 spec: `2026-03-31-asset-mechanics-sprint4-design.md`
