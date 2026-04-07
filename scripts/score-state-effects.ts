// scripts/score-state-effects.ts
// Phase 5b: Score actor state effects for each enriched Iran event using Claude.
//
// Usage:
//   bun run scripts/score-state-effects.ts
//   bun run scripts/score-state-effects.ts --dry-run         # first 3 events, no write
//   bun run scripts/score-state-effects.ts --from=evt_id     # resume from event
//
// Reads:  data/iran-enriched.json
//         data/iran-gap-fill.json
//
// Writes: data/iran-state-effects.json

import Anthropic from "@anthropic-ai/sdk"
import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type {
  EnrichedEvent,
  EventStateEffects,
  GapFillData,
  StateEffectsFile,
  ActorStateDelta,
  ActorAssetInventory,
} from "./pipeline/types"

const ENRICHED_PATH = "data/iran-enriched.json"
const GAP_FILL_PATH = "data/iran-gap-fill.json"
const OUTPUT_PATH = "data/iran-state-effects.json"

interface EnrichedFile {
  _meta: Record<string, unknown>
  events: EnrichedEvent[]
}

// ─── Exported functions (unit-testable surface) ───────────────────────────────

export function buildStateEffectsPrompt(
  event: EnrichedEvent,
  gapFill: GapFillData,
  priorSnapshot: string
): string {
  // Only include asset inventory for actors involved in this event
  const relevantActors = event.actors_involved ?? []
  const relevantInventory: Record<string, ActorAssetInventory> = {}
  for (const actorId of relevantActors) {
    if (gapFill.asset_inventory[actorId]) {
      relevantInventory[actorId] = gapFill.asset_inventory[actorId]
    }
  }

  const inventoryText = Object.entries(relevantInventory)
    .map(([actorId, inventory]) => {
      const lines = Object.entries(inventory)
        .map(([assetType, info]) =>
          `    ${assetType}: ${info.estimated_remaining} ${info.unit} (confidence: ${info.confidence}) — ${info.notes}`
        )
        .join("\n")
      return `  ${actorId}:\n${lines}`
    })
    .join("\n\n")

  const depletionText = relevantActors
    .map(actorId => {
      const rates = gapFill.depletion_rates[actorId]
      if (!rates) return null
      const lines = Object.entries(rates)
        .map(([assetType, periods]) => {
          const active = periods.find(p => !p.effective_to) ?? periods[periods.length - 1]
          return active
            ? `    ${assetType}: ${active.rate_per_day}/day (from ${active.effective_from}) — ${active.notes}`
            : null
        })
        .filter(Boolean)
        .join("\n")
      return lines ? `  ${actorId}:\n${lines}` : null
    })
    .filter(Boolean)
    .join("\n\n")

  return `You are scoring the actor state effects for a single geopolitical simulation event.
Your job is to estimate how this event changed each actor's state variables and asset inventories.

EVENT:
ID: ${event.id}
Timestamp: ${event.timestamp}
Title: ${event.title}
Description: ${event.description}

What actually happened (situation):
${event.full_briefing.situation}

Decision taken:
${event.decision_analysis.decision_summary ?? "Not a decision point"}

CUMULATIVE STATE PRIOR TO THIS EVENT:
${priorSnapshot}

RELEVANT ASSET INVENTORY (actors involved in this event):
${inventoryText || "No inventory data available for these actors."}

ACTIVE DEPLETION RATES:
${depletionText || "No depletion rate data available."}

SCORING INSTRUCTIONS:
- Score deltas on a -10 to +10 scale per actor per event
- 0 means no significant effect on that dimension
- actor_deltas should only include actors materially affected by this event
- asset_changes: quantity_delta should be negative for consumption/destruction
- global_updates: only include fields if this event directly caused a measurable change
- decision_nodes: only set is_major_decision_node=true if this event IS a major strategic inflection point
- confidence: "high" if effects are clear-cut, "medium" if estimated, "low" if highly speculative

Output ONLY a JSON object with this exact shape:
{
  "event_id": "${event.id}",
  "timestamp": "${event.timestamp}T00:00:00Z",
  "is_decision_revised": false,
  "actor_deltas": {
    "actor_id": {
      "military_strength": [number -10 to +10],
      "political_stability": [number -10 to +10],
      "economic_health": [number -10 to +10],
      "public_support": [number -10 to +10],
      "international_standing": [number -10 to +10],
      "rationale": "one sentence"
    }
  },
  "asset_changes": [
    {
      "actor_id": "actor_id",
      "asset_type": "asset_type",
      "quantity_delta": [negative for consumption/destruction],
      "notes": "one sentence"
    }
  ],
  "global_updates": {
    "oil_price_usd": [number or omit],
    "hormuz_throughput_pct": [0-100 or omit],
    "global_economic_stress": [0-100 or omit]
  },
  "depletion_rate_changes": [],
  "decision_nodes": [],
  "confidence": "high|medium|low"
}

Output ONLY the JSON object. No prose outside the JSON.`
}

export function parseStateEffectsResponse(raw: string, eventId: string): EventStateEffects {
  let parsed: unknown
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    const content = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse state effects response for ${eventId}: not valid JSON`)
  }

  const res = parsed as Record<string, unknown>
  for (const field of [
    "event_id",
    "timestamp",
    "actor_deltas",
    "asset_changes",
    "global_updates",
    "confidence",
  ]) {
    if (res[field] === undefined) {
      throw new Error(`State effects response for ${eventId} missing field: ${field}`)
    }
  }

  return res as unknown as EventStateEffects
}

export function buildPriorSnapshotSummary(priorEffects: EventStateEffects[]): string {
  if (priorEffects.length === 0) return "No prior events."

  // Accumulate deltas per actor per dimension
  const cumulative: Record<
    string,
    { military_strength: number; political_stability: number; economic_health: number; public_support: number; international_standing: number }
  > = {}

  for (const effect of priorEffects) {
    for (const [actorId, delta] of Object.entries(effect.actor_deltas as Record<string, ActorStateDelta>)) {
      if (!cumulative[actorId]) {
        cumulative[actorId] = {
          military_strength: 0,
          political_stability: 0,
          economic_health: 0,
          public_support: 0,
          international_standing: 0,
        }
      }
      cumulative[actorId].military_strength += delta.military_strength
      cumulative[actorId].political_stability += delta.political_stability
      cumulative[actorId].economic_health += delta.economic_health
      cumulative[actorId].public_support += delta.public_support
      cumulative[actorId].international_standing += delta.international_standing
    }
  }

  const lines = Object.entries(cumulative).map(([actorId, state]) =>
    `${actorId}: mil=${state.military_strength}, pol=${state.political_stability}, eco=${state.economic_health}, sup=${state.public_support}, intl=${state.international_standing}`
  )

  return lines.join("\n")
}

// ─── Claude call with retry ───────────────────────────────────────────────────

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const MAX_RETRIES = 6
  let delay = 15000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages
        .stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        })
        .finalText()
    } catch (err: unknown) {
      const msg = String(err)
      const isOverloaded = msg.includes("overloaded") || msg.includes("529")
      const isRateLimit = msg.includes("rate_limit") || msg.includes("429")
      if ((isOverloaded || isRateLimit) && attempt < MAX_RETRIES) {
        console.log(
          `  [retry ${attempt}/${MAX_RETRIES - 1}] ${isOverloaded ? "Overloaded" : "Rate limit"} — waiting ${delay / 1000}s...`
        )
        await new Promise(r => setTimeout(r, delay))
        delay = Math.min(delay * 2, 120000)
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith("--from="))?.split("=")[1]
  const dryRun = args.includes("--dry-run")

  const client = new Anthropic()

  const enrichedFile = await readJsonFile<EnrichedFile>(ENRICHED_PATH)
  const events = enrichedFile.events

  const gapFill = await readJsonFile<GapFillData>(GAP_FILL_PATH)

  // Load existing output file to support resuming
  let existingEffects: EventStateEffects[] = []
  try {
    const existing = await readJsonFile<StateEffectsFile>(OUTPUT_PATH)
    existingEffects = existing.events ?? []
  } catch {
    // File doesn't exist yet — start fresh
  }

  const existingIds = new Set(existingEffects.map(e => e.event_id))

  const startIndex = fromEventId ? events.findIndex(e => e.id === fromEventId) : 0
  if (fromEventId && startIndex === -1) {
    throw new Error(`--from event '${fromEventId}' not found`)
  }

  const allInRange = events.slice(startIndex < 0 ? 0 : startIndex)
  const toProcess = allInRange.filter(e => !existingIds.has(e.id))
  const skipped = allInRange.length - toProcess.length
  console.log(`Processing ${toProcess.length} events (${skipped} already scored, skipping)\n`)

  const dryRunLimit = 3
  let processed = 0
  const outputEvents = [...existingEffects]

  for (let i = 0; i < toProcess.length; i++) {
    const event = toProcess[i]
    console.log(`  [${i + 1}/${toProcess.length}] ${event.id}...`)

    if (dryRun && processed >= dryRunLimit) {
      console.log(`  [dry-run] Stopping after ${dryRunLimit} events.`)
      break
    }

    // Build prior snapshot from all effects scored so far (in chronological order)
    const priorEffects = outputEvents.filter(e => {
      const eventIdx = events.findIndex(ev => ev.id === e.event_id)
      const currentIdx = events.findIndex(ev => ev.id === event.id)
      return eventIdx < currentIdx
    })
    const priorSnapshot = buildPriorSnapshotSummary(priorEffects)

    const prompt = buildStateEffectsPrompt(event, gapFill, priorSnapshot)
    const raw = await callClaude(client, prompt)
    const effects = parseStateEffectsResponse(raw, event.id)

    if (dryRun) {
      console.log(`  [dry-run] Effects for ${event.id}:`)
      console.log(JSON.stringify(effects, null, 2))
      processed++
      continue
    }

    outputEvents.push(effects)

    // Save incrementally after each event
    const outputFile: StateEffectsFile = {
      _meta: {
        generated: new Date().toISOString(),
        events_processed: outputEvents.length,
      },
      baseline_depletion_rates: gapFill.depletion_rates,
      events: outputEvents,
    }
    await writeJsonFile(OUTPUT_PATH, outputFile)

    processed++
  }

  if (!dryRun) {
    console.log(`\nScored ${processed} events. Total in output: ${outputEvents.length}`)
    console.log(`Written to ${OUTPUT_PATH}`)
  }
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
