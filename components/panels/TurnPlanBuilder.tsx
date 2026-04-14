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

const MAX_CONCURRENT = 3

export function TurnPlanBuilder({
  primaryAction,
  concurrentActions,
  onSubmit,
  onRemovePrimary,
  onRemoveConcurrent,
  isSubmitting = false,
}: Props) {
  const canSubmit = !!primaryAction && !isSubmitting

  // Show filled concurrent slots + 1 empty slot (if room), not always 3 empties
  const concurrentSlotCount = Math.min(
    concurrentActions.length + (concurrentActions.length < MAX_CONCURRENT ? 1 : 0),
    MAX_CONCURRENT
  )

  // Resource allocation display
  const totalSlots  = 1 + concurrentActions.length
  const primaryPct  = Math.round(100 / totalSlots)
  const concurrPct  = totalSlots > 1 ? Math.round((100 - primaryPct) / concurrentActions.length) : 0
  const allocation  = primaryAction
    ? concurrentActions.length > 0
      ? `${primaryPct}% primary · ${concurrPct}% each concurrent`
      : '100%'
    : null

  return (
    <div className="flex flex-col gap-2.5 p-4 bg-bg-surface-dim border-t border-border-subtle">
      {/* Primary slot */}
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-tertiary mb-1">
          Primary Action
        </div>
        <div className={`flex items-center justify-between px-3 py-2 border transition-colors ${
          primaryAction
            ? 'border-gold bg-bg-surface'
            : 'border-border-subtle border-dashed bg-transparent'
        }`}>
          {primaryAction ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="font-sans text-[12px] text-text-primary truncate">{primaryAction.title}</span>
              </div>
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
            <span className="font-mono text-2xs text-text-tertiary">Select a decision above</span>
          )}
        </div>
      </div>

      {/* Concurrent slots — only show filled + 1 empty */}
      {Array.from({ length: concurrentSlotCount }, (_, i) => {
        const action = concurrentActions[i]
        return (
          <div key={i}>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-tertiary mb-1">
              Concurrent {i + 1}{' '}
              <span className="text-text-tertiary opacity-50">(optional)</span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 border transition-colors ${
              action
                ? 'border-border-hi bg-bg-surface'
                : 'border-border-subtle border-dashed bg-transparent'
            }`}>
              {action ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary shrink-0" />
                    <span className="font-sans text-[12px] text-text-primary truncate">{action.title}</span>
                  </div>
                  {onRemoveConcurrent && (
                    <button
                      onClick={() => onRemoveConcurrent(action.id)}
                      className="ml-2 font-mono text-[10px] text-text-tertiary hover:text-status-critical transition-colors shrink-0"
                      aria-label={`Remove ${action.title}`}
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <span className="font-mono text-2xs text-text-tertiary">Add concurrent action</span>
              )}
            </div>
          </div>
        )
      })}

      {/* Resource allocation */}
      {allocation && (
        <div className="font-mono text-2xs text-text-tertiary border-t border-border-subtle pt-2">
          Resources: <span className="text-gold">{allocation}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={() => { if (canSubmit) onSubmit() }}
        disabled={!canSubmit}
        className="w-full py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors bg-gold text-bg-base disabled:bg-bg-surface-high disabled:text-text-tertiary disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'PROCESSING…' : 'SUBMIT TURN PLAN →'}
      </button>
    </div>
  )
}
