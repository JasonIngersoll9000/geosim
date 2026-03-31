# Sprint 4: Asset Mechanics & Decision Prerequisites

**Date:** 2026-03-31  
**Sprint:** 4 — Game Loop + Full Asset Mechanics  
**Status:** Approved for future implementation  
**Depends on:** Sprint 3 spec (`2026-03-31-asset-layer-sprint3-design.md`)

---

## Goal

Wire the positioned asset layer (Sprint 3) into the decision engine. Assets become active participants in the game loop: they have state machines that evolve over multiple turns, decisions have explicit prerequisites that check asset availability and position, and the UI surfaces the "Step In" intervention mechanic so users can take control of any actor's response at any branch node.

---

## 1. Asset State Machine

### 1.1 States and Transitions

Every `PositionedAsset` follows this state machine:

```
available ──► mobilizing ──► transiting ──► staged ──► engaged
                                                          │
                                              ◄──────── degraded
                                                          │
                                                       destroyed
                                                          │
                                              withdrawn ◄─┘ (optional — asset pulled back)
```

**State definitions:**
- `available` — Asset exists, not yet committed to an operation. Can be mobilized.
- `mobilizing` — Orders issued. Asset is preparing: loading, crew recall, logistics assembly. Cannot be used for operations yet. **1–3 turns depending on asset type.**
- `transiting` — Asset is en route to theater. Position updates each turn along route. Can be interdicted (becomes a target). **Variable turns: carriers 2–4, ground forces 4–8, draft forces 20–52.**
- `staged` — Asset has arrived in theater. Available for decision use.
- `engaged` — Asset is actively executing an operation.
- `degraded` — Asset took damage. Capability values reduced. May still be usable at reduced effectiveness.
- `destroyed` — Asset eliminated. Removed from available decision options. Persists in registry with destroyed status for historical record.
- `withdrawn` — Asset pulled back from theater by decision. Returns to `available` in home region.

### 1.2 Transition Lead Times by Asset Type

| Asset Type | mobilizing | transiting | notes |
|------------|-----------|-----------|-------|
| Carrier Strike Group | 1 turn | 2–3 turns | already in region = 0 |
| Air Wing (from CONUS) | 1 turn | 1 turn | can fly direct |
| Ground Brigade (from CONUS) | 2 turns | 4–6 turns | airlift or sealift |
| Ground Brigade (regional staging) | 1 turn | 1–2 turns | |
| Patriot Battery (reposition) | 1 turn | 1 turn | |
| Special Operations | 1 turn | 1 turn | rapid deployment |
| Military Draft | 0 turns | 20–52 turns | subject to political constraints |
| Ballistic Missile (launch) | 0 turns | 0 turns | immediate |
| Naval fast-attack craft | 0 turns | 0 turns | already in theater |

Lead times are stored on the asset type definition, not hardcoded in the engine.

### 1.3 In-Transit Vulnerability

Assets in `transiting` state have real positions that update each turn along their route. They are valid targets for adversary decisions. If struck while transiting:
- The transit is interrupted or delayed
- Capabilities may be degraded
- Political cost applies to the attacking actor (striking assets in international waters/airspace has escalation implications)

The resolution engine checks transiting assets as potential targets each turn.

---

## 2. Decision Prerequisites

### 2.1 Type Extensions

Add to the `Decision` type in `lib/types/simulation.ts`:

```typescript
export interface AssetRequirement {
  assetId?: string;               // specific named asset required
  category?: AssetCategory;       // OR: any asset of this category
  assetType?: string;             // OR: any asset of this type
  requiredStatus: AssetStatus[];  // must be in one of these states
  requiredZone?: string;          // must be in this zone (if applicable)
  minCapability?: {               // capability threshold check
    name: string;
    minCurrent: number;
  };
}

export interface AssetTransitionEffect {
  assetId?: string;
  category?: AssetCategory;
  fromStatus: AssetStatus;
  toStatus: AssetStatus;
  turnsRequired: number;          // 0 = immediate effect
  positionUpdate?: {              // if transiting, where it's going
    targetLat: number;
    targetLng: number;
    targetZone: string;
  };
}

// Add to Decision:
export interface Decision {
  // ... existing fields ...
  requiredAssets: AssetRequirement[];       // prerequisites that must be met
  assetTransitions: AssetTransitionEffect[]; // effects on assets if this decision is taken
  leadsToAvailable?: string[];              // decision IDs that become available after this
}
```

### 2.2 Prerequisite Examples

**"Conduct ground invasion of southern Iran"**
```typescript
requiredAssets: [
  { category: "ground", requiredStatus: ["staged", "engaged"], requiredZone: "kuwait", minCapability: { name: "personnel", minCurrent: 50000 } }
]
```

**"Long-range strike on Fordow" (requires tanker support)**
```typescript
requiredAssets: [
  { category: "air", assetType: "air_base", requiredStatus: ["staged", "available"], requiredZone: "qatar" },
  { category: "air", assetType: "air_refueling", requiredStatus: ["available", "staged"] }
]
```

**"Open Strait of Hormuz by force"**
```typescript
requiredAssets: [
  { category: "naval", assetType: "carrier", requiredStatus: ["staged", "engaged"] },
  { category: "naval", assetType: "destroyer", requiredStatus: ["staged", "engaged"] }
]
```

**"Begin mobilization of 82nd Airborne"** (no prerequisites — starts the chain)
```typescript
requiredAssets: []
assetTransitions: [
  { assetId: "82nd-airborne", fromStatus: "available", toStatus: "mobilizing", turnsRequired: 2 }
]
leadsToAvailable: ["transport-82nd-to-kuwait"]
```

### 2.3 Prerequisite Checking in the Actor Agent

The actor agent's decision catalog generation is filtered by available assets:

1. All decisions for the actor are considered
2. `requiredAssets` are checked against current asset states
3. Decisions with unmet prerequisites are either:
   - **Excluded** if the asset doesn't exist in the scenario at all
   - **Marked unavailable** with reason if the asset exists but is in wrong state/zone (shown grayed out with "requires X in theater")
   - **Available** if all prerequisites are met

The AI agent prompt includes the current asset states so it can reason about what's executable vs what requires preparatory steps.

### 2.4 Latent Decisions from the Asset Registry

When the asset registry gains a new asset (via research update), the decision catalog is automatically re-evaluated. New decisions may surface that reference the new asset. Example: 82nd Airborne added to registry at turn 10 → "Begin mobilization of 82nd Airborne" appears as an available decision at any branch point (regardless of when the asset was officially deployed in ground truth).

---

## 3. Response Nodes and Branching

### 3.1 Node Types

Two types of nodes in the branch tree:

**Action Node** — A consequential decision was made. Branch point: "what if a different decision had been made?"

**Response Node** — A consequential action occurred and a response is pending. Branch point: "what if the response was different?"

Both node types appear in the branch tree. Response nodes are created automatically by the resolution engine when it identifies that an action has triggered a significant reaction from another actor.

### 3.2 Significance Scoring

The resolution engine scores each event (0–100) for "branch worthiness":

```typescript
export interface BranchWorthiness {
  score: number;               // 0–100
  reason: string;              // e.g. "first strike on civilian infrastructure"
  suggestedBranchLabel: string; // e.g. "Iran's Response to Fordow Strike"
  alternateResponses?: CachedResponse[]; // pre-generated by resolution engine
}
```

Threshold for creating a response node: score ≥ 60.

Factors that increase score:
- First use of a new escalation level
- Civilian infrastructure targeted
- Nuclear facility targeted or threatened
- Key figure killed
- Alliance relationship strained or broken
- Regime survival threatened
- Strait of Hormuz affected

### 3.3 Cached Alternate Responses

When the resolution engine processes an action that creates a response node, it pre-generates 2–3 plausible alternate responses from the responding actor. These are stored in the turn commit and are immediately available if the user wants to fork from that node — no re-generation needed.

```typescript
export interface CachedResponse {
  actorId: string;
  decision: Decision;
  rationale: string;            // why this response is plausible
  escalationDirection: "up" | "down" | "lateral" | "none";
  cachedAt: string;             // ISO timestamp
}
```

The ground truth response (the one that actually happened) is committed normally. The alternates are attached to the response node for branch creation.

---

## 4. "Step In" Intervention Mechanic

### 4.1 The Popup

After the user submits a decision (or after an AI actor submits a decision), before the resolution engine commits the response:

```
┌─────────────────────────────────────────────────┐
│  RESPONSE REQUIRED                              │
│                                                 │
│  Iran — Reacting to: US Strike on Fordow        │
│                                                 │
│  AI Assessment: Iran has decided to —           │
│  "Activate Strait of Hormuz mining operation"  │
│  [Confidence: HIGH | Escalation: UP]            │
│                                                 │
│  [Proceed with AI Decision]  [Step In as Iran]  │
└─────────────────────────────────────────────────┘
```

"Step In as Iran" opens the full actor decision panel for Iran in the current context. The user sees:
- Iran's intelligence picture (fog-of-war filtered)
- Iran's objectives and current escalation rung
- Available decisions (including the AI's choice, shown first)
- Full decision detail for each option

The user selects a decision, which is committed as Iran's response for this branch. The AI's original choice becomes a cached alternate response on the response node.

### 4.2 Trigger Conditions

The intervention popup fires when:
- `branchWorthiness.score >= 60` on the response
- The user is not playing as the responding actor
- Game mode is not `observer_only` (in pure observer mode, all decisions are AI-driven, no popups)

### 4.3 "Proceed" path

If the user clicks Proceed, the AI's decision is committed. The branch remains on the main path. The cached alternates are stored silently.

### 4.4 Multi-Actor Control

At session start (or from the game settings panel), the user selects which actors they control:
- Controlled actors: user makes all decisions
- Uncontrolled actors: AI-driven, but "Step In" popup fires on significant responses

A user can control US + Israel simultaneously, modeling the ally-friction dynamic themselves.

---

## 5. Branch Tree UX Changes

### 5.1 Node Display

Each node in the branch tree shows:
- Date (not turn number)
- Node type badge: [ACTION] or [RESPONSE]
- Summary: "US strikes Fordow enrichment facility"
- Actor icon(s) involved
- Escalation direction indicator (↑ ↓ →)
- Branch count: "3 branches from here"

### 5.2 "Explore Branch" from Response Node

Clicking a response node in the branch tree shows:
- What actually happened (ground truth or current branch path)
- Cached alternate responses (0–3, pre-generated)
- "Start new branch with [alternate]" button — immediately forks without re-generating

### 5.3 "Load as [Actor]" from Any Node

From any node in the branch tree, the user can click "Load as [Actor]" to:
- Set that actor as the controlled actor
- Jump to that point in the timeline
- See that actor's intelligence picture as of that date
- Make decisions from that actor's perspective going forward

---

## 6. Research Pipeline: Full Catch-Up

### 6.1 Gap Reconstruction

When triggered after a gap > 7 days, the research pipeline:

1. Queries for all significant events between `last_researched_at` and now
2. AI returns a chronological list of events with dates and significance scores
3. Events scoring ≥ 60 become proposed turn commits (with dates, actor decisions, outcomes)
4. Events scoring < 60 become asset/state enrichments on the nearest turn commit
5. All proposed commits are shown in the approval UI in sequence

### 6.2 Approval UI: Sequential Review

Approval UI for catch-up runs shows commits in chronological order:
- "Turn: October 14, 2025 — Iranian ballistic missile salvo on Israeli air bases"
- [Approve] [Reject] [Edit]
- "Turn: October 22, 2025 — US deploys additional Patriot batteries to Israel"
- [Approve] [Reject] [Edit]

User can approve all at once or review individually.

### 6.3 Non-Turn Enrichments

Research runs that find no new turns still produce:
- Asset capability updates (refined counts, depletion estimates)
- New asset discoveries (added to registry)
- Intelligence picture updates (actor beliefs about adversaries)
- Actor state updates (political stability, economic conditions)
- Provenance upgrades (inferred → researched)

These are shown as a separate "Enrichment" section in the approval UI, distinct from new turn commits.

---

## 7. Automated Research (Future)

When the user is ready to automate (beyond manual triggers):

- Cron job: daily lightweight scan (quick AI call, ~$0.10 per run)
- If events found: write to `asset_research_log` with `status: "awaiting_approval"`, send notification
- User reviews in their own time
- Weekly deep research: full 7-stage pipeline (~$2–5 per run)
- Feature flag: `RESEARCH_AUTO_ENABLED` — defaults off, user opts in

---

## 8. Implementation Tasks (for writing-plans)

1. Extend `Decision` type with `requiredAssets`, `assetTransitions`, `leadsToAvailable`
2. Add `CachedResponse` and `BranchWorthiness` types
3. Add `turn_date` to branch tree nodes display (UI)
4. Asset state machine: transition logic in `lib/game/asset-state-machine.ts`
5. In-transit position update logic (per-turn asset position interpolation)
6. Prerequisite checker: `lib/game/decision-prerequisites.ts`
7. Decision catalog generator updated to filter/annotate by prerequisites
8. Actor agent context builder updated to include current asset states
9. Resolution engine: `BranchWorthiness` scoring
10. Resolution engine: cached alternate response generation (2–3 per significant event)
11. Response node creation in turn commit
12. "Step In" popup component: `components/game/StepInPopup.tsx`
13. Multi-actor control selection UI (session start / game settings)
14. Branch tree node display: dates, node type badges, escalation direction
15. "Explore Branch" panel: show cached alternates, fork button
16. "Load as [Actor]" from branch tree node
17. Approval UI: sequential catch-up review
18. Non-turn enrichment section in approval UI
19. Automated research cron infrastructure (feature-flagged, off by default)

---

## 9. Actor Motivation: Enforcement

Beyond data — the actor agent prompt must explicitly receive each actor's `winCondition`, `loseCondition`, and a note that allied actors may have conflicting objectives. The resolution engine must model cross-actor friction, including:

- Israel taking actions against explicit US diplomatic requests
- US distancing itself publicly from Israeli strikes
- Intelligence sharing being withheld between nominal allies
- One ally's decision invalidating another ally's ongoing operation

The NEUTRALITY_PREAMBLE is injected into all agent calls. Actor agents are explicitly told: "Your ally [X] has different win conditions than you. Their actions may conflict with yours. Model your own rational self-interest, not a shared agenda."

---

## Dependencies

- Sprint 3 spec fully implemented (asset_registry, AssetMarker, seeded data)
- Issue #32 (Actor agent) — asset states fed into actor agent context
- Issue #33 (Resolution engine) — adds BranchWorthiness scoring + cached responses
- Issue #36 (Game loop controller) — orchestrates asset state transitions per turn
- Issue #38 (Branch creation) — UI shell exists, this spec completes the backend
