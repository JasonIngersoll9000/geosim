import type { AssetStatus, PositionedAsset } from '@/lib/types/simulation'

const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  available:  ['mobilizing', 'withdrawn'],
  mobilizing: ['transiting', 'available', 'withdrawn'],
  transiting: ['staged', 'mobilizing', 'withdrawn', 'degraded'],
  staged:     ['engaged', 'transiting', 'withdrawn'],
  engaged:    ['staged', 'degraded', 'withdrawn'],
  degraded:   ['engaged', 'destroyed', 'withdrawn'],
  destroyed:  [],
  withdrawn:  ['available'],
}

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

const LEAD_TURNS: Record<string, number> = {
  'carrier:available→mobilizing':                   2,
  'carrier:mobilizing→transiting':                  3,
  'carrier:transiting→staged':                      0,
  'air_base:available→engaged':                     0,
  'air_refueling:available→engaged':                0,
  'missile_site:available→engaged':                 0,
  'drone_stockpile:available→engaged':              0,
  'naval_force_pool:available→engaged':             0,
  'air_defense_battery:available→engaged':          0,
  'ground_brigade_conus:available→mobilizing':      2,
  'ground_brigade_conus:mobilizing→transiting':     6,
  'ground_brigade_regional:available→mobilizing':   1,
  'ground_brigade_regional:mobilizing→transiting':  2,
  'headquarters:available→engaged':                 0,
  'nuclear_facility:available→engaged':             0,
  'oil_terminal:available→engaged':                 0,
  'oil_refinery:available→engaged':                 0,
  'naval_base:available→engaged':                   0,
}

const DEFAULT_LEAD_TURNS = 1

export function getLeadTurns(
  assetType: string,
  from: AssetStatus,
  to: AssetStatus
): number {
  const key = `${assetType}:${from}→${to}`
  return LEAD_TURNS[key] ?? DEFAULT_LEAD_TURNS
}

export function interpolatePosition(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  progress: number
): { lat: number; lng: number } {
  const p = Math.max(0, Math.min(1, progress))
  return {
    lat: start.lat + (end.lat - start.lat) * p,
    lng: start.lng + (end.lng - start.lng) * p,
  }
}

export function applyTransition(
  asset: PositionedAsset,
  toStatus: AssetStatus,
  _currentTurn: number
): PositionedAsset {
  if (!canTransition(asset.status, toStatus)) {
    throw new Error(
      `Invalid asset transition: ${asset.id} cannot go from ${asset.status} to ${toStatus}`
    )
  }
  return { ...asset, status: toStatus }
}

export function getTransitingAssets(assets: PositionedAsset[]): PositionedAsset[] {
  return assets.filter(a => a.status === 'transiting')
}
