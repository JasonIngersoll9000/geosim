// RSC boundary: this is a Server Component — no 'use client'
// Service role key stays server-side only (never NEXT_PUBLIC_, never passed as prop)
import type { Actor } from '@/lib/types/simulation'
import type { BranchRow } from '@/lib/types/database'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'
import { DispatchTerminal } from '@/components/game/DispatchTerminal'
import { GameProvider } from '@/components/providers/GameProvider'

interface Props {
  params: { id: string; branchId: string }
}

// Stub: returns a serializable initial snapshot shape (Task 14 wires real Supabase query)
function getInitialSnapshot(scenarioId: string, branchId: string) {
  return {
    scenarioId,
    branchId,
    turnNumber: 0,
    actors: [] as Actor[],
    branches: [] as BranchRow[],
  }
}

export default function PlayPage({ params }: Props) {
  // Dev mode uses stub data; real auth + Supabase service client added in Task 14
  const initialSnapshot = getInitialSnapshot(params.id, params.branchId)

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

          {/* Game panels placeholder */}
          <div className="mt-4 mb-6 pb-5 border-b border-border-subtle">
            <h1 className="font-label text-[22px] font-bold uppercase tracking-[0.04em] text-text-primary">
              Turn Resolution
            </h1>
            <p className="font-sans text-[13px] mt-2 max-w-2xl leading-[1.6] text-text-secondary">
              Branch: {initialSnapshot.branchId} — Actor panels and decision catalog wired in Task 14.
            </p>
          </div>

          {/* Dispatch Terminal — live data wired in Task 14 */}
          <section className="mt-6">
            <h2 className="font-label text-[11px] font-semibold uppercase tracking-[0.06em] mb-3 text-text-tertiary">
              Resolution Feed
            </h2>
            <DispatchTerminal lines={[]} isRunning={false} />
          </section>
        </div>
      </main>
    </GameProvider>
  )
}
