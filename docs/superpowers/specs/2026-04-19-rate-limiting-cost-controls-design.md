# Rate Limiting & AI Cost Controls — Design Spec

**Issue:** #58
**Status:** Draft for user review
**Author:** Claude (auto-mode)
**Date:** 2026-04-19

## Problem

Each `/advance` call triggers 6+ Claude API calls today (5 non-player actor agents + resolution + judge + optional retry + narrator). With PR #65's pipeline live and #52's multi-actor catalogs landed, a full turn costs roughly **$0.50–$2.00** (varies with prompt size + caching hit rate). Without controls:

- A user can burn $100+ of API budget in a single session by auto-advancing 50 turns
- Concurrent turn submissions stack and compound the cost
- No per-user visibility or cap
- No pre-turn cost estimate so users can't make informed decisions

PR #65 already includes:
- ✅ **Duplicate-submission guard** (`turn_commits.current_phase` check with 5-min stale override)
- ✅ **Instant response + background pipeline** (so hitting submit twice doesn't rerun)

Still missing: budget, estimate, cap.

## Scope

Four levers, in decreasing order of impact:

1. **Per-user daily token budget** — hard cap, stored in Supabase, resets daily at UTC midnight
2. **Per-branch turn cap** — config value, prevents runaway auto-advance loops
3. **Cost estimate UI** — shown before submit so users can cancel expensive turns
4. **Request queuing** — only one in-flight turn per user globally (not just per-branch)

**Non-goals** (explicit):
- No per-scenario budget (too fine-grained; users can create infinite scenarios)
- No tiered subscription logic (single-tier for MVP)
- No post-hoc refunds (token estimates are lower bounds; actual cost may exceed)
- No real-time streaming cost display during a turn (end-of-turn actual is sufficient)

## Design decisions

### D1 — Storage: new Supabase table `user_token_budgets`

Schema:
```sql
CREATE TABLE user_token_budgets (
  user_id UUID REFERENCES auth.users(id),
  day DATE NOT NULL,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  tokens_limit BIGINT NOT NULL DEFAULT 2000000,  -- 2M tokens/day ≈ $10 at Sonnet pricing
  turns_completed INT NOT NULL DEFAULT 0,
  turns_limit INT NOT NULL DEFAULT 50,
  last_turn_started_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, day)
);

CREATE INDEX idx_user_token_budgets_day ON user_token_budgets(day);
```

**Why this shape:**
- Composite PK (user_id, day) → upsert-friendly, one row per user per day
- `tokens_limit` default 2M = ~$10/day at Sonnet 4.6 output pricing ($5/MTok)
- `turns_limit` default 50 = complements token limit (e.g. runaway retry storm could exhaust tokens fast; turn count catches that separately)
- `last_turn_started_at` enables the queuing/concurrency check (no new turn within N seconds of last start)

**Migration file:** `supabase/migrations/20260420000000_user_token_budgets.sql`

### D2 — Cost tracking: new module `lib/ai/cost-tracker.ts`

```ts
export async function checkBudget(userId: string): Promise<BudgetStatus>
export async function recordTokens(userId: string, usage: Usage): Promise<void>
export async function incrementTurn(userId: string): Promise<void>

interface BudgetStatus {
  allowed: boolean
  reason?: 'tokens_exceeded' | 'turns_exceeded' | 'concurrent_turn' | 'auth_required'
  tokensUsed: number
  tokensLimit: number
  turnsCompleted: number
  turnsLimit: number
}

interface Usage {
  input_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  output_tokens: number
}
```

- `checkBudget` reads current day's row, creates default if absent
- `recordTokens` upserts usage after each AI call — integrated into `callClaude` in `lib/ai/anthropic.ts`
- `incrementTurn` called once per successful pipeline completion
- All three skip work entirely if `NEXT_PUBLIC_DEV_MODE=true` (so local dev is unbounded)

**Why not check budget upfront with estimate?** Because estimates drift by 30%+ depending on which decisions actors pick, how many retries judge forces, etc. Better: hard-stop at actual consumption, not projected.

### D3 — Budget check in `/advance` route

In `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts`:

Before firing the background pipeline, after auth, add:
```ts
const budget = await checkBudget(user.id)
if (!budget.allowed) {
  return NextResponse.json({
    error: `Budget exceeded: ${budget.reason}`,
    ...budget,
  }, { status: 429 })
}
```

Inside `runFullPipeline` (the background), after each AI call, call `recordTokens(userId, message.usage)`. At the end, call `incrementTurn(userId)`.

### D4 — Cost estimate UI

**Client-side pre-submit estimate** in `TurnPlanBuilder`. Not an exact number — a rough range based on:
- Number of AI actors in catalog (5)
- Retry probability (assume 1.2× by default)
- Narrator output size (fixed ~8k tokens)
- Player concurrent action count (affects judge complexity)

Rough formula (tunable):
```ts
function estimateTokens(actorCount: number, concurrentActions: number): { low: number; high: number } {
  const basePerActor = 3000       // actor agent
  const resolutionTokens = 4000
  const judgeTokens = 2500 * 1.2  // retry factor
  const narratorTokens = 8000

  const total = (actorCount * basePerActor) + resolutionTokens + judgeTokens + narratorTokens
  const totalWithConcurrent = total + (concurrentActions * 500)  // each concurrent = slightly longer plans

  return { low: Math.round(totalWithConcurrent * 0.8), high: Math.round(totalWithConcurrent * 1.5) }
}
```

Displayed as `EST. 24k–45k tokens (~$0.15)` below the submit button. No precise dollar figure — just order of magnitude.

**GET endpoint** `app/api/me/budget/route.ts` returns the user's current day budget status; `TurnPlanBuilder` fetches it and shows:
- If `allowed: true` and estimate fits in remaining: green
- If estimate exceeds remaining: yellow warning "This turn may exceed today's budget"
- If `allowed: false`: red block + disable submit

### D5 — Per-user concurrency lock

Within the existing duplicate-submission check in `/advance`, also check `last_turn_started_at` in `user_token_budgets`. If it was set less than 60 seconds ago AND no terminal phase reached, return 429.

This handles the case where a user has multiple browser tabs open and hits submit in each. The per-branch duplicate check doesn't catch this because each tab may be on a different branch.

### D6 — Admin override

A `tokens_limit` or `turns_limit` of `-1` means unlimited (admin bypass). Not exposed via UI — set manually via SQL. Useful for:
- Load testing
- Demo accounts
- Debugging cost spikes

## Implementation plan (5 PRs, total effort ~L)

### PR 1 — DB migration + cost-tracker module (S)
- `supabase/migrations/20260420000000_user_token_budgets.sql`
- `lib/ai/cost-tracker.ts` — `checkBudget`, `recordTokens`, `incrementTurn`
- `tests/ai/cost-tracker.test.ts` — mocked Supabase client tests
- No route integration yet; module is standalone

### PR 2 — Integrate into `callClaude` + `/advance` (M)
- `lib/ai/anthropic.ts`: pass `userId` option, call `recordTokens` after each API response
- `app/api/scenarios/[id]/branches/[branchId]/advance/route.ts`: call `checkBudget` before background pipeline; call `incrementTurn` at pipeline completion
- Update existing `/advance` tests for new 429 path
- All AI agent runners (actor-agent-runner, resolution-engine, judge-evaluator, narrator): thread `userId` through

### PR 3 — Budget GET endpoint + UI (M)
- `app/api/me/budget/route.ts`: GET returns today's `BudgetStatus`
- `components/panels/TurnPlanBuilder.tsx`: fetch budget, compute estimate, render banner
- `lib/ai/cost-estimator.ts`: the estimate formula (testable separately)

### PR 4 — Concurrent-turn lock (S)
- Extend `checkBudget` to include `last_turn_started_at` check
- Set it in `/advance` at pipeline start, clear at completion
- 429 on concurrent attempt

### PR 5 — Admin bypass docs + default tuning (XS)
- README snippet on how to set `-1` limits via SQL
- Tune the default budgets based on typical run observed in staging (after PRs 1–4 land)

## Open decisions (flagged)

1. **Default daily budget of 2M tokens / $10 — is this right?** Arbitrary starting point. Should be informed by actual cost per turn after #52 + #70 prompt caching are live.

2. **Reset at UTC midnight vs rolling 24h window?** UTC midnight is simpler and predictable. Rolling window is fairer but requires per-request window computation. **Recommend UTC for MVP.**

3. **Do we track cost per scenario/branch separately?** Not in this design. If needed, add `scenario_id` column later. YAGNI for MVP.

4. **When a user hits the budget, what happens to an in-flight turn?** Current design: pipeline completes even if budget is exceeded mid-turn (tokens are recorded but turn isn't blocked mid-way). Next turn would be blocked. Alternative: abort mid-pipeline. **Recommend complete-in-flight** — cleaner UX and mid-pipeline abort is complex.

5. **Should we show exact dollar estimate or token-only?** Dollar estimate is more intuitive but ties us to Claude pricing which changes. **Recommend token-only with a footnote "approx. $X at current Sonnet rates".**

6. **Free-tier vs paid-tier?** Not addressed. Single-tier for now.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Token accounting drifts from actual billing | Record each API call's `usage` field verbatim; reconcile via Anthropic billing dashboard monthly |
| User experience degrades (blocked from playing) | Generous defaults (2M tokens = 20+ turns), clear error message, admin bypass for legitimate edge cases |
| Race between concurrent calls updating `tokens_used` | Use Postgres row-level lock (`SELECT ... FOR UPDATE`) in `recordTokens`; brief contention is fine |
| Cost estimate widely off | Show range, not point; tune formula quarterly based on actual data |

## What this design does NOT solve

- Denial-of-service / abuse (handled at network layer — Vercel / Cloudflare rate limiting)
- Malicious users bypassing client-side checks (server-side budget check is authoritative)
- Anthropic API outages affecting our cost accounting (out of scope)
