'use client'
import type { ActorSummary } from '@/lib/types/panels'

interface Props {
  isVisible: boolean
  onDismiss: () => void
  actors?: ActorSummary[]
  perspectiveActorId?: string | null
  omniscientMode?: boolean
  onChangePerspective?: (actorId: string | null) => void
  onToggleOmniscient?: () => void
}

export function ObserverOverlay({
  isVisible,
  onDismiss,
  actors = [],
  perspectiveActorId = null,
  omniscientMode = false,
  onChangePerspective,
  onToggleOmniscient,
}: Props) {
  if (!isVisible) return null

  function handlePerspectiveChange(actorId: string | null) {
    onChangePerspective?.(actorId)
  }

  function handleOmniscientToggle() {
    onToggleOmniscient?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(13,17,23,0.85)' }}>
      <div
        className="bg-bg-surface border border-border-subtle w-full max-w-sm"
        style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border-subtle">
          <div className="font-mono text-2xs uppercase tracking-[0.2em] text-gold mb-1">
            Observer Mode
          </div>
          <p className="font-serif italic text-sm text-text-secondary leading-snug">
            You are observing this scenario. Select a perspective or enable omniscient view.
          </p>
        </div>

        {/* Perspective selector */}
        {actors.length > 0 && (
          <div className="px-5 py-3 border-b border-border-subtle">
            <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
              Perspective
            </div>
            <div className="flex flex-col gap-1">
              {/* Omniscient option */}
              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bg-surface-high transition-colors">
                <input
                  type="radio"
                  name="perspective"
                  checked={omniscientMode}
                  onChange={() => {
                    if (!omniscientMode) handleOmniscientToggle()
                  }}
                  className="shrink-0"
                />
                <div className="flex flex-col">
                  <span className="font-label font-semibold text-base text-text-primary">Omniscient</span>
                  <span className="font-mono text-2xs text-text-tertiary">All intel visible — fog of war disabled</span>
                </div>
              </label>

              {/* Per-actor perspectives */}
              {actors.map(actor => (
                <label key={actor.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bg-surface-high transition-colors">
                  <input
                    type="radio"
                    name="perspective"
                    checked={!omniscientMode && perspectiveActorId === actor.id}
                    onChange={() => {
                      if (omniscientMode) handleOmniscientToggle()
                      handlePerspectiveChange(actor.id)
                    }}
                    className="shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: actor.actorColor }} />
                    <span className="font-label font-semibold text-base text-text-primary truncate">{actor.name}</span>
                    <span className="font-mono text-2xs text-text-tertiary ml-auto shrink-0">
                      R{actor.escalationRung}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Omniscient toggle (when no actors) */}
        {actors.length === 0 && (
          <div className="px-5 py-3 border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-label font-semibold text-base text-text-primary mb-0.5">Omniscient View</div>
                <div className="font-mono text-2xs text-text-tertiary">Fog of war disabled — full intel</div>
              </div>
              <button
                onClick={handleOmniscientToggle}
                className="w-10 h-6 relative transition-colors"
                style={{
                  background: omniscientMode ? 'var(--gold)' : 'var(--bg-surface-high)',
                  border: '1px solid var(--border-hi)',
                }}
                aria-pressed={omniscientMode}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 transition-transform"
                  style={{
                    background: omniscientMode ? 'var(--bg-base)' : 'var(--text-tertiary)',
                    transform: omniscientMode ? 'translateX(18px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-text-primary bg-transparent border border-border-subtle hover:bg-bg-surface-high transition-colors"
          >
            {!omniscientMode && perspectiveActorId
              ? `Play as ${actors.find(a => a.id === perspectiveActorId)?.shortName ?? perspectiveActorId.toUpperCase()}`
              : omniscientMode
                ? 'Enter Omniscient View'
                : 'Continue Observing'}
          </button>
        </div>
      </div>
    </div>
  )
}
