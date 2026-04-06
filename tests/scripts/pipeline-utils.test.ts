// @vitest-environment node
import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  slugifyEventId,
  mergeEvents,
  deduplicateEvents,
  buildContextChainString,
} from '../../scripts/pipeline/utils'
import type { TimelineEvent } from '../../scripts/pipeline/types'
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

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "evt_test_001",
    timestamp: "2026-02-28",
    timestamp_confidence: "exact",
    title: "Test Event",
    description: "A test event description.",
    actors_involved: ["united_states"],
    dimension: "military",
    is_decision: false,
    escalation_direction: "none",
    source_excerpt: "Source text.",
    ...overrides,
  }
}

describe("slugifyEventId", () => {
  it("generates a stable id from timestamp and title", () => {
    const event = makeEvent({ timestamp: "2026-02-28", title: "Operation Epic Fury Authorized" })
    expect(slugifyEventId(event)).toBe("evt_20260228_operation_epic_fury_authorized")
  })

  it("lowercases and replaces spaces with underscores", () => {
    const event = makeEvent({ timestamp: "2026-03-01", title: "Iran Fires Ballistic Missiles" })
    expect(slugifyEventId(event)).toBe("evt_20260301_iran_fires_ballistic_missiles")
  })

  it("strips non-alphanumeric characters", () => {
    const event = makeEvent({ timestamp: "2026-03-05", title: "US/Israel Strike: Phase 2" })
    expect(slugifyEventId(event)).toBe("evt_20260305_usisrael_strike_phase_2")
  })
})

describe("mergeEvents", () => {
  it("merges two arrays into one sorted by timestamp", () => {
    const a = [makeEvent({ timestamp: "2026-03-01", id: "a1" })]
    const b = [makeEvent({ timestamp: "2026-02-28", id: "b1" })]
    const merged = mergeEvents([a, b])
    expect(merged[0].id).toBe("b1")
    expect(merged[1].id).toBe("a1")
  })

  it("handles empty arrays", () => {
    expect(mergeEvents([[], []])).toHaveLength(0)
  })

  it("preserves all events when no overlaps", () => {
    const a = [makeEvent({ id: "a1" }), makeEvent({ id: "a2" })]
    const b = [makeEvent({ id: "b1" })]
    expect(mergeEvents([a, b])).toHaveLength(3)
  })
})

describe("deduplicateEvents", () => {
  it("flags events with identical ids as duplicates", () => {
    const events = [
      makeEvent({ id: "evt_001", title: "Event A" }),
      makeEvent({ id: "evt_001", title: "Event A duplicate" }),
      makeEvent({ id: "evt_002", title: "Event B" }),
    ]
    const result = deduplicateEvents(events)
    expect(result.events).toHaveLength(3)
    expect(result.duplicates).toHaveLength(1)
    expect(result.duplicates[0].ids).toContain("evt_001")
  })

  it("flags same-timestamp same-title events with different ids", () => {
    const events = [
      makeEvent({ id: "evt_001", timestamp: "2026-02-28", title: "US Launches Strikes" }),
      makeEvent({ id: "evt_002", timestamp: "2026-02-28", title: "US Launches Strikes" }),
    ]
    const result = deduplicateEvents(events)
    expect(result.duplicates).toHaveLength(1)
  })

  it("does not flag different events on same day", () => {
    const events = [
      makeEvent({ id: "evt_001", timestamp: "2026-02-28", title: "US Launches Strikes" }),
      makeEvent({ id: "evt_002", timestamp: "2026-02-28", title: "Israel Launches Strikes" }),
    ]
    expect(deduplicateEvents(events).duplicates).toHaveLength(0)
  })
})

describe("buildContextChainString", () => {
  it("includes background, summaries, and last briefing", () => {
    const result = buildContextChainString(
      "Background context paragraph.",
      ["Turn 1 summary.", "Turn 2 summary."],
      "Full turn 3 briefing."
    )
    expect(result).toContain("Background context paragraph.")
    expect(result).toContain("Turn 1 summary.")
    expect(result).toContain("Turn 2 summary.")
    expect(result).toContain("Full turn 3 briefing.")
  })

  it("works with empty summaries (first event)", () => {
    const result = buildContextChainString("Background.", [], null)
    expect(result).toContain("Background.")
    expect(result).not.toContain("undefined")
    expect(result).not.toContain("null")
  })

  it("omits preceding turn section when lastBriefing is null", () => {
    const result = buildContextChainString("Background.", ["Summary 1."], null)
    expect(result).not.toMatch(/PRECEDING TURN/i)
  })
})
