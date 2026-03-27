'use client'

import { SlideOverPanel } from '@/components/ui/SlideOverPanel'
import type { ActorDetail } from '@/lib/types/panels'

interface Props {
  actor: ActorDetail
  open: boolean
  onClose: () => void
}

export function ActorDetailPanel({ actor, open, onClose }: Props) {
  return (
    <SlideOverPanel open={open} onClose={onClose} title={actor.name}>
      <div className="px-4 py-4 flex flex-col gap-6">
        {/* Briefing */}
        <section>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            Intelligence Briefing
          </div>
          <p className="font-serif italic text-sm leading-[1.75] text-text-secondary">
            {actor.briefing}
          </p>
        </section>

        {/* Escalation */}
        <section>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-1">
            Escalation
          </div>
          <div className="font-mono text-md text-gold">Rung {actor.escalationRung}</div>
        </section>

        {/* Objectives */}
        <section>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            Objectives
          </div>
          <ul className="flex flex-col gap-1">
            {actor.objectives.map(obj => (
              <li key={obj} className="font-sans text-md text-text-secondary flex items-start gap-2">
                <span className="text-gold mt-[2px]">›</span>
                {obj}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SlideOverPanel>
  )
}
