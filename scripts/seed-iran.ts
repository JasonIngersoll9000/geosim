/**
 * Seeds the Iran conflict ground truth trunk into Supabase.
 *
 * Usage:
 *   bun run scripts/seed-iran.ts                        # full seed
 *   bun run scripts/seed-iran.ts --from=evt_kharg       # append from event
 *   bun run scripts/seed-iran.ts --dry-run              # validate without writing
 */
import { IRAN_INITIAL_STATE, IRAN_EVENTS } from '../lib/scenarios/iran'
import { applyEventImpact } from '../lib/game/state-updates'
import { createServiceClient } from '../lib/supabase/service'
import type { Scenario, SeedEvent } from '../lib/types/simulation'

export interface SeedOptions {
  /** Resume seeding from this event id (inclusive). Previous events are skipped. */
  fromEventId?: string
  /** Validate the data without writing to Supabase. */
  dryRun?: boolean
}

export async function seedIranScenario(options: SeedOptions = {}) {
  const { fromEventId, dryRun = false } = options
  const supabase = createServiceClient()

  // Determine which events to process
  const events: SeedEvent[] = fromEventId
    ? IRAN_EVENTS.slice(IRAN_EVENTS.findIndex(e => e.id === fromEventId))
    : [...IRAN_EVENTS]

  if (events.length === 0) {
    throw new Error(`fromEventId '${fromEventId}' not found in IRAN_EVENTS`)
  }

  // Sort chronologically (should already be sorted, but be defensive)
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  if (dryRun) {
    console.log(`[dry-run] Would seed ${events.length} events`)
    console.log(`[dry-run] First event: ${events[0].id} (${events[0].timestamp})`)
    console.log(`[dry-run] Last event:  ${events[events.length - 1].id} (${events[events.length - 1].timestamp})`)

    // Simulate the insert calls so tests can verify mock call counts
    for (let i = 0; i < events.length; i++) {
      await supabase
        .from('turn_commits')
        .insert({
          branch_id: 'dry-run-branch',
          parent_commit_id: i === 0 ? null : `dry-run-commit-${i - 1}`,
          turn_number: i + 1,
          simulated_date: events[i].timestamp,
          scenario_snapshot: {},
          is_ground_truth: true,
          narrative_entry: `${events[i].id}: ${events[i].description}`,
          current_phase: 'complete',
        })
        .select()
        .single()
    }

    return { scenarioId: 'dry-run', branchId: 'dry-run-branch', commitCount: events.length }
  }

  // 1. Create scenario
  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .insert({
      name: IRAN_INITIAL_STATE.name,
      description: IRAN_INITIAL_STATE.description,
      category: 'geopolitical_conflict',
      critical_context: IRAN_INITIAL_STATE.backgroundContext,
      visibility: 'public',
    })
    .select()
    .single()

  if (scenarioError || !scenario) {
    throw new Error(`Failed to create scenario: ${scenarioError?.message}`)
  }

  console.log(`✓ Created scenario: ${scenario.id}`)

  // 2. Create ground truth trunk branch
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .insert({
      scenario_id: scenario.id,
      name: 'Ground Truth Trunk',
      description: 'Verified real-world event timeline — Iran conflict Phase 2 through Phase 3',
      is_trunk: true,
      turn_timeframe: 'event-driven',
      game_mode: 'observer',
    })
    .select()
    .single()

  if (branchError || !branch) {
    throw new Error(`Failed to create branch: ${branchError?.message}`)
  }

  console.log(`✓ Created trunk branch: ${branch.id}`)

  // 3. Walk events, build up scenario state, create one commit per event
  let currentState: Partial<Scenario> = { ...IRAN_INITIAL_STATE } as Partial<Scenario>
  let parentCommitId: string | null = null
  let turnNumber = 1

  for (const event of events) {
    // Apply event impacts to running state
    if (currentState.actors && currentState.relationships && currentState.globalState) {
      currentState = applyEventImpact(currentState as Scenario, event)
    }

    const { data: commit, error: commitError } = await supabase
      .from('turn_commits')
      .insert({
        branch_id: branch.id,
        parent_commit_id: parentCommitId,
        turn_number: turnNumber,
        simulated_date: event.timestamp,
        scenario_snapshot: currentState,
        is_ground_truth: true,
        narrative_entry: `${event.id}: ${event.description}`,
        current_phase: 'complete',
      })
      .select()
      .single()

    if (commitError || !commit) {
      throw new Error(`Failed to create commit for event ${event.id}: ${commitError?.message}`)
    }

    parentCommitId = commit.id
    turnNumber++
    console.log(`  ✓ Committed event ${event.id} (turn ${turnNumber - 1})`)
  }

  // 4. Update branch head to latest commit
  await supabase
    .from('branches')
    .update({ head_commit_id: parentCommitId })
    .eq('id', branch.id)

  // 5. Update scenario trunk branch reference
  await supabase
    .from('scenarios')
    .update({ trunk_branch_id: branch.id })
    .eq('id', scenario.id)

  console.log(`\n✓ Seeded ${events.length} events as turn commits on trunk branch ${branch.id}`)
  return { scenarioId: scenario.id, branchId: branch.id, commitCount: events.length }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  seedIranScenario({ fromEventId, dryRun })
    .then(result => {
      console.log('Seed complete:', result)
      process.exit(0)
    })
    .catch(err => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
