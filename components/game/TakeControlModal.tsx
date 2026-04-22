'use client'
import { useState } from 'react'
import type { DecisionOption } from '@/lib/ai/decision-generator'

type ActorOption = {
  id: string
  name: string
  shortName: string
  escalationRung: number
}

interface Props {
  commitId: string
  scenarioId: string
  branchId: string
  actors: ActorOption[]
  onClose: () => void
  onJoined: (branchId: string) => void
  onForked: (branchId: string) => void
}

type Phase = 'pick-actor' | 'loading-options' | 'pick-action' | 'forking' | 'error'

export function TakeControlModal({
  commitId,
  scenarioId: _scenarioId,
  branchId: _branchId,
  actors,
  onClose,
  onJoined,
  onForked,
}: Props) {
  const [phase, setPhase]                   = useState<Phase>('pick-actor')
  const [selectedActor, setSelectedActor]   = useState<ActorOption | null>(null)
  const [options, setOptions]               = useState<DecisionOption[]>([])
  const [selectedOption, setSelectedOption] = useState<DecisionOption | null>(null)
  const [error, setError]                   = useState<string | null>(null)

  async function handleActorSelect(actor: ActorOption) {
    setSelectedActor(actor)
    setPhase('loading-options')
    try {
      const res = await fetch(`/api/nodes/${commitId}/decision-options?actor=${actor.id}`)
      if (!res.ok) throw new Error(`Options unavailable (${res.status})`)
      const json = await res.json() as { options: DecisionOption[] }
      setOptions(json.options)
      setPhase('pick-action')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options')
      setPhase('error')
    }
  }

  async function handleFork() {
    if (!selectedActor || !selectedOption) return
    setPhase('forking')
    try {
      const res = await fetch(`/api/nodes/${commitId}/fork`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          actorId:       selectedActor.id,
          primaryAction: selectedOption.id,
        }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? `Fork failed (${res.status})`)
      }
      const json = await res.json() as { branchId: string; joined: boolean }
      if (json.joined) onJoined(json.branchId)
      else             onForked(json.branchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fork failed')
      setPhase('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(5,10,18,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-tertiary">
            TAKE CONTROL — INTERJECT AT THIS NODE
          </span>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary font-mono text-xs">✕</button>
        </div>

        {/* Phase: pick actor */}
        {phase === 'pick-actor' && (
          <>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
              SELECT ACTOR TO CONTROL
            </p>
            <div className="flex flex-col gap-2">
              {actors.map(actor => (
                <button
                  key={actor.id}
                  onClick={() => handleActorSelect(actor)}
                  className="flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-high)' }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-primary">{actor.name}</span>
                  <span className="font-mono text-[8px] text-text-tertiary">RUNG {actor.escalationRung}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Phase: loading */}
        {phase === 'loading-options' && (
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary">
            GENERATING OPTIONS BASED ON CURRENT SITUATION…
          </p>
        )}

        {/* Phase: pick action */}
        {phase === 'pick-action' && (
          <>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
              SELECT ACTION AS {selectedActor?.shortName}
            </p>
            <div className="flex flex-col gap-2 mb-6 max-h-80 overflow-y-auto">
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedOption(opt)}
                  className="flex flex-col gap-1 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                  style={{
                    border: `1px solid ${selectedOption?.id === opt.id ? 'var(--status-warning)' : 'var(--border-subtle)'}`,
                    background: 'var(--bg-surface-high)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-primary">{opt.label}</span>
                    <span className="font-mono text-[8px] text-text-tertiary">
                      {opt.escalation_delta !== 0
                        ? `${opt.escalation_delta > 0 ? '↑ +' : '↓ '}${opt.escalation_delta} rungs`
                        : '→ 0 rungs'}
                    </span>
                  </div>
                  <p className="font-sans text-[10px] text-text-secondary leading-relaxed">{opt.description}</p>
                  {!opt.prerequisites_met && opt.effectiveness_note && (
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: 'var(--status-warning)' }}>
                      ⚠ {opt.effectiveness_note}
                    </p>
                  )}
                  {opt.already_explored && (
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: 'var(--status-info)' }}>
                      {'→ PATH ALREADY EXPLORED — YOU WILL JOIN AN EXISTING BRANCH'}
                    </p>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleFork}
              disabled={!selectedOption}
              className="w-full py-3 font-mono text-[9px] uppercase tracking-[0.18em] transition-opacity disabled:opacity-40"
              style={{ background: 'var(--status-warning)', color: '#050A12' }}
            >
              {selectedOption?.already_explored ? 'JOIN EXISTING PATH →' : 'FORK HERE →'}
            </button>
          </>
        )}

        {/* Phase: forking */}
        {phase === 'forking' && (
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary">
            FORKING BRANCH — RUNNING AI PIPELINE…
          </p>
        )}

        {/* Phase: error */}
        {phase === 'error' && (
          <>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--status-critical)' }}>
              {error}
            </p>
            <button
              onClick={() => { setPhase('pick-actor'); setError(null) }}
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary hover:text-text-primary"
            >
              {'← RETRY'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
