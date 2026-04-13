'use client'
import { DimensionTag, toDimensionTagDimension } from '@/components/game/DimensionTag'
import type { DecisionOption } from '@/lib/types/panels'

interface DecisionOptionDisplay extends DecisionOption {
  description?: string
  prerequisites?: string[]
}

interface Props {
  decisions: DecisionOptionDisplay[]
  onSelect: (decisionId: string) => void
  selectedPrimaryId?: string | null
  selectedConcurrentIds?: string[]
}

const ESCALATION_LABEL: Record<string, { label: string; color: string; indicator: string }> = {
  escalate:      { label: 'Escalates',    color: 'text-status-critical',  indicator: '▲' },
  'de-escalate': { label: 'De-escalates', color: 'text-status-stable',    indicator: '▼' },
  neutral:       { label: 'Neutral',      color: 'text-text-tertiary',    indicator: '─' },
}

export function DecisionCatalog({ decisions, onSelect, selectedPrimaryId, selectedConcurrentIds = [] }: Props) {
  const grouped = decisions.reduce<Record<string, DecisionOptionDisplay[]>>((acc, d) => {
    if (!acc[d.dimension]) acc[d.dimension] = []
    acc[d.dimension].push(d)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 p-4">
      {Object.entries(grouped).map(([dimension, items]) => (
        <div key={dimension}>
          {/* Dimension group header */}
          <div className="flex items-center gap-2 mb-2">
            <DimensionTag dimension={toDimensionTagDimension(dimension)} />
            <span className="font-mono text-2xs uppercase tracking-[0.12em] text-text-tertiary">
              {items.length} option{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {items.map(decision => {
              const esc        = ESCALATION_LABEL[decision.escalationDirection] ?? ESCALATION_LABEL.neutral
              const isPrimary  = decision.id === selectedPrimaryId
              const isConcurr  = selectedConcurrentIds.includes(decision.id)
              const isSelected = isPrimary || isConcurr
              const hasPrereqs = decision.prerequisites && decision.prerequisites.length > 0

              return (
                <button
                  key={decision.id}
                  onClick={() => onSelect(decision.id)}
                  className={`group w-full flex flex-col gap-1.5 px-3 py-3 border text-left transition-colors ${
                    isPrimary
                      ? 'bg-bg-surface-high border-gold border-l-[3px]'
                      : isConcurr
                      ? 'bg-bg-surface-high border-border-hi border-l-[3px]'
                      : 'bg-bg-surface border-border-subtle hover:bg-bg-surface-high hover:border-border-hi'
                  }`}
                >
                  {/* Row 1: title + selection badge */}
                  <div className="flex items-center gap-2">
                    <span className={`font-sans text-[13px] font-semibold leading-tight flex-1 ${isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`}>
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
                    <p className="font-sans text-[11px] text-text-tertiary leading-snug group-hover:text-text-secondary transition-colors">
                      {decision.description}
                    </p>
                  )}

                  {/* Row 3: prerequisites (if any) */}
                  {hasPrereqs && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {decision.prerequisites!.map((prereq, i) => (
                        <span key={i} className="font-mono text-[8px] uppercase tracking-[0.08em] text-text-tertiary border border-border-subtle px-1.5 py-0.5">
                          {prereq}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 4: escalation impact + resource weight */}
                  <div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-border-subtle">
                    <span className={`font-mono text-[10px] ${esc.color} flex items-center gap-1`}>
                      <span className="text-[8px]">{esc.indicator}</span>
                      {esc.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Resource bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-bg-surface-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-text-tertiary rounded-full"
                            style={{ width: `${Math.round(decision.resourceWeight * 100)}%`, opacity: 0.6 }}
                          />
                        </div>
                        <span className="font-mono text-2xs text-text-tertiary">
                          {Math.round(decision.resourceWeight * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {decisions.length === 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary text-center py-8">
          No decisions available for this turn
        </p>
      )}
    </div>
  )
}
