/**
 * Dev-mode snapshot loader.
 *
 * Returns a full GameInitialData object built from local seed files in data/.
 * Used when NEXT_PUBLIC_DEV_MODE=true so the UI can run without Supabase.
 *
 * Uses static imports (JSON) that Next.js can bundle at build time.
 */
import type { GameInitialData } from '@/lib/types/game-init'
import type { ActorSummary, ActorDetail, DecisionOption, DecisionDetail, EscalationRungSummary } from '@/lib/types/panels'
import type { BranchStateAtTurn, LiveActorState } from '@/lib/types/simulation'
import { IRAN_DECISIONS, IRAN_DECISION_DETAILS } from '@/lib/game/iran-decisions'

import actorProfilesRaw from '@/data/actor-profiles.json'
import iranStateSnapshotsRaw from '@/data/iran-state-snapshots.json'
import iranTimelineRaw from '@/data/iran-timeline-filtered.json'

// ─── Types for raw JSON structures ───────────────────────────────────────────

interface RawActorProfile {
  id: string
  name: string
  short_name?: string
  biographical_summary?: string
  biographical_summary_continued?: string
  leadership_profile?: string
  win_condition?: string
  strategic_doctrine?: string
  historical_precedents?: string
  initial_scores?: {
    militaryStrength?: number
    politicalStability?: number
    economicHealth?: number
    publicSupport?: number
    internationalStanding?: number
    escalationRung?: number
  }
  intelligence_profile?: Record<string, unknown>
}

interface RawActorState {
  actor_id: string
  military_strength: number
  political_stability: number
  economic_health: number
  public_support: number
  international_standing: number
  asset_inventory: Record<string, number | number[]>
}

interface RawTimelineEvent {
  id: string
  timestamp?: string
  title?: string
  description?: string
  full_description?: string
  actors_involved?: string[]
}

// ─── Actor color map ──────────────────────────────────────────────────────────

const ACTOR_COLORS: Record<string, string> = {
  united_states: 'var(--actor-us)',
  iran:          'var(--actor-iran)',
  israel:        'var(--actor-israel)',
  russia:        'var(--actor-russia)',
  china:         'var(--actor-china)',
}

function actorColor(id: string): string {
  return ACTOR_COLORS[id] ?? 'var(--actor-generic)'
}

// ─── Escalation rung label map ────────────────────────────────────────────────

const RUNG_NAMES: Record<number, string> = {
  1:  'Diplomatic Friction',
  2:  'Economic Pressure',
  3:  'Covert Operations',
  4:  'Proxy Conflict',
  5:  'Limited Military Strikes',
  6:  'Sustained Air Campaign',
  7:  'Ground Invasion',
  8:  'Strategic Bombardment',
  9:  'Nuclear Threshold',
  10: 'Nuclear Exchange',
}

function rungName(rung: number): string {
  return RUNG_NAMES[rung] ?? `Level ${rung}`
}

// ─── Relationship stance map (US-perspective defaults) ────────────────────────

type RelStance = 'ally' | 'adversary' | 'neutral' | 'proxy' | 'rival'
const US_STANCES: Record<string, RelStance> = {
  united_states: 'ally',
  israel:        'ally',
  iran:          'adversary',
  russia:        'rival',
  china:         'rival',
}

// ─── Escalation rung summary builder ─────────────────────────────────────────

function buildEscalationRungs(currentRung: number): EscalationRungSummary[] {
  return Array.from({ length: 10 }, (_, i) => {
    const level = i + 1
    const reversibility: 'easy' | 'moderate' | 'difficult' | 'irreversible' =
      level <= 4 ? 'easy' :
      level <= 6 ? 'moderate' :
      level <= 8 ? 'difficult' : 'irreversible'
    return {
      level,
      name:          rungName(level),
      description:   `Escalation level ${level} — ${rungName(level)}`,
      reversibility,
      isBlocked:     level > currentRung + 2,
    }
  })
}

// ─── BranchStateAtTurn builder ────────────────────────────────────────────────

function buildCurrentState(): BranchStateAtTurn {
  const initial = (iranStateSnapshotsRaw as { initial_state: Record<string, RawActorState> }).initial_state

  const actor_states: Record<string, LiveActorState> = {}
  const initial_inventories: Record<string, Record<string, number>> = {}

  for (const [actorId, s] of Object.entries(initial)) {
    const inv: Record<string, number> = {}
    for (const [key, val] of Object.entries(s.asset_inventory ?? {})) {
      inv[key] = Array.isArray(val) ? (val[0] as number) : (val as number)
    }
    initial_inventories[actorId] = inv
    const assetAvailability: Record<string, { count: number; pct_of_initial: number; status: 'available' | 'constrained' | 'exhausted' }> = {}
    for (const [key, count] of Object.entries(inv)) {
      assetAvailability[key] = {
        count,
        pct_of_initial: 100,
        status: count > 0 ? 'available' : 'exhausted',
      }
    }

    actor_states[actorId] = {
      actor_id:               actorId,
      military_strength:      s.military_strength,
      political_stability:    s.political_stability,
      economic_health:        s.economic_health,
      public_support:         s.public_support,
      international_standing: s.international_standing,
      asset_inventory:        inv,
      global_state:           {},
      facility_statuses:      [],
      asset_availability:     assetAvailability,
    }
  }

  return {
    scenario_id:            'dev-iran-2026',
    branch_id:              'dev-trunk',
    turn_commit_id:         'dev-commit-0',
    as_of_date:             '2026-03-22',
    actor_states,
    global_state: {
      oil_price_usd:          145,
      hormuz_throughput_pct:  30,
      global_economic_stress: 62,
    },
    facility_statuses:      [],
    active_depletion_rates: {},
    initial_inventories,
  }
}

// ─── Actor summaries + details builder ───────────────────────────────────────

function buildActors(): {
  actors: ActorSummary[]
  actorDetails: Record<string, ActorDetail>
} {
  const profiles = actorProfilesRaw as RawActorProfile[]

  const actors: ActorSummary[] = []
  const actorDetails: Record<string, ActorDetail> = {}

  for (const p of profiles) {
    const id = p.id
    const scores = p.initial_scores ?? {}
    const rung: number = scores.escalationRung ?? 5

    const summary: ActorSummary = {
      id,
      name:               p.name,
      shortName:          p.short_name ?? p.name,
      actorColor:         actorColor(id),
      escalationRung:     rung,
      escalationRungName: rungName(rung),
      primaryObjective:   p.win_condition?.split('\n')[0] ?? '',
      relationshipStance: US_STANCES[id] ?? 'neutral',
    }
    actors.push(summary)

    const briefing = [p.biographical_summary, p.biographical_summary_continued]
      .filter(Boolean).join(' ')

    const detail: ActorDetail = {
      id,
      name:               p.name,
      shortName:          p.short_name ?? p.name,
      actorColor:         actorColor(id),
      escalationRung:     rung,
      escalationRungName: rungName(rung),
      briefing,
      militaryStrength:   scores.militaryStrength ?? 50,
      economicStrength:   scores.economicHealth ?? 50,
      politicalStability: scores.politicalStability ?? 50,
      objectives:         p.win_condition ? [p.win_condition] : [],
      primaryObjective:   p.win_condition?.split('\n')[0] ?? '',
      leadershipProfile:  p.leadership_profile,
      strategicDoctrine:  p.strategic_doctrine,
      historicalPrecedents: p.historical_precedents,
      winCondition:       p.win_condition,
      isAdversary:        id === 'iran',
      hasLimitedIntel:    id === 'russia' || id === 'china',
      viewerActorId:      'united_states',
      relationshipStance: US_STANCES[id] ?? 'neutral',
      escalationRungs:    buildEscalationRungs(rung),
      intelligenceProfile: p.intelligence_profile,
    }
    actorDetails[id] = detail
  }

  return { actors, actorDetails }
}

// ─── Chronicle builder from timeline ─────────────────────────────────────────

function guessSeverity(title: string): 'critical' | 'major' | 'moderate' | 'minor' {
  const t = title.toLowerCase()
  if (t.includes('strike') || t.includes('kill') || t.includes('nuclear') || t.includes('war')) return 'critical'
  if (t.includes('crisis') || t.includes('attack') || t.includes('military')) return 'major'
  if (t.includes('sanction') || t.includes('diplomat') || t.includes('deal')) return 'moderate'
  return 'minor'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function buildChronicle() {
  const events = (iranTimelineRaw as { events: RawTimelineEvent[] }).events ?? []
  const recent = [...events].reverse().slice(0, 30)
  return recent.map((evt, i) => ({
    turnNumber:  i + 1,
    date:        evt.timestamp ?? '2026-01-01',
    title:       evt.title ?? 'Unknown Event',
    narrative:   evt.description ?? '',
    severity:    guessSeverity(evt.title ?? ''),
    tags:        (evt.actors_involved ?? []).slice(0, 3),
    detail:      evt.full_description ?? evt.description ?? '',
    dateLabel:   formatDate(evt.timestamp),
  }))
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Returns a full GameInitialData object from local seed data files.
 * Intended for use when NEXT_PUBLIC_DEV_MODE=true.
 * Must not be called in production server-side paths.
 */
export function getIranSeedSnapshot(): GameInitialData {
  const { actors, actorDetails } = buildActors()
  const chronicle = buildChronicle()
  const currentState = buildCurrentState()

  const decisions: DecisionOption[] = IRAN_DECISIONS
  const decisionDetails: Record<string, DecisionDetail> = IRAN_DECISION_DETAILS

  return {
    scenario: {
      id:             'dev-iran-2026',
      name:           'Operation Epic Fury: Iran Conflict',
      classification: 'TOP SECRET // NOFORN',
    },
    branch: {
      id:           'dev-trunk',
      name:         'Ground Truth',
      isTrunk:      true,
      headCommitId: 'dev-commit-0',
      turnNumber:   1,
    },
    actors,
    actorDetails,
    decisions,
    decisionDetails,
    chronicle,
    groundTruthBranchId: 'dev-trunk',
    groundTruthCommits: [
      {
        id:             'dev-commit-0',
        turnNumber:     1,
        simulatedDate:  '2026-03-22',
        narrativeEntry: 'Simulation initialized from ground-truth data as of March 22, 2026.',
      },
    ],
    currentState,
  }
}
