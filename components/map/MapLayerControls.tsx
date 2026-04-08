'use client'

export interface LayerState {
  countryNames: boolean
  countryBorders: boolean
  terrain: boolean
  militaryAssets: boolean
  militaryBases: boolean
  keyCities: boolean
  usAssets: boolean
  iranAssets: boolean
  israelAssets: boolean
  infrastructure: boolean
  strikeRings: boolean
  threatRings: boolean
}

interface ToggleItemProps {
  label: string
  active: boolean
  onToggle: () => void
}

function ToggleItem({ label, active, onToggle }: ToggleItemProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full gap-3 px-2 py-[5px] transition-colors hover:bg-[#1a1a1a]"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      <span
        className="font-mono text-[9px] uppercase tracking-[0.1em]"
        style={{ color: active ? 'var(--gold)' : 'var(--text-tertiary)' }}
      >
        {label}
      </span>
      <span
        className="flex-shrink-0 w-[22px] h-[10px] relative"
        style={{
          background: active ? 'rgba(255,186,32,0.2)' : '#1a1a1a',
          border: `1px solid ${active ? 'rgba(255,186,32,0.5)' : '#2a2a2a'}`,
        }}
      >
        <span
          className="absolute top-[1px] w-[6px] h-[6px] transition-all duration-150"
          style={{
            background: active ? 'var(--gold)' : '#3a3a3a',
            left: active ? '13px' : '1px',
          }}
        />
      </span>
    </button>
  )
}

interface Props {
  layers: LayerState
  onToggle: (key: keyof LayerState) => void
}

export function MapLayerControls({ layers, onToggle }: Props) {
  return (
    <div
      className="absolute bottom-8 left-3 z-10 flex flex-col"
      style={{
        background: 'rgba(10,15,24,0.92)',
        border: '1px solid #1e1e1e',
        borderLeft: '2px solid rgba(255,186,32,0.25)',
        minWidth: '130px',
      }}
    >
      <div
        className="px-2 py-[4px] border-b"
        style={{ borderColor: '#1e1e1e' }}
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-tertiary">
          Map Layers
        </span>
      </div>

      <ToggleItem label="Country Names"   active={layers.countryNames}    onToggle={() => onToggle('countryNames')} />
      <ToggleItem label="Borders"         active={layers.countryBorders}  onToggle={() => onToggle('countryBorders')} />
      <ToggleItem label="Key Cities"      active={layers.keyCities}       onToggle={() => onToggle('keyCities')} />
      <ToggleItem label="Mil. Assets"     active={layers.militaryAssets}  onToggle={() => onToggle('militaryAssets')} />
      <ToggleItem label="Mil. Bases"      active={layers.militaryBases}   onToggle={() => onToggle('militaryBases')} />
      <ToggleItem label="Terrain"         active={layers.terrain}         onToggle={() => onToggle('terrain')} />

      {/* ASSETS group */}
      <div style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="px-2 py-[3px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-tertiary">Assets</span>
        </div>
        <ToggleItem label="US Assets"       active={layers.usAssets}       onToggle={() => onToggle('usAssets')} />
        <ToggleItem label="Iran Assets"     active={layers.iranAssets}     onToggle={() => onToggle('iranAssets')} />
        <ToggleItem label="Israel Assets"   active={layers.israelAssets}   onToggle={() => onToggle('israelAssets')} />
        <ToggleItem label="Infrastructure"  active={layers.infrastructure} onToggle={() => onToggle('infrastructure')} />
      </div>

      {/* RINGS group */}
      <div style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="px-2 py-[3px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-tertiary">Rings</span>
        </div>
        <ToggleItem label="Strike Rings"  active={layers.strikeRings}  onToggle={() => onToggle('strikeRings')} />
        <ToggleItem label="Threat Rings"  active={layers.threatRings}  onToggle={() => onToggle('threatRings')} />
      </div>
    </div>
  )
}
