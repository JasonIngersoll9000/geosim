/**
 * Fog-of-war utilities for the panel layer.
 *
 * The canonical FOW engine (lib/game/fog-of-war.ts) operates on full simulation
 * Actor objects and IntelligencePicture arrays.  This module is an adapter that
 * reconstructs equivalent per-target belief data from the denormalized JSONB
 * columns stored in scenario_actors (intelligence_profile) and from the typed
 * IntelligencePicture structure in lib/types/simulation.ts.
 *
 * Design:
 *   - parseIntelligencePicture(): DB JSONB → typed IntelligencePicture[]
 *   - inferIntelConfidence(): per-target confidence using the same capability
 *     weighting logic that the simulation engine applies
 *   - applyFogOfWarToActorDetail(): applies the same field-level filtering that
 *     buildFogOfWarContext() enforces — redacting classified fields for adversaries
 *     and applying believedX-style score estimation for limited-intel actors
 *
 * Canonical type reference: lib/types/simulation.ts IntelligencePicture
 */

import type { IntelligencePicture } from '@/lib/types/simulation'
import type { RelationshipStance } from '@/lib/types/panels'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Parsed snapshot of a viewer actor's intelligence capability profile.
 * Derived from scenario_actors.intelligence_profile JSONB.
 * Maps onto the intelligence capability fields that the simulation engine
 * uses to determine actor.state.intelligence collection limits.
 */
export interface ViewerIntelProfile {
  /** SIGINT / ELINT collection capability, 0–100 */
  signalCapability: number
  /** HUMINT collection capability, 0–100 */
  humanCapability: number
  /** Cyber / OSINT capability, 0–100 */
  cyberCapability: number
  /** Things the viewer knows they don't know (IntelligencePicture.knownUnknowns) */
  knownUnknowns: string[]
  /** Actor IDs of intelligence-sharing partners (IntelligencePicture.intelProviders) */
  intelSharingPartnerIds: string[]
}

/**
 * Confidence tier derived from intel profile + relationship stance.
 * Maps onto the Confidence type in simulation.ts
 * (believedMilitaryReadinessConfidence, believedEscalationConfidence, etc.).
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

  // intelSharingPartners maps to IntelligencePicture.intelProviders
  const intelSharingPartnerIds: string[] = Array.isArray(raw.intelSharingPartners)
    ? (raw.intelSharingPartners as unknown[]).filter((s): s is string => typeof s === 'string')
    : []

  return { signalCapability, humanCapability, cyberCapability, knownUnknowns, intelSharingPartnerIds }
}

/**
 * Parse a scenario_actors.intelligence_profile JSONB record into an array of
 * typed IntelligencePicture entries (one per known target actor).
 *
 * The DB schema stores a flat profile for the viewer actor; per-target
 * IntelligencePicture details (believedEscalationRung, knownUnknowns, etc.)
 * are nested under a 'targets' key if present, or reconstructed from the flat
 * profile for default cases.
 *
 * This function is the canonical bridge between DB JSONB and the typed
 * IntelligencePicture from lib/types/simulation.ts.
 */
export function parseIntelligencePicture(
  raw: Record<string, unknown> | null | undefined
): IntelligencePicture[] {
  if (!raw || typeof raw !== 'object') return []

  // The 'targets' key stores per-actor IntelligencePicture records if the
  // research pipeline serialized them; otherwise returns an empty array and
  // the panel falls back to the flat profile + inferIntelConfidence().
  const targets = raw.targets
  if (!Array.isArray(targets)) return []

  return targets.filter((t): t is IntelligencePicture => {
    return (
      typeof t === 'object' && t !== null &&
      typeof (t as IntelligencePicture).aboutActorId === 'string'
    )
  })
}

// ── Confidence derivation ─────────────────────────────────────────────────────

/**
 * Derive intelligence confidence about a target actor given:
 *   - the viewer's parsed intel profile
 *   - the relationship stance (determines accessible collection avenues)
 *
 * Mirrors the logic in fog-of-war.ts buildFogOfWarContext():
 *   allied actors share intelligence and have full collection access;
 *   adversaries employ active denial and counter-intelligence, so only
 *   high-capability SIGINT/HUMINT can achieve even 'low' confidence.
 *
 * The confidence value maps to the believedX Confidence fields on
 * IntelligencePicture (e.g. believedMilitaryReadinessConfidence).
 */
export function inferIntelConfidence(
  viewerProfile: ViewerIntelProfile,
  stance: RelationshipStance
): IntelConfidence {
  // Allies: full SIGINT + HUMINT + partner sharing (intelProviders pathway)
  if (stance === 'ally') return 'high'

  // Proxies: indirect channel — moderate visibility only
  if (stance === 'proxy') return 'moderate'

  // Composite capability score for non-ally assessment
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

  // Adversary: active denial + counter-intelligence; highest collection barrier.
  // Mirrors fog-of-war.ts: adversaries employ active counter-intel programs
  // that degrade even sophisticated SIGINT — only very high capability reaches 'low'.
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
 * Corresponds to the divergence between believedX and the ground-truth value
 * in IntelligencePicture — higher uncertainty means wider possible spread.
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
 * Apply a symmetric noise offset to a score to represent believedX vs actual
 * divergence for actors the viewer has limited intel on.
 *
 * The offset is deterministic (seeded on the actor ID character sum) so the
 * believed value is stable across renders — mirroring the fixed IntelligencePicture
 * snapshot that the simulation engine would carry for a given actor-turn pair.
 *
 * This approximates believedMilitaryReadiness / believedPoliticalStability
 * on IntelligencePicture in the simulation engine, adapted to the panel layer.
 *
 * @param score      Ground-truth score (0–100)
 * @param confidence Intel confidence tier
 * @param seed       Deterministic integer derived from actor ID or turn number
 */
export function applyScoreNoise(
  score: number,
  confidence: IntelConfidence,
  seed: number
): number {
  if (confidence === 'high') return score
  const band = scoreUncertaintyBand(score, confidence)
  const direction = seed % 2 === 0 ? 1 : -1
  const magnitude = Math.round(band * ((seed % 10) / 10))
  return Math.max(0, Math.min(100, score + direction * magnitude))
}

/**
 * Extract known unknowns (intelligence gaps) from the viewer's intel profile.
 * These are the IntelligencePicture.knownUnknowns items for the viewer actor —
 * "things we know we don't know" — surfaced in the Intelligence tab.
 */
export function extractKnownUnknowns(
  raw: Record<string, unknown> | null | undefined
): string[] {
  if (!raw || !Array.isArray(raw.blindSpots)) return []
  return (raw.blindSpots as unknown[]).filter((s): s is string => typeof s === 'string')
}

// ── FOW field transformation ──────────────────────────────────────────────────

const REDACTED_TEXT = '[CLASSIFIED — INSUFFICIENT HUMINT COVERAGE]'
const LIMITED_TEXT  = '[PARTIAL — DATA CONFIDENCE LIMITED]'

/**
 * Apply fog-of-war transformation to an ActorDetail based on the viewer's
 * relationship to the target actor.
 *
 * This mirrors buildFogOfWarContext() in fog-of-war.ts:
 *   - For adversary targets (confidence unverified/low): classified planning
 *     fields (doctrine, win condition, objectives) are redacted — equivalent to
 *     the engine filtering myIntelligencePicture to only believedX fields.
 *   - For limited-intel targets (confidence moderate/low): numeric scores are
 *     shifted by a deterministic noise offset matching IntelligencePicture's
 *     believedMilitaryReadiness/believedPoliticalStability divergence model.
 *
 * Important: call this client-side where viewerActorId is known from the
 * controlled actor context; the server pre-populates all fields for subsequent
 * client-side filtering.
 */
export function applyFogOfWarToActorDetail<T extends {
  id: string
  isAdversary: boolean
  hasLimitedIntel?: boolean
  intelConfidence?: IntelConfidence
  militaryStrength: number
  economicStrength: number
  politicalStability: number
  objectives: string[]
  winCondition?: string
  strategicDoctrine?: string
}>(detail: T): T {
  const confidence: IntelConfidence = detail.intelConfidence ?? 'high'

  if (!detail.isAdversary && !detail.hasLimitedIntel) return detail

  // Deterministic seed: actor ID character sum — stable across renders,
  // matching the fixed IntelligencePicture snapshot the engine would store.
  const seed = detail.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)

  const militaryStrength   = applyScoreNoise(detail.militaryStrength,   confidence, seed)
  const economicStrength   = applyScoreNoise(detail.economicStrength,   confidence, seed + 1)
  const politicalStability = applyScoreNoise(detail.politicalStability, confidence, seed + 2)

  if (detail.isAdversary) {
    return {
      ...detail,
      militaryStrength,
      economicStrength,
      politicalStability,
      // Redact classified planning fields — equivalent to engine filtering
      // objectives/doctrine/winCondition from IntelligencePicture for adversaries
      objectives:        [REDACTED_TEXT],
      winCondition:      REDACTED_TEXT,
      strategicDoctrine: REDACTED_TEXT,
    }
  }

  // Limited intel: apply noise to scores; mark doctrine/win-condition as partial
  return {
    ...detail,
    militaryStrength,
    economicStrength,
    politicalStability,
    winCondition:      detail.winCondition      ? `${detail.winCondition} ${LIMITED_TEXT}`      : undefined,
    strategicDoctrine: detail.strategicDoctrine ? `${detail.strategicDoctrine} ${LIMITED_TEXT}` : undefined,
  }
}
