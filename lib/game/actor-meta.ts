import type { EscalationRungSummary, RelationshipStance } from '@/lib/types/panels'

// ── Actor display metadata ───────────────────────────────────────────────────

export const ACTOR_COLORS: Record<string, string> = {
  us:            '#4a90d9',
  usa:           '#4a90d9',
  united_states: '#4a90d9',
  iran:          '#c0392b',
  irn:           '#c0392b',
  israel:        '#ffba20',
  isr:           '#ffba20',
  saudi_arabia:  '#5ebd8e',
  sau:           '#5ebd8e',
  russia:        '#9b59b6',
  rus:           '#9b59b6',
  china:         '#4a90b8',
  chn:           '#4a90b8',
}

export function getActorColor(actorId: string): string {
  return ACTOR_COLORS[actorId.toLowerCase()] ?? '#8a8880'
}

// ── Relationship stance (from US perspective) ────────────────────────────────

const RELATIONSHIP_MAP: Record<string, RelationshipStance> = {
  us:            'ally',
  usa:           'ally',
  united_states: 'ally',
  israel:        'ally',
  isr:           'ally',
  saudi_arabia:  'ally',
  sau:           'ally',
  iran:          'adversary',
  irn:           'adversary',
  russia:        'rival',
  rus:           'rival',
  china:         'rival',
  chn:           'rival',
}

export function getRelationshipStance(actorId: string): RelationshipStance {
  return RELATIONSHIP_MAP[actorId.toLowerCase()] ?? 'neutral'
}

// ── Adversary flag ────────────────────────────────────────────────────────────

const ADVERSARY_IDS = new Set(['iran', 'irn', 'russia', 'rus'])

export function isAdversaryActor(actorId: string): boolean {
  return ADVERSARY_IDS.has(actorId.toLowerCase())
}

// ── Escalation rung name by level ─────────────────────────────────────────────

const GENERIC_RUNG_NAMES: Record<number, string> = {
  0: 'Peace',
  1: 'Diplomatic Pressure',
  2: 'Economic Coercion',
  3: 'Covert Operations',
  4: 'Proxy / Limited Action',
  5: 'Conventional Strikes',
  6: 'Full-Scale Conflict',
  7: 'Existential Response',
  8: 'Nuclear',
}

const ACTOR_RUNG_NAMES: Record<string, Record<number, string>> = {
  iran: {
    1: 'Diplomatic Resistance',
    2: 'Proxy Activation',
    3: 'Asymmetric Strikes',
    4: 'Direct Retaliation',
    5: 'Regional Escalation',
    6: 'Strategic Deterrence',
    7: 'Nuclear Breakout',
  },
  irn: {
    1: 'Diplomatic Resistance',
    2: 'Proxy Activation',
    3: 'Asymmetric Strikes',
    4: 'Direct Retaliation',
    5: 'Regional Escalation',
    6: 'Strategic Deterrence',
    7: 'Nuclear Breakout',
  },
  israel: {
    1: 'Intelligence Operations',
    2: 'Targeted Strikes',
    3: 'Large-Scale Air Campaign',
    4: 'Ground Invasion',
    5: 'Escalation Dominance',
    6: 'Nuclear (Samson Option)',
  },
  isr: {
    1: 'Intelligence Operations',
    2: 'Targeted Strikes',
    3: 'Large-Scale Air Campaign',
    4: 'Ground Invasion',
    5: 'Escalation Dominance',
    6: 'Nuclear (Samson Option)',
  },
  us: {
    1: 'Diplomatic Pressure',
    2: 'Economic Sanctions',
    3: 'Covert Operations',
    4: 'Proxy / Partner Support',
    5: 'Limited Strikes',
    6: 'Full Air Campaign',
    7: 'Ground Forces',
    8: 'Nuclear',
  },
  usa: {
    1: 'Diplomatic Pressure',
    2: 'Economic Sanctions',
    3: 'Covert Operations',
    4: 'Proxy / Partner Support',
    5: 'Limited Strikes',
    6: 'Full Air Campaign',
    7: 'Ground Forces',
    8: 'Nuclear',
  },
  united_states: {
    1: 'Diplomatic Pressure',
    2: 'Economic Sanctions',
    3: 'Covert Operations',
    4: 'Proxy / Partner Support',
    5: 'Limited Strikes',
    6: 'Full Air Campaign',
    7: 'Ground Forces',
    8: 'Nuclear',
  },
}

export function getEscalationRungName(actorId: string, rung: number): string {
  const actorMap = ACTOR_RUNG_NAMES[actorId.toLowerCase()]
  if (actorMap?.[rung]) return actorMap[rung]
  return GENERIC_RUNG_NAMES[rung] ?? `Rung ${rung}`
}

// ── Full escalation ladder by actor ──────────────────────────────────────────

const ACTOR_LADDERS: Record<string, EscalationRungSummary[]> = {
  iran: [
    { level: 1, name: 'Diplomatic Resistance',  reversibility: 'easy',         description: 'Diplomatic protest, UN statements, regional outreach to counter-pressure.' },
    { level: 2, name: 'Proxy Activation',        reversibility: 'moderate',     description: 'Activate Hezbollah, Houthi, and Shia militia networks for plausible deniability strikes.' },
    { level: 3, name: 'Asymmetric Strikes',      reversibility: 'moderate',     description: 'Drone and missile strikes on regional US/Israeli assets; Gulf tanker harassment.' },
    { level: 4, name: 'Direct Retaliation',      reversibility: 'difficult',    description: 'Direct IRGC ballistic missile strikes on Israel and US bases in the Gulf.' },
    { level: 5, name: 'Regional Escalation',     reversibility: 'difficult',    description: 'Activate all proxy fronts simultaneously; Hormuz mining operations.' },
    { level: 6, name: 'Strategic Deterrence',    reversibility: 'difficult',    description: 'Threaten or demonstrate threshold nuclear capability; maximum economic warfare.' },
    { level: 7, name: 'Nuclear Breakout',        reversibility: 'irreversible', description: 'Weaponize enriched uranium stockpile. Irreversible — triggers immediate international response.' },
  ],
  israel: [
    { level: 1, name: 'Intelligence Operations',      reversibility: 'easy',         description: 'Mossad covert action, targeted surveillance, economic espionage.' },
    { level: 2, name: 'Targeted Strikes',             reversibility: 'easy',         description: 'Precision air strikes on high-value targets (nuclear facilities, commanders).' },
    { level: 3, name: 'Large-Scale Air Campaign',     reversibility: 'moderate',     description: 'Sustained IAF campaign against military infrastructure across multiple countries.' },
    { level: 4, name: 'Ground Invasion',              reversibility: 'difficult',    description: 'IDF ground forces entering Gaza, Lebanon, or Syrian territory.' },
    { level: 5, name: 'Escalation Dominance',         reversibility: 'difficult',    description: 'Full mobilization; elimination of adversary leadership and military capacity.' },
    { level: 6, name: 'Nuclear (Samson Option)',       reversibility: 'irreversible', description: 'Last resort nuclear use if state survival is threatened. Destroys Israel\'s international legitimacy.' },
  ],
  us: [
    { level: 1, name: 'Diplomatic Pressure',      reversibility: 'easy',         description: 'Statements, sanctions threats, UN Security Council maneuvers, back-channel warnings.' },
    { level: 2, name: 'Economic Sanctions',       reversibility: 'easy',         description: 'OFAC designations, secondary sanctions, SWIFT exclusion, asset freezes.' },
    { level: 3, name: 'Covert Operations',        reversibility: 'moderate',     description: 'CIA/SOF covert action, cyberattacks (Stuxnet-type), targeted assassinations.' },
    { level: 4, name: 'Proxy / Partner Support',  reversibility: 'moderate',     description: 'Military aid, intelligence sharing, and indirect support for Israel/Gulf partners.' },
    { level: 5, name: 'Limited Strikes',          reversibility: 'moderate',     description: 'Tomahawk and JASSM strikes on specific military targets, no ground forces.' },
    { level: 6, name: 'Full Air Campaign',        reversibility: 'difficult',    description: 'Extended B-2/F-22/carrier-based air campaign; suppression of Iranian air defenses.' },
    { level: 7, name: 'Ground Forces',            reversibility: 'difficult',    description: 'US Army/Marine ground deployment into theater — significant escalation with domestic political costs.' },
    { level: 8, name: 'Nuclear',                  reversibility: 'irreversible', description: 'Nuclear use — practically inconceivable under current doctrine. Would end US global legitimacy.' },
  ],
  saudi_arabia: [
    { level: 1, name: 'Diplomatic Pressure',      reversibility: 'easy',         description: 'GCC coordination, statements, informal pressure through regional channels.' },
    { level: 2, name: 'Economic Leverage',        reversibility: 'easy',         description: 'Oil production adjustments, ARAMCO pricing signals, financial warfare.' },
    { level: 3, name: 'Military Positioning',     reversibility: 'moderate',     description: 'Mobilization of Saudi military forces, positioning near borders.' },
    { level: 4, name: 'Limited Military Action',  reversibility: 'difficult',    description: 'Air strikes on Houthi/Iranian proxy infrastructure.' },
    { level: 5, name: 'Full Conflict',            reversibility: 'irreversible', description: 'Direct military conflict with Iran or proxies at scale.' },
  ],
  russia: [
    { level: 1, name: 'Information Operations',   reversibility: 'easy',         description: 'Disinformation campaigns, media manipulation, diplomatic counter-messaging.' },
    { level: 2, name: 'Diplomatic Interference',  reversibility: 'easy',         description: 'UNSC vetoes, back-channel support for Iran, weapons systems delays.' },
    { level: 3, name: 'Material Support',         reversibility: 'moderate',     description: 'Weapons transfers, intelligence sharing with Iran, economic lifelines.' },
    { level: 4, name: 'Military Positioning',     reversibility: 'difficult',    description: 'Naval or air force repositioning in the region; implied threat escalation.' },
    { level: 5, name: 'Direct Involvement',       reversibility: 'difficult',    description: 'Russian forces or advisors engaged in the conflict theater.' },
    { level: 6, name: 'Nuclear Signaling',        reversibility: 'irreversible', description: 'Nuclear threats or demonstration; extreme escalation ladder endpoint.' },
  ],
  china: [
    { level: 1, name: 'Diplomatic Mediation',     reversibility: 'easy',         description: 'Calls for restraint, UN engagement, back-channel communication.' },
    { level: 2, name: 'Economic Pressure',        reversibility: 'easy',         description: 'Trade leverage on US/Israel, continued Iran oil purchases, yuan-denominated deals.' },
    { level: 3, name: 'Material Support',         reversibility: 'moderate',     description: 'Military equipment transfers, technology, and dual-use goods to Iran.' },
    { level: 4, name: 'Military Signaling',       reversibility: 'difficult',    description: 'PLA Navy positioning in Indian Ocean; demonstrations of capability.' },
    { level: 5, name: 'Direct Intervention',      reversibility: 'irreversible', description: 'Chinese forces or assets directly involved in conflict — catastrophic escalation risk.' },
  ],
}

export function getEscalationRungs(actorId: string): EscalationRungSummary[] {
  const id = actorId.toLowerCase()
  return (
    ACTOR_LADDERS[id] ??
    ACTOR_LADDERS[id.replace('_', '')] ??
    []
  )
}
