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
  EventStateEffects,
  StateEffectsFile,
  TurnStateSnapshot,
  StateSnapshotsFile,
  GapFillData,
  DepletionPeriod,
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
    created_by: null,
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
  turnNumber: number,
  prevEscalationCeiling: number,
  stateEffects: EventStateEffects | null
) {
  const dn = stateEffects?.decision_nodes?.[0] ?? null
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
    // Change 1: use global_ceiling from escalation object
    escalation_rung_before: prevEscalationCeiling,
    escalation_rung_after: event.escalation.global_ceiling ?? 0,
    escalation_direction: event.escalation.direction,
    // Change 2: state_effects columns
    state_effects: stateEffects ?? null,
    is_major_decision_node: (stateEffects?.decision_nodes?.length ?? 0) > 0,
    decision_node_label: dn?.label ?? null,
    decision_node_significance: dn?.significance ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed orchestration
// ─────────────────────────────────────────────────────────────────────────────

const IRAN_ASSETS = [
  // ── US Assets ──────────────────────────────────────────────────────────────
  {
    id: 'cvn-72', actor_id: 'us', name: 'USS Abraham Lincoln (CVN-72)', short_name: 'CVN-72',
    category: 'naval', asset_type: 'carrier', description: 'Nimitz-class carrier strike group, CSG-12. Operating in Arabian Sea.',
    lat: 23.5, lng: 59.5, zone: 'arabian_sea', status: 'staged',
    capabilities: [
      { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
      { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
      { name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 300,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.naval-technology.com/projects/nimitz-class-aircraft-carrier/', source_date: '2025-01-01',
    notes: 'SM-6 depleted from prior AAW ops. Flagship of CSG-12.',
  },
  {
    id: 'cvn-75', actor_id: 'us', name: 'USS Harry S. Truman (CVN-75)', short_name: 'CVN-75',
    category: 'naval', asset_type: 'carrier', description: 'Nimitz-class carrier strike group, CSG-8. Operating in Eastern Mediterranean.',
    lat: 33.0, lng: 33.0, zone: 'eastern_mediterranean', status: 'staged',
    capabilities: [
      { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
      { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
      { name: 'SM-6 (AAW)', current: 80, max: 80, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 300,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169556/nimitz-class-aircraft-carrier/', source_date: '2025-01-01',
    notes: 'CSG-8, Eastern Med posture post-Oct 2023.',
  },
  {
    id: 'al-udeid-ab', actor_id: 'us', name: 'Al Udeid Air Base', short_name: 'Al Udeid AB',
    category: 'air', asset_type: 'air_base', description: 'Primary USAF hub in theater. Home of AFCENT and CAOC.',
    lat: 25.117, lng: 51.315, zone: 'qatar', status: 'available',
    capabilities: [
      { name: 'F-35A', current: 0, max: 24, unit: 'aircraft' },
      { name: 'B-52H', current: 6, max: 6, unit: 'aircraft' },
      { name: 'KC-135', current: 12, max: 12, unit: 'aircraft' },
      { name: 'Personnel', current: 10000, max: 10000, unit: 'personnel' },
    ],
    strike_range_nm: 2500, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Al_Udeid_Air_Base', source_date: '2025-01-01',
    notes: 'F-35A rotations variable. B-52H deployed for deterrence.',
  },
  {
    id: 'ali-al-salem-ab', actor_id: 'us', name: 'Ali Al Salem Air Base', short_name: 'Ali Al Salem',
    category: 'air', asset_type: 'air_base', description: 'USAF base in Kuwait supporting ground staging and close air support.',
    lat: 29.347, lng: 47.520, zone: 'kuwait', status: 'available',
    capabilities: [
      { name: 'A-10C', current: 12, max: 12, unit: 'aircraft' },
      { name: 'Personnel', current: 2500, max: 2500, unit: 'personnel' },
    ],
    strike_range_nm: 800, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Ali_Al_Salem_Air_Base', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'al-dhafra-ab', actor_id: 'us', name: 'Al Dhafra Air Base', short_name: 'Al Dhafra',
    category: 'air', asset_type: 'air_base', description: 'USAF base in UAE. Houses RQ-4 Global Hawks and U-2 ISR aircraft.',
    lat: 24.248, lng: 54.548, zone: 'uae', status: 'available',
    capabilities: [
      { name: 'F-22A', current: 0, max: 12, unit: 'aircraft' },
      { name: 'RQ-4 Global Hawk', current: 4, max: 4, unit: 'aircraft' },
      { name: 'Personnel', current: 5000, max: 5000, unit: 'personnel' },
    ],
    strike_range_nm: 1600, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Al_Dhafra_Air_Base', source_date: '2025-01-01',
    notes: 'F-22 rotations variable. Key ISR hub.',
  },
  {
    id: '5th-fleet-hq', actor_id: 'us', name: '5th Fleet HQ Bahrain', short_name: '5th Fleet HQ',
    category: 'naval', asset_type: 'headquarters', description: 'Naval command for NAVCENT / 5th Fleet, Naval Support Activity Bahrain.',
    lat: 26.217, lng: 50.610, zone: 'bahrain', status: 'available',
    capabilities: [
      { name: 'Command Staff', current: 1, max: 1, unit: 'HQ' },
      { name: 'Personnel', current: 7000, max: 7000, unit: 'personnel' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.cusnc.navy.mil/', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'thaad-israel', actor_id: 'us', name: 'THAAD Battery (Israel)', short_name: 'THAAD-IL',
    category: 'air_defense', asset_type: 'air_defense', description: 'Terminal High Altitude Area Defense battery deployed to Israel post-Oct 2024.',
    lat: 31.5, lng: 34.8, zone: 'israel', status: 'staged',
    capabilities: [
      { name: 'THAAD Interceptors', current: 48, max: 48, unit: 'missiles' },
    ],
    strike_range_nm: 0, threat_range_nm: 125,
    provenance: 'researched', effective_from: '2024-10-25',
    source_url: 'https://www.reuters.com/world/middle-east/us-deploy-thaad-battery-israel-2024-10-13/', source_date: '2024-10-13',
    notes: 'Deployed following Oct 2024 Iranian ballistic missile attack on Israel.',
  },
  {
    id: 'patriot-qatar', actor_id: 'us', name: 'Patriot Battery — Qatar', short_name: 'PAC-3 QA',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 battery protecting Al Udeid AB.',
    lat: 25.2, lng: 51.5, zone: 'qatar', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'patriot-kuwait', actor_id: 'us', name: 'Patriot Battery — Kuwait', short_name: 'PAC-3 KW',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 battery in Kuwait.',
    lat: 29.4, lng: 47.6, zone: 'kuwait', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'patriot-uae', actor_id: 'us', name: 'Patriot Battery — UAE', short_name: 'PAC-3 UAE',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 battery in UAE.',
    lat: 24.4, lng: 54.4, zone: 'uae', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'patriot-saudi', actor_id: 'us', name: 'Patriot Battery — Saudi Arabia', short_name: 'PAC-3 SA',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 batteries protecting Saudi critical infrastructure.',
    lat: 24.7, lng: 46.7, zone: 'saudi_arabia', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'kc135-udeid', actor_id: 'us', name: 'KC-135/KC-46 Tanker Wing (Al Udeid)', short_name: 'KC-135 AEW',
    category: 'air', asset_type: 'air_refueling', description: 'Air refueling wing supporting long-range strike missions.',
    lat: 25.117, lng: 51.315, zone: 'qatar', status: 'available',
    capabilities: [{ name: 'Tanker Sorties/Day', current: 20, max: 20, unit: 'sorties' }],
    strike_range_nm: 3000, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: 'Essential for F-35/B-52 long-range strike against hardened targets.',
  },

  // ── Israeli Assets ──────────────────────────────────────────────────────────
  {
    id: 'nevatim-ab', actor_id: 'israel', name: 'Nevatim Air Base', short_name: 'Nevatim AB',
    category: 'air', asset_type: 'air_base', description: 'Home of Israeli F-35I Adir fleet. Used in Oct 2024 strikes on Iran.',
    lat: 31.208, lng: 35.012, zone: 'israel', status: 'available',
    capabilities: [
      { name: 'F-35I Adir', current: 50, max: 50, unit: 'aircraft' },
      { name: 'F-16I Sufa', current: 30, max: 30, unit: 'aircraft' },
    ],
    strike_range_nm: 1500, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Nevatim_Air_Base', source_date: '2025-01-01',
    notes: 'F-35I range to Iran requires KC-46/tanker support.',
  },
  {
    id: 'hatzerim-ab', actor_id: 'israel', name: 'Hatzerim Air Base', short_name: 'Hatzerim AB',
    category: 'air', asset_type: 'air_base', description: 'Home of Israeli F-16C/D fleet and IAF training.',
    lat: 31.233, lng: 34.667, zone: 'israel', status: 'available',
    capabilities: [
      { name: 'F-16C/D', current: 60, max: 60, unit: 'aircraft' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Hatzerim_Air_Base', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'iron-dome-south', actor_id: 'israel', name: 'Iron Dome Batteries (South)', short_name: 'Iron Dome S',
    category: 'air_defense', asset_type: 'air_defense', description: 'Iron Dome short-range air defense batteries protecting southern Israel.',
    lat: 31.5, lng: 34.5, zone: 'israel', status: 'degraded',
    capabilities: [{ name: 'Interceptors', current: 60, max: 80, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 70,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.jpost.com/israel-news/article-826194', source_date: '2024-10-14',
    notes: 'Partially depleted from April and October 2024 Iranian ballistic missile barrages.',
  },
  {
    id: 'iron-dome-north', actor_id: 'israel', name: 'Iron Dome Batteries (North)', short_name: 'Iron Dome N',
    category: 'air_defense', asset_type: 'air_defense', description: 'Iron Dome batteries protecting northern Israel from Hezbollah/Iranian threats.',
    lat: 32.8, lng: 35.2, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Interceptors', current: 80, max: 80, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 70,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'arrow-3-battery', actor_id: 'israel', name: 'Arrow-3 Battery', short_name: 'Arrow-3',
    category: 'air_defense', asset_type: 'air_defense', description: 'Exo-atmospheric ballistic missile interceptor. Intercepts ICBMs and IRBMs.',
    lat: 32.1, lng: 34.9, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Arrow-3 Interceptors', current: 36, max: 36, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 2400,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/system/arrow-3/', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'dimona', actor_id: 'israel', name: 'Negev Nuclear Research Center', short_name: 'Dimona',
    category: 'nuclear', asset_type: 'nuclear_facility', description: "Israel's Negev Nuclear Research Center near Dimona. Presumed plutonium production reactor.",
    lat: 30.867, lng: 35.150, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Presumed Warheads', current: 90, max: 90, unit: 'warheads' }],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.armscontrol.org/factsheets/israelinuclear', source_date: '2025-01-01',
    notes: 'Nuclear ambiguity policy. Estimated 80-400 warheads (SIPRI 2025).',
  },

  // ── Iranian Assets ──────────────────────────────────────────────────────────
  {
    id: 'fordow', actor_id: 'iran', name: 'Fordow Enrichment Facility (FFEP)', short_name: 'Fordow',
    category: 'nuclear', asset_type: 'nuclear_facility', description: 'Underground enrichment facility near Qom. 60% enriched uranium production.',
    lat: 34.884, lng: 50.995, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'IR-6 Centrifuges', current: 1044, max: 1044, unit: 'centrifuges' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.iaea.org/sites/default/files/24/11/gov2024-54.pdf', source_date: '2024-11-01',
    notes: 'Deeply buried (~80-90m). Hardened against conventional munitions. Key US/Israel strike target.',
  },
  {
    id: 'natanz', actor_id: 'iran', name: 'Natanz Enrichment Complex', short_name: 'Natanz',
    category: 'nuclear', asset_type: 'nuclear_facility', description: 'Primary Iranian enrichment facility. Fuel Enrichment Plant (FEP) and Pilot Fuel Enrichment Plant (PFEP).',
    lat: 33.723, lng: 51.727, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'IR-1 Centrifuges', current: 19000, max: 19000, unit: 'centrifuges' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.iaea.org/sites/default/files/24/11/gov2024-54.pdf', source_date: '2024-11-01',
    notes: 'Partially hardened. FEP partially underground.',
  },
  {
    id: 'arak-ir40', actor_id: 'iran', name: 'Arak IR-40 Heavy Water Reactor', short_name: 'Arak IR-40',
    category: 'nuclear', asset_type: 'nuclear_facility', description: 'Heavy water reactor redesigned under JCPOA to limit plutonium production.',
    lat: 34.190, lng: 49.231, zone: 'central_iran', status: 'available',
    capabilities: [],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.nti.org/analysis/articles/iran-arak/', source_date: '2025-01-01',
    notes: 'Redesigned core per JCPOA annex. Plutonium path remains limited.',
  },
  {
    id: 'bandar-abbas-naval', actor_id: 'iran', name: 'Bandar Abbas Naval Base', short_name: 'Bandar Abbas NB',
    category: 'naval', asset_type: 'naval_base', description: 'Primary IRIN and IRGCN base controlling Strait of Hormuz access.',
    lat: 27.167, lng: 56.283, zone: 'strait_of_hormuz', status: 'available',
    capabilities: [
      { name: 'Frigates', current: 4, max: 4, unit: 'vessels' },
      { name: 'Submarines', current: 3, max: 3, unit: 'vessels' },
    ],
    strike_range_nm: 0, threat_range_nm: 200,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Bandar_Abbas', source_date: '2025-01-01',
    notes: 'Controls Hormuz chokepoint. IRGCN fast-attack craft home port.',
  },
  {
    id: 'chabahar-naval', actor_id: 'iran', name: 'Chabahar Naval Base', short_name: 'Chabahar NB',
    category: 'naval', asset_type: 'naval_base', description: 'IRIN base on Gulf of Oman. Secondary to Bandar Abbas, less exposed.',
    lat: 25.291, lng: 60.641, zone: 'gulf_of_oman', status: 'available',
    capabilities: [
      { name: 'Patrol Vessels', current: 6, max: 6, unit: 'vessels' },
    ],
    strike_range_nm: 0, threat_range_nm: 150,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Chabahar', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'kharg-island', actor_id: 'iran', name: 'Kharg Island Oil Terminal', short_name: 'Kharg Terminal',
    category: 'infrastructure', asset_type: 'oil_terminal', description: '~90% of Iranian oil exports. Primary strategic economic target.',
    lat: 29.233, lng: 50.317, zone: 'persian_gulf', status: 'available',
    capabilities: [
      { name: 'Export Capacity', current: 4500000, max: 5000000, unit: 'bbl/day' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.eia.gov/international/analysis/country/IRN', source_date: '2025-01-01',
    notes: 'Striking Kharg would collapse Iranian oil revenues within weeks.',
  },
  {
    id: 'abadan-refinery', actor_id: 'iran', name: 'Abadan Refinery Complex', short_name: 'Abadan Ref.',
    category: 'infrastructure', asset_type: 'refinery', description: "One of the world's largest oil refineries. 400,000 bbl/day capacity.",
    lat: 30.340, lng: 48.304, zone: 'southwest_iran', status: 'available',
    capabilities: [
      { name: 'Refining Capacity', current: 400000, max: 400000, unit: 'bbl/day' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Abadan_Refinery', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'shahab-site-west', actor_id: 'iran', name: 'Shahab / Kheibar Shekan Launch Site (West)', short_name: 'Missile Site W',
    category: 'missile', asset_type: 'missile_site', description: 'Western Iran ballistic missile launch complex. Kheibar Shekan and Shahab-3 capable.',
    lat: 34.5, lng: 47.0, zone: 'western_iran', status: 'available',
    capabilities: [
      { name: 'Ballistic Missiles', current: 50, max: 50, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/country/iran/', source_date: '2025-01-01',
    notes: 'Approximate location from open-source OSINT.',
  },
  {
    id: 'shahab-site-central', actor_id: 'iran', name: 'Shahab / Kheibar Shekan Launch Site (Central)', short_name: 'Missile Site C',
    category: 'missile', asset_type: 'missile_site', description: 'Central Iran ballistic missile launch complex.',
    lat: 35.0, lng: 51.5, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'Ballistic Missiles', current: 50, max: 50, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/country/iran/', source_date: '2025-01-01',
    notes: 'Approximate location. Near Tehran industrial zone.',
  },
  {
    id: 'irgc-radar-south', actor_id: 'iran', name: 'IRGC Air Defense Radar (South)', short_name: 'IRGC Radar S',
    category: 'air_defense', asset_type: 'radar', description: 'IRGC air defense radar network covering Strait of Hormuz approach.',
    lat: 27.5, lng: 56.0, zone: 'southern_iran', status: 'available',
    capabilities: [
      { name: 'Detection Range', current: 300, max: 300, unit: 'nm' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'isfahan-air', actor_id: 'iran', name: 'Isfahan Air Defense Complex', short_name: 'Isfahan ADS',
    category: 'air_defense', asset_type: 'air_defense', description: 'Russian S-300 and indigenous Bavar-373 air defense complex protecting Isfahan nuclear sites.',
    lat: 32.627, lng: 51.695, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'S-300 Interceptors', current: 48, max: 48, unit: 'missiles' },
      { name: 'Bavar-373 Interceptors', current: 30, max: 30, unit: 'missiles' },
    ],
    strike_range_nm: 0, threat_range_nm: 130,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/system/s-300pmu-2/', source_date: '2025-01-01',
    notes: 'Partially degraded in Oct 2024 Israeli strike.',
  },

  // ── Generic Force Pools ─────────────────────────────────────────────────────
  {
    id: 'iran-shahed-pool', actor_id: 'iran', name: 'Shahed-136 Drone Stockpile', short_name: 'Shahed Pool',
    category: 'missile', asset_type: 'drone_stockpile', description: 'Iranian loitering munition stockpile. Used extensively in Russia-Ukraine and Iranian direct attacks.',
    lat: 34.5, lng: 51.0, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'Shahed-136 Drones', current: 2000, max: 2000, unit: 'munitions' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.rusi.org/explore-our-research/publications/commentary/iran-shahed-136', source_date: '2023-01-01',
    notes: '~2000 remaining estimate. Production rate ~300/month.',
  },
  {
    id: 'iran-irgcn-naval', actor_id: 'iran', name: 'IRGCN Fast-Attack Craft', short_name: 'IRGCN FAC',
    category: 'naval', asset_type: 'fast_attack_craft', description: 'IRGCN asymmetric naval force. Swarm tactics in Persian Gulf and Strait of Hormuz.',
    lat: 27.1, lng: 56.1, zone: 'strait_of_hormuz', status: 'available',
    capabilities: [
      { name: 'Fast-Attack Craft', current: 100, max: 100, unit: 'vessels' },
    ],
    strike_range_nm: 200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.csis.org/analysis/irans-naval-forces', source_date: '2023-01-01',
    notes: 'Designed for swarm attacks and Hormuz closure operations.',
  },
  {
    id: 'us-ground-staging', actor_id: 'us', name: 'US Ground Forces (Kuwait/Qatar staging)', short_name: 'US Ground KW',
    category: 'ground', asset_type: 'ground_forces', description: 'US Army prepositioned and forward-deployed ground forces in Kuwait and Qatar.',
    lat: 29.3, lng: 47.8, zone: 'kuwait', status: 'available',
    capabilities: [
      { name: 'Personnel', current: 20000, max: 20000, unit: 'personnel' },
      { name: 'M1 Abrams Tanks', current: 120, max: 120, unit: 'vehicles' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.globalsecurity.org/military/world/gulf/kuwait-us-forces.htm', source_date: '2024-01-01',
    notes: 'Does not include 82nd Airborne (not yet deployed in scenario).',
  },
  {
    id: 'iran-irgc-ground', actor_id: 'iran', name: 'IRGC Ground Forces', short_name: 'IRGC Ground',
    category: 'ground', asset_type: 'ground_forces', description: 'Islamic Revolutionary Guard Corps ground forces. Includes Quds Force and Basij.',
    lat: 35.0, lng: 51.0, zone: 'western_iran', status: 'available',
    capabilities: [
      { name: 'Personnel', current: 150000, max: 150000, unit: 'personnel' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.iiss.org/publications/the-military-balance/', source_date: '2025-01-01',
    notes: 'Quds Force specializes in proxy/irregular warfare beyond Iranian borders.',
  },
]

const IRAN_CITIES = [
  { id: 'tehran', name: 'Tehran', country: 'Iran', population: 9400000, economic_role: 'Political capital, military command, industrial hub', lat: 35.6892, lng: 51.3890, zone: 'central_iran', infrastructure_nodes: ['military_command', 'oil_refinery', 'air_defense'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Tehran', source_date: '2025-01-01' },
  { id: 'isfahan', name: 'Isfahan', country: 'Iran', population: 2200000, economic_role: 'Industrial center, nuclear facility adjacency', lat: 32.6546, lng: 51.6680, zone: 'central_iran', infrastructure_nodes: ['nuclear_adjacency', 'steel_industry'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Isfahan', source_date: '2025-01-01' },
  { id: 'bandar-abbas-city', name: 'Bandar Abbas', country: 'Iran', population: 600000, economic_role: 'Strait of Hormuz gateway, naval base, port', lat: 27.1832, lng: 56.2666, zone: 'strait_of_hormuz', infrastructure_nodes: ['naval_base', 'port', 'oil_terminal'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Bandar_Abbas', source_date: '2025-01-01' },
  { id: 'baghdad', name: 'Baghdad', country: 'Iraq', population: 8100000, economic_role: 'Political capital, oil pipeline hub, US military presence', lat: 33.3152, lng: 44.3661, zone: 'iraq', infrastructure_nodes: ['oil_pipeline', 'us_base_proximity', 'port'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Baghdad', source_date: '2025-01-01' },
  { id: 'basra', name: 'Basra', country: 'Iraq', population: 1800000, economic_role: 'Primary oil export terminal, southern Iraq gateway', lat: 30.5085, lng: 47.7804, zone: 'southern_iraq', infrastructure_nodes: ['oil_terminal', 'port', 'refinery'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Basra', source_date: '2025-01-01' },
  { id: 'erbil', name: 'Erbil', country: 'Iraq', population: 1500000, economic_role: 'Kurdish capital, US base proximity, regional logistics', lat: 36.1912, lng: 44.0092, zone: 'northern_iraq', infrastructure_nodes: ['us_base_proximity', 'airport'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Erbil', source_date: '2025-01-01' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', population: 7700000, economic_role: 'Saudi political capital, Aramco headquarters', lat: 24.7136, lng: 46.6753, zone: 'saudi_arabia', infrastructure_nodes: ['oil_headquarters', 'air_defense', 'military_command'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Riyadh', source_date: '2025-01-01' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', population: 4300000, economic_role: 'Economic center, main civilian population zone, tech hub', lat: 32.0853, lng: 34.7818, zone: 'israel', infrastructure_nodes: ['ben_gurion_airport', 'port_ashdod', 'financial_center'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Tel_Aviv', source_date: '2025-01-01' },
  { id: 'jerusalem', name: 'Jerusalem', country: 'Israel', population: 950000, economic_role: 'Political and symbolic capital', lat: 31.7683, lng: 35.2137, zone: 'israel', infrastructure_nodes: ['government_center'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Jerusalem', source_date: '2025-01-01' },
  { id: 'kuwait-city', name: 'Kuwait City', country: 'Kuwait', population: 3000000, economic_role: 'Political capital, US staging area, oil hub', lat: 29.3759, lng: 47.9774, zone: 'kuwait', infrastructure_nodes: ['us_base_staging', 'oil_terminal', 'port'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Kuwait_City', source_date: '2025-01-01' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', population: 3500000, economic_role: 'Regional financial hub, logistics, Al Dhafra AB proximity', lat: 25.2048, lng: 55.2708, zone: 'uae', infrastructure_nodes: ['financial_hub', 'port_jebel_ali', 'airport'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Dubai', source_date: '2025-01-01' },
  { id: 'doha', name: 'Doha', country: 'Qatar', population: 2400000, economic_role: 'Qatar capital, Al Udeid AB host, LNG export hub', lat: 25.2854, lng: 51.5310, zone: 'qatar', infrastructure_nodes: ['us_air_base_host', 'lng_terminal', 'financial_hub'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Doha', source_date: '2025-01-01' },
]

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

  // Load state-effects data (optional — missing files are warnings, not errors)
  let stateEffectsMap = new Map<string, EventStateEffects>()
  try {
    const stateEffectsFile = await readJsonFile<StateEffectsFile>('data/iran-state-effects.json')
    for (const effect of stateEffectsFile.events) {
      stateEffectsMap.set(effect.event_id, effect)
    }
    console.log(`✓ Loaded ${stateEffectsMap.size} state effects`)
  } catch {
    console.warn('  ⚠ data/iran-state-effects.json not found (state_effects columns will be null)')
    stateEffectsMap = new Map()
  }

  // Load state snapshots (optional)
  let stateSnapshots: TurnStateSnapshot[] = []
  try {
    const snapshotsFile = await readJsonFile<StateSnapshotsFile>('data/iran-state-snapshots.json')
    stateSnapshots = snapshotsFile.snapshots
    console.log(`✓ Loaded ${stateSnapshots.length} state snapshots`)
  } catch {
    console.warn('  ⚠ data/iran-state-snapshots.json not found (actor_state_snapshots will be skipped)')
  }

  // Load gap-fill data (optional)
  let gapFillData: GapFillData | null = null
  try {
    gapFillData = await readJsonFile<GapFillData>('data/iran-gap-fill.json')
    console.log('✓ Loaded gap-fill data')
  } catch {
    console.warn('  ⚠ data/iran-gap-fill.json not found (daily_depletion_rates will be skipped)')
  }

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
      // Delete in FK-safe order: child tables first
      const { error: figuresErr } = await supabase.from('key_figures').delete().eq('scenario_id', s.id)
      if (figuresErr) throw new Error(`Failed to delete key_figures for ${s.id}: ${figuresErr.message}`)

      // NOTE: table is scenario_actors (not actors) to avoid collision with the game actors table
      const { error: actorsErr } = await supabase.from('scenario_actors').delete().eq('scenario_id', s.id)
      if (actorsErr) throw new Error(`Failed to delete scenario_actors for ${s.id}: ${actorsErr.message}`)

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
        created_by: null,
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
  const turnCommitIdMap = new Map<string, string>() // event_id → DB uuid
  let prevEscalationCeiling = 0

  for (const event of eventsToSeed) {
    const stateEffects = stateEffectsMap.get(event.id) ?? null
    const insert = buildTurnCommitInsert(
      event, branchId, parentCommitId, turnNumber,
      prevEscalationCeiling, stateEffects
    )
    const { data: commit, error } = await supabase
      .from('turn_commits')
      .insert(insert)
      .select('id')
      .single()

    if (error || !commit) {
      throw new Error(`Failed to create commit for ${event.id}: ${error?.message}`)
    }

    turnCommitIdMap.set(event.id, commit.id)
    prevEscalationCeiling = event.escalation.global_ceiling ?? 0
    parentCommitId = commit.id
    turnNumber++
    console.log(`  ✓ [${turnNumber - 1}] ${event.id}`)
  }

  // Update branch head + scenario through date
  const lastEvent = eventsToSeed[eventsToSeed.length - 1]
  await supabase.from('branches').update({ head_commit_id: parentCommitId }).eq('id', branchId)
  await supabase.from('scenarios').update({ ground_truth_through_date: lastEvent.timestamp }).eq('id', scenarioId)

  // Change 3: Seed actor_state_snapshots
  if (stateSnapshots.length > 0) {
    console.log(`\nSeeding ${stateSnapshots.length} state snapshots...`)
    for (const snapshot of stateSnapshots) {
      const turnCommitId = turnCommitIdMap.get(snapshot.event_id)
      if (!turnCommitId) {
        console.warn(`  ⚠ No turn_commit_id found for snapshot event ${snapshot.event_id} (skipping)`)
        continue
      }
      for (const [actorId, actorState] of Object.entries(snapshot.actor_states)) {
        const row = {
          scenario_id: scenarioId,
          branch_id: branchId,
          turn_commit_id: turnCommitId,
          actor_id: actorId,
          military_strength: actorState.military_strength,
          political_stability: actorState.political_stability,
          economic_health: actorState.economic_health,
          public_support: actorState.public_support,
          international_standing: actorState.international_standing,
          asset_inventory: actorState.asset_inventory as unknown as Record<string, unknown>,
          global_state: snapshot.global_state as unknown as Record<string, unknown>,
          facility_statuses: snapshot.facility_statuses as unknown as Record<string, unknown>[],
          interceptor_effectiveness: (snapshot.interceptor_effectiveness?.[actorId] ?? {}) as Record<string, unknown>,
        }
        const { error } = await supabase
          .from('actor_state_snapshots')
          .upsert(row, { onConflict: 'scenario_id,branch_id,turn_commit_id,actor_id', ignoreDuplicates: false })
        if (error) console.warn(`  ⚠ actor_state_snapshots upsert failed (${actorId}/${snapshot.event_id}): ${error.message}`)
      }
      console.log(`  ✓ Snapshot: ${snapshot.event_id}`)
    }
  } else {
    console.log('\nNo state snapshots to seed (data/iran-state-snapshots.json missing or empty)')
  }

  // Change 4: Seed daily_depletion_rates
  if (gapFillData) {
    console.log('\nSeeding daily depletion rates...')
    let depletionCount = 0
    for (const [actorId, actorRates] of Object.entries(gapFillData.depletion_rates)) {
      for (const [assetType, periods] of Object.entries(actorRates)) {
        for (const period of periods as DepletionPeriod[]) {
          const row = {
            scenario_id: scenarioId,
            branch_id: branchId,
            actor_id: actorId,
            asset_type: assetType,
            rate_per_day: period.rate_per_day,
            effective_from_date: period.effective_from,
            effective_to_date: period.effective_to ?? null,
            trigger_turn_commit_id: null,
            notes: period.notes,
          }
          const { error } = await supabase
            .from('daily_depletion_rates')
            .upsert(row, {
              onConflict: 'scenario_id,branch_id,actor_id,asset_type,effective_from_date',
              ignoreDuplicates: false,
            })
          if (error) console.warn(`  ⚠ daily_depletion_rates upsert failed (${actorId}/${assetType}): ${error.message}`)
          else depletionCount++
        }
      }
    }
    console.log(`✓ Seeded ${depletionCount} depletion rate periods`)
  } else {
    console.log('\nNo depletion rates to seed (data/iran-gap-fill.json missing)')
  }

  // Change 5: threshold_triggers is populated at runtime by the live state engine, not during seed

  console.log(`\n✓ Seed complete: ${eventsToSeed.length} events on trunk branch ${branchId}`)
  return { scenarioId, branchId, commitCount: eventsToSeed.length }
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  seedIranScenario({ fromEventId, dryRun })
    .then(result => { console.log('Seed complete:', result); process.exit(0) })
    .catch(err => { console.error('Seed failed:', err); process.exit(1) })
}
