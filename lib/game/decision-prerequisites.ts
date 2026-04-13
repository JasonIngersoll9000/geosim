import type { Decision, PositionedAsset, AssetRequirement } from '@/lib/types/simulation'

export interface PrerequisiteResult {
  met: boolean
  unmet: string[]
}

export interface FilteredDecision {
  decision: Decision
  available: boolean
  unmetReason?: string
}

function checkRequirement(req: AssetRequirement, assets: PositionedAsset[]): string | null {
  const candidates = assets.filter(a => {
    if (req.assetId && a.id !== req.assetId) return false
    if (req.category && a.category !== req.category) return false
    if (req.assetType && a.assetType !== req.assetType) return false
    return true
  })

  if (candidates.length === 0) {
    const what = req.assetId ?? req.assetType ?? req.category ?? 'required asset'
    const zonePart = req.requiredZone ? ` in zone "${req.requiredZone}"` : ''
    return `No ${what} found in scenario${zonePart}`
  }

  const statusMatch = candidates.filter(a => req.requiredStatus.includes(a.status))
  if (statusMatch.length === 0) {
    const what = req.assetId ?? req.assetType ?? req.category ?? 'asset'
    return `${what} must be in state [${req.requiredStatus.join(' or ')}] — currently ${candidates.map(a => a.status).join(', ')}`
  }

  if (req.requiredZone) {
    const zoneMatch = statusMatch.filter(a => a.zone === req.requiredZone)
    if (zoneMatch.length === 0) {
      const what = req.assetId ?? req.assetType ?? req.category ?? 'asset'
      return `${what} must be in zone "${req.requiredZone}" — currently in ${statusMatch.map(a => a.zone).join(', ')}`
    }
  }

  if (req.minCapability) {
    const { name, minCurrent } = req.minCapability
    const capMatch = statusMatch.filter(a =>
      a.capabilities.some(c => c.name === name && c.current >= minCurrent)
    )
    if (capMatch.length === 0) {
      return `Insufficient ${name} — need at least ${minCurrent}`
    }
  }

  return null
}

export function checkPrerequisites(
  decision: Decision,
  assets: PositionedAsset[]
): PrerequisiteResult {
  const requirements = decision.requiredAssets ?? []
  const unmet: string[] = []

  for (const req of requirements) {
    const issue = checkRequirement(req, assets)
    if (issue) unmet.push(issue)
  }

  return { met: unmet.length === 0, unmet }
}

export function filterDecisionsByAssets(
  decisions: Decision[],
  assets: PositionedAsset[]
): FilteredDecision[] {
  return decisions.map(decision => {
    const { met, unmet } = checkPrerequisites(decision, assets)
    return {
      decision,
      available: met,
      unmetReason: met ? undefined : unmet.join('; '),
    }
  })
}
