# CLAUDE.md

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
npm run dev       # Start dev server (port 3000)
npm test          # Run vitest
npm run test:e2e  # Run playwright
npm run lint      # ESLint
npm run build     # Production build
npm run typecheck # tsc --noEmit

## Architecture
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

## Do NOT
- Commit .env.local or any secrets
- Modify database migrations that have been committed
- Skip tests for new API routes or game logic
- Hardcode actor-specific logic — use the data model
- Give any actor preferential treatment in AI prompts
- Use localStorage in components (use React state or Supabase)
- Dump entire actor state into context — use progressive disclosure

## Reference docs

### Core architecture
@docs/prd.md
— Full product requirements: vision, principles, domain model, architecture, game loop, frontend, branching, sprint plan. START HERE for any high-level question.

@docs/data-model.ts
— TypeScript types for every entity: Scenario, Actor, ActorState, EscalationLadder, Decision, Event, etc. Source of truth for all data structures.

@docs/db-schema.sql
— Supabase PostgreSQL schema: tables, enums, RLS policies, indexes, triggers, git-like branching model.

@docs/api-routes.md
— Every API endpoint with parameters, request/response shapes, and which AI agents they call.

### AI agents & prompts
@docs/prompt-library.ts
— All AI agent system prompts with shared NEUTRALITY_PREAMBLE. Actor agent builder, resolution engine, judge, narrator, decision analyzer.

@docs/research-pipeline.md
— 7-stage pipeline (Stage 0-6) with full prompt templates for populating scenarios.

@docs/agent-architecture.ts
— Agent roles, game modes, turn structure, fog-of-war context builder, game loop pseudocode.

### Frontend
@docs/component-tree.ts
— React component hierarchy, state management, hooks, providers, file structure.

@docs/ui-mockups.html
— Interactive mockups: split-screen game view, actor state panel, decision analysis, war chronicle.

### Infrastructure
@docs/env-plan.md
— Environment variables, secrets, Supabase/Vercel setup, API cost estimates, prompt caching strategy.

@docs/testing-strategy.md
— Test priorities by tier, TDD workflow, mocking strategy, CI integration.

@docs/scrum-issues.md
— Sprint issues with acceptance criteria, labels, milestones, and partner assignments. Source of truth for /create-sprint-issues and /pick-issue skills.

### Iran scenario research
@docs/research-military.md
— Verified military timeline, weapons costs, force deployments, nuclear status, Strait details.

@docs/research-political.md
— US domestic politics (AIPAC quantified), Iranian dynamics, Israeli coalition, Gulf responses.

@docs/research-economic.md
— Oil prices, energy infrastructure, petrodollar/BRICS, Russia/China positioning, supply chain crises.

## Context Mode
Context Mode MCP is installed for context optimization and session continuity.
- Prefer ctx_execute, ctx_batch_execute, and ctx_execute_file over raw Bash for
  data-heavy operations (log parsing, test output, file processing)
- Use ctx_fetch_and_index for web fetches (ground truth updates, documentation)
- Use ctx_search to query previously indexed content
- Run /context-mode:ctx-stats periodically to monitor context usage
- Context Mode handles mid-session compaction recovery automatically
- claude-progress.txt handles between-session memory (still update it at end of session)