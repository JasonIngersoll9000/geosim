'use client'
import { DimensionTag, toDimensionTagDimension } from '@/components/game/DimensionTag'
import type { DecisionOption } from '@/lib/types/panels'

// Local extension — description is optional so the component stays backward-compatible
// when the data source doesn't provide it yet.
interface DecisionOptionDisplay extends DecisionOption {
  description?: string
}

interface Props {
  decisions: DecisionOptionDisplay[]
  onSelect: (decisionId: string) => void
}

const ESCALATION_LABEL: Record<string, { label: string; color: string }> = {
  escalate:    { label: '↑ Escalates',    color: 'text-status-critical' },
  'de-escalate': { label: '↓ De-escalates', color: 'text-status-stable' },
  neutral:     { label: '→ Neutral',       color: 'text-text-tertiary' },
}

export function DecisionCatalog({ decisions, onSelect }: Props) {
  const grouped = decisions.reduce<Record<string, DecisionOptionDisplay[]>>((acc, d) => {
    if (!acc[d.dimension]) acc[d.dimension] = []
    acc[d.dimension].push(d)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5 p-4">
      {Object.entries(grouped).map(([dimension, items]) => (
        <div key={dimension}>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            {dimension}
          </div>
          <div className="flex flex-col gap-2">
            {items.map(decision => {
              const esc = ESCALATION_LABEL[decision.escalationDirection] ?? ESCALATION_LABEL.neutral
              return (
                <button
                  key={decision.id}
                  onClick={() => onSelect(decision.id)}
                  className="w-full flex flex-col gap-1 px-3 py-3 bg-bg-surface border border-border-subtle hover:bg-bg-surface-high text-left transition-colors"
                >
                  {/* Row 1: dimension tag + title */}
                  <div className="flex items-center gap-2">
                    <DimensionTag dimension={toDimensionTagDimension(decision.dimension)} />
                    <span className="font-sans text-[13px] font-semibold text-text-primary leading-tight">
                      {decision.title}
                    </span>
                  </div>
                  {/* Row 2: description */}
                  {decision.description && (
                    <p className="font-sans text-[11px] text-text-secondary leading-snug">
                      {decision.description}
                    </p>
                  )}
                  {/* Row 3: escalation impact + resource weight */}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`font-mono text-[10px] ${esc.color}`}>{esc.label}</span>
                    <span className="font-mono text-2xs text-text-tertiary">
                      {Math.round(decision.resourceWeight * 100)}% resources
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
