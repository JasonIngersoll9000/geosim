// @vitest-environment node
import { describe, it, expect } from "vitest"
import { buildExtractionPrompt, parseExtractionResponse } from "../../scripts/extract-timeline"
import type { TimelineEvent } from "../../scripts/pipeline/types"

describe("buildExtractionPrompt", () => {
  it("includes the doc name and content", () => {
    const prompt = buildExtractionPrompt("research-military.md", "Some military content.")
    expect(prompt).toContain("research-military.md")
    expect(prompt).toContain("Some military content.")
  })

  it("instructs Claude to output only JSON array", () => {
    const prompt = buildExtractionPrompt("research-military.md", "content")
    expect(prompt).toContain("Output ONLY a JSON array")
    expect(prompt).toContain("No prose")
  })

  it("includes all required output fields in prompt", () => {
    const prompt = buildExtractionPrompt("test.md", "content")
    expect(prompt).toContain('"timestamp"')
    expect(prompt).toContain('"timestamp_confidence"')
    expect(prompt).toContain('"is_decision"')
    expect(prompt).toContain('"escalation_direction"')
    expect(prompt).toContain('"source_excerpt"')
  })
})

describe("parseExtractionResponse", () => {
  it("parses a valid JSON array from Claude response", () => {
    const raw: Omit<TimelineEvent, "id">[] = [
      {
        timestamp: "2026-02-28",
        timestamp_confidence: "exact",
        title: "US authorizes airstrikes",
        description: "Trump signed off on Operation Epic Fury.",
        actors_involved: ["united_states", "iran"],
        dimension: "military",
        is_decision: true,
        deciding_actor: "united_states",
        escalation_direction: "up",
        source_excerpt: "Trump authorized...",
      },
    ]
    const events = parseExtractionResponse(JSON.stringify(raw), "research-military.md")
    expect(events).toHaveLength(1)
    expect(events[0].timestamp).toBe("2026-02-28")
    expect(events[0].is_decision).toBe(true)
  })

  it("throws when response is not valid JSON", () => {
    expect(() => parseExtractionResponse("not json", "research-military.md")).toThrow(
      "Failed to parse extraction response from research-military.md"
    )
  })

  it("throws when response is not an array", () => {
    expect(() =>
      parseExtractionResponse('{"key": "value"}', "research-military.md")
    ).toThrow("Extraction response from research-military.md is not an array")
  })

  it("assigns stable ids to events that have empty id fields", () => {
    const raw = [
      {
        id: "",
        timestamp: "2026-03-01",
        timestamp_confidence: "exact",
        title: "Iran Retaliates",
        description: "Iran fired 40 ballistic missiles.",
        actors_involved: ["iran"],
        dimension: "military",
        is_decision: true,
        escalation_direction: "up",
        source_excerpt: "Iran fired...",
      },
    ]
    const events = parseExtractionResponse(JSON.stringify(raw), "research-military.md")
    expect(events[0].id).toBe("evt_20260301_iran_retaliates")
  })
})
