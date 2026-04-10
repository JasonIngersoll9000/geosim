interface ActionOutcome {
  actorId: string
  decisionId: string
  succeeded: boolean
  outcome: string
  parameterEffects: string
}

interface JudgeScores {
  plausibility: number
  consistency: number
  proportionality: number
  rationality: number
  cascadeLogic: number
  overallScore: number
}

interface ResolutionData {
  narrative: string
  actionOutcomes: ActionOutcome[]
  reactionPhase: string | null
  judgeScores: JudgeScores
}

interface Props {
  resolution: ResolutionData | null
}

export function EventsTab({ resolution }: Props) {
  if (!resolution) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
          No Events Yet
        </div>
        <p className="font-serif italic text-sm text-text-tertiary">
          Resolution events will appear here after a turn is submitted.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 bg-bg-surface-dim overflow-y-auto">
      {/* Narrative */}
      <section>
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
          Turn Narrative
        </div>
        <p className="font-serif italic text-sm leading-[1.75] text-text-secondary">
          {resolution.narrative}
        </p>
      </section>

      {/* Action Outcomes */}
      <section>
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
          Action Outcomes
        </div>
        <div className="flex flex-col gap-2">
          {resolution.actionOutcomes.map((ao, i) => (
            <div key={i} className="px-3 py-2 bg-bg-surface border border-border-subtle">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-mono text-2xs ${ao.succeeded ? 'text-status-stable' : 'text-status-critical'}`}>
                  {ao.succeeded ? '✓' : '✗'}
                </span>
                <span className="font-sans text-base text-text-primary">{ao.outcome}</span>
              </div>
              <div className="font-mono text-2xs text-text-tertiary">{ao.parameterEffects}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Judge Scores */}
      <section>
        <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
          Judge Scores
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(Object.entries(resolution.judgeScores) as [string, number][]).map(([label, score]) => (
            <div key={label} className="flex flex-col items-center px-2 py-1 bg-bg-surface border border-border-subtle">
              <span className="font-mono text-2xs text-text-tertiary capitalize">{label}</span>
              <span className={`font-mono text-base ${score >= 80 ? 'text-status-stable' : score >= 60 ? 'text-gold' : 'text-status-critical'}`}>
                {score}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Reaction Phase */}
      {resolution.reactionPhase && (
        <section>
          <div className="font-mono text-2xs uppercase tracking-[0.1em] text-text-tertiary mb-2">
            Reaction Phase
          </div>
          <p className="font-serif italic text-sm leading-[1.75] text-text-secondary">
            {resolution.reactionPhase}
          </p>
        </section>
      )}
    </div>
  )
}
