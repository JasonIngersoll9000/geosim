# GeoSim Scrum Workflow & GitHub Issues

> Last updated: 2026-04-22. Node-centric branch live on preview. Decision generation working. New issues catalogued below.
> Target state: Full playable game with Iran scenario AI turns.
> Note: scrum doc uses projected issue numbers (#52–#66). Actual GitHub issue numbers are #27–#41.

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

### Sprint 3 — Real Data + AI Pipeline (in progress)

**Issue #27 (scrum #52): Iran scenario Supabase seed ✅ DONE**
- PR #48 merged — comprehensive Iran seed pipeline (actors, branches, turn_commits, actor_capabilities, actor_state_snapshots)
- 4MB enriched dataset, scripts/seed-iran-scenario.ts complete

**Issue #28 (scrum #53): Replace frontend mock data with Supabase queries ✅ DONE**
- PR #50 merged — async RSC play page, GameInitialData type, GameView wired to real data
- Bugs catalogued in docs/bugs/2026-04-09-playable-game-bugs.md (11 bugs, fix in progress)

**Issue #29 (scrum #54): Landing page ✅ DONE**
- Closed with PR #29/animations work

**Issue #30 (scrum #55): Animations pass ✅ DONE**
- Closed with Sprint 2 / PR #30

**Issue #39 (scrum #64): Mapbox GL — real implementation ✅ DONE**
- PR #46 (Sprint 3 asset layer) — 655 lines, real Mapbox GL, 30 positioned military assets,
  12 cities, actor status layer, AssetInfoPanel click-to-inspect (PR #50)

**Live State Engine ✅ DONE** (no scrum issue — added retroactively)
- PR #49 merged — lib/game/state-engine.ts, lib/game/threshold-evaluator.ts,
  lib/ai/actor-agent.ts (buildStateContextBlock), map-assets route, actor-panel route,
  lib/game/game-loop.ts integration points
- 179/179 tests passing

**Issues #10, #11, #12: App layout, UI components, Mapbox shell ✅ DONE**
- All completed during Sprint 2 Stitch migration — GitHub issues should be closed

---

## Remaining Work — Ordered by Dependency

### IMMEDIATE: Node-Centric Branch Issues (new — 2026-04-22)

**Context:** Preview deployment working. Scenario library loading. Decision generation functional. The following issues block a polished playable game.

**Bug A: Auth gets stuck depending on entry point**
- Reported: signing in from different pages leaves the user stuck (redirect loop or wrong destination)
- Middleware protects `/scenarios/*/play/*` but redirect chain from `/scenarios/[id]` → sign-in → back may not return correctly
- Fix: audit every place auth is triggered (`TopBar` sign-in button, middleware redirect, `BranchTree` "Take Control" gate) and ensure they all use `?redirect=` consistently and resolve to the intended post-auth destination

**Bug B: Game only loads from turn 115 — cannot navigate to earlier turns**
- The play page resolves `activeCommitId` from `branch.head_commit_id`, which is the LATEST turn. There is no UI affordance to jump to an earlier turn in the trunk history.
- The node navigation API (`GET /api/nodes/[commitId]` returns prev/next) exists but is not wired to a timeline scrubber or turn selector in GameView.
- The BranchTree in its current form shows branches but does not let the user click a past trunk commit to view that turn's state.
- Fix: wire the chronicle timeline or BranchTree so clicking a past turn commit sets `turnCommitId` in GameView and reloads actor state for that turn.

**Bug C: Selecting a decision shows "Turn 116 / No narrative recorded"**
- After forking (selecting a decision), the new branch's head commit has no `chronicle_entry` or `narrative_entry` yet — the advance pipeline runs in the background but the UI immediately navigates to the new branch and renders the empty turn.
- The chronicle field priority in the play page (`app/scenarios/[id]/play/[branchId]/page.tsx` ~line 387) uses `chronicle_entry ?? narrative_entry ?? 'No narrative recorded.'` but does NOT check `full_briefing`. This is a three-field priority that is only two-deep.
- Fix: (1) show a loading/pending state for the new turn while advance runs in background, (2) add `full_briefing` to the field priority chain, (3) update realtime handler to refresh the turn entry when advance completes.

**Bug D: Decision options appear in a popup modal instead of the Decisions panel tab**
- `TakeControlModal` is a modal dialog that shows the 6–8 AI-generated decisions. The mock UI had these in the Decisions tab of the right panel (`DecisionCatalog.tsx`).
- The modal UX is disorienting — it breaks the spatial logic of the game layout. Decisions should live in the Decisions tab, matching the mock.
- Fix: remove `TakeControlModal` as a modal; instead, when the user initiates "Take Control" for an actor, populate the Decisions tab with the fetched options and switch the panel to that tab.

**Bug E: UI/UX audit — broken/dead components in GameView**
From code review, the following are unconfirmed-working or dead:
1. `_setCascadeAlerts` — underscore-prefixed state setter, purpose unclear, may be dead code
2. `TakeControlModal` rendering — state `setTakeControlOpen` exists in GameView but the modal may not be rendered in the JSX
3. Ground truth timeline navigation (`gtIndex`, `gtHasNext`, `gtLoading`) — states set up but no UI handler visible
4. `maxEscalationRung` — computed from actorDetails but not visibly consumed
5. `componentViewerActorId` — derived actor ID for dossier panel, verify it actually drives ActorDetailPanel correctly
6. Any admin controls ("Run Research Update") must be hidden from non-admin users (Bug 5 from original 11-bug list, may still be present)
- Fix: systematic audit of GameView JSX — render each panel with real data, remove/fix anything that doesn't work

**Bug F: Vercel env var / Supabase branching (RESOLVED 2026-04-22)**
- Root cause: Supabase auto-created branch-specific env vars (`NEXT_PUBLIC_SUPABASE_URL = sjkzjklfhwiibkowuvie`) for `feat/node-centric-branches`, overriding the real project URL.
- Fix applied: deleted all branch-scoped Vercel env vars, disabled Supabase branching sync for Preview/Development, added server-only `SUPABASE_URL` to `createServiceClient` to avoid build-time baking.
- Status: ✅ RESOLVED

---

### IMMEDIATE: Bug Fixes (new — 2026-04-09)

**GH issue to create: Playable game bug fixes**
Title: `fix: Resolve 11 post-merge bugs blocking playable game`
Labels: `P0-critical`, `bug`, `frontend`, `backend`
See: `docs/bugs/2026-04-09-playable-game-bugs.md`

Bugs:
- Bug 1: `app/scenarios/[id]/page.tsx` actors query uses wrong column names (`id`, `country_code`) → 400
- Bug 2: `GameMap.tsx` still calls hardcoded `/api/scenarios/iran-2026/cities` → 500
- Bug 3: map-assets route returns 400 when `turnCommitId` missing (should fall back to actor_capabilities)
- Bug 4: Map shows only USS Nimitz (on land) — caused by Bug 3
- Bug 5: "Run Research Update" admin button exposed to all users
- Bug 6: TopBar hardcoded defaults `turnNumber=4, totalTurns=12`
- Bug 7: Actors tab blank in GameView (actors query mismatch)
- Bug 8: Chronicle empty (turn_commits query mismatch)
- Bug 9: Decisions panel visible in observer mode, US-only
- Bug 10: Actor status panel overlaps map layer toggles (CSS z-index)
- Bug 11: "Branch creation is not available yet" placeholder text visible

---

### PHASE B: AI Pipeline (depends on real data being stable)

**Issue #31 (scrum #56): Iran scenario research pipeline — all 7 stages**
Title: `feat: Iran scenario research pipeline — all 7 stages`
Labels: `P0-critical`, `ai-pipeline`, `backend`

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

**Issue #32 (scrum #57): Actor agent with prompt caching**
Title: `feat: Actor agent — full TurnPlan generation with prompt caching`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #31 (research pipeline)

Status: `buildStateContextBlock` done (PR #49). Full TurnPlan generation route missing.

Files:
- Modify: `app/api/ai/actor/route.ts`
- Modify: `lib/ai/actor-agent.ts` (add TurnPlan generation from context block)
- Create: `lib/ai/prompts/actor.ts`
- Create: `tests/api/actor-agent.test.ts`

Acceptance criteria:
- [ ] Each actor generates a valid TurnPlan JSON
- [ ] NEUTRALITY_PREAMBLE from `docs/prompt-library.ts` injected for every actor
- [ ] Prompt caching reduces token cost on second call by ≥ 60%
- [ ] TurnPlan passes `lib/game/turn-plan.ts` validation

---

**Issue #33 (scrum #58): Resolution engine**
Title: `feat: Resolution engine — process all actor TurnPlans into outcomes`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #32

Files:
- Create: `app/api/scenarios/[id]/branches/[branchId]/resolve/route.ts`
- Create: `lib/ai/resolution-engine.ts`
- Create: `tests/api/resolution-engine.test.ts`

Acceptance criteria:
- [ ] All actor plans processed together
- [ ] Outputs EventStateEffects matching `lib/types/simulation.ts`
- [ ] `onPlayerDecision` from `lib/game/game-loop.ts` called with resolved effects

---

**Issue #34 (scrum #59): Judge evaluator with retry loop**
Title: `feat: Judge agent — evaluate resolution quality with retry`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #33

Evaluator-optimizer pattern. Score < 60 → retry. Max 3 retries.

Files:
- Modify: `app/api/ai/judge/route.ts`
- Create: `lib/ai/judge.ts`
- Create: `tests/api/judge.test.ts`

Acceptance criteria:
- [ ] Judge returns score 0–100 with dimension breakdown
- [ ] Resolution retries if score < 60 (max 3 attempts)
- [ ] Judge scores stored in turn_commits table

---

**Issue #35 (scrum #60): Narrator — chronicle writer**
Title: `feat: Narrator agent — generate chronicle entries from resolution`
Labels: `P1-important`, `ai-pipeline`, `backend`
Depends on: #34

Files:
- Modify: `app/api/ai/narrator/route.ts`
- Create: `lib/ai/narrator.ts`
- Create: `tests/api/narrator.test.ts`

Acceptance criteria:
- [ ] Narrator produces ChronicleEntry JSON (turnNumber, date, title, narrative, severity, tags)
- [ ] Output stored as turn_commit with narrative_entry field
- [ ] Severity chosen by AI based on event magnitude

---

**Issue #36 (scrum #61): Game loop controller — full turn**
Title: `feat: Game loop controller — orchestrate full turn end-to-end`
Labels: `P0-critical`, `ai-pipeline`, `backend`
Depends on: #32, #33, #34, #35

Orchestrator: collect plans → resolve → judge → retry → narrate → commit.
Integration points already stubbed in `lib/game/game-loop.ts` (PR #49).

Files:
- Modify: `lib/game/game-loop.ts` (implement full orchestration)
- Modify: `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts` (call game loop)
- Create: `tests/game/game-loop.test.ts`

Acceptance criteria:
- [ ] POST /api/scenarios/[id]/branches/[branchId]/advance runs full turn with AI
- [ ] SSE streams real dispatch lines from resolution progress
- [ ] New turn_commit created with narrative_entry from narrator
- [ ] Turn number increments in Supabase

---

### PHASE C: Player Interaction

**Issue #37 (scrum #62): Turn plan submission flow**
Title: `feat: Player turn submission — TurnPlanBuilder → game loop trigger`
Labels: `P0-critical`, `frontend`
Depends on: #28 (bugs fixed), #36

Status: advance route and useSubmitTurn hook exist (PR #50). Full AI game loop not yet wired.

Files:
- Modify: `components/panels/TurnPlanBuilder.tsx` (verify submit wiring)
- Modify: `components/game/GameView.tsx` (handle AI response in DispatchTerminal)
- Modify: `hooks/useSubmitTurn.ts` (already updated in PR #50)

Acceptance criteria:
- [ ] Player selects primary decision + optional concurrent actions
- [ ] Submit POSTs to /api/scenarios/[id]/branches/[branchId]/advance
- [ ] DispatchTerminal shows real SSE dispatch lines from resolution
- [ ] ChronicleTimeline updates with AI-generated narrative on completion
- [ ] TurnPlanBuilder resets after submission

---

**Issue #38 (scrum #63): Branching — create alternate branches**
Title: `feat: Branch creation — player diverges from trunk`
Labels: `P1-important`, `backend`
Depends on: #36

Files:
- Modify or create: `app/api/scenarios/[id]/branches/route.ts` (POST to create branch)
- Modify: `components/scenario/BranchTree.tsx` (enable branch creation from a node)

Acceptance criteria:
- [ ] POST /api/scenarios/[id]/branches creates branch from given turn_commit_id
- [ ] New branch appears in BranchTree
- [ ] New branch is playable at /scenarios/[id]/play/[newBranchId]

---

### PHASE D: Auth & Infrastructure

**Issue #40 (scrum #65): Real authentication flow**
Title: `feat: Supabase Auth — replace dev bypass with real auth`
Labels: `P1-important`, `infrastructure`

Status: auth pages exist, dev bypass active. RLS enforced but bypass circumvents it.

Files:
- Modify: `middleware.ts` (enforce real auth check in non-dev mode)
- Verify: `app/auth/login/page.tsx`, `app/auth/callback/route.ts`

Acceptance criteria:
- [ ] Users can sign in via Supabase Auth
- [ ] Unauthenticated users redirected to /auth/login
- [ ] Dev bypass still works when NEXT_PUBLIC_DEV_MODE=true

---

**Issue #41 (scrum #66): CI/CD pipeline**
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
Bug fixes (new)
  └── Real data stable
        └── #37 (turn submission — full AI)

#31 (research pipeline)
  └── #32 (actor agent — TurnPlan)
        └── #33 (resolution engine)
              └── #34 (judge)
                    └── #35 (narrator)
                          └── #36 (game loop controller)
                                └── #37 (turn submission — full AI)
                                └── #38 (branching)

Independent (can start any time):
  #40 (auth)
  #41 (CI/CD)
```

## GitHub Issue → Scrum Doc Map

| GitHub # | Scrum # | Title | Status |
|----------|---------|-------|--------|
| #1–#9    | —       | Sprint 1 foundation | ✅ CLOSED |
| #10      | —       | App layout + routing | ✅ DONE (close) |
| #11      | —       | Shared UI components | ✅ DONE (close) |
| #12      | —       | Mapbox GL shell | ✅ DONE (close) |
| #18      | —       | Iran research incorporation | ✅ CLOSED |
| #20–#25  | —       | Sprint 2 Stitch migration | ✅ CLOSED |
| #27      | #52     | Iran seed | ✅ DONE → close, link PR #48 |
| #28      | #53     | Wire real data | ✅ DONE → close, link PR #50 |
| #29      | #54     | Landing page | ✅ CLOSED |
| #30      | #55     | Animations | ✅ CLOSED |
| #31      | #56     | Research pipeline | 🔲 OPEN |
| #32      | #57     | Actor agent | 🔲 OPEN (partial) |
| #33      | #58     | Resolution engine | 🔲 OPEN |
| #34      | #59     | Judge agent | 🔲 OPEN |
| #35      | #60     | Narrator | 🔲 OPEN |
| #36      | #61     | Game loop controller | 🔲 OPEN |
| #37      | #62     | Turn submission | 🔲 OPEN (partial) |
| #38      | #63     | Branch creation | 🔲 OPEN |
| #39      | #64     | Mapbox real impl | ✅ CLOSED |
| #40      | #65     | Auth | 🔲 OPEN (partial) |
| #41      | #66     | CI/CD | 🔲 OPEN |
| #51      | —       | Playable game bug fixes (11 bugs) | 🔲 OPEN |
| #52      | —       | Multi-actor decision catalog | 🔲 OPEN |
| #53      | —       | Observer mode full implementation | 🔲 OPEN |
| #54      | —       | Actor dossier data quality | 🔲 OPEN |
| #55      | —       | Seed data quality pass | 🔲 OPEN |
| #56      | —       | Error boundaries + blank state handling | 🔲 OPEN |
| #57      | —       | Favicon | 🔲 OPEN |
| #58      | —       | Rate limiting + AI cost controls | 🔲 OPEN |
| new      | —       | Live State Engine | ✅ DONE — PR #49 (no GH issue existed) |

---

## Sprint Planning — Implementation Plans

The remaining open issues group into **5 implementation plans** plus 2 quick tasks:

### Plan 1 — Bug Fixes (Issue #51)
**Issues:** #51 + #55 (seed data quality), #56 (error boundaries), #57 (favicon)
**Branch:** `fix/playable-game-bugs`
**Description:** Fix all 11 post-merge bugs blocking the playable game. Root causes are wrong DB column names, hardcoded URLs, missing API fallbacks, and wrong CSS z-index. No AI involved. One focused pass.

### Plan 2 — Research Pipeline (Issue #31)
**Issues:** #31
**Description:** Implement the 7-stage Iran scenario research pipeline per `docs/research-pipeline.md`. Self-contained — feeds enriched context into actor agents.

### Plan 3 — AI Pipeline Core (Issues #32, #33, #52)
**Issues:** #32 (actor agent full TurnPlan), #33 (resolution engine), #52 (multi-actor decision catalog)
**Description:** Actor agents generate TurnPlans from their decision catalog → resolution engine processes all actors' plans simultaneously → produces `EventStateEffects`. Tightly coupled: actor output feeds directly into resolution.
**Blocker:** #52 (multi-actor decision catalog) must be done first or alongside.

### Plan 4 — Judge + Narrator (Issues #34, #35)
**Issues:** #34 (judge evaluator), #35 (narrator)
**Description:** Evaluator-optimizer pair. Judge scores resolution output (0–100); if below threshold, resolution retries. Narrator converts final resolution into `ChronicleEntry` narrative. Always work together.

### Plan 5 — Game Loop + Player Interaction (Issues #36, #37, #38, #53, #54)
**Issues:** #36 (game loop orchestration), #37 (full turn submission), #38 (branch creation), #53 (observer mode), #54 (actor dossier)
**Description:** Orchestration layer wires Plans 3+4 into a complete turn. Advance route calls game loop → streams SSE → narrator writes chronicle. Also covers player-facing UI improvements: observer mode view and actor dossier quality.

### Quick Tasks (no /plan needed)
- **#40** — Auth: middleware update only (~2 hours)
- **#41** — CI/CD: single `.github/workflows/ci.yml` file (~1 hour)
- **#58** — Rate limiting: add after AI loop is working (cost controls without working loop are premature)
