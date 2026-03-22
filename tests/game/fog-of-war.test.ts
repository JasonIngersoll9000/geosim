import { describe, it, expect } from 'vitest'
import { createMockScenario } from '../helpers/mock-scenario'

// Import the functions under test — these don't exist yet (RED phase)
import { buildFogOfWarContext, actorWouldKnowAbout } from '../../lib/game/fog-of-war'

describe('buildFogOfWarContext', () => {
  it('should include events the actor initiated', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const ctx = buildFogOfWarContext(us, scenario)

    // US initiated evt-epic-fury-launch
    const knownIds = ctx.knownEvents.map(e => e.id)
    expect(knownIds).toContain('evt-epic-fury-launch')
  })

  it('should include events that targeted the actor', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const ctx = buildFogOfWarContext(us, scenario)

    // evt-ras-tanura-strike targets Gulf states, not US — should NOT be in US known events
    // evt-strait-closure targets US (as importer/naval presence) — check it is visible
    const knownIds = ctx.knownEvents.map(e => e.id)
    expect(knownIds).toContain('evt-strait-closure')
  })

  it('should include major public events regardless of actor', () => {
    const scenario = createMockScenario()
    const russia = scenario.actors.find(a => a.id === 'russia')!
    const ctx = buildFogOfWarContext(russia, scenario)

    // evt-ayatollah-killed is a critical public event — Russia should know
    const knownIds = ctx.knownEvents.map(e => e.id)
    expect(knownIds).toContain('evt-ayatollah-killed')
  })

  it('should include events shared by intel partners', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    // Iran has Russia as intel provider — Russia knows about US fleet movements
    const ctx = buildFogOfWarContext(iran, scenario)

    // Iran should know about US-initiated evt-epic-fury-launch via Russia intel sharing
    const knownIds = ctx.knownEvents.map(e => e.id)
    expect(knownIds).toContain('evt-epic-fury-launch')
  })

  it('should EXCLUDE covert events by adversaries that the actor has no intel on', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const ctx = buildFogOfWarContext(us, scenario)

    // evt-covert-by-russia is covert and not shared with US
    const knownIds = ctx.knownEvents.map(e => e.id)
    expect(knownIds).not.toContain('evt-covert-by-russia')
  })

  it('should use BELIEVED state from intelligencePicture, not true actor state', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const ctx = buildFogOfWarContext(us, scenario)

    // US believes Iran military readiness = 25, actual = 58
    const iranPicture = ctx.myIntelligencePicture.find(p => p.aboutActorId === 'iran')
    expect(iranPicture).toBeDefined()
    expect(iranPicture!.believedMilitaryReadiness).toBe(25)

    // True state should NOT be directly in the fog-of-war context
    // (actor gets intel picture, not the actual actor state)
    expect(ctx.actor.state.military.overallReadiness).toBe(58) // US's own true state
  })

  it('should not leak unknown unknowns to the actor', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const ctx = buildFogOfWarContext(us, scenario)

    // Russia covert intel sharing with Iran is an "unknown unknown" for US
    const iranPicture = ctx.myIntelligencePicture.find(p => p.aboutActorId === 'iran')!
    // unknownUnknowns are not visible to the actor — they go to omniscient/engine only
    // The context should NOT include unknownUnknowns in a way the actor can act on
    expect(ctx.unknownUnknownsForEngine).toBeDefined()
    // But the actor's own context should only see knownUnknowns
    expect(iranPicture.knownUnknowns.length).toBeGreaterThan(0)
    // The russiaCovertIntel item is in unknownUnknowns, not knownUnknowns
    const leaksCovert = iranPicture.knownUnknowns.some(u =>
      u.toLowerCase().includes('russia') && u.toLowerCase().includes('covert')
    )
    expect(leaksCovert).toBe(false)
  })

  it('should include intel from sharing partners in the context', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    const ctx = buildFogOfWarContext(iran, scenario)

    // Iran's intelligence state lists Russia as an intel sharing partner
    expect(ctx.actor.state.intelligence.intelSharingPartners.map(p => p.actorId))
      .toContain('russia')
  })
})

describe('actorWouldKnowAbout', () => {
  it('should return true for events the actor initiated', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const event = scenario.eventHistory.find(e => e.id === 'evt-epic-fury-launch')!
    expect(actorWouldKnowAbout(us, event, scenario)).toBe(true)
  })

  it('should return true for events that directly targeted the actor', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const event = scenario.eventHistory.find(e => e.id === 'evt-strait-closure')!
    expect(actorWouldKnowAbout(us, event, scenario)).toBe(true)
  })

  it('should return true for critical/major public events', () => {
    const scenario = createMockScenario()
    const russia = scenario.actors.find(a => a.id === 'russia')!
    const event = scenario.eventHistory.find(e => e.id === 'evt-ayatollah-killed')!
    expect(actorWouldKnowAbout(russia, event, scenario)).toBe(true)
  })

  it('should return false for covert events by non-partners', () => {
    const scenario = createMockScenario()
    const us = scenario.actors.find(a => a.id === 'united_states')!
    const covertEvent = scenario.eventHistory.find(e => e.id === 'evt-covert-by-russia')!
    expect(actorWouldKnowAbout(us, covertEvent, scenario)).toBe(false)
  })

  it('should return true for covert events by intel partners', () => {
    const scenario = createMockScenario()
    const iran = scenario.actors.find(a => a.id === 'iran')!
    // Russia initiated evt-covert-by-russia, and Russia is Iran's intel partner
    const covertEvent = scenario.eventHistory.find(e => e.id === 'evt-covert-by-russia')!
    expect(actorWouldKnowAbout(iran, covertEvent, scenario)).toBe(true)
  })
})
