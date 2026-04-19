/**
 * cost-tracker.ts
 *
 * Per-user daily token budget tracking for issue #58 rate limiting.
 * All writes use the service-role client to bypass RLS.
 * Skips all work in NEXT_PUBLIC_DEV_MODE=true.
 */

import { createServiceClient } from '@/lib/supabase/service'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BudgetStatus {
  allowed: boolean
  reason?: 'tokens_exceeded' | 'turns_exceeded' | 'concurrent_turn' | 'auth_required'
  tokensUsed: number
  tokensLimit: number
  turnsCompleted: number
  turnsLimit: number
  lastTurnStartedAt: string | null
}

export interface Usage {
  input_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  output_tokens: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** UTC date string for today, e.g. "2026-04-20" */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** True when running in dev-mode bypass — no budget checks or DB writes. */
function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true'
}

/** Unlimited (bypass) sentinel value */
const UNLIMITED = -1

/** Concurrent-turn window in milliseconds */
const CONCURRENT_WINDOW_MS = 60_000

/** Default row values used when creating a budget row for the first time */
const DEFAULT_TOKENS_LIMIT = 2_000_000
const DEFAULT_TURNS_LIMIT = 50

/** Shape of a row from user_token_budgets */
interface BudgetRow {
  user_id: string
  day: string
  tokens_used: number
  tokens_limit: number
  turns_completed: number
  turns_limit: number
  last_turn_started_at: string | null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a user is allowed to start a new turn.
 * Creates a default budget row on first call for the day.
 *
 * Returns allowed=true in dev mode or when the relevant limit is -1.
 */
export async function checkBudget(userId: string): Promise<BudgetStatus> {
  if (isDevMode()) {
    return devModeStatus()
  }

  const supabase = createServiceClient()
  const day = today()

  // Upsert a default row if none exists (first call of the day).
  const { error: upsertError } = await supabase
    .from('user_token_budgets')
    .upsert(
      {
        user_id: userId,
        day,
        tokens_used: 0,
        tokens_limit: DEFAULT_TOKENS_LIMIT,
        turns_completed: 0,
        turns_limit: DEFAULT_TURNS_LIMIT,
        last_turn_started_at: null,
      },
      { onConflict: 'user_id,day', ignoreDuplicates: true }
    )

  if (upsertError) {
    throw new Error(`cost-tracker upsert failed: ${upsertError.message}`)
  }

  // Read back the current row.
  const { data, error: selectError } = await supabase
    .from('user_token_budgets')
    .select(
      'user_id,day,tokens_used,tokens_limit,turns_completed,turns_limit,last_turn_started_at'
    )
    .eq('user_id', userId)
    .eq('day', day)
    .single<BudgetRow>()

  if (selectError || !data) {
    throw new Error(`cost-tracker read failed: ${selectError?.message ?? 'no row'}`)
  }

  return evaluate(data)
}

/**
 * Increment tokens_used for the user's current-day budget.
 * Totals all token fields from the usage object.
 * No-op in dev mode.
 */
export async function recordTokens(userId: string, usage: Usage): Promise<void> {
  if (isDevMode()) return

  const delta =
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    usage.output_tokens

  const supabase = createServiceClient()
  const day = today()

  const { error } = await supabase.rpc('increment_tokens_used', {
    p_user_id: userId,
    p_day: day,
    p_delta: delta,
  })

  if (error) {
    // Fallback: use a read-modify-write if the RPC doesn't exist yet.
    // This is safe for low-concurrency scenarios; high-concurrency is handled
    // by the Postgres RPC with row-level locking (PR 2).
    const { data: row } = await supabase
      .from('user_token_budgets')
      .select('tokens_used')
      .eq('user_id', userId)
      .eq('day', day)
      .single<Pick<BudgetRow, 'tokens_used'>>()

    const current = row?.tokens_used ?? 0
    await supabase
      .from('user_token_budgets')
      .update({ tokens_used: current + delta })
      .eq('user_id', userId)
      .eq('day', day)
  }
}

/**
 * Atomically increment turns_completed by 1 for the user's current-day budget.
 * No-op in dev mode.
 */
export async function incrementTurn(userId: string): Promise<void> {
  if (isDevMode()) return

  const supabase = createServiceClient()
  const day = today()

  const { error } = await supabase.rpc('increment_turns_completed', {
    p_user_id: userId,
    p_day: day,
  })

  if (error) {
    // Fallback: read-modify-write (low-concurrency safe).
    const { data: row } = await supabase
      .from('user_token_budgets')
      .select('turns_completed')
      .eq('user_id', userId)
      .eq('day', day)
      .single<Pick<BudgetRow, 'turns_completed'>>()

    const current = row?.turns_completed ?? 0
    await supabase
      .from('user_token_budgets')
      .update({ turns_completed: current + 1 })
      .eq('user_id', userId)
      .eq('day', day)
  }
}

/**
 * Set last_turn_started_at to now for the user's current-day budget.
 * Used to detect concurrent turn submissions.
 * No-op in dev mode.
 */
export async function markTurnStarted(userId: string): Promise<void> {
  if (isDevMode()) return

  const supabase = createServiceClient()
  const day = today()

  const { error } = await supabase
    .from('user_token_budgets')
    .update({ last_turn_started_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('day', day)

  if (error) {
    throw new Error(`cost-tracker markTurnStarted failed: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function evaluate(row: BudgetRow): BudgetStatus {
  const base: Omit<BudgetStatus, 'allowed' | 'reason'> = {
    tokensUsed: row.tokens_used,
    tokensLimit: row.tokens_limit,
    turnsCompleted: row.turns_completed,
    turnsLimit: row.turns_limit,
    lastTurnStartedAt: row.last_turn_started_at,
  }

  // Admin bypass: limit of -1 means unlimited.
  if (row.tokens_limit === UNLIMITED && row.turns_limit === UNLIMITED) {
    return { allowed: true, ...base }
  }

  // Tokens check (skip if unlimited).
  if (row.tokens_limit !== UNLIMITED && row.tokens_used >= row.tokens_limit) {
    return { allowed: false, reason: 'tokens_exceeded', ...base }
  }

  // Turns check (skip if unlimited).
  if (row.turns_limit !== UNLIMITED && row.turns_completed >= row.turns_limit) {
    return { allowed: false, reason: 'turns_exceeded', ...base }
  }

  // Concurrent-turn check: last_turn_started_at within 60 s.
  if (row.last_turn_started_at !== null) {
    const elapsed = Date.now() - new Date(row.last_turn_started_at).getTime()
    if (elapsed < CONCURRENT_WINDOW_MS) {
      return { allowed: false, reason: 'concurrent_turn', ...base }
    }
  }

  return { allowed: true, ...base }
}

function devModeStatus(): BudgetStatus {
  return {
    allowed: true,
    tokensUsed: 0,
    tokensLimit: UNLIMITED,
    turnsCompleted: 0,
    turnsLimit: UNLIMITED,
    lastTurnStartedAt: null,
  }
}
