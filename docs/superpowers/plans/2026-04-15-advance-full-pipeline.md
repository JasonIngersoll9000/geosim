# Wire Player Decisions Through Full AI Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/api/scenarios/[id]/branches/[branchId]/advance` to trigger the full AI pipeline (actor agents, resolution, judge+retry, narrator) as a background task with instant response and Supabase Realtime broadcasts for progress.

**Architecture:** The `/advance` route validates and returns immediately (~200ms), then runs the pipeline via `waitUntil` from `@vercel/functions`. Progress updates flow through Supabase Realtime broadcasts to the client's `useRealtime.ts` hook, which dispatches phase changes to GameProvider. DispatchTerminal renders a deterministic phase checklist from GameProvider state.

**Tech Stack:** Next.js 14 App Router, Supabase (Realtime broadcasts + Postgres), `@vercel/functions` (waitUntil), Anthropic API (Claude), Vitest

**Spec:** `docs/superpowers/specs/2026-04-15-advance-full-pipeline-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/types/simulation.ts` | Modify | Add `TurnPhase` type |
| `lib/game/turn-helpers.ts` | Create | `adaptDecisionOptions`, `loadDecisionCatalog`, `buildTurnPlanFromIds`, `broadcastTurnEvent`, `computeBranchDivergence` |
| `tests/game/turn-helpers.test.ts` | Create | Unit tests for all 5 helpers |
| `components/providers/GameProvider.tsx` | Modify | Add `SET_TURN_ERROR` action, update `turnPhase` type to `TurnPhase`, handle missing snapshot in `SET_COMMIT` |
| `hooks/useRealtime.ts` | Modify | Add `turn_failed` broadcast listener |
| `hooks/useSubmitTurn.ts` | Modify | Simplify to plain POST + JSON response (~240 -> ~60 lines) |
| `components/game/DispatchTerminal.tsx` | Modify | Phase checklist from GameProvider state instead of line-based teletype |
| `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts` | Modify | Replace stub with instant-response + background pipeline |
| `tests/api/advance.test.ts` | Create | Integration tests for new advance behavior |
| `supabase/migrations/20260415000000_turn_phase_enum.sql` | Create | ALTER turn_phase enum with new values |
| `package.json` | Modify | Add `@vercel/functions` dependency |
| `app/api/game/turn/route.ts` | Delete | Logic folded into `/advance` |

---

### Task 1: Add TurnPhase type to simulation.ts

**Files:**
- Modify: `lib/types/simulation.ts`

- [ ] **Step 1: Add TurnPhase type**

Add after the existing `TurnPlanValidationResult` interface (around line 853):

```ts
// ─── TURN PHASE ───────────────────────────────────────────────────────────────

/** Phases of the turn pipeline — used by server broadcasts and client UI */
export type TurnPhase =
  | 'submitted'
  | 'planning'
  | 'resolving'
  | 'judging'
  | 'narrating'
  | 'finalizing'
  | 'complete'
  | 'failed'

/** Ordered array for phase comparison in DispatchTerminal */
export const TURN_PHASE_ORDER: TurnPhase[] = [
  'submitted', 'planning', 'resolving', 'judging', 'narrating', 'finalizing', 'complete',
]
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no consumers reference the new type yet)

- [ ] **Step 3: Commit**

```bash
git add lib/types/simulation.ts
git commit -m "feat: add TurnPhase type to simulation types"
```

---

### Task 2: Create turn-helpers.ts with tests (TDD)

**Files:**
- Create: `lib/game/turn-helpers.ts`
- Create: `tests/game/turn-helpers.test.ts`

**Reference:**
- `lib/game/iran-decisions.ts` — `IRAN_DECISIONS: DecisionOption[]`
- `lib/types/panels.ts:7-20` — `DecisionOption` interface
- `lib/types/simulation.ts:764-850` — `Decision`, `TurnPlan`, `PlannedAction` interfaces
- `app/api/game/turn/route.ts:420-442` — existing `computeBranchDivergence`

- [ ] **Step 1: Write failing tests for adaptDecisionOptions**

```ts
// tests/game/turn-helpers.test.ts
import { describe, it, expect } from 'vitest'
import { adaptDecisionOptions } from '@/lib/game/turn-helpers'
import type { DecisionOption } from '@/lib/types/panels'

describe('adaptDecisionOptions', () => {
  const mockOptions: DecisionOption[] = [
    {
      id: 'expand-air',
      title: 'Expand Air Campaign',
      dimension: 'military',
      escalationDirection: 'escalate',
      resourceWeight: 0.6,
    },
    {
      id: 'ceasefire-signal',
      title: 'Signal Ceasefire Willingness',
      dimension: 'diplomatic',
      escalationDirection: 'de-escalate',
      resourceWeight: 0.2,
    },
  ]

  it('maps DecisionOption fields to Decision fields', () => {
    const decisions = adaptDecisionOptions(mockOptions)
    expect(decisions).toHaveLength(2)
    expect(decisions[0]).toMatchObject({
      id: 'expand-air',
      description: 'Expand Air Campaign',
      dimension: 'military',
      escalationLevel: 1,
      isEscalation: true,
      isDeescalation: false,
    })
  })

  it('marks de-escalation correctly', () => {
    const decisions = adaptDecisionOptions(mockOptions)
    expect(decisions[1]).toMatchObject({
      id: 'ceasefire-signal',
      escalationLevel: 0,
      isEscalation: false,
      isDeescalation: true,
    })
  })

  it('returns empty array for empty input', () => {
    expect(adaptDecisionOptions([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: FAIL — `adaptDecisionOptions` not found

- [ ] **Step 3: Implement adaptDecisionOptions**

```ts
// lib/game/turn-helpers.ts
import type { DecisionOption } from '@/lib/types/panels'
import type { Decision } from '@/lib/types/simulation'

export function adaptDecisionOptions(options: DecisionOption[]): Decision[] {
  return options.map(opt => ({
    id: opt.id,
    description: opt.title,
    dimension: opt.dimension,
    escalationLevel: opt.escalationDirection === 'escalate' ? 1 : 0,
    isEscalation: opt.escalationDirection === 'escalate',
    isDeescalation: opt.escalationDirection === 'de-escalate',
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for loadDecisionCatalog**

Add to `tests/game/turn-helpers.test.ts`:

```ts
import { loadDecisionCatalog } from '@/lib/game/turn-helpers'

describe('loadDecisionCatalog', () => {
  it('returns decisions keyed by actor for iran scenario', () => {
    const catalog = loadDecisionCatalog('any-iran-scenario-id')
    expect(catalog).toHaveProperty('united_states')
    expect(catalog.united_states.length).toBeGreaterThan(0)
    expect(catalog.united_states[0]).toHaveProperty('id')
    expect(catalog.united_states[0]).toHaveProperty('description')
  })

  it('returns adapted Decision objects, not raw DecisionOptions', () => {
    const catalog = loadDecisionCatalog('any-id')
    const first = catalog.united_states[0]
    expect(first).toHaveProperty('isEscalation')
    expect(first).toHaveProperty('escalationLevel')
    expect(first).not.toHaveProperty('title')
    expect(first).not.toHaveProperty('resourceWeight')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: FAIL — `loadDecisionCatalog` not found

- [ ] **Step 7: Implement loadDecisionCatalog**

Add to `lib/game/turn-helpers.ts`:

```ts
import { IRAN_DECISIONS } from '@/lib/game/iran-decisions'

export function loadDecisionCatalog(_scenarioId: string): Record<string, Decision[]> {
  const adapted = adaptDecisionOptions(IRAN_DECISIONS)
  return { united_states: adapted }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: PASS

- [ ] **Step 9: Write failing tests for buildTurnPlanFromIds**

Add to `tests/game/turn-helpers.test.ts`:

```ts
import { buildTurnPlanFromIds } from '@/lib/game/turn-helpers'

describe('buildTurnPlanFromIds', () => {
  const catalog = loadDecisionCatalog('test')

  it('builds TurnPlan with primary only — 100% resources', () => {
    const plan = buildTurnPlanFromIds('expand-air', [], 'united_states', catalog)
    expect(plan.actorId).toBe('united_states')
    expect(plan.primaryAction.decisionId).toBe('expand-air')
    expect(plan.primaryAction.resourcePercent).toBe(100)
    expect(plan.concurrentActions).toEqual([])
  })

  it('builds TurnPlan with 1 concurrent — 80/20 split', () => {
    const plan = buildTurnPlanFromIds('expand-air', ['asset-freeze'], 'united_states', catalog)
    expect(plan.primaryAction.resourcePercent).toBe(80)
    expect(plan.concurrentActions).toHaveLength(1)
    expect(plan.concurrentActions[0].resourcePercent).toBe(20)
  })

  it('builds TurnPlan with 3 concurrent — 40/20/20/20 split', () => {
    const plan = buildTurnPlanFromIds(
      'expand-air',
      ['asset-freeze', 'ceasefire-signal', 'proxy-disrupt'],
      'united_states',
      catalog
    )
    expect(plan.primaryAction.resourcePercent).toBe(40)
    expect(plan.concurrentActions).toHaveLength(3)
    plan.concurrentActions.forEach(ca => {
      expect(ca.resourcePercent).toBe(20)
    })
  })

  it('throws on unknown primary action ID', () => {
    expect(() =>
      buildTurnPlanFromIds('nonexistent', [], 'united_states', catalog)
    ).toThrow(/not found/)
  })

  it('throws on unknown actor ID', () => {
    expect(() =>
      buildTurnPlanFromIds('expand-air', [], 'nonexistent_actor', catalog)
    ).toThrow(/No decisions found/)
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: FAIL — `buildTurnPlanFromIds` not found

- [ ] **Step 11: Implement buildTurnPlanFromIds**

Add to `lib/game/turn-helpers.ts`:

```ts
import type { TurnPlan } from '@/lib/types/simulation'

export function buildTurnPlanFromIds(
  primaryActionId: string,
  concurrentActionIds: string[],
  actorId: string,
  catalog: Record<string, Decision[]>
): TurnPlan {
  const actorDecisions = catalog[actorId]
  if (!actorDecisions || actorDecisions.length === 0) {
    throw new Error(`No decisions found for actor "${actorId}"`)
  }

  const findDecision = (id: string): Decision => {
    const d = actorDecisions.find(d => d.id === id)
    if (!d) throw new Error(`Decision "${id}" not found for actor "${actorId}"`)
    return d
  }

  findDecision(primaryActionId)
  concurrentActionIds.forEach(id => findDecision(id))

  const concurrentCount = Math.min(concurrentActionIds.length, 3)
  const primaryPercent = concurrentCount === 0 ? 100 : 100 - concurrentCount * 20
  const concurrentPercent = 20

  return {
    actorId,
    primaryAction: {
      decisionId: primaryActionId,
      selectedProfile: null,
      resourcePercent: primaryPercent,
    },
    concurrentActions: concurrentActionIds.map(id => ({
      decisionId: id,
      selectedProfile: null,
      resourcePercent: concurrentPercent,
    })),
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: PASS

- [ ] **Step 13: Write failing tests for broadcastTurnEvent**

Create a **separate test file** `tests/game/turn-broadcast.test.ts` to isolate the `vi.mock` for supabase service from the other helper tests:

```ts
// tests/game/turn-broadcast.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
const mockChannel = vi.fn(() => ({ send: mockSend }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    channel: mockChannel,
  })),
}))

import { broadcastTurnEvent } from '@/lib/game/turn-helpers'

describe('broadcastTurnEvent', () => {
  it('sends broadcast on the correct channel with event and payload', async () => {
    await broadcastTurnEvent('branch-123', 'turn_started', { turnNumber: 5, phase: 'planning' })

    expect(mockChannel).toHaveBeenCalledWith('branch:branch-123')
    expect(mockSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'turn_started',
      payload: { turnNumber: 5, phase: 'planning' },
    })
  })
})
```

- [ ] **Step 14: Implement broadcastTurnEvent**

Add to `lib/game/turn-helpers.ts`:

```ts
import { createServiceClient } from '@/lib/supabase/service'

export async function broadcastTurnEvent(
  branchId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient()
  await supabase.channel(`branch:${branchId}`).send({
    type: 'broadcast',
    event,
    payload,
  })
}
```

- [ ] **Step 15: Run test to verify it passes**

Run: `npm test -- --run tests/game/turn-broadcast.test.ts`
Expected: PASS

- [ ] **Step 16: Write failing test for computeBranchDivergence**

Add to `tests/game/turn-helpers.test.ts`:

```ts
import { computeBranchDivergence } from '@/lib/game/turn-helpers'

describe('computeBranchDivergence', () => {
  it('returns 0 for trunk branches', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_trunk: true }, error: null }),
          }),
        }),
      }),
    }
    const result = await computeBranchDivergence(mockSupabase as never, 'branch-1')
    expect(result).toBe(0)
  })

  it('returns commit count for non-trunk branches', async () => {
    const mockSupabase = {
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { is_trunk: false }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: '1' }, { id: '2' }, { id: '3' }],
              error: null,
            }),
          }),
        }),
    }
    const result = await computeBranchDivergence(mockSupabase as never, 'branch-2')
    expect(result).toBe(3)
  })
})
```

- [ ] **Step 17: Implement computeBranchDivergence**

Add to `lib/game/turn-helpers.ts` (ported from `app/api/game/turn/route.ts:420-442`):

```ts
export async function computeBranchDivergence(
  supabase: ReturnType<typeof createServiceClient>,
  branchId: string
): Promise<number> {
  try {
    const { data: branch } = await supabase
      .from('branches')
      .select('is_trunk')
      .eq('id', branchId)
      .single()

    if (!branch || (branch as Record<string, unknown>).is_trunk) return 0

    const { data: commits } = await supabase
      .from('turn_commits')
      .select('id')
      .eq('branch_id', branchId)

    return commits?.length ?? 0
  } catch {
    return 0
  }
}
```

- [ ] **Step 18: Run all tests to verify everything passes**

Run: `npm test -- --run tests/game/turn-helpers.test.ts`
Expected: ALL PASS

- [ ] **Step 19: Run full test suite**

Run: `npm test -- --run`
Expected: ALL PASS

- [ ] **Step 20: Commit**

```bash
git add lib/game/turn-helpers.ts tests/game/turn-helpers.test.ts tests/game/turn-broadcast.test.ts
git commit -m "feat: add turn-helpers with TDD — catalog adapter, plan builder, broadcast, divergence"
```

---

### Task 3: Update GameProvider — TurnPhase type + SET_TURN_ERROR

**Files:**
- Modify: `components/providers/GameProvider.tsx:7-60`

- [ ] **Step 1: Import TurnPhase and update GameState**

In `components/providers/GameProvider.tsx`, change line 1-6 imports:

```ts
import type { Scenario } from "@/lib/types/simulation";
```
to:
```ts
import type { Scenario, TurnPhase } from "@/lib/types/simulation";
```

Change line 12:
```ts
  turnPhase: "planning" | "resolution" | "reaction" | "judging" | "complete";
```
to:
```ts
  turnPhase: TurnPhase;
  turnError: string | null;
```

Add `turnError: null` to `initialState` (after line 28 `resolutionProgress`):
```ts
  turnError: null,
```

- [ ] **Step 2: Update GameAction union type**

Add to the `GameAction` union (after `SET_RESOLUTION_PROGRESS` around line 57):

```ts
  | { type: "SET_TURN_ERROR"; payload: string | null }
```

Update `SET_COMMIT` payload to make `snapshot` optional (line 40-45):

```ts
  | {
      type: "SET_COMMIT";
      payload: {
        commitId: string;
        turnNumber: number;
        snapshot?: Scenario | null;
      };
    }
```

- [ ] **Step 3: Update reducer cases**

Update `SET_COMMIT` case (line 98-104) to handle missing snapshot:

```ts
    case "SET_COMMIT":
      return {
        ...state,
        currentCommitId: action.payload.commitId,
        turnNumber: action.payload.turnNumber,
        ...(action.payload.snapshot ? { scenarioSnapshot: action.payload.snapshot } : {}),
      };
```

Add `SET_TURN_ERROR` case (after `SET_RESOLUTION_PROGRESS` case):

```ts
    case "SET_TURN_ERROR":
      return { ...state, turnError: action.payload };
```

Update `RESET_TURN` case to also clear error:

```ts
    case "RESET_TURN":
      return {
        ...state,
        turnPhase: "planning",
        selectedDecisionId: null,
        isResolutionRunning: false,
        resolutionProgress: "",
        turnError: null,
      };
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test -- --run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add components/providers/GameProvider.tsx
git commit -m "feat: add SET_TURN_ERROR action and TurnPhase type to GameProvider"
```

---

### Task 4: Update useRealtime.ts — add turn_failed listener

**Files:**
- Modify: `hooks/useRealtime.ts:86-97`

- [ ] **Step 1: Add turn_failed broadcast listener and pipeline tracking**

In `hooks/useRealtime.ts`, after the `turn_completed` listener (line 94-97), add:

```ts
      .on('broadcast', { event: 'turn_failed' }, ({ payload }: { payload: { error: string; phase: string } }) => {
        dispatch({ type: 'SET_TURN_PHASE', payload: 'failed' })
        dispatch({ type: 'SET_TURN_ERROR', payload: payload.error })
        dispatch({ type: 'SET_RESOLUTION_RUNNING', payload: false })
      })
```

- [ ] **Step 2: Update resolution_progress handler to dispatch phase changes**

The `resolution_progress` broadcast includes a `phase` field. DispatchTerminal uses `turnPhase` from GameProvider to render the checklist. Without dispatching phase updates here, the checklist stays frozen at 'planning'.

Change the existing `resolution_progress` handler (line 91-92) from:

```ts
      .on('broadcast', { event: 'resolution_progress' }, ({ payload }: { payload: ResolutionProgressPayload }) => {
        dispatch({ type: 'SET_RESOLUTION_PROGRESS', payload: payload.message })
      })
```

to:

```ts
      .on('broadcast', { event: 'resolution_progress' }, ({ payload }: { payload: ResolutionProgressPayload & { phase?: string } }) => {
        dispatch({ type: 'SET_RESOLUTION_PROGRESS', payload: payload.message })
        if (payload.phase) {
          dispatch({ type: 'SET_TURN_PHASE', payload: payload.phase as TurnPhase })
        }
      })
```

Add `TurnPhase` import at top:
```ts
import type { TurnPhase } from '@/lib/types/simulation'
```

- [ ] **Step 3: Update turn_completed handler to not require snapshot**

Change the existing `turn_completed` handler (line 94-97) from:

```ts
      .on('broadcast', { event: 'turn_completed' }, ({ payload }: { payload: TurnCompletedPayload }) => {
        dispatch({ type: 'SET_COMMIT', payload: { commitId: payload.commitId, turnNumber: payload.turnNumber, snapshot: payload.snapshot } })
        dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })
      })
```

to:

```ts
      .on('broadcast', { event: 'turn_completed' }, ({ payload }: { payload: TurnCompletedPayload }) => {
        dispatch({ type: 'SET_COMMIT', payload: { commitId: payload.commitId, turnNumber: payload.turnNumber } })
        dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })
      })
```

Also update the `turn_started` handler to set pipeline running state:

```ts
      .on('broadcast', { event: 'turn_started' }, ({ payload }: { payload: TurnStartedPayload }) => {
        dispatch({ type: 'SET_TURN_PHASE', payload: 'planning' })
        dispatch({ type: 'SET_RESOLUTION_RUNNING', payload: true })
        void payload
      })
```

And the `turn_completed` handler to clear it:

```ts
        dispatch({ type: 'SET_RESOLUTION_RUNNING', payload: false })
```
(Add as the last dispatch in the `turn_completed` handler.)

- [ ] **Step 4: Update TurnCompletedPayload to make snapshot optional**

Change line 31-34:
```ts
interface TurnCompletedPayload {
  commitId: string
  turnNumber: number
  snapshot?: Scenario | null
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useRealtime.ts
git commit -m "feat: add turn_failed listener and optional snapshot in useRealtime"
```

---

### Task 5: Simplify useSubmitTurn.ts

**Files:**
- Modify: `hooks/useSubmitTurn.ts`

- [ ] **Step 1: Rewrite useSubmitTurn.ts**

Replace the entire file content with:

```ts
'use client'
import { useState, useCallback } from 'react'

interface TurnSubmission {
  primaryAction: string
  concurrentActions: string[]
  controlledActors: string[]
}

export interface TurnSubmitResponse {
  turnCommitId: string
  turnNumber: number
  status: 'processing'
}

interface UseSubmitTurnResult {
  submitTurn: (submission: TurnSubmission) => Promise<TurnSubmitResponse | null>
  isSubmitting: boolean
  error: string | null
  reset: () => void
}

export function useSubmitTurn(scenarioId: string, branchId: string): UseSubmitTurnResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitTurn = useCallback(async (submission: TurnSubmission): Promise<TurnSubmitResponse | null> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/branches/${branchId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }

      const data = await res.json() as TurnSubmitResponse
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [scenarioId, branchId])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setError(null)
  }, [])

  return { submitTurn, isSubmitting, error, reset }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: May produce errors in components that import old types from this hook (`DispatchLine`, `TurnResolutionSummary`, `lines`, `isComplete`, `resolutionSummary`). Note them — they are fixed in Task 6 (DispatchTerminal).

- [ ] **Step 3: Commit**

```bash
git add hooks/useSubmitTurn.ts
git commit -m "refactor: simplify useSubmitTurn to plain POST with instant response"
```

---

### Task 6: Update DispatchTerminal — phase checklist from GameProvider

**Files:**
- Modify: `components/game/DispatchTerminal.tsx`

- [ ] **Step 1: Rewrite DispatchTerminal**

Replace the entire file content with:

```tsx
'use client'
import { useGame } from '@/components/providers/GameProvider'
import { TURN_PHASE_ORDER } from '@/lib/types/simulation'
import type { TurnPhase } from '@/lib/types/simulation'

interface PhaseStep {
  phase: TurnPhase
  label: string
}

const PIPELINE_PHASES: PhaseStep[] = [
  { phase: 'submitted',  label: 'Turn submitted' },
  { phase: 'planning',   label: 'Generating actor plans' },
  { phase: 'resolving',  label: 'Resolving actions' },
  { phase: 'judging',    label: 'Judging plausibility' },
  { phase: 'narrating',  label: 'Generating narrative' },
  { phase: 'finalizing', label: 'Finalizing turn' },
]

function phaseIndex(phase: TurnPhase): number {
  return TURN_PHASE_ORDER.indexOf(phase)
}

interface Props {
  onRetry?: () => void
}

export function DispatchTerminal({ onRetry }: Props) {
  const { state } = useGame()
  const { turnPhase, turnError, resolutionProgress } = state

  const currentIdx = phaseIndex(turnPhase)
  const isComplete = turnPhase === 'complete'
  const isFailed = turnPhase === 'failed'
  const isIdle = !state.isResolutionRunning && turnPhase === 'planning' && !resolutionProgress

  if (isIdle) return null

  return (
    <div className="flex flex-col bg-bg-surface-dim border border-border-subtle overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <span className="font-mono text-2xs uppercase tracking-widest text-text-tertiary">
          Turn Pipeline
        </span>
      </div>

      <div className="px-4 py-3 space-y-2 font-mono text-2xs">
        {PIPELINE_PHASES.map((step) => {
          const stepIdx = phaseIndex(step.phase)
          const isDone = isComplete || currentIdx > stepIdx
          const isCurrent = !isComplete && !isFailed && currentIdx === stepIdx

          return (
            <div key={step.phase} className="flex items-center gap-2">
              <span className={
                isDone ? 'text-gold' : isCurrent ? 'text-status-info' : 'text-text-tertiary'
              }>
                {isDone ? '\u2713' : isCurrent ? '\u25CB' : '\u2022'}
              </span>
              <span className={
                isDone ? 'text-gold' : isCurrent ? 'text-status-info' : 'text-text-tertiary'
              }>
                {step.label}
                {isCurrent && resolutionProgress ? ` \u2014 ${resolutionProgress}` : ''}
              </span>
            </div>
          )
        })}

        {isComplete && (
          <div className="flex items-center gap-2 mt-2 text-gold">
            <span>{'\u2713'}</span>
            <span>Turn complete</span>
          </div>
        )}

        {isFailed && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-status-critical">
              <span>{'\u2717'}</span>
              <span>Pipeline failed{turnError ? `: ${turnError}` : ''}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-2xs font-mono uppercase tracking-wider bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors"
              >
                Retry Turn
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update any imports of DispatchLine or old Props**

Search for components importing `DispatchLine` or passing `lines`/`isRunning` props to `DispatchTerminal`. Update them to use the new Props interface (`onRetry` optional callback).

Run: `grep -rn "DispatchLine\|DispatchTerminal" components/ hooks/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."`

Fix each import site to remove references to `lines`, `isRunning`, `DispatchLine`.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (or note remaining errors for Task 7 to resolve in the route)

- [ ] **Step 4: Commit**

```bash
git add components/game/DispatchTerminal.tsx
git commit -m "refactor: DispatchTerminal reads phase checklist from GameProvider state"
```

---

### Task 7: Rewrite /advance route — instant response + background pipeline

**Files:**
- Modify: `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts`

**Reference (port logic from):**
- `app/api/game/turn/route.ts:29-410` — full orchestrator
- `lib/ai/actor-agent-runner.ts` — `runActorAgent`
- `lib/ai/resolution-engine.ts` — `runResolutionEngine`
- `lib/ai/judge-evaluator.ts` — `runJudge`, `JUDGE_THRESHOLD`
- `lib/ai/narrator.ts` — `runNarrator`
- `lib/game/state-engine.ts` — `getStateAtTurn`, `applyEventEffects`, `persistStateSnapshot`
- `lib/game/turn-helpers.ts` — `loadDecisionCatalog`, `buildTurnPlanFromIds`, `broadcastTurnEvent`, `computeBranchDivergence`

- [ ] **Step 1: Install @vercel/functions**

Run: `npm install @vercel/functions`

- [ ] **Step 2: Rewrite the route**

Replace the entire content of `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts` with the new implementation. The file structure:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStateAtTurn, applyEventEffects, persistStateSnapshot } from '@/lib/game/state-engine'
import { runActorAgent } from '@/lib/ai/actor-agent-runner'
import { runResolutionEngine } from '@/lib/ai/resolution-engine'
import { runJudge, JUDGE_THRESHOLD } from '@/lib/ai/judge-evaluator'
import { runNarrator } from '@/lib/ai/narrator'
import {
  loadDecisionCatalog,
  buildTurnPlanFromIds,
  broadcastTurnEvent,
  computeBranchDivergence,
} from '@/lib/game/turn-helpers'
import type { TurnPlan, Decision } from '@/lib/types/simulation'

// waitUntil keeps the serverless function alive after response is sent
let waitUntil: ((promise: Promise<unknown>) => void) | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vercelFunctions = require('@vercel/functions')
  waitUntil = vercelFunctions.waitUntil
} catch {
  // Not on Vercel — local dev, function stays alive naturally
}

function advanceDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const STALE_TURN_MINUTES = 5

// ── Background pipeline ─────────────────────────────────────────────────────

async function runFullPipeline(
  scenarioId: string,
  branchId: string,
  commitId: string,
  headCommitId: string,
  playerActorId: string | null,
  playerPrimaryAction: string,
  playerConcurrentActions: string[],
  turnNumber: number,
  simulatedDate: string,
) {
  const supabase = createServiceClient()

  try {
    // ── Broadcast: planning ──────────────────────────────────────────────
    await broadcastTurnEvent(branchId, 'turn_started', {
      turnNumber, simulatedDate, phase: 'planning',
    })

    // Update phase in DB
    await supabase.from('turn_commits').update({ current_phase: 'planning' }).eq('id', commitId)

    // ── Load actors + scenario context ───────────────────────────────────
    const [actorRes, scenarioRes] = await Promise.all([
      supabase
        .from('scenario_actors')
        .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
        .eq('scenario_id', scenarioId),
      supabase
        .from('scenarios')
        .select('name, description, critical_context')
        .eq('id', scenarioId)
        .single(),
    ])

    if (actorRes.error || !actorRes.data?.length) {
      throw new Error(`No actors found for scenario ${scenarioId}`)
    }

    const actorRows = actorRes.data
    const scenario = scenarioRes.data as Record<string, unknown> | null
    const scenarioContext = scenario
      ? `${scenario.name}: ${scenario.description ?? ''}${scenario.critical_context ? '\n' + scenario.critical_context : ''}`
      : 'Geopolitical simulation'

    // ── Load branch state + divergence ───────────────────────────────────
    const [branchState, branchDivergence] = await Promise.all([
      getStateAtTurn(branchId, headCommitId),
      computeBranchDivergence(supabase, branchId),
    ])

    // ── Load decision catalog + build player TurnPlan ────────────────────
    const decisionCatalog = loadDecisionCatalog(scenarioId)

    let playerTurnPlan: TurnPlan | null = null
    if (playerActorId && decisionCatalog[playerActorId]) {
      playerTurnPlan = buildTurnPlanFromIds(
        playerPrimaryAction, playerConcurrentActions, playerActorId, decisionCatalog
      )
    }

    // ── Run AI actor agents ──────────────────────────────────────────────
    const aiActors = actorRows.filter(
      a => a.id !== playerActorId && (decisionCatalog[a.id]?.length ?? 0) > 0
    )

    const aiPlanResults = await Promise.allSettled(
      aiActors.map(async (actor) => {
        const result = await runActorAgent({
          actorId: actor.id,
          actorProfile: actor as Parameters<typeof runActorAgent>[0]['actorProfile'],
          branchState,
          availableDecisions: decisionCatalog[actor.id],
          branchDivergence,
          simulatedDate,
          turnNumber,
        })
        return { actorId: actor.id, actorName: actor.name, turnPlan: result.turnPlan, rationale: result.rationale }
      })
    )

    const aiTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale: string }> = []
    for (const result of aiPlanResults) {
      if (result.status === 'fulfilled') aiTurnPlans.push(result.value)
      // Skip failed agents — resolution engine handles missing actors
    }

    const allTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }> = [
      ...aiTurnPlans,
    ]

    if (playerActorId && playerTurnPlan) {
      const playerActor = actorRows.find(a => a.id === playerActorId)
      allTurnPlans.push({
        actorId: playerActorId,
        actorName: playerActor?.name ?? playerActorId,
        turnPlan: playerTurnPlan,
        rationale: 'Player decision',
      })
    }

    // ── Broadcast: resolving ─────────────────────────────────────────────
    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: `${allTurnPlans.length} actor plan(s) generated`, phase: 'resolving',
    })
    await supabase.from('turn_commits').update({ current_phase: 'resolving' }).eq('id', commitId)

    const flatCatalog: Decision[] = Object.values(decisionCatalog).flat()

    // ── Resolution + Judge loop ──────────────────────────────────────────
    let resolution = await runResolutionEngine({
      turnPlans: allTurnPlans,
      branchState,
      decisionCatalog: flatCatalog,
      simulatedDate,
      turnNumber,
      scenarioContext,
    })

    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: 'Actions resolved — judging plausibility', phase: 'judging',
    })
    await supabase.from('turn_commits').update({ current_phase: 'judging' }).eq('id', commitId)

    let judgeResult = await runJudge({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      simulatedDate,
      turnNumber,
      scenarioContext,
    })

    if (judgeResult.verdict === 'retry' || judgeResult.score < JUDGE_THRESHOLD) {
      resolution = await runResolutionEngine({
        turnPlans: allTurnPlans,
        branchState,
        decisionCatalog: flatCatalog,
        simulatedDate,
        turnNumber,
        scenarioContext,
        judgeCorrection: judgeResult.critique,
      })
      const retryJudge = await runJudge({
        turnPlans: allTurnPlans,
        effects: resolution.effects,
        headline: resolution.headline,
        narrativeSummary: resolution.narrativeSummary,
        simulatedDate,
        turnNumber,
        scenarioContext,
      })
      judgeResult = { ...retryJudge, verdict: 'accept' }
    }

    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: `Judge score: ${judgeResult.score} — accepted`, phase: 'narrating',
    })
    await supabase.from('turn_commits').update({ current_phase: 'narrating' }).eq('id', commitId)

    // ── Narrator ─────────────────────────────────────────────────────────
    const narration = await runNarrator({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      judgeScore: judgeResult.score,
      judgeCritique: judgeResult.critique,
      simulatedDate,
      turnNumber,
      scenarioContext,
      escalationChanges: resolution.escalationChanges,
    })

    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: 'Narrative generated — finalizing', phase: 'finalizing',
    })
    await supabase.from('turn_commits').update({ current_phase: 'finalizing' }).eq('id', commitId)

    // ── Persist state ────────────────────────────────────────────────────
    const newState = applyEventEffects(branchState, resolution.effects)
    await persistStateSnapshot(scenarioId, branchId, commitId, newState)

    // ── Update turn_commit with full results ─────────────────────────────
    await supabase.from('turn_commits').update({
      current_phase: 'complete',
      planning_phase: { turnPlans: allTurnPlans },
      resolution_phase: {
        effects: resolution.effects,
        escalationChanges: resolution.escalationChanges,
        narrativeSummary: resolution.narrativeSummary,
      },
      judging_phase: {
        score: judgeResult.score,
        critique: judgeResult.critique,
        verdict: judgeResult.verdict,
      },
      narrative_entry: narration.fullBriefing,
      full_briefing: narration.fullBriefing,
      chronicle_headline: narration.chronicleHeadline,
    }).eq('id', commitId)

    // ── Advance branch head ──────────────────────────────────────────────
    await supabase.from('branches').update({
      head_commit_id: commitId,
      updated_at: new Date().toISOString(),
    }).eq('id', branchId)

    // ── Broadcast: complete ──────────────────────────────────────────────
    await broadcastTurnEvent(branchId, 'turn_completed', {
      commitId, turnNumber, phase: 'complete',
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error'
    console.error('[advance/pipeline]', message)

    try {
      await supabase.from('turn_commits').update({ current_phase: 'failed' }).eq('id', commitId)
      await broadcastTurnEvent(branchId, 'turn_failed', { error: message, phase: 'failed' })
    } catch (broadcastErr) {
      console.error('[advance/pipeline] failed to broadcast failure:', broadcastErr)
    }
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id: scenarioId, branchId } = params

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { primaryAction: string; concurrentActions: string[]; controlledActors?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.primaryAction) {
    return NextResponse.json({ error: 'primaryAction is required' }, { status: 400 })
  }

  // ── Authenticate ────────────────────────────────────────────────────────
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()

  const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!user && authConfigured && !devMode) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── Load branch ─────────────────────────────────────────────────────────
  const supabase = createServiceClient()

  const { data: branch, error: branchErr } = await supabase
    .from('branches')
    .select('id, head_commit_id, scenario_id, user_controlled_actors, created_by')
    .eq('id', branchId)
    .single()

  if (branchErr || !branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  const branchRow = branch as {
    id: string; head_commit_id: string | null; scenario_id: string;
    user_controlled_actors: string[]; created_by: string | null
  }

  // ── Authorize ───────────────────────────────────────────────────────────
  const isOwner = user ? branchRow.created_by === user.id : devMode

  if (!isOwner) {
    const { data: scenarioMeta } = await supabase
      .from('scenarios').select('visibility').eq('id', branchRow.scenario_id).single()
    const isPublic = (scenarioMeta as Record<string, unknown> | null)?.visibility === 'public'
    if (!isPublic) {
      return NextResponse.json({ error: 'Access denied: private scenario' }, { status: 403 })
    }
  }

  const headCommitId = branchRow.head_commit_id
  if (!headCommitId) {
    return NextResponse.json({ error: 'Branch has no head commit' }, { status: 400 })
  }

  // ── Check duplicate submission ──────────────────────────────────────────
  const { data: inProgress } = await supabase
    .from('turn_commits')
    .select('id, created_at')
    .eq('branch_id', branchId)
    .not('current_phase', 'in', '("complete","failed")')
    .limit(1)

  if (inProgress && inProgress.length > 0) {
    const createdAt = new Date((inProgress[0] as Record<string, unknown>).created_at as string)
    const staleThreshold = Date.now() - STALE_TURN_MINUTES * 60 * 1000
    if (createdAt.getTime() > staleThreshold) {
      return NextResponse.json({ error: 'Turn already in progress' }, { status: 409 })
    }
    // Stale turn — mark as failed and allow new submission
    await supabase.from('turn_commits')
      .update({ current_phase: 'failed' })
      .eq('id', (inProgress[0] as Record<string, unknown>).id as string)
  }

  // ── Load head commit for turn number ────────────────────────────────────
  const { data: headCommit } = await supabase
    .from('turn_commits')
    .select('turn_number, simulated_date')
    .eq('id', headCommitId)
    .single()

  const prevTurn = (headCommit as Record<string, unknown> | null)?.turn_number as number ?? 0
  const prevDate = (headCommit as Record<string, unknown> | null)?.simulated_date as string ?? '2026-03-04'
  const newTurnNumber = prevTurn + 1
  const newSimDate = advanceDate(prevDate, 7)

  // ── Insert turn_commit ──────────────────────────────────────────────────
  const { data: newCommit, error: insertErr } = await supabase
    .from('turn_commits')
    .insert({
      branch_id: branchId,
      parent_commit_id: headCommitId,
      turn_number: newTurnNumber,
      simulated_date: newSimDate,
      scenario_snapshot: {},
      planning_phase: { primaryAction: body.primaryAction, concurrentActions: body.concurrentActions },
      current_phase: 'submitted',
      is_ground_truth: false,
    })
    .select('id')
    .single()

  if (insertErr || !newCommit) {
    return NextResponse.json({ error: `Failed to create turn: ${insertErr?.message}` }, { status: 500 })
  }

  const commitId = (newCommit as { id: string }).id
  const playerActorId = body.controlledActors?.[0] ?? null

  // ── Fire background pipeline ────────────────────────────────────────────
  const pipelinePromise = runFullPipeline(
    scenarioId, branchId, commitId, headCommitId,
    playerActorId, body.primaryAction, body.concurrentActions ?? [],
    newTurnNumber, newSimDate,
  )

  if (waitUntil) {
    waitUntil(pipelinePromise)
  } else {
    void pipelinePromise
  }

  // ── Instant response ────────────────────────────────────────────────────
  return NextResponse.json({
    turnCommitId: commitId,
    turnNumber: newTurnNumber,
    simulatedDate: newSimDate,
    status: 'processing' as const,
  })
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/scenarios/[id]/branches/[branchId]/advance/route.ts package.json package-lock.json
git commit -m "feat: rewrite /advance with instant response + background AI pipeline via waitUntil"
```

---

### Task 8: Add DB migration for turn_phase enum

**Files:**
- Create: `supabase/migrations/20260415000000_turn_phase_enum.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add new turn_phase values for the full pipeline
-- Existing: 'planning', 'resolution', 'reaction', 'judging', 'complete'
-- Adding: 'submitted', 'resolving', 'narrating', 'finalizing', 'failed'

ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'submitted' BEFORE 'planning';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'resolving' AFTER 'planning';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'narrating' AFTER 'judging';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'finalizing' AFTER 'narrating';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'failed' AFTER 'complete';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260415000000_turn_phase_enum.sql
git commit -m "feat: add new turn_phase enum values for full pipeline"
```

---

### Task 9: Write integration tests for /advance

**Files:**
- Create: `tests/api/advance.test.ts`

- [ ] **Step 1: Write integration tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  }),
}))

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'commit-1' }, error: null }) })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
const mockEq = vi.fn()
const mockNot = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'branches') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'branch-1', head_commit_id: 'head-1', scenario_id: 'sc-1', user_controlled_actors: [], created_by: 'user-1' },
                error: null,
              }),
            })),
          })),
          update: mockUpdate,
        }
      }
      if (table === 'turn_commits') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((col: string, val: string) => {
              if (val === 'head-1') return { single: vi.fn().mockResolvedValue({ data: { turn_number: 3, simulated_date: '2026-04-01' }, error: null }) }
              return { single: mockSingle }
            }),
            not: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
          })),
          insert: mockInsert,
          update: mockUpdate,
        }
      }
      return { select: mockSelect }
    }),
    channel: vi.fn(() => ({ send: vi.fn().mockResolvedValue('ok') })),
  })),
}))

// Mock AI modules to prevent real API calls
vi.mock('@/lib/ai/actor-agent-runner', () => ({ runActorAgent: vi.fn() }))
vi.mock('@/lib/ai/resolution-engine', () => ({ runResolutionEngine: vi.fn() }))
vi.mock('@/lib/ai/judge-evaluator', () => ({ runJudge: vi.fn(), JUDGE_THRESHOLD: 40 }))
vi.mock('@/lib/ai/narrator', () => ({ runNarrator: vi.fn() }))
vi.mock('@/lib/game/state-engine', () => ({
  getStateAtTurn: vi.fn(),
  applyEventEffects: vi.fn(),
  persistStateSnapshot: vi.fn(),
}))

describe('POST /api/scenarios/[id]/branches/[branchId]/advance', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    vi.stubEnv('NEXT_PUBLIC_DEV_MODE', 'true')
  })

  it('returns instant response with processing status', async () => {
    const { POST } = await import('@/app/api/scenarios/[id]/branches/[branchId]/advance/route')

    const request = new Request('http://localhost:3000/api/scenarios/sc-1/branches/branch-1/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryAction: 'expand-air', concurrentActions: [], controlledActors: ['united_states'] }),
    })

    const response = await POST(request as never, { params: { id: 'sc-1', branchId: 'branch-1' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('turnCommitId')
    expect(body).toHaveProperty('status', 'processing')
    expect(body).toHaveProperty('turnNumber', 4)
  })

  it('returns 400 when primaryAction is missing', async () => {
    const { POST } = await import('@/app/api/scenarios/[id]/branches/[branchId]/advance/route')

    const request = new Request('http://localhost:3000/api/scenarios/sc-1/branches/branch-1/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurrentActions: [] }),
    })

    const response = await POST(request as never, { params: { id: 'sc-1', branchId: 'branch-1' } })
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm test -- --run tests/api/advance.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/api/advance.test.ts
git commit -m "test: add integration tests for /advance instant-response flow"
```

---

### Task 10: Delete /api/game/turn/route.ts + final verification

**Files:**
- Delete: `app/api/game/turn/route.ts`

- [ ] **Step 1: Verify no remaining imports of the deleted file**

Run: `grep -rn "api/game/turn" app/ components/ hooks/ lib/ tests/ --include="*.ts" --include="*.tsx" | grep -v node_modules`

Expected: No results (or only references in docs/specs which are fine).

- [ ] **Step 2: Delete the file**

```bash
rm app/api/game/turn/route.ts
```

If `app/api/game/turn/` directory is now empty, remove it:
```bash
rmdir app/api/game/turn/ 2>/dev/null; rmdir app/api/game/ 2>/dev/null
```

- [ ] **Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: ALL PASS

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: delete /api/game/turn — logic folded into /advance"
```

- [ ] **Step 7: Final verification — start dev server and test**

Run: `npm run dev`

Navigate to `http://localhost:3000/scenarios/iran-2026`, enter the play page, and verify:
- DispatchTerminal shows phase checklist (not teletype lines)
- No console errors on page load
- Submit button is present (actual AI pipeline execution requires ANTHROPIC_API_KEY)
