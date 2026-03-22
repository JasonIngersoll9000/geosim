import { createHash } from 'crypto'

export interface ActorDecision {
  actorId: string
  decisionId: string
  selectedProfileId: string | null
  parameters: Record<string, string>
}

/**
 * Compute a deterministic SHA-256 cache key for a turn commit.
 *
 * The key covers: parentCommitId + all actor decisions (sorted by actorId).
 * Sorting ensures order-independence: two branches where actors submitted
 * in different order produce the same hash.
 *
 * Cache hit = return existing commit without API call.
 */
export function computeCacheKey(
  parentCommitId: string,
  actorDecisions: ActorDecision[]
): string {
  const sorted = [...actorDecisions].sort((a, b) =>
    a.actorId.localeCompare(b.actorId)
  )

  const payload =
    parentCommitId +
    '|' +
    sorted
      .map(
        d =>
          `${d.actorId}:${d.decisionId}:${d.selectedProfileId ?? 'null'}:${JSON.stringify(d.parameters)}`
      )
      .join('|')

  return createHash('sha256').update(payload).digest('hex')
}
