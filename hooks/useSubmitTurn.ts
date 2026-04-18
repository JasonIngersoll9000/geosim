'use client'
import { useState, useCallback } from 'react'

interface TurnSubmission {
  primaryAction: string
  concurrentActions: string[]
  controlledActors: string[]
}

export interface TurnSubmitResponse {
  turnCommitId: string
  turnNumber: number
  status: 'processing'
}

interface UseSubmitTurnResult {
  submitTurn: (submission: TurnSubmission) => Promise<TurnSubmitResponse | null>
  isSubmitting: boolean
  error: string | null
  reset: () => void
}

export function useSubmitTurn(scenarioId: string, branchId: string): UseSubmitTurnResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitTurn = useCallback(async (submission: TurnSubmission): Promise<TurnSubmitResponse | null> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/branches/${branchId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }

      const data = await res.json() as TurnSubmitResponse
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [scenarioId, branchId])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setError(null)
  }, [])

  return { submitTurn, isSubmitting, error, reset }
}
