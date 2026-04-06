// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildActorProfilePrompt,
  parseActorProfileResponse,
  buildKeyFigurePrompt,
  parseKeyFigureResponse,
  ACTOR_IDS,
  KEY_FIGURES,
} from "../../scripts/generate-profiles"
import type { RawCapability } from "../../scripts/pipeline/types"

function makeCapability(overrides: Partial<RawCapability> = {}): RawCapability {
  return {
    category: "military",
    name: "F-35 Strike Package",
    description: "A paragraph about F-35 capabilities.",
    deployment_status: "available",
    temporal_anchor: "January 2026",
    ...overrides,
  }
}

describe("ACTOR_IDS", () => {
  it("includes all 6 actors", () => {
    expect(ACTOR_IDS).toContain("united_states")
    expect(ACTOR_IDS).toContain("iran")
    expect(ACTOR_IDS).toContain("israel")
    expect(ACTOR_IDS).toContain("russia")
    expect(ACTOR_IDS).toContain("china")
    expect(ACTOR_IDS).toContain("gulf_states")
  })
})

describe("KEY_FIGURES", () => {
  it("includes Trump and Netanyahu", () => {
    const ids = KEY_FIGURES.map(f => f.id)
    expect(ids).toContain("trump")
    expect(ids).toContain("netanyahu")
  })

  it("includes Mojtaba Khamenei", () => {
    const ids = KEY_FIGURES.map(f => f.id)
    expect(ids).toContain("mojtaba_khamenei")
  })

  it("every figure has actor_id, name, title", () => {
    for (const f of KEY_FIGURES) {
      expect(f.actor_id, `${f.id} missing actor_id`).toBeTruthy()
      expect(f.name, `${f.id} missing name`).toBeTruthy()
      expect(f.title, `${f.id} missing title`).toBeTruthy()
    }
  })
})

describe("buildActorProfilePrompt", () => {
  it("includes actor id and temporal anchor instruction", () => {
    const prompt = buildActorProfilePrompt("iran", [makeCapability()], "Research content here.")
    expect(prompt).toContain("iran")
    expect(prompt).toContain("January 2026")
  })

  it("includes capabilities JSON in prompt", () => {
    const cap = makeCapability({ name: "Shahab-3 Ballistic Missile" })
    const prompt = buildActorProfilePrompt("iran", [cap], "Research.")
    expect(prompt).toContain("Shahab-3 Ballistic Missile")
  })

  it("instructs output of all required profile fields", () => {
    const prompt = buildActorProfilePrompt("iran", [], "Research.")
    expect(prompt).toContain("biographical_summary")
    expect(prompt).toContain("leadership_profile")
    expect(prompt).toContain("win_condition")
    expect(prompt).toContain("strategic_doctrine")
    expect(prompt).toContain("historical_precedents")
  })
})

describe("parseActorProfileResponse", () => {
  it("parses a valid profile response", () => {
    const raw = {
      id: "iran",
      name: "Islamic Republic of Iran",
      short_name: "Iran",
      biographical_summary: "A paragraph about Iran.",
      leadership_profile: "A paragraph about Iranian leadership.",
      win_condition: "A paragraph about Iranian win conditions.",
      strategic_doctrine: "A paragraph about Iranian doctrine.",
      historical_precedents: "A paragraph about Iranian history.",
      initial_scores: { militaryStrength: 60, politicalStability: 40, economicHealth: 30, publicSupport: 55, internationalStanding: 35, escalationRung: 8 },
      intelligence_profile: { signalCapability: 50, humanCapability: 65, cyberCapability: 55, blindSpots: ["US satellite coverage"], intelSharingPartners: ["russia"] },
    }
    const profile = parseActorProfileResponse(JSON.stringify(raw), "iran")
    expect(profile.id).toBe("iran")
    expect(profile.biographical_summary).toBeTruthy()
  })

  it("throws when required field is missing", () => {
    const raw = { id: "iran", name: "Iran" }
    expect(() => parseActorProfileResponse(JSON.stringify(raw), "iran")).toThrow(
      "Actor profile for iran missing required field"
    )
  })
})

describe("buildKeyFigurePrompt", () => {
  it("includes figure name and role", () => {
    const figure = KEY_FIGURES.find(f => f.id === "trump")!
    const prompt = buildKeyFigurePrompt(figure, "Actor profile text.", "Research mentions.")
    expect(prompt).toContain(figure.name)
    expect(prompt).toContain("biography")
    expect(prompt).toContain("decision_style")
    expect(prompt).toContain("current_context")
  })

  it("includes inferred vs verified instruction for Mojtaba", () => {
    const figure = KEY_FIGURES.find(f => f.id === "mojtaba_khamenei")!
    const prompt = buildKeyFigurePrompt(figure, "Actor profile.", "Research.")
    expect(prompt).toContain("inferred")
  })
})
