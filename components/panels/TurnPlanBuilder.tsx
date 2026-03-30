'use client'
import type { ActionSlot } from '@/lib/types/panels'

interface Props {
  primaryAction: ActionSlot | null
  concurrentActions: ActionSlot[]
  onSubmit: () => Promise<void> | void
  onRemovePrimary?: () => void
  onRemoveConcurrent?: (id: string) => void
  isSubmitting?: boolean
}

export function TurnPlanBuilder({
  primaryAction,
  concurrentActions,
  onSubmit,
  onRemovePrimary,
  onRemoveConcurrent,
  isSubmitting = false,
}: Props) {
  const canSubmit = !!primaryAction && !isSubmitting

  // Resource allocation: primary = 60%, each concurrent splits remaining 40%
  const allocation = primaryAction
    ? concurrentActions.length > 0
      ? `60% + ${Math.round(40 / concurrentActions.length)}% each`
      : '100%'
    : null

  return (
    <div className="flex flex-col gap-3 p-4 bg-bg-surface-dim border-t border-border-subtle">
      {/* Primary slot */}
      <div>
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-1">
          Primary Action
        </div>
        <div
          className={`flex items-center justify-between px-3 py-2 border ${
            primaryAction ? 'border-gold bg-bg-surface' : 'border-border-subtle bg-transparent'
          }`}
        >
          {primaryAction ? (
            <>
              <span className="font-sans text-sm text-text-primary">{primaryAction.title}</span>
              {onRemovePrimary && (
                <button
                  onClick={onRemovePrimary}
                  className="ml-2 font-mono text-[10px] text-text-tertiary hover:text-status-critical transition-colors shrink-0"
                  aria-label="Remove primary action"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            <span className="font-mono text-2xs text-text-tertiary">— empty —</span>
          )}
        </div>
      </div>

      {/* Concurrent slots */}
      {[0, 1, 2].map(i => (
        <div key={i}>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-1">
            Concurrent {i + 1}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border border-border-subtle bg-transparent">
            {concurrentActions[i] ? (
              <>
                <span className="font-sans text-sm text-text-primary">{concurrentActions[i].title}</span>
                {onRemoveConcurrent && (
                  <button
                    onClick={() => onRemoveConcurrent(concurrentActions[i].id)}
                    className="ml-2 font-mono text-[10px] text-text-tertiary hover:text-status-critical transition-colors shrink-0"
                    aria-label={`Remove ${concurrentActions[i].title}`}
                  >
                    ✕
                  </button>
                )}
              </>
            ) : (
              <span className="font-mono text-2xs text-text-tertiary">— empty —</span>
            )}
          </div>
        </div>
      ))}

      {/* Resource allocation */}
      {allocation && (
        <div className="font-mono text-2xs text-text-tertiary">
          Resources: <span className="text-gold">{allocation}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={() => { if (canSubmit) onSubmit() }}
        disabled={!canSubmit}
        className="w-full py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors bg-gold text-bg-base disabled:bg-bg-surface-high disabled:text-text-tertiary disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'PROCESSING…' : 'SUBMIT TURN PLAN →'}
      </button>
    </div>
  )
}
