// scripts/extract-timeline.ts
// Phase 1: Extract timeline events from Iran research documents.
//
// Usage:
//   bun run scripts/extract-timeline.ts
//
// Reads: docs/Iran Research/research-military.md
//        docs/Iran Research/research-political.md
//        docs/Iran Research/research-economic.md
//
// Writes: data/iran-timeline-raw.json
//
// After running: review data/iran-timeline-raw.json manually.
// Set event.exclude = true for temporally contaminated events.
// Resolve duplicate candidates flagged in the _duplicates key.
// Expected output: 60-100 events covering Feb 6 - Mar 19, 2026.

import Anthropic from "@anthropic-ai/sdk"
import { readFile } from "fs/promises"
import { join } from "path"
import { mergeEvents, deduplicateEvents, slugifyEventId, writeJsonFile } from "./pipeline/utils"
import type { TimelineEvent } from "./pipeline/types"

const RESEARCH_DOCS = [
  "docs/Iran Research/research-military.md",
  "docs/Iran Research/research-political.md",
  "docs/Iran Research/research-economic.md",
]

export function buildExtractionPrompt(docName: string, content: string): string {
  return `You are extracting a chronological event list from a geopolitical research document.
Document: ${docName}

For every event, decision, or state change that can be anchored to a specific date or period, output a JSON object with this exact shape:
{
  "id": "",
  "timestamp": "YYYY-MM-DD",
  "timestamp_confidence": "exact" | "approximate" | "period",
  "title": "...",
  "description": "...",
  "actors_involved": ["united_states" | "iran" | "israel" | "russia" | "china" | "gulf_states"],
  "dimension": "military" | "diplomatic" | "economic" | "intelligence",
  "is_decision": true | false,
  "deciding_actor": "...",
  "escalation_direction": "up" | "down" | "lateral" | "none",
  "source_excerpt": "..."
}

Rules:
- Output ONLY a JSON array. No prose, no markdown, no commentary outside the JSON.
- Strict chronological order by timestamp.
- Do NOT include facts with no temporal anchor.
- Leave "id" as empty string — it will be assigned programmatically.
- "source_excerpt" must be an exact quote from the document supporting this event.
- If timestamp_confidence is "period", use the start date of the period.
- "is_decision" = true only for actor choices that could have gone differently. Consequence events (oil prices rising, casualties) are is_decision = false.

Document content:
${content}`
}

export function parseExtractionResponse(rawResponse: string, docName: string): TimelineEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawResponse.trim())
  } catch {
    throw new Error(
      `Failed to parse extraction response from ${docName}: not valid JSON`
    )
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Extraction response from ${docName} is not an array`
    )
  }

  return (parsed as TimelineEvent[]).map(event => ({
    ...event,
    id: event.id || slugifyEventId(event),
  }))
}

async function extractFromDoc(
  client: Anthropic,
  docPath: string
): Promise<TimelineEvent[]> {
  const docName = docPath.split("/").pop() ?? docPath
  console.log(`  Extracting from ${docName}...`)

  const content = await readFile(join(process.cwd(), docPath), "utf-8")
  const prompt = buildExtractionPrompt(docName, content)

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content
    .filter(block => block.type === "text")
    .map(block => (block as { type: "text"; text: string }).text)
    .join("")

  const events = parseExtractionResponse(text, docName)
  console.log(`  → ${events.length} events extracted from ${docName}`)
  return events
}

async function main(): Promise<void> {
  const client = new Anthropic()

  console.log("Phase 1: Extracting timeline from research documents...\n")

  const allResults: TimelineEvent[][] = []
  for (const docPath of RESEARCH_DOCS) {
    const events = await extractFromDoc(client, docPath)
    allResults.push(events)
  }

  const merged = mergeEvents(allResults)
  const { events, duplicates } = deduplicateEvents(merged)

  console.log(`\nTotal events: ${events.length}`)
  console.log(`Duplicate candidates: ${duplicates.length}`)

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      totalEvents: events.length,
      duplicateCandidates: duplicates.length,
      instructions: [
        "Review this file before running generate-profiles.ts and enrich-timeline.ts.",
        "Set event.exclude = true for temporally contaminated events.",
        "Review _duplicates and set _duplicateOf on events you want excluded.",
      ],
    },
    _duplicates: duplicates,
    events,
  }

  await writeJsonFile("data/iran-timeline-raw.json", output)
  console.log("\n✓ Saved to data/iran-timeline-raw.json")
  console.log("Next: Review the file, then run scripts/generate-profiles.ts")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
