import { GlobalTicker } from '@/components/chronicle/GlobalTicker'
import { ChronicleTimeline } from '@/components/chronicle/ChronicleTimeline'

const MOCK_TICKER_ITEMS = [
  'Strait of Hormuz 40% blocked',
  'Oil $142/bbl',
  'Iran mobilizes IRGC reserves',
  'US CENTCOM DEFCON 3',
  'Israel Iron Dome at 94% capacity',
]

const MOCK_ENTRIES = [
  {
    turnNumber: 1,
    date: '13 Mar 2026',
    title: 'Opening Moves',
    narrative:
      'US and allied forces established a naval cordon in the Persian Gulf. Iran announced suspension of JCPOA monitoring access.',
    severity: 'minor' as const,
    tags: ['Naval Cordon', 'JCPOA Suspended'],
  },
  {
    turnNumber: 2,
    date: '14 Mar 2026',
    title: 'Proxy Escalation',
    narrative:
      'Houthi forces launched a coordinated drone barrage against Saudi Aramco facilities. Tehran denied involvement while praising "resistance fighters."',
    severity: 'major' as const,
    tags: ['Houthi Drones', 'Aramco Hit', 'Saudi Arabia'],
  },
  {
    turnNumber: 3,
    date: '15 Mar 2026',
    title: 'The Oil War Escalates',
    narrative:
      'US and Israeli forces struck Iran oil infrastructure at Kharg Island. Fires visible from satellite. Global markets in freefall.',
    severity: 'critical' as const,
    tags: ['Kharg Island Strike', 'Oil $142/bbl', 'Markets -8%'],
    detail:
      'Strike package: 24x F-35I, 6x B-2 Spirit. Israeli Air Force coordination confirmed. Secondary explosions at tank farm T-7.',
  },
]

export default async function ChroniclePage({
  params,
}: {
  params: { branchId: string }
}) {
  return (
    <div className="bg-bg-base min-h-screen">
      <GlobalTicker items={MOCK_TICKER_ITEMS} />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary mb-1">
          Branch {params.branchId}
        </div>
        <h1 className="font-sans font-bold text-xl uppercase tracking-[0.04em] text-text-primary mb-6">
          War Chronicle
        </h1>
        <ChronicleTimeline entries={MOCK_ENTRIES} />
      </div>
    </div>
  )
}
