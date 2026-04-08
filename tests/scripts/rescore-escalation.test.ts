// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildRescorePrompt,
  parseRescoreResponse,
  buildPriorDyadSummary,
} from "../../scripts/rescore-escalation"
import type { EnrichedEvent } from "../../scripts/pipeline/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeEnrichedEvent(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: "evt_20260228_op_epic_fury",
    timestamp: "2026-02-28",
    timestamp_confidence: "exact",
    title: "US Launches Operation Epic Fury",
    description: "US and Israel launch coordinated strikes on Iran.",
    actors_involved: ["united_states", "israel", "iran"],
    dimension: "military",
    is_decision: true,
    deciding_actor: "united_states",
    escalation_direction: "up",
    source_excerpt: "Trump authorized the operation.",
    full_briefing: {
      situation: "Coalition forces launched strikes across Iran.",
      actor_perspectives: {
        united_states: "US perspective paragraph.",
        iran: "Iran perspective paragraph.",
        israel: "Israel perspective paragraph.",
      },
      context: "Context paragraph.",
    },
    chronicle: {
      headline: "US-Israel Strike Iran",
      date_label: "Day 1 — February 28, 2026",
      entry: "Chronicle entry paragraph.",
    },
    context_summary: "Context summary paragraph.",
    decision_analysis: {
      is_decision_point: true,
      deciding_actor_id: "united_states",
      decision_summary: "Trump chose to launch Operation Epic Fury.",
      alternatives: [],
    },
    escalation: {
      by_actor: {
        united_states: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged precision strikes on military targets." },
        iran: { rung: 5, level: 2, level_name: "Covert / Deniable Operations", criteria_rationale: "Proxy activations prior to direct strikes." },
        israel: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes on Iranian military targets." },
        russia: { rung: 2, level: 1, level_name: "Crisis Onset", criteria_rationale: "Diplomatic support only." },
        china: { rung: 1, level: 0, level_name: "Baseline Competition", criteria_rationale: "Observer posture." },
      },
      perceived: {
        iran_perceives_us: { estimated_rung: 12, confidence: "moderate", rationale: "Iran overestimates US commitment." },
        us_perceives_iran: { estimated_rung: 6, confidence: "high", rationale: "Strong SIGINT picture." },
        israel_perceives_iran: { estimated_rung: 7, confidence: "moderate", rationale: "Mossad assessment." },
        russia_perceives_us: { estimated_rung: 10, confidence: "low", rationale: "Limited visibility." },
        china_perceives_us: { estimated_rung: 9, confidence: "low", rationale: "Observer posture." },
      },
      dyads: {
        us_iran: { highest_threshold_crossed: "thresh_overt_force", thresholds_intact: ["thresh_total_war", "thresh_wmd", "thresh_nuclear_use", "thresh_armageddon"], escalation_asymmetry: 3, last_crossing_event_id: "evt_20260228_op_epic_fury" },
        israel_iran: { highest_threshold_crossed: "thresh_overt_force", thresholds_intact: ["thresh_total_war", "thresh_wmd", "thresh_nuclear_use"], escalation_asymmetry: 1, last_crossing_event_id: null },
        us_israel: { highest_threshold_crossed: null, thresholds_intact: ["thresh_crisis", "thresh_covert_force", "thresh_overt_force"], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_houthis: { highest_threshold_crossed: "thresh_covert_force", thresholds_intact: ["thresh_overt_force", "thresh_total_war"], escalation_asymmetry: 5, last_crossing_event_id: null },
        iran_houthis: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_hezbollah: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        iran_hezbollah: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_iraqi_militia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        iran_iraqi_militia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_russia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
        us_china: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      },
      global_ceiling: 8,
      direction: "up",
    },
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// buildRescorePrompt
// ─────────────────────────────────────────────────────────────────────────────

describe("buildRescorePrompt", () => {
  it("includes the event ID and title", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "no prior dyad state")
    expect(prompt).toContain("evt_20260228_op_epic_fury")
    expect(prompt).toContain("US Launches Operation Epic Fury")
  })

  it("includes the situation from full_briefing", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "no prior dyad state")
    expect(prompt).toContain("Coalition forces launched strikes")
  })

  it("includes the decision summary when present", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "no prior dyad state")
    expect(prompt).toContain("Trump chose to launch Operation Epic Fury")
  })

  it("includes prior dyad state", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "us_iran: thresh_overt_force crossed")
    expect(prompt).toContain("us_iran: thresh_overt_force crossed")
  })

  it("includes the escalation framework", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "")
    expect(prompt).toContain("ESCALATION FRAMEWORK")
    expect(prompt).toContain("by_actor")
    expect(prompt).toContain("perceived")
    expect(prompt).toContain("dyads")
  })

  it("includes the actor-perspective scoring instruction", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "")
    expect(prompt).toContain("THEIR strategic doctrine perspective")
  })

  it("instructs not to regress thresholds", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "")
    expect(prompt).toContain("NOT regress")
  })

  it("matches snapshot (change-control gate)", () => {
    const event = makeEnrichedEvent()
    const prompt = buildRescorePrompt(event, "baseline")
    expect(prompt).toMatchSnapshot()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseRescoreResponse
// ─────────────────────────────────────────────────────────────────────────────

function makeValidRescoreResponse() {
  return {
    by_actor: {
      united_states: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes." },
      iran: { rung: 5, level: 2, level_name: "Covert / Deniable Operations", criteria_rationale: "Proxy activity." },
      israel: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes." },
      russia: { rung: 2, level: 1, level_name: "Crisis Onset", criteria_rationale: "Diplomatic support." },
      china: { rung: 1, level: 0, level_name: "Baseline Competition", criteria_rationale: "Observer." },
    },
    perceived: {
      iran_perceives_us: { estimated_rung: 12, confidence: "moderate", rationale: "Iran overestimates." },
      us_perceives_iran: { estimated_rung: 6, confidence: "high", rationale: "SIGINT." },
      israel_perceives_iran: { estimated_rung: 7, confidence: "moderate", rationale: "Mossad." },
      russia_perceives_us: { estimated_rung: 10, confidence: "low", rationale: "Limited view." },
      china_perceives_us: { estimated_rung: 9, confidence: "low", rationale: "Observer." },
    },
    dyads: {
      us_iran: { highest_threshold_crossed: "thresh_overt_force", thresholds_intact: ["thresh_total_war"], escalation_asymmetry: 3, last_crossing_event_id: "evt_test" },
      israel_iran: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      us_israel: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      us_houthis: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      iran_houthis: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      us_hezbollah: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      iran_hezbollah: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      us_iraqi_militia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      iran_iraqi_militia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      us_russia: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
      us_china: { highest_threshold_crossed: null, thresholds_intact: [], escalation_asymmetry: 0, last_crossing_event_id: null },
    },
    global_ceiling: 8,
    direction: "up",
  }
}

describe("parseRescoreResponse", () => {
  it("parses a valid three-layer escalation response", () => {
    const raw = JSON.stringify(makeValidRescoreResponse())
    const result = parseRescoreResponse(raw, "evt_test")
    expect(result.by_actor).toBeDefined()
    expect(result.perceived).toBeDefined()
    expect(result.dyads).toBeDefined()
    expect(result.global_ceiling).toBe(8)
    expect(result.direction).toBe("up")
  })

  it("parses by_actor entries correctly", () => {
    const raw = JSON.stringify(makeValidRescoreResponse())
    const result = parseRescoreResponse(raw, "evt_test")
    expect(result.by_actor["united_states"].rung).toBe(8)
    expect(result.by_actor["united_states"].level).toBe(3)
    expect(result.by_actor["iran"].rung).toBe(5)
  })

  it("parses perceived positions correctly", () => {
    const raw = JSON.stringify(makeValidRescoreResponse())
    const result = parseRescoreResponse(raw, "evt_test")
    expect(result.perceived["iran_perceives_us"].estimated_rung).toBe(12)
    expect(result.perceived["iran_perceives_us"].confidence).toBe("moderate")
  })

  it("parses dyad state correctly", () => {
    const raw = JSON.stringify(makeValidRescoreResponse())
    const result = parseRescoreResponse(raw, "evt_test")
    expect(result.dyads["us_iran"].highest_threshold_crossed).toBe("thresh_overt_force")
    expect(result.dyads["us_iran"].escalation_asymmetry).toBe(3)
  })

  it("strips markdown fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(makeValidRescoreResponse()) + "\n```"
    expect(() => parseRescoreResponse(raw, "evt_test")).not.toThrow()
  })

  it("throws when by_actor is missing", () => {
    const { by_actor: _omit, ...rest } = makeValidRescoreResponse()
    expect(() => parseRescoreResponse(JSON.stringify(rest), "evt_test"))
      .toThrow("missing field: by_actor")
  })

  it("throws when perceived is missing", () => {
    const { perceived: _omit, ...rest } = makeValidRescoreResponse()
    expect(() => parseRescoreResponse(JSON.stringify(rest), "evt_test"))
      .toThrow("missing field: perceived")
  })

  it("throws when dyads is missing", () => {
    const { dyads: _omit, ...rest } = makeValidRescoreResponse()
    expect(() => parseRescoreResponse(JSON.stringify(rest), "evt_test"))
      .toThrow("missing field: dyads")
  })

  it("throws on invalid JSON", () => {
    expect(() => parseRescoreResponse("not json at all", "evt_test"))
      .toThrow("not valid JSON")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildPriorDyadSummary
// ─────────────────────────────────────────────────────────────────────────────

describe("buildPriorDyadSummary", () => {
  it("returns baseline message for empty event array", () => {
    const result = buildPriorDyadSummary([])
    expect(result).toContain("baseline")
    expect(result).toContain("no thresholds crossed")
  })

  it("extracts dyad state from last event with new escalation structure", () => {
    const event = makeEnrichedEvent()
    const result = buildPriorDyadSummary([event])
    expect(result).toContain("thresh_overt_force")
    expect(result).toContain("us_iran")
  })

  it("uses the most recent event that has the new structure", () => {
    const older = makeEnrichedEvent({ id: "evt_001", timestamp: "2026-02-01" })
    const newer = makeEnrichedEvent({
      id: "evt_002",
      timestamp: "2026-02-28",
      escalation: {
        ...makeEnrichedEvent().escalation,
        dyads: {
          ...makeEnrichedEvent().escalation.dyads,
          us_iran: { highest_threshold_crossed: "thresh_total_war", thresholds_intact: ["thresh_wmd"], escalation_asymmetry: 5, last_crossing_event_id: "evt_002" },
        },
      } as EnrichedEvent["escalation"],
    })
    const result = buildPriorDyadSummary([older, newer])
    // Should reflect the newer event's dyad state
    expect(result).toContain("thresh_total_war")
  })

  it("falls back gracefully for events with old flat escalation format", () => {
    const oldFormatEvent = makeEnrichedEvent({
      escalation: { rung_before: 5, rung_after: 8, direction: "up" } as unknown as EnrichedEvent["escalation"],
    })
    expect(() => buildPriorDyadSummary([oldFormatEvent])).not.toThrow()
    const result = buildPriorDyadSummary([oldFormatEvent])
    expect(result).toContain("old escalation format")
  })
})
