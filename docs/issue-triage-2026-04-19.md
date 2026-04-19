# GeoSim Open Issue Triage — 2026-04-19

Generated after PR #65 (`feat: wire player decisions through full AI pipeline`) was pushed but not yet merged.

Legend:
- **STATUS**: ✅ done (closeable) / 🟡 partial (PR #65 covers some) / 🟠 outstanding / 🔴 blocker
- **Effort**: S (< 2h) · M (2–6h) · L (6–20h) · XL (20h+)

---

## P0 — Critical

### #51 · fix: Resolve 11 post-merge bugs blocking playable game  🟠  (L)
**Status:** The referenced doc `docs/bugs/2026-04-09-playable-game-bugs.md` does **not exist** in the repo (confirmed via `test -f`). So the bug list in the issue body is the only source of truth. Need to re-verify each bug against current code.

**Repro by bug:**

| # | Bug | How to verify |
|---|---|---|
| 1 | actors query wrong columns in `app/scenarios/[id]/page.tsx` | `grep -n "scenario_actors" app/scenarios/\[id\]/page.tsx` — look for `country_code` ref. If present, still broken. |
| 2 | GameMap hardcodes `/api/scenarios/iran-2026/cities` | `grep -n "iran-2026/cities" components/map/GameMap.tsx` |
| 3 | map-assets route rejects missing turnCommitId | `curl -s "http://localhost:3001/api/scenarios/<id>/branches/<id>/map-assets"` without param, expect 400 |
| 4 | Map shows only USS Nimitz (on land) | Load /play page, inspect map assets — downstream of Bug 3 |
| 5 | "Run Research Update" exposed to all users | Load /play page as non-admin, look for button |
| 6 | TopBar hardcoded `turnNumber=4, totalTurns=12` | `grep -n "turnNumber = 4\|totalTurns = 12" components/ui/TopBar.tsx` |
| 7 | Actors tab blank — `initialData.actors` empty | Smoke test showed actors rendered, **may be resolved** |
| 8 | Chronicle empty | Click CHRONICLE tab on /play page |
| 9 | Decisions panel visible in observer mode | Click "Observe AI vs AI", check if Decisions tab visible |
| 10 | Actor status panel overlaps map layer toggles | Visual inspection |
| 11 | "Branch creation is not available yet" | Visual: smoke test confirmed **still present** |

**Resolution plan:** Re-audit each bug (parallel subagents, 1 agent per bug is overkill — one agent per ~3 bugs is right). Close individual bugs that are no longer reproducible. Open separate small PRs per batch (e.g. `fix/bug-1-3-actors-and-map-assets`).

**Recommend:** Break this into 3 PRs — P0 (Bugs 1–3, 7–8 = core data loading), P1 (Bugs 4, 5, 9 = feature gates), P2 (Bugs 6, 10, 11 = visual polish).

---

### #52 · feat: Multi-actor decision catalog  🔴 (L)
**Status:** `lib/game/iran-decisions.ts` exports only `IRAN_DECISIONS: DecisionOption[]` (a flat US-only array — 7 options) and `IRAN_DECISION_DETAILS` (US-only detail map). **No actor keying.** PR #65's `loadDecisionCatalog()` returns `{ united_states: adapted }` because that's all that exists; `turn-helpers.ts:35` even comments this.

**Repro:**
```bash
grep -E "actor_?[Ii]d" lib/game/iran-decisions.ts   # returns nothing
```
Without actor-keyed decisions the AI actor agents have no catalog to choose from for Iran/Israel/Russia/China/Gulf. `/advance` skips those actors (`aiActors = actorRows.filter(a => (decisionCatalog[a.id]?.length ?? 0) > 0)`) — result: only US acts each turn.

**Resolution plan:**
1. Restructure `iran-decisions.ts`:
   ```ts
   export const IRAN_DECISION_CATALOG: Record<ActorId, DecisionOption[]> = {
     united_states: [...],
     iran: [...],
     israel: [...],
     russia: [...],
     china: [...],
     gulf_states: [...],
   }
   ```
2. Research the 5 new actor catalogs (5–7 decisions each) using existing `docs/Iran Research/research-*.md`.
3. Update `loadDecisionCatalog()` in `turn-helpers.ts` to return the full record.
4. Update `DecisionCatalog` UI component to filter by `controlledActorId`.

**Dependencies:** none (blocks meaningful end-to-end pipeline testing).
**Estimated tokens:** L — each actor catalog needs authored rationale. Good candidate for subagent-per-actor.

---

### #41 · feat: GitHub Actions CI  🟠 (S)
**Status:** No `.github/` directory exists at all. CI is entirely absent.

**Resolution plan:**
1. Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on: [pull_request, push]
   jobs:
     verify:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: npm }
         - run: npm ci
         - run: npm run typecheck
         - run: npm run lint
         - run: npm test -- --run
   ```
2. Verify CI passes on PR #65 (will expose the 4 pre-existing test failures — document/skip them via `.skip` or address in separate PR).
3. Add branch protection: require CI green before merge.

**Risk:** The 4 pre-existing test failures (seed-iran, middleware, research-pipeline, TurnPlanBuilder) will block every PR once CI is enforced. Either fix them first, mark them `.skip`, or start with CI as informational (no branch protection) until they're fixed.

---

### #33 · feat: Resolution engine  🟡 → closable after #65 merges
**Status:** `lib/ai/resolution-engine.ts` already exists and is wired in by PR #65 (`/advance` calls `runResolutionEngine`). All 3 acceptance criteria met: all plans processed together ✓, EventImpact objects match types ✓, `applyEventEffects` applied ✓.

**Action:** Close after PR #65 merges (or tag as done-by-#65).

---

### #34 · feat: Judge agent  🟡 → closable after #65 merges
**Status:** `lib/ai/judge-evaluator.ts` exists and is wired by PR #65 with retry logic (score < `JUDGE_THRESHOLD` triggers one retry). Acceptance: score 0–100 ✓, retry on low score ✓, scores stored in turn_commits ✓.

**Action:** Close after PR #65 merges.

---

### #35 · feat: Narrator agent  🟡 → closable after #65 merges
**Status:** `lib/ai/narrator.ts` exists; PR #65 calls it and persists `chronicle_headline` + `narrative_entry`. Acceptance: EntryData JSON ✓, stored as turn_commit fields ✓, severity set by AI ✓ (inside narrator).

**Action:** Close after PR #65 merges.

---

### #36 · feat: Game loop controller  🟡 → close after #65 merges
**Status:** Issue calls for `lib/game/game-loop.ts` + route. `lib/game/game-loop.ts` DOES exist but it's about ground-truth state advancement, NOT turn orchestration. PR #65 put the orchestrator in the `/advance` route itself (`runFullPipeline()`). That fulfills every acceptance criterion — Realtime broadcasts, turn_commit creation, DispatchTerminal live progress, turn number increment.

**Divergence from issue:** issue wanted a standalone `lib/game/game-loop.ts` export. PR #65 inlined it.

**Action:** Close with reference to PR #65 commit. If the user wants a pure library-level orchestrator (separable from the route handler), that's a separate refactor — trivially extractable.

---

### #37 · feat: Player turn submission  🟡 → close after #65 merges
**Status:** `hooks/useSubmitTurn.ts` rewritten by PR #65, POSTs to `/advance`, DispatchTerminal shows phases. Acceptance: player selects actions ✓, submit POSTs ✓, DispatchTerminal live updates ✓ (via realtime), chronicle updates ✓.

**Remaining nit:** "SUBMITTING TURN PLAN..." text — the new DispatchTerminal renders "Turn Pipeline" header and "Turn submitted" checklist row. Semantically equivalent.

**Action:** Close after #65 merges.

---

## P1 — Important

### #31 · feat: Iran scenario research pipeline — all 7 stages  🟡 (M)
**Status:** `lib/ai/research-pipeline.ts` exists. Route fragments exist at `app/api/scenarios/[id]/research/{frame, frame/confirm, populate, status}/route.ts` — partial coverage. There's no single `/api/scenarios/[id]/research/route.ts` that invokes all 7 stages.

**Repro:**
```bash
find app/api -path "*research*" -type f    # 4 routes, none unified
```

**Resolution plan:**
1. Create `app/api/scenarios/[id]/research/route.ts` that sequentially invokes all 7 stages from `lib/ai/research-pipeline.ts`.
2. Add storage for each stage output (may already exist in schema — verify).
3. Verify prompt caching markers (`cache_control: { type: 'ephemeral' }`) on stable prompts.
4. Write `tests/api/research-pipeline.test.ts` (exists but fails currently — rewrite).

**Dependencies:** #27 (listed as blocker in issue) — need to verify its state.

---

### #32 · feat: Actor agent prompt caching  🟡 (M)
**Status:** `lib/ai/actor-agent.ts` exists and is used by PR #65. NEUTRALITY_PREAMBLE is injected (per code inspection of `lib/ai/prompts.ts`). **Prompt caching is NOT in place** — `grep -c cache_control lib/ai/actor-agent.ts lib/ai/prompts.ts` returns 0.

**Repro:**
```bash
grep -c cache_control lib/ai/actor-agent.ts lib/ai/prompts.ts
# both return 0 = no caching markers
```

**Resolution plan:**
1. Add `cache_control: { type: 'ephemeral' }` to the stable portion of each actor system prompt (NEUTRALITY_PREAMBLE, actor profile, scenario context).
2. Keep turn-variable content (current state, recent events) OUTSIDE cached blocks.
3. Add a test that calls the agent twice and asserts the second call's `cache_read_input_tokens` > 0.
4. Measure token cost reduction — acceptance criteria says ≥ 60%.

**Effort:** M. This is surgical: ~4 files touched, mostly reordering prompt construction.

---

### #38 · feat: Branch creation  ✅ DONE (verified 2026-04-19)
**Status:** On deeper inspection, `app/api/branches/route.ts` DOES have a full POST handler (fork logic with `parent_branch_id`, `fork_point_commit_id`, `head_commit_id` seeded from parent turn commit). `app/scenarios/[id]/branches/page.tsx` exists (614 lines). "FORK NEW BRANCH →" button wired in GameView. The "Branch creation is not available yet" string in the earlier triage was the `branchError` fallback message shown when a POST fails (not a stale placeholder). PR #67 improved this message. **Close this issue** after verifying a real auth'd session creates a branch end-to-end.

**Repro:**
```bash
grep -n "export async function POST" app/api/branches/route.ts   # no match
```
```bash
# UI repro: navigate to /scenarios/<id>, click "+ Start New Branch" → shows disabled message
```

**Resolution plan:**
1. Add POST handler to `app/api/branches/route.ts`:
   - Validate `scenario_id`, `parent_branch_id`, `fork_point_commit_id`
   - Insert branch row with `is_trunk: false`, `head_commit_id = fork_point_commit_id`
   - Return new branch `{ id, url }`
2. Create `app/scenarios/[id]/branches/page.tsx` listing all branches with fork button.
3. Wire "FORK NEW BRANCH →" button on `/play/<branchId>` to trigger POST + navigate to new branch.

**Depends on:** #36 (pipeline must work so new branches can advance). PR #65 satisfies this.

---

### #40 · feat: Supabase Auth  🟡 (M)
**Status:** Auth pages exist (`app/auth/sign-in/`, `app/auth/sign-up/`, `app/auth/signout/`). Middleware has dev bypass (`middleware.ts:16`). User successfully signed in as `tewari.v` during smoke test, so real auth is partially working.

**Remaining:**
- Acceptance: "Dev bypass still works when `NEXT_PUBLIC_DEV_MODE=true`" ✓ (in middleware)
- Sign-in flow works ✓
- Sign-out works (route exists)
- Unauthed users redirected to /auth/login — verify middleware routes this correctly

**Repro:** clear cookies, navigate to `/scenarios/iran-2026/play/<branchId>` with `NEXT_PUBLIC_DEV_MODE=false` — expect redirect to `/auth/sign-in`.

**Resolution plan:**
1. Test the three flows end-to-end (sign in, sign out, anon redirect).
2. Add proper password-reset flow if missing.
3. Remove dev bypass only when prod is ready (keep for local dev).

**Risk:** turning off dev bypass breaks local dev for anyone without a Supabase account seeded. Keep the bypass behind `NEXT_PUBLIC_DEV_MODE=true` only.

---

### #56 · fix: Error boundaries and blank state handling  🟠 (M)
**Status:** No React error boundary exists. API failures show empty UI (confirmed in smoke test: map tile errors don't surface user-facing message; cities 500 was silent).

**Repro:**
1. Start dev server
2. In browser, DevTools → Network → Block `/api/scenarios/*/branches/*/map-assets`
3. Navigate to /play — map loads blank, no error UI

**Resolution plan:**
1. Create `components/game/GameErrorBoundary.tsx` (class component with `componentDidCatch`).
2. Wrap `GameView` in error boundary.
3. Add empty/error states to `ActorsPanel`, `ChronicleTimeline`, `GameMap`:
   - `actors.length === 0` → "No actor data loaded — refresh or check connection"
   - `chronicle.length === 0` → "No turns yet — submit a decision to begin"
   - Map load errors → overlay banner
4. Distinguish "empty" from "error" — empty is normal on turn 0, error is always worth surfacing.

**Effort:** M. Straightforward but touches 4–5 files.

---

### #58 · feat: Rate limiting + AI cost controls  🟠 (L)
**Status:** No cost tracking. Each `/advance` call invokes 6+ Claude API calls (5 actors, resolution, judge optional retry, narrator). Cost per turn estimated at $0.50–$2.00 by the issue. No budget / per-user quota / request queuing.

**Repro:** submit turns repeatedly — no limit, no cost warning.

**Resolution plan:**
1. **In-memory duplicate-submission guard** — PR #65 already has this (the in-progress check on `turn_commits.current_phase`). ✓
2. **Per-user daily token budget:**
   - New table `user_token_budgets(user_id, day, tokens_used, tokens_limit)` or similar.
   - Update from `message.usage.input_tokens + output_tokens` after each AI call.
   - Reject further turns if budget exceeded (429 with retry-after).
3. **Cost estimate pre-submit:** UI shows "Est. 80k tokens" based on scenario size + catalog size.
4. **Per-branch turn cap:** config value `MAX_TURNS_PER_BRANCH=50`.
5. **Monitoring:** Supabase Log + Vercel dashboard already help; add a cost dashboard if needed.

**Effort:** L. Real work. Depends on AI agents reporting usage (they do via SDK).

---

## Status summary

| Issue | Status | Blocker? | Effort |
|---|---|---|---|
| #31 Research pipeline | 🟡 partial | No | M |
| #32 Actor agent caching | 🟡 partial | No | M |
| #33 Resolution engine | ✅ PR #65 | — | — |
| #34 Judge agent | ✅ PR #65 | — | — |
| #35 Narrator | ✅ PR #65 | — | — |
| #36 Game loop controller | ✅ PR #65 | — | — |
| #37 Player turn submission | ✅ PR #65 | — | — |
| #38 Branch creation | 🔴 outstanding | Yes (#51 Bug 11) | M |
| #40 Supabase Auth | 🟡 partial | No | M |
| #41 GitHub Actions CI | 🟠 outstanding | Polish gate | S |
| #51 11 post-merge bugs | 🟠 outstanding | Yes (P0 bugs block play) | L |
| #52 Multi-actor decisions | 🔴 outstanding | Yes (pipeline functions but only US acts) | L |
| #56 Error boundaries | 🟠 outstanding | No | M |
| #58 Rate limiting | 🟠 outstanding | Cost blocker | L |

---

## Recommended merge/work order after PR #65

1. **Merge PR #65** (enables everything downstream). Post-merge: close #33, #34, #35, #36, #37.
2. **#51** — re-audit the 11 bugs, open micro-PRs for the ones still present. Small effort, big quality gain.
3. **#52** — unblocks meaningful AI turns (currently only US acts). Likely the highest-leverage next feature.
4. **#38** — branch creation. Player engagement blocker — can't explore alternate histories.
5. **#41** — CI. Low-effort, protects everything that follows.
6. **#56** — error boundaries. Protects the playable game from showing blank screens.
7. **#32** — actor agent prompt caching. Cost optimization.
8. **#58** — broader rate limiting. Required before any public/shared use.
9. **#40** — polish real auth (already mostly working).
10. **#31** — unified research pipeline endpoint.

Parallelizable: #41 + #56 + #32 + #40 have no inter-dependencies.
