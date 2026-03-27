'use client'
import { useRealtime } from '@/hooks/useRealtime'
import { useGame } from '@/components/providers/GameProvider'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'
import type { DispatchLine } from '@/components/game/DispatchTerminal'

interface Props {
  branchId: string
  scenarioId: string
}

export function GameView({ branchId, scenarioId: _scenarioId }: Props) {
  useRealtime(branchId)
  const { state } = useGame()

  // resolutionProgress is a single string; wrap as one DispatchLine when non-empty
  const lines: DispatchLine[] = state.resolutionProgress
    ? [{ timestamp: new Date().toISOString().slice(11, 19), text: state.resolutionProgress, type: 'default' as const }]
    : []
  const isRunning = state.turnPhase === 'resolution' || state.turnPhase === 'judging'

  return (
    <div className="flex flex-col h-full">
      <div className="font-mono text-2xs text-text-tertiary px-4 py-2 bg-bg-surface-dim border-b border-border-subtle">
        BRANCH: {branchId}
      </div>
      <DispatchTerminal lines={lines} isRunning={isRunning} />
    </div>
  )
}
