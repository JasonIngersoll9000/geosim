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
