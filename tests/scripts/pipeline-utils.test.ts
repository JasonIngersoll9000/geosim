// @vitest-environment node
import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  ScenarioActorRow,
  KeyFigureRow,
  ActorCapabilityRow,
  ScenarioActorInsert,
  TurnCommitInsert,
} from '../../lib/types/database'

// Backward-compat aliases still exported
import type { ActorTableRow, ActorTableInsert } from '../../lib/types/database'

describe('database type shapes', () => {
  it('ActorTableRow has required static identity fields', () => {
    expectTypeOf<ActorTableRow>().toHaveProperty('biographical_summary')
    expectTypeOf<ActorTableRow>().toHaveProperty('leadership_profile')
    expectTypeOf<ActorTableRow>().toHaveProperty('win_condition')
    expectTypeOf<ActorTableRow>().toHaveProperty('strategic_doctrine')
    expectTypeOf<ActorTableRow>().toHaveProperty('historical_precedents')
    expectTypeOf<ActorTableRow['initial_scores']>().toEqualTypeOf<Record<string, unknown>>()
  })

  it('ScenarioActorRow is the canonical type (ActorTableRow is a deprecated alias)', () => {
    expectTypeOf<ScenarioActorRow>().toHaveProperty('biographical_summary')
    expectTypeOf<ScenarioActorRow['initial_scores']>().toEqualTypeOf<Record<string, unknown>>()
    // Alias must be identical
    expectTypeOf<ActorTableRow>().toEqualTypeOf<ScenarioActorRow>()
  })

  it('KeyFigureRow has all paragraph-depth fields', () => {
    expectTypeOf<KeyFigureRow>().toHaveProperty('biography')
    expectTypeOf<KeyFigureRow>().toHaveProperty('motivations')
    expectTypeOf<KeyFigureRow>().toHaveProperty('decision_style')
    expectTypeOf<KeyFigureRow>().toHaveProperty('current_context')
    expectTypeOf<KeyFigureRow['relationships']>().toEqualTypeOf<Record<string, unknown> | null>()
  })

  it('ActorCapabilityRow has temporal_anchor', () => {
    expectTypeOf<ActorCapabilityRow>().toHaveProperty('temporal_anchor')
    expectTypeOf<ActorCapabilityRow>().toHaveProperty('deployment_status')
    expectTypeOf<ActorCapabilityRow['quantity']>().toEqualTypeOf<number | null>()
  })
})

describe('ScenarioActorInsert runtime shape', () => {
  it('allows insert without created_at and updated_at', () => {
    const insert: ScenarioActorInsert = {
      id: 'united_states',
      scenario_id: 'some-uuid',
      name: 'United States',
      short_name: 'USA',
      biographical_summary: 'A paragraph.',
      leadership_profile: 'A paragraph.',
      win_condition: 'A paragraph.',
      strategic_doctrine: 'A paragraph.',
      historical_precedents: 'A paragraph.',
      initial_scores: { militaryStrength: 80 },
      intelligence_profile: { signalCapability: 90 },
    }
    expect(insert.id).toBe('united_states')
    expect(insert.created_at).toBeUndefined()
  })

  it('ActorTableInsert is the same as ScenarioActorInsert (deprecated alias)', () => {
    expectTypeOf<ActorTableInsert>().toEqualTypeOf<ScenarioActorInsert>()
  })
})

describe('TurnCommitInsert runtime shape', () => {
  it('allows missing enriched fields', () => {
    const minimal: TurnCommitInsert = {
      branch_id: 'b',
      turn_number: 1,
      simulated_date: '2026-01-01',
      scenario_snapshot: {},
      current_phase: 'planning',
      is_ground_truth: true,
      parent_commit_id: null,
      planning_phase: null,
      resolution_phase: null,
      reaction_phase: null,
      judging_phase: null,
      narrative_entry: null,
      compute_cost_tokens: null,
    }
    expect(Object.keys(minimal).length).toBeGreaterThan(0)
    // enriched fields absent — no TS error and no runtime value
    expect((minimal as Record<string, unknown>).full_briefing).toBeUndefined()
    expect((minimal as Record<string, unknown>).chronicle_headline).toBeUndefined()
    expect((minimal as Record<string, unknown>).escalation_direction).toBeUndefined()
  })
})
