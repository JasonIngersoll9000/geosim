'use client'
import { useState } from 'react'
import { MapSide } from './MapSide'
import { PanelSide } from './PanelSide'

interface Props {
  mapContent: React.ReactNode
  panelContent: React.ReactNode
}

export function GameLayout({ mapContent, panelContent }: Props) {
  const [mapCollapsed, setMapCollapsed] = useState(false)

  return (
    <div className="flex h-[calc(100vh-66px)] overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {!mapCollapsed && (
        <MapSide onCollapse={() => setMapCollapsed(true)}>
          {mapContent}
        </MapSide>
      )}
      <PanelSide
        mapCollapsed={mapCollapsed}
        onExpandMap={() => setMapCollapsed(false)}
      >
        {panelContent}
      </PanelSide>
    </div>
  )
}
