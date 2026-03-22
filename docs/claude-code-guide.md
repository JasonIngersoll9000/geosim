# GeoSim — Claude Code Workflow Guide

This guide covers everything you need to work effectively with Claude Code on the GeoSim
project. Read it once before your first session. Reference it whenever you're unsure what
to do next.

---

## Table of Contents

1. [What is Claude Code?](#1-what-is-claude-code)
2. [Session Lifecycle](#2-session-lifecycle)
3. [How Skills Work](#3-how-skills-work)
4. [Project Skills Reference](#4-project-skills-reference)
5. [Plugin Skills Reference](#5-plugin-skills-reference)
6. [Context Management](#6-context-management)
7. [Memory Management](#7-memory-management)
8. [CLAUDE.md Management](#8-claudemd-management)
9. [Feature Development Workflow (TDD)](#9-feature-development-workflow-tdd)
10. [Scrum & Sprint Workflow](#10-scrum--sprint-workflow)
11. [Code Review Workflow](#11-code-review-workflow)
12. [AI Agent Testing](#12-ai-agent-testing)
13. [Performance Tips](#13-performance-tips)
14. [Common Pitfalls](#14-common-pitfalls)

---

## 1. What is Claude Code?

Claude Code is an AI assistant that runs in your terminal and operates directly on your
codebase. Unlike a chat interface, it can read files, run commands, edit code, and call
APIs — all in the context of your project.

**Key mental model:** Claude Code is a pair programmer that reads your entire project
context before responding. The better you feed it context (via CLAUDE.md, skills, and
memory), the better it performs.

### Environment Notes (WSL2)

This project runs in WSL2. **Never use `npm` or `npx`** — they are Windows binaries that
cannot execute Linux binaries. Always use `bun`:

```bash
bun run dev          # Start dev server
bun run test -- --run  # Run tests
bun run lint         # ESLint
bun run build        # Production build
bun run typecheck    # tsc --noEmit
```

---

## 2. Session Lifecycle

Every session follows the same pattern. This keeps context fresh and progress tracked.

### Start of Session → `/start-session`

Run this **every time** you open Claude Code on this project:

```
/start-session
```

What it does:
- Confirms you're in the right directory
- Reads `claude-progress.txt` to recover from the last session
- Reads `features.json` to see what's done and what's not
- Reads the last 20 git commits for recent context
- Runs the test suite and build to check current health
- Flags any failures you need to fix before starting new work

> **Why:** Claude Code has no memory between sessions by default. `/start-session`
> is how you reconstruct context. Skipping it means Claude will make decisions without
> knowing what happened in previous sessions.

### During the Session

- Use `/clear` between **unrelated tasks** to reset context and avoid confusion
- Use skills (see Section 4) for common workflows — don't reinvent them each time
- Create a scratchpad at `docs/scratchpad-[task].md` for complex multi-step work
  and delete it when done

### End of Session → `/end-session`

Run this **before closing** Claude Code:

```
/end-session
```

What it does:
- Runs the full test suite
- Runs lint
- Commits any uncommitted changes
- Updates `claude-progress.txt` with what you completed, what's in progress,
  any blockers, key decisions made, and what to do next
- Updates `features.json` if features were completed
- Pushes to remote

> **Why:** `claude-progress.txt` is the bridge between sessions. Future Claude (and
> future you) will read it. Write it like a handoff note to your next-shift self.

---

## 3. How Skills Work

Skills are reusable instruction sets stored as Markdown files in `.claude/skills/`.
They encode proven workflows so you don't have to describe them from scratch each time.

**To invoke a skill:**

```
/skill-name
```

For example:
```
/start-session
/add-feature
/review-pr 42
```

Skills can also be invoked with arguments (like a PR number for `/review-pr`).

**Project skills** live in `.claude/skills/` and are specific to GeoSim.

**Plugin skills** are installed globally via the Claude Code plugin system and available
in all projects. GeoSim uses four plugin families — see Section 5.

> **Rule:** If a skill exists for what you're about to do, use it. Skills encode
> lessons learned and prevent common mistakes. Don't paraphrase them from memory.

---

## 4. Project Skills Reference

These are the 14 skills built specifically for GeoSim, in the order you'll use them.

---

### `/start-session`

**When to use:** Beginning of every Claude Code session, no exceptions.

**What it does:**
1. Confirms working directory
2. Reads `claude-progress.txt` for session continuity
3. Reads `features.json` to see current state
4. Reads last 20 git commits
5. Runs `bun run test -- --run` and `bun run build`
6. Reports health status and flags failures

**Output:** A clear picture of where the project stands before you write a line of code.

---

### `/end-session`

**When to use:** Before closing Claude Code at the end of any work session.

**What it does:**
1. Runs full test suite
2. Runs lint
3. Commits uncommitted changes with conventional commit message
4. Updates `claude-progress.txt` with structured handoff note
5. Updates `features.json` for any completed features
6. Pushes to remote

**`claude-progress.txt` structure:**
```
## Completed this session
- [specific things done]

## In progress
- [work that's started but not done]

## Blockers
- [anything stuck]

## Key decisions
- [architectural or design decisions made]

## Next session
- [most important thing to do next]
```

---

### `/add-feature`

**When to use:** Any time you're implementing a new feature or fixing a bug.
This enforces the TDD red-green-refactor workflow.

**What it does (in order):**
1. **Explore** — reads relevant existing code to understand what's already there
2. **Plan** — designs the implementation approach before writing any code
3. **Write failing tests** — commits as `test: add failing tests for X`
4. **Implement** — writes minimum code to make tests pass, commits as `feat: implement X`
5. **Refactor** — cleans up without breaking tests, commits as `refactor: clean up X`
6. **Run full suite** — confirms nothing else broke
7. **Update `features.json`** — marks feature as `passes: true`

**Critical rules:**
- Never write implementation code before tests
- Never commit tests and implementation in the same commit
- Never mark `passes: true` before tests actually pass

> See Section 9 for the full TDD workflow explanation.

---

### `/pick-issue`

**When to use:** At the start of a new feature sprint cycle, to select what to work on.

**What it does:**
1. Runs `gh issue list --assignee @me --label sprint-N --state open`
2. If nothing assigned, shows all open sprint issues
3. Asks which issue to work on
4. Reads the full issue with acceptance criteria
5. Creates a feature branch: `issue-NUMBER-short-description`
6. Routes to `/add-feature` (for `game-logic` label) or plan mode (for `frontend`/`infrastructure`)
7. Works through all acceptance criteria
8. Runs tests and lint
9. Commits, pushes, creates PR referencing the issue
10. Updates `features.json` and `claude-progress.txt`

**Branch naming:** `issue-42-fog-of-war-filtering`

**PR format:** `feat: implement fog of war filtering` + `Closes #42` in body

---

### `/create-sprint-issues`

**When to use:** At the beginning of a sprint, to populate GitHub Issues from the sprint plan.

**What it does:**
1. Reads `docs/scrum-issues.md` for the source of truth
2. Asks which sprint to create issues for
3. Creates milestones and labels first (if not already present)
4. Runs `gh issue create` for each issue with all metadata
5. Reports created issue numbers

**Important:** Verify no duplicate issues exist before running. This is a one-time
operation per sprint.

---

### `/sprint-standup`

**When to use:** For daily standups or sprint reviews.

**What it does:**
1. Runs `gh issue list` for open and recently closed issues
2. Reads `claude-progress.txt`
3. Reads `features.json`
4. Reviews recent git log
5. Generates a structured report:
   - **Done:** features completed with issue numbers
   - **In Progress:** active work with % complete estimate
   - **Blocked:** issues with specific blockers
   - **Sprint Health:** overall sprint velocity and risk

---

### `/review-pr`

**When to use:** When a partner has opened a PR and asked for review.

**Usage:** `/review-pr 42` (pass the PR number)

**What it does (C.L.E.A.R. framework):**

| Letter | Dimension | What to check |
|---|---|---|
| **C** | Context | Does the PR solve the right problem? Does it match the issue? |
| **L** | Logic | Is the implementation correct? Are edge cases handled? |
| **E** | Evidence | Do tests exist? Do they pass? Are they meaningful? |
| **A** | Architecture | Does it fit the existing patterns? No anti-patterns? |
| **R** | Risk | Security concerns? Performance regressions? Breaking changes? |

**GeoSim-specific checks:**
- No fog-of-war leaks (actor context must be filtered before passing to agents)
- Neutrality violations in any AI prompt changes
- Tests exist for all new game logic
- No `any` types in TypeScript (use `unknown` and narrow)
- No client-side secrets (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

**Output:** Posts a `gh pr review` as approve, comment, or request-changes.

---

### `/quality-gate`

**When to use:** Before a sprint demo, before merging to main, or after a big refactor.
Also useful for a health check when something feels wrong.

**What it does (read-only audit — does NOT fix anything):**
- Test coverage check
- Lint and type errors
- Security scan (secrets, dependencies)
- CI/CD configuration check
- Build verification
- Writes report to `docs/quality-gate-report.md`

> **Important:** `/quality-gate` only reports. It never changes code. Read the report,
> then decide what to fix manually or via `/quality-fix`.

---

### `/quality-fix`

**When to use:** After reviewing `docs/quality-gate-report.md` and deciding to address gaps.

**What it does (3 gated steps — each requires confirmation):**
1. **Config fixes** — tsconfig, eslint, vitest settings
2. **Dependency fixes** — security patches, missing deps (asks before changing)
3. **CI fixes** — GitHub Actions workflow updates (asks before changing)

**What it does NOT do:**
- Write or modify tests (use `/add-feature` for test gaps)
- Change business logic
- Modify AI prompts

---

### `/security-audit`

**When to use:** Before any release, after adding new dependencies, or if you suspect
a security issue. Required for Sprint 3 (Issue #35).

**What it checks:**
1. Gitleaks scan for committed secrets
2. `npm audit` for vulnerable dependencies
3. Input validation on all `/api/*` routes
4. API key client exposure (any `NEXT_PUBLIC_` that shouldn't be)
5. Supabase RLS policies are active on all tables
6. XSS vectors in any HTML rendering
7. Auth middleware coverage
8. Generates SBOM (`sbom.json`)

**Output:** Security report with severity ratings. Does NOT auto-fix — all findings
require deliberate human review before patching.

---

### `/run-turn`

**When to use:** To execute a full simulation turn programmatically (for testing the game
loop or seeding turn data).

**What it does (5 phases):**
1. **Planning** — builds fog-of-war context per actor, calls actor agent API in parallel
2. **Resolution** — calls resolution engine with all actor TurnPlans
3. **Judging** — calls judge evaluator; retries resolution if score < 60 (max 2 retries)
4. **Reaction** — identifies immediate triggers, runs reaction phase if needed
5. **Narration** — calls narrator, creates immutable turn commit, updates branch HEAD

**Critical rules:**
- Never skip judge evaluation
- Never modify previous turn commits (they are immutable)
- Log API token costs to `claude-progress.txt`

---

### `/test-agent`

**When to use:** To test a single AI agent in isolation before integrating it into the game loop.

**Agents you can test:**

| Agent | Route | Test focus |
|---|---|---|
| Actor agent | `POST /api/ai/actor-agent` | Decision quality, fog-of-war, TurnPlan assembly |
| Resolution engine | `POST /api/ai/resolution-engine` | Collision resolution, synergy/tension, event chains |
| Judge | `POST /api/ai/judge` | Score calibration, bias detection, retry behavior |
| Narrator | `POST /api/ai/narrator` | Prose quality, neutrality, entity balance |

**What it does:**
1. Provides curl commands with the correct request structure for each agent
2. Guides you through the verification checklist (structure, completeness, neutrality)
3. Tests the retry loop (for judge)
4. Verifies prompt caching is active

**Key Iran scenario facts to preserve in mock data:**
- US believes Iran military readiness = 25 (actual = 58)
- Strait of Hormuz = blocked
- US domestic support = 31%
- Iran escalation rung = 6, nuclear constraints removed

---

### `/seed-iran-scenario`

**When to use:** Once, to populate the Iran conflict scenario into Supabase and create
the ground truth trunk.

**What it does (8 steps):**
1. Verify environment (typecheck, check `.env.local`)
2. Create scenario record via `POST /api/scenarios`
3. Run Stage 0 (framing) — interactive
4. Run Stages 1-6 (full research pipeline) — poll until complete
5. Verify data quality (all 8+ actors, nuclear cascade, Strait data, fog-of-war)
6. Create ground truth trunk branch
7. Create initial Turn 0 commit
8. Verify playability in browser

> **Warning:** Never re-seed over an existing trunk. Create a new scenario record instead.

---

### `/update-ground-truth`

**When to use:** When real-world events in the Iran conflict need to be incorporated into
the simulation's ground truth trunk.

**What it does:**
1. Reads current trunk HEAD state
2. Searches recent Iran conflict news
3. Parses new events into structured `Event` objects
4. Tags each event with source confidence level
5. Assesses actor state changes
6. Creates a new trunk commit (append-only)
7. Updates `claude-progress.txt`

**Rules:**
- Append-only — never modify past commits
- Neutrality principle — all events from multiple perspectives
- Only independently verified events (not single-source claims)

---

## 5. Plugin Skills Reference

These skills come from globally installed plugins and are available across all projects.

---

### `superpowers:test-driven-development`

**When to use:** Before implementing any feature. This is the foundation of `/add-feature`.

**The Iron Law:** Never write implementation code before tests. No exceptions.

**Cycle:**
1. **RED** — Write a failing test that defines the desired behavior
2. **GREEN** — Write the minimum code to make it pass
3. **REFACTOR** — Clean up without breaking the test

**Enforced by `/add-feature`** — the skill won't let you skip steps.

---

### `superpowers:writing-skills`

**When to use:** When creating or improving skill files in `.claude/skills/`.

Guides you through the skill authoring process including TDD for skills (test with
subagents before publishing), CSO (Claude Search Optimization) for descriptions,
and the Red-Green-Refactor cycle applied to documentation.

---

### `context-mode:ctx-stats`

**When to use:** Any time you want to see how much context you've consumed.

```
/context-mode:ctx-stats
```

Shows: tokens used, context savings from using ctx tools vs raw Bash, and current
context health.

Run this periodically during long sessions to know when to `/clear`.

---

### `frontend-design:frontend-design`

**When to use:** Before building any UI component. Enforces the GeoSim "Declassified
War Room" aesthetic.

**Invoked automatically** by `/pick-issue` when the issue has a `frontend` label.

Key checks before building any component:
- Classification banner present?
- Three-font system (Barlow / EB Garamond / IBM Plex Mono) applied correctly?
- No rounded corners above 6px?
- No box-shadows?
- No gradient backgrounds (except map fog-of-war)?
- No spinner — use dispatch terminal animation for async operations

---

### `claude-md-management:claude-md-improver`

**When to use:** Periodically (every 2-3 sprints) or when CLAUDE.md feels stale.

**What it does:**
1. Finds all `CLAUDE.md` files in the repo
2. Scores each one on 6 quality dimensions
3. Outputs a quality report with specific gaps
4. Proposes targeted additions (not rewrites)
5. Applies changes after your approval

> CLAUDE.md is loaded into every session. Outdated info wastes tokens and misleads Claude.

---

## 6. Context Management

Context is the amount of conversation history Claude can hold at once. Long sessions
exhaust it. These techniques keep it healthy.

### The Context Mode MCP Plugin

The most important tool for managing context. Instead of printing large outputs directly
into the conversation (which consumes context), Context Mode keeps them in a sandbox
that Claude can search efficiently.

**When to use Context Mode instead of raw Bash:**

| Operation | Use | Why |
|---|---|---|
| Running tests | `ctx_execute` | Test output can be thousands of lines |
| Reading log files | `ctx_execute_file` | Avoids flooding context |
| Parsing JSON responses | `ctx_execute` | AI analysis, not raw dump |
| API calls | `ctx_execute` | Response + analysis stays contained |
| Web fetches | `ctx_fetch_and_index` | Indexes for search, not dump |
| Short git commands | Bash | Output is small, direct is fine |
| File navigation | Bash | `ls`, `cd` are small |

**The three Context Mode tools:**

```
ctx_batch_execute(commands, queries)
```
Primary research tool. Runs multiple commands AND searches in one call. Use this
instead of running commands one by one.

```
ctx_search(queries: ["q1", "q2"], source: "session-events")
```
Follow-up questions on previously indexed content. Much faster than re-running commands.

```
ctx_execute(language, code)
ctx_execute_file(path, language, code)
```
For processing large files or API responses — keeps analysis out of context.

### When to `/clear`

Clear context between **unrelated tasks**. Signs you should clear:
- You've switched from frontend to backend work
- The current task is done and you're starting something new
- Context stats show > 60% usage
- Claude is making references to old code you've already replaced

### Context Mode Stats

```
/context-mode:ctx-stats
```

Run this periodically. If context savings are low, you're probably using raw Bash
where you should be using ctx tools.

---

## 7. Memory Management

Memory is how Claude remembers things across sessions. There are three layers.

### Layer 1: `claude-progress.txt` (Between-Session Memory)

**Location:** Project root

**What it contains:** Structured handoff note written by `/end-session`

**When to read:** `/start-session` reads it automatically

**When to write:** `/end-session` writes it automatically

> If you ever restart a session and Claude doesn't know what you were working on,
> `claude-progress.txt` is what it should read first.

### Layer 2: Auto-Memory Files (Persistent Learning)

**Location:** `~/.claude/projects/-mnt-c-Users-Jason-Ingersoll-dev-GeoSim/memory/`

**Index:** `MEMORY.md` in the same directory (loaded every session)

These are automatically written when Claude learns something worth remembering:

| Memory Type | When Created | Example |
|---|---|---|
| `user` | Learning about your role or preferences | "User prefers concise responses" |
| `feedback` | You correct or confirm Claude's behavior | "Use bun not npm in WSL2" |
| `project` | Non-obvious project state or decisions | "Merge freeze begins 2026-04-01" |
| `reference` | Where to find external information | "Iran conflict data in docs/Iran Research/" |

**You can explicitly ask Claude to remember something:**
> "Remember that we decided to use Promise.all for all actor agent calls"

**Current memories:**
- `feedback_wsl2_tooling.md` — Use bun not npm/npx in WSL2

### Layer 3: CLAUDE.md (Project Instructions)

Loaded automatically at the start of every session. See Section 8.

---

## 8. CLAUDE.md Management

`CLAUDE.md` is loaded as project instructions at the start of every session. It's the
single most important file for Claude Code performance.

### What's in CLAUDE.md

The GeoSim `CLAUDE.md` contains:
- Tech stack and tooling overview
- WSL2 environment constraints (`bun` not `npm`)
- Architecture overview with directory structure
- Key design patterns (fog-of-war, escalation ladder, TurnPlan, etc.)
- Scrum workflow summary
- Session management instructions
- Feature tracking instructions
- Conventions (TypeScript strict, no `any`, conventional commits)
- Do NOT rules (critical guardrails)
- `@import` references to all `/docs` files

### The @import System

The `@` prefix in CLAUDE.md loads the referenced file's content as additional context:

```markdown
@docs/prd.md
@docs/geosim-data-model.ts
@docs/agent-architecture.ts
```

This means Claude effectively has the full PRD, data model, and architecture docs
available without you needing to paste them in.

### When to Update CLAUDE.md

Update it when:
- The architecture changes significantly (new directory, new pattern)
- A new convention is established (`bun` instead of `npm` was added this way)
- A new "Do NOT" rule is discovered
- A new reference doc is added to `/docs`

**Never update CLAUDE.md to add temporary or session-specific notes** — those go in
`claude-progress.txt` or auto-memory.

### Auditing CLAUDE.md

Run periodically (every 2-3 sprints):

```
/claude-md-management:claude-md-improver
```

This audits the file for:
- Stale commands that no longer work
- Missing environment setup
- Outdated architecture descriptions
- Undocumented gotchas discovered since the last update

It presents a quality report and proposed changes before editing anything.

---

## 9. Feature Development Workflow (TDD)

The canonical workflow for implementing any feature on GeoSim.

### The E→P→I→C Pattern

```
Explore → Plan → Implement → Commit
```

**1. Explore**

Before writing any code, read the relevant existing code:
- What functions already exist that you might use?
- What types are defined that you must conform to?
- What tests already exist that reveal expected behavior?

Use the `Explore` subagent for broad exploration:
```
Agent: Explore — how does fog-of-war filtering work currently?
```

**2. Plan**

Think through the implementation before touching code:
- What functions need to be created?
- What types need to be added or changed?
- What edge cases exist?
- What could break?

Use plan mode (`/plan`) for complex multi-file changes.

**3. Implement (test-first)**

```
RED:    Write failing tests → commit "test: add failing tests for X"
GREEN:  Write minimum implementation → commit "feat: implement X (passes tests)"
REFACTOR: Clean up → commit "refactor: clean up X"
```

Never combine test and implementation commits. The git history should clearly show
the TDD cycle.

**4. Commit**

```bash
# Conventional commit format
git commit -m "feat: implement fog-of-war filtering for actor agents"
git commit -m "test: add failing tests for fog-of-war filtering"
git commit -m "refactor: extract actorWouldKnowAbout helper function"
```

### TDD for GeoSim Game Logic

The Tier 1 test files (see `docs/testing-strategy.md`) follow this structure:

```
tests/game/fog-of-war.test.ts       ← F005
tests/game/escalation.test.ts       ← F006
tests/game/state-updates.test.ts    ← F007
tests/game/branching.test.ts        ← F008
tests/game/turn-plan.test.ts        ← F008b
tests/game/constraint-cascades.test.ts ← F033
```

Mock data lives in `tests/helpers/mock-scenario.ts`. Always use the Iran scenario
mock data — it includes the key fog-of-war divergences (US believes Iran readiness=25,
actual=58) that test the system properly.

### Feature Tracking

`features.json` tracks every planned feature. Rules:
- Only mark `passes: true` after tests actually pass
- Never remove or edit feature descriptions — only change `passes`
- `/end-session` updates this automatically when you complete features

---

## 10. Scrum & Sprint Workflow

### Sprint Structure

| Sprint | Duration | Focus |
|---|---|---|
| Sprint 1 | Week 1 | Foundation: scaffolding, schema, TDD, research pipeline |
| Sprint 2 | Weeks 2-3 | Core: game loop, AI agents, frontend, map |
| Sprint 3 | Week 3-4 | Polish: CI/CD, monitoring, security, demo prep |

### Creating Issues → `/create-sprint-issues`

At the start of each sprint, run this to populate GitHub Issues from `docs/scrum-issues.md`.
This is a one-time operation per sprint — do not run it if issues already exist.

### Picking Up Work → `/pick-issue`

```
/pick-issue
```

This:
1. Shows your assigned sprint issues
2. You select one
3. Creates a feature branch
4. Routes you to the right workflow (TDD for game-logic, plan mode for frontend)
5. Guides you through all acceptance criteria

**One issue per session.** Focus.

### Daily Standup → `/sprint-standup`

```
/sprint-standup
```

Use this for:
- Daily standup prep
- Sprint review
- Checking overall sprint health before a planning meeting

### Partner Coordination

| Partner A | Partner B |
|---|---|
| Frontend, Map, UX, E2E tests | AI pipeline, game logic, backend, unit tests |
| Issues: #9, #10, #11, #12, #20-29 | Issues: #1-8, #13-19, #30, #32 |

Both partners: CI/CD (#33), monitoring (#34), security (#35), docs (#41).

---

## 11. Code Review Workflow

### C.L.E.A.R. Framework

Every PR review follows five dimensions:

**Context** — Does this PR solve the right problem?
- Does it match the issue's acceptance criteria?
- Is the scope appropriate (not too large, not missing pieces)?

**Logic** — Is the implementation correct?
- Does the code do what the author thinks it does?
- Are edge cases handled (null checks, empty arrays, missing actor IDs)?
- No off-by-one errors, no race conditions?

**Evidence** — Is it tested?
- Do tests exist for all new game logic?
- Are the tests meaningful (not just smoke tests)?
- Do they cover failure cases, not just happy paths?

**Architecture** — Does it fit the project?
- Follows TypeScript strict mode (no `any`)?
- Uses `{ data, error }` shape for API routes?
- No hardcoded actor-specific logic?
- No `localStorage` in components?
- Follows existing patterns from `docs/component-tree.ts`?

**Risk** — Could this break something?
- Could secrets leak to the client?
- Could this corrupt simulation state?
- Could this produce biased AI outcomes?

### GeoSim-Specific Review Checklist

```
□ No fog-of-war leaks (actor context must use buildFogOfWarContext())
□ Neutrality preamble still in all agent prompts
□ No actor-specific logic hardcoded (use data model)
□ Tests exist for all new game logic functions
□ No localStorage usage in React components
□ No console.log left in production paths
□ All new API routes validate input at the boundary
□ No client-side usage of server-only env vars
□ Supabase RLS policies still enforced for new tables
□ Conventional commit messages
□ PR closes the issue number
□ features.json updated if feature is complete
```

### Running a Review

```
/review-pr 42
```

Claude will:
1. Fetch the PR diff and description
2. Check all acceptance criteria from the issue
3. Apply C.L.E.A.R. + GeoSim-specific checks
4. Post a review comment via `gh pr review`

---

## 12. AI Agent Testing

Before integrating an agent into the game loop, test it in isolation.

### Quick Reference

```
/test-agent
```

The skill walks you through:
1. Setting up mock inputs (or extending `tests/helpers/mock-scenario.ts`)
2. Calling the agent directly via curl
3. Verifying output structure
4. Checking neutrality
5. Testing the retry loop (judge only)
6. Verifying prompt caching

### Actor Agent Checklist

- Returns `situationAssessment` (2-3 paragraphs from actor's perspective)
- Returns 8-12+ decisions across all dimensions
- Each decision has 2-5 parameters with 2-3 named profiles
- Returns valid `turnPlan` with `primaryAction` + `concurrentActions`
- `resourceAllocation` sums to 100%
- Decisions reflect the actor's worldview (not Western defaults for Iran/Russia)

### Resolution Engine Checklist

- Returns `resolvedEvents` with full causal chains
- US intelligence failure visible (acting on wrong Iran readiness: 25 vs 58)
- Asymmetric costs modeled (Shahed $20K vs Patriot $3M)
- Friction applied equally to all actors (no Western reliability bonus)

### Judge Checklist

- All 5 scores returned
- `biasCheck.detected` is false (or has valid reason)
- Low scores < 70 have specific `issues` with suggestions
- If score < 60, verify retry logic triggers

### Narrator Checklist

- 3-5 paragraphs, EB Garamond prose quality
- US and Iran named and humanized equally
- No loaded framing without attribution
- `severity` is one of: critical, major, moderate, minor

---

## 13. Performance Tips

### Parallel Tool Calls

Claude Code can call multiple tools simultaneously. Encourage this explicitly:

> "Read both files at the same time"
> "Run the tests and the build in parallel"

This is 2-3x faster than sequential calls.

### Context Mode for Large Outputs

Any command that produces > 20 lines should use Context Mode:

```
# Slow (floods context):
bun run test -- --run

# Fast (keeps context clean):
ctx_execute("bash", "bun run test -- --run")
```

### Keep CLAUDE.md Lean

Every token in CLAUDE.md is loaded every session. Don't add:
- Temporary notes (use `claude-progress.txt`)
- Resolved issues or completed features
- Generic best practices already in the codebase

### Use Subagents for Independent Research

For broad exploration tasks, launch a subagent instead of doing it inline:

```
Agent (Explore): "Find all files that call the Anthropic API and
show me how they handle prompt caching"
```

This keeps the main context clean while the subagent does the heavy lifting.

### `/clear` Between Tasks

Context contamination is subtle. If you've been debugging one component and now need
to work on something unrelated, `/clear` before starting. The `claude-progress.txt`
from `/end-session` will restore the important context.

### Scratchpads for Complex Tasks

For any task spanning more than 20 tool calls:

```
1. Create docs/scratchpad-[task].md
2. Write key findings, decisions, intermediate results as you go
3. Reference it if context compacts mid-task
4. Delete it after committing
```

This saves you when the context window hits its limit mid-task.

---

## 14. Common Pitfalls

### Using npm instead of bun

```bash
# ❌ Wrong — npm/npx are Windows binaries in WSL2
npm run test
npx vitest

# ✓ Correct
bun run test -- --run
node_modules/.bin/vitest run
```

### Skipping /start-session

Claude will start the session without knowing what was done previously, which leads
to:
- Repeating work already done
- Missing context about decisions made
- Not knowing about broken tests

Always run `/start-session`.

### Committing Tests and Implementation Together

This invalidates the TDD record in git history. The failing test commit is proof
that you wrote tests first. Keep them separate.

### Marking Features as `passes: true` Prematurely

`features.json` is a contract. Only mark pass when tests actually pass:

```bash
bun run test -- --run tests/game/fog-of-war.test.ts
# If green → update features.json
```

### Hardcoding Actor-Specific Logic

```typescript
// ❌ Wrong
if (actor.id === 'iran') {
  return useAsymmetricStrategy();
}

// ✓ Correct
return actor.strategicPosture === 'asymmetric_attrition'
  ? useAsymmetricStrategy()
  : useConventionalStrategy();
```

All actor-specific behavior comes from the data model, not code branches.

### Bias in AI Prompts

Any change to agent prompts requires checking for:
- Language that privileges Western perspectives
- Asymmetric treatment of actors (one actor gets more detail)
- Loaded terms without attribution ("terrorist", "aggressor")

The `NEUTRALITY_PREAMBLE` in `docs/prompt-library.ts` is injected into all prompts
and must never be removed or diluted.

### Modifying Committed Turn Commits

Turn commits are immutable once created. Modifying them corrupts the simulation history.
If you need to change something in a turn, create a new branch from the parent commit
and replay it.

### Forgetting to Update claude-progress.txt

This is the most common mistake. Future sessions (including tomorrow's you) will be
confused without it. Run `/end-session` — it handles this automatically.

---

## Quick Reference Card

| Task | Command |
|---|---|
| Start session | `/start-session` |
| End session | `/end-session` |
| New feature (TDD) | `/add-feature` |
| Pick sprint issue | `/pick-issue` |
| Create sprint issues | `/create-sprint-issues` |
| Daily standup | `/sprint-standup` |
| Review a PR | `/review-pr NUMBER` |
| Quality audit | `/quality-gate` |
| Fix quality gaps | `/quality-fix` |
| Security audit | `/security-audit` |
| Test an AI agent | `/test-agent` |
| Run a game turn | `/run-turn` |
| Seed Iran scenario | `/seed-iran-scenario` |
| Update real-world data | `/update-ground-truth` |
| Context stats | `/context-mode:ctx-stats` |
| Audit CLAUDE.md | `/claude-md-management:claude-md-improver` |
| Frontend component | `/frontend-design:frontend-design` |
| Between unrelated tasks | `/clear` |

---

*Last updated: Sprint 1 — generated by Claude Code*
*Reference: `docs/prd.md`, `docs/testing-strategy.md`, `docs/scrum-issues.md`*
