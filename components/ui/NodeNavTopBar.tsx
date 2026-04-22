'use client'
import { useRouter } from 'next/navigation'
import { TopBar } from './TopBar'

interface Props {
  scenarioId: string
  branchId: string
  prevCommitId: string | null
  nextCommitId: string | null
  scenarioName?: string
  scenarioHref?: string
  turnNumber?: number
  totalTurns?: number
  phase?: string
  gameMode?: string
  howToPlaySlot?: React.ReactNode
}

export function NodeNavTopBar({
  scenarioId,
  branchId,
  prevCommitId,
  nextCommitId,
  ...topBarProps
}: Props) {
  const router = useRouter()
  function navigate(commitId: string) {
    router.push(`/scenarios/${scenarioId}/play/${branchId}?commit=${commitId}`)
  }
  return (
    <TopBar
      {...topBarProps}
      prevCommitId={prevCommitId}
      nextCommitId={nextCommitId}
      onNavigate={navigate}
    />
  )
}
