// lib/ai/cached-responses.ts
import Anthropic from '@anthropic-ai/sdk'
import type { CachedResponse, Actor, Decision } from '@/lib/types/simulation'

const client = new Anthropic()

interface AlternateResponseRaw {
  decisionName: string
  description: string
  rationale: string
  escalationDirection: CachedResponse['escalationDirection']
}

export async function generateCachedResponses(
  reactingActor: Actor,
  triggeringEvents: Array<{ name: string }>,
  primaryResponse: Decision
): Promise<CachedResponse[]> {
  const eventSummary = triggeringEvents.map(e => e.name).join(', ')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are generating alternate strategic responses for ${reactingActor.name} in a geopolitical simulation.
Generate 2 alternate responses (NOT including the primary response already chosen) that ${reactingActor.name} could plausibly take.
Each must be strategically rational from ${reactingActor.name}'s perspective given their objectives.
Return JSON: { "alternates": [{ "decisionName": string, "description": string, "rationale": string, "escalationDirection": "up"|"down"|"lateral"|"none" }] }`,
    messages: [{
      role: 'user',
      content: `Triggering events: ${eventSummary}
Primary response already chosen: ${primaryResponse.name ?? primaryResponse.id}
Generate 2 alternate responses.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text) as { alternates: AlternateResponseRaw[] }

  return parsed.alternates.map((alt, i): CachedResponse => ({
    actorId: reactingActor.id,
    decision: {
      id: `cached-alt-${reactingActor.id}-${i}`,
      name: alt.decisionName,
      description: alt.description,
      dimension: 'military',
      escalationLevel: 0,
      expectedOutcomes: [],
      requiredAssets: [],
      assetTransitions: [],
    },
    rationale: alt.rationale,
    escalationDirection: alt.escalationDirection,
    cachedAt: new Date().toISOString(),
  }))
}
