# GeoSim Scrum Workflow & GitHub Issues

## Team

| Role | Handle | Focus area |
|---|---|---|
| Partner A | @partner-a | Frontend, UX, Map, E2E tests |
| Partner B | @partner-b | AI pipeline, game logic, backend, unit tests |
| Both | — | CI/CD, deployment, monitoring, security, docs |

## Labels

Create these labels in your GitHub repo:

| Label | Color | Purpose |
|---|---|---|
| `sprint-1` | `#0E8A16` | Sprint 1: Foundation (Week 1) |
| `sprint-2` | `#1D76DB` | Sprint 2: Core Features (Week 2-3) |
| `sprint-3` | `#D93F0B` | Sprint 3: Polish & Infrastructure (Week 3-4) |
| `P0-critical` | `#B60205` | Must ship |
| `P1-important` | `#FBCA04` | Should ship |
| `P2-nice` | `#C2E0C6` | If time allows |
| `frontend` | `#BFD4F2` | Frontend work |
| `backend` | `#D4C5F9` | Backend / API work |
| `ai-pipeline` | `#F9D0C4` | AI agents / prompts |
| `game-logic` | `#FEF2C0` | Simulation logic |
| `infrastructure` | `#E6E6E6` | CI/CD, deploy, monitoring |
| `hw4` | `#0075CA` | Required for HW4 |
| `hw5` | `#0075CA` | Required for HW5 |
| `bug` | `#D73A4A` | Bug fix |
| `docs` | `#0075CA` | Documentation |

## Milestones

| Milestone | Due | Description |
|---|---|---|
| Sprint 1: Foundation | End of Week 1 | Scaffolding, data model, TDD, research pipeline |
| Sprint 2: Core Features | End of Week 3 | Game loop, frontend, AI agents, map |
| Sprint 3: Ship It | End of Week 4 | CI/CD, monitoring, security, polish, presentation |
| HW4 Deadline | Per syllabus | CLAUDE.md, TDD, E→P→I→C workflow |
| HW5 Deadline | Per syllabus | Custom skill, MCP integration |

---

## SPRINT 1 — Foundation (Week 1)

### Partner B — Backend & Game Logic

**Issue #1: Project scaffolding & CLAUDE.md**
```
Title: feat: Project scaffolding with Next.js, Supabase, CLAUDE.md
Labels: sprint-1, P0-critical, infrastructure, hw4
Assignee: @partner-b
Milestone: Sprint 1

## Description
Set up the project foundation:
- Next.js 14 with App Router and TypeScript
- Supabase client utilities (browser + server)
- CLAUDE.md with @imports to all /docs files
- Run /init and iterate on CLAUDE.md
- .env.example with placeholder values
- Install Context Mode plugin
- Configure permissions in .claude/settings.json
- Set up hooks (auto-format, file protection)

## Acceptance criteria
- [ ] `npm run dev` starts the app on localhost:3000
- [ ] CLAUDE.md has all @import references
- [ ] /init output reviewed and merged
- [ ] Context Mode installed and /ctx-doctor passes
- [ ] .claude/settings.json has permissions and hooks
- [ ] .env.example committed (no real secrets)

## HW4 coverage
Part 1: CLAUDE.md & Project Setup (25%)
```

**Issue #2: Database schema & TypeScript types**
```
Title: feat: Supabase schema migration and TypeScript types
Labels: sprint-1, P0-critical, backend
Assignee: @partner-b
Milestone: Sprint 1

## Description
- Create supabase/migrations/initial_schema.sql from docs/db-schema.sql
- Create lib/types/database.ts (DB-layer types matching Supabase tables)
- Create lib/types/simulation.ts (full simulation types from docs/data-model.ts)
- Including: TurnPlan, Decision with OperationalParameter, ParameterProfile,
  concurrency rules, and all supporting types

## Acceptance criteria
- [ ] Migration file applies cleanly to local Supabase
- [ ] TypeScript types compile with zero errors
- [ ] Types cover: Scenario, Actor, ActorState, Decision, TurnPlan,
      OperationalParameter, ParameterProfile, EscalationLadder,
      IntelligencePicture, Event, Branch, TurnCommit
- [ ] DB types and simulation types are separate but aligned
```

**Issue #3: Vitest setup & mock scenario factory**
```
Title: feat: Vitest setup with Iran scenario mock data factory
Labels: sprint-1, P0-critical, game-logic, hw4
Assignee: @partner-b
Milestone: Sprint 1

## Description
- Set up Vitest with vitest.config.ts
- Add test scripts to package.json
- Create tests/helpers/mock-scenario.ts with createMockScenario()
- Mock data should include: US, Iran, Israel, Russia actors with
  realistic state, intelligence pictures where beliefs diverge from
  reality, escalation ladders, events with causal links, relationships,
  and TurnPlan examples with parameter profiles

## Acceptance criteria
- [ ] `npm test` runs Vitest
- [ ] createMockScenario() returns a valid Scenario object
- [ ] Mock data includes at least 4 actors with full state
- [ ] Mock intelligence pictures have US believing Iran readiness=25 (actual=58)
- [ ] Mock includes example TurnPlan with primary + concurrent actions
```

**Issue #4: TDD — Fog of war filtering**
```
Title: feat: Fog of war filtering (TDD: red → green → refactor)
Labels: sprint-1, P0-critical, game-logic, hw4
Assignee: @partner-b
Milestone: Sprint 1

## Description
Strict TDD workflow:
1. Write failing tests for buildFogOfWarContext and actorWouldKnowAbout
2. Commit failing tests: "test: add failing tests for fog-of-war"
3. Implement to pass: "feat: implement buildFogOfWarContext"
4. Refactor: "refactor: extract fog-of-war helpers"

## Test cases (write these FIRST)
- Includes events actor initiated
- Includes events that targeted the actor
- Includes major public events
- EXCLUDES covert adversary events
- Uses BELIEVED state, not true state
- Does NOT leak unknown unknowns
- Includes events shared by intel partners

## Acceptance criteria
- [ ] Git history shows red-green-refactor pattern
- [ ] All 7+ tests pass
- [ ] Function handles edge cases (no intel partners, empty events)

## HW4 coverage
Part 3: TDD (30%)
```

**Issue #5: TDD — Escalation ladder validation**
```
Title: feat: Escalation ladder validation (TDD)
Labels: sprint-1, P0-critical, game-logic, hw4
Assignee: @partner-b
Milestone: Sprint 1

## Description
TDD for escalation logic in lib/game/escalation.ts

## Test cases
- Cannot escalate past hard constraints
- Can escalate past soft constraints with cost
- Escalation skip allowed when triggers met
- Constraint cascade enables new options
- Constraint status tracked from events
- De-escalation options calculated
- Deadline-based constraints create urgency

## Acceptance criteria
- [ ] Red-green-refactor git history
- [ ] All tests pass
```

**Issue #6: TDD — TurnPlan validation**
```
Title: feat: TurnPlan validation — concurrency, resources, parameters (TDD)
Labels: sprint-1, P0-critical, game-logic
Assignee: @partner-b
Milestone: Sprint 1

## Description
TDD for multi-action TurnPlan validation in lib/game/turn-plan.ts

## Test cases
Concurrency:
- Allow compatible light + light
- Allow heavy + light
- Reject two heavy actions
- Reject total + any
- Reject explicitly incompatible actions

Resources:
- Allocation must sum to 100%
- Reject 0% to any selected action
- Warn when primary gets <50%

Parameters:
- Accept valid profile selections
- Accept custom parameter combos
- Reject invalid option IDs
- Apply cost modifiers from parameters
- Adjust escalation rung from parameter choices

Synergies/Tensions:
- Detect synergy between paired actions
- Detect tension between conflicting actions
- Flag diplomatic + escalation tension

## Acceptance criteria
- [ ] Red-green-refactor git history
- [ ] All 15+ tests pass
- [ ] validateTurnPlan returns structured errors/warnings/synergies
```

**Issue #7: TDD — State update application**
```
Title: feat: State update application — immutable event impacts (TDD)
Labels: sprint-1, P0-critical, game-logic
Assignee: @partner-b
Milestone: Sprint 1

## Description
TDD for applying event impacts to actor states in lib/game/state-updates.ts

## Test cases
- Updates military readiness from impacts
- Depletes assets based on operations
- Updates oil price from energy events
- Updates domestic support from political events
- Updates relationship strength
- Tracks asset depletion trends
- Marks constraints as weakened/removed
- Does NOT mutate the original scenario object (immutability)

## Acceptance criteria
- [ ] Red-green-refactor git history
- [ ] All tests pass
- [ ] State updates are pure functions (no mutation)
```

**Issue #8: Research pipeline API routes**
```
Title: feat: Research pipeline API routes (Stages 0-6)
Labels: sprint-1, P0-critical, ai-pipeline, hw4
Assignee: @partner-b
Milestone: Sprint 1

## Description
Explore → Plan → Implement → Commit workflow:
1. Explore: read docs/research-pipeline.md and docs/api-routes.md
2. Plan: design implementation in plan mode
3. Implement: build API routes
4. Commit: clean conventional commits

Routes to build:
- POST /api/scenarios/[id]/research/frame
- POST /api/scenarios/[id]/research/frame/confirm
- POST /api/scenarios/[id]/research/populate (long-running)
- GET /api/scenarios/[id]/research/status

Use prompt templates from docs/prompt-library.ts.
Implement prompt caching on all Anthropic API calls.
Stages 3 & 4 run in parallel via Promise.all.

## Acceptance criteria
- [ ] Git history shows Explore→Plan→Implement→Commit
- [ ] All 4 routes working
- [ ] Prompt caching active (cache_control on stable prefixes)
- [ ] Stages 3 & 4 run in parallel

## HW4 coverage
Part 2: E→P→I→C workflow (30%)
```

### Partner A — Frontend Foundation

**Issue #9: Vercel deployment & multi-environment setup**
```
Title: feat: Vercel deployment with preview environments
Labels: sprint-1, P0-critical, infrastructure
Assignee: @partner-a
Milestone: Sprint 1

## Description
- Deploy to Vercel
- Configure environment variables for production
- Verify preview deployments on PRs work
- Create vercel.json if needed

## Acceptance criteria
- [ ] Production URL live
- [ ] Preview URLs auto-deploy on PRs
- [ ] All env vars configured in Vercel dashboard
```

**Issue #10: App layout & routing structure**
```
Title: feat: Next.js app layout, routing, and auth setup
Labels: sprint-1, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 1

## Description
Build the page structure from docs/component-tree.ts:
- app/layout.tsx (root layout with providers)
- app/page.tsx (landing / home)
- app/scenarios/page.tsx (scenario browser — placeholder)
- app/scenarios/[id]/play/[branchId]/page.tsx (game view — placeholder)
- app/chronicle/[branchId]/page.tsx (chronicle — placeholder)
- Set up Supabase Auth (login/signup pages)
- Set up GameProvider context with initial state shape
- Set up Tailwind CSS with project design tokens

## Acceptance criteria
- [ ] All routes render without errors
- [ ] Auth flow works (sign up, log in, log out)
- [ ] GameProvider wraps game view with initial state
- [ ] Tailwind configured with consistent design tokens
```

**Issue #11: Shared UI component library**
```
Title: feat: Shared UI components (Badge, Card, Tabs, ProgressBar, etc.)
Labels: sprint-1, P1-important, frontend
Assignee: @partner-a
Milestone: Sprint 1

## Description
Build reusable UI primitives referenced throughout the component tree:
- Button, Badge, Card, Tabs, ProgressBar, ScoreDisplay, TagList
- ExpandableSection, SlideOverPanel
- Game-specific: EscalationLadder, ActorAvatar, EscalationBadge,
  DimensionTag, EscalationDirectionTag, ConfidenceBadge, CostMagnitude

Use docs/ui-mockups.html as the visual reference.

## Acceptance criteria
- [ ] All components render correctly
- [ ] Components use Tailwind with design tokens
- [ ] Components handle light/dark mode
- [ ] Storybook or simple test page showing all components (optional)
```

**Issue #12: Mapbox Tier 1 setup**
```
Title: feat: Mapbox GL integration — Tier 1 (country fills, chokepoints)
Labels: sprint-1, P1-important, frontend
Assignee: @partner-a
Milestone: Sprint 1

## Description
- Install and configure Mapbox GL JS
- Create GameMap component with Middle East focus
- Country fill layers colored by actor alignment
- Chokepoint markers (Strait of Hormuz)
- Map legend
- Click country to select actor (triggers panel update via GameContext)

## Acceptance criteria
- [ ] Map renders centered on Middle East
- [ ] Countries colored by actor (blue=US/Israel, red=Iran, amber=Gulf)
- [ ] Strait of Hormuz marked as blocked
- [ ] Legend shows actor colors
- [ ] Click country dispatches SELECT_ACTOR to GameContext
```

---

## SPRINT 2 — Core Features (Week 2-3)

### Partner B — AI Pipeline & Game Loop

**Issue #13: Actor agent implementation with prompt caching**
```
Title: feat: Actor agent API — comprehensive decision generation with TurnPlan
Labels: sprint-2, P0-critical, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement POST /api/ai/actor-agent:
- Build fog-of-war context for the actor
- Call Anthropic API with the actor agent prompt from docs/prompt-library.ts
- Prompt must generate 8-12+ decisions across all dimensions
- Each decision has operational parameters and 2-3 named profiles
- Agent assembles a multi-action TurnPlan
- Use prompt caching (cache_control on stable system prompt)

## Acceptance criteria
- [ ] Returns 8-12+ decisions with full parameters
- [ ] Each decision has 2-3 parameter profiles
- [ ] Returns a valid TurnPlan (primary + concurrent actions)
- [ ] Prompt caching active (verify with token usage)
- [ ] Fog-of-war correctly filters context
```

**Issue #14: Resolution engine implementation**
```
Title: feat: Resolution engine — multi-action TurnPlan resolution
Labels: sprint-2, P0-critical, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement POST /api/ai/resolution-engine:
- Takes all actors' TurnPlans simultaneously
- Resolves within-actor synergies/tensions
- Resolves cross-actor collisions
- Parameter profiles shape outcomes
- Generates Events with full causal chains
- Identifies reaction triggers

## Acceptance criteria
- [ ] Handles multi-action TurnPlans correctly
- [ ] Synergy bonuses applied (e.g. air + ground = reduced casualties)
- [ ] Tension penalties applied (e.g. negotiate + escalate = credibility loss)
- [ ] Per-action outcomes with parameter effects documented
- [ ] Reaction triggers identified
```

**Issue #15: Judge evaluator with retry loop**
```
Title: feat: Judge evaluator with evaluator-optimizer retry
Labels: sprint-2, P0-critical, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement POST /api/ai/judge:
- Scores: plausibility, consistency, proportionality, rationality, cascade logic
- Bias check (does outcome favor any actor systematically?)
- If overall score < 60, feed issues back to resolution engine for retry (max 2)
- This is the evaluator-optimizer pattern from Anthropic's agent patterns

## Acceptance criteria
- [ ] Returns scores on all 5 dimensions + bias check
- [ ] Retry loop works: re-resolution with feedback produces higher scores
- [ ] Max 2 retries to prevent infinite loops
```

**Issue #16: Narrator (chronicle writer)**
```
Title: feat: Narrator agent — literary chronicle entry generation
Labels: sprint-2, P1-important, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement POST /api/ai/narrator:
- Takes resolution output
- Generates literary prose narrative (3-5 paragraphs)
- Equal narrative weight to all actors (neutrality)
- Returns title, severity, key tags

## Acceptance criteria
- [ ] Generates compelling, specific narrative
- [ ] Names and humanizes all actors equally
- [ ] Returns structured output (narrative, title, severity, tags)
```

**Issue #17: Game loop controller — full turn orchestration**
```
Title: feat: Game loop controller — planning → resolution → reaction → judge → narrate
Labels: sprint-2, P0-critical, ai-pipeline, game-logic
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement the full turn loop:
1. Actor agents generate decisions + TurnPlans (Promise.all — parallel)
2. Validate all TurnPlans
3. Resolution engine processes all plans
4. Judge evaluates (retry if <60)
5. Check reaction triggers, run reaction phase if needed
6. Narrator generates chronicle entry
7. Create immutable turn commit
8. Update branch HEAD

API routes:
- POST /api/branches/[id]/turns/start
- POST /api/branches/[id]/turns/plan
- POST /api/branches/[id]/turns/resolve
- POST /api/branches/[id]/turns/react
- POST /api/branches/[id]/turns/advance

## Acceptance criteria
- [ ] Full turn executes end-to-end
- [ ] Actor agents run in parallel
- [ ] TurnPlan validation catches bad plans
- [ ] Evaluator-optimizer retries on low scores
- [ ] Immutable commit created with all phase data
- [ ] Branch HEAD updated
```

**Issue #18: Decision support endpoints**
```
Title: feat: Decision analysis, custom decisions, plan validation, profile comparison
Labels: sprint-2, P1-important, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement decision support APIs:
- POST /api/ai/analyze-decision (deep analysis with per-profile breakdown)
- POST /api/ai/evaluate-custom-decision (structure user freeform into full Decision)
- POST /api/ai/validate-turn-plan (pre-submit compatibility check)
- POST /api/ai/compare-profiles (side-by-side profile comparison)

## Acceptance criteria
- [ ] Decision analysis returns costs/outcomes per parameter profile
- [ ] Custom decision generates full parameters and profiles
- [ ] Plan validation catches incompatibilities and resource overages
- [ ] Profile comparison shows meaningful differences
```

**Issue #19: Branch forking & rewind operations**
```
Title: feat: Branch fork, rewind, and commit operations
Labels: sprint-2, P0-critical, backend
Assignee: @partner-b
Milestone: Sprint 2

## Description
Implement git-like branch operations:
- POST /api/scenarios/[id]/branches (fork from commit)
- POST /api/branches/[id]/rewind (move HEAD back)
- GET /api/branches/[id]/commits (list turn history)
- GET /api/commits/[id] (get full commit data)

## Acceptance criteria
- [ ] Fork creates branch inheriting parent history by reference
- [ ] Rewind moves HEAD without deleting forward commits
- [ ] Commit list returns ordered turn summaries
- [ ] Full commit returns scenario snapshot + all phase data
```

### Partner A — Frontend & UX

**Issue #20: Split-screen game layout**
```
Title: feat: Split-screen layout — map (60%) + tabbed panel (40%)
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
Build the main game view layout:
- Left 60%: GameMap component (from Issue #12)
- Right 40%: PanelSide with tabs (Actors, Decisions, Events, Chronicle)
- PanelHeader showing scenario name, turn number, phase
- TurnControls at bottom (Rewind, Advance)
- Observer overlay (fog-of-war toggle, perspective selector)

Use docs/ui-mockups.html as reference.

## Acceptance criteria
- [ ] Split screen renders responsively
- [ ] Tabs switch between panels
- [ ] Layout matches mockup proportions
- [ ] TurnControls dispatch game actions
```

**Issue #21: Actors panel with global indicators**
```
Title: feat: Actors tab — actor list, escalation badges, global indicators
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
- ActorList with colored dots, names, escalation rung badges
- Click actor opens ActorDetailPanel (slide-over)
- GlobalIndicators: oil price, domestic support bars, air defense reserves
- Connect to GameContext for current scenario state

## Acceptance criteria
- [ ] All actors display with correct colors and escalation rungs
- [ ] Global indicators show oil, support, air defense with color coding
- [ ] Click actor opens detail panel
- [ ] Data pulls from GameContext (mock data OK for now)
```

**Issue #22: Actor detail panel**
```
Title: feat: Actor detail panel — full state dossier
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
Slide-over panel showing full actor state:
- Key figures with status, disposition, succession impact
- Military state with asset table (depletion trends, costs)
- Economic state with indicators
- Political state with influence channels and bars
- Policy disconnect box
- Objectives with progress bars
- Constraints with status and deadlines
- Escalation ladder visualization (bar chart)
- Intelligence picture (believed vs reality in observer mode)
- Unknown unknowns (hidden unless omniscient toggle)

Use the US actor state mockup as reference.

## Acceptance criteria
- [ ] All sections render with mock data
- [ ] Influence channels show policy influence bars
- [ ] Escalation ladder highlights current rung
- [ ] Intel picture hides unknown unknowns when not omniscient
```

**Issue #23: Decision catalog & TurnPlan builder**
```
Title: feat: Decision planning UI — catalog, parameters, TurnPlan builder
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
The most complex frontend component. Three parts:

1. DecisionCatalog: decisions grouped by dimension (Military, Economic,
   Diplomatic, Intelligence, Political, Information). Each card shows
   title, escalation direction, resource weight.

2. DecisionDetailPanel (slide-over): when user clicks a decision:
   - Parameter configurator with option selectors
   - Profile quick-pick cards ("Surgical", "Overwhelming")
   - Live cost preview updating as parameters change
   - Outcomes by profile
   - Concurrency indicators (compatible/incompatible badges)

3. TurnPlanBuilder: planning area where user assembles their turn:
   - Primary action slot (required)
   - Concurrent action slots (0-3)
   - Resource allocation sliders (sum to 100%)
   - Live validation: incompatibility warnings, synergy highlights
   - Resource budget meter
   - Submit button

## Acceptance criteria
- [ ] Decisions grouped by dimension with 8+ visible
- [ ] Parameter configurator updates cost preview live
- [ ] Profile quick-picks set all parameters at once
- [ ] TurnPlan builder enforces concurrency rules
- [ ] Resource sliders sum to 100%
- [ ] Validation shows errors/warnings/synergies in real time
```

**Issue #24: Decision analysis view**
```
Title: feat: Decision analysis view — per-profile costs, outcomes, concurrency
Labels: sprint-2, P1-important, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
Deep analysis view when user inspects a decision:
- Strategic rationale
- Parameter comparison table (costs per profile side-by-side)
- Constraint warnings by profile
- Intel gap warnings with parameter-specific risks
- Projected outcomes per profile (separate cards)
- Concurrency analysis (best/worst pairings)
- Anticipated responses from all actors
- Objective impact
- Historical comparisons
- Overall assessment per profile

Connect to POST /api/ai/analyze-decision endpoint.

## Acceptance criteria
- [ ] Analysis loads via API call
- [ ] Per-profile breakdown visible (not generic)
- [ ] Concurrency recommendations shown
- [ ] Loading state while API processes
```

**Issue #25: War chronicle view**
```
Title: feat: War chronicle — timeline view with expandable turns
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
Build the chronicle view (both as a tab and a full page):
- Timeline with severity dots (critical/major/moderate)
- Turn date, title, narrative (serif prose)
- Tags for quick scanning
- Expandable sections: decisions made, escalation changes, state deltas,
  reaction phase, constraint cascade alerts, judge scores
- Global ticker (oil, support, air defense, Strait status)
- Dimension filters (All, Military, Political, Economic)

Use docs/ui-mockups.html war chronicle mockup as reference.

## Acceptance criteria
- [ ] Timeline renders with mock turn data
- [ ] Expandable sections toggle correctly
- [ ] Narrative uses serif font for literary feel
- [ ] Global ticker updates across turns
- [ ] Filters work
```

**Issue #26: Events tab — last turn summary**
```
Title: feat: Events tab — turn resolution summary with judge scores
Labels: sprint-2, P1-important, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
- Last turn narrative summary
- Per-action outcomes (which actions succeeded/failed, parameter effects)
- Reaction phase block (visually distinct)
- Judge scores (plausibility, consistency, rationality)
- Synergy/tension effects that played out

## Acceptance criteria
- [ ] Shows per-action outcomes (not just overall)
- [ ] Reaction phase visually separated
- [ ] Judge scores displayed with color coding
```

**Issue #27: Game mode selection & scenario browser**
```
Title: feat: Game mode selection and scenario browser
Labels: sprint-2, P1-important, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
- Scenario browser page: list public scenarios with cards
- Game mode selector: Observer / Single Actor / Free Roam
- Actor selection (which actor to play)
- Branch creation UI (fork from a commit)

## Acceptance criteria
- [ ] Scenarios list loads from Supabase
- [ ] Game mode selection works
- [ ] Actor picker for single-actor mode
- [ ] Branch creation connects to API
```

**Issue #28: Classification banner + document ID header + three-font design system**
```
Title: feat: Classification banner, document ID header, three-font design system
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
Implement the core GeoSim visual identity from docs/frontend-design.md — the
single most important aesthetic decision. This must be done BEFORE building any
other components so everything is built on the right foundation.

- Load Barlow Condensed, EB Garamond, and IBM Plex Mono from Google Fonts
- Set CSS variables: --font-sans, --font-serif, --font-mono
- Apply typography rules from the Application Rules table in frontend-design.md
- Add the fixed 24px classification banner to the root layout:
    ◆  SECRET // GEOSIM ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY  ◆
  (Iran scenario variant: TOP SECRET // NOFORN // IRAN-CONFLICT)
- Add document ID header component (replaces breadcrumb):
    GEOSIM-IRN-2026-0322 // BRANCH: MAIN // TURN 04 / 12
- Add section divider component:
    ━━━━━ SECTION TITLE ━━━━━ (monospace, 8px, tertiary)
- Update top bar (42px) with: GEOSIM wordmark (Barlow Condensed Bold, 16px, gold),
  scenario name (IBM Plex Mono, 10px, tertiary), turn indicator right-aligned

## Acceptance criteria
- [ ] All three fonts load and are accessible via CSS variables
- [ ] Classification banner visible on every page (fixed, non-interactive)
- [ ] Document ID header renders on all major views
- [ ] Section divider component used in actor panel and chronicle
- [ ] Top bar matches spec (wordmark left, turn indicator right)
- [ ] No Inter/system-ui as only font anywhere in the UI
- [ ] No rounded corners above 6px, no box-shadow, no gradient backgrounds
```

**Issue #29: Turn resolution dispatch terminal animation**
```
Title: feat: Turn resolution dispatch terminal animation (no spinner)
Labels: sprint-2, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
When the AI resolves a turn, the center panel switches to a full terminal view
showing live incoming dispatches. This is the most memorable UI moment — it must
feel real. See docs/frontend-design.md "Turn Resolution: The Dispatch Sequence".

- Replace any loading spinner or progress bar with a full-panel terminal view
- Each dispatch line stamps in with a 40ms stagger (opacity 0 → 1, no animation curve)
- Timestamp prefix in --text-tertiary, event lines in --text-secondary
- COLLISION DETECTED lines in --status-critical
- EVENT CONFIRMED lines in --gold
- Blinking amber block cursor (▋) after last line while engine is processing
- Cursor disappears when complete
- Connect to Supabase Realtime channel for live progress events
- On completion, transition back to the normal panel view

## Acceptance criteria
- [ ] No spinner or progress bar during turn resolution
- [ ] Lines appear sequentially with 40ms stagger
- [ ] Timestamp, event, critical, and confirmed line styles match spec
- [ ] Blinking cursor present during processing, gone on complete
- [ ] Animation works with mock dispatch data (API not required for UI proof)
- [ ] Supabase Realtime hook ready for wiring
```

**Issue #30: Constraint cascade detection and alerting (TDD)**
```
Title: feat: Constraint cascade detection and alerting (TDD)
Labels: sprint-2, P0-critical, game-logic
Assignee: @partner-b
Milestone: Sprint 2

## Description
Constraint cascades are a core PRD abstraction (Section 3.1): multi-step chains
where constraint removal enables escalation. The classic example is Iran's nuclear
cascade: Ayatollah killed → religious constraint removed → attack already happened
→ deterrence constraint removed → nuclear breakout rational → Israel faces nuclear
adversary → potential first strike.

TDD workflow (red → green → refactor):
1. Write failing tests in tests/game/constraint-cascades.test.ts
2. Implement lib/game/constraint-cascades.ts
3. Refactor

## Test cases (write FIRST)
- detectActiveCascades: finds cascades where 2+ steps have been triggered
- evaluateCascadeRisk: computes likelihood of full activation from current state
- getNextCascadeStep: returns the next un-triggered step for an active cascade
- checkConstraintStatusChange: updates constraint.status when event removes it
- alertOnCascadeFormation: returns alert when cascade likelihood crosses threshold
- perceivedByActor: returns only cascades the actor is aware of (fog of war)
- unknownCascades: returns cascades no actor is aware of (engine/omniscient only)

## Acceptance criteria
- [ ] Git history shows red-green-refactor pattern
- [ ] All 7+ tests pass
- [ ] detectActiveCascades correctly identifies the Iran nuclear cascade given mock data
- [ ] Cascade alerts surface in the chronicle (expandable detail section)
- [ ] Fog of war: actor agents don't see cascades they're unaware of
```

**Issue #31: Reaction phase UI flow**
```
Title: feat: Reaction phase UI flow
Labels: sprint-2, P1-important, frontend
Assignee: @partner-a
Milestone: Sprint 2

## Description
The reaction phase (PRD Section 5.1) is a distinct game phase where actors respond
to "immediate" triggers from the resolution engine. Currently only the backend has
reaction phase coverage. The frontend needs a dedicated UI flow.

- After turn resolution completes, check for immediate reaction triggers
- Show a "Reaction Phase" notification panel (visually distinct from planning)
- List each triggered actor with their trigger description
- For user-controlled actors, show a simplified decision picker (1-2 actions, not
  the full TurnPlan builder — reactions are faster and more constrained)
- AI-controlled actors react automatically (show their reaction in the terminal log)
- Once all reactions resolved, show a "Reaction resolved" dispatch line and advance
- In the chronicle, reaction phase entries are visually separated (indented, labeled
  "REACTION PHASE" in the dispatch header)

## Acceptance criteria
- [ ] Reaction phase panel appears only when immediate triggers exist
- [ ] Triggered actors and their triggers are clearly displayed
- [ ] User-controlled actor gets simplified action picker (not full TurnPlan builder)
- [ ] AI reactions shown as dispatch lines in terminal view
- [ ] Chronicle entries distinguish reaction phase from planning phase
- [ ] No reaction panel if no immediate triggers
```

**Issue #32: Supabase Realtime subscriptions (observer mode and turn progress)**
```
Title: feat: Supabase Realtime subscriptions for observer mode and turn progress
Labels: sprint-2, P1-important, backend
Assignee: @partner-b
Milestone: Sprint 2

## Description
The turn resolution terminal animation (Issue #29) and observer mode both require
live updates pushed from the server. Implement Supabase Realtime subscriptions.

Channels to implement (from docs/api-routes.md):
- channel: branch:[id]
  events: turn_started, decision_submitted, resolution_progress,
          turn_completed, branch_rewound
- channel: commit:[id]
  events: phase_changed, narrative_ready, eval_ready

Create useRealtime hook in hooks/useRealtime.ts:
- Subscribes to branch and commit channels
- Dispatches GameContext actions on events
- Cleans up subscription on unmount

During turn resolution, emit resolution_progress events from the game loop
controller for each dispatch line (timestamp + message). The terminal animation
component subscribes to these and renders each line as it arrives.

## Acceptance criteria
- [ ] useRealtime hook subscribes to branch and commit channels
- [ ] resolution_progress events feed the dispatch terminal animation
- [ ] turn_completed event transitions UI from terminal back to panel view
- [ ] Observer mode receives all actor decisions and resolution in real-time
- [ ] Subscription cleaned up on component unmount
- [ ] Works with Supabase local development instance
```

---

## SPRINT 3 — Ship It (Week 3-4)

### Both Partners

**Issue #33: CI/CD pipeline**
```
Title: feat: GitHub Actions CI/CD with AI PR review
Labels: sprint-3, P0-critical, infrastructure
Assignee: @partner-a
Milestone: Sprint 3

## Description
- .github/workflows/ci.yml: lint, typecheck, vitest, npm audit on PR
- .github/workflows/claude-review.yml: AI PR review via claude-code-action
- Vercel auto-deploy on main, preview on PRs
- Performance gates: block merge if tests fail

## Acceptance criteria
- [ ] CI runs on every PR
- [ ] AI review posts comments on PRs
- [ ] Failed CI blocks merge
- [ ] Vercel deploys automatically
```

**Issue #34: Sentry monitoring & health check**
```
Title: feat: Sentry error tracking and health monitoring
Labels: sprint-3, P1-important, infrastructure
Assignee: @partner-a
Milestone: Sprint 3

## Description
- Install @sentry/nextjs
- Configure with SENTRY_DSN
- Add /api/health endpoint
- Set up basic uptime monitoring

## Acceptance criteria
- [ ] Errors reported to Sentry dashboard
- [ ] Health endpoint returns 200
- [ ] Source maps uploaded for readable stack traces
```

**Issue #35: Security audit**
```
Title: feat: Security audit — OWASP Top 10, secrets, dependencies
Labels: sprint-3, P0-critical, infrastructure
Assignee: @partner-b
Milestone: Sprint 3

## Description
Run /security-audit skill and address findings:
- Gitleaks scan
- npm audit
- Input validation on all API routes
- RLS policy verification
- API key exposure check
- SBOM generation

## Acceptance criteria
- [ ] No HIGH severity findings unaddressed
- [ ] SBOM generated (sbom.json)
- [ ] All API routes validate input
- [ ] RLS policies verified active
```

**Issue #36: Eval metrics dashboard**
```
Title: feat: Eval metrics — historical judge scores and bias tracking
Labels: sprint-3, P1-important, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 3

## Description
- Store judge scores in eval_metrics table
- API endpoint: GET /api/scenarios/[id]/evals
- Simple dashboard page showing:
  - Average scores per turn
  - Score trends over time
  - Bias analysis (which actor favored)
  - Per-actor rationality tracking

## Acceptance criteria
- [ ] Eval data persists in database
- [ ] Dashboard shows score trends
- [ ] Bias detection flags systematic favoritism
```

**Issue #37: Seed Iran scenario with verified data**
```
Title: feat: Seed Iran conflict scenario from research data
Labels: sprint-3, P0-critical, ai-pipeline
Assignee: @partner-b
Milestone: Sprint 3

## Description
SUPERSEDED by Issue #18 (Iran research incorporation) which provides a more
complete implementation using a CLI seed script rather than the research pipeline.

## Acceptance criteria
- [ ] Scenario loads and is playable
- [ ] All actors have full, researched state
- [ ] Event history covers Twelve-Day War through current day
- [ ] Ground truth trunk created as the base branch
```

**Issue #18: Iran research incorporation — seed verified data and verifiedContext pipeline**
```
Title: feat: Iran research incorporation — seed verified data and verifiedContext pipeline
Labels: sprint-1, P0-critical, ai-pipeline, game-logic
Assignee: @partner-b
Milestone: Sprint 1

## Description
Incorporate verified Iran research data into the simulation as a ground truth trunk.
- Add VerificationStatus type (verified | researched | inferred) to simulation types
- Create lib/scenarios/iran/ with seed data (initial state + ~25 events)
- Create scripts/seed-iran.ts CLI script that chains events into Supabase turn_commits
- Add verifiedContext param to runPopulatePipeline() — skips stages 1-4, injects into 5-6
- Add current_divergence column to branches table
- Add cache_key + reuse_count to turn_commits for shared commit caching
- Implement computeCacheKey() utility with SHA-256

Run: bun run scripts/seed-iran.ts
Append new events: bun run scripts/seed-iran.ts --from=<event_id>
Seed data lives in: lib/scenarios/iran/

## Acceptance criteria
- [ ] bun run scripts/seed-iran.ts creates ground truth trunk with ~25-35 commits
- [ ] Each commit has is_ground_truth: true and correct scenario_snapshot
- [ ] All verified fields have verificationStatus: 'verified'
- [ ] runPopulatePipeline with verifiedContext skips stages 1-4
- [ ] branchDivergence field present in game context passed to agents
- [ ] Cache hit returns existing commit without API call
- [ ] --from=<event_id> flag appends without re-seeding
- [ ] Unverified scenario pipeline (no verifiedContext) unchanged
- [ ] All existing tests still pass
- [ ] TypeScript strict mode: zero errors
```

**Issue #38: Mapbox Tier 2 — asset markers**
```
Title: feat: Mapbox Tier 2 — military assets, oil facilities, pulsing markers
Labels: sprint-3, P2-nice, frontend
Assignee: @partner-a
Milestone: Sprint 3

## Description
- Carrier group markers (pulsing)
- Air base markers
- Oil facility markers with damage status
- THAAD/air defense range circles
- Asset detail popup on click

## Acceptance criteria
- [ ] Carrier groups shown with pulsing animation
- [ ] Oil facilities show operational/damaged/destroyed status
- [ ] Click marker shows asset details
```

**Issue #39: Connect frontend to live API data**
```
Title: feat: Replace mock data with live API connections
Labels: sprint-3, P0-critical, frontend
Assignee: @partner-a
Milestone: Sprint 3

## Description
Wire up all frontend components to real API endpoints:
- Actor state from scenario snapshots
- Decisions from actor agent API
- Turn resolution from game loop
- Chronicle from narrator output
- Real-time updates via Supabase subscriptions

## Acceptance criteria
- [ ] All panels show live data (not mock)
- [ ] Turn execution updates UI in real-time
- [ ] Supabase realtime subscription working for observer mode
```

**Issue #40: Quality gate & polish**
```
Title: feat: Quality gate pass and UI polish
Labels: sprint-3, P1-important, infrastructure, frontend
Assignee: Both
Milestone: Sprint 3

## Description
- Run /quality-gate and address all gaps
- Responsive design check (mobile-friendly)
- Error states and loading states for all async operations
- 404 / error pages
- Performance check (Lighthouse > 80)

## Acceptance criteria
- [ ] Quality gate report shows all-pass
- [ ] No broken states on any page
- [ ] Loading indicators on all API calls
- [ ] Lighthouse performance > 80
```

**Issue #41: Documentation, blog post, presentation prep**
```
Title: docs: System documentation, API docs, blog post, and presentation
Labels: sprint-3, P0-critical, docs
Assignee: Both
Milestone: Sprint 3

## Description
- System documentation (architecture overview)
- API documentation
- Technical blog post
- 20-minute presentation slides
- Individual reflections

## Acceptance criteria
- [ ] README.md with project overview and setup instructions
- [ ] API docs covering all endpoints
- [ ] Blog post written
- [ ] Presentation ready
- [ ] Individual reflections complete
```

---

## HW-Specific Issues

**Issue #42: HW4 — Reflection & session log**
```
Title: docs: HW4 reflection and annotated Claude Code session log
Labels: hw4, docs
Assignee: Both
Milestone: HW4 Deadline

## Description
- Annotate Claude Code session logs from Sessions 1-3
- Write 1-2 page reflection on E→P→I→C workflow vs previous approach
- Document context management strategies that worked best

## Acceptance criteria
- [ ] Annotated session log showing workflow
- [ ] Reflection covers all required questions
```

**Issue #43: HW5 — Custom skill v1 → v2 iteration**
```
Title: feat: HW5 custom skill iteration — /add-feature v1 → v2
Labels: hw5
Assignee: @partner-b
Milestone: HW5 Deadline

## Description
- Test /add-feature skill on 2 real tasks
- Document what worked and what didn't
- Create v2 with improvements
- Archive v1 for comparison

## Acceptance criteria
- [ ] v1 and v2 both in repo (.claude/skills/archive/ for v1)
- [ ] Screenshots/logs showing skill execution on real tasks
- [ ] Documented iteration (what changed, why)
```

**Issue #44: HW5 — MCP integration demonstration**
```
Title: feat: HW5 MCP integration — Context Mode + Supabase/Playwright
Labels: hw5
Assignee: @partner-a
Milestone: HW5 Deadline

## Description
- Document Context Mode MCP setup and demonstrate ctx_stats
- Optionally add Supabase or Playwright MCP as second integration
- Demonstrate a complete workflow using MCP
- Document setup process

## Acceptance criteria
- [ ] Working MCP configuration
- [ ] Demonstrated workflow with screenshots/logs
- [ ] Setup documentation (reproducible)
```

**Issue #45: HW5 — Retrospective**
```
Title: docs: HW5 retrospective on skills and MCP
Labels: hw5, docs
Assignee: Both
Milestone: HW5 Deadline

## Description
1-2 page retrospective:
- How did custom skills change workflow?
- What did MCP enable that wasn't possible before?
- What would you build next?

## Acceptance criteria
- [ ] Covers all required questions
- [ ] References specific examples from the project
```
