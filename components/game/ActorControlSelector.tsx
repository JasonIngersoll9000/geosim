'use client'
import { useState } from 'react'

const ACTOR_COLORS: Record<string, string> = {
  us:            '#2980b9',
  united_states: '#2980b9',
  israel:        '#27ae60',
  iran:          '#c0392b',
}

interface ActorLike {
  id: string
  name: string
}

interface Props {
  actors: ActorLike[]
  onConfirm: (controlledActorIds: string[]) => void
}

export function ActorControlSelector({ actors, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['us']))

  function toggle(actorId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(actorId)) next.delete(actorId)
      else next.add(actorId)
      return next
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f1114', border: '1px solid #2a2d32',
        borderRadius: 6, padding: 28, maxWidth: 400, width: '100%',
        fontFamily: "'IBM Plex Mono', monospace", color: '#e8e6e0',
      }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#ffba20', marginBottom: 6 }}>
          {'Select Your Actors'}
        </div>
        <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 20, lineHeight: 1.5 }}>
          {'Choose which actors you control. Uncontrolled actors are AI-driven.'}
          {' You can step in as any actor from the branch tree at any time.'}
        </div>

        <div style={{ marginBottom: 20 }}>
          {actors.map(actor => {
            const isSelected = selected.has(actor.id)
            const color = ACTOR_COLORS[actor.id] ?? '#8a8880'
            return (
              <button
                key={actor.id}
                onClick={() => toggle(actor.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '10px 14px', marginBottom: 8,
                  background: isSelected ? `${color}18` : '#151719',
                  border: `1px solid ${isSelected ? color : '#2a2d32'}`,
                  borderRadius: 4, cursor: 'pointer',
                  color: '#e8e6e0', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: isSelected ? color : 'transparent',
                  border: `2px solid ${color}`,
                  flexShrink: 0, transition: 'background 0.15s',
                }} />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600 }}>
                    {actor.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#8a8880', marginTop: 2 }}>
                    {isSelected ? 'YOU CONTROL' : 'AI-DRIVEN'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0}
          style={{
            width: '100%', padding: '12px 0',
            background: selected.size > 0 ? 'rgba(255,186,32,0.12)' : '#1a1a1a',
            border: `1px solid ${selected.size > 0 ? 'rgba(255,186,32,0.4)' : '#2a2d32'}`,
            borderRadius: 4,
            color: selected.size > 0 ? '#ffba20' : '#555',
            cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, letterSpacing: '0.1em', fontWeight: 600,
          }}
        >
          {'BEGIN SIMULATION →'}
        </button>
      </div>
    </div>
  )
}
