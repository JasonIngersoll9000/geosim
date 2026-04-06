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

export interface EscalationData {
  rung_before: number
  rung_after: number
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
  escalationRung: number
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
