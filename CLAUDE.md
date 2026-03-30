# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview
GeoSim is an AI-powered strategic simulation engine that models competitive
dynamics between actors (nations, organizations, political factions) through
an interactive decision-making loop with branching scenario trees.

## Tech stack
- Next.js 14 (App Router), TypeScript 5, React 18
- Tailwind CSS for styling
- Supabase (PostgreSQL + Auth + Realtime)
- Mapbox GL JS for map visualization
- Anthropic API (Claude Sonnet) for AI agents
- Vitest for unit tests, Playwright for E2E
- Vercel for deployment

## Commands
**IMPORTANT (WSL2 environment):** `npm` and `npx` are Windows binaries that cannot execute
Linux binaries. Use `bun` for all package management and script execution.

bun run dev                                    # Start dev server (port 3000)
bun run test -- --run                          # Run all vitest tests (non-interactive)
bun run test -- --run tests/game/fog-of-war.test.ts  # Run a single test file
bun run test -- --run --reporter=verbose       # Verbose test output
node_modules/.bin/vitest run <file>            # Alternative: direct binary
bun run test:e2e                               # Run playwright
bun run lint                                   # ESLint
bun run build                                  # Production build
bun run typecheck                              # tsc --noEmit

## Architecture
Sprint 1 scaffolding is complete. The structure:

- app/                    — Next.js App Router pages
- app/api/                — API routes (service layer)
- app/api/ai/             — AI agent endpoints (actor, resolution, judge, narrator)
- app/api/scenarios/      — Scenario CRUD + research pipeline
- app/api/branches/       — Branch management + game loop
- components/             — React components (ui/, game/, map/, providers/)
- lib/                    — Business logic, types, utilities
- lib/types/              — TypeScript types from data model
- lib/game/               — Game loop, fog of war, escalation logic
- lib/ai/                 — Prompt construction, API call wrappers with prompt caching
- hooks/                  — Custom React hooks
- supabase/migrations/    — Database migrations
- tests/                  — All tests (game/, api/, components/, e2e/)

Sprint 1 scaffolding complete. Key files present:
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — Supabase client utilities
- `lib/types/database.ts` — DB row/insert/update types for all 9 tables
- `lib/types/simulation.ts` — Full simulation types (Scenario, Actor, Decision, etc.)
- `middleware.ts` — Supabase session refresh middleware
- `supabase/migrations/20260319000000_initial_schema.sql` — Full schema with RLS
- `tests/middleware.test.ts`, `tests/lib/` — Vitest tests (node environment)

**Sprint 2 active — Stitch frontend migration** (`feature/stitch-frontend-migration`):
- Tasks 1–6 complete (design tokens, UI primitives, game components, ActorCard, Scenario Hub)
- Task 7 next: Scenario Browser page (`app/scenarios/page.tsx`)
- Plan: `docs/superpowers/plans/2026-03-24-frontend-stitch-design.md`
- Design tokens: Space Grotesk (`font-label`), Newsreader (`font-serif`), IBM Plex Mono (`font-mono`), Inter (`font-sans`); gold `#ffba20`

## Key design patterns
- Git-like branching: scenarios have branches, turns are immutable commits
- Fog of war: actors only see their intelligence picture, not true state
- Escalation ladder: actors prefer lowest rung that achieves objectives
- Hybrid turns: simultaneous planning → resolution → reaction phase
- Multi-action TurnPlans: actors submit primary + 0-3 concurrent actions per turn
- Operational parameters: every decision has configurable scale, scope, posture, timing
- Parameter profiles: named presets (e.g. "Surgical", "Overwhelming") for quick selection
- Concurrency rules: compatible/incompatible actions, resource weights, synergy bonuses
- 4 AI agent roles: actor agent, resolution engine, judge, narrator
- Prompt caching: stable system prompts cached, only variable turn data is fresh
- Evaluator-optimizer: judge scores resolution, retries if below threshold

## Agent patterns used (Anthropic's 6 patterns)
- Parallelization: actor agents run via Promise.all, research stages 3&4 parallel
- Evaluator-Optimizer: judge evaluates resolution, retry loop if score < 60
- Orchestrator-Workers: game loop controller delegates to agent workers
- Routing: model selection by task complexity (Sonnet default, Opus for complex)
- Prompt Chaining: research pipeline stages feed sequentially

## Neutrality principle (CRITICAL)
All AI agents must be unbiased. No protagonist bias. Every actor's strategy
is modeled from THEIR perspective with equal rigor. Asymmetric strategies
are as valid as conventional ones. See docs/prompt-library.ts for the
NEUTRALITY_PREAMBLE injected into all agent prompts.

## Scrum workflow
- We work in 3 sprints (1 week, 2 weeks, 1 week)
- All work is tracked as GitHub issues with labels and milestones
- Use /pick-issue to select and work on an issue
- Use /sprint-standup to generate standup reports
- Use /review-pr to review partner's pull requests
- Branch per issue: `issue-NUMBER-short-description`
- PRs reference issues: "Closes #NUMBER"
- Partner A focuses on frontend/map/UX
- Partner B focuses on AI pipeline/game logic/backend
- Both share: CI/CD, deployment, monitoring, security, docs
- Code review required before merging — use C.L.E.A.R. framework
- Sprint docs maintained in docs/scrum-issues.md

## Session management
- At the START of every session, run /start-session
- At the END of every session, run /end-session
- Always read claude-progress.txt and last 20 git commits at session start
- Always update claude-progress.txt and commit before ending a session
- Use /clear between unrelated tasks

## Custom skills (use with Skill tool)
- `geosim-playwright` — Playwright CLI browser testing via accessibility tree (~26K tokens, saves to /tmp/)
- `geosim-uiux-validation` — 4-category UI/UX sign-off checklist; user must approve CAT 1–4 before committing

## Feature tracking
- features.json tracks all planned features with pass/fail status
- Only mark a feature as passes:true AFTER tests pass
- NEVER remove or edit feature descriptions — only change the passes field

## Note-taking for complex tasks
When working on a task spanning many tool calls (research pipeline, game loop):
1. Create a scratchpad at docs/scratchpad-[task].md
2. Write key findings, decisions, and intermediate results
3. Reference the scratchpad if context gets compacted
4. Delete the scratchpad after task is committed

## Conventions
- TypeScript strict mode, no `any` — use `unknown` and narrow
- API routes return { data, error } shape
- Commit messages: conventional commits (feat:, test:, refactor:, fix:, docs:)
- TDD: write failing tests BEFORE implementation
- Tests in tests/ directory, organized by layer

## Development Workflow Rules (REQUIRED)

### Every feature = its own branch + PR
- NEVER commit directly to `main`
- Branch naming: `feat/short-description` or `fix/short-description`
- Every feature branch gets a PR before merging
- PR must reference the GitHub issue: "Closes #N"

### Frontend work — Playwright + UI/UX validation required
- Before marking any frontend task DONE, run `geosim-playwright` skill
- After playwright check, run `geosim-uiux-validation` skill
- User must approve all 4 validation categories before committing
- No exceptions — every detail matters

### TDD — tests before code
- Write failing tests FIRST
- Run to confirm they fail
- Implement minimal code to pass
- Never commit code without passing tests

### Mock data vs real API calls
- Mock data is acceptable while wiring structure
- Once a real API call is implemented, it is PERMANENT
- Never revert a real API call to mock data
- Only change how AI output is presented, not the call itself

### Skill selection guide
| Situation | Use |
|-----------|-----|
| Starting any new feature | `/brainstorm` first, then `/plan` |
| Have a plan, ready to implement | `superpowers:subagent-driven-development` |
| Simple bug fix (< 30 min) | `/pick-issue` → direct implementation |
| Complex bug (unexpected behavior) | `superpowers:systematic-debugging` |
| Frontend feature complete | `geosim-uiux-validation` skill |
| About to claim work is done | `superpowers:verification-before-completion` |
| End of significant feature | `superpowers:requesting-code-review` |
| Merging to main | `superpowers:finishing-a-development-branch` |

## Do NOT
- Commit .env.local or any secrets
- Modify database migrations that have been committed
- Skip tests for new API routes or game logic
- Hardcode actor-specific logic — use the data model
- Give any actor preferential treatment in AI prompts
- Use localStorage in components (use React state or Supabase)
- Dump entire actor state into context — use progressive disclosure
- Write `// text` directly inside JSX — use `{' // text '}` (triggers `react/jsx-no-comment-textnodes` ESLint error, breaks Vercel build)
- Leave destructured params unused — prefix with `_` (e.g., `labels: _labels`) to suppress `no-unused-vars`
- Put `border: 'none'` after `borderBottom` in the same inline style object — shorthand overwrites the specific property

## Reference docs

Read these files **on demand** when the task requires them. Do NOT auto-load all of them.

### Frontend / UI (read when building components or UI)
- `docs/frontend-design.md` — Stitch visual identity, font rules, surface treatments, "Declassified War Room" concept. Read before building any UI.
- `docs/frontend-mockups.md` - has frontend mockups from stitch that should be used for inspiration. these are guidelines, but should be updated for our specific goals
- `docs/component-tree.ts` — React component hierarchy, state management, hooks, providers, file structure.
- `docs/all-ui-mockups.html` — Interactive HTML mockups (106KB — read only relevant sections, do not load whole file).

### AI agents / game logic (read when working on AI pipeline or game loop)
- `docs/prompt-library.ts` — All AI agent system prompts with NEUTRALITY_PREAMBLE.
- `docs/agent-architecture.ts` — Agent roles, game modes, fog-of-war context builder, game loop pseudocode.
- `docs/research-pipeline.md` — 7-stage research pipeline with full prompt templates.

### Data model / database (read when working on schema, types, or migrations)
- `docs/geosim-data-model.ts` — TypeScript types for every entity. Source of truth for all data structures.
- `docs/db-schema.sql` — Supabase schema, RLS policies, indexes, triggers.

### API routes (read when working on API endpoints)
- `docs/api-routes.md` — Every endpoint with parameters, request/response shapes, and which AI agents they call.

### Testing (read when writing tests)
- `docs/testing-strategy.md` — Test priorities by tier, TDD workflow, mocking strategy, CI integration.

### Planning / high-level reference (read when planning, not every session)
- `docs/prd.md` — Full product requirements. Start here for high-level questions.
- `docs/scrum-issues.md` — Sprint issues #27–#41 (Phase A–D roadmap to playable game). Source of truth for /pick-issue.
- `docs/env-plan.md` — Environment variables, Supabase/Vercel setup, API cost estimates.
- `docs/superpowers/plans/2026-03-24-frontend-stitch-design.md` — Active Stitch migration plan (14 tasks).

### Iran scenario research (read when working on Iran scenario data)
- `docs/Iran Research/research-military.md` — Verified military timeline, weapons costs, force deployments.
- `docs/Iran Research/research-political.md` — US domestic politics, Iranian dynamics, Gulf responses.
- `docs/Iran Research/research-economic.md` — Oil prices, energy infrastructure, petrodollar/BRICS.

## Context Mode
Context Mode MCP is installed for context optimization and session continuity.
- Prefer ctx_execute, ctx_batch_execute, and ctx_execute_file over raw Bash for
  data-heavy operations (log parsing, test output, file processing)
- Use ctx_fetch_and_index for web fetches (ground truth updates, documentation)
- Use ctx_search to query previously indexed content
- Run /context-mode:ctx-stats periodically to monitor context usage
- Context Mode handles mid-session compaction recovery automatically
- claude-progress.txt handles between-session memory (still update it at end of session)