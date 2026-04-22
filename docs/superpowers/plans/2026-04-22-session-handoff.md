# Session Handoff — feat/node-centric-branches Polish Pass
> Paste this entire prompt at the start of the next session, then invoke `/plan`

---

We are working on branch `feat/node-centric-branches` in the worktree at `.worktrees/node-centric-branches`. All work in this session stays on this branch and goes into PR #93. Do NOT switch branches or commit to main.

The preview deployment is live and the core node-centric architecture is working: scenario library loads, decision generation is functional, chronicle shows 115 entries. We need to fix 5 categories of issues to reach a polished playable game.

**Context files to read before planning:**
- `docs/scrum-issues.md` — full issue catalogue (section "IMMEDIATE: Node-Centric Branch Issues 2026-04-22" has the new bugs)
- `app/scenarios/[id]/play/[branchId]/page.tsx` — play page RSC (turn loading, chronicle field priority)
- `components/game/GameView.tsx` — main game component (dead code, modal vs panel)
- `components/game/TakeControlModal.tsx` — current decision popup (to be replaced/refactored)
- `components/panels/DecisionCatalog.tsx` — the panel tab decisions should live in
- `app/api/nodes/[commitId]/decision-options/route.ts` — decision generation API
- `app/api/nodes/[commitId]/fork/route.ts` — fork/advance pipeline
- `middleware.ts` and `app/auth/login/page.tsx` — auth redirect chain

---

## Issues to plan and fix (in priority order)

### 1. Auth redirect inconsistency (Bug A)
Signing in from different entry points (TopBar button, middleware redirect, "Take Control" gate in BranchTree) produces stuck states — user ends up on the wrong page or in a redirect loop. Every auth trigger must pass `?redirect=<current-path>` and the login page must honour it. Trace every call site of the auth flow and make them consistent.

### 2. Turn navigation — game stuck at turn 115 (Bug B)
The play page initialises `turnCommitId` from `branch.head_commit_id` (the latest turn). The node navigation API (`GET /api/nodes/[commitId]`) already returns `prev`/`next` commit IDs but is not wired to the UI. The chronicle timeline entries are already rendered — clicking one should set `turnCommitId` in GameView and reload actor state for that turn. Wire an `onSelectCommit(commitId)` callback from the chronicle timeline up to the page-level state so users can scrub to any past turn.

### 3. "Turn 116 / No narrative recorded" after fork (Bug C)
When a decision is selected, the fork runs `advance` in the background and the UI immediately navigates to the new branch — before the narrative exists. Three fixes needed:
- Add `full_briefing` to the chronicle field priority chain in the play page (~line 387): `chronicle_entry ?? narrative_entry ?? full_briefing ?? ''`
- Show a "Simulating turn…" pending state for the new branch's head commit until the realtime subscription fires with the completed turn
- Ensure the realtime handler in GameView refreshes the chronicle entry when advance completes

### 4. Move decisions from modal to panel tab (Bug D)
`TakeControlModal` is a popup dialog that shows AI decision options. The intended UX — matching `docs/frontend-mockups.md` and the mock `DecisionCatalog` panel tab — is to show decisions inline in the right panel's Decisions tab. Plan:
- Remove the modal dialog wrapper from `TakeControlModal`
- When "Take Control" is initiated for an actor, fetch decision options and pass them into `DecisionCatalog` via a prop/state lift in `GameView`
- Switch the active panel tab to "Decisions" automatically when options are ready
- The fork call on option selection stays the same — only the presentation changes

### 5. GameView dead code audit (Bug E)
Do a systematic pass on `GameView.tsx` and fix or remove:
- `_setCascadeAlerts` — confirm if used anywhere; remove if not
- Verify `TakeControlModal` is actually rendered in JSX (not just state-managed with no render)
- `gtIndex`/`gtHasNext`/`gtLoading` ground-truth navigation states — wire to UI or remove
- `maxEscalationRung` — verify it drives `EscalationLadder` or remove
- Admin "Run Research Update" button — must be hidden from non-admin users
- Any component receiving `undefined` props because the data shape changed during the node-centric refactor

---

## Goal
All 5 issues fixed, tests passing (`bun run test -- --run`), typecheck clean (`bun run typecheck`), all commits on `feat/node-centric-branches`, PR #93 ready to merge to main.

Invoke `/plan` after reading the files listed above.
