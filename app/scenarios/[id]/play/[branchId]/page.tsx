// RSC boundary: this is a Server Component — no 'use client'
// Service role key stays server-side only (never NEXT_PUBLIC_, never passed as prop)
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameView } from '@/components/game/GameView'

interface Props {
  params: { id: string; branchId: string }
}

export default function PlayPage({ params }: Props) {
  return (
    // GameProvider is a client component — RSC passes serializable props through it
    <GameProvider>
      <ClassificationBanner classification="TOP SECRET // NOFORN // IRAN-CONFLICT" />
      <TopBar scenarioName="US-ISRAEL-IRAN CONFLICT 2025-2026" />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-5xl mx-auto px-5 py-4">
          <DocumentIdHeader
            scenarioCode={`GEOSIM-${params.id.toUpperCase().slice(0, 12)}`}
            branchName={params.branchId.toUpperCase()}
          />

          <section className="mt-6">
            <GameView branchId={params.branchId} scenarioId={params.id} />
          </section>
        </div>
      </main>
    </GameProvider>
  )
}
