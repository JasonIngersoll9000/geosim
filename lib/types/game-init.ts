// lib/types/game-init.ts
import type { ActorSummary, ActorDetail, DecisionOption, DecisionDetail } from './panels'
import type { BranchStateAtTurn } from './simulation'

export interface ChronicleEntry {
  turnNumber: number
  date: string
  title: string
  narrative: string
  severity: 'critical' | 'major' | 'moderate' | 'minor'
  tags: string[]
  detail?: string
  dateLabel?: string
  contextSummary?: string
  isDecisionPoint?: boolean
}

export interface GroundTruthCommit {
  id: string
  turnNumber: number
  simulatedDate: string
  narrativeEntry: string | null
}

export interface GameInitialData {
  scenario: {
    id: string
    name: string
    classification: string
  }
  branch: {
    id: string
    name: string
    isTrunk: boolean
    headCommitId: string | null
    turnNumber: number
  }
  actors: ActorSummary[]
  actorDetails: Record<string, ActorDetail>
  decisions: DecisionOption[]
  decisionDetails: Record<string, DecisionDetail>
  chronicle: ChronicleEntry[]
  groundTruthBranchId: string
  groundTruthCommits: GroundTruthCommit[]
  /** The current BranchStateAtTurn — used for map-assets API and actor score display */
  currentState: BranchStateAtTurn | null
}
