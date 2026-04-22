# GeoSim — Video Demo Script

**Target length:** 7–9 minutes  
**Pace:** ~130 words/minute at natural speaking pace  
**Total narration:** ~1,100 words  
**Format:** Narration + [ON-SCREEN: action cue]

---

## SECTION 1 — Hook & Intro (30 seconds)

[ON-SCREEN: Open browser to https://geosim-eight.vercel.app/ — let the landing page load]

**Narration:**

"What if you could fork history? Pick a moment in an ongoing geopolitical crisis, take control of one of the actors, make a different call — and watch a parallel timeline play out.

That's GeoSim. An AI-powered geopolitical simulation engine built with Next.js, Supabase, and Claude. Let me show you the app first, then I'll walk you through the Claude Code workflow that built it."

---

## SECTION 2 — Live Application Demo (4 minutes)

### 2a — The Scenario: Real Intelligence, Real Actors

[ON-SCREEN: Navigate to the Scenarios page — show the Iran 2026 scenario card]

**Narration:**

"The scenario you're looking at is the Iran nuclear crisis — 2026. Six actors: the United States, Iran, Israel, Russia, China, and the Gulf States. Each one has their own objectives, their own military doctrine, their own red lines.

This isn't placeholder data. Before a single line of game logic was written, we ran a 7-stage research pipeline — the `/seed-iran-scenario` skill — that called the Anthropic API to pull verified geopolitical intelligence: military force deployments, economic dependencies, political constraints, escalation thresholds. Everything you see here is grounded in real-world context."

[ON-SCREEN: Click into the scenario — show the main game view with the actor list/panel on the side]

"Each actor has a full profile. Click into the US actor and you see their current posture, active capabilities, escalation rung, and intelligence assessment. Iran sees a completely different picture — their intelligence picture is filtered by what Iran would actually know, not what's objectively true. That's fog of war, enforced at the Supabase row-level security layer."

### 2b — The Mapbox Visualization

[ON-SCREEN: Pan around the Mapbox terrain map — show actor markers, chokepoint overlays, metric chips]

**Narration:**

"The map is Mapbox GL — terrain rendering with actor position markers, chokepoint overlays at the Strait of Hormuz and Bab-el-Mandeb, and floating metric chips showing live indicators: oil price pressure, naval readiness, escalation index.

When a turn resolves, these markers update in real time via Supabase Realtime. You're watching the simulation state propagate to every connected client simultaneously."

### 2c — Turn Resolution

[ON-SCREEN: Show the Chronicle panel or a resolved turn — scroll through the narrative entries]

**Narration:**

"Each turn runs through four AI agents. The Actor Agent plans each actor's move based on their objectives and constraints. The Resolution Engine arbitrates the simultaneous actions — who succeeds, who gets countered, what escalates. The Judge scores the outcome for consistency with the scenario rules. The Narrator synthesizes everything into intelligence reports, one per actor, each written from that actor's perspective.

The chronicle is the permanent record — every turn commit is immutable. You can scroll back to turn one and see exactly how this crisis unfolded."

### 2d — Git-like Branching: Fork the Timeline

[ON-SCREEN: Show the branch tree or node navigation — find a turn node and click to fork / show TakeControlModal]

**Narration:**

"Here's what makes this a simulation rather than a replay.

At any turn node, you can fork the timeline. Click Take Control, pick an actor, and you get a set of AI-generated decision options for that actor at that moment — each with configurable scale, scope, posture, and timing parameters.

Choose differently from what the AI would have done, and you've created a new branch. A parallel timeline with its own chronicle, its own fog of war, its own escalation trajectory. The original branch is untouched — you're exploring a counterfactual.

The branch tree shows you all the timelines that have diverged from this scenario. Navigate between them with the commit ID in the URL — it's literally a git graph for geopolitical history."

---

## SECTION 3 — Claude Code Workflow (3 minutes)

[ON-SCREEN: Switch to terminal / VS Code — show project root]

**Narration:**

"Now let me show you how this was built — because the Claude Code workflow is as interesting as the app."

### 3a — CLAUDE.md & Skills

[ON-SCREEN: Open CLAUDE.md — scroll slowly to show the @imports section]

**Narration:**

"Everything starts with CLAUDE.md. Ours is 216 lines with @imports to 15 reference documents — agent architecture, the full prompt library, the data model, testing strategy. Claude Code only loads what's relevant to the task at hand.

We built 14 custom skills on top of this. Three are worth showing."

[ON-SCREEN: Show .claude/skills/ directory listing]

"The `/seed-iran-scenario` skill runs the 7-stage research pipeline that populated the scenario you just saw — one command, real geopolitical intelligence, seeded to the database.

The `/run-turn` skill executes a complete game turn from the command line — Actor Agent, Resolution Engine, Judge, Narrator — without touching the UI. Essential for testing the AI pipeline in isolation.

The `/quality-gate` skill — notice the header: version 2, WSL2 + context-mode aware. Version 1 called `npm run test`. On our machine, `npm` is a Windows binary that can't run the Linux test process. It silently exited zero and ran nothing. Version 2 uses `bun`. Skills are code. Code gets bugs. Bugs get fixed in version 2."

### 3b — Hooks

[ON-SCREEN: Open .claude/settings.json — show the hooks section]

**Narration:**

"Hooks are where process gets enforced rather than just documented.

This PostToolUse hook runs `run-tests-on-save.sh` on every file save. It detects whether the saved path matches a test file and runs vitest on that specific file — not the whole suite. Two-second feedback loop, automatically. No context switching.

This PreToolUse hook runs `protect-files.sh` — it exits with code 2 if you try to write to `.env` or `secrets.json`. Not a lint warning. A hard stop that blocks the tool call entirely.

The difference between a documented convention and a hook is enforcement."

### 3c — Agents, Worktrees, TDD & CI

[ON-SCREEN: Show .claude/agents/code-reviewer.md briefly, then switch to git log in terminal]

**Narration:**

"We have one custom agent: the code-reviewer, running in worktree isolation. It checks out a clean copy of the repo, applies the C.L.E.A.R. review framework — Context, Logic, Evidence, Architecture, Risk — and posts structured feedback directly to the GitHub PR.

Five PRs on this project were developed by worktree agents running in parallel — the UI and the AI pipeline built simultaneously with no merge conflicts.

For TDD, the commit history is the evidence. Commit `43e857b` — 'test: add failing tests for node API routes.' The next commit wires the implementation. Red commit, green commit. The test-on-save hook makes that loop automatic."

[ON-SCREEN: Open .github/workflows/ci.yml briefly]

"The CI pipeline runs on every PR: typecheck, lint, unit tests, coverage, security audit, E2E tests against the live deployed app, and Vercel preview deploy. Every merge to main goes straight to production."

---

## SECTION 4 — Closing (30 seconds)

[ON-SCREEN: Return to https://geosim-eight.vercel.app/ — show the deployed app]

**Narration:**

"GeoSim is live at geosim-eight.vercel.app. The `.claude/` directory ships with the repo — 14 skills, 5 hooks, 8 MCP servers, one worktree agent, and `.mcp.json` for shareable configuration.

The two things this project taught us: hooks enforce what documentation only suggests, and skills that iterate from v1 to v2 based on real failures are worth more than ten that were written once and never touched.

Thanks for watching."

---

## TIMING GUIDE

| Section | Target | Words |
|---|---|---|
| 1 — Hook & Intro | 0:00–0:30 | ~65 |
| 2a — Scenario seeding + actors | 0:30–2:00 | ~200 |
| 2b — Mapbox visualization | 2:00–2:45 | ~100 |
| 2c — Turn resolution | 2:45–3:30 | ~115 |
| 2d — Branching / fork timeline | 3:30–4:45 | ~175 |
| 3a — CLAUDE.md + skills | 4:45–6:00 | ~175 |
| 3b — Hooks | 6:00–6:45 | ~115 |
| 3c — Agents, worktrees, TDD, CI | 6:45–7:30 | ~120 |
| 4 — Closing | 7:30–8:00 | ~75 |
| **Total** | **~8:00** | **~1,140** |

---

## PRESENTER NOTES

- Record at 1080p, browser zoom at 90%
- Disable notifications before recording
- Navigate to https://geosim-eight.vercel.app/ before recording so the Vercel cold start has already fired
- Have `.claude/` open in a file explorer sidebar before Section 3 starts
- Have terminal pre-positioned at repo root before Section 3c
- For Section 2d, if the TakeControlModal requires a live game session, show the BranchTree component view instead and narrate the forking concept
- Use Chrome — Mapbox GL renders most reliably in Chromium
