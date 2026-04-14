import type { AssetRequirement } from './simulation'

export type Dimension = 'military' | 'economic' | 'diplomatic' | 'intelligence' | 'political' | 'information'
export type EscalationDirection = 'escalate' | 'de-escalate' | 'neutral'
export type RelationshipStance = 'ally' | 'adversary' | 'neutral' | 'proxy' | 'rival'

export interface DecisionOption {
  id: string
  title: string
  dimension: Dimension
  escalationDirection: EscalationDirection
  resourceWeight: number
  /**
   * Optional asset prerequisites — when present, this decision is only available
   * if all requirements are satisfied against the current asset inventory.
   * Used by detectConstraintCascades to identify newly-unlocked decisions
   * after each turn's state resolution.
   */
  requiredAssets?: AssetRequirement[]
}

export interface CompatibilityRule {
  decisionId: string
  decisionTitle: string
  compatible: boolean
}

export interface DecisionDetail {
  id: string
  title: string
  dimension: Dimension
  escalationDirection: EscalationDirection
  resourceWeight: number
  strategicRationale: string
  expectedOutcomes?: string
  concurrencyRules: CompatibilityRule[]
}

export interface ActionSlot {
  id: string
  title: string
  dimension: Dimension
}

export interface EscalationRungSummary {
  level: number
  name: string
  description: string
  reversibility: 'easy' | 'moderate' | 'difficult' | 'irreversible'
  isBlocked?: boolean
  blockReason?: string
}

export interface ActorSummary {
  id: string
  name: string
  shortName: string
  actorColor: string
  escalationRung: number
  escalationRungName: string
  primaryObjective: string
  relationshipStance: RelationshipStance
}

export interface ActorDetail {
  id: string
  name: string
  shortName: string
  actorColor: string
  escalationRung: number
  escalationRungName: string
  briefing: string
  militaryStrength: number
  economicStrength: number
  politicalStability: number
  objectives: string[]
  primaryObjective: string
  leadershipProfile?: string
  strategicDoctrine?: string
  historicalPrecedents?: string
  winCondition?: string
  /**
   * Whether this actor is viewed as an adversary by the viewing actor.
   * Triggers full fog-of-war redaction on intel fields.
   */
  isAdversary: boolean
  /**
   * Whether the viewer has limited (but not zero) intelligence on this actor.
   * Triggers partial uncertainty labels (rivals, neutrals).
   */
  hasLimitedIntel?: boolean
  /** Actor ID of the viewing player (defaults to 'us') */
  viewerActorId?: string
  relationshipStance: RelationshipStance
  escalationRungs: EscalationRungSummary[]
  intelligenceProfile?: Record<string, unknown>
  /** Recent chronicle entries mentioning this actor, from most recent first */
  recentHistory?: string[]
  /**
   * Known intelligence gaps about this actor from the viewer's perspective.
   * Parsed from the viewer actor's intelligence_profile.blindSpots array.
   * Mirrors knownUnknowns on IntelligencePicture in the simulation engine.
   */
  knownUnknowns?: string[]
  /**
   * Intel confidence tier for this actor from the viewer's perspective.
   * Derived by fow-panel.ts from the viewer's intelligence capability profile
   * and the relationship stance.
   */
  intelConfidence?: 'high' | 'moderate' | 'low' | 'unverified'
}
