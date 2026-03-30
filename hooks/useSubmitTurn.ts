'use client'
import { useState, useCallback } from 'react'
import type { DispatchLine } from '@/components/game/DispatchTerminal'
import type { ActionSlot } from '@/lib/types/panels'

// Mock fallback only in development — production surfaces real API errors
const DEV_MOCK_ENABLED = process.env.NODE_ENV === 'development'

interface TurnPlan {
  primaryAction: ActionSlot
  concurrentActions: ActionSlot[]
}

interface UseSubmitTurnResult {
  submitTurn: (plan: TurnPlan) => Promise<void>
  isSubmitting: boolean
  isComplete: boolean
  error: string | null
  lines: DispatchLine[]
  reset: () => void
}

// ─── Mock streaming lines for fallback ───────────────────────────────────────

function makeMockLines(plan: TurnPlan): Array<{ text: string; type: DispatchLine['type']; delayMs: number }> {
  return [
    { text: `TURN PLAN RECEIVED — PRIMARY: ${plan.primaryAction.title.toUpperCase()}`,         type: 'confirmed', delayMs: 0   },
    { text: `Concurrent actions queued: ${plan.concurrentActions.length}`,                      type: 'default',   delayMs: 320 },
    { text: 'Submitting plan to game engine…',                                                  type: 'info',      delayMs: 480 },
    { text: 'Validating action compatibility rules…',                                           type: 'default',   delayMs: 700 },
    { text: 'Compatibility check passed',                                                        type: 'confirmed', delayMs: 900 },
    { text: '═══════ RESOLUTION PHASE INITIATED ═══════',                                       type: 'info',      delayMs: 1100 },
    { text: `Actor: United States executing — ${plan.primaryAction.title}`,                     type: 'default',   delayMs: 1400 },
    { text: 'Actor: Iran — asymmetric response triggered',                                      type: 'critical',  delayMs: 1900 },
    { text: 'Actor: Israel — secondary strike coordination active',                             type: 'default',   delayMs: 2300 },
    { text: 'Actor: Gulf States — emergency session convened',                                  type: 'default',   delayMs: 2600 },
    { text: '─── Generating outcome narrative ───',                                             type: 'info',      delayMs: 3000 },
    { text: 'US action succeeded with moderate effectiveness',                                  type: 'confirmed', delayMs: 3600 },
    { text: 'Iranian proxy network partially disrupted — Hezbollah resupply delayed 18 days',  type: 'stable',    delayMs: 4100 },
    { text: 'Oil price response: $142 → $138/bbl (MCM operation progress)',                    type: 'default',   delayMs: 4500 },
    { text: 'Escalation rung unchanged — RUNG 6',                                               type: 'default',   delayMs: 4900 },
    { text: '─── Judging Phase ───',                                                            type: 'info',      delayMs: 5200 },
    { text: 'Plausibility: 87 | Consistency: 84 | Rationality: 90',                            type: 'default',   delayMs: 5600 },
    { text: 'Overall judge score: 86 / 100',                                                    type: 'confirmed', delayMs: 6000 },
    { text: '═══════ TURN 04 COMPLETE — TURN 05 BEGINS ═══════',                               type: 'confirmed', delayMs: 6400 },
  ]
}

// ─── SSE / text stream parser ─────────────────────────────────────────────────

function parseStreamLine(raw: string): { text: string; type: DispatchLine['type'] } | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === ':') return null  // SSE comment / keepalive

  // SSE format: "data: {json}"
  const dataPrefix = 'data: '
  if (trimmed.startsWith(dataPrefix)) {
    try {
      const payload = JSON.parse(trimmed.slice(dataPrefix.length))
      return {
        text: String(payload.text ?? payload.content ?? payload.message ?? ''),
        type: (payload.type as DispatchLine['type']) ?? 'default',
      }
    } catch {
      return { text: trimmed.slice(dataPrefix.length), type: 'default' }
    }
  }

  // Plain text line
  return { text: trimmed, type: 'default' }
}

function nowStamp(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubmitTurn(branchId: string): UseSubmitTurnResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [lines, setLines]               = useState<DispatchLine[]>([])

  const appendLine = useCallback((line: DispatchLine) => {
    setLines(prev => [...prev, line])
  }, [])

  const runMockStream = useCallback(async (plan: TurnPlan) => {
    const mockLines = makeMockLines(plan)
    let prevDelayMs = 0
    for (const item of mockLines) {
      const relativeDelay = item.delayMs - prevDelayMs
      if (relativeDelay > 0) await new Promise(res => setTimeout(res, relativeDelay))
      prevDelayMs = item.delayMs
      appendLine({ timestamp: nowStamp(), text: item.text, type: item.type })
    }
  }, [appendLine])

  const submitTurn = useCallback(async (plan: TurnPlan) => {
    setIsSubmitting(true)
    setIsComplete(false)
    setError(null)
    setLines([{
      timestamp: nowStamp(),
      text: 'INITIALIZING TURN SUBMISSION…',
      type: 'info',
    }])

    try {
      const res = await fetch(`/api/branches/${branchId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryAction: plan.primaryAction.id,
          concurrentActions: plan.concurrentActions.map(a => a.id),
        }),
      })

      if (!res.ok) {
        // In development with no backend: fall back to mock simulation
        if (DEV_MOCK_ENABLED && (res.status === 404 || res.status === 405)) {
          appendLine({ timestamp: nowStamp(), text: 'DEV: API not deployed — running simulation', type: 'info' })
          await runMockStream(plan)
          setIsComplete(true)
          return
        }
        throw new Error(`Server error ${res.status}`)
      }

      // Real streaming response
      const reader = res.body?.getReader()
      if (!reader) {
        if (DEV_MOCK_ENABLED) {
          appendLine({ timestamp: nowStamp(), text: 'DEV: No response body — running simulation', type: 'info' })
          await runMockStream(plan)
          setIsComplete(true)
          return
        }
        throw new Error('No response body from server')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const parsed = parseStreamLine(part)
          if (parsed?.text) {
            // 40ms stagger between streamed lines
            await new Promise(res => setTimeout(res, 40))
            appendLine({ timestamp: nowStamp(), text: parsed.text, type: parsed.type })
          }
        }
      }

      // Flush any remaining buffer
      if (buffer.trim()) {
        const parsed = parseStreamLine(buffer)
        if (parsed?.text) appendLine({ timestamp: nowStamp(), text: parsed.text, type: parsed.type })
      }

      setIsComplete(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      const isNetworkError = msg.includes('fetch') || msg.includes('Failed') || msg.includes('network')
      if (DEV_MOCK_ENABLED && isNetworkError) {
        // Network error in dev (API not deployed) → fall back to mock simulation
        appendLine({ timestamp: nowStamp(), text: 'DEV: Network error — running simulation', type: 'info' })
        await runMockStream(plan)
        setIsComplete(true)
      } else {
        setError(msg)
        appendLine({ timestamp: nowStamp(), text: `ERROR: ${msg}`, type: 'critical' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [branchId, appendLine, runMockStream])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setIsComplete(false)
    setError(null)
    setLines([])
  }, [])

  return { submitTurn, isSubmitting, isComplete, error, lines, reset }
}
