'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGame } from '@/components/providers/GameProvider'
import type { Scenario } from '@/lib/types/simulation'

interface TurnStartedPayload {
  availableDecisions?: unknown[]
}

interface ResolutionProgressPayload {
  message: string
}

interface TurnCompletedPayload {
  commitId: string
  turnNumber: number
  snapshot: Scenario
}

export function useRealtime(branchId: string) {
  const { dispatch } = useGame()

  useEffect(() => {
    // Lazily create the client so missing env vars don't crash the module on import
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch (err) {
      console.error('[useRealtime] Supabase client init failed — realtime disabled', { branchId, err })
      return
    }

    const channel = supabase
      .channel(`branch:${branchId}`)
      .on('broadcast', { event: 'turn_started' }, ({ payload }: { payload: TurnStartedPayload }) => {
        dispatch({ type: 'SET_TURN_PHASE', payload: 'planning' })
        // TODO: dispatch SET_AVAILABLE_DECISIONS when that action is added to GameProvider
        void payload
      })
      .on('broadcast', { event: 'resolution_progress' }, ({ payload }: { payload: ResolutionProgressPayload }) => {
        dispatch({ type: 'SET_RESOLUTION_PROGRESS', payload: payload.message })
      })
      .on('broadcast', { event: 'turn_completed' }, ({ payload }: { payload: TurnCompletedPayload }) => {
        dispatch({ type: 'SET_COMMIT', payload: { commitId: payload.commitId, turnNumber: payload.turnNumber, snapshot: payload.snapshot } })
        dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })
      })
      .subscribe((status: string, err?: Error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useRealtime] Channel subscription failed', { branchId, status, err })
        }
      })

    return () => { supabase?.removeChannel(channel) }
  }, [branchId, dispatch])
}
