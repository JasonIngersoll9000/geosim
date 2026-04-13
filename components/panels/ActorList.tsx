'use client'

import type { ActorSummary } from '@/lib/types/panels'
import { getRelationshipStance } from '@/lib/game/actor-meta'

interface Props {
  actors: ActorSummary[]
  selectedActorId: string | null
  viewerActorId: string | null
  onSelect: (actorId: string) => void
}

const STANCE_BADGE: Record<string, { label: string; color: string }> = {
  ally:       { label: 'ALLY',      color: '#5ebd8e' },
  adversary:  { label: 'ADV.',      color: '#e74c3c' },
  rival:      { label: 'RIVAL',     color: '#e67e22' },
  proxy:      { label: 'PROXY',     color: '#4a90d9' },
  neutral:    { label: 'NEUTRAL',   color: '#8a8880' },
}

export function ActorList({ actors, selectedActorId, viewerActorId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {actors.map(actor => {
        const isSelected = actor.id === selectedActorId
        // Recompute stance client-side if we know the viewer — prevents stale
        // server-default ('us') stance from showing when a non-US actor is controlled.
        const liveStance = viewerActorId
          ? getRelationshipStance(actor.id, viewerActorId)
          : actor.relationshipStance
        const stance = STANCE_BADGE[liveStance] ?? STANCE_BADGE.neutral
        const isAdv = liveStance === 'adversary'

        return (
          <button
            key={actor.id}
            data-actor-id={actor.id}
            onClick={() => onSelect(actor.id)}
            style={{
              width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              borderBottom: '1px solid #1c1f23',
              borderLeft: isSelected ? `3px solid ${actor.actorColor}` : '3px solid transparent',
              padding: '10px 14px 10px 13px',
              background: isSelected ? `${actor.actorColor}08` : 'transparent',
              transition: 'background 0.15s, border-left-color 0.15s',
            }}
            onMouseEnter={e => {
              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#1c1f23'
            }}
            onMouseLeave={e => {
              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {/* Row 1: color dot + name + stance badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: actor.actorColor,
                boxShadow: isSelected ? `0 0 6px ${actor.actorColor}` : 'none',
              }} />
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13, fontWeight: 600, color: '#e5e2e1',
                flex: 1, lineHeight: 1.2,
              }}>
                {actor.name}
              </span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                color: stance.color, flexShrink: 0,
              }}>
                {stance.label}
              </span>
            </div>

            {/* Row 2: escalation rung + primary objective */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 16 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, color: actor.actorColor, letterSpacing: '0.08em',
                flexShrink: 0, marginTop: 1,
                whiteSpace: 'nowrap',
              }}>
                R{actor.escalationRung} · {actor.escalationRungName.toUpperCase().slice(0, 16)}
              </span>
              {actor.primaryObjective && (
                <span style={{
                  fontFamily: isAdv ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif",
                  fontSize: 10,
                  color: isAdv ? '#8a8880' : 'rgba(229,226,225,0.45)',
                  letterSpacing: isAdv ? '0.04em' : undefined,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                }}>
                  {isAdv ? '[OBJ. CLASSIFIED]' : actor.primaryObjective}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
