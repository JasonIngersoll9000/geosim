/**
 * Actor Agent Runner
 * Generates a TurnPlan for a specific actor given their fog-of-war context
 * and the available decision catalog.
 */

import { callClaude } from '@/lib/ai/anthropic'
import {
  buildCachedSystemBlocks,
  buildActorProfileBlock,
  buildLiveScoreBlock,
  buildGlobalStateBlock,
  buildDecisionListBlock,
} from '@/lib/ai/prompts'
import { buildStateContextBlock } from '@/lib/ai/actor-agent'
import type { TurnPlan, BranchStateAtTurn, Decision } from '@/lib/types/simulation'

export interface ActorAgentInput {
  actorId: string
  actorProfile: {
    id: string
    name: string
    short_name: string
    biographical_summary: string
    leadership_profile: string
    win_condition: string
    strategic_doctrine: string
    historical_precedents: string
    initial_scores: Record<string, number>
    intelligence_profile?: Record<string, unknown>
  }
  branchState: BranchStateAtTurn
  availableDecisions: Decision[]
  /** Turns since branch diverged from ground truth trunk. 0 = on trunk. */
  branchDivergence: number
  simulatedDate: string
  turnNumber: number
}

export interface ActorAgentOutput {
  actorId: string
  turnPlan: TurnPlan
  rationale: string
}

/**
 * Stable role text for the actor agent — does NOT include NEUTRALITY_PREAMBLE
 * (that is block 1 in buildCachedSystemBlocks). Must never contain per-turn data.
 */
const ACTOR_AGENT_ROLE_TEXT = `ROLE: You are the strategic decision-making agent for a specific actor in the simulation.
Your job is to select the BEST turn plan from available decisions, reasoning from the actor's
own strategic perspective, objectives, and constraints.

DECISION RULES:
- Select a primary action (required) and 0-3 concurrent actions.
- Resource allocations must sum to exactly 100%.
- Primary action should receive ≥50% of resources unless very strong tactical reason.
- Never select actions that require EXHAUSTED assets.
- Flag actions requiring CONSTRAINED assets as high-risk.
- Choose the lowest escalation level that achieves strategic goals.

OUTPUT FORMAT — return ONLY this JSON:
{
  "primaryActionDecisionId": string,
  "primaryActionProfile": string | null,
  "primaryActionResourcePercent": number,
  "concurrentActions": [
    {
      "decisionId": string,
      "selectedProfile": string | null,
      "resourcePercent": number
    }
  ],
  "rationale": string  // 2-3 sentences explaining the strategic logic
}`

const ACTOR_AGENT_SYSTEM_BLOCKS = buildCachedSystemBlocks(ACTOR_AGENT_ROLE_TEXT)

export async function runActorAgent(input: ActorAgentInput): Promise<ActorAgentOutput> {
  const {
    actorId,
    actorProfile,
    branchState,
    availableDecisions,
    branchDivergence,
    simulatedDate,
    turnNumber,
  } = input

  const profileBlock = buildActorProfileBlock(actorProfile)
  const actorState = branchState.actor_states[actorId]
  const stateBlock = actorState
    ? buildLiveScoreBlock(actorId, actorState)
    : `(No live state found for actor ${actorId})`
  const stateContextBlock = buildStateContextBlock(actorId, branchState)
  const globalBlock = buildGlobalStateBlock(branchState.global_state)
  const decisionsBlock = buildDecisionListBlock(availableDecisions)

  const divergenceNote =
    branchDivergence === 0
      ? 'This is the ground truth trunk — ground your decisions in verified real-world intelligence.'
      : branchDivergence < 4
      ? `Branch diverged ${branchDivergence} turn(s) from ground truth — blend research with strategic reasoning.`
      : `Branch diverged ${branchDivergence} turns from ground truth — rely on strategic logic; do not reference specific real-world events.`

  const userPrompt = `SIMULATION CONTEXT:
Turn ${turnNumber} | Simulated date: ${simulatedDate}
${divergenceNote}

${profileBlock}

${stateBlock}

${stateContextBlock}

${globalBlock}

AVAILABLE DECISIONS (choose your turn plan from these):
${decisionsBlock}

Select your turn plan. Return the JSON specified in your instructions.`

  const raw = await callClaude('', userPrompt, {
    maxTokens: 2048,
    systemBlocks: ACTOR_AGENT_SYSTEM_BLOCKS,
  })

  const parsed = raw as {
    primaryActionDecisionId: string
    primaryActionProfile: string | null
    primaryActionResourcePercent: number
    concurrentActions: Array<{
      decisionId: string
      selectedProfile: string | null
      resourcePercent: number
    }>
    rationale: string
  }

  const turnPlan: TurnPlan = {
    actorId,
    primaryAction: {
      decisionId: parsed.primaryActionDecisionId,
      selectedProfile: parsed.primaryActionProfile ?? null,
      resourcePercent: parsed.primaryActionResourcePercent,
    },
    concurrentActions: (parsed.concurrentActions ?? []).slice(0, 3).map(ca => ({
      decisionId: ca.decisionId,
      selectedProfile: ca.selectedProfile ?? null,
      resourcePercent: ca.resourcePercent,
    })),
  }

  return {
    actorId,
    turnPlan,
    rationale: parsed.rationale ?? '',
  }
}
