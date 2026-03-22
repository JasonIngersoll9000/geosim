import type {
  Actor,
  Event,
  Scenario,
  IntelligencePicture,
  Relationship,
  ActiveOperation,
} from '../types/simulation'

// ------------------------------------------------------------
// FOG OF WAR CONTEXT
// What a specific actor knows and believes — filtered view of
// the omniscient scenario state. Never expose unknownUnknowns
// to actor agents; those are engine/omniscient-only.
// ------------------------------------------------------------

export interface FogOfWarContext {
  actor: Actor
  myIntelligencePicture: IntelligencePicture[]
  myRelationships: Relationship[]
  knownEvents: Event[]
  ongoingOperations: ActiveOperation[]
  // Collected from intelligencePicture.unknownUnknowns — for engine/omniscient view only,
  // never passed to actor AI agents
  unknownUnknownsForEngine: {
    actorId: string
    aboutActorId: string
    items: string[]
  }[]
}

/**
 * Determine whether an actor would know about a given event.
 *
 * An actor knows about an event if:
 * 1. They initiated it
 * 2. They were directly targeted
 * 3. It was a major/critical public event (visible to all)
 * 4. The event initiator is one of this actor's intel-sharing partners
 */
export function actorWouldKnowAbout(
  actor: Actor,
  event: Event,
  scenario: Scenario
): boolean {
  // 1. Actor initiated the event
  if (event.initiatedBy === actor.id) return true

  // 2. Actor was directly targeted
  if (event.targetedActors.includes(actor.id)) return true

  // 3. Major or critical public event — visible to all actors
  if (event.impacts.some(i => i.magnitude === 'critical' || i.magnitude === 'major')) return true

  // 4. Event initiator is an intel-sharing partner of this actor
  const intelPartnerIds = actor.state.intelligence.intelSharingPartners.map(p => p.actorId)
  if (intelPartnerIds.includes(event.initiatedBy)) return true

  return false
}

/**
 * Build the fog-of-war context for a specific actor.
 * Returns what the actor knows and believes — NOT the omniscient truth.
 *
 * Key design: myIntelligencePicture carries believedX fields (what the
 * actor thinks is true), while unknownUnknownsForEngine holds what the
 * actor is wrong about but doesn't realize — never surfaced to the actor.
 */
export function buildFogOfWarContext(actor: Actor, scenario: Scenario): FogOfWarContext {
  const knownEvents = scenario.eventHistory.filter(e =>
    actorWouldKnowAbout(actor, e, scenario)
  )

  const myRelationships = scenario.relationships.filter(
    r => r.actorA === actor.id || r.actorB === actor.id
  )

  // Collect unknown unknowns for the engine — these must NOT be passed to actor AI
  const unknownUnknownsForEngine = actor.intelligencePicture
    .filter(p => p.unknownUnknowns.length > 0)
    .map(p => ({
      actorId: actor.id,
      aboutActorId: p.aboutActorId,
      items: p.unknownUnknowns,
    }))

  return {
    actor,
    myIntelligencePicture: actor.intelligencePicture,
    myRelationships,
    knownEvents,
    ongoingOperations: actor.state.military.activeOperations,
    unknownUnknownsForEngine,
  }
}
