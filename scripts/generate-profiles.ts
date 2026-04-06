// scripts/generate-profiles.ts
// Phase 3: Generate actor profiles and key figure biographies.
//
// Usage:
//   bun run scripts/generate-profiles.ts
//
// Reads:  data/capabilities-us.json, data/capabilities-iran.json,
//         data/capabilities-israel.json, data/capabilities-russia-china.json,
//         data/capabilities-gulf-states.json,
//         data/relationship-netanyahu-trump.json, data/relationship-iran-russia.json,
//         data/relationship-iran-china.json, data/relationship-us-gulf-states.json
//         docs/Iran Research/research-military.md
//         docs/Iran Research/research-political.md
//         docs/Iran Research/research-economic.md
//
// Writes: data/actor-profiles.json
//         data/key-figures.json

import Anthropic from "@anthropic-ai/sdk"
import { readFile } from "fs/promises"
import { join } from "path"
import { readJsonFile, writeJsonFile } from "./pipeline/utils"
import type { ActorProfile, KeyFigureProfile, RawCapability } from "./pipeline/types"

export const ACTOR_IDS = [
  "united_states",
  "iran",
  "israel",
  "russia",
  "china",
  "gulf_states",
] as const
export type ActorId = (typeof ACTOR_IDS)[number]

export interface KeyFigureSeed {
  id: string
  actor_id: ActorId
  name: string
  title: string
  role: string
  inferredNote?: string
}

export const KEY_FIGURES: KeyFigureSeed[] = [
  {
    id: "trump",
    actor_id: "united_states",
    name: "Donald Trump",
    title: "President of the United States",
    role: "president",
  },
  {
    id: "rubio",
    actor_id: "united_states",
    name: "Marco Rubio",
    title: "Secretary of State",
    role: "foreign_policy_principal",
  },
  {
    id: "hegseth",
    actor_id: "united_states",
    name: "Pete Hegseth",
    title: "Secretary of Defense",
    role: "defense_secretary",
  },
  {
    id: "netanyahu",
    actor_id: "israel",
    name: "Benjamin Netanyahu",
    title: "Prime Minister of Israel",
    role: "head_of_government",
  },
  {
    id: "mojtaba_khamenei",
    actor_id: "iran",
    name: "Mojtaba Khamenei",
    title: "Son of Supreme Leader / Emerging Power Figure",
    role: "succession_figure",
    inferredNote:
      "Mojtaba Khamenei has a very limited public record. His profile must be constructed primarily from inference based on his father's ideology, his IRGC relationships, and his known background. Every claim that is not directly documented must be labeled 'inferred' in the biography and current_context fields.",
  },
  {
    id: "pezeshkian",
    actor_id: "iran",
    name: "Masoud Pezeshkian",
    title: "President of Iran",
    role: "president",
  },
  {
    id: "araghchi",
    actor_id: "iran",
    name: "Abbas Araghchi",
    title: "Foreign Minister of Iran",
    role: "foreign_minister",
  },
  {
    id: "hajizadeh",
    actor_id: "iran",
    name: "Amir Ali Hajizadeh",
    title: "IRGC Aerospace Force Commander",
    role: "military_commander",
  },
  {
    id: "qaani",
    actor_id: "iran",
    name: "Esmail Qaani",
    title: "Quds Force Commander",
    role: "proxy_commander",
  },
  {
    id: "putin",
    actor_id: "russia",
    name: "Vladimir Putin",
    title: "President of Russia",
    role: "head_of_state",
  },
  {
    id: "xi",
    actor_id: "china",
    name: "Xi Jinping",
    title: "General Secretary / President of China",
    role: "head_of_state",
  },
  {
    id: "mbs",
    actor_id: "gulf_states",
    name: "Mohammed bin Salman",
    title: "Crown Prince / Prime Minister of Saudi Arabia",
    role: "de_facto_ruler",
  },
  {
    id: "mbz",
    actor_id: "gulf_states",
    name: "Mohammed bin Zayed",
    title: "President of the UAE",
    role: "head_of_state",
  },
]

const REQUIRED_PROFILE_FIELDS = [
  "id",
  "name",
  "short_name",
  "biographical_summary",
  "leadership_profile",
  "win_condition",
  "strategic_doctrine",
  "historical_precedents",
  "initial_scores",
  "intelligence_profile",
] as const

export function buildActorProfilePrompt(
  actorId: string,
  capabilities: RawCapability[],
  researchContent: string
): string {
  return `You are generating a comprehensive actor profile for a geopolitical simulation.
Actor: ${actorId}

TEMPORAL ANCHOR: Profile reflects the state of this actor as of January 2026 — before Operation Epic Fury began on February 28, 2026. Do not describe outcomes of the war.

CRITICAL: Every text field must be a full paragraph (minimum 4-5 sentences). No one-liners. These profiles are cached as the AI agent system prompt — they must contain enough depth for the agent to make realistic decisions.

Capabilities inventory (from verified research, anchored to January 2026):
${JSON.stringify(capabilities, null, 2)}

Research document excerpts:
${researchContent}

Output a single JSON object:
{
  "id": "${actorId}",
  "name": "...",
  "short_name": "...",
  "biographical_summary": "[2-3 paragraphs: strategic culture, historical motivations, how this country makes decisions at the national level across decades]",
  "leadership_profile": "[Full paragraph: current leader(s), biography and MO, past decisions defining current behavior, how they are processing THIS conflict as of January 2026]",
  "win_condition": "[Full paragraph: what winning looks like — not vague, specific outcomes they would accept vs. fight on for]",
  "strategic_doctrine": "[Full paragraph: risk tolerance, escalation ladder preferences, override conditions, red lines]",
  "historical_precedents": "[Full paragraph: 3-5 specific decisions that most define behavior going forward]",
  "initial_scores": {
    "militaryStrength": [0-100],
    "politicalStability": [0-100],
    "economicHealth": [0-100],
    "publicSupport": [0-100],
    "internationalStanding": [0-100],
    "escalationRung": [0-20]
  },
  "intelligence_profile": {
    "signalCapability": [0-100],
    "humanCapability": [0-100],
    "cyberCapability": [0-100],
    "blindSpots": ["...", "..."],
    "intelSharingPartners": ["...", "..."]
  }
}

Output ONLY the JSON object. No prose outside the JSON.`
}

export function parseActorProfileResponse(raw: string, actorId: string): ActorProfile {
  let parsed: unknown
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const content = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error(
      `Failed to parse actor profile response for ${actorId}: not valid JSON`
    )
  }

  const profile = parsed as Record<string, unknown>
  for (const field of REQUIRED_PROFILE_FIELDS) {
    if (!profile[field]) {
      throw new Error(
        `Actor profile for ${actorId} missing required field: ${field}`
      )
    }
  }

  return profile as unknown as ActorProfile
}

export function buildKeyFigurePrompt(
  figure: KeyFigureSeed,
  actorProfileText: string,
  researchMentions: string
): string {
  const inferredNote = figure.inferredNote ? `\nSPECIAL INSTRUCTION: ${figure.inferredNote}\n` : ""

  return `You are generating a key figure profile for a geopolitical simulation.
Figure: ${figure.name} (${figure.title})
Actor: ${figure.actor_id}
${inferredNote}
TEMPORAL ANCHOR: Profile reflects this figure's state as of January 2026.

CRITICAL: Every text field must be a full paragraph. These profiles are injected into the AI agent's system prompt.

Actor's overall profile (for context):
${actorProfileText}

Research document mentions of this figure:
${researchMentions}

Output a single JSON object:
{
  "id": "${figure.id}",
  "actor_id": "${figure.actor_id}",
  "name": "${figure.name}",
  "title": "${figure.title}",
  "role": "${figure.role}",
  "biography": "[Full paragraph: who they are, how they got here, formative experiences]",
  "motivations": "[Full paragraph: what they personally want from this conflict — distinct from their country's official goals]",
  "decision_style": "[Full paragraph: how they process decisions, who they listen to, what they fear]",
  "current_context": "[Full paragraph: how they are personally processing THIS situation as of January 2026]",
  "relationships": [],
  "provenance": "verified" | "inferred",
  "source_note": "..."
}

Output ONLY the JSON object. No prose outside the JSON.`
}

export function parseKeyFigureResponse(raw: string, figureId: string): KeyFigureProfile {
  let parsed: unknown
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const content = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw.trim()
    parsed = JSON.parse(content)
  } catch {
    throw new Error(
      `Failed to parse key figure response for ${figureId}: not valid JSON`
    )
  }

  const figure = parsed as Record<string, unknown>
  const required = ["id", "actor_id", "name", "biography", "motivations", "decision_style", "current_context"]
  for (const field of required) {
    if (!figure[field]) {
      throw new Error(`Key figure ${figureId} missing required field: ${field}`)
    }
  }

  return figure as unknown as KeyFigureProfile
}

async function readResearchDocs(): Promise<{ military: string; political: string; economic: string }> {
  const [military, political, economic] = await Promise.all([
    readFile(join(process.cwd(), "docs/Iran Research/research-military.md"), "utf-8"),
    readFile(join(process.cwd(), "docs/Iran Research/research-political.md"), "utf-8"),
    readFile(join(process.cwd(), "docs/Iran Research/research-economic.md"), "utf-8"),
  ])
  return { military, political, economic }
}

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  })
  return response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
}

async function loadCapabilities(actorId: string): Promise<RawCapability[]> {
  const fileMap: Record<string, string> = {
    united_states: "data/capabilities-us.json",
    iran: "data/capabilities-iran.json",
    israel: "data/capabilities-israel.json",
    russia: "data/capabilities-russia-china.json",
    china: "data/capabilities-russia-china.json",
    gulf_states: "data/capabilities-gulf-states.json",
  }
  const filePath = fileMap[actorId]
  if (!filePath) return []

  const all = await readJsonFile<RawCapability[]>(filePath)
  if (actorId === "russia" || actorId === "china") {
    return all.filter(c => c.actor === actorId)
  }
  return all
}

async function main(): Promise<void> {
  const client = new Anthropic()
  const docs = await readResearchDocs()
  const profiles: ActorProfile[] = []
  const allResearch = [docs.military, docs.political, docs.economic].join("\n\n---\n\n")

  console.log("Phase 3: Generating actor profiles...\n")

  for (const actorId of ACTOR_IDS) {
    console.log(`  Generating profile for ${actorId}...`)
    const capabilities = await loadCapabilities(actorId)
    const prompt = buildActorProfilePrompt(actorId, capabilities, allResearch)
    const raw = await callClaude(client, prompt)
    const profile = parseActorProfileResponse(raw, actorId)
    profiles.push(profile)
    console.log(`  ✓ ${actorId}`)
  }

  await writeJsonFile("data/actor-profiles.json", profiles)
  console.log(`\n✓ Saved ${profiles.length} actor profiles to data/actor-profiles.json`)

  console.log("\nGenerating key figure profiles...\n")
  const keyFigures: KeyFigureProfile[] = []

  for (const figure of KEY_FIGURES) {
    console.log(`  Generating profile for ${figure.name}...`)
    const actorProfile = profiles.find(p => p.id === figure.actor_id)
    const actorProfileText = actorProfile
      ? JSON.stringify(actorProfile, null, 2)
      : `Actor: ${figure.actor_id}`

    const nameVariants = [figure.name, figure.name.split(" ").pop() ?? figure.name]
    const relevantMentions = allResearch
      .split("\n")
      .filter(line => nameVariants.some(v => line.includes(v)))
      .join("\n")

    const prompt = buildKeyFigurePrompt(figure, actorProfileText, relevantMentions)
    const raw = await callClaude(client, prompt)
    const kf = parseKeyFigureResponse(raw, figure.id)
    keyFigures.push(kf)
    console.log(`  ✓ ${figure.name}`)
  }

  await writeJsonFile("data/key-figures.json", keyFigures)
  console.log(`\n✓ Saved ${keyFigures.length} key figure profiles to data/key-figures.json`)
  console.log("Next: Run scripts/enrich-timeline.ts")
}

if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
