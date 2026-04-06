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
      publicSupport: 50, internationalStanding: 60, escalationRung: 5,
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

  it("instructs paragraph-depth for text fields", () => {
    const event = makeEvent()
    const prompt = buildEnrichmentPrompt(event, "context", [])
    expect(prompt).toContain("full paragraph")
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
      escalation: { rung_before: 5, rung_after: 12, direction: "up" },
    }
    const result = parseEnrichedResponse(JSON.stringify(raw), "evt_test")
    expect(result.full_briefing.situation).toBeTruthy()
    expect(result.chronicle.headline).toBeTruthy()
    expect(result.context_summary).toBeTruthy()
    expect(result.decision_analysis.is_decision_point).toBe(true)
  })

  it("throws when required section is missing", () => {
    const raw = { chronicle: {}, context_summary: "summary" }
    expect(() => parseEnrichedResponse(JSON.stringify(raw), "evt_test")).toThrow(
      "Enrichment response for evt_test missing required section"
    )
  })
})
