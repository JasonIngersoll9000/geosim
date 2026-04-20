import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStateAtTurn, applyEventEffects, persistStateSnapshot } from '@/lib/game/state-engine'
import { runActorAgent } from '@/lib/ai/actor-agent-runner'
import { runResolutionEngine } from '@/lib/ai/resolution-engine'
import { runJudge, JUDGE_THRESHOLD } from '@/lib/ai/judge-evaluator'
import { runNarrator } from '@/lib/ai/narrator'
import {
  loadDecisionCatalog,
  buildTurnPlanFromIds,
  broadcastTurnEvent,
  computeBranchDivergence,
} from '@/lib/game/turn-helpers'
import type { TurnPlan, Decision } from '@/lib/types/simulation'

// waitUntil keeps the serverless function alive after response is sent
let waitUntil: ((promise: Promise<unknown>) => void) | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vercelFunctions = require('@vercel/functions')
  waitUntil = vercelFunctions.waitUntil
} catch {
  // Not on Vercel — local dev, function stays alive naturally
}

function advanceDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const STALE_TURN_MINUTES = 5

// ── Background pipeline ─────────────────────────────────────────────────────

async function runFullPipeline(
  scenarioId: string,
  branchId: string,
  commitId: string,
  headCommitId: string,
  playerActorId: string | null,
  playerPrimaryAction: string,
  playerConcurrentActions: string[],
  turnNumber: number,
  simulatedDate: string,
) {
  const supabase = createServiceClient()

  try {
    // ── Broadcast: planning ──────────────────────────────────────────────
    await broadcastTurnEvent(branchId, 'turn_started', {
      turnNumber, simulatedDate, phase: 'planning',
    })

    // Update phase in DB
    await supabase.from('turn_commits').update({ current_phase: 'planning' }).eq('id', commitId)

    // ── Load actors + scenario context ───────────────────────────────────
    const [actorRes, scenarioRes] = await Promise.all([
      supabase
        .from('scenario_actors')
        .select('id, name, short_name, biographical_summary, leadership_profile, win_condition, strategic_doctrine, historical_precedents, initial_scores, intelligence_profile')
        .eq('scenario_id', scenarioId),
      supabase
        .from('scenarios')
        .select('name, description, critical_context')
        .eq('id', scenarioId)
        .single(),
    ])

    if (actorRes.error || !actorRes.data?.length) {
      throw new Error(`No actors found for scenario ${scenarioId}`)
    }

    const actorRows = actorRes.data
    const scenario = scenarioRes.data as Record<string, unknown> | null
    const scenarioContext = scenario
      ? `${scenario.name}: ${scenario.description ?? ''}${scenario.critical_context ? '\n' + scenario.critical_context : ''}`
      : 'Geopolitical simulation'

    // ── Load branch state + divergence ───────────────────────────────────
    const [branchState, branchDivergence] = await Promise.all([
      getStateAtTurn(branchId, headCommitId, undefined, { client: supabase }),
      computeBranchDivergence(supabase, branchId),
    ])

    // ── Load decision catalog + build player TurnPlan ────────────────────
    const decisionCatalog = loadDecisionCatalog(scenarioId)

    let playerTurnPlan: TurnPlan | null = null
    if (playerActorId && decisionCatalog[playerActorId]) {
      playerTurnPlan = buildTurnPlanFromIds(
        playerPrimaryAction, playerConcurrentActions, playerActorId, decisionCatalog
      )
    }

    // ── Run AI actor agents ──────────────────────────────────────────────
    const aiActors = actorRows.filter(
      a => a.id !== playerActorId && (decisionCatalog[a.id]?.length ?? 0) > 0
    )

    const aiPlanResults = await Promise.allSettled(
      aiActors.map(async (actor) => {
        const result = await runActorAgent({
          actorId: actor.id,
          actorProfile: actor as Parameters<typeof runActorAgent>[0]['actorProfile'],
          branchState,
          availableDecisions: decisionCatalog[actor.id],
          branchDivergence,
          simulatedDate,
          turnNumber,
        })
        return { actorId: actor.id, actorName: actor.name, turnPlan: result.turnPlan, rationale: result.rationale }
      })
    )

    const aiTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale: string }> = []
    for (const result of aiPlanResults) {
      if (result.status === 'fulfilled') aiTurnPlans.push(result.value)
      // Skip failed agents — resolution engine handles missing actors
    }

    const allTurnPlans: Array<{ actorId: string; actorName: string; turnPlan: TurnPlan; rationale?: string }> = [
      ...aiTurnPlans,
    ]

    if (playerActorId && playerTurnPlan) {
      const playerActor = actorRows.find(a => a.id === playerActorId)
      allTurnPlans.push({
        actorId: playerActorId,
        actorName: playerActor?.name ?? playerActorId,
        turnPlan: playerTurnPlan,
        rationale: 'Player decision',
      })
    }

    // ── Broadcast: resolving ─────────────────────────────────────────────
    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: `${allTurnPlans.length} actor plan(s) generated`, phase: 'resolving',
    })
    await supabase.from('turn_commits').update({ current_phase: 'resolving' }).eq('id', commitId)

    const flatCatalog: Decision[] = Object.values(decisionCatalog).flat()

    // ── Resolution + Judge loop ──────────────────────────────────────────
    let resolution = await runResolutionEngine({
      turnPlans: allTurnPlans,
      branchState,
      decisionCatalog: flatCatalog,
      simulatedDate,
      turnNumber,
      scenarioContext,
    })

    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: 'Actions resolved — judging plausibility', phase: 'judging',
    })
    await supabase.from('turn_commits').update({ current_phase: 'judging' }).eq('id', commitId)

    let judgeResult = await runJudge({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      simulatedDate,
      turnNumber,
      scenarioContext,
    })

    if (judgeResult.verdict === 'retry' || judgeResult.score < JUDGE_THRESHOLD) {
      resolution = await runResolutionEngine({
        turnPlans: allTurnPlans,
        branchState,
        decisionCatalog: flatCatalog,
        simulatedDate,
        turnNumber,
        scenarioContext,
        judgeCorrection: judgeResult.critique,
      })
      const retryJudge = await runJudge({
        turnPlans: allTurnPlans,
        effects: resolution.effects,
        headline: resolution.headline,
        narrativeSummary: resolution.narrativeSummary,
        simulatedDate,
        turnNumber,
        scenarioContext,
      })
      judgeResult = { ...retryJudge, verdict: 'accept' }
    }

    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: `Judge score: ${judgeResult.score} — accepted`, phase: 'narrating',
    })
    await supabase.from('turn_commits').update({ current_phase: 'narrating' }).eq('id', commitId)

    // ── Narrator ─────────────────────────────────────────────────────────
    const narration = await runNarrator({
      turnPlans: allTurnPlans,
      effects: resolution.effects,
      headline: resolution.headline,
      narrativeSummary: resolution.narrativeSummary,
      judgeScore: judgeResult.score,
      judgeCritique: judgeResult.critique,
      simulatedDate,
      turnNumber,
      scenarioContext,
      escalationChanges: resolution.escalationChanges,
    })

    await broadcastTurnEvent(branchId, 'resolution_progress', {
      message: 'Narrative generated — finalizing', phase: 'finalizing',
    })
    await supabase.from('turn_commits').update({ current_phase: 'finalizing' }).eq('id', commitId)

    // ── Persist state ────────────────────────────────────────────────────
    const newState = applyEventEffects(branchState, resolution.effects)
    await persistStateSnapshot(scenarioId, branchId, commitId, newState, { client: supabase })

    // ── Update turn_commit with full results ─────────────────────────────
    await supabase.from('turn_commits').update({
      current_phase: 'complete',
      planning_phase: { turnPlans: allTurnPlans },
      resolution_phase: {
        effects: resolution.effects,
        escalationChanges: resolution.escalationChanges,
        narrativeSummary: resolution.narrativeSummary,
      },
      judging_phase: {
        score: judgeResult.score,
        critique: judgeResult.critique,
        verdict: judgeResult.verdict,
      },
      narrative_entry: narration.fullBriefing,
      full_briefing: narration.fullBriefing,
      chronicle_headline: narration.chronicleHeadline,
    }).eq('id', commitId)

    // ── Advance branch head ──────────────────────────────────────────────
    await supabase.from('branches').update({
      head_commit_id: commitId,
      updated_at: new Date().toISOString(),
    }).eq('id', branchId)

    // ── Broadcast: complete ──────────────────────────────────────────────
    await broadcastTurnEvent(branchId, 'turn_completed', {
      commitId, turnNumber, phase: 'complete',
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error'
    console.error('[advance/pipeline]', message)

    try {
      await supabase.from('turn_commits').update({ current_phase: 'failed' }).eq('id', commitId)
      await broadcastTurnEvent(branchId, 'turn_failed', { error: message, phase: 'failed' })
    } catch (broadcastErr) {
      console.error('[advance/pipeline] failed to broadcast failure:', broadcastErr)
    }
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id: scenarioId, branchId } = params

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { primaryAction: string; concurrentActions: string[]; controlledActors?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.primaryAction) {
    return NextResponse.json({ error: 'primaryAction is required' }, { status: 400 })
  }

  // ── Authenticate ────────────────────────────────────────────────────────
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()

  const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!user && authConfigured && !devMode) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── Load branch ─────────────────────────────────────────────────────────
  const supabase = createServiceClient()

  const { data: branch, error: branchErr } = await supabase
    .from('branches')
    .select('id, head_commit_id, scenario_id, user_controlled_actors, created_by')
    .eq('id', branchId)
    .single()

  if (branchErr || !branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  const branchRow = branch as {
    id: string; head_commit_id: string | null; scenario_id: string;
    user_controlled_actors: string[]; created_by: string | null
  }

  // ── Authorize ───────────────────────────────────────────────────────────
  const isOwner = user ? branchRow.created_by === user.id : devMode

  if (!isOwner) {
    const { data: scenarioMeta } = await supabase
      .from('scenarios').select('visibility').eq('id', branchRow.scenario_id).single()
    const isPublic = (scenarioMeta as Record<string, unknown> | null)?.visibility === 'public'
    if (!isPublic) {
      return NextResponse.json({ error: 'Access denied: private scenario' }, { status: 403 })
    }
  }

  const headCommitId = branchRow.head_commit_id
  if (!headCommitId) {
    return NextResponse.json({ error: 'Branch has no head commit' }, { status: 400 })
  }

  // ── Check duplicate submission ──────────────────────────────────────────
  const { data: inProgress } = await supabase
    .from('turn_commits')
    .select('id, created_at')
    .eq('branch_id', branchId)
    .not('current_phase', 'in', '("complete","failed")')
    .limit(1)

  if (inProgress && inProgress.length > 0) {
    const createdAt = new Date((inProgress[0] as Record<string, unknown>).created_at as string)
    const staleThreshold = Date.now() - STALE_TURN_MINUTES * 60 * 1000
    if (createdAt.getTime() > staleThreshold) {
      return NextResponse.json({ error: 'Turn already in progress' }, { status: 409 })
    }
    // Stale turn — mark as failed and allow new submission
    await supabase.from('turn_commits')
      .update({ current_phase: 'failed' })
      .eq('id', (inProgress[0] as Record<string, unknown>).id as string)
  }

  // ── Load head commit for turn number ────────────────────────────────────
  const { data: headCommit } = await supabase
    .from('turn_commits')
    .select('turn_number, simulated_date')
    .eq('id', headCommitId)
    .single()

  const prevTurn = (headCommit as Record<string, unknown> | null)?.turn_number as number ?? 0
  const prevDate = (headCommit as Record<string, unknown> | null)?.simulated_date as string ?? '2026-03-04'
  const newTurnNumber = prevTurn + 1
  const newSimDate = advanceDate(prevDate, 7)

  // ── Insert turn_commit ──────────────────────────────────────────────────
  const { data: newCommit, error: insertErr } = await supabase
    .from('turn_commits')
    .insert({
      branch_id: branchId,
      parent_commit_id: headCommitId,
      turn_number: newTurnNumber,
      simulated_date: newSimDate,
      scenario_snapshot: {},
      planning_phase: { primaryAction: body.primaryAction, concurrentActions: body.concurrentActions },
      current_phase: 'submitted',
      is_ground_truth: false,
    })
    .select('id')
    .single()

  if (insertErr || !newCommit) {
    return NextResponse.json({ error: `Failed to create turn: ${insertErr?.message}` }, { status: 500 })
  }

  const commitId = (newCommit as { id: string }).id
  const playerActorId = body.controlledActors?.[0] ?? null

  // ── Fire background pipeline ────────────────────────────────────────────
  const pipelinePromise = runFullPipeline(
    scenarioId, branchId, commitId, headCommitId,
    playerActorId, body.primaryAction, body.concurrentActions ?? [],
    newTurnNumber, newSimDate,
  )

  if (waitUntil) {
    waitUntil(pipelinePromise)
  } else {
    void pipelinePromise
  }

  // ── Instant response ────────────────────────────────────────────────────
  return NextResponse.json({
    turnCommitId: commitId,
    turnNumber: newTurnNumber,
    simulatedDate: newSimDate,
    status: 'processing' as const,
  })
}
