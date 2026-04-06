-- supabase/migrations/20260402000000_comprehensive_seed_schema.sql
-- Comprehensive Iran seed schema: new tables + column additions
-- NEVER modify previously committed migrations — only additive changes here.

-- ─────────────────────────────────────────────────────────────────────────────
-- New table: actors
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists actors (
  id                    text        not null,
  scenario_id           uuid        not null references scenarios(id) on delete cascade,
  name                  text        not null,
  short_name            text        not null,
  biographical_summary  text        not null,
  leadership_profile    text        not null,
  win_condition         text        not null,
  strategic_doctrine    text        not null,
  historical_precedents text        not null,
  initial_scores        jsonb       not null default '{}',
  intelligence_profile  jsonb       not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (id, scenario_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- New table: key_figures
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists key_figures (
  id               text        not null,
  scenario_id      uuid        not null references scenarios(id) on delete cascade,
  actor_id         text        not null,
  name             text        not null,
  title            text        not null,
  role             text        not null,
  biography        text        not null,
  motivations      text        not null,
  decision_style   text        not null,
  current_context  text        not null,
  relationships    jsonb,
  provenance       text        not null default 'inferred',
  source_note      text,
  source_date      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (id, scenario_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- New table: actor_capabilities
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists actor_capabilities (
  id                uuid        primary key default gen_random_uuid(),
  scenario_id       uuid        not null references scenarios(id) on delete cascade,
  actor_id          text        not null,
  category          text        not null check (category in ('military', 'diplomatic', 'economic', 'intelligence')),
  name              text        not null,
  description       text        not null,
  quantity          numeric,
  unit              text,
  deployment_status text        not null default 'available'
                                check (deployment_status in ('available', 'partially_deployed', 'degraded')),
  lead_time_days    int,
  political_cost    text,
  temporal_anchor   text        not null default 'January 2026',
  source_url        text,
  source_date       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists actor_capabilities_scenario_actor
  on actor_capabilities (scenario_id, actor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend turn_commits
-- ─────────────────────────────────────────────────────────────────────────────
alter table turn_commits
  add column if not exists full_briefing          text,
  add column if not exists chronicle_headline     text,
  add column if not exists chronicle_entry        text,
  add column if not exists chronicle_date_label   text,
  add column if not exists context_summary        text,
  add column if not exists is_decision_point      boolean not null default false,
  add column if not exists deciding_actor_id      text,
  add column if not exists decision_summary       text,
  add column if not exists decision_alternatives  jsonb,
  add column if not exists escalation_rung_before int,
  add column if not exists escalation_rung_after  int,
  add column if not exists escalation_direction   text
                           check (escalation_direction in ('up', 'down', 'lateral', 'none'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend scenarios
-- ─────────────────────────────────────────────────────────────────────────────
alter table scenarios
  add column if not exists background_context_enriched text,
  add column if not exists scenario_start_date         text,
  add column if not exists ground_truth_through_date   text;
