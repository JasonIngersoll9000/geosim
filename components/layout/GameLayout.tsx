'use client'
import Link from 'next/link'
import { useState } from 'react'
import { MapSide } from './MapSide'
import { PanelSide } from './PanelSide'

interface Props {
  mapContent: React.ReactNode
  panelContent: React.ReactNode
  exitHref?: string
}

export function GameLayout({ mapContent, panelContent, exitHref }: Props) {
  const [mapCollapsed, setMapCollapsed] = useState(false)

  return (
    <div className="relative flex h-[calc(100vh-66px)] overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Exit button — top-left overlay */}
      {exitHref && (
        <Link
          href={exitHref}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all hover:text-text-primary"
          style={{
            background: 'var(--bg-surface-low)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)',
          }}
        >
          ← EXIT
        </Link>
      )}

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
