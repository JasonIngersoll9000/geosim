// ============================================================
// DATABASE TYPES — matches the Supabase schema exactly
// For simulation-layer types (Actor, Scenario, etc.) see simulation.ts
// ============================================================

// ------------------------------------------------------------
// ENUMS (mirror the PostgreSQL enum types)
// ------------------------------------------------------------

export type UserRole = "player" | "observer" | "creator" | "admin";
export type GameMode = "observer" | "single_actor" | "free_roam";
export type ScenarioCategory =
  | "geopolitical_conflict"
  | "economic_competition"
  | "political_campaign"
  | "business_strategy"
  | "public_policy"
  | "historical_counterfactual"
  | "custom";
export type ScenarioVisibility = "private" | "public";
export type BranchStatus = "active" | "archived" | "completed";
export type TurnPhase =
  | "planning"
  | "resolution"
  | "reaction"
  | "judging"
  | "complete";
export type ActorController = "user" | "ai";

// ------------------------------------------------------------
// ROW TYPES (what Supabase returns on SELECT)
// ------------------------------------------------------------

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ScenarioRow {
  id: string;
  name: string;
  description: string | null;
  category: ScenarioCategory;
  visibility: ScenarioVisibility;
  created_by: string;
  scenario_frame: Record<string, unknown>;
  dimensions: string[];
  trunk_branch_id: string | null;
  phases: unknown[];
  current_phase_id: string | null;
  critical_context: string | null;
  tags: string[];
  total_branches: number;
  total_plays: number;
  rating: number | null;
  created_at: string;
  updated_at: string;
  background_context_enriched: string | null;
  scenario_start_date: string | null;
  ground_truth_through_date: string | null;
}

export interface BranchRow {
  id: string;
  scenario_id: string;
  parent_branch_id: string | null;
  fork_point_commit_id: string | null;
  name: string;
  description: string | null;
  status: BranchStatus;
  is_trunk: boolean;
  created_by: string;
  visibility: ScenarioVisibility;
  head_commit_id: string | null;
  game_mode: GameMode;
  turn_timeframe: string;
  user_controlled_actors: string[];
  current_divergence: number;
  created_at: string;
  updated_at: string;
}

export interface TurnCommitRow {
  id: string;
  branch_id: string;
  parent_commit_id: string | null;
  turn_number: number;
  simulated_date: string;
  scenario_snapshot: Record<string, unknown>;
  planning_phase: Record<string, unknown> | null;
  resolution_phase: Record<string, unknown> | null;
  reaction_phase: Record<string, unknown> | null;
  judging_phase: Record<string, unknown> | null;
  narrative_entry: string | null;
  current_phase: TurnPhase;
  is_ground_truth: boolean;
  compute_cost_tokens: number | null;
  cache_key: string | null;
  reuse_count: number;
  computed_at: string;
  // Enriched content fields (populated by enrich-timeline.ts pipeline)
  full_briefing: string | null;
  chronicle_headline: string | null;
  chronicle_entry: string | null;
  chronicle_date_label: string | null;
  context_summary: string | null;
  is_decision_point: boolean;
  deciding_actor_id: string | null;
  decision_summary: string | null;
  decision_alternatives: Record<string, unknown> | null;
  escalation_rung_before: number | null;
  escalation_rung_after: number | null;
  escalation_direction: 'up' | 'down' | 'lateral' | 'none' | null;
}

export interface ActorRow {
  id: string;
  scenario_id: string;
  actor_id: string;
  name: string;
  actor_type: string;
  description: string | null;
  profile: Record<string, unknown>;
  escalation_ladder: Record<string, unknown>;
  stakes_level: string | null;
  win_condition: string | null;
  lose_condition: string | null;
  strategic_posture: string | null;
  agent_system_prompt: string | null;
  created_at: string;
}

export interface RelationshipRow {
  id: string;
  scenario_id: string;
  actor_a: string;
  actor_b: string;
  baseline: Record<string, unknown>;
  created_at: string;
}

export interface EventRow {
  id: string;
  scenario_id: string;
  event_id: string;
  event_data: Record<string, unknown>;
  event_timestamp: string;
  sequence_number: number;
  created_at: string;
}

export interface EvalMetricRow {
  id: string;
  turn_commit_id: string;
  scenario_id: string;
  branch_id: string;
  plausibility: number | null;
  consistency: number | null;
  proportionality: number | null;
  rationality: number | null;
  cascade_logic: number | null;
  overall_score: number | null;
  issues: unknown[];
  missed_effects: unknown[];
  historical_comparisons: unknown[];
  outcome_favored_actor: string | null;
  created_at: string;
}

export interface ScenarioRatingRow {
  id: string;
  scenario_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive seed tables
// ─────────────────────────────────────────────────────────────────────────────

export interface ActorTableRow {
  id: string;
  scenario_id: string;
  name: string;
  short_name: string;
  biographical_summary: string;
  leadership_profile: string;
  win_condition: string;
  strategic_doctrine: string;
  historical_precedents: string;
  initial_scores: Record<string, unknown>;
  intelligence_profile: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KeyFigureRow {
  id: string;
  scenario_id: string;
  actor_id: string;
  name: string;
  title: string;
  role: string;
  biography: string;
  motivations: string;
  decision_style: string;
  current_context: string;
  relationships: Record<string, unknown> | null;
  provenance: string;
  source_note: string | null;
  source_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActorCapabilityRow {
  id: string;
  scenario_id: string;
  actor_id: string;
  category: 'military' | 'diplomatic' | 'economic' | 'intelligence';
  name: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  deployment_status: 'available' | 'partially_deployed' | 'degraded';
  lead_time_days: number | null;
  political_cost: string | null;
  temporal_anchor: string;
  source_url: string | null;
  source_date: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// INSERT TYPES (omit auto-generated fields)
// ------------------------------------------------------------

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at"> &
  Partial<Pick<ProfileRow, "created_at" | "updated_at">>;

export type ScenarioInsert = Omit<
  ScenarioRow,
  "id" | "total_branches" | "total_plays" | "rating" | "created_at" | "updated_at"
> & Partial<Pick<ScenarioRow, "id" | "rating" | "created_at" | "updated_at">>;

export type BranchInsert = Omit<BranchRow, "id" | "current_divergence" | "created_at" | "updated_at"> &
  Partial<Pick<BranchRow, "id" | "current_divergence" | "created_at" | "updated_at">>;

export type TurnCommitInsert = Omit<TurnCommitRow, "id" | "cache_key" | "reuse_count" | "computed_at"> &
  Partial<Pick<TurnCommitRow, "id" | "cache_key" | "reuse_count" | "computed_at">>;

export type ActorInsert = Omit<ActorRow, "id" | "created_at"> &
  Partial<Pick<ActorRow, "id" | "created_at">>;

export type RelationshipInsert = Omit<RelationshipRow, "id" | "created_at"> &
  Partial<Pick<RelationshipRow, "id" | "created_at">>;

export type EventInsert = Omit<EventRow, "id" | "created_at"> &
  Partial<Pick<EventRow, "id" | "created_at">>;

export type EvalMetricInsert = Omit<EvalMetricRow, "id" | "created_at"> &
  Partial<Pick<EvalMetricRow, "id" | "created_at">>;

export type ScenarioRatingInsert = Omit<ScenarioRatingRow, "id" | "created_at"> &
  Partial<Pick<ScenarioRatingRow, "id" | "created_at">>;

export type ActorTableInsert = Omit<ActorTableRow, 'created_at' | 'updated_at'> &
  Partial<Pick<ActorTableRow, 'created_at' | 'updated_at'>>;

export type KeyFigureInsert = Omit<KeyFigureRow, 'created_at' | 'updated_at'> &
  Partial<Pick<KeyFigureRow, 'created_at' | 'updated_at'>>;

export type ActorCapabilityInsert = Omit<ActorCapabilityRow, 'id' | 'created_at' | 'updated_at'> &
  Partial<Pick<ActorCapabilityRow, 'id' | 'created_at' | 'updated_at'>>;

// ------------------------------------------------------------
// UPDATE TYPES (all fields optional except id)
// ------------------------------------------------------------

export type ScenarioUpdate = Partial<Omit<ScenarioRow, "id">> & { id: string };
export type BranchUpdate = Partial<Omit<BranchRow, "id">> & { id: string };
export type ActorUpdate = Partial<Omit<ActorRow, "id">> & { id: string };

export type ActorTableUpdate = Partial<Omit<ActorTableRow, 'id' | 'scenario_id'>> & { id: string; scenario_id: string };
export type KeyFigureUpdate = Partial<Omit<KeyFigureRow, 'id' | 'scenario_id'>> & { id: string; scenario_id: string };
export type ActorCapabilityUpdate = Partial<Omit<ActorCapabilityRow, 'id'>> & { id: string };

// ------------------------------------------------------------
// SUPABASE DATABASE TYPE (for typed client)
// ------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileRow>;
      };
      scenarios: {
        Row: ScenarioRow;
        Insert: ScenarioInsert;
        Update: ScenarioUpdate;
      };
      branches: {
        Row: BranchRow;
        Insert: BranchInsert;
        Update: BranchUpdate;
      };
      turn_commits: {
        Row: TurnCommitRow;
        Insert: TurnCommitInsert;
        Update: Partial<TurnCommitRow>;
      };
      actors: {
        Row: ActorRow;
        Insert: ActorInsert;
        Update: ActorUpdate;
      };
      relationships: {
        Row: RelationshipRow;
        Insert: RelationshipInsert;
        Update: Partial<RelationshipRow>;
      };
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: Partial<EventRow>;
      };
      eval_metrics: {
        Row: EvalMetricRow;
        Insert: EvalMetricInsert;
        Update: Partial<EvalMetricRow>;
      };
      scenario_ratings: {
        Row: ScenarioRatingRow;
        Insert: ScenarioRatingInsert;
        Update: Partial<ScenarioRatingRow>;
      };
    };
    Enums: {
      user_role: UserRole;
      game_mode: GameMode;
      scenario_category: ScenarioCategory;
      scenario_visibility: ScenarioVisibility;
      branch_status: BranchStatus;
      turn_phase: TurnPhase;
      actor_controller: ActorController;
    };
  };
}
