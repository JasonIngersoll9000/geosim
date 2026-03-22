-- Add current_divergence to branches
-- Tracks how many turns since this branch diverged from the ground truth trunk.
-- 0 = on trunk, computed and updated by the game loop controller each turn.
alter table branches
  add column current_divergence integer not null default 0;

-- Add cache_key and reuse_count to turn_commits
-- cache_key: SHA-256 of parentCommitId + sorted actor decisions
-- reuse_count: how many branches reference this commit (for cost tracking)
alter table turn_commits
  add column cache_key text,
  add column reuse_count integer not null default 0;

-- Index for fast cache lookups (only index non-null cache_keys)
create index idx_turn_commits_cache_key
  on turn_commits(cache_key)
  where cache_key is not null;
