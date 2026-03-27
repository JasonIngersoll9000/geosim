'use client'

import type { ActorSummary } from '@/lib/types/panels'

interface Props {
  actors: ActorSummary[]
  selectedActorId: string | null
  onSelect: (actorId: string) => void
}

export function ActorList({ actors, selectedActorId, onSelect }: Props) {
  return (
    <div className="flex flex-col divide-y divide-border-subtle">
      {actors.map(actor => (
        <button
          key={actor.id}
          data-actor-id={actor.id}
          onClick={() => onSelect(actor.id)}
          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
            actor.id === selectedActorId
              ? 'bg-bg-surface border-l-2 border-gold'
              : 'bg-transparent hover:bg-bg-surface-dim'
          }`}
        >
          <span className="font-sans text-md text-text-primary">{actor.name}</span>
          <span className="font-mono text-2xs text-text-tertiary">
            Rung {actor.escalationRung}
          </span>
        </button>
      ))}
    </div>
  )
}
