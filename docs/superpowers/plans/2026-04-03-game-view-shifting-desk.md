# Game View — The Shifting Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the monolithic `GameView.tsx` into a phase-driven "Shifting Desk" layout where the UI transforms based on the current game phase — narrative-dominant for briefing/decisions, strategic for resolution/overview.

**Architecture:** A `PhaseRouter` component derives a `displayPhase` from `GameContext.turnPhase` + local state, then renders the appropriate phase layout component. Each phase component composes existing building blocks (DispatchTerminal, GameMap, DecisionCatalog, ChronicleTimeline, etc.) in phase-specific layouts. New components: `AdvisorCard`, `MoodTag`, `BriefingPhase`, `DecisionPhase`, `ResolutionPhase`, `OverviewPhase`, `SessionSummary`, `Orientation`.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS, Framer Motion, Stitch design tokens

**Spec:** `docs/superpowers/specs/2026-03-30-game-view-design.md` (on branch `feat/game-view-design`)

**Key existing files:**
- `components/game/GameView.tsx` — current monolith (570 lines, will be refactored)
- `components/providers/GameProvider.tsx` — game state context
- `components/layout/GameLayout.tsx` — split-screen layout with MapSide/PanelSide
- `components/game/DispatchTerminal.tsx` — terminal with animated lines
- `components/game/ConstraintCascadeAlert.tsx` — cascade warning
- `components/map/GameMap.tsx` — Mapbox map wrapper
- `components/panels/DecisionCatalog.tsx` — decision list
- `components/chronicle/ChronicleTimeline.tsx` — chronicle entries
- `app/scenarios/[id]/play/[branchId]/page.tsx` — play page (server component)

---

### Task 1: Create MoodTag and AdvisorCard Components

**Files:**
- Create: `components/game/MoodTag.tsx`
- Create: `components/game/AdvisorCard.tsx`
- Create: `tests/components/game/AdvisorCard.test.tsx`

These are pure presentational components with no dependencies on game state.

- [ ] **Step 1: Write the failing test for AdvisorCard**

```tsx
// tests/components/game/AdvisorCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdvisorCard } from '@/components/game/AdvisorCard'

describe('AdvisorCard', () => {
  const advisor = {
    id: 'secdef',
    name: 'Secretary Williams',
    role: 'Department of Defense',
    initials: 'SW',
    color: 'var(--actor-us)',
    mood: 'hawkish' as const,
    quote: 'The air campaign is working.',
    recommendation: 'Intensify Air Campaign',
  }

  it('renders advisor name and role', () => {
    render(<AdvisorCard advisor={advisor} />)
    expect(screen.getByText('Secretary Williams')).toBeDefined()
    expect(screen.getByText('Department of Defense')).toBeDefined()
  })

  it('renders mood tag', () => {
    render(<AdvisorCard advisor={advisor} />)
    expect(screen.getByText('Hawkish')).toBeDefined()
  })

  it('renders quote in serif font', () => {
    render(<AdvisorCard advisor={advisor} />)
    const quote = screen.getByText(/air campaign/)
    expect(quote.className).toContain('font-serif')
  })

  it('renders recommendation line', () => {
    render(<AdvisorCard advisor={advisor} />)
    expect(screen.getByText(/Intensify Air Campaign/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/game/AdvisorCard.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MoodTag**

```tsx
// components/game/MoodTag.tsx
export type Mood = 'hawkish' | 'cautious' | 'concerned' | 'frustrated' | 'sidelined' | 'trusted'

const MOOD_STYLES: Record<Mood, { bg: string; color: string; border: string }> = {
  hawkish:    { bg: 'var(--status-critical-bg)', color: 'var(--status-critical)', border: 'var(--status-critical-border)' },
  cautious:   { bg: 'var(--status-info-bg)', color: 'var(--status-info)', border: 'var(--status-info-border)' },
  concerned:  { bg: 'var(--gold-dim)', color: 'var(--gold)', border: 'var(--gold-border)' },
  frustrated: { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: 'rgba(255,186,32,0.25)' },
  sidelined:  { bg: 'var(--bg-surface-high)', color: 'var(--text-tertiary)', border: 'var(--border-subtle)' },
  trusted:    { bg: 'var(--status-stable-bg)', color: 'var(--status-stable)', border: 'var(--status-stable-border)' },
}

interface Props {
  mood: Mood
}

export function MoodTag({ mood }: Props) {
  const s = MOOD_STYLES[mood]
  return (
    <span
      className="font-label text-[9px] font-medium px-2 py-0.5"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {mood.charAt(0).toUpperCase() + mood.slice(1)}
    </span>
  )
}
```

- [ ] **Step 4: Implement AdvisorCard**

```tsx
// components/game/AdvisorCard.tsx
import { MoodTag, type Mood } from './MoodTag'

export interface Advisor {
  id: string
  name: string
  role: string
  initials: string
  color: string
  mood: Mood
  quote: string
  recommendation: string
}

interface Props {
  advisor: Advisor
  className?: string
}

export function AdvisorCard({ advisor, className = '' }: Props) {
  return (
    <div
      className={`flex gap-3.5 p-4 border-l-[5px] ${className}`}
      style={{
        borderLeftColor: advisor.color,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Portrait */}
      <div
        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-label font-bold text-sm"
        style={{
          background: 'var(--bg-surface-high)',
          border: `2px solid ${advisor.color}`,
          color: advisor.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {advisor.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-label text-sm font-bold uppercase tracking-[0.02em] text-text-primary">
            {advisor.name}
          </span>
          <MoodTag mood={advisor.mood} />
        </div>
        <div className="font-mono text-[8px] text-text-tertiary tracking-[0.03em]">
          {advisor.role}
        </div>
        <div className="font-serif text-sm text-text-secondary leading-[1.7] mt-2">
          {advisor.quote}
        </div>
        <div className="font-mono text-[10px] text-gold tracking-[0.02em] mt-2">
          &#9654; Recommends: {advisor.recommendation}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run tests/components/game/AdvisorCard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add components/game/MoodTag.tsx components/game/AdvisorCard.tsx tests/components/game/AdvisorCard.test.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: add MoodTag and AdvisorCard components"
```

---

### Task 2: Create PhaseRouter Component

**Files:**
- Create: `components/game/PhaseRouter.tsx`
- Create: `tests/components/game/PhaseRouter.test.tsx`

This is the orchestration layer. It derives a `displayPhase` from `GameContext.turnPhase` and routes to the correct phase layout.

**Note:** The existing `GameLayout` (MapSide/PanelSide) is intentionally bypassed — each phase defines its own layout proportions. The exit button from `GameLayout` must be replicated as a fixed overlay in PhaseRouter itself (see implementation below).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/game/PhaseRouter.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhaseRouter } from '@/components/game/PhaseRouter'

// Mock phase components
vi.mock('@/components/game/phases/BriefingPhase', () => ({
  BriefingPhase: () => <div data-testid="briefing-phase">Briefing</div>,
}))
vi.mock('@/components/game/phases/DecisionPhase', () => ({
  DecisionPhase: () => <div data-testid="decision-phase">Decide</div>,
}))
vi.mock('@/components/game/phases/ResolutionPhase', () => ({
  ResolutionPhase: () => <div data-testid="resolution-phase">Resolution</div>,
}))
vi.mock('@/components/game/phases/OverviewPhase', () => ({
  OverviewPhase: () => <div data-testid="overview-phase">Overview</div>,
}))

// Mock GameProvider
const mockDispatch = vi.fn()
vi.mock('@/components/providers/GameProvider', () => ({
  useGame: () => ({
    state: { turnPhase: 'planning', turnNumber: 4 },
    dispatch: mockDispatch,
  }),
}))

describe('PhaseRouter', () => {
  it('renders BriefingPhase when turnPhase is planning and briefing not read', () => {
    render(<PhaseRouter branchId="b1" scenarioId="s1" />)
    expect(screen.getByTestId('briefing-phase')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/game/PhaseRouter.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create placeholder phase components**

Create four files with minimal exports so PhaseRouter can import them:

```tsx
// components/game/phases/BriefingPhase.tsx
'use client'
export function BriefingPhase({ onProceedToDecision }: { onProceedToDecision: () => void }) {
  return <div data-testid="briefing-phase">Briefing Phase — TODO</div>
}

// components/game/phases/DecisionPhase.tsx
'use client'
export function DecisionPhase({ onSubmit }: { onSubmit: () => void }) {
  return <div data-testid="decision-phase">Decision Phase — TODO</div>
}

// components/game/phases/ResolutionPhase.tsx
'use client'
export function ResolutionPhase({ onContinue }: { onContinue: () => void }) {
  return <div data-testid="resolution-phase">Resolution Phase — TODO</div>
}

// components/game/phases/OverviewPhase.tsx
'use client'
export function OverviewPhase({ onNextTurn }: { onNextTurn: () => void }) {
  return <div data-testid="overview-phase">Overview Phase — TODO</div>
}
```

- [ ] **Step 4: Implement PhaseRouter**

```tsx
// components/game/PhaseRouter.tsx
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useGame } from '@/components/providers/GameProvider'
import { BriefingPhase } from './phases/BriefingPhase'
import { DecisionPhase } from './phases/DecisionPhase'
import { ResolutionPhase } from './phases/ResolutionPhase'
import { OverviewPhase } from './phases/OverviewPhase'

export type DisplayPhase = 'briefing' | 'decide' | 'resolution' | 'overview'

interface Props {
  branchId: string
  scenarioId: string
}

export function PhaseRouter({ branchId, scenarioId }: Props) {
  const { state, dispatch } = useGame()
  const [hasReadBriefing, setHasReadBriefing] = useState(false)

  // Derive display phase from GameContext turnPhase + local state
  const displayPhase: DisplayPhase = (() => {
    if (state.turnPhase === 'planning') {
      return hasReadBriefing ? 'decide' : 'briefing'
    }
    if (state.turnPhase === 'complete') {
      return 'overview'
    }
    // resolution, reaction, judging → all show resolution phase
    return 'resolution'
  })()

  const handleProceedToDecision = useCallback(() => {
    setHasReadBriefing(true)
  }, [])

  const handleSubmitDecision = useCallback(() => {
    dispatch({ type: 'SET_TURN_PHASE', payload: 'resolution' })
  }, [dispatch])

  const handleResolutionContinue = useCallback(() => {
    dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })
  }, [dispatch])

  const handleNextTurn = useCallback(() => {
    setHasReadBriefing(false)
    dispatch({ type: 'RESET_TURN' })
  }, [dispatch])

  return (
    <div className="relative h-full">
      {/* Exit button — replaces GameLayout's exit overlay */}
      <Link
        href={`/scenarios/${scenarioId}`}
        className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all hover:text-text-primary"
        style={{ background: 'var(--bg-surface-low)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
      >
        ← EXIT
      </Link>

      {displayPhase === 'briefing' && <BriefingPhase onProceedToDecision={handleProceedToDecision} />}
      {displayPhase === 'decide' && <DecisionPhase onSubmit={handleSubmitDecision} />}
      {displayPhase === 'resolution' && <ResolutionPhase onContinue={handleResolutionContinue} />}
      {displayPhase === 'overview' && <OverviewPhase onNextTurn={handleNextTurn} />}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run tests/components/game/PhaseRouter.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/game/PhaseRouter.tsx components/game/phases/ tests/components/game/PhaseRouter.test.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: add PhaseRouter with display phase derivation"
```

---

### Task 3: Implement BriefingPhase

**Files:**
- Modify: `components/game/phases/BriefingPhase.tsx`
- Reuses: `AdvisorCard`, `ConstraintCascadeAlert`, `GameMap`, `SectionDivider`, `ProgressBar`

The narrative-dominant layout: 65% main panel (prose + advisors), 35% side panel (map + metrics).

- [ ] **Step 1: Implement BriefingPhase with mock advisor data**

```tsx
// components/game/phases/BriefingPhase.tsx
'use client'

import { GameMap } from '@/components/map/GameMap'
import { AdvisorCard, type Advisor } from '@/components/game/AdvisorCard'
import { ConstraintCascadeAlert } from '@/components/game/ConstraintCascadeAlert'
import { SectionDivider } from '@/components/ui/SectionDivider'
import { ProgressBar } from '@/components/ui/ProgressBar'

// Mock advisors — will be replaced by API data
const MOCK_ADVISORS: Advisor[] = [
  {
    id: 'secdef', name: 'Secretary Williams', role: 'Department of Defense',
    initials: 'SW', color: 'var(--actor-us)', mood: 'hawkish',
    quote: '"The air campaign is working — we\'ve degraded 40% of their command structure. But we\'re burning through Patriot stocks faster than Raytheon can build them. I recommend we intensify targeting on IRGC command nodes before our window closes."',
    recommendation: 'Intensify Air Campaign',
  },
  {
    id: 'statedept', name: 'Ambassador Chen', role: 'State Department — Oman Desk',
    initials: 'AC', color: 'var(--status-info)', mood: 'cautious',
    quote: '"The Omanis say Tehran\'s pragmatists want a way out. A 48-hour ceasefire tests their willingness. But we struck one day after the last diplomatic breakthrough. They have reason not to trust us."',
    recommendation: 'Backchannel Ceasefire via Oman',
  },
  {
    id: 'cia', name: 'Director Morrison', role: 'Central Intelligence Agency',
    initials: 'DM', color: 'var(--gold)', mood: 'concerned',
    quote: '"We\'ve lost track of the enriched uranium. Our best guess is 4-8 months to breakout — but that\'s a guess, not intelligence. SOF teams could narrow the search. But if detected, it accelerates their timeline."',
    recommendation: 'Covert Nuclear Search Operation',
  },
]

interface Props {
  onProceedToDecision: () => void
}

export function BriefingPhase({ onProceedToDecision }: Props) {
  return (
    <div className="flex h-full">
      {/* Main panel — narrative dominant (65%) */}
      <div className="flex-[1.8] overflow-y-auto p-6">
        <div className="font-mono text-[9px] text-text-tertiary tracking-[0.06em] uppercase mb-4">
          INTELLIGENCE BRIEFING // TURN 04 // 22 MARCH 2026 // SECRET
        </div>

        {/* Situation prose */}
        <div className="border-l-2 pl-5 py-1 mb-5" style={{ borderColor: 'var(--gold-border)' }}>
          <p className="font-serif text-base text-text-secondary leading-[1.8]">
            The war has settled into a grim rhythm. <strong className="text-text-primary font-medium">Iran&rsquo;s</strong> drone waves continue to arrive like clockwork &mdash; each Shahed-136 costing less than a used sedan, each forcing the expenditure of a $3 million Patriot interceptor. Your air defense reserves are at <strong className="text-text-primary font-medium">42% and falling</strong>. At current rates, you have eleven weeks before the shield is empty.
          </p>
        </div>

        <div className="border-l-2 pl-5 py-1 mb-5" style={{ borderColor: 'var(--status-critical-border)' }}>
          <p className="font-serif text-base text-text-secondary leading-[1.8]">
            The <strong className="text-text-primary font-medium">Strait of Hormuz</strong> remains blocked. Oil sits at <strong className="text-text-primary font-medium">$142 per barrel</strong>. Back home, your approval has dropped to <strong className="text-text-primary font-medium">31%</strong>. Both parties still back the war. The public does not.
          </p>
        </div>

        {/* Cascade alert */}
        <ConstraintCascadeAlert
          title="Nuclear Constraint Cascade — Active"
          steps={[
            { condition: 'Ayatollah killed by strike', constraintRemoved: 'Religious prohibition' },
            { condition: 'Attack already happening', constraintRemoved: 'Deterrence' },
          ]}
          likelihood={72}
          className="mb-5"
        />

        <SectionDivider title="Your Advisors" />

        {/* Advisor cards */}
        <div className="flex flex-col gap-3 mb-6">
          {MOCK_ADVISORS.map(advisor => (
            <AdvisorCard key={advisor.id} advisor={advisor} />
          ))}
        </div>

        {/* Proceed button */}
        <div className="text-center pb-6">
          <button
            onClick={onProceedToDecision}
            className="px-10 py-3 font-label text-xs font-semibold uppercase tracking-[0.04em] transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: 'var(--bg-base)' }}
          >
            Proceed to Decision &#8594;
          </button>
        </div>
      </div>

      {/* Side panel — context (35%) */}
      <div className="w-[320px] flex-shrink-0 overflow-y-auto border-l" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface-low)' }}>
        {/* Mini map */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="font-mono text-[8px] text-text-tertiary uppercase tracking-[0.06em] mb-2">
            Theater of Operations
          </div>
          <div className="h-[180px] rounded-none overflow-hidden">
            <GameMap />
          </div>
        </div>

        {/* Metrics */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="font-mono text-[8px] text-text-tertiary uppercase tracking-[0.06em] mb-3">
            Your Position
          </div>
          <MetricRow label="Air defense" value="42%" color="var(--status-critical)" pct={42} />
          <MetricRow label="Domestic support" value="31%" color="var(--status-critical)" pct={31} />
          <MetricRow label="Readiness" value="58%" color="var(--status-warning)" pct={58} />
          <MetricRow label="Nuclear window" value="4-8 months" color="var(--status-critical)" />
          <MetricRow label="Oil price" value="$142/bbl" color="var(--status-warning)" />
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color, pct }: { label: string; value: string; color: string; pct?: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center">
        <span className="font-sans text-[11px] text-text-secondary">{label}</span>
        <span className="font-mono text-[11px] font-medium" style={{ color }}>{value}</span>
      </div>
      {pct !== undefined && (
        <div className="mt-1"><ProgressBar value={pct} /></div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it renders without errors**

Run: `npm run typecheck`
Expected: No TypeScript errors in BriefingPhase.tsx

- [ ] **Step 3: Commit**

```bash
git add components/game/phases/BriefingPhase.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: implement BriefingPhase — narrative-lead layout with advisors"
```

---

### Task 4: Implement DecisionPhase

**Files:**
- Modify: `components/game/phases/DecisionPhase.tsx`
- Reuses: `AdvisorCard`, `DecisionCatalog`, `DecisionDetailPanel`, `TurnPlanBuilder`, `GameMap`, `ProgressBar`

Progressive disclosure: 3 advisor recommendations (Layer 1) → full catalog (Layer 2) → advanced TurnPlan (Layer 3).

- [ ] **Step 1: Implement DecisionPhase**

Use the existing `MOCK_DECISIONS` and `MOCK_DECISION_DETAILS` from `GameView.tsx` — extract them to a shared mock file, or for now, define inline. The component shows 3 prioritized recommendation cards (using advisor data), with "Browse All" opening the existing `DecisionCatalog` in a slide-over.

Key structure:
- Main panel (60%): doc ID header, section divider "Your Advisors Recommend", 3 decision cards with advisor portrait/mood, "Browse All" button, submit bar
- Side panel (40%): mini map + key metrics

Each recommendation card should be clickable (gold border on select). The submit bar shows selected decision name and Submit button.

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add components/game/phases/DecisionPhase.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: implement DecisionPhase — progressive disclosure with advisor recommendations"
```

---

### Task 5: Implement ResolutionPhase (Terminal + Chronicle)

**Files:**
- Modify: `components/game/phases/ResolutionPhase.tsx`
- Reuses: `DispatchTerminal`, `GameMap`, `ChronicleTimeline`

Two sequential beats: dispatch terminal alongside live map, then chronicle narrative.

- [ ] **Step 1: Implement ResolutionPhase with beat transitions**

Key structure:
- State: `beat: 'terminal' | 'chronicle'`
- Beat 1 layout: `<div className="flex h-full">` with terminal (flex-[1.5]) + map container (`<div className="w-[380px] h-full flex-shrink-0">` wrapping `<GameMap />`). Uses existing `DispatchTerminal` and `GameMap`. The map container MUST have explicit `h-full` to prevent GameMap collapsing to 0px. Shows "Read Chronicle" button when terminal completes.
- Beat 2 layout: full-width centered chronicle entry (max-width 660px). Uses existing `ChronicleTimeline` or a standalone `TurnEntry`. Shows "Continue to Overview" button.

The transition between beats: simple state flip when user clicks "Read Chronicle".

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add components/game/phases/ResolutionPhase.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: implement ResolutionPhase — terminal + chronicle two-beat layout"
```

---

### Task 6: Implement OverviewPhase

**Files:**
- Modify: `components/game/phases/OverviewPhase.tsx`
- Reuses: `GameMap`, `EscalationLadder`, `ProgressBar`, `SectionDivider`

Strategy-dominant layout: map (60%) + strategy panel (40%).

- [ ] **Step 1: Implement OverviewPhase**

Key structure:
- Map panel (flex 1.5): full `GameMap` component
- Strategy panel (380px): narrative summary (Newsreader 2 sentences), actor positions with colored dots and escalation rungs, "Your Position" metrics with deltas (e.g. "38% (was 42%)"), escalation ladder visualization, footer with "Next Turn" (primary), "Chronicle" (ghost), "Rewind" (ghost)

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add components/game/phases/OverviewPhase.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: implement OverviewPhase — strategy-lead with map dominant"
```

---

### Task 7: Wire PhaseRouter into PlayPage (Replace GameView)

**Files:**
- Modify: `app/scenarios/[id]/play/[branchId]/page.tsx`
- Modify: `components/game/GameView.tsx` (keep as fallback, rename to `GameViewLegacy.tsx`)

- [ ] **Step 1: Rename GameView.tsx to GameViewLegacy.tsx**

```bash
mv components/game/GameView.tsx components/game/GameViewLegacy.tsx
```

Update the export name inside the file to `GameViewLegacy`.

- [ ] **Step 2: Update PlayPage to use PhaseRouter**

```tsx
// app/scenarios/[id]/play/[branchId]/page.tsx
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { GameProvider } from '@/components/providers/GameProvider'
import { PhaseRouter } from '@/components/game/PhaseRouter'

interface Props {
  params: { id: string; branchId: string }
}

export default function PlayPage({ params }: Props) {
  return (
    <GameProvider>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar
        scenarioName="US-ISRAEL-IRAN CONFLICT 2025-2026"
        scenarioHref={`/scenarios/${params.id}`}
        turnNumber={4}
        totalTurns={12}
        phase="Planning"
      />
      <main className="h-screen pt-[66px] overflow-hidden">
        <PhaseRouter branchId={params.branchId} scenarioId={params.id} />
      </main>
    </GameProvider>
  )
}
```

- [ ] **Step 3: Verify the play page renders each phase**

Run: `npm run dev`
Navigate to `/scenarios/test/play/test-branch`
Click through: Briefing → Decide → (submit) → Resolution → Overview → Next Turn

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add app/scenarios/[id]/play/[branchId]/page.tsx components/game/GameViewLegacy.tsx components/game/PhaseRouter.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: wire PhaseRouter into PlayPage — phase-driven Shifting Desk layout"
```

---

### Task 8: Create Orientation Component

**Files:**
- Create: `components/game/Orientation.tsx`

4-step interactive walkthrough shown before the first briefing.

- [ ] **Step 1: Implement Orientation with 4 steps**

Steps:
1. Turn rhythm (4-beat diagram)
2. Escalation ladder (uses existing `EscalationLadder` component)
3. Fog of war (believed vs reality comparison)
4. "You Are the President" (scenario setup + cascade preview)

Navigation: dot progress indicator, "Continue" button, "Skip orientation" link.

- [ ] **Step 2: Wire into PhaseRouter — show before first briefing**

Add `showOrientation` state to PhaseRouter. If true, render Orientation instead of BriefingPhase. On completion/skip, set false and show briefing.

- [ ] **Step 3: Commit**

```bash
git add components/game/Orientation.tsx components/game/PhaseRouter.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: add Orientation — 4-step guided onboarding"
```

---

### Task 9: Create SessionSummary Component

**Files:**
- Create: `components/game/SessionSummary.tsx`

Presidential Daily Brief style end-of-session summary.

- [ ] **Step 1: Implement SessionSummary**

Content:
- Header: "End of Session Report" (Space Grotesk bold)
- Stat grid (3x2): escalations, de-escalations, casualties, war cost, oil price, approval
- Escalation path visualization: horizontal node chain showing rung per turn
- Narrative assessment (Newsreader serif): 2-3 paragraphs
- Advisor trust tracker: 3 cards (Trusted/Neutral/Sidelined + follow count)
- Disclaimer footer

- [ ] **Step 2: Add "Session Summary" button to OverviewPhase footer**

- [ ] **Step 3: Commit**

```bash
git add components/game/SessionSummary.tsx components/game/phases/OverviewPhase.tsx
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "feat: add SessionSummary — Presidential Daily Brief"
```

---

### Task 10: Polish and Integration Testing

**Files:**
- Modify: various phase components for visual refinement

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Fix any errors.

- [ ] **Step 2: Run all existing tests**

Run: `npm test -- --run`
Ensure no regressions.

- [ ] **Step 3: Manual walkthrough of complete flow**

Navigate to play page. Walk through:
1. Orientation (4 steps)
2. Briefing (read advisors)
3. Decide (select recommendation, submit)
4. Resolution (terminal → chronicle)
5. Overview (assess board, next turn)
6. Session summary

Verify layout shifts are smooth, typography is correct per Stitch tokens, no visual broken states.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Fix any issues.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit --author="Vartika Tewari <vartika.tewari@gmail.com>" -m "fix: polish phase transitions and integration"
```

- [ ] **Step 6: Push and create PR**

```bash
git push -u origin feat/game-view-shifting-desk
gh pr create --title "feat: Game View — Shifting Desk phase-driven layout" --body "..."
```
