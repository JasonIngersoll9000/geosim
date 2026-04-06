/**
 * Seeds the comprehensive Iran scenario into Supabase.
 * DROP-AND-RESEED: Deletes any existing Iran scenario before inserting fresh data.
 *
 * Usage:
 *   bun run scripts/seed-iran.ts                        # full seed
 *   bun run scripts/seed-iran.ts --from=evt_id          # append new events (does not drop)
 *   bun run scripts/seed-iran.ts --dry-run              # validate without writing
 *
 * PREREQUISITES: Run the pipeline scripts first:
 *   1. bun run scripts/extract-timeline.ts              (Phase 1)
 *   2. [User runs 9 research calls — see docs/Iran Research/research-prompts.md]
 *   3. bun run scripts/generate-profiles.ts             (Phase 3)
 *   4. bun run scripts/enrich-timeline.ts               (Phase 4)
 */

import { createServiceClient } from '../lib/supabase/service'
import { readJsonFile } from './pipeline/utils'
import type {
  ActorProfile,
  KeyFigureProfile,
  EnrichedEvent,
  RawCapability,
} from './pipeline/types'
import type {
  ScenarioActorInsert,
  KeyFigureInsert,
  ActorCapabilityInsert,
} from '../lib/types/database'

const SCENARIO_NAME = 'Operation Epic Fury: Iran Conflict'
const SCENARIO_DESCRIPTION =
  'Ground truth timeline of the 2026 US-Israel joint strikes on Iran and the resulting regional conflict. ' +
  'Covers February 6, 2026 through present. Branch at any decision point to explore alternate histories.'

// ─────────────────────────────────────────────────────────────────────────────
// Pure builder functions (exported for testing)
// ─────────────────────────────────────────────────────────────────────────────

export function buildScenarioInsert(backgroundContextEnriched: string) {
  return {
    name: SCENARIO_NAME,
    description: SCENARIO_DESCRIPTION,
    category: 'geopolitical_conflict' as const,
    visibility: 'public' as const,
    background_context_enriched: backgroundContextEnriched,
    scenario_start_date: '2026-02-06',
    created_by: '00000000-0000-0000-0000-000000000000',
    scenario_frame: {} as Record<string, unknown>,
    dimensions: [] as string[],
    phases: [] as unknown[],
  }
}

export function buildActorInsert(profile: ActorProfile, scenarioId: string): ScenarioActorInsert {
  return {
    id: profile.id,
    scenario_id: scenarioId,
    name: profile.name,
    short_name: profile.short_name,
    biographical_summary: profile.biographical_summary,
    leadership_profile: profile.leadership_profile,
    win_condition: profile.win_condition,
    strategic_doctrine: profile.strategic_doctrine,
    historical_precedents: profile.historical_precedents,
    initial_scores: profile.initial_scores as unknown as Record<string, unknown>,
    intelligence_profile: profile.intelligence_profile as unknown as Record<string, unknown>,
  }
}

export function buildKeyFigureInsert(figure: KeyFigureProfile, scenarioId: string): KeyFigureInsert {
  return {
    id: figure.id,
    scenario_id: scenarioId,
    actor_id: figure.actor_id,
    name: figure.name,
    title: figure.title,
    role: figure.role,
    biography: figure.biography,
    motivations: figure.motivations,
    decision_style: figure.decision_style,
    current_context: figure.current_context,
    relationships: (figure.relationships as Record<string, unknown>[] | null) as Record<string, unknown> | null,
    provenance: figure.provenance,
    source_note: figure.source_note ?? null,
    source_date: figure.source_date ?? null,
  }
}

export function buildCapabilityInsert(
  capability: RawCapability,
  scenarioId: string,
  actorId: string
): ActorCapabilityInsert {
  return {
    scenario_id: scenarioId,
    actor_id: actorId,
    category: capability.category,
    name: capability.name,
    description: capability.description,
    quantity: capability.quantity ?? null,
    unit: capability.unit ?? null,
    deployment_status: capability.deployment_status,
    lead_time_days: capability.lead_time_days ?? null,
    political_cost: capability.political_cost ?? null,
    temporal_anchor: capability.temporal_anchor,
    source_url: null,
    source_date: null,
  }
}

export function buildTurnCommitInsert(
  event: EnrichedEvent,
  branchId: string,
  parentCommitId: string | null,
  turnNumber: number
) {
  return {
    branch_id: branchId,
    parent_commit_id: parentCommitId,
    turn_number: turnNumber,
    simulated_date: event.timestamp,
    scenario_snapshot: {} as Record<string, unknown>,
    is_ground_truth: true,
    current_phase: 'complete' as const,
    narrative_entry: event.chronicle.headline,

    // Enriched content fields
    full_briefing: JSON.stringify(event.full_briefing),
    chronicle_headline: event.chronicle.headline,
    chronicle_entry: event.chronicle.entry,
    chronicle_date_label: event.chronicle.date_label,
    context_summary: event.context_summary,
    is_decision_point: event.decision_analysis.is_decision_point,
    deciding_actor_id: event.decision_analysis.deciding_actor_id ?? null,
    decision_summary: event.decision_analysis.decision_summary ?? null,
    decision_alternatives: event.decision_analysis.alternatives
      ? (event.decision_analysis.alternatives as unknown as Record<string, unknown>[])
      : null,
    escalation_rung_before: event.escalation.rung_before,
    escalation_rung_after: event.escalation.rung_after,
    escalation_direction: event.escalation.direction,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed orchestration
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedOptions {
  fromEventId?: string
  dryRun?: boolean
}

export async function seedIranScenario(options: SeedOptions = {}): Promise<{
  scenarioId: string
  branchId: string
  commitCount: number
}> {
  const { fromEventId, dryRun = false } = options

  // Load pipeline outputs
  const enrichedFile = await readJsonFile<{ events: EnrichedEvent[] }>('data/iran-enriched.json')
  const actorProfiles = await readJsonFile<ActorProfile[]>('data/actor-profiles.json')
  const keyFigures = await readJsonFile<KeyFigureProfile[]>('data/key-figures.json')

  // Load capabilities (best-effort — missing files are warnings, not errors)
  const capabilityFiles: Record<string, string> = {
    united_states: 'data/capabilities-us.json',
    iran: 'data/capabilities-iran.json',
    israel: 'data/capabilities-israel.json',
    russia: 'data/capabilities-russia-china.json',
    china: 'data/capabilities-russia-china.json',
    gulf_states: 'data/capabilities-gulf-states.json',
  }

  const allCapabilities: { actorId: string; capability: RawCapability }[] = []
  for (const [actorId, filePath] of Object.entries(capabilityFiles)) {
    try {
      const caps = await readJsonFile<RawCapability[]>(filePath)
      const filtered = actorId === 'russia' || actorId === 'china'
        ? caps.filter(c => (c as RawCapability & { actor?: string }).actor === actorId)
        : caps
      filtered.forEach(cap => allCapabilities.push({ actorId, capability: cap }))
    } catch {
      console.warn(`  ⚠ Capabilities file not found for ${actorId}: ${filePath} (skipping)`)
    }
  }

  const allEvents = enrichedFile.events
  const startIndex = fromEventId
    ? allEvents.findIndex(e => e.id === fromEventId)
    : 0

  if (fromEventId && startIndex === -1) {
    throw new Error(`--from event '${fromEventId}' not found in enriched timeline`)
  }

  const eventsToSeed = allEvents.slice(startIndex)
  const isAppend = !!fromEventId

  if (dryRun) {
    console.log(`[dry-run] Mode: ${isAppend ? 'append' : 'full drop-and-reseed'}`)
    console.log(`[dry-run] Events to seed: ${eventsToSeed.length}`)
    console.log(`[dry-run] Actors: ${actorProfiles.length}`)
    console.log(`[dry-run] Key figures: ${keyFigures.length}`)
    console.log(`[dry-run] Capabilities: ${allCapabilities.length}`)
    return { scenarioId: 'dry-run', branchId: 'dry-run', commitCount: eventsToSeed.length }
  }

  const supabase = createServiceClient()

  let scenarioId: string
  let branchId: string
  let parentCommitId: string | null = null
  let turnNumber = 1

  if (isAppend) {
    // Append mode: find existing scenario and branch head
    const { data: scenario } = await supabase
      .from('scenarios')
      .select('id, trunk_branch_id')
      .eq('name', SCENARIO_NAME)
      .single()

    if (!scenario) throw new Error('Cannot append: scenario not found. Run full seed first.')
    scenarioId = scenario.id
    if (!scenario.trunk_branch_id) {
      throw new Error('Cannot append: scenario has no trunk branch. Run full seed first.')
    }
    branchId = scenario.trunk_branch_id

    const { data: headCommit } = await supabase
      .from('turn_commits')
      .select('id, turn_number')
      .eq('branch_id', branchId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single()

    parentCommitId = headCommit?.id ?? null
    turnNumber = (headCommit?.turn_number ?? 0) + 1
    console.log(`Appending to existing scenario ${scenarioId} from turn ${turnNumber}`)
  } else {
    // Full drop-and-reseed
    console.log('Dropping existing Iran scenario data...')
    const { data: existing } = await supabase
      .from('scenarios')
      .select('id')
      .eq('name', SCENARIO_NAME)

    for (const s of existing ?? []) {
      // NOTE: table is scenario_actors (not actors) to avoid collision with the game actors table
      const { error: actorsErr } = await supabase.from('scenario_actors').delete().eq('scenario_id', s.id)
      if (actorsErr) throw new Error(`Failed to delete scenario_actors for ${s.id}: ${actorsErr.message}`)

      const { error: figuresErr } = await supabase.from('key_figures').delete().eq('scenario_id', s.id)
      if (figuresErr) throw new Error(`Failed to delete key_figures for ${s.id}: ${figuresErr.message}`)

      const { error: capsErr } = await supabase.from('actor_capabilities').delete().eq('scenario_id', s.id)
      if (capsErr) throw new Error(`Failed to delete actor_capabilities for ${s.id}: ${capsErr.message}`)

      const { error: scenarioErr } = await supabase.from('scenarios').delete().eq('id', s.id)
      if (scenarioErr) throw new Error(`Failed to delete scenario ${s.id}: ${scenarioErr.message}`)

      console.log(`  ✓ Deleted scenario ${s.id}`)
    }

    // Build background context from first enriched event's context field
    const backgroundContext = allEvents[0]?.full_briefing?.context ??
      'Ground truth simulation of the 2026 Iran conflict beginning February 2026.'

    // Create scenario
    const { data: scenario, error: scenarioErr } = await supabase
      .from('scenarios')
      .insert(buildScenarioInsert(backgroundContext))
      .select()
      .single()

    if (scenarioErr || !scenario) throw new Error(`Failed to create scenario: ${scenarioErr?.message}`)
    scenarioId = scenario.id
    console.log(`✓ Created scenario: ${scenarioId}`)

    // Seed actors into scenario_actors (not the game actors table)
    for (const profile of actorProfiles) {
      const { error } = await supabase.from('scenario_actors').insert(buildActorInsert(profile, scenarioId))
      if (error) console.warn(`  ⚠ Actor insert failed for ${profile.id}: ${error.message}`)
      else console.log(`  ✓ Actor: ${profile.id}`)
    }

    // Seed key figures
    for (const figure of keyFigures) {
      const { error } = await supabase.from('key_figures').insert(buildKeyFigureInsert(figure, scenarioId))
      if (error) console.warn(`  ⚠ Key figure insert failed for ${figure.id}: ${error.message}`)
      else console.log(`  ✓ Key figure: ${figure.name}`)
    }

    // Seed capabilities
    for (const { actorId, capability } of allCapabilities) {
      const { error } = await supabase
        .from('actor_capabilities')
        .insert(buildCapabilityInsert(capability, scenarioId, actorId))
      if (error) console.warn(`  ⚠ Capability insert failed (${actorId} / ${capability.name}): ${error.message}`)
    }
    console.log(`✓ Seeded ${allCapabilities.length} capabilities`)

    // Create ground truth trunk branch
    const { data: branch, error: branchErr } = await supabase
      .from('branches')
      .insert({
        scenario_id: scenarioId,
        name: 'Ground Truth Trunk',
        description: 'Verified real-world event timeline — Iran conflict from February 2026.',
        is_trunk: true,
        turn_timeframe: 'event-driven',
        game_mode: 'observer',
        created_by: '00000000-0000-0000-0000-000000000000',
        visibility: 'public' as const,
      })
      .select()
      .single()

    if (branchErr || !branch) throw new Error(`Failed to create branch: ${branchErr?.message}`)
    branchId = branch.id

    await supabase.from('scenarios').update({ trunk_branch_id: branchId }).eq('id', scenarioId)
    console.log(`✓ Created trunk branch: ${branchId}`)
  }

  // Seed turn commits
  console.log(`\nSeeding ${eventsToSeed.length} enriched events as turn commits...`)
  for (const event of eventsToSeed) {
    const insert = buildTurnCommitInsert(event, branchId, parentCommitId, turnNumber)
    const { data: commit, error } = await supabase
      .from('turn_commits')
      .insert(insert)
      .select('id')
      .single()

    if (error || !commit) {
      throw new Error(`Failed to create commit for ${event.id}: ${error?.message}`)
    }

    parentCommitId = commit.id
    turnNumber++
    console.log(`  ✓ [${turnNumber - 1}] ${event.id}`)
  }

  // Update branch head + scenario through date
  const lastEvent = eventsToSeed[eventsToSeed.length - 1]
  await supabase.from('branches').update({ head_commit_id: parentCommitId }).eq('id', branchId)
  await supabase.from('scenarios').update({ ground_truth_through_date: lastEvent.timestamp }).eq('id', scenarioId)

  console.log(`\n✓ Seed complete: ${eventsToSeed.length} events on trunk branch ${branchId}`)
  return { scenarioId, branchId, commitCount: eventsToSeed.length }
}

// CLI entry point
if (Bun.main === decodeURIComponent(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  seedIranScenario({ fromEventId, dryRun })
    .then(result => { console.log('Seed complete:', result); process.exit(0) })
    .catch(err => { console.error('Seed failed:', err); process.exit(1) })
}
