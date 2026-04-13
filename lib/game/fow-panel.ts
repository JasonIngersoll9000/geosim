/**
 * Fog-of-war utilities for the panel layer.
 *
 * The core fog-of-war engine (lib/game/fog-of-war.ts) operates on full
 * simulation Actor objects.  Here we provide a parallel set of utilities
 * that work from the denormalized intelligence_profile JSONB stored in
 * scenario_actors, which has the same conceptual purpose but is structurally
 * different (it describes the viewer actor's own intelligence capabilities,
 * not per-adversary IntelligencePicture beliefs).
 *
 * Design:
 *   - Parse signalCapability / humanCapability from the viewer's profile
 *   - Derive a per-stance confidence value the panel can apply
 *   - Extract knownUnknowns (blindSpots) for the Intelligence tab
 *   - Where a viewer has limited intel, apply score uncertainty bands
 */

import type { RelationshipStance } from '@/lib/types/panels'

// ── Types mirroring simulation IntelligencePicture where meaningful ──────────

/**
 * Parsed snapshot of a viewer actor's intelligence capability profile.
 * Derived from scenario_actors.intelligence_profile JSONB.
 */
export interface ViewerIntelProfile {
  /** SIGINT / ELINT collection capability, 0–100 */
  signalCapability: number
  /** HUMINT collection capability, 0–100 */
  humanCapability: number
  /** Cyber / OSINT capability, 0–100 */
  cyberCapability: number
  /** Things the viewer knows they don't know */
  knownUnknowns: string[]
  /** Actor IDs of intelligence-sharing partners */
  intelSharingPartnerIds: string[]
}

/**
 * Confidence tier derived from intel profile + relationship stance.
 * Mirrors the Confidence type in simulation.ts.
 */
export type IntelConfidence = 'high' | 'moderate' | 'low' | 'unverified'

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Parse a scenario_actors.intelligence_profile JSONB record into a typed
 * ViewerIntelProfile.  Falls back gracefully to neutral defaults if the
 * record is empty or has unexpected structure.
 */
export function parseIntelProfile(
  raw: Record<string, unknown> | null | undefined
): ViewerIntelProfile {
  if (!raw || typeof raw !== 'object') {
    return { signalCapability: 50, humanCapability: 50, cyberCapability: 50, knownUnknowns: [], intelSharingPartnerIds: [] }
  }

  const signalCapability = typeof raw.signalCapability === 'number' ? raw.signalCapability : 50
  const humanCapability  = typeof raw.humanCapability  === 'number' ? raw.humanCapability  : 50
  const cyberCapability  = typeof raw.cyberCapability  === 'number' ? raw.cyberCapability  : 50

  const knownUnknowns: string[] = Array.isArray(raw.blindSpots)
    ? (raw.blindSpots as unknown[]).filter((s): s is string => typeof s === 'string')
    : []

  // intelSharingPartners may be an array of strings (actor IDs or descriptive labels)
  const intelSharingPartnerIds: string[] = Array.isArray(raw.intelSharingPartners)
    ? (raw.intelSharingPartners as unknown[]).filter((s): s is string => typeof s === 'string')
    : []

  return { signalCapability, humanCapability, cyberCapability, knownUnknowns, intelSharingPartnerIds }
}

// ── Confidence derivation ─────────────────────────────────────────────────────

/**
 * Derive intelligence confidence about a target actor given:
 *   - the viewer's parsed intel profile
 *   - the relationship stance (determines accessible collection avenues)
 *
 * Mirrors the logic in the fog-of-war engine where intelSharingPartners and
 * actor relationships determine what an actor knows about others.
 *
 * Returns a confidence tier: 'high' | 'moderate' | 'low' | 'unverified'
 */
export function inferIntelConfidence(
  viewerProfile: ViewerIntelProfile,
  stance: RelationshipStance
): IntelConfidence {
  // Allies: benefit from full SIGINT + HUMINT + partner sharing
  if (stance === 'ally') return 'high'

  // Proxies: moderate visibility (indirect channel, not full sharing)
  if (stance === 'proxy') return 'moderate'

  // Rivals / neutrals: limited collection, partially blinded
  const capability = Math.round(
    viewerProfile.signalCapability * 0.4 +
    viewerProfile.humanCapability  * 0.4 +
    viewerProfile.cyberCapability  * 0.2
  )

  if (stance === 'rival') {
    return capability >= 70 ? 'moderate' : 'low'
  }

  if (stance === 'neutral') {
    return capability >= 80 ? 'moderate' : 'low'
  }

  // Adversary: intentional denial + counter-intelligence; weakest collection
  if (stance === 'adversary') {
    return capability >= 90 ? 'low' : 'unverified'
  }

  return 'moderate'
}

// ── Score uncertainty for panel display ───────────────────────────────────────

/**
 * Uncertainty band (±) to display alongside a score when the viewer has
 * limited intelligence.  Based on confidence tier and base score value.
 *
 * Used by the panel to display "52 ± 15" instead of an exact figure for
 * adversary/rival actors.
 */
export function scoreUncertaintyBand(
  baseScore: number,
  confidence: IntelConfidence
): number {
  switch (confidence) {
    case 'high':       return 0
    case 'moderate':   return Math.round(baseScore * 0.1)
    case 'low':        return Math.round(baseScore * 0.2)
    case 'unverified': return Math.round(baseScore * 0.3)
  }
}

/**
 * Apply a symmetric noise offset to a score to represent believed-vs-actual
 * divergence for adversary actors.  The offset is deterministic (seeded on the
 * actor name) so it remains stable across renders without introducing a
 * runtime random.
 *
 * This approximates the believedX fields on IntelligencePicture in the
 * simulation engine, adapted to the panel data layer.
 */
export function applyScoreNoise(
  score: number,
  confidence: IntelConfidence,
  seed: number
): number {
  if (confidence === 'high') return score
  const band = scoreUncertaintyBand(score, confidence)
  // Deterministic offset: -band to +band using the seed
  const direction = seed % 2 === 0 ? 1 : -1
  const magnitude = Math.round(band * ((seed % 10) / 10))
  return Math.max(0, Math.min(100, score + direction * magnitude))
}

/**
 * Extract known unknowns (intelligence gaps) from the viewer's intel profile.
 * These are the "things we know we don't know" — surfaced in the Intelligence tab.
 */
export function extractKnownUnknowns(
  raw: Record<string, unknown> | null | undefined
): string[] {
  if (!raw || !Array.isArray(raw.blindSpots)) return []
  return (raw.blindSpots as unknown[]).filter((s): s is string => typeof s === 'string')
}
