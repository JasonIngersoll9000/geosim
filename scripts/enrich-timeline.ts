// scripts/enrich-timeline.ts
// Phase 4: Enrich timeline events with briefings, chronicles, and context chain.
//
// Usage:
//   bun run scripts/enrich-timeline.ts
//   bun run scripts/enrich-timeline.ts --from=evt_id   # resume from event
//   bun run scripts/enrich-timeline.ts --no-pause      # skip quality checkpoint
//
// Reads:  data/iran-timeline-filtered.json  (filter-timeline.ts output, after human review)
//         data/actor-profiles.json     (Phase 3 output)
//         data/key-figures.json        (Phase 3 output)
//
// Writes: data/iran-enriched.json     (updated incrementally after each event)
//
// QUALITY CHECKPOINT: After the first 10 events, the script pauses and prints
// a review summary. Run with --no-pause to skip.

import Anthropic from "@anthropic-ai/sdk"
import { readJsonFile, writeJsonFile, buildContextChainString } from "./pipeline/utils"
import { ESCALATION_FRAMEWORK_PROMPT } from "./pipeline/escalation-framework"
import type {
  TimelineEvent,
  EnrichedEvent,
  ActorProfile,
  KeyFigureProfile,
  FullBriefing,
  ChronicleData,
  DecisionAnalysisRaw,
  EscalationData,
} from "./pipeline/types"

const QUALITY_CHECKPOINT_AFTER = 10

interface RawTimelineFile {
  _meta: Record<string, unknown>
  _duplicates: unknown[]
  events: TimelineEvent[]
}

interface EnrichedOutput {
  _meta: Record<string, unknown>
  events: EnrichedEvent[]
}

interface ParsedEnrichment {
  full_briefing: FullBriefing
  chronicle: ChronicleData
  context_summary: string
  decision_analysis: DecisionAnalysisRaw
  escalation: EscalationData
}

export function buildEnrichmentContext(
  background: string,
  priorSummaries: string[],
  lastFullBriefing: string | null,
  _actorProfiles: ActorProfile[]
): string {
  return buildContextChainString(background, priorSummaries, lastFullBriefing)
}

export function buildEnrichmentPrompt(
  event: TimelineEvent,
  contextChain: string,
  actorProfiles: ActorProfile[]
): string {
  const profileSummaries = actorProfiles
    .map(p => `${p.id}: ${p.strategic_doctrine}`)
    .join("\n\n")

  return `You are enriching a timeline event for a geopolitical simulation. Your output will be displayed to players as their intelligence briefing and historical chronicle.

CRITICAL: Every text field must be a full paragraph (minimum 4-5 sentences). No one-liners.

${ESCALATION_FRAMEWORK_PROMPT}

Event to enrich:
${JSON.stringify(event, null, 2)}

Context chain (what has happened so far):
${contextChain}

Actor strategic doctrines (for actor perspectives and why_not_chosen):
${profileSummaries}

Output a single JSON object:
{
  "full_briefing": {
    "situation": "[Full paragraph: what is happening RIGHT NOW. Specific assets named, figures named, precise locations.]",
    "actor_perspectives": {
      "united_states": "[Full paragraph: US intelligence picture — what they know, what they don't, fog of war applied.]",
      "iran": "[Full paragraph: Iran's perspective and assessment.]",
      "israel": "[Full paragraph: Israel's perspective and assessment.]"
    },
    "context": "[Full paragraph: how this event connects to the larger arc.]"
  },
  "chronicle": {
    "headline": "[Sharp, newspaper-style headline. Max 12 words.]",
    "date_label": "[E.g.: 'Day 3 of Operation Epic Fury — March 2, 2026']",
    "entry": "[4 paragraphs: (1) What happened; (2) Human dimension; (3) Economic/diplomatic consequences; (4) What this means going forward.]"
  },
  "context_summary": "[One paragraph, 4-5 sentences. Captures: what happened, who decided it, what it cost, what it changed. Fed as context to all future turns.]",
  "decision_analysis": {
    "is_decision_point": true | false,
    "deciding_actor_id": "...",
    "decision_summary": "[One sentence: '[Actor] chose to [action]']",
    "alternatives": [
      {
        "label": "...",
        "description": "[Full paragraph: what this alternative would have looked like]",
        "escalation_direction": "up" | "down" | "lateral" | "none",
        "escalation_level": [0-20],
        "why_not_chosen": "[Full paragraph: actor's specific psychology and constraints]"
      }
    ]
  },
  "escalation": {
    "by_actor": {
      "united_states": { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "[One sentence: which criteria drove this score from US perspective]" },
      "iran":          { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." },
      "israel":        { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." },
      "russia":        { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." },
      "china":         { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." }
    },
    "perceived": {
      "iran_perceives_us":    { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "[One sentence: what intel basis]" },
      "us_perceives_iran":    { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "..." },
      "israel_perceives_iran":{ "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "..." }
    },
    "dyads": {
      "us_iran":    { "highest_threshold_crossed": "thresh_id or null", "thresholds_intact": ["thresh_id", ...], "escalation_asymmetry": [number], "last_crossing_event_id": "evt_id or null" },
      "israel_iran":{ "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
      "us_houthis": { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
      "iran_houthis":{ "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." }
    },
    "global_ceiling": [0-20],
    "direction": "up" | "down" | "lateral" | "none"
  }
}

Output ONLY the JSON object. No prose outside the JSON.`
}

export function parseEnrichedResponse(raw: string, eventId: string): ParsedEnrichment {
  let parsed: unknown
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const content = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse enrichment response for ${eventId}: not valid JSON`)
  }

  const res = parsed as Record<string, unknown>
  const required = ["full_briefing", "chronicle", "context_summary", "decision_analysis", "escalation"]
  for (const section of required) {
    if (!res[section]) {
      throw new Error(`Enrichment response for ${eventId} missing required section: ${section}`)
    }
  }

  return {
    full_briefing: res.full_briefing as FullBriefing,
    chronicle: res.chronicle as ChronicleData,
    context_summary: res.context_summary as string,
    decision_analysis: res.decision_analysis as DecisionAnalysisRaw,
    escalation: res.escalation as EscalationData,
  }
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const MAX_RETRIES = 6
  let delay = 15000 // 15s initial backoff for overloaded errors

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages
        .stream(
          {
            model: "claude-sonnet-4-6",
            max_tokens: 32000,
            messages: [{ role: "user", content: prompt }],
          },
          { timeout: 900000 } // 15 minutes — long context chains near end of timeline
        )
        .finalText()
    } catch (err: unknown) {
      const msg = String(err)
      const isOverloaded = msg.includes("overloaded") || msg.includes("529")
      const isRateLimit = msg.includes("rate_limit") || msg.includes("429")
      const isTimeout = msg.includes("timed out") || msg.includes("timeout") || msg.includes("ETIMEDOUT")
      const isConnection = msg.includes("ECONNRESET") || msg.includes("ECONNREFUSED") || msg.includes("Connection error") || msg.includes("socket")

      if ((isOverloaded || isRateLimit || isTimeout || isConnection) && attempt < MAX_RETRIES) {
        console.log(`  [retry ${attempt}/${MAX_RETRIES - 1}] ${isOverloaded ? "Overloaded" : "Rate limit"} — waiting ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
        delay = Math.min(delay * 2, 120000) // cap at 2 minutes
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith("--from="))?.split("=")[1]
  const noPause = args.includes("--no-pause")

  const client = new Anthropic()

  const rawFile = await readJsonFile<RawTimelineFile>("data/iran-timeline-filtered.json")
  const profiles = await readJsonFile<ActorProfile[]>("data/actor-profiles.json")
  await readJsonFile<KeyFigureProfile[]>("data/key-figures.json")

  // Load existing enriched output for resumption
  let existingOutput: EnrichedOutput | null = null
  try {
    existingOutput = await readJsonFile<EnrichedOutput>("data/iran-enriched.json")
  } catch {
    // Starting fresh
  }

  const alreadyEnriched = new Set<string>(existingOutput?.events.map(e => e.id) ?? [])
  const enrichedEvents: EnrichedEvent[] = existingOutput?.events ?? []

  const events = rawFile.events.filter(e => !e.exclude)
  const startIndex = fromEventId ? events.findIndex(e => e.id === fromEventId) : 0
  const toProcess = events
    .slice(startIndex < 0 ? 0 : startIndex)
    .filter(e => !alreadyEnriched.has(e.id))

  console.log(`Phase 4: Enriching ${toProcess.length} events (${alreadyEnriched.size} already done)\n`)

  const BACKGROUND =
    enrichedEvents.length > 0
      ? "BACKGROUND_LOADED_FROM_PRIOR_RUN"
      : "Iran conflict simulation beginning February 2026."

  const priorSummaries: string[] = enrichedEvents.map(e => e.context_summary)
  let lastFullBriefing: string | null =
    enrichedEvents.length > 0
      ? JSON.stringify(enrichedEvents[enrichedEvents.length - 1].full_briefing)
      : null

  for (let i = 0; i < toProcess.length; i++) {
    const event = toProcess[i]

    const contextChain = buildEnrichmentContext(BACKGROUND, priorSummaries, lastFullBriefing, profiles)
    const prompt = buildEnrichmentPrompt(event, contextChain, profiles)

    console.log(`  [${i + 1}/${toProcess.length}] ${event.id}...`)
    const raw = await callClaude(client, prompt)
    const enriched = parseEnrichedResponse(raw, event.id)

    const enrichedEvent: EnrichedEvent = { ...event, ...enriched }
    enrichedEvents.push(enrichedEvent)

    priorSummaries.push(enriched.context_summary)
    lastFullBriefing = JSON.stringify(enriched.full_briefing)

    // Save incrementally after every event
    await writeJsonFile("data/iran-enriched.json", {
      _meta: { lastUpdated: new Date().toISOString(), totalEnriched: enrichedEvents.length },
      events: enrichedEvents,
    })

    // Quality checkpoint
    if (
      !noPause &&
      i === QUALITY_CHECKPOINT_AFTER - 1 &&
      toProcess.length > QUALITY_CHECKPOINT_AFTER
    ) {
      console.log(`\n── QUALITY CHECKPOINT ──────────────────────────────────────────`)
      console.log(`First ${QUALITY_CHECKPOINT_AFTER} events enriched. Review data/iran-enriched.json.`)
      console.log(`Check:`)
      console.log(`  1. Are briefings paragraph-depth? (minimum 4-5 sentences each)`)
      console.log(`  2. Is context_summary using prior events correctly?`)
      console.log(`  3. Are decision alternatives plausible and psychology-grounded?`)
      console.log(`  4. Is fog-of-war applied in actor perspectives?`)
      console.log(``)
      console.log(
        `To continue: bun run scripts/enrich-timeline.ts --from=${toProcess[QUALITY_CHECKPOINT_AFTER].id} --no-pause`
      )
      console.log(`────────────────────────────────────────────────────────────────\n`)
      process.exit(0)
    }
  }

  console.log(`\nEnrichment complete: ${enrichedEvents.length} events in data/iran-enriched.json`)
  console.log("Next: Run scripts/seed-iran.ts to push to Supabase")
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
