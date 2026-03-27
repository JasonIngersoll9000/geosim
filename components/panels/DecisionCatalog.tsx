'use client'
import { DimensionTag, toDimensionTagDimension } from '@/components/game/DimensionTag'
import type { DecisionOption } from '@/lib/types/panels'

interface Props {
  decisions: DecisionOption[]
  onSelect: (decisionId: string) => void
}

export function DecisionCatalog({ decisions, onSelect }: Props) {
  // Group by dimension
  const grouped = decisions.reduce<Record<string, DecisionOption[]>>((acc, d) => {
    if (!acc[d.dimension]) acc[d.dimension] = []
    acc[d.dimension].push(d)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4 p-4">
      {Object.entries(grouped).map(([dimension, items]) => (
        <div key={dimension}>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            {dimension}
          </div>
          <div className="flex flex-col gap-1">
            {items.map(decision => (
              <button
                key={decision.id}
                onClick={() => onSelect(decision.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-bg-surface border border-border-subtle hover:bg-bg-surface-high text-left transition-colors"
              >
                <span className="font-sans text-md text-text-primary">{decision.title}</span>
                <div className="flex items-center gap-2">
                  <DimensionTag dimension={toDimensionTagDimension(decision.dimension)} />
                  <span className="font-mono text-2xs text-text-tertiary">
                    {Math.round(decision.resourceWeight * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
