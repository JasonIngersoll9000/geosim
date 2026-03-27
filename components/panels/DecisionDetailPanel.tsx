'use client'
import { SlideOverPanel } from '@/components/ui/SlideOverPanel'
import { IntelligenceReportBlock } from '@/components/game/IntelligenceReportBlock'
import { DimensionTag, toDimensionTagDimension } from '@/components/game/DimensionTag'
import type { DecisionDetail, EscalationDirection } from '@/lib/types/panels'

interface Props {
  open: boolean
  onClose: () => void
  decision: DecisionDetail | null
}

const escalationLabel: Record<EscalationDirection, string> = {
  escalate: 'Escalatory',
  'de-escalate': 'De-escalatory',
  neutral: 'Neutral',
}

const escalationColor: Record<EscalationDirection, string> = {
  escalate: 'text-status-critical',
  'de-escalate': 'text-status-stable',
  neutral: 'text-text-tertiary',
}

export function DecisionDetailPanel({ open, onClose, decision }: Props) {
  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title={decision?.title ?? 'Decision Detail'}
      subtitle={decision ? `${decision.dimension} / ${escalationLabel[decision.escalationDirection]}` : undefined}
    >
      {decision ? (
        <div className="flex flex-col gap-4 p-4">
          {/* Dimension + escalation metadata */}
          <div className="flex items-center gap-3">
            <DimensionTag dimension={toDimensionTagDimension(decision.dimension)} />
            <span className={`font-mono text-2xs uppercase tracking-[0.06em] ${escalationColor[decision.escalationDirection]}`}>
              {escalationLabel[decision.escalationDirection]}
            </span>
            <span className="font-mono text-2xs text-text-tertiary ml-auto">
              Weight: {Math.round(decision.resourceWeight * 100)}%
            </span>
          </div>

          {/* Strategic rationale */}
          <IntelligenceReportBlock
            header="Strategic Rationale"
            body={decision.strategicRationale}
          />

          {/* Expected outcomes */}
          {decision.expectedOutcomes && (
            <IntelligenceReportBlock
              header="Expected Outcomes"
              body={decision.expectedOutcomes}
            />
          )}

          {/* Concurrency rules */}
          {decision.concurrencyRules.length > 0 && (
            <div>
              <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
                Concurrency Rules
              </div>
              <div className="flex flex-col gap-1">
                {decision.concurrencyRules.map(rule => (
                  <div
                    key={rule.decisionId}
                    className="flex items-center justify-between px-3 py-2 bg-bg-surface border border-border-subtle"
                  >
                    <span className="font-sans text-md text-text-primary">{rule.decisionTitle}</span>
                    <span className={`font-mono text-2xs uppercase tracking-[0.06em] ${rule.compatible ? 'text-status-stable' : 'text-status-critical'}`}>
                      {rule.compatible ? 'Compatible' : 'Incompatible'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 font-mono text-2xs text-text-tertiary">
          No decision selected.
        </div>
      )}
    </SlideOverPanel>
  )
}
