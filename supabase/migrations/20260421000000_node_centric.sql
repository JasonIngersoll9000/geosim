-- branches.decision_key: identifies which (actor, action) created this branch.
-- Format: "{actorId}::{primaryActionId}" e.g. "us::launch_airstrikes"
-- Null for trunk branches and branches created before this migration.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS decision_key VARCHAR(255);

-- Index for fast deduplication lookup in POST /api/nodes/[commitId]/fork
CREATE INDEX IF NOT EXISTS idx_branches_fork_decision
  ON branches(fork_point_commit_id, decision_key)
  WHERE decision_key IS NOT NULL;

-- turn_commits.decision_options_cache: stores AI-generated decision options per actor.
-- Format: { "us": [DecisionOption, ...], "iran": [...] }
-- Null until a player first requests options at this node.
ALTER TABLE turn_commits
  ADD COLUMN IF NOT EXISTS decision_options_cache JSONB;
