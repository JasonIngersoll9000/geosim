# Asset Mechanics Sprint 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire positioned assets (Sprint 3) into the decision engine — state machines, decision prerequisites, cached alternate responses, "Step In" intervention popup, branch tree date labels, and catch-up research.

**Architecture:** Asset state transitions are managed by `lib/game/asset-state-machine.ts`. Decision prerequisites are checked by `lib/game/decision-prerequisites.ts`. The resolution engine pre-generates cached alternate responses (2–3 per significant event). The "Step In" popup intercepts AI actor responses before they commit, offering the user control. Branch tree nodes show real dates and action/response type badges.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase, Mapbox GL JS, Vitest (node env), `bun` for all execution.

**Spec:** `docs/superpowers/specs/2026-03-31-asset-mechanics-sprint4-design.md`

**Prerequisite:** Sprint 3 plan (`2026-03-31-asset-layer-sprint3.md`) must be fully complete.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/types/simulation.ts` | Modify | Add `AssetRequirement`, `AssetTransitionEffect` to `Decision`; add `CachedResponse`, `BranchWorthiness` |
| `lib/game/asset-state-machine.ts` | Create | State transition logic, lead times, in-transit position interpolation |
| `lib/game/decision-prerequisites.ts` | Create | Check `requiredAssets` against current asset states |
| `app/api/branches/[id]/resolution/route.ts` | Create/Modify | Resolution engine: BranchWorthiness scoring + cached response generation |
| `components/game/StepInPopup.tsx` | Create | "Step In" intervention popup |
| `components/game/ActorControlSelector.tsx` | Create | Session-start actor control selection |
| `components/game/BranchNodeCard.tsx` | Create/Modify | Branch tree node with dates, type badges, alternate responses |
| `tests/game/asset-state-machine.test.ts` | Create | State machine transition tests |
| `tests/game/decision-prerequisites.test.ts` | Create | Prerequisite checker tests |

---

## Task 1: Extend Decision Types

**Files:**
- Modify: `lib/types/simulation.ts`
- Create: `tests/game/decision-prerequisites.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/game/decision-prerequisites.test.ts
import { describe, it, expect } from 'vitest'
import type {
  AssetRequirement,
  AssetTransitionEffect,
  CachedResponse,
  BranchWorthiness,
  Decision,
} from '@/lib/types/simulation'

describe('Extended Decision types', () => {
  it('accepts a Decision with requiredAssets', () => {
    const decision: Decision = {
      id: 'ground-invasion',
      name: 'Conduct Ground Invasion of Southern Iran',
      description: 'Commit ground forces across the Iranian border.',
      dimension: 'military',
      escalationLevel: 8,
      expectedOutcomes: [],
      requiredAssets: [
        {
          category: 'ground',
          requiredStatus: ['staged', 'engaged'],
          requiredZone: 'kuwait',
          minCapability: { name: 'personnel', minCurrent: 50000 },
        },
      ],
      assetTransitions: [],
    }
    expect(decision.requiredAssets).toHaveLength(1)
    expect(decision.requiredAssets![0].requiredZone).toBe('kuwait')
  })

  it('accepts CachedResponse shape', () => {
    const cached: CachedResponse = {
      actorId: 'iran',
      decision: {
        id: 'strait-mining',
        name: 'Mine the Strait of Hormuz',
        description: 'Deploy mines blocking commercial traffic.',
        dimension: 'military',
        escalationLevel: 7,
        expectedOutcomes: [],
        requiredAssets: [],
        assetTransitions: [],
      },
      rationale: 'Asymmetric response maximizing economic pressure on US coalition.',
      escalationDirection: 'up',
      cachedAt: '2025-10-26T12:00:00Z',
    }
    expect(cached.actorId).toBe('iran')
    expect(cached.escalationDirection).toBe('up')
  })

  it('accepts BranchWorthiness shape', () => {
    const bw: BranchWorthiness = {
      score: 85,
      reason: 'First strike on civilian nuclear infrastructure',
      suggestedBranchLabel: "Iran's Response to Fordow Strike",
      alternateResponses: [],
    }
    expect(bw.score).toBeGreaterThanOrEqual(60)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/game/decision-prerequisites.test.ts
```

Expected: FAIL — types not yet defined.

- [ ] **Step 3: Add types to `lib/types/simulation.ts`**

After the existing `Decision` interface, add:

```typescript
export interface AssetRequirement {
  assetId?: string              // specific named asset required
  category?: AssetCategory      // OR: any asset of this category
  assetType?: string            // OR: any asset of this type
  requiredStatus: AssetStatus[] // must be in one of these states
  requiredZone?: string         // must be in this zone (if applicable)
  minCapability?: {
    name: string
    minCurrent: number
  }
}

export interface AssetTransitionEffect {
  assetId?: string
  category?: AssetCategory
  fromStatus: AssetStatus
  toStatus: AssetStatus
  turnsRequired: number         // 0 = immediate effect
  positionUpdate?: {
    targetLat: number
    targetLng: number
    targetZone: string
  }
}

export interface CachedResponse {
  actorId: string
  decision: Decision
  rationale: string
  escalationDirection: 'up' | 'down' | 'lateral' | 'none'
  cachedAt: string
}

export interface BranchWorthiness {
  score: number                  // 0–100; >= 60 creates a response node
  reason: string
  suggestedBranchLabel: string
  alternateResponses?: CachedResponse[]
}
```

Extend the `Decision` interface to add optional fields (add after `expectedOutcomes`):

```typescript
// Add to existing Decision interface:
requiredAssets?: AssetRequirement[]
assetTransitions?: AssetTransitionEffect[]
leadsToAvailable?: string[]     // decision IDs unlocked after this one
```

Add `branchWorthiness?: BranchWorthiness` to `TurnResolution`.

- [ ] **Step 4: Run tests**

```bash
bun run test -- --run tests/game/decision-prerequisites.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/types/simulation.ts tests/game/decision-prerequisites.test.ts
git commit -m "feat: add AssetRequirement, AssetTransitionEffect, CachedResponse, BranchWorthiness types"
```

---

## Task 2: Asset State Machine

**Files:**
- Create: `lib/game/asset-state-machine.ts`
- Create: `tests/game/asset-state-machine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/game/asset-state-machine.test.ts
import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getLeadTurns,
  interpolatePosition,
  applyTransition,
} from '@/lib/game/asset-state-machine'
import type { PositionedAsset } from '@/lib/types/simulation'

const BASE_ASSET: PositionedAsset = {
  id: 'cvn-72', scenarioId: 'iran-2026', actorId: 'us',
  name: 'USS Abraham Lincoln', shortName: 'CVN-72',
  category: 'naval', assetType: 'carrier', description: '',
  position: { lat: 23.5, lng: 59.5 }, zone: 'arabian_sea',
  status: 'available', capabilities: [], strikeRangeNm: 1200,
  provenance: 'researched', effectiveFrom: '2025-01-01',
  discoveredAt: '2025-08-01T00:00:00Z', notes: '',
}

describe('canTransition', () => {
  it('allows available → mobilizing', () => {
    expect(canTransition('available', 'mobilizing')).toBe(true)
  })
  it('allows staged → engaged', () => {
    expect(canTransition('staged', 'engaged')).toBe(true)
  })
  it('disallows available → engaged (skipping steps)', () => {
    expect(canTransition('available', 'engaged')).toBe(false)
  })
  it('disallows destroyed → any forward state', () => {
    expect(canTransition('destroyed', 'available')).toBe(false)
    expect(canTransition('destroyed', 'mobilizing')).toBe(false)
  })
  it('allows degraded → destroyed', () => {
    expect(canTransition('degraded', 'destroyed')).toBe(true)
  })
  it('allows any state → withdrawn', () => {
    expect(canTransition('engaged', 'withdrawn')).toBe(true)
    expect(canTransition('staged', 'withdrawn')).toBe(true)
  })
})

describe('getLeadTurns', () => {
  it('returns 0 for ballistic missile launch', () => {
    expect(getLeadTurns('missile_site', 'available', 'engaged')).toBe(0)
  })
  it('returns 2 for carrier group mobilizing', () => {
    expect(getLeadTurns('carrier', 'available', 'mobilizing')).toBe(2)
  })
  it('returns 3 for carrier group transiting', () => {
    expect(getLeadTurns('carrier', 'mobilizing', 'transiting')).toBe(3)
  })
  it('returns 6 for ground brigade CONUS → theater', () => {
    expect(getLeadTurns('ground_brigade_conus', 'mobilizing', 'transiting')).toBe(6)
  })
})

describe('interpolatePosition', () => {
  it('returns start position at progress 0', () => {
    const start = { lat: 23.5, lng: 59.5 }
    const end = { lat: 27.0, lng: 56.0 }
    const result = interpolatePosition(start, end, 0)
    expect(result.lat).toBeCloseTo(23.5)
    expect(result.lng).toBeCloseTo(59.5)
  })
  it('returns end position at progress 1', () => {
    const start = { lat: 23.5, lng: 59.5 }
    const end = { lat: 27.0, lng: 56.0 }
    const result = interpolatePosition(start, end, 1)
    expect(result.lat).toBeCloseTo(27.0)
    expect(result.lng).toBeCloseTo(56.0)
  })
  it('returns midpoint at progress 0.5', () => {
    const start = { lat: 20.0, lng: 60.0 }
    const end = { lat: 30.0, lng: 50.0 }
    const result = interpolatePosition(start, end, 0.5)
    expect(result.lat).toBeCloseTo(25.0, 1)
    expect(result.lng).toBeCloseTo(55.0, 1)
  })
})

describe('applyTransition', () => {
  it('sets status and records transition turn', () => {
    const result = applyTransition(BASE_ASSET, 'mobilizing', 1)
    expect(result.status).toBe('mobilizing')
  })
  it('throws if transition is not allowed', () => {
    expect(() => applyTransition(BASE_ASSET, 'engaged', 1)).toThrow()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/game/asset-state-machine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/game/asset-state-machine.ts`**

```typescript
// lib/game/asset-state-machine.ts
import type { AssetStatus, PositionedAsset } from '@/lib/types/simulation'

// Valid transitions: [from] → [allowed to states]
const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  available:  ['mobilizing', 'withdrawn'],
  mobilizing: ['transiting', 'available', 'withdrawn'],
  transiting: ['staged', 'mobilizing', 'withdrawn', 'degraded'],
  staged:     ['engaged', 'transiting', 'withdrawn'],
  engaged:    ['staged', 'degraded', 'withdrawn'],
  degraded:   ['engaged', 'destroyed', 'withdrawn'],
  destroyed:  [],   // terminal state
  withdrawn:  ['available'],
}

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// Lead turns by assetType and transition
// Format: `${assetType}:${from}→${to}` → number of turns
const LEAD_TURNS: Record<string, number> = {
  'carrier:available→mobilizing':             2,
  'carrier:mobilizing→transiting':            3,
  'carrier:transiting→staged':                0,   // arrival is end of transit
  'air_base:available→engaged':               0,
  'air_refueling:available→engaged':          0,
  'missile_site:available→engaged':           0,
  'drone_stockpile:available→engaged':        0,
  'naval_force_pool:available→engaged':       0,
  'air_defense_battery:available→engaged':    0,
  'ground_brigade_conus:available→mobilizing': 2,
  'ground_brigade_conus:mobilizing→transiting': 6,
  'ground_brigade_regional:available→mobilizing': 1,
  'ground_brigade_regional:mobilizing→transiting': 2,
  'headquarters:available→engaged':           0,
  'nuclear_facility:available→engaged':       0,
  'oil_terminal:available→engaged':           0,
  'oil_refinery:available→engaged':           0,
  'naval_base:available→engaged':             0,
}

const DEFAULT_LEAD_TURNS = 1

export function getLeadTurns(
  assetType: string,
  from: AssetStatus,
  to: AssetStatus
): number {
  const key = `${assetType}:${from}→${to}`
  return LEAD_TURNS[key] ?? DEFAULT_LEAD_TURNS
}

/**
 * Linear interpolation between two geographic positions.
 * progress: 0.0 (at start) to 1.0 (at end)
 */
export function interpolatePosition(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  progress: number
): { lat: number; lng: number } {
  const p = Math.max(0, Math.min(1, progress))
  return {
    lat: start.lat + (end.lat - start.lat) * p,
    lng: start.lng + (end.lng - start.lng) * p,
  }
}

/**
 * Apply a state transition to an asset.
 * Throws if the transition is not valid.
 */
export function applyTransition(
  asset: PositionedAsset,
  toStatus: AssetStatus,
  _currentTurn: number
): PositionedAsset {
  if (!canTransition(asset.status, toStatus)) {
    throw new Error(
      `Invalid asset transition: ${asset.id} cannot go from ${asset.status} to ${toStatus}`
    )
  }
  return { ...asset, status: toStatus }
}

/**
 * Get all asset IDs that are in transit and need position updates this turn.
 */
export function getTransitingAssets(assets: PositionedAsset[]): PositionedAsset[] {
  return assets.filter(a => a.status === 'transiting')
}
```

- [ ] **Step 4: Run tests**

```bash
bun run test -- --run tests/game/asset-state-machine.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/game/asset-state-machine.ts tests/game/asset-state-machine.test.ts
git commit -m "feat: add asset state machine with transition rules and lead time table"
```

---

## Task 3: Decision Prerequisites Checker

**Files:**
- Create: `lib/game/decision-prerequisites.ts`
- Modify: `tests/game/decision-prerequisites.test.ts`

- [ ] **Step 1: Add prerequisite checker tests**

Add to `tests/game/decision-prerequisites.test.ts`:

```typescript
import { checkPrerequisites, filterDecisionsByAssets } from '@/lib/game/decision-prerequisites'
import type { PositionedAsset, Decision } from '@/lib/types/simulation'

const US_CARRIER: PositionedAsset = {
  id: 'cvn-72', scenarioId: 'iran-2026', actorId: 'us',
  name: 'USS Abraham Lincoln', shortName: 'CVN-72',
  category: 'naval', assetType: 'carrier', description: '',
  position: { lat: 23.5, lng: 59.5 }, zone: 'arabian_sea',
  status: 'staged', capabilities: [{ name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' }],
  strikeRangeNm: 1200,
  provenance: 'researched', effectiveFrom: '2025-01-01',
  discoveredAt: '2025-08-01T00:00:00Z', notes: '',
}

const STRIKE_DECISION: Decision = {
  id: 'carrier-strike',
  name: 'Carrier Strike on Fordow',
  description: '',
  dimension: 'military',
  escalationLevel: 8,
  expectedOutcomes: [],
  requiredAssets: [
    { category: 'naval', assetType: 'carrier', requiredStatus: ['staged', 'engaged'] },
  ],
  assetTransitions: [],
}

describe('checkPrerequisites', () => {
  it('returns met: true when carrier is staged', () => {
    const result = checkPrerequisites(STRIKE_DECISION, [US_CARRIER])
    expect(result.met).toBe(true)
    expect(result.unmet).toHaveLength(0)
  })

  it('returns met: false when no carrier exists', () => {
    const result = checkPrerequisites(STRIKE_DECISION, [])
    expect(result.met).toBe(false)
    expect(result.unmet[0]).toMatch(/carrier/)
  })

  it('returns met: false when carrier is mobilizing (not staged/engaged)', () => {
    const mobilizing = { ...US_CARRIER, status: 'mobilizing' as const }
    const result = checkPrerequisites(STRIKE_DECISION, [mobilizing])
    expect(result.met).toBe(false)
    expect(result.unmet[0]).toMatch(/staged|engaged/)
  })

  it('checks zone requirement when specified', () => {
    const decisionRequiringKuwait: Decision = {
      ...STRIKE_DECISION,
      requiredAssets: [{ category: 'ground', requiredStatus: ['staged'], requiredZone: 'kuwait' }],
    }
    const result = checkPrerequisites(decisionRequiringKuwait, [US_CARRIER])
    expect(result.met).toBe(false)
    expect(result.unmet[0]).toMatch(/kuwait/)
  })

  it('checks minCapability', () => {
    const decisionRequiringTomahawks: Decision = {
      ...STRIKE_DECISION,
      requiredAssets: [{
        category: 'naval',
        requiredStatus: ['staged'],
        minCapability: { name: 'Tomahawk TLAM', minCurrent: 100 }, // more than available
      }],
    }
    const result = checkPrerequisites(decisionRequiringTomahawks, [US_CARRIER])
    expect(result.met).toBe(false)
  })
})

describe('filterDecisionsByAssets', () => {
  it('marks decisions with unmet prerequisites as unavailable', () => {
    const decisions = [STRIKE_DECISION]
    const filtered = filterDecisionsByAssets(decisions, []) // no assets
    expect(filtered[0].available).toBe(false)
    expect(filtered[0].unmetReason).toBeTruthy()
  })

  it('marks decisions with met prerequisites as available', () => {
    const decisions = [STRIKE_DECISION]
    const filtered = filterDecisionsByAssets(decisions, [US_CARRIER])
    expect(filtered[0].available).toBe(true)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --run tests/game/decision-prerequisites.test.ts
```

Expected: FAIL — new functions not yet defined.

- [ ] **Step 3: Create `lib/game/decision-prerequisites.ts`**

```typescript
// lib/game/decision-prerequisites.ts
import type { Decision, PositionedAsset, AssetRequirement } from '@/lib/types/simulation'

export interface PrerequisiteResult {
  met: boolean
  unmet: string[]   // human-readable reasons for each unmet requirement
}

export interface FilteredDecision {
  decision: Decision
  available: boolean
  unmetReason?: string
}

function checkRequirement(req: AssetRequirement, assets: PositionedAsset[]): string | null {
  const candidates = assets.filter(a => {
    if (req.assetId && a.id !== req.assetId) return false
    if (req.category && a.category !== req.category) return false
    if (req.assetType && a.assetType !== req.assetType) return false
    return true
  })

  if (candidates.length === 0) {
    const what = req.assetId ?? req.assetType ?? req.category ?? 'required asset'
    return `No ${what} found in scenario`
  }

  // Check status
  const statusMatch = candidates.filter(a => req.requiredStatus.includes(a.status))
  if (statusMatch.length === 0) {
    const what = req.assetId ?? req.assetType ?? req.category ?? 'asset'
    return `${what} must be in state [${req.requiredStatus.join(' or ')}] — currently ${candidates.map(a => a.status).join(', ')}`
  }

  // Check zone
  if (req.requiredZone) {
    const zoneMatch = statusMatch.filter(a => a.zone === req.requiredZone)
    if (zoneMatch.length === 0) {
      const what = req.assetId ?? req.assetType ?? req.category ?? 'asset'
      return `${what} must be in zone "${req.requiredZone}" — currently in ${statusMatch.map(a => a.zone).join(', ')}`
    }
  }

  // Check minCapability
  if (req.minCapability) {
    const { name, minCurrent } = req.minCapability
    const capMatch = statusMatch.filter(a =>
      a.capabilities.some(c => c.name === name && c.current >= minCurrent)
    )
    if (capMatch.length === 0) {
      return `Insufficient ${name} — need at least ${minCurrent}`
    }
  }

  return null // requirement met
}

export function checkPrerequisites(
  decision: Decision,
  assets: PositionedAsset[]
): PrerequisiteResult {
  const requirements = decision.requiredAssets ?? []
  const unmet: string[] = []

  for (const req of requirements) {
    const issue = checkRequirement(req, assets)
    if (issue) unmet.push(issue)
  }

  return { met: unmet.length === 0, unmet }
}

export function filterDecisionsByAssets(
  decisions: Decision[],
  assets: PositionedAsset[]
): FilteredDecision[] {
  return decisions.map(decision => {
    const { met, unmet } = checkPrerequisites(decision, assets)
    return {
      decision,
      available: met,
      unmetReason: met ? undefined : unmet.join('; '),
    }
  })
}
```

- [ ] **Step 4: Run tests**

```bash
bun run test -- --run tests/game/decision-prerequisites.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/game/decision-prerequisites.ts tests/game/decision-prerequisites.test.ts
git commit -m "feat: add decision prerequisites checker with zone, status, and capability checks"
```

---

## Task 4: BranchWorthiness Scoring in Resolution Engine

**Files:**
- Modify: `app/api/branches/[id]/resolution/route.ts` (or wherever resolution runs)

Find the resolution API route:
```bash
find app/api -name "route.ts" | xargs grep -l "resolution\|resolve" 2>/dev/null
```

- [ ] **Step 1: Add `scoreBranchWorthiness` utility**

Create `lib/game/branch-worthiness.ts`:

```typescript
// lib/game/branch-worthiness.ts
import type { BranchWorthiness, Event } from '@/lib/types/simulation'

// Keywords and patterns that raise branch worthiness score
const HIGH_SCORE_PATTERNS = [
  { pattern: /nuclear|fordow|natanz|arak|dimona/i,       points: 30, reason: 'Nuclear facility involved' },
  { pattern: /civilian|refinery|power grid|electricity/i, points: 25, reason: 'Civilian infrastructure targeted' },
  { pattern: /assassinat|kill|eliminat.*general|kill.*official/i, points: 25, reason: 'Key figure killed' },
  { pattern: /hormuz|strait|blockade|mine/i,             points: 20, reason: 'Strait of Hormuz affected' },
  { pattern: /first.*(strike|attack)|open.*(war|conflict)/i, points: 20, reason: 'First-use escalation' },
  { pattern: /alliance|ally|israel|hezbollah|houthi/i,   points: 10, reason: 'Alliance dynamics' },
  { pattern: /carrier.*strike|air.*campaign|bomb/i,       points: 10, reason: 'Major military action' },
]

export function scoreBranchWorthiness(
  events: Event[],
  turnNarrative: string
): BranchWorthiness {
  let score = 0
  const reasons: string[] = []
  const fullText = `${turnNarrative} ${events.map(e => `${e.name} ${e.description}`).join(' ')}`

  for (const { pattern, points, reason } of HIGH_SCORE_PATTERNS) {
    if (pattern.test(fullText)) {
      score += points
      reasons.push(reason)
    }
  }

  score = Math.min(100, score)

  const reason = reasons.length > 0 ? reasons.join('; ') : 'Routine turn — no high-significance events'
  const suggestedBranchLabel = reasons.length > 0
    ? `Response to: ${reasons[0]}`
    : 'Alternate path'

  return { score, reason, suggestedBranchLabel, alternateResponses: [] }
}
```

- [ ] **Step 2: Integrate into resolution**

In the resolution route, after generating the turn narrative, call `scoreBranchWorthiness`:

```typescript
import { scoreBranchWorthiness } from '@/lib/game/branch-worthiness'

// After resolution engine returns:
const worthiness = scoreBranchWorthiness(resolution.resolvedEvents, resolution.turnNarrative)

// Store worthiness in the turn commit payload
// Include in response so frontend can decide whether to trigger "Step In"
return Response.json({
  data: {
    ...resolution,
    branchWorthiness: worthiness,
  },
  error: null,
})
```

- [ ] **Step 3: Write test**

```typescript
// tests/game/branch-worthiness.test.ts
import { describe, it, expect } from 'vitest'
import { scoreBranchWorthiness } from '@/lib/game/branch-worthiness'

describe('scoreBranchWorthiness', () => {
  it('scores nuclear facility strikes highly', () => {
    const result = scoreBranchWorthiness([], 'US strikes Fordow enrichment facility with B-52 bombers')
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('scores civilian infrastructure attacks highly', () => {
    const result = scoreBranchWorthiness([], 'Israel strikes Iranian electricity grid and power plants')
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('scores routine patrol turns low', () => {
    const result = scoreBranchWorthiness([], 'Routine carrier group patrol in Arabian Sea. No significant activity.')
    expect(result.score).toBeLessThan(60)
  })
})
```

```bash
bun run test -- --run tests/game/branch-worthiness.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/game/branch-worthiness.ts tests/game/branch-worthiness.test.ts
git commit -m "feat: add BranchWorthiness scoring for resolution engine"
```

---

## Task 5: Cached Alternate Responses

**Files:**
- Modify: `app/api/ai/resolution/route.ts` (or wherever the resolution AI agent runs)
- Modify: `lib/ai/resolution.ts` (if resolution prompt logic lives here)

The resolution engine should, for any turn where `branchWorthiness.score >= 60`, generate 2–3 alternate responses from the primary reacting actor. These are pre-generated and cached in the turn commit JSON.

- [ ] **Step 1: Add alternate response generation to resolution prompt**

Find the resolution system prompt in `lib/ai/` or `docs/prompt-library.ts`. After the main resolution, make a second AI call if score >= 60:

```typescript
// lib/ai/cached-responses.ts
import Anthropic from '@anthropic-ai/sdk'
import type { CachedResponse, Actor, Event } from '@/lib/types/simulation'

const client = new Anthropic()

export async function generateCachedResponses(
  reactingActor: Actor,
  triggeringEvents: Event[],
  primaryResponse: CachedResponse['decision']
): Promise<CachedResponse[]> {
  const eventSummary = triggeringEvents.map(e => e.name).join(', ')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are generating alternate strategic responses for ${reactingActor.name} in a geopolitical simulation.
Generate 2 alternate responses (NOT including the primary response already chosen) that ${reactingActor.name} could plausibly take.
Each must be strategically rational from ${reactingActor.name}'s perspective given their objectives.
Win condition: ${reactingActor.winCondition ?? 'not specified'}
Return JSON: { "alternates": [{ "decisionName": string, "description": string, "rationale": string, "escalationDirection": "up"|"down"|"lateral"|"none" }] }`,
    messages: [{
      role: 'user',
      content: `Triggering events: ${eventSummary}
Primary response already chosen: ${primaryResponse.name}
Generate 2 alternate responses.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text) as {
    alternates: Array<{ decisionName: string; description: string; rationale: string; escalationDirection: CachedResponse['escalationDirection'] }>
  }

  return parsed.alternates.map((alt, i) => ({
    actorId: reactingActor.id,
    decision: {
      id: `cached-alt-${reactingActor.id}-${i}`,
      name: alt.decisionName,
      description: alt.description,
      dimension: 'military' as const,
      escalationLevel: 0, // not scored
      expectedOutcomes: [],
      requiredAssets: [],
      assetTransitions: [],
    },
    rationale: alt.rationale,
    escalationDirection: alt.escalationDirection,
    cachedAt: new Date().toISOString(),
  }))
}
```

Integrate into the resolution route: if `worthiness.score >= 60`, call `generateCachedResponses` for the primary reacting actor and attach to `worthiness.alternateResponses`.

- [ ] **Step 2: Commit**

```bash
git add lib/ai/cached-responses.ts
git commit -m "feat: add cached alternate response generation for high-worthiness turns"
```

---

## Task 6: "Step In" Popup Component

**Files:**
- Create: `components/game/StepInPopup.tsx`

- [ ] **Step 1: Create `components/game/StepInPopup.tsx`**

```typescript
// components/game/StepInPopup.tsx
'use client'
import type { BranchWorthiness, CachedResponse, Decision } from '@/lib/types/simulation'

const DIRECTION_ICON: Record<string, string> = {
  up:      '↑',
  down:    '↓',
  lateral: '→',
  none:    '—',
}

const DIRECTION_COLOR: Record<string, string> = {
  up:      '#e74c3c',
  down:    '#2ecc71',
  lateral: '#f39c12',
  none:    '#8a8880',
}

interface Props {
  reactingActorName: string
  triggeringEventSummary: string   // e.g. "US strikes Fordow enrichment facility"
  aiChosenResponse: CachedResponse
  worthiness: BranchWorthiness
  onProceed: () => void
  onStepIn: (actorId: string) => void
}

export function StepInPopup({
  reactingActorName,
  triggeringEventSummary,
  aiChosenResponse,
  worthiness,
  onProceed,
  onStepIn,
}: Props) {
  const dirIcon  = DIRECTION_ICON[aiChosenResponse.escalationDirection] ?? '—'
  const dirColor = DIRECTION_COLOR[aiChosenResponse.escalationDirection] ?? '#8a8880'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f1114',
        border: '1px solid #2a2d32',
        borderRadius: 6,
        padding: 24,
        maxWidth: 480, width: '100%',
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#e8e6e0',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{
          fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em',
          color: '#e74c3c', marginBottom: 4,
        }}>
          RESPONSE REQUIRED
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16, fontWeight: 700, color: '#ffba20', marginBottom: 4,
        }}>
          {reactingActorName}
        </div>

        <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 16 }}>
          Reacting to: <span style={{ color: '#c8c6c0' }}>{triggeringEventSummary}</span>
        </div>

        {/* AI's chosen response */}
        <div style={{
          padding: '12px 14px',
          background: 'rgba(15,17,20,0.8)',
          border: '1px solid #2a2d32',
          borderRadius: 4, marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            AI Assessment
          </div>
          <div style={{ fontSize: 12, color: '#e8e6e0', marginBottom: 6, lineHeight: 1.4 }}>
            {reactingActorName} has decided to —
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            color: '#c8c6c0', marginBottom: 8,
          }}>
            "{aiChosenResponse.decision.name}"
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
            <span style={{ color: '#8a8880' }}>
              Escalation: <span style={{ color: dirColor, fontWeight: 600 }}>{dirIcon} {aiChosenResponse.escalationDirection.toUpperCase()}</span>
            </span>
            <span style={{ color: '#8a8880' }}>
              Significance: <span style={{ color: '#ffba20' }}>{worthiness.score}/100</span>
            </span>
          </div>
        </div>

        {/* Rationale */}
        <div style={{ fontSize: 10, color: '#8a8880', lineHeight: 1.5, marginBottom: 20, fontStyle: 'italic' }}>
          {aiChosenResponse.rationale}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onProceed}
            style={{
              flex: 1, padding: '10px 0',
              background: 'rgba(41,128,185,0.15)',
              border: '1px solid rgba(41,128,185,0.4)',
              borderRadius: 4, color: '#5dade2', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.08em',
            }}
          >
            PROCEED WITH AI DECISION
          </button>
          <button
            onClick={() => onStepIn(aiChosenResponse.actorId)}
            style={{
              flex: 1, padding: '10px 0',
              background: 'rgba(255,186,32,0.1)',
              border: '1px solid rgba(255,186,32,0.35)',
              borderRadius: 4, color: '#ffba20', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            STEP IN AS {reactingActorName.toUpperCase()}
          </button>
        </div>

        {/* Alternate responses count hint */}
        {(worthiness.alternateResponses?.length ?? 0) > 0 && (
          <div style={{ marginTop: 12, fontSize: 9, color: '#555', textAlign: 'center' }}>
            {worthiness.alternateResponses!.length} alternate responses cached — available from branch tree
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire `StepInPopup` into game view**

In the turn resolution flow (wherever the user submits a decision and waits for resolution), after receiving the resolution response:

```typescript
// In the game view component:
const [stepInData, setStepInData] = useState<{
  reactingActorName: string
  triggeringEventSummary: string
  aiChosenResponse: CachedResponse
  worthiness: BranchWorthiness
} | null>(null)

// After resolution completes:
if (resolution.branchWorthiness && resolution.branchWorthiness.score >= 60) {
  // Show step-in popup for the primary reacting actor
  setStepInData({
    reactingActorName: resolution.reactingActor.name,
    triggeringEventSummary: resolution.resolvedEvents[0]?.name ?? 'Recent events',
    aiChosenResponse: resolution.aiResponse,
    worthiness: resolution.branchWorthiness,
  })
}

// In JSX:
{stepInData && (
  <StepInPopup
    {...stepInData}
    onProceed={() => {
      setStepInData(null)
      // commit turn and advance
    }}
    onStepIn={(actorId) => {
      setStepInData(null)
      // open actor decision panel for actorId
    }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/game/StepInPopup.tsx
git commit -m "feat: add StepInPopup intervention mechanic"
```

---

## Task 7: Actor Control Selector

**Files:**
- Create: `components/game/ActorControlSelector.tsx`

- [ ] **Step 1: Create `components/game/ActorControlSelector.tsx`**

```typescript
// components/game/ActorControlSelector.tsx
'use client'
import type { Actor } from '@/lib/types/simulation'
import { useState } from 'react'

const ACTOR_COLORS: Record<string, string> = {
  us:      '#2980b9',
  israel:  '#27ae60',
  iran:    '#c0392b',
}

interface Props {
  actors: Actor[]
  onConfirm: (controlledActorIds: string[]) => void
}

export function ActorControlSelector({ actors, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['us']))

  function toggle(actorId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(actorId)) next.delete(actorId)
      else next.add(actorId)
      return next
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f1114', border: '1px solid #2a2d32',
        borderRadius: 6, padding: 28, maxWidth: 400, width: '100%',
        fontFamily: "'IBM Plex Mono', monospace", color: '#e8e6e0',
      }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#ffba20', marginBottom: 6 }}>
          Select Your Actors
        </div>
        <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 20, lineHeight: 1.5 }}>
          Choose which actors you control. Uncontrolled actors are AI-driven.
          You can step in as any actor from the branch tree at any time.
        </div>

        <div style={{ marginBottom: 20 }}>
          {actors.map(actor => {
            const isSelected = selected.has(actor.id)
            const color = ACTOR_COLORS[actor.id] ?? '#8a8880'
            return (
              <button
                key={actor.id}
                onClick={() => toggle(actor.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '10px 14px', marginBottom: 8,
                  background: isSelected ? `${color}18` : '#151719',
                  border: `1px solid ${isSelected ? color : '#2a2d32'}`,
                  borderRadius: 4, cursor: 'pointer',
                  color: '#e8e6e0', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: isSelected ? color : 'transparent',
                  border: `2px solid ${color}`,
                  flexShrink: 0, transition: 'background 0.15s',
                }} />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600 }}>
                    {actor.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#8a8880', marginTop: 2 }}>
                    {isSelected ? 'YOU CONTROL' : 'AI-DRIVEN'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onConfirm([...selected])}
          disabled={selected.size === 0}
          style={{
            width: '100%', padding: '12px 0',
            background: selected.size > 0 ? 'rgba(255,186,32,0.12)' : '#1a1a1a',
            border: `1px solid ${selected.size > 0 ? 'rgba(255,186,32,0.4)' : '#2a2d32'}`,
            borderRadius: 4,
            color: selected.size > 0 ? '#ffba20' : '#555',
            cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, letterSpacing: '0.1em', fontWeight: 600,
          }}
        >
          BEGIN SIMULATION →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into game session start**

In the game session initialization (when user navigates to `/play/[branchId]`), show `ActorControlSelector` before the first turn if no controlled actors have been set. Store the selection in React state or a context.

- [ ] **Step 3: Commit**

```bash
git add components/game/ActorControlSelector.tsx
git commit -m "feat: add ActorControlSelector for multi-actor session configuration"
```

---

## Task 8: Branch Tree — Dates and Node Type Badges

**Files:**
- Modify: `components/game/BranchTree.tsx` (or wherever branch tree is rendered)

Find the branch tree component:
```bash
find components -name "BranchTree*"
```

- [ ] **Step 1: Add date display and node type badges**

Open `BranchTree.tsx`. In each node card render, add:

```typescript
// Inside the branch node card JSX:

// Date display (replace turn number display)
<div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
  {node.turnDate
    ? new Date(node.turnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : `Turn ${node.turnNumber}`
  }
</div>

// Node type badge (action vs response)
{node.nodeType && (
  <span style={{
    padding: '1px 5px', borderRadius: 2, fontSize: 8,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: node.nodeType === 'action' ? '#5dade2' : '#f39c12',
    background: node.nodeType === 'action' ? 'rgba(41,128,185,0.15)' : 'rgba(230,126,34,0.15)',
    border: `1px solid ${node.nodeType === 'action' ? '#2980b944' : '#e67e2244'}`,
    marginRight: 6,
  }}>
    {node.nodeType.toUpperCase()}
  </span>
)}

// Escalation direction indicator
{node.escalationDirection && (
  <span style={{
    fontSize: 10,
    color: node.escalationDirection === 'up' ? '#e74c3c' : node.escalationDirection === 'down' ? '#2ecc71' : '#f39c12',
  }}>
    {node.escalationDirection === 'up' ? '↑' : node.escalationDirection === 'down' ? '↓' : '→'}
  </span>
)}

// Cached alternates count
{(node.cachedAlternates ?? 0) > 0 && (
  <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
    {node.cachedAlternates} alternate{node.cachedAlternates !== 1 ? 's' : ''} cached
  </div>
)}
```

Add `turnDate?: string`, `nodeType?: 'action' | 'response'`, `escalationDirection?: string`, `cachedAlternates?: number` to whatever type the branch tree node uses.

- [ ] **Step 2: Commit**

```bash
git add components/game/BranchTree.tsx
git commit -m "feat: add date labels, node type badges, and escalation indicators to branch tree"
```

---

## Task 9: Catch-Up Research UI

The `ResearchUpdatePanel` from Sprint 3 needs a "catch-up" mode for reviewing multiple proposed turns sequentially. This extends Task 13 from Sprint 3.

**Files:**
- Modify: `components/game/ResearchUpdatePanel.tsx`

- [ ] **Step 1: Add catch-up mode rendering**

Open `components/game/ResearchUpdatePanel.tsx`. Add state for multiple proposed turn commits:

```typescript
const [catchUpCommits, setCatchUpCommits] = useState<Array<{
  turnDate: string
  summary: string
  changes: ProposedAssetChange[]
  approved: boolean | null  // null = not yet reviewed
}>>([])
const [catchUpIndex, setCatchUpIndex] = useState(0)
```

When the research response contains multiple proposed commits (array in `proposed_changes`), switch to catch-up mode:

```typescript
// After receiving research response:
if (Array.isArray(data.proposed_changes) && data.proposed_changes.length > 0 &&
    data.proposed_changes[0]?.turnDate) {
  // Multi-commit catch-up mode
  setCatchUpCommits(data.proposed_changes.map((pc: ProposedAssetChange & { turnDate: string }) => ({
    turnDate: pc.turnDate,
    summary: pc.rationale,
    changes: [pc],
    approved: null,
  })))
  setCatchUpIndex(0)
  setStatus('catch_up')
} else {
  setStatus('reviewing')
}
```

Add a `catch_up` status to the render:

```typescript
{status === 'catch_up' && catchUpCommits.length > 0 && (
  <div>
    <div style={{ fontSize: 9, color: '#8a8880', marginBottom: 8 }}>
      CATCH-UP: {catchUpIndex + 1} of {catchUpCommits.length} PROPOSED TURNS
    </div>
    <div style={{ fontSize: 11, color: '#ffba20', marginBottom: 6 }}>
      {catchUpCommits[catchUpIndex].turnDate
        ? new Date(catchUpCommits[catchUpIndex].turnDate).toLocaleDateString()
        : 'Unknown date'
      }
    </div>
    <div style={{ fontSize: 10, color: '#c8c6c0', marginBottom: 12, lineHeight: 1.5 }}>
      {catchUpCommits[catchUpIndex].summary}
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => {
          const updated = [...catchUpCommits]
          updated[catchUpIndex] = { ...updated[catchUpIndex], approved: true }
          setCatchUpCommits(updated)
          if (catchUpIndex < catchUpCommits.length - 1) {
            setCatchUpIndex(catchUpIndex + 1)
          } else {
            // All reviewed — apply approved ones
            setStatus('done')
            onApproved?.()
          }
        }}
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
        onClick={() => {
          const updated = [...catchUpCommits]
          updated[catchUpIndex] = { ...updated[catchUpIndex], approved: false }
          setCatchUpCommits(updated)
          if (catchUpIndex < catchUpCommits.length - 1) {
            setCatchUpIndex(catchUpIndex + 1)
          } else {
            setStatus('done')
            onApproved?.()
          }
        }}
        style={{
          flex: 1, padding: '6px 0',
          background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 3, color: '#e74c3c', cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
        }}
      >
        SKIP
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add components/game/ResearchUpdatePanel.tsx
git commit -m "feat: add catch-up sequential review mode to ResearchUpdatePanel"
```

---

## Task 10: Final Integration and Tests

- [ ] **Step 1: Run full test suite**

```bash
bun run test -- --run
```

Expected: All tests PASS.

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Lint**

```bash
bun run lint
```

Fix any ESLint errors.

- [ ] **Step 4: Manual integration check**

```bash
bun run dev
```

Verify:
- [ ] Starting a game session shows `ActorControlSelector`
- [ ] Selecting actors and proceeding loads the game view
- [ ] After a turn resolves with `branchWorthiness.score >= 60`, `StepInPopup` appears
- [ ] Clicking "Proceed" dismisses popup and advances turn
- [ ] Clicking "Step In" opens the actor decision panel
- [ ] Branch tree nodes show dates (not turn numbers)
- [ ] Branch tree nodes show [ACTION] or [RESPONSE] badges
- [ ] `ResearchUpdatePanel` catch-up mode steps through multiple proposed turns

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: Sprint 4 asset mechanics complete — state machine, prerequisites, Step In, branch tree dates"
```

---

## Self-Review Checklist

After writing this plan, verified against spec:

- [x] `AssetRequirement`, `AssetTransitionEffect` types — Task 1
- [x] `CachedResponse`, `BranchWorthiness` types — Task 1
- [x] Asset state machine with transition rules — Task 2
- [x] Lead times table by asset type — Task 2
- [x] In-transit position interpolation — Task 2
- [x] Decision prerequisite checker (status, zone, capability) — Task 3
- [x] `filterDecisionsByAssets` — Task 3
- [x] BranchWorthiness scoring in resolution — Task 4
- [x] Cached alternate response generation — Task 5
- [x] `StepInPopup` — Task 6
- [x] Wire StepInPopup into game view — Task 6
- [x] `ActorControlSelector` — Task 7
- [x] Branch tree: dates, node type badges, escalation direction — Task 8
- [x] Catch-up sequential review in ResearchUpdatePanel — Task 9
- [x] Actor motivation enforcement (in spec, captured in actor seed — Sprint 3 Task 7) — ✓
