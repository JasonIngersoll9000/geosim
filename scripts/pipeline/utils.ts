// scripts/pipeline/utils.ts
// Pure utility functions shared across pipeline scripts.
// No API calls — all functions are pure and testable.

import type { TimelineEvent, DeduplicationResult, DuplicateCandidate } from "./types"

/**
 * Generates a stable event ID from timestamp and title.
 * Format: evt_YYYYMMDD_title_slug
 */
export function slugifyEventId(event: Pick<TimelineEvent, "timestamp" | "title">): string {
  const datePart = event.timestamp.replace(/-/g, "")
  const titlePart = event.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
  return `evt_${datePart}_${titlePart}`
}

/**
 * Merges multiple arrays of TimelineEvents into one array sorted chronologically.
 * Does not deduplicate — call deduplicateEvents separately for human review.
 */
export function mergeEvents(arrays: TimelineEvent[][]): TimelineEvent[] {
  return arrays.flat().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

/**
 * Flags potential duplicates for human review.
 * Does NOT remove events — all events are returned so the human can decide.
 */
export function deduplicateEvents(events: TimelineEvent[]): DeduplicationResult {
  const duplicates: DuplicateCandidate[] = []

  // Group by id
  const byId = new Map<string, string[]>()
  for (const event of events) {
    const group = byId.get(event.id) ?? []
    group.push(event.id)
    byId.set(event.id, group)
  }
  for (const [id, group] of Array.from(byId.entries())) {
    if (group.length > 1) {
      duplicates.push({ ids: [id], reason: "same_id" })
    }
  }

  // Group by timestamp + title
  const byTimestampTitle = new Map<string, string[]>()
  for (const event of events) {
    const key = `${event.timestamp}::${event.title.toLowerCase().trim()}`
    const group = byTimestampTitle.get(key) ?? []
    group.push(event.id)
    byTimestampTitle.set(key, group)
  }
  for (const group of Array.from(byTimestampTitle.values())) {
    if (group.length > 1) {
      const alreadyFlagged = duplicates.some(
        d => d.reason === "same_id" && d.ids.some(id => group.includes(id))
      )
      if (!alreadyFlagged) {
        duplicates.push({ ids: group, reason: "same_timestamp_and_title" })
      }
    }
  }

  return { events, duplicates }
}

/**
 * Builds the context chain string fed into each enrichment API call.
 */
export function buildContextChainString(
  background: string,
  summaries: string[],
  lastBriefing: string | null
): string {
  const parts: string[] = [`BACKGROUND CONTEXT\n${background}`]

  if (summaries.length > 0) {
    parts.push(`PRIOR TURN SUMMARIES\n${summaries.join("\n\n")}`)
  }

  if (lastBriefing !== null) {
    parts.push(`PRECEDING TURN (FULL BRIEFING)\n${lastBriefing}`)
  }

  return parts.join("\n\n---\n\n")
}

/**
 * Reads a JSON file and returns its parsed contents.
 * Throws with a clear message if the file is missing.
 */
export async function readJsonFile<T>(path: string): Promise<T> {
  const { readFile } = await import("fs/promises")
  try {
    const content = await readFile(path, "utf-8")
    return JSON.parse(content) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Required data file not found: ${path}\n` +
          `Run the Phase 2 research calls first. See docs/Iran Research/research-prompts.md`
      )
    }
    throw err
  }
}

/**
 * Writes data to a JSON file, creating parent directories if needed.
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const { writeFile, mkdir } = await import("fs/promises")
  const { dirname } = await import("path")
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8")
}
