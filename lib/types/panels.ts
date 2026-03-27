export type Dimension = 'military' | 'economic' | 'diplomatic' | 'intelligence' | 'political' | 'information'
export type EscalationDirection = 'escalate' | 'de-escalate' | 'neutral'

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

export interface ActorSummary {
  id: string
  name: string
  escalationRung: number
}

export interface ActorDetail {
  id: string
  name: string
  escalationRung: number
  briefing: string
  militaryStrength: number
  economicStrength: number
  politicalStability: number
  objectives: string[]
}
