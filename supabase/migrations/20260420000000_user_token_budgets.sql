-- Per-user daily token budget tracking.
-- Supports issue #58 rate limiting. One row per user per UTC day.

CREATE TABLE IF NOT EXISTS user_token_budgets (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  tokens_limit BIGINT NOT NULL DEFAULT 2000000,
  turns_completed INT NOT NULL DEFAULT 0,
  turns_limit INT NOT NULL DEFAULT 50,
  last_turn_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_user_token_budgets_day ON user_token_budgets(day);

-- Reuse the shared update_updated_at() function defined in the initial schema migration.
DROP TRIGGER IF EXISTS trg_user_token_budgets_updated_at ON user_token_budgets;
CREATE TRIGGER trg_user_token_budgets_updated_at
BEFORE UPDATE ON user_token_budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: users can read their own row
ALTER TABLE user_token_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_token_budgets_select_own ON user_token_budgets
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy — writes go through service role only.
