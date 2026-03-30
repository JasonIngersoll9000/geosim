import { TurnPhaseIndicator } from '@/components/game/TurnPhaseIndicator'

type Phase = 'planning' | 'resolution' | 'reaction' | 'judging' | 'complete'

interface TopBarProps {
  scenarioName?: string;
  turnNumber?: number;
  totalTurns?: number;
  phase?: string;
}

function toPhase(raw: string): Phase {
  const lower = raw.toLowerCase() as Phase
  const valid: Phase[] = ['planning', 'resolution', 'reaction', 'judging', 'complete']
  return valid.includes(lower) ? lower : 'planning'
}

export function TopBar({
  scenarioName = "Iran Conflict Scenario",
  turnNumber = 4,
  totalTurns = 12,
  phase = "Planning",
}: TopBarProps) {
  return (
    <div
      className="fixed left-0 right-0 top-banner z-40 flex items-center px-4 bg-bg-surface-low border-b border-border-subtle h-topbar"
    >
      {/* Wordmark */}
      <span className="font-label font-bold text-gold text-[16px] tracking-[0.04em]">
        GEOSIM
      </span>

      {/* Separator */}
      <span className="mx-3 inline-block w-px h-[18px] bg-border-subtle" />

      {/* Scenario name */}
      <span className="font-mono text-xs text-text-tertiary tracking-[0.02em]">
        {scenarioName}
      </span>

      {/* Right side: turn + TurnPhaseIndicator */}
      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-xs text-text-tertiary">
          TURN {String(turnNumber).padStart(2, "0")} /{" "}
          {String(totalTurns).padStart(2, "0")}
        </span>
        <span className="px-2 py-0.5 font-mono text-2xs bg-gold-dim rounded-none border border-gold-border tracking-[0.03em] uppercase">
          <TurnPhaseIndicator phase={toPhase(phase)} />
        </span>
      </div>
    </div>
  );
}
