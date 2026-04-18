'use client'
import { useGame } from '@/components/providers/GameProvider'
import { TURN_PHASE_ORDER } from '@/lib/types/simulation'
import type { TurnPhase } from '@/lib/types/simulation'

interface PhaseStep {
  phase: TurnPhase
  label: string
}

const PIPELINE_PHASES: PhaseStep[] = [
  { phase: 'submitted',  label: 'Turn submitted' },
  { phase: 'planning',   label: 'Generating actor plans' },
  { phase: 'resolving',  label: 'Resolving actions' },
  { phase: 'judging',    label: 'Judging plausibility' },
  { phase: 'narrating',  label: 'Generating narrative' },
  { phase: 'finalizing', label: 'Finalizing turn' },
]

function phaseIndex(phase: TurnPhase): number {
  return TURN_PHASE_ORDER.indexOf(phase)
}

interface Props {
  onRetry?: () => void
}

export function DispatchTerminal({ onRetry }: Props) {
  const { state } = useGame()
  const { turnPhase, turnError, resolutionProgress } = state

  const currentIdx = phaseIndex(turnPhase)
  const isComplete = turnPhase === 'complete'
  const isFailed = turnPhase === 'failed'
  const isIdle = !state.isResolutionRunning && turnPhase === 'planning' && !resolutionProgress

  if (isIdle) return null

  return (
    <div className="flex flex-col bg-bg-surface-dim border border-border-subtle overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <span className="font-mono text-2xs uppercase tracking-widest text-text-tertiary">
          Turn Pipeline
        </span>
      </div>

      <div className="px-4 py-3 space-y-2 font-mono text-2xs">
        {PIPELINE_PHASES.map((step) => {
          const stepIdx = phaseIndex(step.phase)
          const isDone = isComplete || currentIdx > stepIdx
          const isCurrent = !isComplete && !isFailed && currentIdx === stepIdx

          return (
            <div key={step.phase} className="flex items-center gap-2">
              <span className={
                isDone ? 'text-gold' : isCurrent ? 'text-status-info' : 'text-text-tertiary'
              }>
                {isDone ? '\u2713' : isCurrent ? '\u25CB' : '\u2022'}
              </span>
              <span className={
                isDone ? 'text-gold' : isCurrent ? 'text-status-info' : 'text-text-tertiary'
              }>
                {step.label}
                {isCurrent && resolutionProgress ? ` \u2014 ${resolutionProgress}` : ''}
              </span>
            </div>
          )
        })}

        {isComplete && (
          <div className="flex items-center gap-2 mt-2 text-gold">
            <span>{'\u2713'}</span>
            <span>Turn complete</span>
          </div>
        )}

        {isFailed && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-status-critical">
              <span>{'\u2717'}</span>
              <span>Pipeline failed{turnError ? `: ${turnError}` : ''}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-2xs font-mono uppercase tracking-wider bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors"
              >
                Retry Turn
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
