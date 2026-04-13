export type Dimension = 'military' | 'economic' | 'diplomatic' | 'intelligence' | 'political' | 'information'
export type EscalationDirection = 'escalate' | 'de-escalate' | 'neutral'
export type RelationshipStance = 'ally' | 'adversary' | 'neutral' | 'proxy' | 'rival'

export interface DecisionOption {
  id: string
  title: string
  dimension: Dimension
  escalationDirection: EscalationDirection
  resourceWeight: number
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
  /** Whether this actor is viewed as an adversary by the player — triggers FOW labels */
  isAdversary: boolean
  relationshipStance: RelationshipStance
  escalationRungs: EscalationRungSummary[]
  intelligenceProfile?: Record<string, unknown>
}
