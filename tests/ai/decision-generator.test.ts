import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/ai/anthropic', () => ({
  callClaude: vi.fn(),
}))

vi.mock('@/lib/game/state-engine', () => ({
  getStateAtTurn: vi.fn(),
}))

import { callClaude } from '@/lib/ai/anthropic'
import { getStateAtTurn } from '@/lib/game/state-engine'
import { generateDecisionOptions } from '@/lib/ai/decision-generator'
import type { DecisionOption } from '@/lib/ai/decision-generator'

const mockBranchState = {
  scenario_id: 'sc-1',
  actor_states: {
    us: {
      escalation_rung: 4,
      scores: { military_strength: 85, economic_strength: 70 },
    },
  },
  facility_statuses: [
    { actor_id: 'us', name: 'USS Nimitz CSG', type: 'carrier_group', status: 'operational', capacity_pct: 100 },
    { actor_id: 'us', name: 'Fort Bragg Troops', type: 'troop_deployment', status: 'degraded', capacity_pct: 20 },
  ],
  global_state: { global_economic_stress: 40, hormuz_throughput_pct: 30 },
  as_of_date: '2026-04-01',
}

const mockClaudeOutput = {
  options: [
    {
      id: 'naval_blockade',
      label: 'Enforce Naval Blockade',
      description: 'Deploy carrier group to enforce Hormuz closure.',
      category: 'military',
      prerequisites_met: true,
      escalation_delta: 2,
    },
    {
      id: 'ground_invasion',
      label: 'Ground Invasion',
      description: 'Deploy ground forces into southern Iran.',
      category: 'military',
      prerequisites_met: false,
      effectiveness_note: 'Diminished — ground forces at 20% capacity, insufficient for sustained campaign',
      escalation_delta: 4,
    },
  ],
}

describe('generateDecisionOptions', () => {
  beforeEach(() => {
    vi.mocked(getStateAtTurn).mockResolvedValue(mockBranchState as never)
    vi.mocked(callClaude).mockResolvedValue(mockClaudeOutput as never)
  })

  it('returns an array of DecisionOption', async () => {
    const options = await generateDecisionOptions('commit-1', 'branch-1', 'us', {
      actorProfile: {
        id: 'us', name: 'United States', short_name: 'US',
        biographical_summary: 'Global superpower.',
        win_condition: 'Prevent Iranian nuclear capability.',
        strategic_doctrine: 'Escalation dominance.',
        leadership_profile: 'Pragmatic.',
        historical_precedents: 'Gulf War, 2003 Iraq.',
        initial_scores: { escalation_rung: 4 },
      },
    })
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]).toMatchObject({
      id: expect.any(String),
      label: expect.any(String),
      description: expect.any(String),
      category: expect.stringMatching(/military|diplomatic|economic|intelligence|information/),
      prerequisites_met: expect.any(Boolean),
      escalation_delta: expect.any(Number),
    })
  })

  it('marks options with insufficient assets as prerequisites_met: false', async () => {
    const options = await generateDecisionOptions('commit-1', 'branch-1', 'us', {
      actorProfile: {
        id: 'us', name: 'United States', short_name: 'US',
        biographical_summary: '', win_condition: '', strategic_doctrine: '',
        leadership_profile: '', historical_precedents: '',
        initial_scores: { escalation_rung: 4 },
      },
    })
    const groundInvasion = options.find((o: DecisionOption) => o.id === 'ground_invasion')
    expect(groundInvasion?.prerequisites_met).toBe(false)
    expect(groundInvasion?.effectiveness_note).toContain('Diminished')
  })

  it('includes NEUTRALITY in the system prompt passed to callClaude', async () => {
    await generateDecisionOptions('commit-1', 'branch-1', 'us', {
      actorProfile: {
        id: 'us', name: 'United States', short_name: 'US',
        biographical_summary: '', win_condition: '', strategic_doctrine: '',
        leadership_profile: '', historical_precedents: '',
        initial_scores: { escalation_rung: 4 },
      },
    })
    const [_sysPrompt, _userPrompt, opts] = vi.mocked(callClaude).mock.calls[0]!
    const systemText = JSON.stringify(opts!.systemBlocks)
    expect(systemText).toContain('NEUTRALITY')
  })
})
