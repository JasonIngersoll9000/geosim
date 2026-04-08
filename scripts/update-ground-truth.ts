// scripts/update-ground-truth.ts
// Incremental ground truth updater — one script to pull new events, enrich them,
// and append them to the Supabase trunk branch.
//
// Usage:
//   bun run scripts/update-ground-truth.ts
//     → detects last event date, calls Claude for new events, enriches, seeds
//
//   bun run scripts/update-ground-truth.ts --through=2026-06-01
//     → caps the update at a specific date
//
//   bun run scripts/update-ground-truth.ts --research-doc=docs/update-may.md
//     → extracts events from a new research doc instead of Claude knowledge call
//
//   bun run scripts/update-ground-truth.ts --dry-run
//     → prints what would be added without writing anything
//
// Reads:  data/iran-timeline-filtered.json  (existing events — for dedup)
//         data/iran-enriched.json           (existing enriched — for context chain + from date)
//         data/actor-profiles.json          (for enrichment)
//         data/key-figures.json             (for enrichment)
//
// Writes: data/iran-timeline-filtered.json  (appended with new events)
//         data/iran-enriched.json           (appended with enriched new events)
// Then:   calls seed-iran.ts --from=<first new event id>

import Anthropic from "@anthropic-ai/sdk"
import { readFile } from "fs/promises"
import { join } from "path"
import {
  readJsonFile,
  writeJsonFile,
  slugifyEventId,
  buildContextChainString,
} from "./pipeline/utils"
import { buildExtractionPrompt, parseExtractionResponse } from "./extract-timeline"
import {
  buildEnrichmentPrompt,
  parseEnrichedResponse,
} from "./enrich-timeline"
import type {
  TimelineEvent,
  EnrichedEvent,
  ActorProfile,
  KeyFigureProfile,
} from "./pipeline/types"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FilteredFile {
  _meta: Record<string, unknown>
  events: TimelineEvent[]
}

interface EnrichedFile {
  _meta: Record<string, unknown>
  events: EnrichedEvent[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Research call — used when no --research-doc is provided
// Asks Claude to surface new events from its knowledge between two dates.
// ─────────────────────────────────────────────────────────────────────────────

export function buildKnowledgeUpdatePrompt(
  fromDate: string,
  throughDate: string,
  recentSummaries: string[],
  existingTitles: string[]
): string {
  const summaryContext = recentSummaries.length > 0
    ? `\nThe most recent events already captured (do NOT re-extract these):\n${recentSummaries.join("\n")}`
    : ""

  const titleContext = existingTitles.length > 0
    ? `\nExisting event titles (skip anything matching these):\n${existingTitles.slice(-30).join("\n")}`
    : ""

  return `You are updating a geopolitical simulation timeline for a scenario tracking the 2026 Iran conflict.

The simulation currently has events through ${fromDate}. Extract all significant new events from ${fromDate} (exclusive) through ${throughDate} (inclusive).

Focus on:
- Military operations, strikes, and force movements
- Diplomatic decisions and negotiations
- Nuclear program developments
- Iranian proxy activity (Yemen, Iraq, Lebanon, Syria)
- US domestic political decisions affecting the conflict
- Israeli military decisions
- Gulf state responses
- Economic/energy infrastructure attacks (these affect the simulation state)
- Ceasefire or escalation turning points
${summaryContext}
${titleContext}

For every qualifying event, output a JSON object with this exact shape:
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
  "source_excerpt": "Brief factual basis for this event"
}

Rules:
- Output ONLY a JSON array. No prose, no markdown fences, no commentary.
- Strict chronological order by timestamp.
- Leave "id" as empty string.
- "is_decision" = true only for actor choices that could have gone differently.
- If no new events exist in this window, output an empty array: []
- Do NOT include events already listed above.`
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  return client.messages
    .stream({
      model: "claude-sonnet-4-6",
      max_tokens: 32000,
      messages: [{ role: "user", content: prompt }],
    })
    .finalText()
}

// Web-search-enabled call — runs the agentic loop until end_turn.
// Uses Anthropic's built-in web_search tool (server-side execution).
async function callClaudeWithWebSearch(client: Anthropic, prompt: string): Promise<string> {
  type MessageParam = Anthropic.MessageParam
  const messages: MessageParam[] = [{ role: "user", content: prompt }]

  while (true) {
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 32000,
        tools: [{ type: "web_search_20250305" as "web_search_20250305", name: "web_search" }],
        messages,
      },
      { headers: { "anthropic-beta": "web-search-2025-03-05" } }
    )

    if (response.stop_reason === "end_turn") {
      return response.content
        .filter(b => b.type === "text")
        .map(b => (b as Anthropic.TextBlock).text)
        .join("")
    }

    // Tool use loop — add assistant turn, then pass tool results to continue
    messages.push({ role: "assistant", content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = response.content
      .filter(b => b.type === "tool_use")
      .map(b => {
        const tu = b as Anthropic.ToolUseBlock
        // For web_search the results are injected server-side.
        // We pass an ack so the model can continue.
        return {
          type: "tool_result" as const,
          tool_use_id: tu.id,
          content: (tu as unknown as Record<string, unknown>).results as string ?? "",
        }
      })

    if (toolResults.length === 0) {
      // Unexpected stop — return whatever text we have
      return response.content
        .filter(b => b.type === "text")
        .map(b => (b as Anthropic.TextBlock).text)
        .join("")
    }

    messages.push({ role: "user", content: toolResults })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication — check new events against existing by ID and title similarity
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()
}

function isDuplicate(candidate: TimelineEvent, existing: TimelineEvent[]): boolean {
  // Exact ID match
  if (existing.some(e => e.id === candidate.id)) return true

  // Same-day + high title similarity
  const sameDayEvents = existing.filter(e => e.timestamp === candidate.timestamp)
  const nc = normalize(candidate.title)
  for (const e of sameDayEvents) {
    const ne = normalize(e.title)
    if (nc === ne) return true
    // Jaccard similarity
    const wa = new Set(nc.split(" "))
    const wb = new Set(ne.split(" "))
    const intersection = [...wa].filter(w => wb.has(w)).length
    const union = new Set([...wa, ...wb]).size
    if (intersection / union > 0.55) return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrich a batch of new events (reuses enrich-timeline logic)
// ─────────────────────────────────────────────────────────────────────────────

async function enrichNewEvents(
  client: Anthropic,
  newEvents: TimelineEvent[],
  existingEnriched: EnrichedEvent[],
  actorProfiles: ActorProfile[],
  dryRun: boolean
): Promise<EnrichedEvent[]> {
  const priorSummaries: string[] = existingEnriched.map(e => e.context_summary)
  let lastFullBriefing: string | null =
    existingEnriched.length > 0
      ? JSON.stringify(existingEnriched[existingEnriched.length - 1].full_briefing)
      : null

  const enriched: EnrichedEvent[] = []

  for (let i = 0; i < newEvents.length; i++) {
    const event = newEvents[i]
    console.log(`  [${i + 1}/${newEvents.length}] Enriching ${event.id}...`)

    if (dryRun) {
      console.log(`  [dry-run] Would enrich: ${event.title}`)
      continue
    }

    const contextChain = buildContextChainString(
      "Iran conflict simulation — incremental update.",
      priorSummaries,
      lastFullBriefing
    )
    const prompt = buildEnrichmentPrompt(event, contextChain, actorProfiles)
    const raw = await callClaude(client, prompt)
    const enrichment = parseEnrichedResponse(raw, event.id)

    const enrichedEvent: EnrichedEvent = { ...event, ...enrichment }
    enriched.push(enrichedEvent)

    priorSummaries.push(enrichment.context_summary)
    lastFullBriefing = JSON.stringify(enrichment.full_briefing)
  }

  return enriched
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const throughArg = args.find(a => a.startsWith("--through="))?.split("=")[1]
  const researchDocArg = args.find(a => a.startsWith("--research-doc="))?.split("=")[1]
  const dryRun = args.includes("--dry-run")

  const throughDate = throughArg ?? new Date().toISOString().slice(0, 10)

  console.log("── Ground Truth Update ─────────────────────────────────────────\n")

  // ── Load existing data ──────────────────────────────────────────────────

  const filteredFile = await readJsonFile<FilteredFile>("data/iran-timeline-filtered.json")
  const enrichedFile = await readJsonFile<EnrichedFile>("data/iran-enriched.json")
  const actorProfiles = await readJsonFile<ActorProfile[]>("data/actor-profiles.json")
  await readJsonFile<KeyFigureProfile[]>("data/key-figures.json")

  const existingEvents = filteredFile.events
  const existingEnriched = enrichedFile.events

  // Detect from date — last enriched event timestamp
  const lastEnrichedDate = existingEnriched.length > 0
    ? existingEnriched[existingEnriched.length - 1].timestamp
    : existingEvents[existingEvents.length - 1]?.timestamp ?? "2026-01-01"

  console.log(`From: ${lastEnrichedDate} (exclusive)`)
  console.log(`Through: ${throughDate}`)
  console.log(`Existing events: ${existingEvents.length} filtered, ${existingEnriched.length} enriched\n`)

  if (lastEnrichedDate >= throughDate) {
    console.log("Nothing to update — enriched timeline is already at or past the through date.")
    return
  }

  // ── Step 1: Fetch new raw events ────────────────────────────────────────

  const client = new Anthropic()
  let newRaw: TimelineEvent[]

  if (researchDocArg) {
    // Extract from a provided research doc
    console.log(`Step 1: Extracting from ${researchDocArg}...`)
    const content = await readFile(join(process.cwd(), researchDocArg), "utf-8")
    const prompt = buildExtractionPrompt(researchDocArg, content)
    const raw = await callClaude(client, prompt)
    newRaw = parseExtractionResponse(raw, researchDocArg)
    console.log(`  → ${newRaw.length} events extracted`)
  } else {
    // Use Claude with web search to fetch real current events
    console.log(`Step 1: Searching for events from ${lastEnrichedDate} → ${throughDate}...`)
    const recentSummaries = existingEnriched.slice(-5).map(
      e => `${e.timestamp} | ${e.title}`
    )
    const existingTitles = existingEvents.map(e => e.title)
    const prompt = buildKnowledgeUpdatePrompt(
      lastEnrichedDate,
      throughDate,
      recentSummaries,
      existingTitles
    )
    const raw = await callClaudeWithWebSearch(client, prompt)
    const start = raw.indexOf("[")
    const end = raw.lastIndexOf("]")
    const content = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw.trim()
    newRaw = (JSON.parse(content) as TimelineEvent[]).map(e => ({
      ...e,
      id: e.id || slugifyEventId(e),
    }))
    console.log(`  → ${newRaw.length} events returned`)
  }

  // Filter to the requested date window
  const inWindow = newRaw.filter(
    e => e.timestamp > lastEnrichedDate && e.timestamp <= throughDate
  )
  console.log(`  → ${inWindow.length} events in window [${lastEnrichedDate}, ${throughDate}]`)

  // ── Step 2: Deduplicate against existing ────────────────────────────────

  console.log("\nStep 2: Deduplicating...")
  const deduped = inWindow.filter(e => !isDuplicate(e, existingEvents))
  const dropped = inWindow.length - deduped.length
  console.log(`  → ${dropped} duplicates removed, ${deduped.length} new events`)

  if (deduped.length === 0) {
    console.log("\nNo new events to add.")
    return
  }

  deduped.forEach(e => console.log(`  + ${e.timestamp} | ${e.title}`))

  if (dryRun) {
    console.log("\n[dry-run] Would append the above events. No files written.")
    return
  }

  // ── Step 3: Append to filtered timeline ────────────────────────────────

  console.log("\nStep 3: Updating iran-timeline-filtered.json...")
  const updatedFiltered: FilteredFile = {
    _meta: {
      ...filteredFile._meta,
      lastUpdated: new Date().toISOString(),
      final_count: existingEvents.length + deduped.length,
    },
    events: [...existingEvents, ...deduped].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    ),
  }
  await writeJsonFile("data/iran-timeline-filtered.json", updatedFiltered)
  console.log(`  ✓ ${deduped.length} events appended`)

  // ── Step 4: Enrich new events ───────────────────────────────────────────

  console.log("\nStep 4: Enriching new events...")
  const newEnriched = await enrichNewEvents(
    client,
    deduped,
    existingEnriched,
    actorProfiles,
    dryRun
  )

  // Append to enriched file incrementally
  const updatedEnriched: EnrichedFile = {
    _meta: {
      lastUpdated: new Date().toISOString(),
      totalEnriched: existingEnriched.length + newEnriched.length,
    },
    events: [...existingEnriched, ...newEnriched],
  }
  await writeJsonFile("data/iran-enriched.json", updatedEnriched)
  console.log(`  ✓ ${newEnriched.length} events enriched`)

  // ── Step 5: Seed to Supabase ────────────────────────────────────────────

  const firstNewId = deduped[0].id
  console.log(`\nStep 5: Seeding to Supabase (append from ${firstNewId})...`)

  const proc = Bun.spawn(
    ["bun", "run", "scripts/seed-iran.ts", `--from=${firstNewId}`],
    { stdout: "inherit", stderr: "inherit", cwd: process.cwd() }
  )
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`seed-iran.ts exited with code ${exitCode}`)
  }

  console.log("\n── Update complete ─────────────────────────────────────────────")
  console.log(`Added ${deduped.length} new events to ground truth trunk.`)
  console.log(`Timeline now covers through ${deduped[deduped.length - 1].timestamp}.`)
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
