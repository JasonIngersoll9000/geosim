'use client'
import { DimensionTag, toDimensionTagDimension } from '@/components/game/DimensionTag'
import type { DecisionOption } from '@/lib/types/panels'

interface DecisionOptionDisplay extends DecisionOption {
  description?: string
}

interface Props {
  decisions: DecisionOptionDisplay[]
  onSelect: (decisionId: string) => void
  selectedPrimaryId?: string | null
  selectedConcurrentIds?: string[]
}

const ESCALATION_LABEL: Record<string, { label: string; color: string }> = {
  escalate:      { label: '↑ Escalates',    color: 'text-status-critical' },
  'de-escalate': { label: '↓ De-escalates', color: 'text-status-stable'   },
  neutral:       { label: '→ Neutral',       color: 'text-text-tertiary'   },
}

export function DecisionCatalog({ decisions, onSelect, selectedPrimaryId, selectedConcurrentIds = [] }: Props) {
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
              const esc        = ESCALATION_LABEL[decision.escalationDirection] ?? ESCALATION_LABEL.neutral
              const isPrimary  = decision.id === selectedPrimaryId
              const isConcurr  = selectedConcurrentIds.includes(decision.id)
              const isSelected = isPrimary || isConcurr

              return (
                <button
                  key={decision.id}
                  onClick={() => onSelect(decision.id)}
                  className={`group w-full flex flex-col gap-1 px-3 py-3 border text-left transition-colors ${
                    isPrimary
                      ? 'bg-bg-surface-high border-gold border-l-[3px]'
                      : isConcurr
                      ? 'bg-bg-surface-high border-border-hi border-l-[3px]'
                      : 'bg-bg-surface border-border-subtle hover:bg-bg-surface-high'
                  }`}
                >
                  {/* Row 1: dimension tag + title + selection badge */}
                  <div className="flex items-center gap-2">
                    {/* DimensionTag fades in on hover */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <DimensionTag dimension={toDimensionTagDimension(decision.dimension)} />
                    </span>
                    <span className={`font-sans text-[13px] font-semibold leading-tight flex-1 ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {decision.title}
                    </span>
                    {isPrimary && (
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-gold border border-gold px-1 shrink-0">
                        PRIMARY
                      </span>
                    )}
                    {isConcurr && (
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-text-secondary border border-border-hi px-1 shrink-0">
                        CONCURRENT
                      </span>
                    )}
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
