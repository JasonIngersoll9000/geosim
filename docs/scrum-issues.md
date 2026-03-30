# GeoSim Scrum Workflow & GitHub Issues

> Last updated: 2026-03-27. Sprint 2 Stitch frontend migration complete.
> Target state: Full playable game with Iran scenario AI turns.

---

## Completed Work

### Sprint 1 — Foundation ✅
Issues #1–#8 closed. Next.js scaffolding, Supabase schema, TypeScript types,
Vitest setup, fog of war, escalation logic, state updates, TurnPlan validation.

### Sprint 2 — Stitch Frontend Migration ✅
Issues #20–#26 closed. All 14 tasks complete.
Branch: `feature/stitch-frontend-migration`

Components built:
- Design tokens (Space Grotesk, Newsreader, IBM Plex Mono, gold #ffba20)
- UI primitives: TopBar, ClassificationBanner, DocumentIdHeader, SectionDivider,
  Badge, Button, ScoreDisplay, ProgressBar, SlideOverPanel
- Game components: EscalationLadder, ActorAvatar, DimensionTag, IntelligenceReportBlock
- War Chronicle: TurnEntry, GlobalTicker, ChronicleTimeline
- Map shell: GameMap, ActorLayer, ChokepointMarker, FloatingMetricChip, MapLegend
- Actor panels: ActorList, ActorDetailPanel, GlobalIndicators
- Decision panels: DecisionCatalog, TurnPlanBuilder, DecisionDetailPanel
- DispatchTerminal (turn resolution animation)
- EventsTab, ObserverOverlay
- Full GameView layout (two-column, mock-wired)
- Realtime shell (useRealtime hook, GameProvider)
- Scenario Hub page (`/scenarios/[id]`) with ActorCard, tab switching
- Scenario Browser page (`/scenarios`) with category filter

---

## Remaining Work — Ordered by Dependency

### PHASE A: Foundation for Real Data

**Issue #52: Iran scenario Supabase seed**
Title: `feat: Seed Iran conflict 2025-2026 scenario into Supabase`
Labels: `P0-critical`, `backend`

Seed all Iran scenario data into Supabase so the frontend can drop mock data.

Files:
- Create: `scripts/seed-iran-scenario.ts`
- Create: `supabase/seed.sql`

Data to seed:
- `scenarios`: id='iran-2026', name='US-Israel-Iran Conflict 2025-2026', status='active', turn_number=4
- `actors`: united_states, iran, israel, russia, china, gulf_states (state JSON matching `lib/types/simulation.ts`)
- `branches`: id='trunk', scenario_id='iran-2026'
- `scenario_commits`: turns 1–4 matching MOCK_CHRONICLE_ENTRIES in GameView.tsx
- `decisions`: 7 decisions matching MOCK_DECISIONS in GameView.tsx

Acceptance criteria:
- [ ] `bun run seed` populates all tables without error
- [ ] All 6 actors exist with correct escalation rungs (US:5, Iran:6, Israel:6, Russia:1, China:1, Gulf:2)
- [ ] Branch 'trunk' exists at turn 4

---

**Issue #53: Wire scenario hub and play view to real Supabase data**
Title: `feat: Replace frontend mock data with Supabase queries`
Labels: `P0-critical`, `frontend`
Depends on: #52

Replace MOCK_* constants in GameView.tsx and scenario hub with real Supabase queries.

Files:
- Modify: `app/scenarios/[id]/page.tsx` (fetch real actors from Supabase)
- Modify: `app/scenarios/[id]/play/[branchId]/page.tsx` (fetch branch + snapshot)
- Modify: `components/game/GameView.tsx` (remove mock data, receive props)
- Create: `lib/queries/scenario.ts` (reusable server-side query functions)

Acceptance criteria:
- [ ] Scenario hub shows real actors from Supabase
- [ ] Chronicle timeline shows real events from scenario_commits
- [ ] Play view loads correct branch data
- [ ] Mock data constants removed from components

---

**Issue #54: Landing page**
Title: `feat: Landing page with product explanation and CTA`
Labels: `P1-important`, `frontend`

Replace the current design-system showcase home page with a real landing page.
Current `app/page.tsx` is a component demo — visitors have no idea what GeoSim is.

Per `docs/frontend-design.md` "Declassified War Room" concept:
- Hero: classified document aesthetic, dramatic framing of the Iran conflict
- Value prop: "AI-powered strategic simulation" — what it is, who it's for
- Single CTA: "Enter the Simulation" → /scenarios
- Stats: "6 actors, 14 decisions, AI resolution engine"

Files:
- Modify: `app/page.tsx` (full rewrite as landing page, remove component showcase)

Acceptance criteria:
- [ ] Visitor understands what GeoSim is without scrolling
- [ ] Single clear CTA navigates to /scenarios
- [ ] Passes `geosim-uiux-validation` skill (all 4 categories)

---

**Issue #55: Animations pass**
Title: `feat: Add entrance animations and premium motion to all pages`
Labels: `P0-critical`, `frontend`

The app looks good statically but feels dead. Add intentional motion.

Required animations:
- `app/page.tsx`: hero content fades in on load
- `app/scenarios/page.tsx`: scenario cards stagger-fade on mount
- `app/scenarios/[id]/page.tsx`: actor cards stagger-fade on tab switch
- `components/chronicle/TurnEntry.tsx`: entries slide in from left on mount
- `components/chronicle/GlobalTicker.tsx`: continuous auto-scroll (CSS marquee or JS)
- `components/panels/ActorDetailPanel.tsx`: slide from right (if not already)
- `components/game/DispatchTerminal.tsx`: new lines animate in
- All buttons: `active:scale-[0.97]` press state
- `components/panels/DecisionCatalog.tsx`: hover reveals DimensionTag with fade

Acceptance criteria:
- [ ] All listed animations implemented
- [ ] Nothing feels abrupt or cheap
- [ ] Animations don't delay interactions (< 300ms entries, instant clicks)
- [ ] Passes `geosim-uiux-validation` CAT 2 (animations) with user approval

---

### PHASE B: AI Pipeline (can work in parallel with Phase A)

**Issue #56: Research pipeline API**
Title: `feat: Iran scenario research pipeline — all 7 stages`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #52

Implement the 7-stage research pipeline per `docs/research-pipeline.md`.

Files:
- Modify: `app/api/scenarios/[id]/research/route.ts`
- Create: `lib/ai/research-pipeline.ts`
- Create: `lib/ai/prompts/research.ts`
- Create: `tests/api/research-pipeline.test.ts`

Acceptance criteria:
- [ ] POST /api/scenarios/[id]/research triggers all 7 stages
- [ ] Each stage output stored in Supabase
- [ ] Prompt caching applied to stable stage prompts
- [ ] Tests verify pipeline runs on mock Claude responses

---

**Issue #57: Actor agent with prompt caching**
Title: `feat: Actor agent — turn plan generation with prompt caching`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #56

Files:
- Modify: `app/api/ai/actor/route.ts`
- Create: `lib/ai/actor-agent.ts`
- Create: `lib/ai/prompts/actor.ts`
- Create: `tests/api/actor-agent.test.ts`

Acceptance criteria:
- [ ] Each actor generates a valid TurnPlan JSON
- [ ] NEUTRALITY_PREAMBLE from `docs/prompt-library.ts` injected for every actor
- [ ] Prompt caching reduces token cost on second call by ≥ 60%
- [ ] TurnPlan passes `lib/game/turn-plan.ts` validation

---

**Issue #58: Resolution engine**
Title: `feat: Resolution engine — process all actor TurnPlans into outcomes`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #57

Files:
- Modify: `app/api/branches/[branchId]/resolve/route.ts`
- Create: `lib/ai/resolution-engine.ts`
- Create: `tests/api/resolution-engine.test.ts`

Acceptance criteria:
- [ ] All actor plans processed together
- [ ] Outputs EventImpact objects matching `lib/types/simulation.ts`
- [ ] `applyEventImpact` from `lib/game/state-updates.ts` applied to scenario state

---

**Issue #59: Judge evaluator with retry loop**
Title: `feat: Judge agent — evaluate resolution quality with retry`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #58

Evaluator-optimizer pattern. Score < 60 → retry. Max 3 retries.

Files:
- Modify: `app/api/ai/judge/route.ts`
- Create: `lib/ai/judge.ts`
- Create: `tests/api/judge.test.ts`

Acceptance criteria:
- [ ] Judge returns score 0–100 with dimension breakdown
- [ ] Resolution retries if score < 60 (max 3 attempts)
- [ ] Judge scores stored in scenario_commits table

---

**Issue #60: Narrator — chronicle writer**
Title: `feat: Narrator agent — generate chronicle entries from resolution`
Labels: `P1-important`, `ai-pipeline`, `backend`
Depends on: #59

Files:
- Modify: `app/api/ai/narrator/route.ts`
- Create: `lib/ai/narrator.ts`
- Create: `tests/api/narrator.test.ts`

Acceptance criteria:
- [ ] Narrator produces EntryData JSON (turnNumber, date, title, narrative, severity, tags)
- [ ] Output stored as scenario_commit with chronicle_entry field
- [ ] Severity chosen by AI based on event magnitude

---

**Issue #61: Game loop controller — full turn**
Title: `feat: Game loop controller — orchestrate full turn end-to-end`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #57, #58, #59, #60

Orchestrator: collect plans → resolve → judge → retry → narrate → commit.
Broadcasts progress via Supabase Realtime.

Files:
- Modify: `app/api/branches/[branchId]/advance/route.ts`
- Create: `lib/game/game-loop.ts`
- Create: `tests/game/game-loop.test.ts`

Acceptance criteria:
- [ ] POST /api/branches/[branchId]/advance runs full turn
- [ ] Supabase Realtime broadcasts: turn_started, resolution_progress, turn_completed
- [ ] New scenario_commit created with turn results
- [ ] DispatchTerminal shows live progress from Realtime events
- [ ] Turn number increments in Supabase

---

### PHASE C: Player Interaction (depends on Phases A + B)

**Issue #62: Turn plan submission flow**
Title: `feat: Player turn submission — TurnPlanBuilder → game loop trigger`
Labels: `P0-critical`, `frontend`
Depends on: #53, #61

Wire TurnPlanBuilder's submit button to POST TurnPlan and trigger game loop.

Files:
- Modify: `components/panels/TurnPlanBuilder.tsx` (add onSubmit handler)
- Modify: `components/game/GameView.tsx` (handle submit, show loading in DispatchTerminal)
- Create: `hooks/useSubmitTurn.ts`

Acceptance criteria:
- [ ] Player selects primary decision + optional concurrent actions
- [ ] Submit POSTs to /api/branches/[branchId]/advance
- [ ] DispatchTerminal shows "SUBMITTING TURN PLAN..." while waiting
- [ ] ChronicleTimeline updates with new entry on completion
- [ ] TurnPlanBuilder resets after submission

---

**Issue #63: Branching — create alternate branches**
Title: `feat: Branch creation — player diverges from trunk`
Labels: `P1-important`, `backend`
Depends on: #61

Files:
- Modify: `app/api/branches/route.ts` (POST to create branch)
- Create: `app/scenarios/[id]/branches/page.tsx` (branch list UI)

Acceptance criteria:
- [ ] POST /api/branches creates branch from given commit_id
- [ ] Branch list page shows all branches for a scenario
- [ ] New branch is playable at /scenarios/[id]/play/[newBranchId]

---

**Issue #64: Mapbox Tier 1 — real map implementation**
Title: `feat: Mapbox GL — country fills, chokepoint markers, actor positions`
Labels: `P1-important`, `frontend`
Depends on: #53

Files:
- Modify: `components/map/GameMap.tsx` (add Mapbox GL JS initialization)
- Modify: `components/map/ActorLayer.tsx` (render actor positions)
- Modify: `components/map/ChokepointMarker.tsx` (render Hormuz, Bab-el-Mandeb)

Acceptance criteria:
- [ ] Dark map renders in play view (no placeholder)
- [ ] Iran, US (carrier), Israel, Gulf States positions shown
- [ ] Strait of Hormuz marker visible with CLOSED status
- [ ] FloatingMetricChip overlays positioned correctly

---

### PHASE D: Auth & Infrastructure

**Issue #65: Real authentication flow**
Title: `feat: Supabase Auth — replace dev bypass with real auth`
Labels: `P1-important`, `infrastructure`

Files:
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/callback/route.ts`
- Modify: `middleware.ts` (real auth check)

Acceptance criteria:
- [ ] Users can sign in via Supabase Auth
- [ ] Unauthenticated users redirected to /auth/login
- [ ] Dev bypass still works when NEXT_PUBLIC_DEV_MODE=true

---

**Issue #66: CI/CD pipeline**
Title: `feat: GitHub Actions CI with Vitest, typecheck, lint`
Labels: `P0-critical`, `infrastructure`

Files:
- Create: `.github/workflows/ci.yml`

Acceptance criteria:
- [ ] CI runs on every PR
- [ ] Failed typecheck or tests blocks merge
- [ ] Vitest runs in < 2 minutes

---

## Dependency Chain

```
#52 (seed)
  └── #53 (real data wiring)
        └── #62 (turn submission)
        └── #64 (Mapbox)

#52 (seed)
  └── #56 (research pipeline)
        └── #57 (actor agent)
              └── #58 (resolution engine)
                    └── #59 (judge)
                          └── #60 (narrator)
                                └── #61 (game loop)
                                      └── #62 (turn submission)
                                      └── #63 (branching)

Independent (can start any time):
  #54 (landing page)
  #55 (animations)
  #65 (auth)
  #66 (CI/CD)
```

## Feature Alignment

| Feature | Issue | Status |
|---------|-------|--------|
| Infrastructure + game logic | #1–#8 | Done |
| Design tokens + UI primitives | Sprint 2 | Done |
| Game components + panels | Sprint 2 | Done |
| War Chronicle | Sprint 2 | Done |
| Map shell | Sprint 2 | Done |
| GameView layout | Sprint 2 | Done |
| Scenario Hub + Browser | Sprint 2 | Done |
| Realtime shell | Sprint 2 | Done |
| Iran scenario seed | #52 | Pending |
| Real data wiring | #53 | Pending |
| Landing page | #54 | Pending |
| Animations pass | #55 | Pending |
| Research pipeline | #56 | Pending |
| Actor agent | #57 | Pending |
| Resolution engine | #58 | Pending |
| Judge evaluator | #59 | Pending |
| Narrator | #60 | Pending |
| Game loop controller | #61 | Pending |
| Turn submission | #62 | Pending |
| Branching UI | #63 | Pending |
| Mapbox Tier 1 | #64 | Pending |
| Auth | #65 | Pending |
| CI/CD | #66 | Pending |
