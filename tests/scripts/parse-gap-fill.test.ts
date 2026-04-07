// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildCapabilitiesSummary,
  buildGapFillPrompt,
  parseGapFillResponse,
} from "../../scripts/parse-gap-fill"
import type { RawCapability, GapFillData } from "../../scripts/pipeline/types"

function makeCapability(overrides: Partial<RawCapability> = {}): RawCapability {
  return {
    category: "military",
    name: "Tomahawk TLAM",
    description: "Land-attack cruise missile",
    quantity: 4000,
    unit: "missiles",
    deployment_status: "available",
    lead_time_days: 30,
    temporal_anchor: "2026-02-01",
    ...overrides,
  }
}

function makeValidGapFill(): GapFillData {
  return {
    as_of_date: "2026-04-07",
    sources_summary: "Test sources.",
    asset_inventory: {
      united_states: {
        tomahawk: { estimated_remaining: 2800, unit: "missiles", confidence: "medium", notes: "Estimate" },
      },
    },
    depletion_rates: {
      united_states: {
        tomahawk: [{ rate_per_day: -45, effective_from: "2026-02-28", notes: "Strike rate" }],
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
        strike_date: "2026-03-01",
        notes: "Destroyed by GBU-57",
      },
    ],
    global_variable_timeline: [
      { date: "2026-04-07", oil_price_usd: 185, hormuz_throughput_pct: 35, global_economic_stress: 65, notes: "" },
    ],
    casualties: {
      iran: { military_cumulative: 8000, civilian_cumulative: 12000, as_of_date: "2026-04-07", confidence: "low" },
    },
    political_indicators: {
      us_approval_pct: 44,
      us_congressional_status: "No formal AUMF, growing dissent",
      iran_domestic_status: "Rally-around-flag, limited dissent",
      nato_cohesion: "Fractured — most members refusing participation",
      as_of_date: "2026-04-07",
    },
  }
}

describe("buildCapabilitiesSummary", () => {
  it("includes actor names and capability names", () => {
    const caps: Record<string, RawCapability[]> = {
      united_states: [makeCapability()],
    }
    const summary = buildCapabilitiesSummary(caps)
    expect(summary).toContain("united_states")
    expect(summary).toContain("Tomahawk TLAM")
    expect(summary).toContain("4000")
  })

  it("handles multiple actors", () => {
    const caps: Record<string, RawCapability[]> = {
      united_states: [makeCapability()],
      iran: [makeCapability({ name: "Shahab-3" })],
    }
    const summary = buildCapabilitiesSummary(caps)
    expect(summary).toContain("iran")
    expect(summary).toContain("Shahab-3")
  })
})

describe("buildGapFillPrompt", () => {
  it("includes the research markdown content", () => {
    const prompt = buildGapFillPrompt("## Military\nTomahawks: 2800 remaining.", "caps summary")
    expect(prompt).toContain("Tomahawks: 2800 remaining.")
  })

  it("includes the capabilities summary", () => {
    const prompt = buildGapFillPrompt("research notes", "caps summary text here")
    expect(prompt).toContain("caps summary text here")
  })

  it("instructs focus on depletion trends not pre-war baseline", () => {
    const prompt = buildGapFillPrompt("notes", "caps")
    expect(prompt).toContain("depletion")
    expect(prompt).toContain("pre-war")
  })

  it("requests all required top-level fields", () => {
    const prompt = buildGapFillPrompt("notes", "caps")
    expect(prompt).toContain("asset_inventory")
    expect(prompt).toContain("depletion_rates")
    expect(prompt).toContain("infrastructure_status")
    expect(prompt).toContain("global_variable_timeline")
    expect(prompt).toContain("casualties")
    expect(prompt).toContain("political_indicators")
  })

  it("matches snapshot (change-control gate)", () => {
    const prompt = buildGapFillPrompt("## Section\nSome notes.", "actor: US\n  tomahawk: 4000")
    expect(prompt).toMatchSnapshot()
  })
})

describe("parseGapFillResponse", () => {
  it("parses a valid gap-fill response", () => {
    const raw = JSON.stringify(makeValidGapFill())
    const result = parseGapFillResponse(raw)
    expect(result.as_of_date).toBe("2026-04-07")
    expect(result.asset_inventory["united_states"]["tomahawk"].estimated_remaining).toBe(2800)
    expect(result.infrastructure_status[0].facility_id).toBe("fordow")
    expect(result.global_variable_timeline[0].oil_price_usd).toBe(185)
  })

  it("strips markdown fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(makeValidGapFill()) + "\n```"
    expect(() => parseGapFillResponse(raw)).not.toThrow()
  })

  it("throws on invalid JSON", () => {
    expect(() => parseGapFillResponse("not json")).toThrow("not valid JSON")
  })

  it("throws when asset_inventory is missing", () => {
    const { asset_inventory: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: asset_inventory")
  })

  it("throws when depletion_rates is missing", () => {
    const { depletion_rates: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: depletion_rates")
  })

  it("throws when infrastructure_status is missing", () => {
    const { infrastructure_status: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: infrastructure_status")
  })

  it("throws when as_of_date is missing", () => {
    const { as_of_date: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: as_of_date")
  })

  it("throws when sources_summary is missing", () => {
    const { sources_summary: _omit, ...rest } = makeValidGapFill()
    expect(() => parseGapFillResponse(JSON.stringify(rest))).toThrow("missing field: sources_summary")
  })
})
