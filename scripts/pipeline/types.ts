// scripts/pipeline/types.ts
// Shared types for the Iran seed enrichment pipeline.

export interface TimelineEvent {
  id: string
  timestamp: string // ISO date: YYYY-MM-DD
  timestamp_confidence: "exact" | "approximate" | "period"
  title: string
  description: string
  actors_involved: string[]
  dimension: "military" | "diplomatic" | "economic" | "intelligence"
  is_decision: boolean
  deciding_actor?: string
  escalation_direction: "up" | "down" | "lateral" | "none"
  source_excerpt: string
  exclude?: boolean
  _duplicateOf?: string
}

export interface ActorPerspectives {
  united_states?: string
  iran?: string
  israel?: string
  russia?: string
  china?: string
  gulf_states?: string
}

export interface FullBriefing {
  situation: string
  actor_perspectives: ActorPerspectives
  context: string
}

export interface ChronicleData {
  headline: string
  date_label: string
  entry: string
}

export interface DecisionAlternativeRaw {
  label: string
  description: string
  escalation_direction: "up" | "down" | "lateral" | "none"
  escalation_level: number
  why_not_chosen: string
}

export interface DecisionAnalysisRaw {
  is_decision_point: boolean
  deciding_actor_id?: string
  decision_summary?: string
  alternatives?: DecisionAlternativeRaw[]
}

export interface ActorEscalationPosition {
  rung: number        // 0-20, anchored to framework levels
  level: number       // 0-7 macro level
  level_name: string  // e.g. "Limited Overt Military Operations"
  criteria_rationale: string  // which criteria drove this scoring
}

export interface PerceivedPosition {
  estimated_rung: number
  confidence: "confirmed" | "high" | "moderate" | "low"
  rationale: string  // what intel/fog-of-war basis this estimate rests on
}

export interface DyadState {
  highest_threshold_crossed: string | null  // threshold ID, null if none yet
  thresholds_intact: string[]               // threshold IDs not yet crossed
  escalation_asymmetry: number              // actor_a.rung - actor_b.rung
  last_crossing_event_id: string | null
}

export interface EscalationData {
  // Layer 1: each actor's own position (from their own doctrine perspective)
  by_actor: Record<string, ActorEscalationPosition>
  // Layer 2: each actor's perceived position of each other actor (fog of war)
  // key format: "{observer}_perceives_{subject}" e.g. "iran_perceives_us"
  perceived: Record<string, PerceivedPosition>
  // Layer 3: relationship-level threshold state per dyad
  dyads: Record<string, DyadState>
  // Global ceiling — highest rung any actor has reached in this conflict
  global_ceiling: number
  // Net direction of this event across all actors
  direction: "up" | "down" | "lateral" | "none"
}

export interface EnrichedEvent extends TimelineEvent {
  full_briefing: FullBriefing
  chronicle: ChronicleData
  context_summary: string
  decision_analysis: DecisionAnalysisRaw
  escalation: EscalationData
}

export interface ActorInitialScores {
  militaryStrength: number
  politicalStability: number
  economicHealth: number
  publicSupport: number
  internationalStanding: number
  // Per-actor initial escalation position (scored against framework)
  escalationRung: number      // 0-20
  escalationLevel: number     // 0-7 macro level
  escalationLevelName: string
}

export interface ActorIntelProfile {
  signalCapability: number
  humanCapability: number
  cyberCapability: number
  blindSpots: string[]
  intelSharingPartners: string[]
}

export interface ActorProfile {
  id: string
  name: string
  short_name: string
  biographical_summary: string
  leadership_profile: string
  win_condition: string
  strategic_doctrine: string
  historical_precedents: string
  initial_scores: ActorInitialScores
  intelligence_profile: ActorIntelProfile
}

export interface KeyFigureRelationship {
  figureId: string
  actorId: string
  description: string
  influence_direction: string
  dynamic: string
  documented_instances: string[]
  override_condition?: string
}

export interface KeyFigureProfile {
  id: string
  actor_id: string
  name: string
  title: string
  role: string
  biography: string
  motivations: string
  decision_style: string
  current_context: string
  relationships: KeyFigureRelationship[] | null
  provenance: "verified" | "inferred"
  source_note?: string
  source_date?: string
}

export interface RawCapability {
  category: "military" | "diplomatic" | "economic" | "intelligence"
  name: string
  description: string
  quantity?: number
  unit?: string
  deployment_status: "available" | "partially_deployed" | "degraded"
  lead_time_days?: number
  political_cost?: string
  temporal_anchor: string
  source?: string
  actor?: string
}

export interface DuplicateCandidate {
  ids: string[]
  reason: "same_id" | "same_timestamp_and_title"
}

export interface DeduplicationResult {
  events: TimelineEvent[]
  duplicates: DuplicateCandidate[]
}

// ─── Gap-fill research output ────────────────────────────────────────────────

export interface GapFillData {
  as_of_date: string
  sources_summary: string
  asset_inventory: Record<string, ActorAssetInventory>     // keyed by actor_id
  depletion_rates: Record<string, ActorDepletionRates>     // keyed by actor_id
  infrastructure_status: FacilityStatus[]
  global_variable_timeline: GlobalVariablePoint[]
  casualties: Record<string, CasualtyData>                 // keyed by actor_id
  political_indicators: PoliticalIndicators
}

export interface ActorAssetInventory {
  [asset_type: string]: {
    estimated_remaining: number
    unit: string
    confidence: "high" | "medium" | "low"
    notes: string
  }
}

export type ActorDepletionRates = Record<string, DepletionPeriod[]>

export interface DepletionPeriod {
  rate_per_day: number        // negative = consumption/destruction
  effective_from: string      // ISO date YYYY-MM-DD
  effective_to?: string       // undefined = currently active
  notes: string
}

export interface FacilityStatus {
  facility_id: string
  name: string
  actor_id: string
  facility_type: "nuclear" | "oil_gas" | "military_base" | "port" | "power_grid" | "civilian"
  status: "operational" | "degraded" | "destroyed"
  capacity_pct: number        // 0–100
  lat: number
  lng: number
  strike_date?: string
  notes: string
}

export interface GlobalVariablePoint {
  date: string
  oil_price_usd: number
  hormuz_throughput_pct: number  // % of pre-war normal traffic
  global_economic_stress: number // 0–100
  notes: string
}

export interface CasualtyData {
  military_cumulative: number
  civilian_cumulative: number
  as_of_date: string
  confidence: "high" | "medium" | "low"
}

export interface PoliticalIndicators {
  us_approval_pct: number
  us_congressional_status: string
  iran_domestic_status: string
  nato_cohesion: string
  as_of_date: string
}

// ─── State effects per event ─────────────────────────────────────────────────

export interface StateEffectsFile {
  _meta: { generated: string; events_processed: number }
  baseline_depletion_rates: Record<string, ActorDepletionRates>
  events: EventStateEffects[]
}

export interface EventStateEffects {
  event_id: string
  timestamp: string
  is_decision_revised: boolean
  deciding_actor_revised?: string
  actor_deltas: Record<string, ActorStateDelta>
  asset_changes: AssetChange[]
  global_updates: Partial<GlobalVariablePoint>
  depletion_rate_changes: DepletionRateChange[]
  decision_nodes: DecisionNodeFlag[]
  confidence: "high" | "medium" | "low"
}

export interface ActorStateDelta {
  military_strength: number     // -100 to +100, additive
  political_stability: number
  economic_health: number
  public_support: number
  international_standing: number
  rationale: string
}

export interface AssetChange {
  actor_id: string
  asset_type: string
  quantity_delta: number
  facility_id?: string
  new_status?: "operational" | "degraded" | "destroyed"
  new_capacity_pct?: number
  notes: string
}

export interface DepletionRateChange {
  actor_id: string
  asset_type: string
  new_rate_per_day: number
  reason: string
}

export interface DecisionNodeFlag {
  is_major_decision_node: boolean
  label?: string
  significance: "minor" | "significant" | "pivotal" | "game_changing"
}

// ─── Cumulative state snapshots ───────────────────────────────────────────────

export interface ActorStateSnapshot {
  actor_id: string
  military_strength: number
  political_stability: number
  economic_health: number
  public_support: number
  international_standing: number
  asset_inventory: Record<string, number>  // asset_type → current count
}

export interface TurnStateSnapshot {
  event_id: string
  timestamp: string
  actor_states: Record<string, ActorStateSnapshot>
  global_state: {
    oil_price_usd: number
    hormuz_throughput_pct: number
    global_economic_stress: number
  }
  facility_statuses: FacilityStatus[]
  active_depletion_rates: Record<string, ActorDepletionRates>
}

export interface StateSnapshotsFile {
  _meta: { generated: string }
  initial_state: Record<string, ActorStateSnapshot>
  snapshots: TurnStateSnapshot[]
}
