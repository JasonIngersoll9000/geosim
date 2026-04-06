// @vitest-environment node
import { describe, it, expectTypeOf } from 'vitest'
import type { ActorTableRow, KeyFigureRow, ActorCapabilityRow } from '../../lib/types/database'

describe('database type shapes', () => {
  it('ActorTableRow has required static identity fields', () => {
    expectTypeOf<ActorTableRow>().toHaveProperty('biographical_summary')
    expectTypeOf<ActorTableRow>().toHaveProperty('leadership_profile')
    expectTypeOf<ActorTableRow>().toHaveProperty('win_condition')
    expectTypeOf<ActorTableRow>().toHaveProperty('strategic_doctrine')
    expectTypeOf<ActorTableRow>().toHaveProperty('historical_precedents')
    expectTypeOf<ActorTableRow['initial_scores']>().toEqualTypeOf<Record<string, unknown>>()
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
