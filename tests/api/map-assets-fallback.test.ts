import { describe, it, expect } from 'vitest'
import type { MapAsset } from '@/lib/types/simulation'

function capabilityToMapAsset(cap: {
  id: string; actor_id: string; name: string; asset_type: string | null
  category: string | null; lat: number; lng: number; status: string | null
  description: string | null
}): MapAsset {
  const typeMap: Record<string, string> = {
    nuclear_facility: 'nuclear_facility', oil_gas_facility: 'oil_gas_facility',
    military_base: 'military_base', carrier: 'carrier_group',
    carrier_group: 'carrier_group', naval_base: 'naval_asset',
    airbase: 'military_base', headquarters: 'military_base',
    missile_battery: 'missile_battery',
  }
  const rawType = cap.asset_type ?? cap.category ?? 'military_base'
  const assetType = (typeMap[rawType] ?? 'military_base') as MapAsset['asset_type']
  return {
    id: cap.id,
    actor_id: cap.actor_id,
    asset_type: assetType,
    label: cap.name,
    lat: cap.lat,
    lng: cap.lng,
    status: (cap.status === 'destroyed' ? 'destroyed' : cap.status === 'degraded' ? 'degraded' : 'operational') as MapAsset['status'],
    capacity_pct: 100,
    actor_color: '#888888',
    tooltip: cap.description ?? cap.name,
    is_approximate_location: rawType === 'carrier' || rawType === 'carrier_group',
  }
}

describe('capabilityToMapAsset', () => {
  it('maps a carrier group correctly', () => {
    const cap = {
      id: 'cvn-73', actor_id: 'united_states', name: 'USS Carl Vinson CSG',
      asset_type: 'carrier', category: 'naval', lat: 23.5, lng: 59.5,
      status: 'staged', description: 'Carrier strike group in Arabian Sea',
    }
    const asset = capabilityToMapAsset(cap)
    expect(asset.asset_type).toBe('carrier_group')
    expect(asset.is_approximate_location).toBe(true)
    expect(asset.lat).toBe(23.5)
  })

  it('maps a nuclear facility correctly', () => {
    const cap = {
      id: 'fordow', actor_id: 'iran', name: 'Fordow FEP',
      asset_type: 'nuclear_facility', category: 'nuclear', lat: 34.884, lng: 50.995,
      status: 'available', description: 'Underground enrichment facility',
    }
    const asset = capabilityToMapAsset(cap)
    expect(asset.asset_type).toBe('nuclear_facility')
    expect(asset.is_approximate_location).toBe(false)
  })
})
