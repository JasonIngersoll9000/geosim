// RSC boundary: this is a Server Component — no 'use client'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameView } from '@/components/game/GameView'

interface Props {
  params: { id: string; branchId: string }
}

export default function PlayPage({ params }: Props) {
  return (
    <GameProvider>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar
        scenarioName="US-ISRAEL-IRAN CONFLICT 2025-2026"
        turnNumber={4}
        totalTurns={12}
        phase="Planning"
      />
      <GameView branchId={params.branchId} scenarioId={params.id} />
    </GameProvider>
  )
}
