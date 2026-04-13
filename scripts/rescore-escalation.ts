// scripts/rescore-escalation.ts
// Re-scores escalation data for all enriched events using the three-layer
// framework (per-actor, perceived, dyadic) from escalation-framework.ts.
//
// Keeps all existing content (briefings, chronicles, decision analysis) intact.
// Only replaces the `escalation` block on each event.
//
// Usage:
//   bun run scripts/rescore-escalation.ts
//   bun run scripts/rescore-escalation.ts --from=evt_id   # resume from event
//   bun run scripts/rescore-escalation.ts --dry-run       # print first 3, no write

import Anthropic from "@anthropic-ai/sdk"
import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import { ESCALATION_FRAMEWORK_PROMPT } from "./pipeline/escalation-framework"
import type { EnrichedEvent, EscalationData } from "./pipeline/types"

interface EnrichedFile {
  _meta: Record<string, unknown>
  events: EnrichedEvent[]
}

export function buildRescorePrompt(event: EnrichedEvent, priorDyadState: string): string {
  return `You are re-scoring the escalation state for a single geopolitical simulation event.
Your job is ONLY to produce the escalation JSON block — nothing else.

${ESCALATION_FRAMEWORK_PROMPT}

EVENT:
ID: ${event.id}
Date: ${event.timestamp}
Title: ${event.title}
Description: ${event.description}

What actually happened (from the full briefing):
${event.full_briefing.situation}

Decision taken:
${event.decision_analysis.decision_summary ?? "Not a decision point"}

Prior dyad state (carry forward any thresholds already crossed — do NOT regress them):
${priorDyadState}

Score each actor's position FROM THEIR OWN PERSPECTIVE using the framework criteria.
Remember: the US executing a precision strike on an Iranian nuclear facility is Level 3
from the US perspective (limited overt military, constrained targeting) even though
Iran experiences it differently. Score each actor by what THEY did, not what was done TO them.

Output ONLY a JSON object with this exact shape:
{
  "by_actor": {
    "united_states": { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "[one sentence citing which criteria drove this]" },
    "iran":          { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." },
    "israel":        { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." },
    "russia":        { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." },
    "china":         { "rung": [0-20], "level": [0-7], "level_name": "...", "criteria_rationale": "..." }
  },
  "perceived": {
    "iran_perceives_us":     { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "[one sentence: intel basis for this estimate]" },
    "us_perceives_iran":     { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "..." },
    "israel_perceives_iran": { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "..." },
    "russia_perceives_us":   { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "..." },
    "china_perceives_us":    { "estimated_rung": [0-20], "confidence": "high|moderate|low", "rationale": "..." }
  },
  "dyads": {
    "us_iran":         { "highest_threshold_crossed": "thresh_id or null", "thresholds_intact": ["thresh_id", ...], "escalation_asymmetry": [us_rung - iran_rung], "last_crossing_event_id": "evt_id or null" },
    "israel_iran":     { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "us_israel":       { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "us_houthis":      { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "iran_houthis":    { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "us_hezbollah":    { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "iran_hezbollah":  { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "us_iraqi_militia":   { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "iran_iraqi_militia": { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "us_russia":       { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." },
    "us_china":        { "highest_threshold_crossed": "...", "thresholds_intact": [...], "escalation_asymmetry": [number], "last_crossing_event_id": "..." }
  },
  "global_ceiling": [highest rung any actor has reached so far],
  "direction": "up" | "down" | "lateral" | "none"
}

Output ONLY the JSON object. No prose outside the JSON.`
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const MAX_RETRIES = 6
  let delay = 15000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages
        .stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        })
        .finalText()
    } catch (err: unknown) {
      const msg = String(err)
      const isOverloaded = msg.includes("overloaded") || msg.includes("529")
      const isRateLimit = msg.includes("rate_limit") || msg.includes("429")
      if ((isOverloaded || isRateLimit) && attempt < MAX_RETRIES) {
        console.log(`  [retry ${attempt}/${MAX_RETRIES - 1}] ${isOverloaded ? "Overloaded" : "Rate limit"} — waiting ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
        delay = Math.min(delay * 2, 120000)
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}

export function parseRescoreResponse(raw: string, eventId: string): EscalationData {
  let parsed: unknown
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const content = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse rescore response for ${eventId}: not valid JSON`)
  }

  const res = parsed as Record<string, unknown>
  for (const field of ["by_actor", "perceived", "dyads", "global_ceiling", "direction"]) {
    if (res[field] === undefined) {
      throw new Error(`Rescore response for ${eventId} missing field: ${field}`)
    }
  }

  return res as unknown as EscalationData
}

export function buildPriorDyadSummary(events: EnrichedEvent[]): string {
  if (events.length === 0) {
    return "No prior events — all dyads start at baseline (no thresholds crossed)."
  }

  // Get the most recent event that has the new escalation structure
  const lastWithDyads = [...events].reverse().find(
    e => e.escalation && typeof e.escalation === 'object' && 'dyads' in e.escalation
  )

  if (!lastWithDyads) {
    return "Prior events exist but used old escalation format — infer dyad state from context."
  }

  const dyads = (lastWithDyads.escalation as EscalationData).dyads
  return JSON.stringify(dyads, null, 2)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith("--from="))?.split("=")[1]
  const dryRun = args.includes("--dry-run")

  const client = new Anthropic()
  const file = await readJsonFile<EnrichedFile>("data/iran-enriched.json")
  const events = file.events

  const startIndex = fromEventId
    ? events.findIndex(e => e.id === fromEventId)
    : 0

  if (fromEventId && startIndex === -1) {
    throw new Error(`--from event '${fromEventId}' not found`)
  }

  const allInRange = events.slice(startIndex < 0 ? 0 : startIndex)
  const toRescore = allInRange.filter(e => !e.escalation || !('dyads' in e.escalation))
  const skipped = allInRange.length - toRescore.length
  console.log(`Rescoring ${toRescore.length} events (${skipped} already have new format, skipping)\n`)

  const dryRunLimit = 3
  let rescored = 0

  for (let i = 0; i < toRescore.length; i++) {
    const event = toRescore[i]
    const eventIndex = events.findIndex(e => e.id === event.id)

    console.log(`  [${i + 1}/${toRescore.length}] ${event.id}...`)

    if (dryRun && rescored >= dryRunLimit) {
      console.log(`  [dry-run] Stopping after ${dryRunLimit} events.`)
      break
    }

    // Pass dyad state from all events processed so far (ensures no regression)
    const priorEvents = events.slice(0, eventIndex)
    const priorDyadState = buildPriorDyadSummary(priorEvents)

    const prompt = buildRescorePrompt(event, priorDyadState)
    const raw = await callClaude(client, prompt)
    const newEscalation = parseRescoreResponse(raw, event.id)

    if (dryRun) {
      console.log(`  [dry-run] Escalation for ${event.id}:`)
      console.log(JSON.stringify(newEscalation, null, 2))
      rescored++
      continue
    }

    // Replace escalation block in-place
    events[eventIndex] = { ...event, escalation: newEscalation }

    // Save incrementally
    await writeJsonFile("data/iran-enriched.json", {
      _meta: { ...file._meta, lastRescored: new Date().toISOString(), rescoredCount: eventIndex + 1 },
      events,
    })

    rescored++
  }

  if (!dryRun) {
    console.log(`\n✓ Rescored ${rescored} events in data/iran-enriched.json`)
    console.log("Next: Run scripts/seed-iran.ts to push to Supabase")
  }
}

if (process.argv[1] === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
