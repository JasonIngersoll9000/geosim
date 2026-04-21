/**
 * Tests that prompt caching is correctly applied to stable sections of each
 * AI agent system prompt, without caching turn-variable data.
 *
 * Implementation note: these tests mock @anthropic-ai/sdk at the module level,
 * capture the `system` array passed to messages.create, and assert that:
 *  1. At least one block has cache_control: { type: 'ephemeral' }.
 *  2. Exactly two blocks are cached (NEUTRALITY_PREAMBLE + role-specific).
 *  3. Turn-variable data (date, turn number, live scores) is NOT in any cached block.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'

// ---- captured call store (module-level so the hoisted mock can write to it) ---
const capturedCalls: Array<{
  system: Anthropic.Messages.TextBlockParam[]
  userContent: string
}> = []

// vi.mock is hoisted to the top of the file by Vitest — the factory runs before
// any imports, so capturedCalls must be defined before this call.
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn(async (params: Anthropic.Messages.MessageCreateParamsNonStreaming) => {
    const systemBlocks = Array.isArray(params.system)
      ? (params.system as Anthropic.Messages.TextBlockParam[])
      : []
    const userContent =
      typeof params.messages?.[0]?.content === 'string'
        ? (params.messages[0].content as string)
        : ''

    capturedCalls.push({ system: systemBlocks, userContent })

    // Default response shape — works for actor agent.
    // Individual tests that call other agents override `text` content.
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            // actor agent fields
            primaryActionDecisionId: 'test-decision',
            primaryActionProfile: null,
            primaryActionResourcePercent: 100,
            concurrentActions: [],
            rationale: 'test rationale',
            // resolution engine fields
            actor_score_deltas: {},
            asset_inventory_deltas: {},
            global_state_deltas: { oil_price_usd: 0, hormuz_throughput_pct: 0, global_economic_stress: 0 },
            facility_updates: [],
            new_depletion_rates: [],
            headline: 'Test headline',
            escalation_changes: [],
            narrative_summary: 'Test summary',
            // judge fields
            score: 75,
            critique: 'Looks good.',
            verdict: 'accept',
            rationale_breakdown: {
              actor_rationality: 20,
              resolution_realism: 20,
              historical_grounding: 15,
              internal_consistency: 20,
            },
            // narrator fields
            chronicle_headline: 'Test headline',
            full_briefing: 'Test briefing.',
          }),
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 0,
      },
    }
  })

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  }
})

// ---- fixtures ----------------------------------------------------------

function makeActorProfile() {
  return {
    id: 'united_states',
    name: 'United States',
    short_name: 'US',
    biographical_summary: 'The primary Western superpower.',
    leadership_profile: 'Presidential democracy.',
    win_condition: 'Prevent Iranian nuclear capability.',
    strategic_doctrine: 'Forward deterrence and alliance management.',
    historical_precedents: 'Desert Storm, Iraqi Freedom.',
    initial_scores: { military_strength: 95, political_stability: 75 },
  }
}

function makeBranchState() {
  return {
    actor_states: {
      united_states: {
        military_strength: 90,
        political_stability: 70,
        economic_health: 80,
        public_support: 60,
        international_standing: 75,
        asset_availability: {},
        facility_statuses: [],
      },
    },
    global_state: {
      oil_price_usd: 85,
      hormuz_throughput_pct: 100,
      global_economic_stress: 30,
    },
  }
}

function makeDecisions() {
  return [
    {
      id: 'diplomatic-engagement',
      name: 'Diplomatic Engagement',
      description: 'Pursue diplomatic channels.',
      dimension: 'diplomatic',
      escalationLevel: 1,
    },
  ]
}

// ---- Actor Agent tests -------------------------------------------------

describe('Actor Agent prompt caching', () => {
  beforeEach(() => { capturedCalls.length = 0 })

  it('sends system prompt as an array of content blocks', async () => {
    const { runActorAgent } = await import('@/lib/ai/actor-agent-runner')
    await runActorAgent({
      actorId: 'united_states',
      actorProfile: makeActorProfile(),
      branchState: makeBranchState() as unknown as Parameters<typeof runActorAgent>[0]['branchState'],
      availableDecisions: makeDecisions() as unknown as Parameters<typeof runActorAgent>[0]['availableDecisions'],
      branchDivergence: 0,
      simulatedDate: '2026-01-01',
      turnNumber: 1,
    })

    expect(capturedCalls.length).toBeGreaterThan(0)
    expect(Array.isArray(capturedCalls[0].system)).toBe(true)
    expect(capturedCalls[0].system.length).toBeGreaterThanOrEqual(1)
  })

  it('has cache_control: { type: "ephemeral" } on at least one system block', async () => {
    const { runActorAgent } = await import('@/lib/ai/actor-agent-runner')
    await runActorAgent({
      actorId: 'united_states',
      actorProfile: makeActorProfile(),
      branchState: makeBranchState() as unknown as Parameters<typeof runActorAgent>[0]['branchState'],
      availableDecisions: makeDecisions() as unknown as Parameters<typeof runActorAgent>[0]['availableDecisions'],
      branchDivergence: 0,
      simulatedDate: '2026-01-01',
      turnNumber: 1,
    })

    const cachedBlocks = capturedCalls[0].system.filter(
      b => b.cache_control?.type === 'ephemeral'
    )
    expect(cachedBlocks.length).toBeGreaterThanOrEqual(1)
  })

  it('has exactly two cache_control breakpoints — preamble and role-specific block', async () => {
    const { runActorAgent } = await import('@/lib/ai/actor-agent-runner')
    await runActorAgent({
      actorId: 'united_states',
      actorProfile: makeActorProfile(),
      branchState: makeBranchState() as unknown as Parameters<typeof runActorAgent>[0]['branchState'],
      availableDecisions: makeDecisions() as unknown as Parameters<typeof runActorAgent>[0]['availableDecisions'],
      branchDivergence: 0,
      simulatedDate: '2026-01-01',
      turnNumber: 1,
    })

    const cachedBlocks = capturedCalls[0].system.filter(
      b => b.cache_control?.type === 'ephemeral'
    )
    expect(cachedBlocks.length).toBe(2)
  })

  it('does NOT include turn-variable data in any cached block', async () => {
    const { runActorAgent } = await import('@/lib/ai/actor-agent-runner')
    const simulatedDate = '2026-03-15'
    const turnNumber = 7
    await runActorAgent({
      actorId: 'united_states',
      actorProfile: makeActorProfile(),
      branchState: makeBranchState() as unknown as Parameters<typeof runActorAgent>[0]['branchState'],
      availableDecisions: makeDecisions() as unknown as Parameters<typeof runActorAgent>[0]['availableDecisions'],
      branchDivergence: 2,
      simulatedDate,
      turnNumber,
    })

    const cachedText = capturedCalls[0].system
      .filter(b => b.cache_control?.type === 'ephemeral')
      .map(b => b.text)
      .join('\n')

    // These values change every turn — must NOT be in cached blocks
    expect(cachedText).not.toContain(simulatedDate)
    expect(cachedText).not.toContain(`Turn ${turnNumber}`)
    expect(cachedText).not.toContain('Military Strength:')
    expect(cachedText).not.toContain('Branch diverged')

    // They should appear in the user message instead
    expect(capturedCalls[0].userContent).toContain(simulatedDate)
    expect(capturedCalls[0].userContent).toContain(`Turn ${turnNumber}`)
  })

  it('NEUTRALITY_PREAMBLE text appears in the first cached system block', async () => {
    const { runActorAgent } = await import('@/lib/ai/actor-agent-runner')
    const { NEUTRALITY_PREAMBLE } = await import('@/lib/ai/prompts')
    await runActorAgent({
      actorId: 'united_states',
      actorProfile: makeActorProfile(),
      branchState: makeBranchState() as unknown as Parameters<typeof runActorAgent>[0]['branchState'],
      availableDecisions: makeDecisions() as unknown as Parameters<typeof runActorAgent>[0]['availableDecisions'],
      branchDivergence: 0,
      simulatedDate: '2026-01-01',
      turnNumber: 1,
    })

    const firstCachedBlock = capturedCalls[0].system.find(
      b => b.cache_control?.type === 'ephemeral'
    )
    expect(firstCachedBlock).toBeDefined()
    // The first cached block must contain the preamble (or start of it)
    const preambleStart = NEUTRALITY_PREAMBLE.slice(0, 60)
    expect(firstCachedBlock!.text).toContain(preambleStart)
  })
})

// ---- Resolution Engine tests ------------------------------------------

describe('Resolution Engine prompt caching', () => {
  beforeEach(() => { capturedCalls.length = 0 })

  it('has exactly two cache_control breakpoints', async () => {
    const { runResolutionEngine } = await import('@/lib/ai/resolution-engine')
    await runResolutionEngine({
      turnPlans: [],
      branchState: makeBranchState() as unknown as Parameters<typeof runResolutionEngine>[0]['branchState'],
      decisionCatalog: [],
      simulatedDate: '2026-01-01',
      turnNumber: 1,
      scenarioContext: 'Test scenario',
    })

    expect(capturedCalls.length).toBeGreaterThan(0)
    const cachedBlocks = capturedCalls[0].system.filter(
      b => b.cache_control?.type === 'ephemeral'
    )
    expect(cachedBlocks.length).toBe(2)
  })

  it('turn-variable data is NOT in any cached block', async () => {
    const { runResolutionEngine } = await import('@/lib/ai/resolution-engine')
    const simulatedDate = '2026-06-01'
    const turnNumber = 5
    await runResolutionEngine({
      turnPlans: [],
      branchState: makeBranchState() as unknown as Parameters<typeof runResolutionEngine>[0]['branchState'],
      decisionCatalog: [],
      simulatedDate,
      turnNumber,
      scenarioContext: 'Test scenario',
    })

    const cachedText = capturedCalls[0].system
      .filter(b => b.cache_control?.type === 'ephemeral')
      .map(b => b.text)
      .join('\n')

    expect(cachedText).not.toContain(simulatedDate)
    expect(cachedText).not.toContain(`Turn ${turnNumber}`)
  })
})

// ---- Judge Evaluator tests --------------------------------------------

describe('Judge Evaluator prompt caching', () => {
  beforeEach(() => { capturedCalls.length = 0 })

  it('has exactly two cache_control breakpoints', async () => {
    const { runJudge } = await import('@/lib/ai/judge-evaluator')
    await runJudge({
      turnPlans: [],
      effects: {
        actor_score_deltas: {},
        asset_inventory_deltas: {},
        global_state_deltas: {},
        facility_updates: [],
        new_depletion_rates: [],
      },
      headline: 'Test',
      narrativeSummary: 'Summary',
      simulatedDate: '2026-01-01',
      turnNumber: 1,
      scenarioContext: 'Test scenario',
    })

    expect(capturedCalls.length).toBeGreaterThan(0)
    const cachedBlocks = capturedCalls[0].system.filter(
      b => b.cache_control?.type === 'ephemeral'
    )
    expect(cachedBlocks.length).toBe(2)
  })

  it('turn-variable data is NOT in any cached block', async () => {
    const { runJudge } = await import('@/lib/ai/judge-evaluator')
    const simulatedDate = '2026-09-15'
    const turnNumber = 12
    await runJudge({
      turnPlans: [],
      effects: {
        actor_score_deltas: {},
        asset_inventory_deltas: {},
        global_state_deltas: {},
        facility_updates: [],
        new_depletion_rates: [],
      },
      headline: 'Test',
      narrativeSummary: 'Summary',
      simulatedDate,
      turnNumber,
      scenarioContext: 'Test scenario',
    })

    const cachedText = capturedCalls[0].system
      .filter(b => b.cache_control?.type === 'ephemeral')
      .map(b => b.text)
      .join('\n')
    expect(cachedText).not.toContain(simulatedDate)
    expect(cachedText).not.toContain(`Turn ${turnNumber}`)
  })
})

// ---- Narrator tests ---------------------------------------------------

describe('Narrator prompt caching', () => {
  beforeEach(() => { capturedCalls.length = 0 })

  it('has exactly two cache_control breakpoints', async () => {
    const { runNarrator } = await import('@/lib/ai/narrator')
    await runNarrator({
      turnPlans: [],
      effects: {
        actor_score_deltas: {},
        asset_inventory_deltas: {},
        global_state_deltas: {},
        facility_updates: [],
        new_depletion_rates: [],
      },
      headline: 'Test',
      narrativeSummary: 'Summary',
      judgeScore: 80,
      judgeCritique: 'Good.',
      simulatedDate: '2026-01-01',
      turnNumber: 1,
      scenarioContext: 'Test scenario',
      escalationChanges: [],
    })

    expect(capturedCalls.length).toBeGreaterThan(0)
    const cachedBlocks = capturedCalls[0].system.filter(
      b => b.cache_control?.type === 'ephemeral'
    )
    expect(cachedBlocks.length).toBe(2)
  })

  it('turn-variable data is NOT in any cached block', async () => {
    const { runNarrator } = await import('@/lib/ai/narrator')
    const simulatedDate = '2026-12-01'
    const turnNumber = 20
    await runNarrator({
      turnPlans: [],
      effects: {
        actor_score_deltas: {},
        asset_inventory_deltas: {},
        global_state_deltas: {},
        facility_updates: [],
        new_depletion_rates: [],
      },
      headline: 'Test',
      narrativeSummary: 'Summary',
      judgeScore: 60,
      judgeCritique: 'Acceptable.',
      simulatedDate,
      turnNumber,
      scenarioContext: 'Test scenario',
      escalationChanges: [],
    })

    const cachedText = capturedCalls[0].system
      .filter(b => b.cache_control?.type === 'ephemeral')
      .map(b => b.text)
      .join('\n')
    expect(cachedText).not.toContain(simulatedDate)
    expect(cachedText).not.toContain(`Turn ${turnNumber}`)
  })
})
