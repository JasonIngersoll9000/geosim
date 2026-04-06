// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildScenarioInsert, buildActorInsert, buildTurnCommitInsert } from '../../scripts/seed-iran'
import type { ActorProfile, EnrichedEvent } from '../../scripts/pipeline/types'

function makeActorProfile(): ActorProfile {
  return {
    id: 'iran',
    name: 'Islamic Republic of Iran',
    short_name: 'Iran',
    biographical_summary: 'Iran biographical summary paragraph.',
    leadership_profile: 'Iran leadership profile paragraph.',
    win_condition: 'Iran win condition paragraph.',
    strategic_doctrine: 'Iran doctrine paragraph.',
    historical_precedents: 'Iran precedents paragraph.',
    initial_scores: { militaryStrength: 60, politicalStability: 40, economicHealth: 30, publicSupport: 55, internationalStanding: 35, escalationRung: 8 },
    intelligence_profile: { signalCapability: 50, humanCapability: 65, cyberCapability: 55, blindSpots: [], intelSharingPartners: [] },
  }
}

function makeEnrichedEvent(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: 'evt_20260228_op_epic_fury',
    timestamp: '2026-02-28',
    timestamp_confidence: 'exact',
    title: 'Trump Authorizes Operation Epic Fury',
    description: 'A description paragraph.',
    actors_involved: ['united_states'],
    dimension: 'military',
    is_decision: true,
    deciding_actor: 'united_states',
    escalation_direction: 'up',
    source_excerpt: 'Source text.',
    full_briefing: {
      situation: 'Situation paragraph.',
      actor_perspectives: { united_states: 'US perspective.', iran: 'Iran perspective.' },
      context: 'Context paragraph.',
    },
    chronicle: {
      headline: 'US Launches Strikes on Iran',
      date_label: 'Day 1 — February 28, 2026',
      entry: 'Chronicle entry four paragraphs.',
    },
    context_summary: 'Summary paragraph.',
    decision_analysis: {
      is_decision_point: true,
      deciding_actor_id: 'united_states',
      decision_summary: 'Trump authorized Operation Epic Fury.',
      alternatives: [],
    },
    escalation: { rung_before: 5, rung_after: 12, direction: 'up' },
    ...overrides,
  }
}

describe('buildScenarioInsert', () => {
  it('sets background_context_enriched when provided', () => {
    const insert = buildScenarioInsert('Enriched background paragraph.')
    expect(insert.background_context_enriched).toBe('Enriched background paragraph.')
    expect(insert.category).toBe('geopolitical_conflict')
    expect(insert.visibility).toBe('public')
  })
})

describe('buildActorInsert', () => {
  it('maps ActorProfile fields to ScenarioActorInsert shape', () => {
    const profile = makeActorProfile()
    const insert = buildActorInsert(profile, 'scenario-uuid-123')
    expect(insert.id).toBe('iran')
    expect(insert.scenario_id).toBe('scenario-uuid-123')
    expect(insert.biographical_summary).toBe(profile.biographical_summary)
    expect(insert.initial_scores).toEqual(profile.initial_scores)
  })
})

describe('buildTurnCommitInsert', () => {
  it('maps EnrichedEvent fields to TurnCommitInsert shape', () => {
    const event = makeEnrichedEvent()
    const insert = buildTurnCommitInsert(event, 'branch-uuid', null, 1)
    expect(insert.simulated_date).toBe('2026-02-28')
    expect(insert.full_briefing).toBe(JSON.stringify(event.full_briefing))
    expect(insert.chronicle_headline).toBe('US Launches Strikes on Iran')
    expect(insert.chronicle_entry).toBe(event.chronicle.entry)
    expect(insert.is_decision_point).toBe(true)
    expect(insert.deciding_actor_id).toBe('united_states')
    expect(insert.escalation_rung_before).toBe(5)
    expect(insert.escalation_rung_after).toBe(12)
    expect(insert.escalation_direction).toBe('up')
    expect(insert.is_ground_truth).toBe(true)
  })

  it('sets parent_commit_id correctly', () => {
    const event = makeEnrichedEvent()
    const insert = buildTurnCommitInsert(event, 'branch-uuid', 'parent-commit-id', 5)
    expect(insert.parent_commit_id).toBe('parent-commit-id')
    expect(insert.turn_number).toBe(5)
  })
})
