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

export function parseGapFillResponse(raw: string): GapFillData {
  let parsed: unknown
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    const content = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
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
          ? caps.filter(c => (c as RawCapability & { actor?: string }).actor === actorId)
          : caps
      capsByActor[actorId] = filtered
    } catch {
      // Missing capability file is non-fatal
    }
  }

  const capabilitiesSummary = buildCapabilitiesSummary(capsByActor)
  const prompt = buildGapFillPrompt(markdown, capabilitiesSummary)

  console.log("Calling Claude to parse gap-fill research...")
  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  })
  const raw = response.content[0].type === "text" ? response.content[0].text : ""

  const gapFill = parseGapFillResponse(raw)

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

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
