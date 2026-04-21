import { callClaude } from '@/lib/ai/anthropic'
import { buildCachedSystemBlocks } from '@/lib/ai/prompts'
import { getStateAtTurn } from '@/lib/game/state-engine'
import type { BranchStateAtTurn } from '@/lib/types/simulation'

export type DecisionOptionCategory =
  | 'military' | 'diplomatic' | 'economic' | 'intelligence' | 'information'

export type DecisionOption = {
  id: string
  label: string
  description: string
  category: DecisionOptionCategory
  prerequisites_met: boolean
  effectiveness_note?: string
  escalation_delta: number
  // Populated by the route handler (not the AI function) from child branch data:
  already_explored?: boolean
  existing_branch_id?: string
}

type ActorProfileInput = {
  id: string
  name: string
  short_name: string
  biographical_summary: string
  win_condition: string
  strategic_doctrine: string
  leadership_profile: string
  historical_precedents: string
  initial_scores: Record<string, number>
}

const DECISION_GENERATOR_ROLE = `NEUTRALITY PREAMBLE: You are a geopolitical strategy advisor. You must model every actor's strategy with equal rigor. No protagonist bias. Asymmetric strategies are as valid as conventional ones.

ROLE: You are a geopolitical strategy advisor generating contextually grounded decision options for a specific actor.

Your options must:
- Reflect the actor's actual assets and force readiness at this moment in the simulation
- Span a range of escalation levels — not all options should be high-escalation
- Include diplomatic, economic, and intelligence options alongside military ones
- Be achievable given the actor's current posture and resource state
- Set prerequisites_met: false for options requiring assets that are below threshold

OUTPUT FORMAT — return ONLY this JSON, no markdown:
{
  "options": [
    {
      "id": "snake_case_slug",
      "label": "Short action title (max 6 words)",
      "description": "2-3 sentence explanation of what this action does and its strategic purpose.",
      "category": "military|diplomatic|economic|intelligence|information",
      "prerequisites_met": true,
      "effectiveness_note": "Only include if prerequisites_met is false — explain what is lacking.",
      "escalation_delta": 0
    }
  ]
}`

const DECISION_GENERATOR_SYSTEM = buildCachedSystemBlocks(DECISION_GENERATOR_ROLE)

/**
 * Generate 6–8 contextually grounded decision options for an actor at a specific node.
 * Options are grounded in the actual game state (asset readiness, escalation rung, etc.).
 *
 * This function is called lazily — only when a player first requests options for a
 * (commitId, actorId) pair. Results are cached by the route handler.
 */
export async function generateDecisionOptions(
  commitId: string,
  branchId: string,
  actorId: string,
  opts: { actorProfile: ActorProfileInput },
): Promise<DecisionOption[]> {
  const state = await getStateAtTurn(branchId, commitId) as BranchStateAtTurn

  const actorState = state.actor_states[actorId]
  // escalation_rung is not a typed field on LiveActorState; fall back to actor profile's initial value
  const actorStateRaw = actorState as (typeof actorState & { escalation_rung?: number }) | undefined
  const escalationRung = actorStateRaw?.escalation_rung ?? (opts.actorProfile.initial_scores.escalation_rung ?? 1)

  // Summarise facility statuses for this actor — highlight degraded/destroyed assets
  const actorFacilities = state.facility_statuses.filter(f => f.actor_id === actorId)
  const facilitySummary = actorFacilities.length > 0
    ? actorFacilities.map(f => `- ${f.name} (${f.type}): ${f.status}, ${f.capacity_pct}% capacity`).join('\n')
    : '(No facilities tracked for this actor)'

  const userPrompt = `ACTOR: ${opts.actorProfile.name} (${opts.actorProfile.short_name})
Current escalation rung: ${escalationRung}
Strategic doctrine: ${opts.actorProfile.strategic_doctrine}
Win condition: ${opts.actorProfile.win_condition}

CURRENT ASSET STATUS:
${facilitySummary}

GLOBAL STATE:
- Economic stress: ${state.global_state.global_economic_stress}%
- Hormuz throughput: ${state.global_state.hormuz_throughput_pct}%
- Simulated date: ${state.as_of_date}

Generate 6–8 decision options for ${opts.actorProfile.name}. Ensure options reflect what is realistically achievable given the asset status above. Set prerequisites_met: false for any option requiring assets currently below 30% capacity.`

  const raw = await callClaude('', userPrompt, {
    maxTokens: 2048,
    systemBlocks: DECISION_GENERATOR_SYSTEM,
  })

  const parsed = raw as { options?: DecisionOption[] }
  return (parsed.options ?? []).slice(0, 8)
}
