// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildStateEffectsPrompt,
  parseStateEffectsResponse,
  buildPriorSnapshotSummary,
} from "../../scripts/score-state-effects"
import type { EnrichedEvent, EventStateEffects, GapFillData } from "../../scripts/pipeline/types"

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEnrichedEvent(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: "evt_test_001",
    timestamp: "2026-02-28",
    timestamp_confidence: "exact",
    title: "US Strikes Iranian Nuclear Facilities",
    description: "US military launches precision strikes against three Iranian nuclear sites.",
    actors_involved: ["united_states", "iran"],
    dimension: "military",
    is_decision: true,
    deciding_actor: "united_states",
    escalation_direction: "up",
    source_excerpt: "Strike confirmed by CENTCOM.",
    full_briefing: {
      situation: "US B-2 bombers with GBU-57 bunker busters struck Fordow, Natanz, and Isfahan.",
      actor_perspectives: {
        united_states: "US views this as a limited, targeted strike to set back Iran's nuclear program.",
        iran: "Iran views this as an act of war requiring retaliation.",
      },
      context: "Follows breakdown of Muscat negotiations.",
    },
    chronicle: {
      headline: "US Bombs Iran Nuclear Sites",
      date_label: "February 28, 2026",
      entry: "B-2 bombers launched from Diego Garcia deliver GBU-57 to Fordow.",
    },
    context_summary: "Nuclear strike escalates conflict to open warfare.",
    decision_analysis: {
      is_decision_point: true,
      deciding_actor_id: "united_states",
      decision_summary: "US decides to strike Iranian nuclear infrastructure rather than continue diplomacy.",
      alternatives: [],
    },
    escalation: {
      by_actor: {
        united_states: { rung: 12, level: 4, level_name: "Limited Overt Military Operations", criteria_rationale: "Precision strike on hardened targets." },
        iran: { rung: 8, level: 3, level_name: "Coercive Signaling", criteria_rationale: "Missile tests and rhetoric." },
      },
      perceived: {
        iran_perceives_us: { estimated_rung: 14, confidence: "moderate", rationale: "Iran overestimates US intent." },
        us_perceives_iran: { estimated_rung: 7, confidence: "high", rationale: "US has good intel on Iran posture." },
      },
      dyads: {
        us_iran: { highest_threshold_crossed: "thresh_open_warfare", thresholds_intact: [], escalation_asymmetry: 4, last_crossing_event_id: "evt_test_001" },
      },
      global_ceiling: 12,
      direction: "up",
    },
    ...overrides,
  }
}

function makeGapFill(overrides: Partial<GapFillData> = {}): GapFillData {
  return {
    as_of_date: "2026-04-07",
    sources_summary: "Verified open-source and intelligence estimates.",
    asset_inventory: {
      united_states: {
        tomahawk: { estimated_remaining: 2800, unit: "missiles", confidence: "medium", notes: "Estimate based on strike rates." },
        b2: { estimated_remaining: 18, unit: "aircraft", confidence: "high", notes: "All airframes accounted for." },
      },
      iran: {
        shahab3: { estimated_remaining: 200, unit: "missiles", confidence: "low", notes: "Rough estimate." },
      },
    },
    depletion_rates: {
      united_states: {
        tomahawk: [{ rate_per_day: -45, effective_from: "2026-02-28", notes: "Strike rate during intensive operations." }],
      },
      iran: {
        shahab3: [{ rate_per_day: -10, effective_from: "2026-03-01", notes: "Retaliation salvo rate." }],
      },
    },
    infrastructure_status: [
      {
        facility_id: "fordow",
        name: "Fordow Enrichment Facility",
        actor_id: "iran",
        facility_type: "nuclear",
        status: "destroyed",
        capacity_pct: 0,
        lat: 34.88,
        lng: 50.99,
        strike_date: "2026-02-28",
        notes: "Destroyed by GBU-57.",
      },
    ],
    global_variable_timeline: [
      { date: "2026-04-07", oil_price_usd: 185, hormuz_throughput_pct: 35, global_economic_stress: 65, notes: "Post-strike." },
    ],
    casualties: {
      iran: { military_cumulative: 8000, civilian_cumulative: 12000, as_of_date: "2026-04-07", confidence: "low" },
    },
    political_indicators: {
      us_approval_pct: 44,
      us_congressional_status: "No formal AUMF, growing dissent.",
      iran_domestic_status: "Rally-around-flag effect.",
      nato_cohesion: "Fractured — most refusing participation.",
      as_of_date: "2026-04-07",
    },
    ...overrides,
  }
}

function makeEventStateEffects(overrides: Partial<EventStateEffects> = {}): EventStateEffects {
  return {
    event_id: "evt_test_001",
    timestamp: "2026-02-28T00:00:00Z",
    is_decision_revised: false,
    actor_deltas: {
      united_states: {
        military_strength: -2,
        political_stability: 1,
        economic_health: 0,
        public_support: -1,
        international_standing: -3,
        rationale: "Strike degrades standing but short-term domestic support holds.",
      },
      iran: {
        military_strength: -8,
        political_stability: -3,
        economic_health: -5,
        public_support: 3,
        international_standing: 2,
        rationale: "Nuclear facilities destroyed, but rally-around-flag effect boosts public support.",
      },
    },
    asset_changes: [
      { actor_id: "united_states", asset_type: "tomahawk", quantity_delta: -85, notes: "Tomahawks expended in initial strike." },
    ],
    global_updates: {
      oil_price_usd: 142.5,
      hormuz_throughput_pct: 60,
    },
    depletion_rate_changes: [],
    decision_nodes: [],
    confidence: "medium",
    ...overrides,
  }
}

// ─── buildStateEffectsPrompt ─────────────────────────────────────────────────

describe("buildStateEffectsPrompt", () => {
  const event = makeEnrichedEvent()
  const gapFill = makeGapFill()
  const priorSnapshot = "US: mil=0, pol=2, eco=0, sup=1, intl=-1\nIran: mil=-3, pol=-1, eco=-2, sup=0, intl=0"

  it("includes the event id", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("evt_test_001")
  })

  it("includes the event title", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("US Strikes Iranian Nuclear Facilities")
  })

  it("includes the event timestamp", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("2026-02-28")
  })

  it("includes the situation from full_briefing", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("B-2 bombers with GBU-57 bunker busters")
  })

  it("includes the decision summary", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("strike Iranian nuclear infrastructure")
  })

  it("includes the prior snapshot string", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain(priorSnapshot)
  })

  it("includes relevant actor asset inventory for actors involved in the event", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    // united_states and iran are involved
    expect(prompt).toContain("tomahawk")
    expect(prompt).toContain("shahab3")
  })

  it("includes all required JSON output fields in the prompt schema", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("actor_deltas")
    expect(prompt).toContain("asset_changes")
    expect(prompt).toContain("global_updates")
    expect(prompt).toContain("depletion_rate_changes")
    expect(prompt).toContain("decision_nodes")
    expect(prompt).toContain("confidence")
    expect(prompt).toContain("military_strength")
    expect(prompt).toContain("political_stability")
    expect(prompt).toContain("economic_health")
    expect(prompt).toContain("public_support")
    expect(prompt).toContain("international_standing")
  })

  it("includes delta scoring guidance", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toContain("-10")
    expect(prompt).toContain("+10")
  })

  it("instructs output of only JSON", () => {
    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    expect(prompt).toMatch(/output only.*json|only.*json.*object|json.*only/i)
  })
})

// ─── parseStateEffectsResponse ───────────────────────────────────────────────

describe("parseStateEffectsResponse", () => {
  it("parses a valid response", () => {
    const raw = JSON.stringify(makeEventStateEffects())
    const result = parseStateEffectsResponse(raw, "evt_test_001")
    expect(result.event_id).toBe("evt_test_001")
    expect(result.confidence).toBe("medium")
    expect(result.actor_deltas["united_states"].military_strength).toBe(-2)
    expect(result.asset_changes[0].quantity_delta).toBe(-85)
  })

  it("strips markdown code fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(makeEventStateEffects()) + "\n```"
    expect(() => parseStateEffectsResponse(raw, "evt_test_001")).not.toThrow()
    const result = parseStateEffectsResponse(raw, "evt_test_001")
    expect(result.event_id).toBe("evt_test_001")
  })

  it("strips plain code fences before parsing", () => {
    const raw = "```\n" + JSON.stringify(makeEventStateEffects()) + "\n```"
    expect(() => parseStateEffectsResponse(raw, "evt_test_001")).not.toThrow()
  })

  it("throws with eventId in message on invalid JSON", () => {
    expect(() => parseStateEffectsResponse("not json at all", "evt_test_001")).toThrow("evt_test_001")
  })

  it("throws when event_id is missing", () => {
    const { event_id: _omit, ...rest } = makeEventStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test_001")).toThrow("event_id")
  })

  it("throws when timestamp is missing", () => {
    const { timestamp: _omit, ...rest } = makeEventStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test_001")).toThrow("timestamp")
  })

  it("throws when actor_deltas is missing", () => {
    const { actor_deltas: _omit, ...rest } = makeEventStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test_001")).toThrow("actor_deltas")
  })

  it("throws when asset_changes is missing", () => {
    const { asset_changes: _omit, ...rest } = makeEventStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test_001")).toThrow("asset_changes")
  })

  it("throws when global_updates is missing", () => {
    const { global_updates: _omit, ...rest } = makeEventStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test_001")).toThrow("global_updates")
  })

  it("throws when confidence is missing", () => {
    const { confidence: _omit, ...rest } = makeEventStateEffects()
    expect(() => parseStateEffectsResponse(JSON.stringify(rest), "evt_test_001")).toThrow("confidence")
  })
})

// ─── buildPriorSnapshotSummary ────────────────────────────────────────────────

describe("buildPriorSnapshotSummary", () => {
  it("returns 'No prior events.' for empty array", () => {
    const result = buildPriorSnapshotSummary([])
    expect(result).toBe("No prior events.")
  })

  it("returns a summary for a single effect", () => {
    const effects = [makeEventStateEffects()]
    const result = buildPriorSnapshotSummary(effects)
    expect(result).toContain("united_states")
    expect(result).toContain("iran")
    // Should contain some numeric delta info
    expect(result).toMatch(/-?\d/)
  })

  it("accumulates deltas correctly across multiple effects", () => {
    const effect1 = makeEventStateEffects({
      event_id: "evt_001",
      actor_deltas: {
        united_states: {
          military_strength: -2,
          political_stability: 1,
          economic_health: 0,
          public_support: -1,
          international_standing: -3,
          rationale: "First event.",
        },
      },
    })
    const effect2 = makeEventStateEffects({
      event_id: "evt_002",
      actor_deltas: {
        united_states: {
          military_strength: -3,
          political_stability: -1,
          economic_health: -2,
          public_support: -2,
          international_standing: -1,
          rationale: "Second event.",
        },
      },
    })
    const result = buildPriorSnapshotSummary([effect1, effect2])
    // united_states military_strength should be -5 cumulative
    expect(result).toContain("united_states")
    // The summary should show accumulated -5 for military
    expect(result).toContain("-5")
  })

  it("handles effects with different actors accumulating independently", () => {
    const effectUS = makeEventStateEffects({
      event_id: "evt_001",
      actor_deltas: {
        united_states: {
          military_strength: -2,
          political_stability: 0,
          economic_health: 0,
          public_support: 0,
          international_standing: 0,
          rationale: "US only.",
        },
      },
    })
    const effectIran = makeEventStateEffects({
      event_id: "evt_002",
      actor_deltas: {
        iran: {
          military_strength: -8,
          political_stability: -3,
          economic_health: -5,
          public_support: 3,
          international_standing: 2,
          rationale: "Iran only.",
        },
      },
    })
    const result = buildPriorSnapshotSummary([effectUS, effectIran])
    expect(result).toContain("united_states")
    expect(result).toContain("iran")
  })

  it("includes all five state dimensions in the summary", () => {
    const effects = [makeEventStateEffects()]
    const result = buildPriorSnapshotSummary(effects)
    expect(result).toMatch(/mil(itary)?/i)
    expect(result).toMatch(/pol(itical)?/i)
    expect(result).toMatch(/eco(nomic)?/i)
    expect(result).toMatch(/sup(port)?/i)
    expect(result).toMatch(/int(ernational)?/i)
  })
})
