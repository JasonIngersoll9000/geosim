import type { EscalationRungSummary, RelationshipStance } from '@/lib/types/panels'

// ── Actor ID normalisation ────────────────────────────────────────────────────

/** Canonical actor ID for lookups (handles aliases like 'usa', 'us', 'united_states') */
export function norm(actorId: string): string {
  const id = actorId.toLowerCase().replace(/-/g, '_')
  if (id === 'usa' || id === 'united_states' || id === 'unitedstates') return 'us'
  if (id === 'irn') return 'iran'
  if (id === 'isr') return 'israel'
  if (id === 'sau') return 'saudi_arabia'
  if (id === 'rus') return 'russia'
  if (id === 'chn') return 'china'
  return id
}

// ── Actor display metadata ───────────────────────────────────────────────────

const ACTOR_COLORS: Record<string, string> = {
  us:            '#4a90d9',
  iran:          '#c0392b',
  israel:        '#ffba20',
  saudi_arabia:  '#5ebd8e',
  russia:        '#9b59b6',
  china:         '#4a90b8',
}

export function getActorColor(actorId: string): string {
  return ACTOR_COLORS[norm(actorId)] ?? '#8a8880'
}

// ── Relationship stance (relative to a viewing actor) ────────────────────────

/**
 * Pre-defined relationship stances between actor pairs.
 * Key = `${viewerCanonical}→${targetCanonical}`.
 * Defaults to 'neutral' when pair is unknown.
 */
const STANCE_MAP: Record<string, RelationshipStance> = {
  // US-centric
  'us→us':           'ally',
  'us→israel':       'ally',
  'us→saudi_arabia': 'ally',
  'us→iran':         'adversary',
  'us→russia':       'rival',
  'us→china':        'rival',
  // Iran-centric
  'iran→iran':         'ally',
  'iran→us':           'adversary',
  'iran→israel':       'adversary',
  'iran→saudi_arabia': 'adversary',
  'iran→russia':       'proxy',
  'iran→china':        'proxy',
  // Israel-centric
  'israel→israel':       'ally',
  'israel→us':           'ally',
  'israel→iran':         'adversary',
  'israel→russia':       'rival',
  'israel→saudi_arabia': 'neutral',
  'israel→china':        'neutral',
  // Saudi-centric
  'saudi_arabia→saudi_arabia': 'ally',
  'saudi_arabia→us':           'ally',
  'saudi_arabia→israel':       'neutral',
  'saudi_arabia→iran':         'adversary',
  'saudi_arabia→russia':       'neutral',
  'saudi_arabia→china':        'neutral',
}

/**
 * Compute relationship stance of `targetActorId` from `viewerActorId`'s perspective.
 * Defaults to US perspective when viewerActorId is 'us' or omitted.
 */
export function getRelationshipStance(targetActorId: string, viewerActorId = 'us'): RelationshipStance {
  const key = `${norm(viewerActorId)}→${norm(targetActorId)}`
  return STANCE_MAP[key] ?? 'neutral'
}

/**
 * Whether `targetActorId` is an adversary from `viewerActorId`'s perspective.
 * When the viewer is adversary/rival to the target, full intelligence is available.
 * When viewer IS the target, no FOW applies.
 */
export function isAdversaryActor(targetActorId: string, viewerActorId = 'us'): boolean {
  const target = norm(targetActorId)
  const viewer = norm(viewerActorId)
  if (target === viewer) return false
  // Use the stance map to determine adversary relationship
  const key = `${viewer}→${target}`
  const stance = STANCE_MAP[key] ?? 'neutral'
  return stance === 'adversary'
}

/**
 * Whether the viewing actor has imperfect intelligence about the target —
 * i.e., the target is not an ally or self.
 * This drives FOW label display for intermediate actors (rivals, neutrals).
 */
export function hasLimitedIntel(targetActorId: string, viewerActorId = 'us'): boolean {
  const target = norm(targetActorId)
  const viewer = norm(viewerActorId)
  if (target === viewer) return false
  const key = `${viewer}→${target}`
  const stance = STANCE_MAP[key] ?? 'neutral'
  return stance !== 'ally'
}

// ── Escalation rung name by level ─────────────────────────────────────────────

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
  israel: {
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
  saudi_arabia: {
    1: 'Diplomatic Pressure',
    2: 'Economic Leverage',
    3: 'Military Positioning',
    4: 'Limited Military Action',
    5: 'Full Conflict',
  },
  russia: {
    1: 'Information Operations',
    2: 'Diplomatic Interference',
    3: 'Material Support',
    4: 'Military Positioning',
    5: 'Direct Involvement',
    6: 'Nuclear Signaling',
  },
  china: {
    1: 'Diplomatic Mediation',
    2: 'Economic Pressure',
    3: 'Material Support',
    4: 'Military Signaling',
    5: 'Direct Intervention',
  },
}

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

export function getEscalationRungName(actorId: string, rung: number): string {
  const actorMap = ACTOR_RUNG_NAMES[norm(actorId)]
  if (actorMap?.[rung]) return actorMap[rung]
  return GENERIC_RUNG_NAMES[rung] ?? `Rung ${rung}`
}

// ── Full escalation ladder by actor ──────────────────────────────────────────

const ACTOR_LADDERS: Record<string, EscalationRungSummary[]> = {
  iran: [
    { level: 1, name: 'Diplomatic Resistance',  reversibility: 'easy',
      description: 'Diplomatic protest, UN statements, regional outreach to counter-pressure.',
      trigger: 'Default baseline; any external diplomatic or economic pressure.' },
    { level: 2, name: 'Proxy Activation',        reversibility: 'moderate',
      description: 'Activate Hezbollah, Houthi, and Shia militia networks for plausible deniability strikes.',
      trigger: 'US or Israeli sanctions escalation, IAEA censure, or perceived imminent military threat.' },
    { level: 3, name: 'Asymmetric Strikes',      reversibility: 'moderate',
      description: 'Drone and missile strikes on regional US/Israeli assets; Gulf tanker harassment.',
      trigger: 'Direct strike on IRGC commanders, nuclear facilities, or Iranian proxies by US/Israel.' },
    { level: 4, name: 'Direct Retaliation',      reversibility: 'difficult',
      description: 'Direct IRGC ballistic missile strikes on Israel and US bases in the Gulf.',
      trigger: 'Large-scale Israeli air campaign or US limited strikes on Iranian soil.' },
    { level: 5, name: 'Regional Escalation',     reversibility: 'difficult',
      description: 'Activate all proxy fronts simultaneously; Hormuz mining operations.',
      trigger: 'Sustained US/Israeli air campaign causing major military or civilian casualties inside Iran.' },
    { level: 6, name: 'Strategic Deterrence',    reversibility: 'difficult',
      description: 'Threaten or demonstrate threshold nuclear capability; maximum economic warfare.',
      trigger: 'Regime survival perceived as threatened; US ground force deployment in theater.' },
    { level: 7, name: 'Nuclear Breakout',        reversibility: 'irreversible',
      description: 'Weaponize enriched uranium stockpile. Irreversible — triggers immediate international response.',
      trigger: 'Existential military threat to the Islamic Republic; conventional defense fully degraded.' },
  ],
  israel: [
    { level: 1, name: 'Intelligence Operations',      reversibility: 'easy',
      description: 'Mossad covert action, targeted surveillance, economic espionage.',
      trigger: 'Baseline; Iranian nuclear progress or proxy threat buildup detected.' },
    { level: 2, name: 'Targeted Strikes',             reversibility: 'easy',
      description: 'Precision air strikes on high-value targets (nuclear facilities, commanders).',
      trigger: 'Iran crosses 90% enrichment threshold or transfers precision weapons to Hezbollah.' },
    { level: 3, name: 'Large-Scale Air Campaign',     reversibility: 'moderate',
      description: 'Sustained IAF campaign against military infrastructure across multiple countries.',
      trigger: 'Mass rocket/missile barrage from Lebanon or Iranian direct missile strike on Israeli cities.' },
    { level: 4, name: 'Ground Invasion',              reversibility: 'difficult',
      description: 'IDF ground forces entering Gaza, Lebanon, or Syrian territory.',
      trigger: 'Sustained cross-border fire that air power alone cannot suppress; hostage crisis.' },
    { level: 5, name: 'Escalation Dominance',         reversibility: 'difficult',
      description: 'Full mobilization; elimination of adversary leadership and military capacity.',
      trigger: 'Multi-front simultaneous attack; Iranian ballistic missiles penetrate Iron Dome at scale.' },
    { level: 6, name: 'Nuclear (Samson Option)',       reversibility: 'irreversible',
      description: 'Last resort nuclear use if state survival is threatened. Destroys international legitimacy.',
      trigger: 'Existential threat to Israel\'s survival with no conventional military option remaining.' },
  ],
  us: [
    { level: 1, name: 'Diplomatic Pressure',      reversibility: 'easy',
      description: 'Statements, sanctions threats, UN Security Council maneuvers, back-channel warnings.',
      trigger: 'Baseline; any regional provocation or Iranian nuclear progress.' },
    { level: 2, name: 'Economic Sanctions',       reversibility: 'easy',
      description: 'OFAC designations, secondary sanctions, SWIFT exclusion, asset freezes.',
      trigger: 'Iran exceeds JCPOA limits or attacks US allies; diplomatic pressure fails.' },
    { level: 3, name: 'Covert Operations',        reversibility: 'moderate',
      description: 'CIA/SOF covert action, cyberattacks (Stuxnet-type), targeted assassinations.',
      trigger: 'Iranian nuclear breakout threshold approached; proxy attacks on US personnel.' },
    { level: 4, name: 'Proxy / Partner Support',  reversibility: 'moderate',
      description: 'Military aid, intelligence sharing, and indirect support for Israel/Gulf partners.',
      trigger: 'US domestic politics prevent direct action; Israel or Gulf states face major threat.' },
    { level: 5, name: 'Limited Strikes',          reversibility: 'moderate',
      description: 'Tomahawk and JASSM strikes on specific military targets, no ground forces.',
      trigger: 'Iran directly strikes US military bases or kills US service members in theater.' },
    { level: 6, name: 'Full Air Campaign',        reversibility: 'difficult',
      description: 'Extended B-2/F-22/carrier-based air campaign; suppression of Iranian air defenses.',
      trigger: 'Iranian nuclear weaponization imminent; large-scale regional war threatens US interests.' },
    { level: 7, name: 'Ground Forces',            reversibility: 'difficult',
      description: 'US Army/Marine ground deployment into theater — significant escalation with domestic political costs.',
      trigger: 'Air campaign fails to degrade Iranian military; Gulf state governments at risk of collapse.' },
    { level: 8, name: 'Nuclear',                  reversibility: 'irreversible',
      description: 'Nuclear use — practically inconceivable under current doctrine. Would end US global legitimacy.',
      trigger: 'Only theoretical: nuclear first-use by adversary against the US homeland.' },
  ],
  saudi_arabia: [
    { level: 1, name: 'Diplomatic Pressure',      reversibility: 'easy',
      description: 'GCC coordination, statements, informal pressure through regional channels.',
      trigger: 'Baseline; Iranian assertiveness in the Gulf region.' },
    { level: 2, name: 'Economic Leverage',        reversibility: 'easy',
      description: 'Oil production adjustments, ARAMCO pricing signals, financial warfare.',
      trigger: 'Iranian oil exports undercut Saudi market share; OPEC+ political disputes.' },
    { level: 3, name: 'Military Positioning',     reversibility: 'moderate',
      description: 'Mobilization of Saudi military forces, positioning near borders.',
      trigger: 'Houthi or Iranian-backed attacks on Saudi infrastructure; regional conflict outbreak.' },
    { level: 4, name: 'Limited Military Action',  reversibility: 'difficult',
      description: 'Air strikes on Houthi/Iranian proxy infrastructure.',
      trigger: 'Direct IRGC-linked attack causing Saudi civilian casualties.' },
    { level: 5, name: 'Full Conflict',            reversibility: 'irreversible',
      description: 'Direct military conflict with Iran or proxies at scale.',
      trigger: 'Iranian attack on ARAMCO facilities, desalination plants, or Riyadh itself.' },
  ],
  russia: [
    { level: 1, name: 'Information Operations',   reversibility: 'easy',
      description: 'Disinformation campaigns, media manipulation, diplomatic counter-messaging.',
      trigger: 'Baseline; US regional dominance perceived as limiting Russian influence.' },
    { level: 2, name: 'Diplomatic Interference',  reversibility: 'easy',
      description: 'UNSC vetoes, back-channel support for Iran, weapons systems delays.',
      trigger: 'US attempts to build coalition against Iran; NATO involvement threatened.' },
    { level: 3, name: 'Material Support',         reversibility: 'moderate',
      description: 'Weapons transfers, intelligence sharing with Iran, economic lifelines.',
      trigger: 'Iran requests advanced weaponry; Russia seeks to distract US from Ukraine.' },
    { level: 4, name: 'Military Positioning',     reversibility: 'difficult',
      description: 'Naval or air force repositioning in the region; implied threat escalation.',
      trigger: 'US carrier strike group moves into Persian Gulf for offensive operations.' },
    { level: 5, name: 'Direct Involvement',       reversibility: 'difficult',
      description: 'Russian forces or advisors engaged in the conflict theater.',
      trigger: 'Iranian government faces collapse; Russian military bases in Syria threatened.' },
    { level: 6, name: 'Nuclear Signaling',        reversibility: 'irreversible',
      description: 'Nuclear threats or demonstration; extreme escalation ladder endpoint.',
      trigger: 'Russia perceives direct military defeat threatening core national interests.' },
  ],
  china: [
    { level: 1, name: 'Diplomatic Mediation',     reversibility: 'easy',
      description: 'Calls for restraint, UN engagement, back-channel communication.',
      trigger: 'Baseline; conflict threatens Chinese energy supply lines and BRI investments.' },
    { level: 2, name: 'Economic Pressure',        reversibility: 'easy',
      description: 'Trade leverage on US/Israel, continued Iran oil purchases, yuan-denominated deals.',
      trigger: 'US secondary sanctions threaten Chinese companies; Iran oil trade disrupted.' },
    { level: 3, name: 'Material Support',         reversibility: 'moderate',
      description: 'Military equipment transfers, technology, and dual-use goods to Iran.',
      trigger: 'Iran requests advanced weapons; China seeks to tie down US forces in Middle East.' },
    { level: 4, name: 'Military Signaling',       reversibility: 'difficult',
      description: 'PLA Navy positioning in Indian Ocean; demonstrations of capability.',
      trigger: 'US naval blockade threatens Chinese energy imports; Taiwan Strait contingency.' },
    { level: 5, name: 'Direct Intervention',      reversibility: 'irreversible',
      description: 'Chinese forces or assets directly involved in conflict — catastrophic escalation risk.',
      trigger: 'Chinese military personnel casualties or direct attack on Chinese economic interests.' },
  ],
}

/**
 * Return the escalation ladder for an actor.
 * Rungs that are already passed AND are irreversible get an `isBlocked` flag with
 * a reason derived purely from the current rung — no external constraint data needed.
 */
export function getEscalationRungs(actorId: string, currentRung = 0): EscalationRungSummary[] {
  const ladder = ACTOR_LADDERS[norm(actorId)] ?? []

  // Find the highest irreversible rung that has already been crossed
  const crossedIrreversibleRungs = ladder
    .filter(r => r.reversibility === 'irreversible' && r.level < currentRung)
    .map(r => r.level)
  const lowestCrossedIrreversible = crossedIrreversibleRungs.length > 0
    ? Math.min(...crossedIrreversibleRungs)
    : null

  return ladder.map(rung => {
    // De-escalation below a crossed irreversible rung is blocked
    if (
      lowestCrossedIrreversible !== null &&
      rung.level < lowestCrossedIrreversible
    ) {
      return {
        ...rung,
        isBlocked:   true,
        blockReason: `De-escalation below irreversible threshold (rung ${lowestCrossedIrreversible})`,
      }
    }
    return rung
  })
}
