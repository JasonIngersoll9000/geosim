import Link from 'next/link'
import { TurnPhaseIndicator } from '@/components/game/TurnPhaseIndicator'
import { UserMenu } from '@/components/ui/UserMenu'
import type { TurnPhase } from '@/lib/types/simulation'

interface TopBarProps {
  scenarioName?: string;
  scenarioHref?: string;
  turnNumber?: number;
  totalTurns?: number;
  phase?: string;
  gameMode?: string;
  howToPlaySlot?: React.ReactNode;
  prevCommitId?: string | null;
  nextCommitId?: string | null;
  onNavigate?: (commitId: string) => void;
}

const VALID_PHASES: TurnPhase[] = [
  'submitted', 'planning', 'resolving', 'judging', 'narrating', 'finalizing', 'complete', 'failed',
]

function toPhase(raw: string): TurnPhase {
  const lower = raw.toLowerCase() as TurnPhase
  return VALID_PHASES.includes(lower) ? lower : 'planning'
}

export function TopBar({
  scenarioName = "Iran Conflict Scenario",
  scenarioHref,
  turnNumber = 0,
  totalTurns = 0,
  phase = "Planning",
  gameMode = "Simulation",
  howToPlaySlot,
  prevCommitId,
  nextCommitId,
  onNavigate,
}: TopBarProps) {
  return (
    <div
      className="fixed left-0 right-0 top-banner z-40 flex items-center px-4 bg-bg-surface-low border-b border-border-subtle h-topbar"
    >
      {/* Wordmark — always links home */}
      <Link
        href="/"
        className="font-label font-bold text-gold text-[16px] tracking-[0.04em] hover:opacity-80 transition-opacity"
      >
        WAR GAME
      </Link>

      {/* Separator */}
      <span className="mx-3 inline-block w-px h-[18px] bg-border-subtle" />

      {/* Scenario name — links to hub when scenarioHref provided */}
      {scenarioHref ? (
        <Link
          href={scenarioHref}
          className="font-mono text-xs text-text-tertiary tracking-[0.02em] hover:text-text-secondary transition-colors"
        >
          {scenarioName}
        </Link>
      ) : (
        <span className="font-mono text-xs text-text-tertiary tracking-[0.02em]">
          {scenarioName}
        </span>
      )}

      {/* Game mode badge */}
      <span className="ml-3 px-2 py-0.5 font-mono text-2xs text-text-secondary bg-bg-surface-high border border-border-subtle uppercase tracking-[0.06em]">
        {gameMode}
      </span>

      {/* Right side: how to play + turn counter + phase badge + user menu */}
      <div className="ml-auto flex items-center gap-3">
        {howToPlaySlot}
        <div className="flex items-center gap-1">
          {prevCommitId && onNavigate && (
            <button
              onClick={() => onNavigate(prevCommitId)}
              className="font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-1 border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-text-tertiary transition-colors"
              aria-label="Previous turn"
            >
              ←
            </button>
          )}
          <span className="font-mono text-xs text-text-tertiary">
            TURN {turnNumber > 0 ? String(turnNumber).padStart(2, "0") : "\u2014"} /{" "}
            {totalTurns > 0 ? String(totalTurns).padStart(2, "0") : "\u2014"}
          </span>
          {nextCommitId && onNavigate && (
            <button
              onClick={() => onNavigate(nextCommitId)}
              className="font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-1 border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-text-tertiary transition-colors"
              aria-label="Next turn"
            >
              →
            </button>
          )}
        </div>
        <span className="px-2 py-0.5 font-mono text-2xs bg-gold-dim rounded-none border border-gold-border tracking-[0.03em] uppercase">
          <TurnPhaseIndicator phase={toPhase(phase)} />
        </span>
        <UserMenu />
      </div>
    </div>
  );
}
