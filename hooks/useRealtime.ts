'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGame } from '@/components/providers/GameProvider'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Scenario } from '@/lib/types/simulation'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface TurnCommitPayload {
  id: string
  branch_id: string
  turn_number: number
  simulated_date: string | null
  narrative_entry: string | null
  chronicle_headline: string | null
  chronicle_entry: string | null
}

interface UseRealtimeOptions {
  onTurnCommit?: (payload: TurnCommitPayload) => void
}

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

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

export function useRealtime(
  branchId: string,
  options: UseRealtimeOptions = {}
): { status: RealtimeStatus } {
  const { onTurnCommit } = options
  const { dispatch } = useGame()
  const [status, setStatus] = useState<RealtimeStatus>(DEV_MODE ? 'disconnected' : 'connecting')

  // Keep callback stable via ref to avoid re-subscribing on every render
  const onTurnCommitRef = useRef(onTurnCommit)
  useEffect(() => { onTurnCommitRef.current = onTurnCommit }, [onTurnCommit])

  useEffect(() => {
    if (DEV_MODE || !branchId) {
      setStatus('disconnected')
      return
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setStatus('disconnected')
      return
    }

    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch (err) {
      console.error('[useRealtime] Supabase client init failed — realtime disabled', { branchId, err })
      setStatus('error')
      return
    }

    const channel = supabase
      .channel(`branch:${branchId}`)
      // ── Postgres changes: turn_commits INSERT ──────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'turn_commits',
          filter: `branch_id=eq.${branchId}`,
        },
        (evt: RealtimePostgresChangesPayload<TurnCommitPayload>) => {
          const row = evt.new as TurnCommitPayload
          onTurnCommitRef.current?.(row)
        }
      )
      // ── Broadcast: turn lifecycle events ───────────────────────────────────
      .on('broadcast', { event: 'turn_started' }, ({ payload }: { payload: TurnStartedPayload }) => {
        dispatch({ type: 'SET_TURN_PHASE', payload: 'planning' })
        void payload
      })
      .on('broadcast', { event: 'resolution_progress' }, ({ payload }: { payload: ResolutionProgressPayload }) => {
        dispatch({ type: 'SET_RESOLUTION_PROGRESS', payload: payload.message })
      })
      .on('broadcast', { event: 'turn_completed' }, ({ payload }: { payload: TurnCompletedPayload }) => {
        dispatch({ type: 'SET_COMMIT', payload: { commitId: payload.commitId, turnNumber: payload.turnNumber, snapshot: payload.snapshot } })
        dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })
      })
      .subscribe((sub_status: string, err?: Error) => {
        if (sub_status === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (sub_status === 'CHANNEL_ERROR' || sub_status === 'TIMED_OUT') {
          console.error('[useRealtime] Channel subscription failed', { branchId, sub_status, err })
          setStatus('error')
        } else if (sub_status === 'CLOSED') {
          setStatus('disconnected')
        }
      })

    return () => {
      supabase?.removeChannel(channel)
      setStatus('disconnected')
    }
  }, [branchId, dispatch])

  return { status }
}
