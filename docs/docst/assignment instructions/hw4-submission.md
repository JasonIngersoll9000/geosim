# HW4 Submission: Claude Code Workflow & TDD

**Project:** GeoSim — AI-Powered Strategic Simulation Engine  
**Repository:** [github.com/JasonIngersoll9000/geosim](https://github.com/JasonIngersoll9000/geosim)  
**Group Members** Jason Ingersoll, Vartika Tewari
---

## Table of Contents

1. [Part 1: Claude Code Project Setup](#part-1-claude-code-project-setup)
2. [Part 2: Explore → Plan → Implement → Commit](#part-2-explore--plan--implement--commit)
3. [Part 3: TDD with Claude Code](#part-3-tdd-with-claude-code)
4. [Part 4: Reflection & Annotated Session Log](#part-4-reflection--annotated-session-log)

---

# Part 1: Claude Code Project Setup

## 1.1 CLAUDE.md — The Project Brain

Our `CLAUDE.md` is the single most important file in the repository. It serves as persistent context that Claude Code reads at the start of every session, and it evolved significantly over Sprint 1. The final version (200 lines) includes:

**Tech stack:**
```
- Next.js 14 (App Router), TypeScript 5, React 18
- Tailwind CSS for styling
- Supabase (PostgreSQL + Auth + Realtime)
- Mapbox GL JS for map visualization
- Anthropic API (Claude Sonnet) for AI agents
- Vitest for unit tests, Playwright for E2E
- Vercel for deployment
```

**Architecture decisions:** The file documents our directory structure (`app/`, `lib/game/`, `lib/ai/`, `tests/`, etc.) and key design patterns like git-like branching for scenario trees, fog-of-war filtering, and escalation ladders.

**Coding conventions:**
- TypeScript strict mode, no `any` — use `unknown` and narrow
- API routes return `{ data, error }` shape
- Conventional commits (`feat:`, `test:`, `refactor:`, `fix:`, `docs:`)
- TDD: write failing tests BEFORE implementation

**Do's and Don'ts:** Explicit rules like "never commit `.env.local`", "never hardcode actor-specific logic", and critically: "never give any actor preferential treatment in AI prompts" (our neutrality principle).

**`@import` references** — CLAUDE.md references 14 external documents via `@docs/` paths:
- `@docs/prd.md` — Full product requirements
- `@docs/geosim-data-model.ts` — TypeScript types for every entity
- `@docs/db-schema.sql` — Supabase PostgreSQL schema
- `@docs/api-routes.md` — API endpoint specifications
- `@docs/prompt-library.ts` — AI agent system prompts
- `@docs/research-pipeline.md` — 7-stage research pipeline
- `@docs/agent-architecture.ts` — Agent roles and game loop pseudocode
- `@docs/testing-strategy.md` — TDD workflow and mocking strategy
- `@docs/scrum-issues.md` — Sprint issues with acceptance criteria
- `@docs/frontend-design.md` — "Declassified War Room" design vision
- `@docs/strategos-design-system.md` — UI design tokens
- `@docs/Iran Research/research-military.md`, `research-political.md`, `research-economic.md` — Verified conflict data

This `@import` approach was deliberate: rather than stuffing everything into CLAUDE.md, we kept it as a "table of contents" that points Claude to the right reference material. This kept the base context manageable while giving Claude access to deep domain knowledge when needed.

## 1.2 Permissions & Sandboxing

We configured `.claude/settings.json` with an explicit allowlist:

```json
{
  "permissions": {
    "allow": [
      "Read", "Glob", "Grep",
      "Bash(git status)", "Bash(git diff)", "Bash(git log*)",
      "Bash(git add *)", "Bash(git commit *)", "Bash(git push)",
      "Bash(git checkout *)", "Bash(git branch *)",
      "Bash(gh issue *)", "Bash(gh pr *)",
      "Bash(bun *)", "Bash(node_modules/.bin/vitest *)"
    ]
  }
}
```

This means Claude can freely read files, run tests, and manage git, but cannot install system packages, make external network requests, or run arbitrary shell commands without approval. The `bun` entries reflect a WSL2 architecture decision — `npm` and `npx` are Windows binaries that can't execute Linux binaries, so we migrated everything to `bun`.

## 1.3 Hooks & Automation

We set up four hook categories in `settings.json`:

- **SessionStart** — Prints a reminder: "Run `/start-session` before doing any work"
- **PreToolUse (Edit|Write)** — Runs `protect-files.sh` to block edits to `.env`, `.env.local`, `secrets.json`
- **PostToolUse (Edit|Write)** — Auto-runs Prettier on saved files, then runs affected tests
- **Stop** — Detects uncommitted changes and reminds to run `/end-session`

This automation means every file edit is automatically formatted and tested, and Claude literally cannot forget to commit at the end of a session.

## 1.4 Context Management Strategy

Context management was one of the biggest learning curves. We used several strategies:

**`/clear` between tasks:** After finishing a PR review, we'd `/clear` before picking up a new issue. This prevented stale context from one feature leaking into another.

**`/start-session` and `/end-session` skills:** These bookend every session. `/start-session` reads `claude-progress.txt` and `features.json`, checks recent git history, and runs the test suite. `/end-session` commits, updates progress notes, and pushes. This means if context ever compacts mid-session, the progress file has everything needed to recover.

**Context Mode MCP plugin:** We installed `mksglu/context-mode`, which sandboxes tool output and only passes compact summaries into context. This reduced context consumption dramatically — a 56KB Playwright snapshot becomes 299 bytes. Our `/docs` folder alone is enormous (14+ reference documents), so without this plugin, sessions would compact within 30 minutes.

**Scratchpad pattern:** For complex multi-step tasks (like the Iran research incorporation), we created temporary scratchpads at `docs/scratchpad-[task].md` to persist intermediate decisions. These get deleted after the feature is committed.

## 1.5 MCP Integrations & Plugins

Our `settings.json` enables seven plugins:

| Plugin | Purpose |
|---|---|
| `context-mode` | Context optimization and session continuity |
| `playwright` | E2E test automation |
| `frontend-design` | UI component generation |
| `superpowers` | Brainstorming, spec generation, sub-agent execution |
| `claude-md-management` | CLAUDE.md iteration and management |
| `supabase` | Database operations and migrations |
| `github` | Issue and PR management |

The **Superpowers** plugin deserves special mention. Its brainstorming tool became our primary planning instrument: we'd describe a feature, it would ask clarifying questions, generate a detailed spec, create an implementation plan, and then execute that plan using sub-agents. The Iran research incorporation feature (Issue #9, PR #19) was built almost entirely through this workflow — the brainstorming tool produced a 14KB design spec (`docs/superpowers/specs/2026-03-22-iran-research-incorporation-design.md`) and a 55KB implementation plan (`docs/superpowers/plans/2026-03-22-iran-research-incorporation.md`), which sub-agents then executed.

---

# Part 2: Explore → Plan → Implement → Commit

## 2.1 The Workflow in Practice

We codified the Explore → Plan → Implement → Commit (EPIC) pattern directly into our skills. The `/add-feature` skill enforces it:

```markdown
## Steps
1. Read the feature description from the user
2. Explore relevant code using Glob, Grep, and Read
3. Write failing tests FIRST (the spec)
4. Commit the failing tests: `git commit -m "test: add failing tests for [feature]"`
5. Implement minimum code to make tests pass
6. Commit: `git commit -m "feat: implement [feature] (passes tests)"`
7. Refactor for clarity without changing behavior
8. Commit: `git commit -m "refactor: clean up [feature]"`
```

The `/pick-issue` skill wraps this further: it reads the GitHub issue's acceptance criteria, creates a feature branch, routes to `/add-feature` for game-logic issues, and handles the full PR lifecycle.

## 2.2 Concrete Example: Fog-of-War Filtering (Issue #4, PR #14)

This was one of our cleanest EPIC executions. Here's how it played out:

### Explore Phase
Claude read the existing codebase to understand what was already in place:
- Read `lib/types/simulation.ts` to understand the `Actor`, `ActorState`, and `IntelligencePicture` types
- Read `tests/helpers/mock-scenario.ts` to understand the mock factory's shape
- Read `docs/agent-architecture.ts` to understand how fog-of-war fits into the game loop
- Grepped for existing references to `fogOfWar` or `intelligence` across the codebase

### Plan Phase
Based on the exploration, Claude planned two functions:
- `buildFogOfWarContext(actor, scenario)` — Returns only what an actor would know
- `actorWouldKnowAbout(actor, event, scenario)` — Predicate for event visibility

The plan identified five visibility rules: events you initiated, events that targeted you, major public events, events shared by intel partners, and the exclusion of covert adversary events.

### Implement Phase (TDD)
Tests were written first. The test file (`tests/game/fog-of-war.test.ts`) has 13 tests covering:
- Events the actor initiated are visible
- Events targeting the actor are visible
- Major public events are visible to all actors
- Intel partner sharing works correctly
- Covert adversary events are excluded
- Intelligence picture uses *believed* state, not true state
- Unknown unknowns don't leak to the actor

Then `lib/game/fog-of-war.ts` was implemented to make all 13 tests pass.

### Commit Phase
The git history for this feature shows three clean commits:
```
18bab47 test: add failing tests for fog-of-war filtering
...      feat: implement fog-of-war filtering (passes tests)
...      refactor: clean up fog-of-war
```

After passing tests, a PR was created: `gh pr create --title "feat: fog-of-war filtering" --body "Closes #4"`.

## 2.3 Additional EPIC Examples

The same pattern repeated across all Sprint 1 game logic features:

| Feature | Issue/PR | Tests | Commits |
|---|---|---|---|
| Fog-of-war filtering | #4 / PR #14 | 13 tests | test → feat → refactor |
| Escalation ladder validation | #5 / PR #15 | 18 tests | test → feat → refactor |
| TurnPlan validation | #6 / PR #16 | 14 tests | test → feat → refactor |
| State update application | #7 / PR #17 | 12 tests | test → feat → refactor |
| Research pipeline API | #8 / PR #18 | 97 tests | test → feat → fix |

The git log shows this clearly — every feature branch starts with a `test:` commit, followed by `feat:`, then either `refactor:` or `fix:` commits.

## 2.4 The Scrum Wrapper

Beyond individual features, the EPIC pattern was embedded in a scrum workflow:

1. **Sprint start:** Run `/create-sprint-issues` to batch-create GitHub issues from `docs/scrum-issues.md`
2. **Session start:** Run `/start-session` — reads progress, checks tests, summarizes state
3. **Pick work:** Run `/pick-issue` — lists open sprint issues, creates branch, starts EPIC
4. **Code review:** Run `/review-pr` in a *separate session* — applies the C.L.E.A.R. framework
5. **Session end:** Run `/end-session` — commits, updates progress notes, pushes

This meant every session had a predictable rhythm, and context was never wasted on "what should I work on?"

---

# Part 3: TDD with Claude Code

## 3.1 Red-Green-Refactor Through Skills

Our `/add-feature` skill enforces strict TDD. Every test file starts with a comment marking the RED phase:

```typescript
// Import under test — doesn't exist yet (RED phase)
import { buildFogOfWarContext, actorWouldKnowAbout } from '../../lib/game/fog-of-war'
```

This is a deliberate pattern — the import points to a file that doesn't exist yet. The tests are committed in this failing state (`test: add failing tests for [feature]`), then the implementation is written to make them pass (`feat: implement [feature]`).

## 3.2 Deep Dive: Escalation Ladder Validation (Issue #5, PR #15)

This was probably the most complex TDD feature in Sprint 1. The escalation ladder is a core simulation mechanic — actors have escalation rungs (0–10) with constraints that can be `active`, `weakened`, or `removed`.

### RED Phase — 18 Failing Tests

The test file (`tests/game/escalation.test.ts`) was written first, covering six functions:

**`canEscalateTo`** — Can an actor move to a given escalation rung?
```typescript
it('should not allow escalation past a hard constraint', () => {
  const scenario = createMockScenario()
  const us = scenario.actors.find(a => a.id === 'united_states')!
  const result = canEscalateTo(us, 7, scenario)
  expect(result.allowed).toBe(false)
  expect(result.blockingConstraints[0].severity).toBe('hard')
})
```

**`getDeescalationOptions`** — What rungs can an actor de-escalate to?

**`applyConstraintStatusChange`** — When events weaken or remove constraints.

**`detectEscalationSkip`** — Did an actor skip rungs (which signals desperation)?

**`getConstraintCascadeRisk`** — What cascading effects might a constraint removal trigger?

All 18 tests were committed before any implementation code existed.

### GREEN Phase — Minimum Implementation

`lib/game/escalation.ts` was implemented with the minimum logic to pass all 18 tests. During the C.L.E.A.R. review (run in a separate session via `/review-pr`), a bug was found:

> PR #15 bugfix: `getDeescalationOptions` floor initialization — the `reduce` was using `0` as the initial value instead of `Infinity`, which meant de-escalation options below the current rung were being silently dropped.

This was caught by the code reviewer agent before merge.

### REFACTOR Phase

After the bug fix, a refactor commit cleaned up the implementation without changing behavior. The final PR had all 18 tests green with the bug fixed.

## 3.3 Bug Discovery Through Review

One of the most valuable parts of our TDD workflow was the code review cycle. We wrote a dedicated agent (`code-reviewer.md`) that runs in an isolated worktree and applies the C.L.E.A.R. framework:

- **Context** — Does this fit the architecture?
- **Logic** — Business logic correct? Edge cases?
- **Evidence** — Tests verify behavior, not just pass?
- **Architecture** — Follows established patterns?
- **Risk** — Security, fog-of-war leaks, neutrality violations?

Bugs caught through this process:

| PR | Bug | How Found |
|---|---|---|
| PR #15 | `getDeescalationOptions` floor initialization | C.L.E.A.R. Logic check |
| PR #16 | Concurrent-vs-concurrent incompatibility check (nested loop `i<j`) | C.L.E.A.R. Logic check |
| PR #17 | Missing clamping test (change +1000 should clamp to 100) | C.L.E.A.R. Evidence check |

Each bug was fixed, tested, and committed with a `fix:` message before the PR was merged.

## 3.4 Test Coverage Summary

By the end of Sprint 1, the test suite contained:

| Test File | Tests | Feature |
|---|---|---|
| `tests/game/fog-of-war.test.ts` | 13 | Fog-of-war filtering (F005) |
| `tests/game/escalation.test.ts` | 18 | Escalation ladder validation (F006) |
| `tests/game/turn-plan.test.ts` | 14 | TurnPlan validation (F008b) |
| `tests/game/state-updates.test.ts` | 12 | State update application (F007) |
| `tests/api/research-pipeline.test.ts` | ~40 | Research pipeline API (F009/F010) |
| Other test files | ~6 | Middleware, Supabase client, smoke |
| **Total** | **97** | **All passing** |

Every feature marked `passes: true` in `features.json` has a corresponding test file that was written before the implementation.

## 3.5 Feature Tracking with features.json

We maintain a `features.json` file that tracks every planned feature across all three sprints. The rule is simple: **only mark `passes: true` after tests pass.** This gives us a machine-readable record of what's been TDD'd:

```json
{ "id": "F005", "name": "Fog of war filtering", "passes": true, "test_file": "tests/game/fog-of-war.test.ts" },
{ "id": "F006", "name": "Escalation ladder validation", "passes": true, "test_file": "tests/game/escalation.test.ts" },
{ "id": "F007", "name": "State update application", "passes": true, "test_file": "tests/game/state-updates.test.ts" },
{ "id": "F008b", "name": "TurnPlan validation", "passes": true, "test_file": "tests/game/turn-plan.test.ts" }
```

Sprint 1 closed with 8 features passing out of 11 planned (the remaining 3 are Sprint 2 dependencies).

---

# Part 4: Reflection & Annotated Session Log

## 4.1 Annotated Session Log

Below is a condensed, annotated version of our Claude Code session workflow, drawn from actual sessions documented in `claude-progress.txt` and the git history.

### Session Pattern: Sprint 1, Issue #5 (Escalation Ladder)

**[Session Start]**
```
> /start-session
  ✓ pwd → /home/jason_ingersoll/dev/GeoSim
  ✓ Read claude-progress.txt — last session completed fog-of-war (F005)
  ✓ features.json — F005 passes:true, F006 passes:false (next target)
  ✓ git log — PR #14 merged, main is clean
  ✓ bun run test — 13 tests passing
  ✓ bun run build — clean
  → "Ready to work. F006 (escalation ladder) is next. Want to pick it up?"
```

**[Pick Issue]**
```
> /pick-issue
  → gh issue list --label sprint-1 --state open
  → Selected Issue #5: "feat: Escalation ladder validation"
  → git checkout -b issue-5-escalation-validation
  → Reading acceptance criteria...
  → Issue has game-logic label → routing to /add-feature (TDD)
```

**[Explore Phase]** — Claude reads existing code to understand the landscape:
```
  → Read lib/types/simulation.ts — EscalationLadder, EscalationConstraint types
  → Read tests/helpers/mock-scenario.ts — mock escalation data shape
  → Read docs/geosim-data-model.ts — constraint severity, rung definitions
  → Grep "escalat" across lib/ — no existing implementation
  → "I see 6 functions needed: canEscalateTo, getAvailableEscalationOptions,
     getDeescalationOptions, applyConstraintStatusChange, detectEscalationSkip,
     getConstraintCascadeRisk"
```

**[Plan Phase]** — Claude proposes the approach:
```
  → Plan: 18 tests across 6 describe blocks
  → Each function maps to 2-4 test cases covering happy path + edge cases
  → Mock data already has US (hard constraints) and Iran (removed constraints)
  → "Should I proceed with writing the failing tests?"
```

**[RED Phase]** — Tests written, committed failing:
```
  → Created tests/game/escalation.test.ts (18 tests)
  → bun run test -- --run → 18 FAIL (expected — implementation doesn't exist)
  → git commit -m "test: add failing tests for escalation ladder validation"
```

**[GREEN Phase]** — Implementation to pass tests:
```
  → Created lib/game/escalation.ts
  → bun run test -- --run → 18 PASS
  → git commit -m "feat: implement escalation ladder validation (passes tests)"
```

**[Session End]**
```
> /end-session
  ✓ bun run test — 31 tests passing (13 fog-of-war + 18 escalation)
  ✓ bun run lint — clean
  ✓ Updated claude-progress.txt
  ✓ Updated features.json — F006 passes: true
  ✓ git push -u origin issue-5-escalation-validation
  ✓ gh pr create --title "feat: escalation ladder validation" --body "Closes #5"
```

**[Separate Session — Code Review]**
```
> /review-pr 15
  → gh pr view 15
  → gh pr diff 15
  → C.L.E.A.R. review:
    Context: ✓ Fits architecture, follows CLAUDE.md conventions
    Logic: ⚠ getDeescalationOptions uses reduce(0) — should be reduce(Infinity)
    Evidence: ✓ 18 tests cover all 6 functions
    Architecture: ✓ Pure functions, no side effects
    Risk: ✓ No fog-of-war leaks, no neutrality violations
  → gh pr review 15 --request-changes --body "Bug: floor init in getDeescalationOptions..."
```

### Session Pattern: Iran Research Incorporation (Issue #9, PR #19)

This was a more complex feature that used the Superpowers brainstorming tool:

**[Brainstorming Phase]**
```
> Used Superpowers brainstorming tool for Issue #9
  → Tool asked clarifying questions:
    "How should verified data override AI-generated data?"
    "Should the seed script be idempotent?"
    "How do you handle events that span multiple days?"
  → Generated design spec (14KB) → docs/superpowers/specs/2026-03-22-iran-research-incorporation-design.md
  → Generated implementation plan (55KB) → docs/superpowers/plans/2026-03-22-iran-research-incorporation.md
```

**[Sub-Agent Execution]**
```
  → Plan broken into 8 tasks
  → Sub-agents executed each task:
    Task 1: VerificationStatus type + SeedEvent type
    Task 2: Iran initial state from research docs
    Task 3: ~20 SeedEvent objects from verified timeline
    Task 4: seed-iran.ts CLI script
    Task 5: computeCacheKey() for shared commit caching
    Task 6: Trunk caching migration
    Task 7: verifiedContext param on pipeline
    Task 8: Smoke tests for seed script
  → 97 tests passing, lint clean, build clean
```

## 4.2 Reflection

### How does the EPIC workflow compare to my previous approach?

Before this class, my development workflow was basically: think about it for a while, start coding, hit a wall, Google things, keep coding, test manually, commit when it seems to work. There wasn't a lot of structure to it, and I'd often realize halfway through a feature that I'd misunderstood the requirements.

The Explore → Plan → Implement → Commit pattern forced me to slow down in a way that actually sped me up. The Explore phase catches assumptions early — when Claude reads through existing types and test helpers before writing anything, it often surfaces things I hadn't considered. For example, during the fog-of-war feature, the exploration phase revealed that the mock scenario factory already had intelligence picture data with "believed" vs "actual" military readiness values. That shaped the entire test strategy.

The Plan phase was where the Superpowers brainstorming tool really shone. Instead of jumping into code, the tool would ask me questions I hadn't thought about. For the Iran research incorporation feature, it asked "Should the seed script be idempotent?" — which led to the `--from=<event_id>` flag for incremental appending. I wouldn't have thought of that until I was already deep in the implementation.

The biggest difference, honestly, is that I'm not afraid of complex features anymore. The research pipeline (97 tests, 7-stage AI pipeline with parallel execution) would have been intimidating before. But when you break it down into Explore → Plan → RED → GREEN → REFACTOR, even complex features become manageable chunks. Each chunk has a clear definition of done: the tests pass.

### What context management strategies worked best?

Three strategies stood out:

**1. The progress file as a between-session brain.** `claude-progress.txt` is updated at the end of every session with what was done, what's in progress, known bugs, and architecture decisions. This means a fresh Claude Code session can get up to speed in seconds. When I'd start a new session the next day, `/start-session` would read this file and Claude would immediately know "you finished fog-of-war yesterday, escalation is next, 13 tests passing." It was like having a project partner who actually reads the meeting notes.

**2. Context Mode for token conservation.** Our docs folder is massive — the data model alone is hundreds of lines, and we have 14 reference documents. Without Context Mode, a session would compact in under 30 minutes. With it, we could work for hours. The plugin sandboxes tool output (git logs, test results, file reads) and only passes compact summaries into context. It's the difference between a 30-minute session and a 3-hour session.

**3. `/clear` between unrelated tasks.** This was the simplest strategy but one of the most effective. After finishing a PR review, the context is full of diff hunks and C.L.E.A.R. analysis. If you then try to pick up a new feature, Claude is still "thinking about" the review. A `/clear` wipes that slate clean. We built this into the workflow: review PR → `/clear` → pick new issue.

One strategy that *didn't* work was trying to do too much in one session. Early on, I tried to implement two features back-to-back without clearing. By the second feature, Claude was mixing up types from the first feature. The one-issue-per-session constraint in `/pick-issue` was added after that experience.

### What surprised me about TDD with Claude Code?

The thing that surprised me most was how natural TDD felt with an AI assistant. When I write tests myself, there's always a temptation to write tests I know will pass — to test the easy cases and skip the edge cases. But when I described the feature to Claude and asked it to write failing tests first, it generated tests I wouldn't have thought of.

For example, in the fog-of-war tests, Claude generated a test for "unknown unknowns" — verifying that Russia's covert intel sharing with Iran is invisible to the US, and that the context separates `unknownUnknownsForEngine` (for the omniscient resolution engine) from `knownUnknowns` (what the actor suspects but can't confirm). That's a subtle distinction in our domain model that I might have overlooked.

The code review step was equally valuable. Running the `/review-pr` skill in a separate session meant Claude was reviewing code without the context of having written it. This caught real bugs: the `getDeescalationOptions` floor initialization bug in PR #15, the missing `i<j` nested loop for concurrent-vs-concurrent incompatibility in PR #16, and a missing clamping test in PR #17. These are the kinds of bugs that slip through manual testing.

### What would I do differently?

If I started over, I'd set up the scrum workflow earlier. We spent the first session or two doing ad-hoc work before the skills and hooks were in place. Once the full workflow was configured — `/start-session`, `/pick-issue`, `/add-feature`, `/review-pr`, `/end-session` — everything moved much faster because there was zero overhead figuring out "what do I do next?"

I'd also invest in the mock scenario factory earlier. The `createMockScenario()` helper that powers all our game logic tests was built in Issue #3. Once it existed, every subsequent TDD feature was trivially easy to set up. Writing the factory first paid compound interest across every feature.

Finally, I'd explore MCP integrations from day one. The Superpowers brainstorming tool transformed how we plan features, but I didn't discover it until mid-sprint. If I'd had it from the start, the design specs for earlier features would have been much richer.

---

## Appendix A: Repository Structure

```
GeoSim/
├── .claude/
│   ├── agents/code-reviewer.md        ← C.L.E.A.R. review agent
│   ├── hooks/protect-files.sh         ← Block edits to secrets
│   ├── settings.json                  ← Permissions, hooks, plugins
│   └── skills/                        ← 14 custom skills
│       ├── start-session.md           ← Session startup ritual
│       ├── end-session.md             ← Session shutdown ritual
│       ├── pick-issue.md              ← Sprint issue selection
│       ├── add-feature.md             ← TDD workflow (EPIC)
│       ├── review-pr.md               ← C.L.E.A.R. PR review
│       ├── create-sprint-issues.md    ← Batch issue creation
│       ├── sprint-standup.md          ← Standup report generator
│       ├── run-turn.md                ← Game turn execution
│       ├── seed-iran-scenario.md      ← Iran scenario seeding
│       ├── test-agent.md              ← AI agent testing
│       ├── update-ground-truth.md     ← Ground truth updates
│       ├── security-audit.md          ← OWASP security audit
│       ├── quality-gate.md            ← Quality audit (read-only)
│       └── quality-fix.md             ← Quality fix implementation
├── CLAUDE.md                          ← Project brain (200 lines)
├── claude-progress.txt                ← Between-session memory
├── features.json                      ← Feature tracking (35 features)
├── lib/game/
│   ├── fog-of-war.ts                  ← F005 implementation
│   ├── escalation.ts                  ← F006 implementation
│   ├── turn-plan.ts                   ← F008b implementation
│   ├── state-updates.ts               ← F007 implementation
│   └── cache-key.ts                   ← Shared commit caching
├── tests/game/
│   ├── fog-of-war.test.ts             ← 13 tests (TDD)
│   ├── escalation.test.ts             ← 18 tests (TDD)
│   ├── turn-plan.test.ts              ← 14 tests (TDD)
│   ├── state-updates.test.ts          ← 12 tests (TDD)
│   └── cache-key.test.ts              ← Cache key tests (TDD)
├── docs/
│   ├── prd.md, data-model, schema...  ← 14 reference documents
│   └── superpowers/
│       ├── specs/                     ← Brainstorming-generated specs
│       └── plans/                     ← Sub-agent implementation plans
└── supabase/migrations/               ← Database schema + trunk caching
```

## Appendix B: Git History Highlights

```
379c6bd docs: add frontend Spec 1 design doc
09ab314 Merge pull request #19 (Iran research incorporation)
7e33d1d fix: address PR #19 review — import ActorDecision, add seed tests
fd2b0b8 docs: update progress log — Iran research incorporation
f32560d fix: add BranchDivergence type and ActorAgentContext
1b5ff7f docs: add Iran research incorporation implementation plan
97f19da fix: add explicit return type to seed-iran commit query
7499885 feat: add verifiedContext to populate pipeline
4b43125 feat: add Iran scenario seed script with smoke tests
a636738 feat: add Iran events seed data and barrel export
31a6f76 feat: add Iran conflict initial state with verified research data
ada1133 feat: add computeCacheKey utility for shared commit caching (TDD)
cce8a51 feat: add trunk caching migration
53d6f86 feat: add VerificationStatus and SeedEvent types
62db07f docs: add Iran research incorporation design spec
4bb0387 feat: add research pipeline API routes
b1fdbe9 feat: implement research pipeline stages 0-6 with parallel execution
7da6392 feat: add Anthropic SDK and callClaude helper with prompt caching
18bab47 test: add failing tests for research pipeline API routes
3692b9e Merge pull request #17 (state updates)
308caeb fix: resolve merge conflicts with main
0d5cc42 fix: prefer-const for updatedGlobal, eslint argsIgnorePattern
fa8a21f Merge pull request #16 (TurnPlan validation)
a397b62 Merge pull request #15 (escalation validation)
13df4d3 Merge pull request #14 (fog-of-war)
8608f2d fix: concurrent-vs-concurrent incompatibility check
7bda05b fix: above-100 clamping test, unknown-actorId test
```

## Appendix C: PR Review Evidence

All PRs received C.L.E.A.R. reviews. Bugs found and fixed before merge:

| PR | Bug Description | Severity | Fix Commit |
|---|---|---|---|
| #15 | `getDeescalationOptions` reduce initial value should be `Infinity`, not `0` | HIGH | `fix: getDeescalationOptions floor init` |
| #16 | Concurrent action incompatibility only checked vs primary, not vs each other (`i<j` loop) | HIGH | `8608f2d` |
| #16 | Under-allocation warning missing for resource < 100% total | MEDIUM | `8608f2d` |
| #17 | Missing test for clamping (change +1000 should clamp to 100) | MEDIUM | `7bda05b` |
| #17 | Unknown actorId should be no-op, not throw | LOW | `7bda05b` |
| All | ESLint `argsIgnorePattern: ^_` needed for Vercel builds | LOW | Fixed on all 4 branches |
