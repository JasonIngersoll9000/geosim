# What Building a Geopolitical Simulation Taught Me About Claude Code

*The most valuable features weren't the ones that wrote code for me.*

---

I was 45 minutes into a Sprint 2 session when the test runner caught something I'd completely missed. I'd just saved a React component file — nothing dramatic, a minor prop change — and two seconds later, a notification appeared in my terminal:

```
FAIL tests/components/game/EscalationLadder.test.tsx
  ✗ renders correct rung label for rung 4
    Expected: "Conventional Strike"
    Received: "Conventional strike"
```

The PostToolUse hook had fired automatically. `run-tests-on-save.sh` had detected that the saved file path matched a test file pattern, run vitest on that specific test file, and surfaced the failure before I'd even moved on to the next task. I hadn't asked for a test run. I hadn't thought to run one. The hook just enforced it.

That moment crystallized something I'd been slow to internalize: the most powerful things about Claude Code aren't the AI suggestions. They're the mechanisms that enforce process when you're too deep in a problem to remember to enforce it yourself.

---

## What We Built

GeoSim is an AI-powered geopolitical strategic simulation engine. Load an Iran crisis scenario, watch six actors — the US, Iran, Israel, Russia, China, and the Gulf States — simultaneously plan their moves using separate Claude Sonnet agent calls, then watch a resolution engine arbitrate the outcomes and a narrator synthesize them into intelligence reports.

The core mechanic is a git-like branching system: at any turn node, a player can fork the timeline, take control of an actor, and steer events down a different path. Every branch is immutable once committed. Every actor sees only their own intelligence picture — fog of war filtered at the database layer via Supabase RLS.

It's live at https://geosim-eight.vercel.app/.

The technical stack is Next.js 14 App Router, TypeScript, Supabase (Postgres + Auth + Realtime), Mapbox GL JS, and the Anthropic API. But the interesting story isn't the stack — it's how Claude Code's extensibility layer shaped the way we built it.

---

## CLAUDE.md as Architecture Documentation

The first thing we did was write a serious CLAUDE.md. Not a "this project uses Next.js" stub — a 216-line living document with @imports to 15 reference files:

```
@docs/frontend-design.md         — Stitch visual identity, font rules
@docs/prompt-library.ts          — All AI agent system prompts
@docs/agent-architecture.ts      — Agent roles and game loop pseudocode
@docs/geosim-data-model.ts       — TypeScript types for every entity
@docs/testing-strategy.md        — Test priorities, TDD workflow, mocking strategy
```

The pattern that made this work was modular @imports. Instead of cramming everything into one file, each domain got its own reference doc. Claude Code only loaded what was relevant to the current task. When we were writing a component, it read `frontend-design.md`. When we were working on AI agents, it read `prompt-library.ts` and `agent-architecture.ts`. The whole thing felt like progressive disclosure — the same principle we applied to the fog-of-war system.

CLAUDE.md evolved across 92 PRs. You can trace the project's maturation by reading the git history of that single file: Sprint 1 added TDD rules and branch conventions; Sprint 2 added Stitch design tokens; Sprint 3 added the node-centric branch architecture. It became the source of truth for every architectural decision, enforced through both documentation and Claude Code's ability to actually read and follow it.

---

## Skills as Iterable Automation

We built 14 custom skills. The most instructive story is `quality-gate`.

Version 1 ran a comprehensive QA audit — tests, types, linting, security, CI verification. It was useful. It also silently failed on our development machine, which runs WSL2 on Windows. The problem: v1 called `npm run test`, but on our machine `npm` is a Windows binary that can't execute the Linux Vitest binary. The skill appeared to succeed (exit 0) while actually doing nothing.

Version 2 header: `# quality-gate — v2 WSL2 + context-mode aware`.

Two changes: replaced every `npm` call with `bun`, and piped all output through `ctx_execute` (the context-mode MCP sandbox) instead of letting large test output flood the context window. The fix was trivial once we understood the problem. The lesson was the process: skills are code, and code gets bugs, and bugs get fixed in v2.

The other skill that became indispensable was `run-turn` — a complete game simulation turn executed from the command line. It chains the actor agent calls, runs the resolution engine, invokes the judge, and synthesizes via the narrator. During AI pipeline development, being able to run a full turn cycle from a single skill invocation compressed a development loop that would otherwise involve navigating five separate API endpoints.

---

## Hooks as Enforcement, Not Documentation

Five hooks in `.claude/settings.json`:

```json
"hooks": {
  "PreToolUse": [{
    "matcher": "Edit|Write",
    "hooks": [{ "command": "bash .claude/hooks/protect-files.sh" }]
  }],
  "PostToolUse": [
    { "matcher": "Edit|Write", "hooks": [{ "command": "prettier --write $CLAUDE_FILE_PATH" }] },
    { "matcher": "Edit|Write", "hooks": [{ "command": "bash .claude/hooks/run-tests-on-save.sh" }] }
  ],
  "Stop": [{ "hooks": [{ "command": "git status --porcelain | grep -q . && echo '...uncommitted...'" }] }]
}
```

The difference between a documented rule and a hook is enforcement. CLAUDE.md can say "never commit to .env.local" — but a PreToolUse hook that exits with code 2 when you try to write to `.env*` files *actually stops it from happening*. Documentation is advisory. Hooks are structural.

The `run-tests-on-save.sh` hook was the one we felt most during development. It runs vitest only on the specific test file that was saved — not the whole suite — which keeps the feedback loop under two seconds. During component development, we'd write a test, save it, watch it fail, write the implementation, save it, watch it go green. Red-green in the same terminal session, automatically.

The session lifecycle hooks — `SessionStart` injecting a system message to run `/start-session`, `Stop` warning about uncommitted changes — felt more ergonomic than impactful. But they're there, and they've caught things.

---

## Worktrees for Parallel AI Development

One of Sprint 2's structural wins was worktree agents. Five PRs were merged from `worktree-agent-*` branches — each one a Claude Code agent session running in a fully isolated git worktree:

- `worktree-agent-a29a8263` — trivial bug fixes
- `worktree-agent-ae36607a` — prompt caching for AI stable system prompts
- `worktree-agent-a27c703e` — error boundaries and empty states
- `worktree-agent-a32132a5` — Israel decision catalog
- `worktree-agent-ab230cc1` — z-index fixes for actor panel / map controls

The pattern: a parent session dispatches a subagent into a worktree (`superpowers:dispatching-parallel-agents` skill), the subagent works in isolation with no shared file state, opens a PR when done, and the parent session reviews and merges. No merge conflicts with in-progress main branch work. No contamination of the parent session's context.

During Sprint 2, while one worktree session was implementing the prompt caching architecture for AI agents, the main session was building the Scenario Hub page. Two nontrivial features, developed in parallel, no coordination overhead.

---

## TDD with Claude Code

The project's testable commit history shows five explicit red-before-green sequences. The clearest:

```
43e857b  test: add failing tests for node API routes (TDD)
d4f9c13  feat(#32): add generateDecisionOptions asset-aware, NEUTRALITY preamble
```

The `run-tests-on-save.sh` hook makes the red-green loop visceral. You commit the failing test, watch it fail on every save until you wire the implementation, then watch it go green. The hook closes the feedback loop that TDD requires without requiring you to context-switch to run tests manually.

The test suite has 41 files now: 9 game logic, 2 AI, 3 API integration, 20 components, 3 library utilities, 4 E2E. The component tests are the weakest layer — most are smoke-level assertions (does the element render?) rather than behavioral contracts. The game logic and AI tests are where TDD was practiced most rigorously.

---

## Honest Reflection

Three things we'd do differently:

**C.L.E.A.R. reviews should be live, not retroactive.** We had the `review-pr.md` skill configured from Sprint 1. We used it inconsistently. The PR reviews we posted retroactively to PRs #83, #88, and #89 are substantive — but they landed after merge, not before. In a future project, the `review-pr` skill gets wired to a PR creation checklist, not a sprint retrospective.

**E2E tests belong in Sprint 1.** Our Playwright config lived as a script stub with no actual test files until the project documentation phase. Four smoke tests against the deployed app would have caught the auth redirect regression in Sprint 2 that we found manually.

**The `.mcp.json` file should ship with the repository from day one.** We configured MCP servers via `settings.json` throughout the project — which works fine locally — but the rubric expects a shareable `.mcp.json`. It's a five-minute addition, but it signals to the next developer exactly how to reproduce the development environment.

---

## Five Specific Takeaways

1. **Write hooks before you write features.** A PostToolUse test runner costs 30 minutes to configure and saves hours of "wait, did I break something?" across a sprint.

2. **Version your skills.** `quality-gate` v1 was wrong for our environment. `quality-gate` v2 was right. Treating skills as code — with versions, bug fixes, and iteration — is the mindset shift.

3. **CLAUDE.md @imports are a force multiplier.** A single 200-line CLAUDE.md with @imports to domain-specific docs is more effective than one 800-line monolith that Claude Code has to parse in full every time.

4. **Worktree agents are underrated for parallel work.** The agent isolation prevents the context contamination and merge conflicts that slow down parallel development. Use them aggressively.

5. **The neutrality principle requires explicit enforcement.** Our `NEUTRALITY_PREAMBLE` (injected into every AI agent system prompt) exists because without it, AI agents drift toward protagonist bias. For a simulation that models six actors with equal rigor, this is a correctness requirement, not an ethical preference. Make your invariants explicit in CLAUDE.md or they won't hold.
