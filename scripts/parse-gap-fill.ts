// scripts/parse-gap-fill.ts
// Phase 5a: Parse gap-fill research results markdown into structured JSON.
//
// Usage:
//   bun run scripts/parse-gap-fill.ts
//   bun run scripts/parse-gap-fill.ts --dry-run
//
// Reads:  docs/Iran Research/research-gap-fill-results.md
//         data/capabilities-*.json  (pre-war baselines as context)
//
// Writes: data/iran-gap-fill.json

import Anthropic from "@anthropic-ai/sdk"
import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type { GapFillData, RawCapability } from "./pipeline/types"
import { readFile } from "fs/promises"

const RESEARCH_MARKDOWN_PATH = "docs/Iran Research/research-gap-fill-results.md"

const CAPABILITY_FILES: Record<string, string> = {
  united_states: "data/capabilities-us.json",
  iran: "data/capabilities-iran.json",
  israel: "data/capabilities-israel.json",
  russia: "data/capabilities-russia-china.json",
  china: "data/capabilities-russia-china.json",
  gulf_states: "data/capabilities-gulf-states.json",
}

export function buildCapabilitiesSummary(caps: Record<string, RawCapability[]>): string {
  return Object.entries(caps)
    .map(([actorId, items]) => {
      const lines = items
        .map(c => `  - ${c.name}: ${c.quantity ?? "?"} ${c.unit ?? ""} (${c.deployment_status})`)
        .join("\n")
      return `${actorId}:\n${lines}`
    })
    .join("\n\n")
}

export function buildGapFillPrompt(markdown: string, capabilitiesSummary: string): string {
  return `You are extracting structured data from research notes about the US-Iran conflict
(February–April 2026). Pre-war baselines are provided below — focus on depletion trends
relative to those pre-war baselines,
current estimated status, inflection dates, and confidence levels.

PRE-WAR BASELINES (from capabilities files):
${capabilitiesSummary}

RESEARCH NOTES:
${markdown}

Output ONLY a single JSON object with this exact shape:
{
  "as_of_date": "YYYY-MM-DD",
  "sources_summary": "One sentence summarizing source quality.",
  "asset_inventory": {
    "actor_id": {
      "asset_type": {
        "estimated_remaining": [number],
        "unit": "missiles|aircraft|batteries|etc",
        "confidence": "high|medium|low",
        "notes": "One sentence."
      }
    }
  },
  "depletion_rates": {
    "actor_id": {
      "asset_type": [
        {
          "rate_per_day": [negative number],
          "effective_from": "YYYY-MM-DD",
          "effective_to": "YYYY-MM-DD or omit if still active",
          "notes": "One sentence."
        }
      ]
    }
  },
  "infrastructure_status": [
    {
      "facility_id": "slug_id",
      "name": "Full name",
      "actor_id": "actor_id",
      "facility_type": "nuclear|oil_gas|military_base|port|power_grid|civilian",
      "status": "operational|degraded|destroyed",
      "capacity_pct": [0-100],
      "lat": [number],
      "lng": [number],
      "strike_date": "YYYY-MM-DD or omit",
      "notes": "One sentence."
    }
  ],
  "global_variable_timeline": [
    {
      "date": "YYYY-MM-DD",
      "oil_price_usd": [number],
      "hormuz_throughput_pct": [0-100],
      "global_economic_stress": [0-100],
      "notes": "One sentence."
    }
  ],
  "casualties": {
    "actor_id": {
      "military_cumulative": [number],
      "civilian_cumulative": [number],
      "as_of_date": "YYYY-MM-DD",
      "confidence": "high|medium|low"
    }
  },
  "political_indicators": {
    "us_approval_pct": [number],
    "us_congressional_status": "One sentence.",
    "iran_domestic_status": "One sentence.",
    "nato_cohesion": "One sentence.",
    "as_of_date": "YYYY-MM-DD"
  }
}

Output ONLY the JSON. No prose outside the JSON.`
}

// Helper used by both parseGapFillResponse and mergeGapFillParts
function extractJson(raw: string): string {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end <= start) throw new Error("No JSON object found in response")
  return raw.slice(start, end + 1)
}

export function buildGapFillPromptPart1(markdown: string, capabilitiesSummary: string): string {
  return `You are extracting structured data from research notes about the US-Iran conflict
(February–April 2026). Pre-war baselines are provided below.

PRE-WAR BASELINES (from capabilities files):
${capabilitiesSummary}

RESEARCH NOTES:
${markdown}

Output ONLY a JSON object with this exact shape (no other fields):
{
  "as_of_date": "YYYY-MM-DD",
  "sources_summary": "One sentence.",
  "asset_inventory": {
    "actor_id": {
      "asset_type": {
        "estimated_remaining": [number],
        "unit": "string",
        "confidence": "high|medium|low",
        "notes": "One sentence max."
      }
    }
  },
  "depletion_rates": {
    "actor_id": {
      "asset_type": [
        {
          "rate_per_day": [negative number],
          "effective_from": "YYYY-MM-DD",
          "effective_to": "YYYY-MM-DD or omit",
          "notes": "One sentence max."
        }
      ]
    }
  }
}

Be maximally concise. Max 6 assets per actor. Max 2 depletion periods per asset.
Output ONLY the JSON. No prose outside the JSON.`
}

export function buildGapFillPromptPart2(markdown: string): string {
  return `You are extracting structured data from research notes about the US-Iran conflict
(February–April 2026).

RESEARCH NOTES:
${markdown}

Output ONLY a JSON object with this exact shape (no other fields):
{
  "infrastructure_status": [
    {
      "facility_id": "slug_id",
      "name": "Full name",
      "actor_id": "actor_id",
      "facility_type": "nuclear|oil_gas|military_base|port|power_grid|civilian",
      "status": "operational|degraded|destroyed",
      "capacity_pct": [0-100],
      "lat": [number],
      "lng": [number],
      "strike_date": "YYYY-MM-DD or omit",
      "notes": "One sentence max."
    }
  ],
  "global_variable_timeline": [
    {
      "date": "YYYY-MM-DD",
      "oil_price_usd": [number],
      "hormuz_throughput_pct": [0-100],
      "global_economic_stress": [0-100],
      "notes": "One sentence max."
    }
  ],
  "casualties": {
    "actor_id": {
      "military_cumulative": [number],
      "civilian_cumulative": [number],
      "as_of_date": "YYYY-MM-DD",
      "confidence": "high|medium|low"
    }
  },
  "political_indicators": {
    "us_approval_pct": [number],
    "us_congressional_status": "One sentence.",
    "iran_domestic_status": "One sentence.",
    "nato_cohesion": "One sentence.",
    "as_of_date": "YYYY-MM-DD"
  }
}

Be maximally concise. Max 15 infrastructure facilities. Max 8 timeline data points.
Output ONLY the JSON. No prose outside the JSON.`
}

export function mergeGapFillParts(
  part1Raw: string,
  part2Raw: string
): GapFillData {
  // Parse part1 (has as_of_date, sources_summary, asset_inventory, depletion_rates)
  const p1 = JSON.parse(extractJson(part1Raw)) as Record<string, unknown>
  // Parse part2 (has infrastructure_status, global_variable_timeline, casualties, political_indicators)
  const p2 = JSON.parse(extractJson(part2Raw)) as Record<string, unknown>

  const merged = { ...p1, ...p2 }

  // Validate all required fields are present
  for (const field of ["as_of_date", "sources_summary", "asset_inventory", "depletion_rates",
                        "infrastructure_status", "global_variable_timeline", "casualties", "political_indicators"]) {
    if (merged[field] === undefined) {
      throw new Error(`Merged gap-fill missing field: ${field}`)
    }
  }

  return merged as unknown as GapFillData
}

export function parseGapFillResponse(raw: string): GapFillData {
  if (!raw) throw new Error("Claude returned no text content for gap-fill extraction")
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    throw new Error("Failed to parse gap-fill response: not valid JSON")
  }

  const res = parsed as Record<string, unknown>
  for (const field of [
    "as_of_date",
    "sources_summary",
    "asset_inventory",
    "depletion_rates",
    "infrastructure_status",
    "global_variable_timeline",
    "casualties",
    "political_indicators",
  ]) {
    if (res[field] === undefined) {
      throw new Error(`Gap-fill response missing field: ${field}`)
    }
  }

  return res as unknown as GapFillData
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const MAX_RETRIES = 6
  let delay = 15000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages
        .stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
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

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  // Load research markdown
  let markdown: string
  try {
    markdown = await readFile(RESEARCH_MARKDOWN_PATH, "utf-8")
  } catch {
    throw new Error(
      `Research results not found at ${RESEARCH_MARKDOWN_PATH}\n` +
        `Run the prompts in docs/Iran Research/research-gap-fill-prompts.md first.`
    )
  }

  // Load capabilities for pre-war baseline context
  const capsByActor: Record<string, RawCapability[]> = {}
  for (const [actorId, filePath] of Object.entries(CAPABILITY_FILES)) {
    try {
      const caps = await readJsonFile<RawCapability[]>(filePath)
      const filtered =
        actorId === "russia" || actorId === "china"
          ? caps.filter(c => c.actor === actorId)
          : caps
      capsByActor[actorId] = filtered
    } catch {
      // Missing capability file is non-fatal
    }
  }

  const capabilitiesSummary = buildCapabilitiesSummary(capsByActor)

  const client = new Anthropic()

  console.log("Part 1: Extracting asset inventory and depletion rates...")
  const prompt1 = buildGapFillPromptPart1(markdown, capabilitiesSummary)
  const raw1 = await callClaude(client, prompt1)

  console.log("Part 2: Extracting infrastructure, global variables, casualties, political...")
  const prompt2 = buildGapFillPromptPart2(markdown)
  const raw2 = await callClaude(client, prompt2)

  const gapFill = mergeGapFillParts(raw1, raw2)

  if (dryRun) {
    console.log("[dry-run] Parsed gap-fill data:")
    console.log(JSON.stringify(gapFill, null, 2))
    return
  }

  await writeJsonFile("data/iran-gap-fill.json", gapFill)
  console.log(`Written to data/iran-gap-fill.json`)
  console.log(`  Actors with inventory: ${Object.keys(gapFill.asset_inventory).join(", ")}`)
  console.log(`  Facilities tracked: ${gapFill.infrastructure_status.length}`)
  console.log(`  Timeline points: ${gapFill.global_variable_timeline.length}`)
}

if (process.argv[1] === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
