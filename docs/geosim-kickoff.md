# GeoSim: Complete Claude Code Kickoff Guide

Everything you need to go from zero to a running project, structured as sequential sessions. Follow this in order. Each session has exact prompts, expected outputs, and the rubric items it satisfies.

---

## Before You Touch Claude Code

### Prerequisites checklist

- [ ] Claude Code installed (`curl -fsSL https://claude.ai/install.sh | bash` then `claude --version`)
- [ ] GitHub CLI installed (`brew install gh` then `gh auth login`)
- [ ] Accounts created: Supabase, Vercel, Mapbox, Anthropic API
- [ ] API keys ready (Supabase URL + anon key + service role, Anthropic key, Mapbox token)
- [ ] GitHub org/repo created
- [ ] Professor approval posted on #projects Slack (do this TODAY — rubric requires 1 week before deadline)
- [ ] Partner aligned on task split
- [ ] All planning docs ready to copy into `/docs` folder (see list below)

### What is Claude Code? (60-second primer)

Claude Code is NOT a chatbot in an IDE sidebar. It's an **agent** that runs in your terminal. It reads files, runs commands, edits code, and keeps going until the task is done. You supervise; it drives.

Key differences from what you're used to:
- It has full access to your file system and shell
- It chains 10+ tool calls autonomously per prompt
- It reads your `CLAUDE.md` every session for project context
- You approve actions (or allowlist them for auto-approval)

### Key commands you'll use constantly

| Command | When to use |
|---|---|
| `claude` | Start a new session |
| `claude --continue` | Resume your last session |
| `claude --resume` | Pick from a list of past sessions |
| `claude --worktree` | Start in an isolated git worktree (parallel work) |
| `/init` | Generate a CLAUDE.md from project scan |
| `/clear` | Wipe context, re-read CLAUDE.md (use between tasks) |
| `/compact` | Compress context mid-task when it's getting full |
| `/rewind` | Undo — roll back to a previous checkpoint |
| `/context` | Check how much of the context window you've used |
| `/model sonnet` | Switch to Sonnet (default, cost-effective) |
| `/model opus` | Switch to Opus (complex reasoning, 4x cost) |
| `(plan) your task` | Enter plan mode — Claude designs before coding |
| `Shift+Tab` | Toggle plan mode on/off |

**Rule of thumb:** If the task touches more than 3 files, use `(plan)` mode. Claude Code designs the approach, shows you the plan, waits for approval, then executes.

### Planning docs to copy into `/docs`

Create a `docs/` folder in your repo and copy these files:

| File | What it contains |
|---|---|
| `docs/prd.md` | Full PRD — vision, architecture, game loop, branching, sprint plan |
| `docs/data-model.ts` | TypeScript types for every entity |
| `docs/db-schema.sql` | Supabase PostgreSQL schema with RLS |
| `docs/api-routes.md` | Every API endpoint with params and return types |
| `docs/component-tree.ts` | React component hierarchy and state management |
| `docs/prompt-library.ts` | All AI agent system prompts |
| `docs/research-pipeline.md` | 7-stage research pipeline with prompt templates |
| `docs/agent-architecture.ts` | Agent roles, game loop, fog-of-war builder |
| `docs/testing-strategy.md` | TDD plan, test priorities, mocking strategy |
| `docs/env-plan.md` | Environment vars, secrets, cost estimates |
| `docs/ui-mockups.html` | Interactive HTML mockups for all views |
| `docs/scrum-issues.md` | Sprint issues, labels, milestones, assignments |
| `docs/research-military.md` | Verified military data from research |
| `docs/research-political.md` | Verified political data from research |
| `docs/research-economic.md` | Verified economic data from research |

---

## Session 1: Project Scaffolding & CLAUDE.md

**Goal:** Repo structure, Next.js project, CLAUDE.md with @imports, permissions, hooks, progress tracking.
**Satisfies:** HW4 Part 1 (Project Setup — 25%), P3 architecture foundation.
**Time:** ~1-2 hours.

### Step 1: Create the repo and folder structure

Do this manually before starting Claude Code:

```bash
mkdir geosim && cd geosim
git init
mkdir -p docs .claude/skills .claude/hooks .claude/agents supabase/migrations
```

Copy all your planning docs into `/docs`.

### Step 2: Create .env.local (NEVER commit this)

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo ".env.local" >> .gitignore
```

### Step 3: Write CLAUDE.md manually FIRST

Write this yourself before running `/init`. This is your project's onboarding document for the AI — keep it under 200 lines.

```markdown
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
```

### Step 4: Create supporting files

**claude-progress.txt** — session-to-session memory:
```markdown
# GeoSim Progress Log
Updated by Claude Code at the end of each session.

## Current sprint: Sprint 1 — Foundation
## Last session: Not yet started

### Completed
(none yet)

### In progress
(none yet)

### Next up
- Project scaffolding (Next.js, Supabase, Vercel)
- Database schema migration
- TypeScript types for data model

### Known bugs
(none)

### Architecture decisions
(none yet)
```

**features.json** — structured feature tracking:
```json
{
  "features": [
    { "id": "F001", "category": "infrastructure", "name": "Next.js scaffolding", "priority": "P0", "sprint": 1, "passes": false },
    { "id": "F002", "category": "infrastructure", "name": "Supabase schema + migration", "priority": "P0", "sprint": 1, "passes": false },
    { "id": "F003", "category": "infrastructure", "name": "TypeScript types from data model", "priority": "P0", "sprint": 1, "passes": false },
    { "id": "F004", "category": "infrastructure", "name": "Vitest + mock scenario factory", "priority": "P0", "sprint": 1, "passes": false },
    { "id": "F005", "category": "game_logic", "name": "Fog of war filtering", "priority": "P0", "sprint": 1, "passes": false, "test_file": "tests/game/fog-of-war.test.ts" },
    { "id": "F006", "category": "game_logic", "name": "Escalation ladder validation", "priority": "P0", "sprint": 1, "passes": false, "test_file": "tests/game/escalation.test.ts" },
    { "id": "F007", "category": "game_logic", "name": "State update application", "priority": "P0", "sprint": 1, "passes": false, "test_file": "tests/game/state-updates.test.ts" },
    { "id": "F008", "category": "game_logic", "name": "Branch/commit CRUD operations", "priority": "P0", "sprint": 1, "passes": false, "test_file": "tests/game/branching.test.ts" },
    { "id": "F008b", "category": "game_logic", "name": "TurnPlan validation (concurrency, resources, parameters)", "priority": "P0", "sprint": 1, "passes": false, "test_file": "tests/game/turn-plan.test.ts" },
    { "id": "F009", "category": "ai_pipeline", "name": "Research pipeline API (Stage 0)", "priority": "P0", "sprint": 1, "passes": false },
    { "id": "F010", "category": "ai_pipeline", "name": "Research pipeline API (Stages 1-6)", "priority": "P0", "sprint": 1, "passes": false },
    { "id": "F011", "category": "ai_pipeline", "name": "Actor agent with prompt caching", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F012", "category": "ai_pipeline", "name": "Resolution engine", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F013", "category": "ai_pipeline", "name": "Judge evaluator with retry loop", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F014", "category": "ai_pipeline", "name": "Narrator (chronicle writer)", "priority": "P1", "sprint": 2, "passes": false },
    { "id": "F015", "category": "ai_pipeline", "name": "Game loop controller (full turn)", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F016", "category": "frontend", "name": "Split-screen layout (map + panels)", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F017", "category": "frontend", "name": "Mapbox Tier 1 (country fills, chokepoints)", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F018", "category": "frontend", "name": "Actor list + global indicators panel", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F019", "category": "frontend", "name": "Decision cards + analysis view", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F020", "category": "frontend", "name": "War chronicle timeline", "priority": "P0", "sprint": 2, "passes": false },
    { "id": "F021", "category": "frontend", "name": "Actor state detail panel", "priority": "P1", "sprint": 2, "passes": false },
    { "id": "F022", "category": "frontend", "name": "Game mode selection", "priority": "P1", "sprint": 2, "passes": false },
    { "id": "F023", "category": "infrastructure", "name": "Auth + user types (Supabase Auth)", "priority": "P1", "sprint": 2, "passes": false },
    { "id": "F024", "category": "infrastructure", "name": "CI/CD pipeline (GitHub Actions)", "priority": "P0", "sprint": 3, "passes": false },
    { "id": "F025", "category": "infrastructure", "name": "Sentry error tracking", "priority": "P1", "sprint": 3, "passes": false },
    { "id": "F026", "category": "infrastructure", "name": "Security audit (OWASP)", "priority": "P0", "sprint": 3, "passes": false },
    { "id": "F027", "category": "infrastructure", "name": "Eval metrics dashboard", "priority": "P1", "sprint": 3, "passes": false },
    { "id": "F028", "category": "frontend", "name": "Mapbox Tier 2 (asset markers)", "priority": "P2", "sprint": 3, "passes": false },
    { "id": "F029", "category": "frontend", "name": "Scenario browser (public library)", "priority": "P2", "sprint": 3, "passes": false },
    { "id": "F030", "category": "frontend", "name": "Scenario creation wizard", "priority": "P2", "sprint": 3, "passes": false }
  ]
}
```

**.env.example** (this IS committed):
```bash
# GeoSim Environment Variables — copy to .env.local and fill in values
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Create skills and hooks

**.claude/skills/start-session.md:**
```markdown
---
name: start-session
disable-model-invocation: true
---

## Description
Run at the start of every Claude Code session to get up to speed.

## Steps
1. Run `pwd` to confirm working directory
2. Read claude-progress.txt to see what happened last session
3. Read features.json to see what's done and what's next
4. Run `git log --oneline -20` to see recent commits
5. Run `npm test` to verify nothing is broken
6. Run `npm run build` to verify the project compiles
7. If tests or build fail, fix them BEFORE starting new work
8. Summarize current state and ask what to work on next
```

**.claude/skills/end-session.md:**
```markdown
---
name: end-session
disable-model-invocation: true
---

## Description
Run at the end of every Claude Code session to save state.

## Steps
1. Run `npm test` — if tests fail, fix before proceeding
2. Run `npm run lint` — fix any lint errors
3. Stage and commit all changes with a descriptive conventional commit message
4. Update claude-progress.txt with:
   - What was completed this session
   - What's in progress (partially done work)
   - Any blockers or known bugs
   - Architecture decisions made this session
   - What should be worked on next
5. Update features.json — mark any completed features as passes: true
6. Push to remote: `git push`
```

**.claude/skills/add-feature.md:**
```markdown
---
name: add-feature
---

## Description
Add a new feature using strict TDD and the Explore → Plan → Implement → Commit workflow.

## Steps
1. Read the feature description from the user
2. Explore relevant code using Glob, Grep, and Read
3. Write failing tests FIRST (the spec — user defines what correctness means)
4. Commit the failing tests: `git commit -m "test: add failing tests for [feature]"`
5. Implement minimum code to make tests pass
6. Commit: `git commit -m "feat: implement [feature] (passes tests)"`
7. Refactor for clarity without changing behavior
8. Commit: `git commit -m "refactor: clean up [feature]"`
9. Run the FULL test suite to verify nothing else broke
10. Update features.json — mark feature as passes: true

## Constraints
- ALWAYS write tests BEFORE implementation (TDD)
- Git history MUST show red-green-refactor pattern
- Follow all conventions in CLAUDE.md
- Never modify unrelated files
```

**.claude/skills/run-turn.md:**
```markdown
---
name: run-turn
disable-model-invocation: true
---

## Description
Execute a complete game turn: planning → resolution → reaction → judging → narration.

## Steps
1. Read the current branch HEAD commit to get scenario state
2. For each actor, build fog-of-war context and call the actor agent API
3. Collect all decisions
4. Call the resolution engine with all decisions
5. Run judge evaluator on the result
6. If judge score < 60, retry resolution with judge feedback (max 2 retries)
7. Check for immediate reaction triggers
8. If reactions exist, run reaction phase and re-resolve
9. Run the narrator to generate chronicle entry
10. Create an immutable turn commit with all phase results
11. Update branch HEAD
12. Log API costs for budget tracking

## Constraints
- Never skip the judge evaluation
- Never modify previous turn commits
- Apply the neutrality principle — no actor gets preferential treatment
```

**.claude/skills/update-ground-truth.md:**
```markdown
---
name: update-ground-truth
---

## Description
Research current developments in the Iran conflict and update the ground truth trunk.

## Steps
1. Read the current trunk HEAD to see where we left off
2. Search for recent news on the Iran conflict
3. Parse new developments into Event objects following data model
4. Distinguish source types: government claims, independent reporting, intelligence assessments
5. Assess state changes for each affected actor
6. Create a new trunk commit with updated state
7. Update claude-progress.txt

## Constraints
- Only add independently verified events
- Tag each event with source confidence
- Follow the neutrality principle — do not editorialize
- Preserve all existing event history — append only
```

**.claude/skills/pick-issue.md:**
```markdown
---
name: pick-issue
---

## Description
Pick up a GitHub issue from the sprint board and work on it end-to-end.

## Steps
1. Run `gh issue list --assignee @me --label sprint-N --state open` (where N is current sprint)
2. If no issues assigned, show all open sprint issues: `gh issue list --label sprint-N --state open`
3. Display the issue list and ask which issue to work on
4. Once selected, read the full issue: `gh issue view NUMBER`
5. Create a feature branch: `git checkout -b issue-NUMBER-short-description`
6. Read the acceptance criteria carefully
7. If the issue has a `game-logic` label, use /add-feature workflow (TDD)
8. If the issue has a `frontend` label, use (plan) mode for multi-file work
9. If the issue has an `infrastructure` label, use (plan) mode
10. Work through all acceptance criteria, checking each off
11. Run full test suite: `npm test`
12. Run lint: `npm run lint`
13. Commit with conventional message referencing the issue: `git commit -m "feat: description (#NUMBER)"`
14. Push branch: `git push -u origin issue-NUMBER-short-description`
15. Create PR: `gh pr create --title "feat: description" --body "Closes #NUMBER\n\n## Changes\n- ..."`
16. Update features.json if any features were completed
17. Update claude-progress.txt

## Constraints
- One issue per session (focus)
- Branch name must reference issue number
- All acceptance criteria must be met before PR
- PR must reference the issue number (Closes #N)
- Run tests before pushing
```

**.claude/skills/create-sprint-issues.md:**
```markdown
---
name: create-sprint-issues
disable-model-invocation: true
---

## Description
Batch-create GitHub issues for a sprint from the scrum issues document.

## Steps
1. Read docs/scrum-issues.md to get the issue definitions
2. Ask which sprint to create issues for (1, 2, or 3)
3. For each issue in that sprint, create it via gh CLI:
   ```
   gh issue create \
     --title "TITLE" \
     --body "BODY" \
     --label "LABELS" \
     --assignee "ASSIGNEE" \
     --milestone "MILESTONE"
   ```
4. Report all created issue numbers

## Constraints
- Create milestones first if they don't exist
- Create labels first if they don't exist
- Verify each issue was created successfully
- Do NOT create duplicate issues (check existing first)
```

**.claude/skills/sprint-standup.md:**
```markdown
---
name: sprint-standup
disable-model-invocation: true
---

## Description
Generate a sprint standup summary — what's done, in progress, and blocked.

## Steps
1. Run `gh issue list --state open --label sprint-N` to see open issues
2. Run `gh issue list --state closed --label sprint-N` to see completed issues
3. Read claude-progress.txt for latest session notes
4. Read features.json for feature completion status
5. Check `git log --oneline -20` for recent commits
6. Generate a standup report:

### Done (since last standup)
- List of closed issues with PR links

### In Progress
- List of open assigned issues with current status

### Blocked
- Any issues that can't proceed and why

### Sprint Health
- Issues completed vs total
- Features passing vs total
- Days remaining in sprint

## Constraints
- Be concise — this is a standup, not a report
- Flag any issue that hasn't had commits in 2+ days
- Flag dependencies between partners' issues
```

**.claude/skills/review-pr.md:**
```markdown
---
name: review-pr
---

## Description
Review a partner's pull request using the C.L.E.A.R. framework.

## Steps
1. Ask for the PR number or run `gh pr list` to show open PRs
2. Fetch the PR: `gh pr view NUMBER`
3. Fetch the diff: `gh pr diff NUMBER`
4. Review using C.L.E.A.R.:
   - **Context**: Does this fit the project architecture and CLAUDE.md conventions?
   - **Logic**: Is the business logic correct? Edge cases handled?
   - **Evidence**: Are there tests? Do they verify behavior, not just pass?
   - **Architecture**: Does it follow established patterns? Unnecessary deps?
   - **Risk**: Security issues? API keys exposed? Fog-of-war leaks? Neutrality violations?
5. Check that the acceptance criteria from the linked issue are all met
6. Post review as a PR comment: `gh pr review NUMBER --comment --body "REVIEW"`
7. If issues found, request changes: `gh pr review NUMBER --request-changes --body "REVIEW"`
8. If all good, approve: `gh pr review NUMBER --approve --body "REVIEW"`

## Constraints
- Always check for fog-of-war information leaks
- Always check for neutrality principle violations in AI prompts
- Always verify tests exist for new logic
- Be specific: reference file:line, not vague complaints
```
```markdown
---
name: security-audit
disable-model-invocation: true
---

## Description
Run the full security pipeline (OWASP Top 10, secrets, dependencies).

## Steps
1. Run gitleaks to check for secrets: `gitleaks detect`
2. Run npm audit: `npm audit --audit-level=high`
3. Check all API routes for input validation and parameterized queries
4. Verify ANTHROPIC_API_KEY never appears in client-side code
5. Verify Supabase RLS policies are active on all tables
6. Check for XSS vectors in any user-facing inputs
7. Verify auth middleware on all protected routes
8. Generate SBOM: `npx @cyclonedx/cyclonedx-npm --output-file sbom.json`
9. Report all findings with severity ratings (HIGH/MED/LOW)

## Constraints
- Do NOT auto-fix — report for human review
- Flag any new dependencies added since last audit
```

**.claude/skills/quality-gate.md:**
```markdown
---
name: quality-gate
disable-model-invocation: true
---

## Description
Full quality audit across all dimensions. Read-only — reports gaps but does NOT fix them.
Adapted from PlonGuo/claude-dev-setup quality-gate pattern.

## Steps
1. DETECT STACK: Read package.json, tsconfig.json, and project config to confirm stack
2. TEST COVERAGE: Run `npm test -- --coverage` if available. Report:
   - Total test count and pass rate
   - Coverage percentage (lines, branches, functions)
   - Files with zero test coverage
   - Features in features.json marked as passes:false that should have tests
3. LINTING: Run `npm run lint`. Count errors vs warnings. Note any disabled rules.
4. TYPE CHECKING: Run `npm run typecheck`. Count type errors. Flag any `any` types.
5. SECURITY: Run `npm audit`. Count vulnerabilities by severity. Check for gitleaks.
6. CI/CD: Check .github/workflows/ exists. Verify it runs: lint, typecheck, test, audit.
   Flag missing stages.
7. BUILD: Run `npm run build`. Report success/failure and any warnings.
8. Write full report to docs/quality-gate-report.md with:
   - Date and commit hash
   - Score per dimension (pass/warning/fail)
   - Specific gaps with file paths
   - Prioritized action items

## Constraints
- READ-ONLY: do NOT fix anything. Only report.
- Be specific: "tests/game/branching.test.ts has 0 tests" not "testing is incomplete"
- Run /quality-fix after reviewing the report to implement approved fixes
```

**.claude/skills/quality-fix.md:**
```markdown
---
name: quality-fix
disable-model-invocation: true
---

## Description
Implement fixes for gaps identified in the quality gate report.

## Prerequisites
- docs/quality-gate-report.md must exist (run /quality-gate first)

## Steps
1. Read docs/quality-gate-report.md
2. If report is older than 7 days, suggest re-running /quality-gate first
3. STEP 1 — Config fixes: Fix linting configs, tsconfig issues, test configs.
   Run verification after each fix. Commit: "fix: quality gate config fixes"
4. STEP 2 — Dependency fixes (REQUIRES CONFIRMATION): Run npm audit fix.
   Show what will change. Wait for user approval. Commit: "fix: dependency updates"
5. STEP 3 — CI fixes (REQUIRES CONFIRMATION): Add missing CI pipeline stages.
   Show the workflow changes. Wait for user approval. Commit: "ci: add missing pipeline stages"
6. Do NOT fix test coverage gaps here — those should go through /add-feature with TDD
7. Update docs/quality-gate-report.md with what was fixed

## Constraints
- Three gated steps — config, then deps (confirm), then CI (confirm)
- Verify after EACH fix — run the tool immediately, stop on failure
- Never fix test gaps by writing tests — that's a /add-feature task
```

**.claude/agents/code-reviewer.md:**
```markdown
---
name: code-reviewer
isolation: worktree
---

## Role
Review code changes for quality, security, and project convention adherence.

## Instructions
1. Read CLAUDE.md to understand project conventions
2. Review the diff of recent changes
3. Apply the C.L.E.A.R. framework:
   - Context: does this fit the project's architecture?
   - Logic: is the business logic correct? edge cases handled?
   - Evidence: are there tests? do they actually verify behavior?
   - Architecture: does it follow established patterns?
   - Risk: SQL injection? XSS? Auth checks? Secrets exposed?
4. Check for fog-of-war violations (information leaking between actors)
5. Check for neutrality violations in AI prompts
6. Rate each finding as HIGH / MEDIUM / LOW

## Output
Structured review in markdown with findings and specific fix suggestions.
```

**.claude/hooks/protect-files.sh:**
```bash
#!/bin/bash
# Block edits to sensitive files
PROTECTED=(".env" ".env.local" "secrets.json")
for p in "${PROTECTED[@]}"; do
  if [[ "$CLAUDE_FILE_PATH" == *"$p"* ]]; then
    echo "BLOCKED: Cannot edit $p — manage secrets manually."; exit 2
  fi
done
exit 0
```

```bash
chmod +x .claude/hooks/protect-files.sh
```

**.claude/settings.json:**
```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(npm run typecheck)",
      "Bash(npm run build)",
      "Bash(git status)",
      "Bash(git diff)",
      "Bash(git log*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git push)",
      "Bash(git checkout *)",
      "Bash(git branch *)",
      "Bash(gh issue *)",
      "Bash(gh pr *)"
    ]
  },
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"
    }],
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "command": "bash .claude/hooks/protect-files.sh"
    }]
  }
}
```

### Step 6: Install Context Mode (critical for cost and session management)

Context Mode is an MCP server plugin that solves two major problems:
- **Context saving:** Raw tool output (file reads, test output, web fetches) is sandboxed. Only compact summaries enter context. 315 KB → 5.4 KB (98% reduction). This matters because our `/docs` folder alone is huge.
- **Session continuity:** Every file edit, git op, task, and error is tracked in SQLite. When context compacts mid-session, your working state is automatically rebuilt. No more losing track of what you were doing.

**Benchmarks from their repo:**
- Playwright snapshot: 56 KB → 299 bytes (99% saved)
- Git log (153 commits): 11.6 KB → 107 bytes (99% saved)
- Test output (30 suites): 6 KB → 337 bytes (95% saved)
- Full session: extends from ~30 min to ~3 hours before compaction

**Install (do this before your first Claude Code session):**

```bash
# Start Claude Code briefly just to install the plugin
claude
```

Then in Claude Code:
```
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
```

Then exit and restart Claude Code. On restart, Context Mode automatically sets up:
- MCP server with 6 sandbox tools (`ctx_batch_execute`, `ctx_execute`, `ctx_execute_file`, `ctx_index`, `ctx_search`, `ctx_fetch_and_index`)
- PreToolUse hooks that intercept Bash, Read, WebFetch, Grep calls and route them through the sandbox
- PostToolUse, PreCompact, and SessionStart hooks for session tracking
- A `CLAUDE.md` routing file (you'll merge this with your own CLAUDE.md)

**Important:** After install, Context Mode creates its own CLAUDE.md routing instructions. Merge those into YOUR CLAUDE.md rather than letting them overwrite it. The routing instructions tell Claude Code to prefer sandbox tools — keep them.

**Useful commands during development:**
```
/context-mode:ctx-stats    # See how much context you've saved
/context-mode:ctx-doctor   # Diagnose if everything is working
/context-mode:ctx-upgrade  # Update to latest version
```

**How this interacts with our other tools:**
- `claude-progress.txt` → still needed for BETWEEN-session memory (Context Mode only handles within-session compaction recovery)
- `features.json` → still needed (Context Mode doesn't track feature completion)
- `/start-session` skill → still needed (reads progress file and features; Context Mode handles the compaction recovery part)
- `/end-session` skill → still needed (writes progress file; Context Mode handles event tracking during the session)

**Add to CLAUDE.md** (merge with Context Mode's auto-generated routing):
```markdown
## Context Mode
Context Mode MCP is installed for context optimization and session continuity.
- Prefer ctx_execute, ctx_batch_execute, and ctx_execute_file over raw Bash for
  data-heavy operations (log parsing, test output, file processing)
- Use ctx_fetch_and_index for web fetches (ground truth updates, documentation)
- Use ctx_search to query previously indexed content
- Run /context-mode:ctx-stats periodically to monitor context usage
- Context Mode handles mid-session compaction recovery automatically
- claude-progress.txt handles between-session memory (still update it at end of session)
```

### Step 7: Initial commit (do this before your first real Claude Code session)

```bash
git add .
git commit -m "feat: initial project structure with CLAUDE.md, skills, hooks, context-mode, and planning docs"
```

### Step 8: Start Claude Code and scaffold the app

```bash
claude
```

**Prompt 0 — Verify Context Mode is working:**
```
/context-mode:ctx-doctor
```

If everything shows green, continue. If not, troubleshoot the install.

**Prompt 1 — Run /init and compare:**
```
/init
```

Review output. Merge any useful additions into your CLAUDE.md. This shows the "iterate on CLAUDE.md based on /init" that HW4 requires.

**Prompt 2 — Scaffold Next.js:**
```
(plan) Set up a new Next.js 14 project with App Router, TypeScript, and
Tailwind CSS in the current directory. Install @supabase/supabase-js and
@supabase/ssr. Create the Supabase client utilities in lib/supabase/
(browser client and server client using env vars from .env.local).
Create a .env.example with placeholder values. Set up the basic folder
structure from CLAUDE.md. Don't install Mapbox yet.
```

Review plan. Approve. Let it run.

**Prompt 3 — Database schema:**
```
Read docs/db-schema.sql and create the Supabase migration file at
supabase/migrations/20260319000000_initial_schema.sql with the full
schema. Then create TypeScript types in lib/types/ that correspond to
the database tables — these should match docs/data-model.ts but
simplified for the database layer (the full simulation types stay in
lib/types/simulation.ts, the DB types go in lib/types/database.ts).
```

**Prompt 4 — Update features.json and commit:**
```
Mark F001 (Next.js scaffolding), F002 (Supabase schema), and F003
(TypeScript types) as passes: true in features.json. Create a commit:
"feat: Next.js scaffolding, Supabase schema, TypeScript types"
```

**Prompt 5 — Deploy to Vercel:**
```
Help me deploy this to Vercel. Create vercel.json if needed. Tell me
exactly what env vars I need to set in the Vercel dashboard. Walk me
through each step.
```

**Prompt 6 — Create Sprint 1 GitHub issues:**
```
/create-sprint-issues

Create issues for Sprint 1. Read docs/scrum-issues.md for the issue
definitions. Create the labels and milestones first, then all Sprint 1
issues. Assign @partner-a and @partner-b per the document.
```

Verify with `gh issue list` that all Sprint 1 issues are created.

**Prompt 7 — End session:**
```
/end-session
```

**After this session you should have:**
- Working Next.js app locally and on Vercel
- Supabase schema ready
- TypeScript types for DB and simulation layers
- CLAUDE.md with @imports (iterated after /init)
- Permissions, hooks, skills all configured
- claude-progress.txt updated
- features.json with F001-F003 marked passing
- Clean git history

**`/clear` — fresh context for next session.**

---

## Session 2: Vitest Setup + TDD Foundation (HW4 Part 3)

**Goal:** Set up testing infrastructure, write failing tests, implement via TDD.
**Satisfies:** HW4 Part 3 (TDD — 30%).
**Time:** ~2-3 hours.

### Step 1: Start session

```bash
claude
```

```
/start-session
```

### Step 2: Pick your first issue

```
/pick-issue
```

Select Issue #3 (Vitest setup) or Issue #4 (Fog of war TDD) depending on whether the test infrastructure is ready.

### Step 3: Set up Vitest (Issue #3)

**Prompt 7:**
```
(plan) Set up Vitest for this project. Create vitest.config.ts, add test
scripts to package.json (test, test:watch, test:coverage). Create a test
helper at tests/helpers/mock-scenario.ts that exports a factory function
createMockScenario() returning a mock Scenario object with realistic data
based on our Iran conflict — include mock actors (US, Iran, Israel, Russia),
mock events with causal links, mock intelligence pictures where the US
believes Iran's readiness is 25 but actual is 58, and mock escalation
ladders. This factory will be used by all game logic tests.
```

After implementation:
```
Mark F004 as passes: true. Commit: "feat: Vitest setup with mock scenario factory"
```

### Step 3: YOU write the failing tests

This is the critical part — YOU define what correctness means. Write these tests yourself:

Create `tests/game/fog-of-war.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildFogOfWarContext, actorWouldKnowAbout } from '../../lib/game/fog-of-war';
import { createMockScenario } from '../helpers/mock-scenario';

describe('buildFogOfWarContext', () => {
  const scenario = createMockScenario();
  const usActor = scenario.actors.find(a => a.id === 'united_states')!;
  const iranActor = scenario.actors.find(a => a.id === 'iran')!;

  it('includes events the actor initiated', () => {
    const ctx = buildFogOfWarContext(usActor, scenario);
    const initiated = ctx.knownEvents.filter(e => e.initiatedBy === 'united_states');
    expect(initiated.length).toBeGreaterThan(0);
  });

  it('includes events that targeted the actor', () => {
    const ctx = buildFogOfWarContext(usActor, scenario);
    const targeted = ctx.knownEvents.filter(e =>
      e.targetedActors.includes('united_states')
    );
    expect(targeted.length).toBeGreaterThan(0);
  });

  it('includes major public events regardless of actor involvement', () => {
    const ctx = buildFogOfWarContext(usActor, scenario);
    const major = scenario.eventHistory.filter(e =>
      e.impacts.some(i => i.magnitude === 'critical' || i.magnitude === 'major')
    );
    major.forEach(evt => {
      expect(ctx.knownEvents.find(e => e.id === evt.id)).toBeDefined();
    });
  });

  it('EXCLUDES covert adversary events the actor cannot see', () => {
    const ctx = buildFogOfWarContext(usActor, scenario);
    const covert = scenario.eventHistory.filter(e =>
      e.initiatedBy === 'iran' &&
      e.dimension === 'intelligence' &&
      !e.targetedActors.includes('united_states') &&
      e.impacts.every(i => i.magnitude === 'minor')
    );
    covert.forEach(evt => {
      expect(ctx.knownEvents.find(e => e.id === evt.id)).toBeUndefined();
    });
  });

  it('uses BELIEVED state, not true state', () => {
    const ctx = buildFogOfWarContext(usActor, scenario);
    const iranPicture = ctx.myIntelligencePicture.find(
      p => p.aboutActorId === 'iran'
    );
    expect(iranPicture).toBeDefined();
    expect(iranPicture!.believedMilitaryReadiness).not.toBe(
      iranActor.state.military.overallReadiness
    );
  });

  it('does NOT leak unknown unknowns', () => {
    const ctx = buildFogOfWarContext(usActor, scenario);
    const iranPicture = ctx.myIntelligencePicture.find(
      p => p.aboutActorId === 'iran'
    );
    expect(iranPicture!.unknownUnknowns).toEqual([]);
  });

  it('includes events shared by intel partners', () => {
    const ctx = buildFogOfWarContext(iranActor, scenario);
    // Russia shares intel with Iran, so Iran should know about
    // events Russia knows about
    const russiaShared = ctx.knownEvents.filter(e =>
      e.initiatedBy !== 'iran' && !e.targetedActors.includes('iran')
    );
    // Should have some events known via intel sharing
    expect(russiaShared.length).toBeGreaterThan(0);
  });
});
```

Commit the failing tests yourself:
```bash
git add tests/game/fog-of-war.test.ts
git commit -m "test: add failing tests for fog-of-war filtering"
```

### Step 4: Have Claude Code implement (GREEN phase)

**Prompt 8:**
```
The tests in tests/game/fog-of-war.test.ts are failing. Implement
buildFogOfWarContext and actorWouldKnowAbout in lib/game/fog-of-war.ts
to make them pass. Do NOT modify the tests. Read the data model in
docs/data-model.ts for the type definitions you need.
```

After tests pass:
```bash
git add lib/game/fog-of-war.ts
git commit -m "feat: implement buildFogOfWarContext (passes tests)"
```

### Step 5: Refactor

**Prompt 9:**
```
Refactor lib/game/fog-of-war.ts for clarity. Extract helper functions.
Ensure tests still pass after refactoring. Do not change behavior.
```

```bash
git commit -m "refactor: extract fog-of-war helper functions"
```

### Step 6: Repeat TDD for escalation logic

Write your own failing tests for `tests/game/escalation.test.ts`. Key test cases:
- Should not allow escalation past hard constraints
- Should allow escalation past soft constraints with cost
- Should detect when constraint cascade enables new options
- Should calculate available de-escalation paths

Commit failing tests → have Claude implement → refactor. Same red-green-refactor pattern.

### Step 7: End session

```
/end-session
```

Your git history now shows the TDD pattern HW4 Part 3 requires:
```
test: add failing tests for fog-of-war filtering
feat: implement buildFogOfWarContext (passes tests)
refactor: extract fog-of-war helper functions
test: add failing tests for escalation logic
feat: implement escalation validation (passes tests)
refactor: simplify constraint status tracking
```

---

## Session 3: Explore → Plan → Implement → Commit (HW4 Part 2)

**Goal:** Demonstrate the 4-phase workflow on a real feature (Issue #8).
**Satisfies:** HW4 Part 2 (E→P→I→C workflow — 30%).
**Time:** ~2 hours.

```bash
claude
```
```
/start-session
```

Pick Issue #8 (Research pipeline):
```
/pick-issue
```

### Explore phase

**Prompt 10:**
```
Explore the current project structure. Read docs/research-pipeline.md
and docs/api-routes.md. Summarize what needs to be built for the
research pipeline API endpoints and how they connect to the Anthropic
API with web search. Write your findings to docs/scratchpad-research-pipeline.md.
```

```bash
git commit -m "docs: research pipeline exploration findings"
```

**`/clear`** — reset context; findings are saved in the file.

### Plan phase

**Prompt 11:**
```
(plan) Read docs/scratchpad-research-pipeline.md and docs/research-pipeline.md.
Plan the implementation of the research pipeline API routes:
- POST /api/scenarios/[id]/research/frame (Stage 0)
- POST /api/scenarios/[id]/research/frame/confirm
- POST /api/scenarios/[id]/research/populate (Stages 1-6)
- GET /api/scenarios/[id]/research/status

Use the Anthropic API with web search enabled. Use prompt templates
from docs/prompt-library.ts. Implement prompt caching — the stable
system prompts should use cache_control for cost savings. Stages 3 and
4 should run in parallel via Promise.all.
```

Review the plan. Adjust if needed. Approve.

### Implement phase

Claude Code executes the plan. Monitor and intervene if needed:

```
> Use the prompt templates exactly as written in the prompt library.
> Don't simplify or shorten them.
```

### Commit phase

**Prompt 12:**
```
Create clean commits for this implementation. Use conventional commit
messages. Then clean up docs/scratchpad-research-pipeline.md — delete
it since the work is done.
```

```
/end-session
```

---

## Session 4: Custom Skill Iteration (HW5 Part 1)

**Goal:** Create a custom skill, test on 2 real tasks, iterate to v2.
**Satisfies:** HW5 Part 1 (Custom Skill — 50%).
**Time:** ~2 hours.

```bash
claude
```
```
/start-session
```

The `/add-feature` skill already exists from Session 1. Now test it on real tasks.

### Test 1: Branch forking

**Prompt 13:**
```
/add-feature Implement branch forking — when a user creates a branch
from a commit, create a new branch record in Supabase pointing to the
fork commit, set it as HEAD, and inherit all parent history by reference.
Include the API route POST /api/scenarios/[id]/branches.
```

Take notes on what the skill did well and what it missed. Save session log.

### Test 2: Turn commit creation

**Prompt 14:**
```
/add-feature Implement turn commit creation — after resolution completes,
create an immutable turn commit in Supabase with the full scenario
snapshot, all phase results, and the narrative entry. Include the API
route POST /api/branches/[id]/turns/advance.
```

Take notes again.

### Iterate to v2

**Prompt 15:**
```
Copy .claude/skills/add-feature.md to .claude/skills/archive/add-feature-v1.md
for the homework submission. Now update .claude/skills/add-feature.md (v2)
based on these issues I noticed:
[describe what went wrong — e.g., "skipped the explore phase", "didn't
check features.json", "commit messages weren't descriptive enough",
"didn't run the full test suite at the end"]
```

Commit: `git commit -m "feat: add-feature skill v2 with improvements from testing"`

```
/end-session
```

---

## Session 5: MCP Integration (HW5 Part 2)

**Goal:** Connect MCP server(s) and demonstrate a complete workflow.
**Satisfies:** HW5 Part 2 (MCP Integration — 35%).
**Time:** ~1 hour.

**Note:** Context Mode is already an MCP server you installed in Session 1. You can use it as your primary MCP demo for HW5 — run `/context-mode:ctx-stats` to show the context savings data, demonstrate how `ctx_fetch_and_index` works for ground truth updates, and document the setup. Alternatively, add a SECOND MCP server (Supabase or Playwright) for a stronger submission showing two MCP integrations.

### Option A: Supabase/Postgres MCP

```bash
# In terminal (not Claude Code):
claude mcp add supabase -- npx @anthropic-ai/mcp-server-postgres \
  --connection-string "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

Then in Claude Code:
```
/start-session

Use the Supabase MCP connection to:
1. List all tables in the database and verify our schema was applied
2. Insert a test scenario record with name "Iran Conflict Test"
3. Query it back and verify the data
4. Create a test branch record pointing to the scenario
5. Verify RLS policies are working — try to read a private scenario without auth
```

### Option B: Playwright MCP (browser testing)

```bash
claude mcp add playwright -- npx @anthropic-ai/mcp-server-playwright
```

```
Use Playwright MCP to:
1. Start our dev server and navigate to http://localhost:3000
2. Verify the page loads without errors
3. Take a screenshot
4. If we have a scenario browser page, navigate to it and verify rendering
```

### Create .mcp.json for team sharing

**Prompt 16:**
```
Create .mcp.json in the project root with the MCP server configuration
we just set up, using environment variable references for any credentials.
Commit it.
```

Document the setup process in `docs/mcp-setup.md` for the HW5 submission.

```
/end-session
```

---

## Session 6+: Build the Game Loop & Frontend (P3)

From here, follow the sprint plan. The daily workflow is:

```
1. claude
2. /start-session                    ← get up to speed
3. /pick-issue                       ← grab your next issue
4. ... work on the issue ...         ← TDD for logic, (plan) for multi-file
5. /end-session                      ← save state, push
6. Partner reviews your PR: /review-pr
7. Merge after approval
```

When starting a new sprint, create the issues:
```
/create-sprint-issues
```

For standup check-ins with your partner:
```
/sprint-standup
```

### Sprint 2 — Issues to tackle

**Partner B's queue (in priority order):**
- Issue #13: Actor agent with prompt caching
- Issue #14: Resolution engine (multi-action TurnPlans)
- Issue #15: Judge evaluator with retry loop
- Issue #17: Game loop controller (full turn orchestration)
- Issue #16: Narrator
- Issue #18: Decision support endpoints
- Issue #19: Branch forking & rewind

**Partner A's queue (in priority order):**
- Issue #20: Split-screen game layout
- Issue #21: Actors panel with global indicators
- Issue #22: Actor detail panel
- Issue #23: Decision catalog & TurnPlan builder (biggest frontend task)
- Issue #25: War chronicle view
- Issue #24: Decision analysis view
- Issue #26: Events tab
- Issue #27: Game mode selection & scenario browser

Use `claude --worktree` so both of you can work in parallel without file conflicts.

### Sprint 3 — Close it out

**Partner A:** Issues #28 (CI/CD), #29 (Sentry), #33 (Map Tier 2), #34 (connect frontend to live API)
**Partner B:** Issues #30 (security audit), #31 (eval dashboard), #32 (seed Iran scenario)
**Both:** Issue #35 (quality gate), Issue #36 (docs, blog, presentation)

### Key prompts for Sprint 2-3 features

**Prompt:**
```
(plan) Implement the full game loop controller in lib/game/turn-loop.ts
and the API routes at /api/branches/[id]/turns/*. Follow the hybrid
simultaneous + reaction model from docs/agent-architecture.ts:

1. Run all actor agents in parallel (Promise.all)
2. Pass fog-of-war context to each agent (use the buildFogOfWarContext we already built)
3. Collect decisions and run the resolution engine
4. Run the judge evaluator — if score < 60, retry resolution with
   judge feedback (evaluator-optimizer pattern, max 2 retries)
5. Check for immediate reaction triggers and run reaction phase
6. Run the narrator for the chronicle entry
7. Create an immutable turn commit
8. Update branch HEAD

Use prompt caching on all AI calls — stable system prompts cached,
only turn-specific data is fresh. Read docs/prompt-library.ts for
all system prompts and docs/env-plan.md for the caching strategy.
```

### Frontend — split screen layout

**Prompt:**
```
(plan) Build the main game view at app/scenarios/[id]/play/[branchId]/page.tsx.
Split-screen layout: left 60% is the Mapbox map, right 40% is a tabbed panel.
Use the component hierarchy from docs/component-tree.ts. Use docs/ui-mockups.html
as the visual reference (open it in a browser to see what it should look like).
Start with the right panel using mock data — Actors tab with actor list and
global indicators, Decisions tab with decision cards, Events tab with last
turn summary. We'll connect to real data and add the map after.
```

### CI/CD pipeline

**Prompt:**
```
(plan) Set up GitHub Actions CI/CD:
1. .github/workflows/ci.yml — on push and PR: lint, typecheck, vitest, npm audit
2. .github/workflows/claude-review.yml — AI PR review using anthropics/claude-code-action@v1
3. Configure Vercel for auto-deploy on main, preview on PRs
4. Add a performance gate: block merge if tests fail

This satisfies the P3 "Enterprise CI/CD" rubric requirement.
```

### Security audit

```
/security-audit
```

Run this skill in Sprint 3. It satisfies the P3 "Security: OWASP top 10 addressed" requirement.

### Monitoring

**Prompt:**
```
Set up Sentry for error tracking. Install @sentry/nextjs, configure with
SENTRY_DSN env var. Add a health check endpoint at /api/health. This
satisfies the P3 "Production Monitoring" rubric requirement.
```

---

## P3 Rubric Mapping

| P3 Requirement (200 pts) | Where it's addressed |
|---|---|
| **Application Quality (50)** | Sessions 6+: game loop, frontend, polish |
| **Advanced AI Techniques (45)** | Parallel actor agents (Promise.all), LLM-as-judge (evaluator), evaluator-optimizer retry, multi-dimensional evals, prompt chaining (research pipeline) |
| **Technical Excellence (40)** | Session 2: TDD, Session 6: architecture, /security-audit |
| **CI/CD & DevOps (30)** | Issue #28: GitHub Actions, Vercel multi-env, performance gates |
| **Team Collaboration (20)** | 3 sprints in docs/scrum-issues.md, code review via /review-pr, standups via /sprint-standup, peer evals |
| **Documentation (15)** | Issue #36: PRD, all docs/, blog post, presentation |

| HW4 Requirement (50 pts) | Where it's addressed |
|---|---|
| **CLAUDE.md & setup (12.5)** | Session 1: handwritten CLAUDE.md → /init iteration, @imports, permissions, hooks |
| **Explore→Plan→Implement→Commit (15)** | Session 3: research pipeline with 4-phase git history |
| **TDD process (15)** | Session 2: fog-of-war + escalation with red-green-refactor commits |
| **Reflection & session log (7.5)** | Write after Sessions 1-3, annotate your Claude Code logs |

| HW5 Requirement (50 pts) | Where it's addressed |
|---|---|
| **Custom skill + iteration (25)** | Session 4: /add-feature v1 → v2 with documented changes |
| **MCP integration (17.5)** | Session 5: Supabase or Playwright MCP with demonstrated workflow |
| **Retrospective (7.5)** | Write after Sessions 4-5 |

---

## Suggested Timeline (3-4 weeks)

| Week | Sprint | Partner A issues | Partner B issues | Shared |
|---|---|---|---|---|
| Week 1 | Sprint 1 | #9 Vercel, #10 Layout, #11 UI lib, #12 Mapbox | #1 Scaffold, #2 Schema, #3 Vitest, #4-7 TDD, #8 Research API | HW4 deliverables |
| Week 2 | Sprint 2 | #20 Split screen, #21 Actors, #22 Actor detail, #23 Decisions | #13 Actor agent, #14 Resolution, #15 Judge, #17 Game loop | Create Sprint 2 issues |
| Week 3 | Sprint 2 cont. | #24 Analysis, #25 Chronicle, #26 Events, #27 Modes | #16 Narrator, #18 Decision support, #19 Branching | HW5 deliverables |
| Week 4 | Sprint 3 | #28 CI/CD, #29 Sentry, #33 Map T2, #34 Live data | #30 Security, #31 Evals, #32 Seed scenario | #35 Quality, #36 Docs |

---

## Task Split (2 people)

| Partner A (Frontend + Map) | Partner B (AI + Game Logic) |
|---|---|
| #9 Vercel deployment | #1 Project scaffolding & CLAUDE.md |
| #10 App layout & routing | #2 Database schema & types |
| #11 Shared UI components | #3 Vitest + mock factory |
| #12 Mapbox Tier 1 | #4 TDD: Fog of war |
| #20 Split-screen layout | #5 TDD: Escalation |
| #21 Actors panel | #6 TDD: TurnPlan validation |
| #22 Actor detail panel | #7 TDD: State updates |
| #23 Decision catalog & TurnPlan builder | #8 Research pipeline API |
| #24 Decision analysis view | #13 Actor agent w/ caching |
| #25 War chronicle | #14 Resolution engine |
| #26 Events tab | #15 Judge + retry loop |
| #27 Game modes & browser | #16 Narrator |
| #28 CI/CD pipeline | #17 Game loop controller |
| #29 Sentry monitoring | #18 Decision support APIs |
| #33 Mapbox Tier 2 | #19 Branch forking & rewind |
| #34 Connect to live API | #30 Security audit |
| #39 HW5 MCP demo | #31 Eval dashboard |
| | #32 Seed Iran scenario |
| | #38 HW5 skill iteration |
| **Both:** #35 Quality gate, #36 Docs/blog/presentation, #37 HW4 reflection, #40 HW5 retrospective |

Use `claude --worktree` so both of you can work in parallel without file conflicts.

---

## Common Pitfalls

1. **Don't dump all docs into context.** The @import references in CLAUDE.md let Claude Code read them on demand. Context Mode sandboxes the raw content so only summaries enter context. Trust the agent.
2. **`/clear` between sessions.** Stale context from a previous task causes confusion and errors. Context Mode handles mid-session compaction; `/clear` handles between-task resets.
3. **Don't skip `/start-session`.** Without it, Claude Code doesn't know what happened last time. You'll waste 10 minutes re-explaining context.
4. **Write test ASSERTIONS yourself.** Claude Code writes great boilerplate but YOU must define what "correct" means. The test is the spec.
5. **Commit frequently.** Small, atomic commits with conventional messages. The rubric literally grades your git history.
6. **Don't over-build the map early.** Tier 1 (country fills, chokepoints) is enough for Sprint 2. Animations are Sprint 3 polish.
7. **Test AI prompts early.** Run one actor agent call manually before building the full game loop. Bad prompts = bad everything.
8. **Save session logs from day one.** HW4 requires annotated Claude Code session logs. Copy terminal output to a log file after each session.
9. **Update claude-progress.txt religiously.** This is your project's between-session memory. Context Mode handles within-session compaction but NOT between sessions.
10. **Use `(plan)` mode for anything touching 3+ files.** It's tempting to skip. Don't. Plan mode catches architectural mistakes before they become code.
11. **Check `/context-mode:ctx-stats` periodically.** If context savings drop below 80%, you're probably running raw commands that should go through the sandbox. Redirect them.
