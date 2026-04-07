-- Actor state snapshot per turn commit per actor
CREATE TABLE actor_state_snapshots (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id              uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  turn_commit_id         uuid NOT NULL REFERENCES turn_commits(id) ON DELETE CASCADE,
  actor_id               text NOT NULL,
  military_strength      numeric NOT NULL CHECK (military_strength BETWEEN 0 AND 100),
  political_stability    numeric NOT NULL CHECK (political_stability BETWEEN 0 AND 100),
  economic_health        numeric NOT NULL CHECK (economic_health BETWEEN 0 AND 100),
  public_support         numeric NOT NULL CHECK (public_support BETWEEN 0 AND 100),
  international_standing numeric NOT NULL CHECK (international_standing BETWEEN 0 AND 100),
  asset_inventory        jsonb NOT NULL DEFAULT '{}',
  global_state           jsonb NOT NULL DEFAULT '{}',
  facility_statuses      jsonb NOT NULL DEFAULT '[]',
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON actor_state_snapshots (branch_id, turn_commit_id, actor_id);

-- Daily depletion rates with effective date ranges
CREATE TABLE daily_depletion_rates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id           uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  actor_id            text NOT NULL,
  asset_type          text NOT NULL,
  rate_per_day        numeric NOT NULL,
  effective_from_date date NOT NULL,
  effective_to_date   date,
  trigger_turn_commit_id    uuid REFERENCES turn_commits(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON daily_depletion_rates (branch_id, actor_id, asset_type, effective_from_date);

-- Threshold triggers — fire forced events when state crosses a value
CREATE TABLE threshold_triggers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  branch_id              uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  trigger_id             text NOT NULL,
  actor_id               text,
  variable_path          text NOT NULL,
  threshold_value        numeric NOT NULL,
  direction              text NOT NULL CHECK (direction IN ('below', 'above')),
  sustained_days         integer NOT NULL DEFAULT 0,
  forced_event_template  jsonb NOT NULL,
  status                 text NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'triggered', 'disarmed')),
  triggered_at_event_id  uuid REFERENCES turn_commits(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON threshold_triggers (branch_id, status);
CREATE UNIQUE INDEX ON threshold_triggers (branch_id, trigger_id);

-- Extend turn_commits with state tracking fields
ALTER TABLE turn_commits
  ADD COLUMN IF NOT EXISTS state_effects               jsonb,
  ADD COLUMN IF NOT EXISTS is_major_decision_node      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decision_node_label         text,
  ADD COLUMN IF NOT EXISTS decision_node_significance  text
    CHECK (decision_node_significance IN ('minor', 'significant', 'pivotal', 'game_changing'));
