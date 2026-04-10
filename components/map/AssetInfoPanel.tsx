'use client'
import type { MapAsset } from '@/lib/types/simulation'

const STATUS_COLORS: Record<MapAsset['status'], string> = {
  operational: 'text-green-400',
  degraded:    'text-yellow-400',
  destroyed:   'text-red-500',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  nuclear_facility:    'Nuclear Facility',
  oil_gas_facility:    'Oil / Gas Facility',
  military_base:       'Military Base',
  carrier_group:       'Carrier Strike Group',
  missile_battery:     'Missile Battery',
  naval_asset:         'Naval Asset',
  air_defense_battery: 'Air Defense Battery',
  troop_deployment:    'Troop Deployment',
}

interface Props {
  asset: MapAsset
  onClose: () => void
}

export function AssetInfoPanel({ asset, onClose }: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 w-72 bg-surface-2 border border-border-subtle font-mono text-xs p-3 shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <span className="text-text-primary font-label font-semibold text-sm uppercase tracking-wide">
          {asset.label}
        </span>
        <button
          aria-label="close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary ml-2"
        >
          ✕
        </button>
      </div>

      <div className="text-text-secondary mb-1">
        {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
      </div>

      <div className={`font-semibold mb-2 ${STATUS_COLORS[asset.status]}`}>
        {asset.status.toUpperCase()}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-text-secondary mb-1">
          <span>CAPACITY</span>
          <span>{asset.capacity_pct}%</span>
        </div>
        <div className="w-full h-1 bg-surface-3">
          <div
            className="h-1 bg-gold"
            style={{ width: `${asset.capacity_pct}%` }}
          />
        </div>
      </div>

      <div className="text-text-secondary text-xs leading-relaxed">
        {asset.tooltip}
      </div>

      {asset.is_approximate_location && (
        <div className="text-text-tertiary text-xs mt-2 italic">
          {'⚠ Approximate location'}
        </div>
      )}
    </div>
  )
}
