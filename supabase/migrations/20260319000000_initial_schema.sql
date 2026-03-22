-- ============================================================
-- GEOSIM DATABASE SCHEMA
-- Supabase (PostgreSQL) with Row Level Security
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

create type user_role as enum ('player', 'observer', 'creator', 'admin');
create type game_mode as enum ('observer', 'single_actor', 'free_roam');
create type scenario_category as enum (
  'geopolitical_conflict',
  'economic_competition',
  'political_campaign',
  'business_strategy',
  'public_policy',
  'historical_counterfactual',
  'custom'
);
create type scenario_visibility as enum ('private', 'public');
create type branch_status as enum ('active', 'archived', 'completed');
create type turn_phase as enum ('planning', 'resolution', 'reaction', 'judging', 'complete');
create type actor_controller as enum ('user', 'ai');

-- ------------------------------------------------------------
-- USERS & AUTH
-- Supabase Auth handles the auth itself; this extends it
-- with app-specific profile data.
-- ------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  role user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SCENARIOS
-- A scenario is the top-level container. It defines the
-- conflict/competition being simulated and holds metadata.
-- The actual state lives in branches and commits.
-- ------------------------------------------------------------

create table scenarios (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category scenario_category not null default 'custom',
  visibility scenario_visibility not null default 'private',
  created_by uuid not null references profiles(id),
  
  -- the scenario frame from Stage 0
  scenario_frame jsonb not null default '{}',
  
  -- configurable dimensions for this scenario
  -- e.g. ["military","economic","political","diplomatic","intelligence","cultural"]
  dimensions text[] not null default '{"military","economic","political","diplomatic","intelligence","cultural"}',
  
  -- the ground truth trunk branch id (null until trunk is created)
  trunk_branch_id uuid,
  
  -- scenario phases (e.g. Twelve-Day War, Interwar, Operation Epic Fury)
  phases jsonb not null default '[]',
  current_phase_id text,
  
  -- critical diplomatic/historical context that all agents need
  -- e.g. "strikes came 1 day after diplomatic breakthrough"
  critical_context text,
  
  -- community metadata
  tags text[] not null default '{}',
  total_branches int not null default 0,
  total_plays int not null default 0,
  rating numeric(3,2) default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- BRANCHES
-- Git-like branches. Each branch is a sequence of turn commits
-- that diverge from a parent branch at a specific commit.
-- ------------------------------------------------------------

create table branches (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  parent_branch_id uuid references branches(id),
  fork_point_commit_id uuid,  -- references turn_commits(id), added after table exists
  
  name text not null,
  description text,
  status branch_status not null default 'active',
  
  -- is this the ground truth trunk?
  is_trunk boolean not null default false,
  
  -- who created this branch
  created_by uuid not null references profiles(id),
  visibility scenario_visibility not null default 'private',
  
  -- the latest commit on this branch
  head_commit_id uuid,  -- references turn_commits(id), added after table exists
  
  -- game configuration for this branch
  game_mode game_mode not null default 'observer',
  turn_timeframe text not null default '1 week',
  
  -- which actors the user controls (empty = all AI / observer)
  user_controlled_actors text[] not null default '{}',
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- add foreign key for scenario trunk
alter table scenarios
  add constraint fk_trunk_branch
  foreign key (trunk_branch_id) references branches(id);

-- ------------------------------------------------------------
-- TURN COMMITS
-- Immutable records of resolved turns. The core unit of the
-- git-like branching model. Once created, never modified.
-- ------------------------------------------------------------

create table turn_commits (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid not null references branches(id) on delete cascade,
  parent_commit_id uuid references turn_commits(id),
  turn_number int not null,
  simulated_date text not null,  -- the in-game date this turn represents
  
  -- full scenario state at START of this turn
  -- this is the expensive field — full actor states, relationships, etc.
  scenario_snapshot jsonb not null,
  
  -- resolved turn data (immutable once computed)
  planning_phase jsonb,     -- decisions made by all actors
  resolution_phase jsonb,   -- resolved events, state updates
  reaction_phase jsonb,     -- reaction decisions and resolution
  judging_phase jsonb,      -- judge scores and feedback
  
  -- the narrative chronicle entry for this turn
  narrative_entry text,
  
  -- turn phase tracking (for in-progress turns)
  current_phase turn_phase not null default 'planning',
  
  -- is this a ground truth commit (real-world verified)?
  is_ground_truth boolean not null default false,
  
  -- metadata
  compute_cost_tokens int,  -- total API tokens used
  computed_at timestamptz not null default now(),
  
  constraint unique_turn_per_branch unique (branch_id, turn_number)
);

-- add foreign keys that reference turn_commits
alter table branches
  add constraint fk_fork_point
  foreign key (fork_point_commit_id) references turn_commits(id);

alter table branches
  add constraint fk_head_commit
  foreign key (head_commit_id) references turn_commits(id);

-- ------------------------------------------------------------
-- ACTORS (per scenario)
-- Actor definitions live at the scenario level.
-- Actor STATE lives inside turn_commit.scenario_snapshot.
-- This table holds the static profile + config.
-- ------------------------------------------------------------

create table actors (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  actor_id text not null,  -- the snake_case id used in the data model (e.g. "united_states")
  
  name text not null,
  actor_type text not null,  -- "nation_state", "non_state_actor", etc.
  description text,
  
  -- the full actor profile from the research pipeline (Stage 1)
  -- includes key figures, government type, etc.
  profile jsonb not null default '{}',
  
  -- the actor's escalation ladder definition (Stage 5)
  escalation_ladder jsonb not null default '{}',
  
  -- the actor framing from Stage 0
  stakes_level text,      -- "existential", "critical", "important", "opportunistic"
  win_condition text,
  lose_condition text,
  strategic_posture text,
  
  -- agent configuration
  agent_system_prompt text,  -- the customized system prompt for this actor's AI agent
  
  created_at timestamptz not null default now(),
  
  constraint unique_actor_per_scenario unique (scenario_id, actor_id)
);

-- ------------------------------------------------------------
-- RELATIONSHIPS (per scenario)
-- Static relationship definitions. Relationship STATE changes
-- are tracked in turn commits.
-- ------------------------------------------------------------

create table relationships (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  actor_a text not null,  -- actor_id
  actor_b text not null,  -- actor_id
  
  -- baseline relationship from research pipeline (Stage 3)
  baseline jsonb not null default '{}',
  
  created_at timestamptz not null default now(),
  
  constraint unique_relationship unique (scenario_id, actor_a, actor_b)
);

-- ------------------------------------------------------------
-- EVENTS (per scenario, for the ground truth timeline)
-- The researched event history from Stage 4.
-- In-game events are stored inside turn_commits.
-- ------------------------------------------------------------

create table events (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  event_id text not null,  -- e.g. "evt_fordow_strike"
  
  -- the full event data from Stage 4
  event_data jsonb not null,
  
  -- ordering
  event_timestamp text not null,
  sequence_number int not null,
  
  created_at timestamptz not null default now(),
  
  constraint unique_event unique (scenario_id, event_id)
);

-- ------------------------------------------------------------
-- EVAL METRICS
-- Historical evaluation data for the judge system.
-- One row per turn commit that has been judged.
-- ------------------------------------------------------------

create table eval_metrics (
  id uuid primary key default uuid_generate_v4(),
  turn_commit_id uuid not null references turn_commits(id) on delete cascade,
  scenario_id uuid not null references scenarios(id),
  branch_id uuid not null references branches(id),
  
  -- judge scores
  plausibility int,
  consistency int,
  proportionality int,
  rationality int,
  cascade_logic int,
  overall_score numeric(5,2),
  
  -- detailed feedback
  issues jsonb default '[]',
  missed_effects jsonb default '[]',
  historical_comparisons jsonb default '[]',
  
  -- bias tracking
  outcome_favored_actor text,  -- which actor benefited most this turn
  
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SCENARIO RATINGS & COMMUNITY
-- ------------------------------------------------------------

create table scenario_ratings (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  user_id uuid not null references profiles(id),
  rating int not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamptz not null default now(),
  
  constraint one_rating_per_user unique (scenario_id, user_id)
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index idx_scenarios_visibility on scenarios(visibility) where visibility = 'public';
create index idx_scenarios_category on scenarios(category);
create index idx_scenarios_created_by on scenarios(created_by);
create index idx_branches_scenario on branches(scenario_id);
create index idx_branches_created_by on branches(created_by);
create index idx_turn_commits_branch on turn_commits(branch_id);
create index idx_turn_commits_parent on turn_commits(parent_commit_id);
create index idx_actors_scenario on actors(scenario_id);
create index idx_eval_metrics_scenario on eval_metrics(scenario_id);
create index idx_eval_metrics_branch on eval_metrics(branch_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles enable row level security;
alter table scenarios enable row level security;
alter table branches enable row level security;
alter table turn_commits enable row level security;
alter table actors enable row level security;
alter table relationships enable row level security;
alter table events enable row level security;
alter table eval_metrics enable row level security;
alter table scenario_ratings enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Scenarios: public scenarios readable by all, private only by creator
create policy "scenarios_read_public" on scenarios for select
  using (visibility = 'public' or created_by = auth.uid());
create policy "scenarios_insert" on scenarios for insert
  with check (created_by = auth.uid());
create policy "scenarios_update" on scenarios for update
  using (created_by = auth.uid());
create policy "scenarios_delete" on scenarios for delete
  using (created_by = auth.uid());

-- Branches: readable if scenario is accessible, writable by creator
create policy "branches_read" on branches for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from scenarios s
      where s.id = branches.scenario_id
      and (s.visibility = 'public' or s.created_by = auth.uid())
    )
  );
create policy "branches_insert" on branches for insert
  with check (created_by = auth.uid());
create policy "branches_update" on branches for update
  using (created_by = auth.uid());

-- Turn commits: readable if branch is accessible
create policy "commits_read" on turn_commits for select
  using (
    exists (
      select 1 from branches b
      where b.id = turn_commits.branch_id
      and (
        b.created_by = auth.uid()
        or exists (
          select 1 from scenarios s
          where s.id = b.scenario_id
          and (s.visibility = 'public' or s.created_by = auth.uid())
        )
      )
    )
  );
create policy "commits_insert" on turn_commits for insert
  with check (
    exists (
      select 1 from branches b
      where b.id = turn_commits.branch_id
      and b.created_by = auth.uid()
    )
  );

-- Actors, relationships, events: readable if scenario is accessible
create policy "actors_read" on actors for select
  using (
    exists (
      select 1 from scenarios s
      where s.id = actors.scenario_id
      and (s.visibility = 'public' or s.created_by = auth.uid())
    )
  );
create policy "actors_manage" on actors for all
  using (
    exists (
      select 1 from scenarios s
      where s.id = actors.scenario_id
      and s.created_by = auth.uid()
    )
  );

create policy "relationships_read" on relationships for select
  using (
    exists (
      select 1 from scenarios s
      where s.id = relationships.scenario_id
      and (s.visibility = 'public' or s.created_by = auth.uid())
    )
  );
create policy "relationships_manage" on relationships for all
  using (
    exists (
      select 1 from scenarios s
      where s.id = relationships.scenario_id
      and s.created_by = auth.uid()
    )
  );

create policy "events_read" on events for select
  using (
    exists (
      select 1 from scenarios s
      where s.id = events.scenario_id
      and (s.visibility = 'public' or s.created_by = auth.uid())
    )
  );
create policy "events_manage" on events for all
  using (
    exists (
      select 1 from scenarios s
      where s.id = events.scenario_id
      and s.created_by = auth.uid()
    )
  );

-- Eval metrics: readable if branch is accessible
create policy "eval_read" on eval_metrics for select
  using (
    exists (
      select 1 from branches b
      where b.id = eval_metrics.branch_id
      and (
        b.created_by = auth.uid()
        or exists (
          select 1 from scenarios s
          where s.id = b.scenario_id
          and (s.visibility = 'public' or s.created_by = auth.uid())
        )
      )
    )
  );

-- Ratings: all public, insert/update by user
create policy "ratings_read" on scenario_ratings for select using (true);
create policy "ratings_insert" on scenario_ratings for insert
  with check (user_id = auth.uid());
create policy "ratings_update" on scenario_ratings for update
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger scenarios_updated_at before update on scenarios
  for each row execute function update_updated_at();
create trigger branches_updated_at before update on branches
  for each row execute function update_updated_at();

-- increment scenario branch count when a branch is created
create or replace function increment_branch_count()
returns trigger as $$
begin
  update scenarios set total_branches = total_branches + 1
  where id = new.scenario_id;
  return new;
end;
$$ language plpgsql;

create trigger branch_created after insert on branches
  for each row execute function increment_branch_count();

-- update scenario rating average when a rating is added/changed
create or replace function update_scenario_rating()
returns trigger as $$
begin
  update scenarios set rating = (
    select coalesce(avg(rating), 0) from scenario_ratings
    where scenario_id = coalesce(new.scenario_id, old.scenario_id)
  )
  where id = coalesce(new.scenario_id, old.scenario_id);
  return new;
end;
$$ language plpgsql;

create trigger rating_changed after insert or update or delete on scenario_ratings
  for each row execute function update_scenario_rating();
