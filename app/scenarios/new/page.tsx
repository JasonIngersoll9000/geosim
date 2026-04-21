'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioFrame {
  conflictName: string
  coreQuestion: string
  timeframeStart: string
  timeframeCurrent: string
  geographicScope: string
  userAnalysis: string
  suggestedActors: Array<{
    name: string
    type: string
    whyRelevant: string
    suggestedByUser: boolean
    confirmed: boolean
  }>
  relevanceCriteria: string
  keyDynamics: string[]
  actorFramings: Array<{
    actorName: string
    stakesLevel: string
    winCondition: string
    loseCondition: string
    strategicPosture: string
  }>
}

type WizardStep =
  | 'description'      // Step 1: User enters freeform description
  | 'framing'          // Step 1b: Running Stage 0 AI framing
  | 'clarify'          // Step 2: Clarifying questions + actor review
  | 'confirming'       // Step 2b: Running Stage 0 confirm
  | 'pipeline'         // Step 3: 7-stage progress view
  | 'complete'         // Done

const PIPELINE_STAGES = [
  { id: 0,  label: 'Scenario Framing',      description: 'AI analyzes your conflict description'  },
  { id: 1,  label: 'Actor Profiles',        description: 'Researching key actors and leadership'   },
  { id: 2,  label: 'State Assessments',     description: 'Military, economic, and political scores' },
  { id: 3,  label: 'Relationships & Events',description: 'Mapping alliances, rivalries, and history' },
  { id: 5,  label: 'Escalation Models',     description: 'Building escalation ladders per actor'   },
  { id: 6,  label: 'Intelligence Pictures', description: 'Constructing fog-of-war profiles'        },
  { id: 99, label: 'Finalizing',            description: 'Persisting data and creating branches'   },
]

// ─── Progress step component ───────────────────────────────────────────────────

function PipelineStageRow({
  label,
  description,
  state,
}: {
  label: string
  description: string
  state: 'pending' | 'active' | 'done' | 'error'
}) {
  return (
    <div className={`flex items-start gap-3 py-3 px-4 border-b border-border-subtle transition-colors ${
      state === 'active' ? 'bg-bg-surface' : ''
    }`}>
      <div className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
        {state === 'done'    && <span className="text-status-stable text-[11px]">✓</span>}
        {state === 'active'  && <span className="text-gold text-[10px] animate-pulse">●</span>}
        {state === 'pending' && <span className="text-border-subtle text-[10px]">○</span>}
        {state === 'error'   && <span className="text-status-critical text-[11px]">✕</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-mono text-[11px] uppercase tracking-[0.08em] font-semibold ${
          state === 'done'    ? 'text-status-stable' :
          state === 'active'  ? 'text-gold' :
          state === 'error'   ? 'text-status-critical' :
          'text-text-tertiary'
        }`}>
          {label}
        </div>
        <div className="font-mono text-[10px] text-text-tertiary mt-0.5">{description}</div>
      </div>
    </div>
  )
}

// ─── Main wizard component ─────────────────────────────────────────────────────

export default function NewScenarioPage() {
  const router = useRouter()

  // Shared state
  const [step, setStep]                       = useState<WizardStep>('description')
  const [error, setError]                     = useState<string | null>(null)

  // Step 1 state
  const [description, setDescription]         = useState('')
  const [scenarioId, setScenarioId]           = useState<string | null>(null)
  const [frame, setFrame]                     = useState<ScenarioFrame | null>(null)
  const [clarifyingQuestions, setClarifying]  = useState<string[]>([])
  const [answers, setAnswers]                 = useState<Record<string, string>>({})

  // Step 3 pipeline state
  const [jobId, setJobId]                     = useState<string | null>(null)
  const [pipelineStage, setPipelineStage]     = useState<number>(0)
  const [pipelineStatus, setPipelineStatus]   = useState<'pending'|'running'|'complete'|'error'>('pending')
  const [pipelineError, setPipelineError]     = useState<string | null>(null)

  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // ── Step 1: Create + frame ──────────────────────────────────────────────────

  async function handleDescriptionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!description.trim()) return
    setStep('framing')

    try {
      // 1a. Create scenario record
      const createRes = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: description.slice(0, 80),
          description,
          category: 'custom',
        }),
      })
      if (!createRes.ok) {
        const j = await createRes.json() as { error: string }
        throw new Error(j.error ?? `HTTP ${createRes.status}`)
      }
      const createJson = await createRes.json() as { data: { id: string } }
      const sid = createJson.data.id
      setScenarioId(sid)

      // 1b. Run Stage 0 framing
      const frameRes = await fetch(`/api/scenarios/${sid}/research/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userDescription: description }),
      })
      if (!frameRes.ok) {
        const j = await frameRes.json() as { error: string }
        throw new Error(j.error ?? `HTTP ${frameRes.status}`)
      }
      const frameJson = await frameRes.json() as {
        data: { frame: ScenarioFrame; clarifyingQuestions: string[] }
      }
      setFrame(frameJson.data.frame)
      setClarifying(frameJson.data.clarifyingQuestions ?? [])
      // Initialize empty answers
      const initAnswers: Record<string, string> = {}
      for (const q of frameJson.data.clarifyingQuestions ?? []) {
        initAnswers[q] = ''
      }
      setAnswers(initAnswers)
      setStep('clarify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Framing failed')
      setStep('description')
    }
  }

  // ── Step 2: Confirm frame with clarifications ───────────────────────────────

  async function handleClarifySubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!scenarioId) return
    setStep('confirming')

    try {
      const confirmRes = await fetch(`/api/scenarios/${scenarioId}/research/frame/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userDescription: description, clarifications: answers }),
      })
      if (!confirmRes.ok) {
        const j = await confirmRes.json() as { error: string }
        throw new Error(j.error ?? `HTTP ${confirmRes.status}`)
      }
      const confirmJson = await confirmRes.json() as {
        data: { confirmedFrame: ScenarioFrame }
      }

      // Start pipeline
      const populateRes = await fetch(`/api/scenarios/${scenarioId}/research/populate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedFrame: confirmJson.data.confirmedFrame,
          userDescription: description,
        }),
      })
      if (!populateRes.ok) {
        const j = await populateRes.json() as { error: string }
        throw new Error(j.error ?? `HTTP ${populateRes.status}`)
      }
      const populateJson = await populateRes.json() as { data: { jobId: string } }
      setJobId(populateJson.data.jobId)
      setPipelineStage(0)
      setPipelineStatus('running')
      setStep('pipeline')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
      setStep('clarify')
    }
  }

  // ── Step 3: Poll pipeline status ────────────────────────────────────────────

  const pollStatus = useCallback(async () => {
    if (!scenarioId || !jobId) return
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/research/status?jobId=${jobId}`)
      if (!res.ok) return
      const json = await res.json() as {
        data: { stage: number; status: string; progress: string; error?: string }
      }
      const d = json.data
      setPipelineStage(d.stage)
      setPipelineStatus(d.status as 'pending'|'running'|'complete'|'error')
      if (d.status === 'error') {
        setPipelineError(d.error ?? 'Pipeline error')
      }
      if (d.status === 'complete') {
        setStep('complete')
      }
    } catch { /* ignore network errors */ }
  }, [scenarioId, jobId])

  useEffect(() => {
    if (step !== 'pipeline' || !jobId) return
    pollRef.current = setInterval(pollStatus, 2000)
    void pollStatus()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, jobId, pollStatus])

  // Auto-redirect on complete
  useEffect(() => {
    if (step === 'complete' && scenarioId) {
      const t = setTimeout(() => router.push(`/scenarios/${scenarioId}`), 2000)
      return () => clearTimeout(t)
    }
  }, [step, scenarioId, router])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getStageState(stageId: number): 'pending' | 'active' | 'done' | 'error' {
    if (pipelineStatus === 'error') {
      // mark everything from current stage as error
      return stageId === pipelineStage ? 'error' : stageId < pipelineStage ? 'done' : 'pending'
    }
    if (pipelineStatus === 'complete' || step === 'complete') return 'done'
    if (stageId === 99) {
      // "Finalizing" shows as active only once stage 6 is done
      return pipelineStage >= 6 && pipelineStatus === 'running' ? 'active' : 'pending'
    }
    if (stageId < pipelineStage) return 'done'
    if (stageId === pipelineStage) return 'active'
    return 'pending'
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // WAR-GAME-CREATE" />
      <TopBar scenarioName="CREATE SCENARIO" />

      <main className="pt-[66px] bg-bg-base min-h-screen">
        <div className="max-w-2xl mx-auto px-5 py-10">

          {/* Back link */}
          <Link
            href="/scenarios"
            className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.08em] hover:text-text-secondary transition-colors mb-6 inline-block"
          >
            ← Scenario Library
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold mb-3">
              ◆&nbsp;&nbsp;NEW SCENARIO&nbsp;&nbsp;◆
            </div>
            <h1 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.04em] mb-2">
              Scenario Creation Wizard
            </h1>
            <p className="font-serif italic text-sm text-text-secondary leading-relaxed">
              Describe any geopolitical conflict. The AI research pipeline will build a complete
              simulation engine — actors, relationships, escalation models, and intelligence pictures.
            </p>
          </div>

          {/* Step indicator */}
          <StepIndicator step={step} />

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 border border-status-critical-border bg-status-critical-bg font-mono text-[11px] text-status-critical">
              ERROR — {error}
            </div>
          )}

          {/* ── Step 1: Description ── */}
          <AnimatePresence mode="wait">
            {(step === 'description' || step === 'framing') && (
              <motion.div
                key="description"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleDescriptionSubmit} className="flex flex-col gap-5">
                  <div className="bg-bg-surface-dim border border-border-subtle p-5">
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-4 pb-3 border-b border-border-subtle">
                      Step 1 — Conflict Description
                    </div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.12em] text-text-tertiary mb-2">
                      Describe the conflict you want to simulate
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={6}
                      required
                      disabled={step === 'framing'}
                      placeholder="Example: The 2024 Taiwan Strait crisis — China has escalated military exercises following US arms sale. Describe key actors, flashpoints, and what strategic question you want to explore..."
                      className="w-full px-3 py-2.5 bg-bg-surface border border-border-subtle font-serif text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors resize-none disabled:opacity-50"
                    />
                    <p className="mt-2 font-mono text-[9px] text-text-tertiary">
                      Be specific about actors, geography, timeframe, and the core strategic tension.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!description.trim() || step === 'framing'}
                    className="w-full py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] bg-gold text-bg-base hover:bg-[#e5a600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {step === 'framing'
                      ? '◆ AI IS FRAMING YOUR SCENARIO…'
                      : 'ANALYZE CONFLICT →'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 2: Clarify ── */}
            {(step === 'clarify' || step === 'confirming') && frame && (
              <motion.div
                key="clarify"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleClarifySubmit} className="flex flex-col gap-5">
                  {/* Scenario frame summary */}
                  <div className="bg-bg-surface-dim border border-border-subtle p-5">
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-4 pb-3 border-b border-border-subtle flex items-center justify-between">
                      <span>Scenario Frame — AI Analysis</span>
                      <span className="text-status-stable">● FRAMING COMPLETE</span>
                    </div>

                    <div className="mb-4">
                      <div className="font-label font-bold text-lg text-text-primary uppercase tracking-[0.04em] mb-1">
                        {frame.conflictName}
                      </div>
                      <p className="font-serif italic text-sm text-text-secondary leading-relaxed">
                        {frame.coreQuestion}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-[10px] font-mono">
                      <div>
                        <span className="text-text-tertiary">TIMEFRAME:</span>{' '}
                        <span className="text-text-secondary">{frame.timeframeCurrent}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">SCOPE:</span>{' '}
                        <span className="text-text-secondary">{frame.geographicScope}</span>
                      </div>
                    </div>

                    {/* Actor list */}
                    {frame.suggestedActors?.length > 0 && (
                      <div className="mb-3">
                        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-2">
                          Identified Actors ({frame.suggestedActors.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {frame.suggestedActors.map((a, i) => (
                            <span
                              key={i}
                              className="font-mono text-[9px] px-2 py-1 bg-bg-surface border border-border-subtle text-text-secondary"
                            >
                              {a.name}
                              <span className="ml-1 text-text-tertiary text-[8px]">
                                [{a.type?.slice(0,3).toUpperCase()}]
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key dynamics */}
                    {frame.keyDynamics?.length > 0 && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-1">
                          Key Dynamics
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {frame.keyDynamics.map((d, i) => (
                            <span key={i} className="font-mono text-[9px] px-2 py-0.5 bg-gold-dim border border-gold-border text-gold">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clarifying questions */}
                  {clarifyingQuestions.length > 0 && (
                    <div className="bg-bg-surface-dim border border-border-subtle p-5">
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-4 pb-3 border-b border-border-subtle">
                        Step 2 — Clarifying Questions
                      </div>
                      <p className="font-mono text-[10px] text-text-tertiary mb-4">
                        Answer any questions to improve the simulation fidelity. All fields optional.
                      </p>
                      <div className="flex flex-col gap-4">
                        {clarifyingQuestions.map((q, i) => (
                          <div key={i}>
                            <label className="block font-mono text-[10px] text-text-secondary mb-1.5">
                              {i + 1}. {q}
                            </label>
                            <input
                              type="text"
                              value={answers[q] ?? ''}
                              onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                              disabled={step === 'confirming'}
                              placeholder="Optional — leave blank to use AI defaults"
                              className="w-full px-3 py-2 bg-bg-surface border border-border-subtle font-mono text-[11px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors disabled:opacity-50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={step === 'confirming'}
                    className="w-full py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] bg-gold text-bg-base hover:bg-[#e5a600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {step === 'confirming'
                      ? '◆ CONFIRMING & STARTING PIPELINE…'
                      : 'CONFIRM & RUN RESEARCH PIPELINE →'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 3: Pipeline progress ── */}
            {(step === 'pipeline' || step === 'complete') && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              >
                <div className="bg-bg-surface-dim border border-border-subtle">
                  <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary">
                      Research Pipeline — Stage {pipelineStage} / 6
                    </div>
                    {step === 'complete' ? (
                      <span className="font-mono text-[10px] text-status-stable">
                        ● PIPELINE COMPLETE
                      </span>
                    ) : pipelineStatus === 'error' ? (
                      <span className="font-mono text-[10px] text-status-critical">
                        ● PIPELINE ERROR
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-gold animate-pulse">
                        ● RUNNING
                      </span>
                    )}
                  </div>

                  {/* Stage rows */}
                  <div>
                    {/* Pre-pipeline stages (already done) */}
                    <PipelineStageRow label="Scenario Framing" description="AI analyzed your conflict description" state="done" />
                    <PipelineStageRow label="Frame Confirmed" description="Clarifications incorporated" state="done" />

                    {/* Pipeline stages */}
                    {PIPELINE_STAGES.slice(1).map(s => (
                      <PipelineStageRow
                        key={s.id}
                        label={s.label}
                        description={s.description}
                        state={getStageState(s.id)}
                      />
                    ))}
                  </div>

                  {/* Error message */}
                  {pipelineError && (
                    <div className="px-5 py-3 border-t border-border-subtle font-mono text-[10px] text-status-critical">
                      {pipelineError}
                    </div>
                  )}

                  {/* Complete / redirect notice */}
                  {step === 'complete' && (
                    <div className="px-5 py-4 border-t border-border-subtle">
                      <p className="font-mono text-[11px] text-status-stable mb-3">
                        Research complete. Redirecting to your new scenario…
                      </p>
                      <button
                        onClick={() => router.push(`/scenarios/${scenarioId}`)}
                        className="font-mono text-[11px] uppercase tracking-[0.1em] text-gold hover:underline"
                      >
                        Open Scenario Now →
                      </button>
                    </div>
                  )}

                  {/* Note about pipeline duration */}
                  {step === 'pipeline' && pipelineStatus !== 'error' && (
                    <div className="px-5 py-3 border-t border-border-subtle font-mono text-[9px] text-text-tertiary">
                      This process typically takes 3–6 minutes. Do not close this tab.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  )
}

// ─── Step indicator component ──────────────────────────────────────────────────

function StepIndicator({ step }: { step: WizardStep }) {
  const steps = [
    { label: 'DESCRIBE', match: ['description', 'framing']   },
    { label: 'REVIEW',   match: ['clarify', 'confirming']    },
    { label: 'RESEARCH', match: ['pipeline', 'complete']     },
  ]
  const currentIndex = steps.findIndex(s => s.match.includes(step as string))

  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => {
        const isActive    = currentIndex === i
        const isCompleted = currentIndex > i

        return (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] font-bold transition-colors ${
                isCompleted ? 'bg-status-stable text-bg-base' :
                isActive    ? 'bg-gold text-bg-base' :
                'bg-bg-surface-high text-text-tertiary border border-border-subtle'
              }`}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <span className={`font-mono text-[8px] uppercase tracking-[0.1em] ${
                isActive ? 'text-gold' : isCompleted ? 'text-status-stable' : 'text-text-tertiary'
              }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 -mt-4 transition-colors ${
                isCompleted ? 'bg-status-stable' : 'bg-border-subtle'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
