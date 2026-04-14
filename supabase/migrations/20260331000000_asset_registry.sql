-- supabase/migrations/20260331000000_asset_registry.sql

-- ── asset_registry ────────────────────────────────────────────────────────────
CREATE TABLE asset_registry (
  id              TEXT NOT NULL,
  scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  actor_id        TEXT NOT NULL,
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  category        TEXT NOT NULL,
  asset_type      TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  zone            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available',
  capabilities    JSONB NOT NULL DEFAULT '[]',
  strike_range_nm INTEGER,
  threat_range_nm INTEGER,
  provenance      TEXT NOT NULL DEFAULT 'inferred',
  effective_from  DATE NOT NULL,
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  researched_at   TIMESTAMPTZ,
  source_url      TEXT,
  source_date     DATE,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, scenario_id)
);

ALTER TABLE asset_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_registry_select" ON asset_registry FOR SELECT USING (true);
CREATE POLICY "asset_registry_service" ON asset_registry FOR ALL USING (auth.role() = 'service_role');

-- ── asset_research_log ────────────────────────────────────────────────────────
CREATE TYPE research_log_status AS ENUM (
  'pending', 'running', 'awaiting_approval', 'approved', 'rejected'
);

CREATE TABLE asset_research_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id      UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  status           research_log_status NOT NULL DEFAULT 'pending',
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  last_researched_at TIMESTAMPTZ,
  proposed_changes JSONB NOT NULL DEFAULT '[]',
  summary          TEXT NOT NULL DEFAULT '',
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE asset_research_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "research_log_select" ON asset_research_log FOR SELECT USING (true);
CREATE POLICY "research_log_service" ON asset_research_log FOR ALL USING (auth.role() = 'service_role');

-- ── city_registry ─────────────────────────────────────────────────────────────
CREATE TABLE city_registry (
  id              TEXT NOT NULL,
  scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  country         TEXT NOT NULL,
  population      INTEGER,
  economic_role   TEXT,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  zone            TEXT NOT NULL,
  infrastructure_nodes JSONB NOT NULL DEFAULT '[]',
  war_impacts     JSONB NOT NULL DEFAULT '[]',
  provenance      TEXT NOT NULL DEFAULT 'inferred',
  source_url      TEXT,
  source_date     DATE,
  researched_at   TIMESTAMPTZ,
  PRIMARY KEY (id, scenario_id)
);

ALTER TABLE city_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city_registry_select" ON city_registry FOR SELECT USING (true);
CREATE POLICY "city_registry_service" ON city_registry FOR ALL USING (auth.role() = 'service_role');

-- ── turn_commits additions ─────────────────────────────────────────────────────
ALTER TABLE turn_commits ADD COLUMN IF NOT EXISTS turn_date DATE;
ALTER TABLE turn_commits ADD COLUMN IF NOT EXISTS actor_snapshots JSONB NOT NULL DEFAULT '[]';
ALTER TABLE turn_commits ADD COLUMN IF NOT EXISTS city_state_deltas JSONB NOT NULL DEFAULT '[]';

-- ── actors additions ──────────────────────────────────────────────────────────
ALTER TABLE actors ADD COLUMN IF NOT EXISTS source_url TEXT;
