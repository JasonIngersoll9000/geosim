# GeoSim — Video Demo Script

**Target length:** 7–9 minutes  
**Pace:** ~130 words/minute at natural speaking pace  
**Total narration:** ~1,050 words  
**Format:** Narration + [ON-SCREEN: action cue]

---

## SECTION 1 — Introduction (45 seconds)

[ON-SCREEN: Open browser to https://geosim-eight.vercel.app/ — let the landing page load fully]

**Narration:**

"This is GeoSim — an AI-powered geopolitical strategic simulation engine built as a pair programming project using Claude Code.

The premise: an Iran nuclear crisis scenario with six actors — the US, Iran, Israel, Russia, China, and the Gulf States. Each actor has their own AI agent, their own objectives, their own intelligence picture. They plan simultaneously, and a resolution engine arbitrates the outcomes.

But the more interesting story isn't what the app does. It's how Claude Code's extensibility layer shaped how we built it — and what we learned about AI-assisted development at scale."

---

## SECTION 2 — Live Application Demo (2 minutes)

[ON-SCREEN: Click into the Scenarios page or navigate to the main game view]

**Narration:**

"Let me show you the app first. This is the scenario hub — you can see the Iran 2026 crisis scenario. Six actors, 12 turns, git-like branching throughout.

When you enter the game view..."

[ON-SCREEN: Navigate into the game view — show the Mapbox terrain map with actor markers]

"...you see the geopolitical theater. Mapbox GL terrain, actor position markers, chokepoint overlays. Each marker represents an actor's deployed capability at this turn node.

The key mechanic is fog of war — each actor only sees their own intelligence picture. What Iran sees about US naval deployments is filtered based on Iran's actual intelligence assets, not what's objectively true. That filter runs at the Supabase row-level security layer."

[ON-SCREEN: Show the Chronicle panel or Turn display — highlight the turn commit structure]

"Turn history is immutable. Every resolved turn is a commit. You can navigate backward through the chronicle to see how the scenario evolved.

And here's what makes it a simulation rather than a game..."

[ON-SCREEN: If TakeControlModal or branch fork UI is accessible, show it. Otherwise show the branch tree]

"At any turn node, a player can fork the timeline. Take control of an actor, choose from AI-generated decision options — each with configurable scale, scope, posture, and timing — and steer events down a different path. The original branch remains intact. You're exploring counterfactuals."

---

## SECTION 3 — Claude Code Workflow (2 minutes 30 seconds)

[ON-SCREEN: Open VS Code or terminal — show the project root. Navigate to CLAUDE.md]

**Narration:**

"Let's talk about how this was built. Everything starts here — CLAUDE.md. Not a stub. 216 lines, with @imports to 15 reference documents.

The @imports pattern means Claude Code loads only what's relevant to the current task. Working on a component? It reads frontend-design.md. Working on an AI agent? It reads prompt-library.ts and agent-architecture.ts. Progressive disclosure — the same principle we applied to fog-of-war."

[ON-SCREEN: Show .claude/settings.json — scroll to the hooks section]

"Hooks are where the interesting enforcement happens. Five hooks configured. Let me show you the two that mattered most.

This PostToolUse hook runs `run-tests-on-save.sh` — on every file save, it detects if the path matches a test file and runs vitest on that specific file. Not the full suite — just the relevant test. Two-second feedback loop. Red-green in the same terminal session without asking for it.

This PreToolUse hook runs `protect-files.sh` — it exits with code 2 if you try to write to `.env`, `.env.local`, or `secrets.json`. Not a warning. A hard stop."

[ON-SCREEN: Show .claude/skills/ directory listing]

"We built 14 custom skills. Let me highlight two.

`quality-gate.md` — notice the header: version 2, WSL2 plus context-mode aware. Version 1 called `npm run test`. On our WSL2 machine, `npm` is a Windows binary that can't execute the Linux Vitest binary. Version 2 uses bun. Skills are code. Code gets bugs. Bugs get fixed in version 2.

`review-pr.md` — the C.L.E.A.R. review framework. Context, Logic, Evidence, Architecture, Risk. When invoked, it fetches the PR diff via GitHub CLI, applies the checklist, and posts the review to GitHub."

[ON-SCREEN: Show .claude/agents/code-reviewer.md — briefly]

"One custom agent: the code-reviewer, configured with worktree isolation. It runs in a fresh git worktree — no shared file state, no context contamination. Its output posts directly to GitHub PR comments."

[ON-SCREEN: Open GitHub — show PRs #83, #88, #89 and the C.L.E.A.R. review comments]

"Here's what that looks like in practice. PR 83 — the cost tracker module. PR 88 — fork copies state snapshots. PR 89 — the six-actor decision catalogs. Each has a structured C.L.E.A.R. review comment with AI disclosure. Eighty percent AI-generated analysis, human-verified before posting."

---

## SECTION 4 — CI/CD Pipeline (1 minute)

[ON-SCREEN: Open .github/workflows/ci.yml in editor]

**Narration:**

"The CI pipeline. Eight stages: typecheck, lint, unit tests, coverage, security audit, E2E tests — and Vercel handles preview and production deploy automatically on every PR.

The security audit step runs `npm audit --high` — flags vulnerabilities above the high severity threshold. But the more comprehensive security pass happens during development via the `security-audit.md` skill — nine steps covering OWASP Top 10, Supabase RLS policy review, XSS vector audit, and SBOM generation."

[ON-SCREEN: Navigate to GitHub Actions tab — show a recent CI run with green checks]

"Every PR to main triggers this workflow. Typecheck and lint failures block merge. The Vercel GitHub integration posts a preview deploy URL to every PR automatically — you can see that in any of the 92 merged PR threads."

---

## SECTION 5 — TDD Evidence (45 seconds)

[ON-SCREEN: Open terminal — run: git log --oneline | grep -i "test\|tdd" | head -10]

**Narration:**

"TDD. Let me show you the commit history rather than tell you about it.

Commit `43e857b` — 'test: add failing tests for node API routes (TDD)'. The next commit wires the implementation. That's the pattern. Red commit first, green commit second.

We have five explicit examples of this in the history. The `run-tests-on-save.sh` hook makes it visceral — you watch the test fail on every save until the implementation makes it green, automatically, without switching windows."

[ON-SCREEN: Show tests/ directory tree briefly — 41 files visible]

"41 test files. Game logic, AI agents, API integration, 20 component tests, 4 E2E tests against the deployed app."

---

## SECTION 6 — Closing Takeaways (45 seconds)

[ON-SCREEN: Return to https://geosim-eight.vercel.app/ — show the deployed app one more time]

**Narration:**

"Three things this project taught us about building with Claude Code at scale.

First: hooks enforce what documentation only suggests. A PostToolUse test runner is thirty minutes to configure and prevents hours of 'wait, did I break something' across a sprint.

Second: skills are code. Version them, fix their bugs, iterate on them. `quality-gate` v1 was broken for our environment. Version 2 wasn't. Treat your skills like your source code.

Third: CLAUDE.md @imports make the difference between a context window that works and one that's constantly overwhelmed. Keep domains separated. Load only what's relevant. The progressive disclosure pattern applies to AI context the same way it applies to UI.

GeoSim is live at geosim-eight.vercel.app. The repository is public. The `.claude/` directory is fully committed — skills, hooks, agents, and `.mcp.json` all ship with the code. That's the whole workflow, reproducible."

---

## TIMING GUIDE

| Section | Target | Narration words |
|---|---|---|
| 1 — Introduction | 0:00–0:45 | ~100 |
| 2 — Live App Demo | 0:45–2:45 | ~270 |
| 3 — Claude Code Workflow | 2:45–5:15 | ~330 |
| 4 — CI/CD Pipeline | 5:15–6:15 | ~130 |
| 5 — TDD Evidence | 6:15–7:00 | ~115 |
| 6 — Closing | 7:00–7:45 | ~120 |
| **Total** | **~7:45** | **~1,065** |

---

## PRESENTER NOTES

- Record at 1080p, browser zoom at 90% so code is readable
- Disable notifications before recording
- Use Chrome — Mapbox GL renders most reliably in Chromium
- The Vercel app may have a cold start delay (up to 5s) — navigate to it before starting the recording so it's warm
- For Section 3, have `.claude/` open in a file explorer sidebar before the section starts
- For Section 5, have the terminal pre-positioned at the repo root before the section starts
- If the TakeControlModal isn't accessible without auth, substitute the BranchTree component view
