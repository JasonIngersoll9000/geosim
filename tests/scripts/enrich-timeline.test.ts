// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildEnrichmentContext,
  buildEnrichmentPrompt,
  parseEnrichedResponse,
} from "../../scripts/enrich-timeline"
import type { TimelineEvent, ActorProfile } from "../../scripts/pipeline/types"

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "evt_20260228_op_epic_fury",
    timestamp: "2026-02-28",
    timestamp_confidence: "exact",
    title: "Trump Authorizes Operation Epic Fury",
    description: "Trump signed the authorization order.",
    actors_involved: ["united_states", "israel", "iran"],
    dimension: "military",
    is_decision: true,
    deciding_actor: "united_states",
    escalation_direction: "up",
    source_excerpt: "Trump authorized...",
    ...overrides,
  }
}

function makeActorProfile(id: string): ActorProfile {
  return {
    id,
    name: id,
    short_name: id,
    biographical_summary: `${id} biographical summary.`,
    leadership_profile: `${id} leadership profile.`,
    win_condition: `${id} win condition.`,
    strategic_doctrine: `${id} doctrine.`,
    historical_precedents: `${id} precedents.`,
    initial_scores: {
      militaryStrength: 70, politicalStability: 60, economicHealth: 55,
      publicSupport: 50, internationalStanding: 60,
      escalationRung: 5, escalationLevel: 2, escalationLevelName: "Covert / Deniable Operations",
    },
    intelligence_profile: {
      signalCapability: 70, humanCapability: 60, cyberCapability: 65,
      blindSpots: [], intelSharingPartners: [],
    },
  }
}

describe("buildEnrichmentContext", () => {
  it("includes background context", () => {
    const ctx = buildEnrichmentContext("Background paragraph.", [], null, [])
    expect(ctx).toContain("Background paragraph.")
  })

  it("includes prior summaries when present", () => {
    const ctx = buildEnrichmentContext("Background.", ["Turn 1 summary.", "Turn 2 summary."], null, [])
    expect(ctx).toContain("Turn 1 summary.")
    expect(ctx).toContain("Turn 2 summary.")
  })

  it("includes last briefing section when provided", () => {
    const ctx = buildEnrichmentContext("Background.", [], "Full preceding briefing.", [])
    expect(ctx).toContain("Full preceding briefing.")
    expect(ctx).toContain("PRECEDING TURN")
  })

  it("excludes preceding turn section when lastBriefing is null", () => {
    const ctx = buildEnrichmentContext("Background.", [], null, [])
    expect(ctx).not.toContain("PRECEDING TURN")
  })
})

describe("buildEnrichmentPrompt", () => {
  it("includes the event title and timestamp", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context chain text", [makeActorProfile("united_states")])
    expect(prompt).toContain("Trump Authorizes Operation Epic Fury")
    expect(prompt).toContain("2026-02-28")
  })

  it("includes all required output fields", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context", [])
    expect(prompt).toContain("full_briefing")
    expect(prompt).toContain("chronicle")
    expect(prompt).toContain("context_summary")
    expect(prompt).toContain("decision_analysis")
    expect(prompt).toContain("escalation")
  })

  it("includes three-layer escalation structure", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context", [])
    expect(prompt).toContain("by_actor")
    expect(prompt).toContain("perceived")
    expect(prompt).toContain("dyads")
    expect(prompt).toContain("global_ceiling")
  })

  it("includes the escalation framework prompt", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context", [])
    expect(prompt).toContain("ESCALATION FRAMEWORK")
    expect(prompt).toContain("lethality")
    expect(prompt).toContain("target_sensitivity")
  })

  it("instructs paragraph-depth for text fields", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context", [])
    expect(prompt).toContain("full paragraph")
  })

  it("matches snapshot (change-control gate)", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context chain text", [makeActorProfile("united_states")])
    expect(prompt).toMatchSnapshot()
  })
})

describe("parseEnrichedResponse", () => {
  it("parses a valid enrichment response", () => {
    const raw = {
      full_briefing: {
        situation: "A situation paragraph.",
        actor_perspectives: { united_states: "US perspective.", iran: "Iran perspective." },
        context: "A context paragraph.",
      },
      chronicle: {
        headline: "US Launches Strikes on Iran",
        date_label: "Day 1 of Operation Epic Fury — February 28, 2026",
        entry: "A chronicle entry paragraph.",
      },
      context_summary: "A one-paragraph summary.",
      decision_analysis: {
        is_decision_point: true,
        deciding_actor_id: "united_states",
        decision_summary: "Trump authorized Operation Epic Fury.",
        alternatives: [],
      },
      escalation: {
        by_actor: {
          united_states: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes on military targets." },
          iran: { rung: 5, level: 2, level_name: "Covert / Deniable Operations", criteria_rationale: "Proxy activations." },
          israel: { rung: 8, level: 3, level_name: "Limited Overt Military Operations", criteria_rationale: "Acknowledged strikes." },
          russia: { rung: 2, level: 1, level_name: "Crisis Onset", criteria_rationale: "Diplomatic support." },
          china: { rung: 1, level: 0, level_name: "Baseline Competition", criteria_rationale: "Observer posture." },
        },
        perceived: {
          iran_perceives_us: { estimated_rung: 12, confidence: "moderate", rationale: "Iran overestimates scale." },
          us_perceives_iran: { estimated_rung: 6, confidence: "high", rationale: "Strong SIGINT picture." },
          israel_perceives_iran: { estimated_rung: 7, confidence: "moderate", rationale: "Mossad assessment." },
          russia_perceives_us: { estimated_rung: 10, confidence: "low", rationale: "Limited visibility." },
          china_perceives_us: { estimated_rung: 9, confidence: "low", rationale: "Observer posture." },
        },
        dyads: {
          us_iran: { highest_threshold_crossed: "thresh_overt_force", thresholds_intact: ["thresh_total_war", "thresh_wmd"], escalation_asymmetry: 3, last_crossing_event_id: "evt_test" },
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
      },
    }
    const result = parseEnrichedResponse(JSON.stringify(raw), "evt_test")
    expect(result.full_briefing.situation).toBeTruthy()
    expect(result.chronicle.headline).toBeTruthy()
    expect(result.context_summary).toBeTruthy()
    expect(result.decision_analysis.is_decision_point).toBe(true)
    // Three-layer escalation structure
    expect(result.escalation.by_actor).toBeDefined()
    expect(result.escalation.perceived).toBeDefined()
    expect(result.escalation.dyads).toBeDefined()
    expect(result.escalation.global_ceiling).toBe(8)
  })

  it("throws when required section is missing", () => {
    const raw = { chronicle: {}, context_summary: "summary" }
    expect(() => parseEnrichedResponse(JSON.stringify(raw), "evt_test")).toThrow(
      "Enrichment response for evt_test missing required section"
    )
  })
})
