// scripts/pipeline/escalation-framework.ts
// Objective escalation scoring framework for GeoSim.
// Grounded in: Kahn (1965), Glasl (1982), Morgan et al. (2008),
// Lo/Lo/Ng (2022), RAND ROMANCER (2024).
//
// Key design decisions:
//   - 8 macro levels (0-7) map to Kahn's threshold groupings
//   - 0-20 rung scale provides intra-level granularity (Kahn had 44 rungs)
//   - 6 objective scoring criteria replace arbitrary AI number-picking
//   - Three-layer escalation state: per-actor, perceived, dyadic

// ─────────────────────────────────────────────────────────────────────────────
// MACRO LEVELS (0-7)
// Based on Kahn's 7 threshold groupings, modernized for multi-domain conflict.
// ─────────────────────────────────────────────────────────────────────────────

export interface MacroLevel {
  level: number
  name: string
  rung_range: [number, number]  // [min, max] on 0-20 scale
  glasl_phase: "win_win" | "win_lose" | "lose_lose"
  reversibility: "freely_reversible" | "costly_reversal" | "difficult_reversal" | "near_irreversible" | "irreversible"
  description: string
  characteristic_actions: string[]
}

export const MACRO_LEVELS: MacroLevel[] = [
  {
    level: 0,
    name: "Baseline Competition",
    rung_range: [0, 1],
    glasl_phase: "win_win",
    reversibility: "freely_reversible",
    description: "Normal state competition. Sanctions, intel collection, rhetoric, proxy support at existing levels. No crisis framing.",
    characteristic_actions: [
      "Targeted sanctions",
      "Diplomatic protests and demarches",
      "Intelligence collection operations",
      "Military exercises within normal patterns",
      "Information operations and propaganda",
    ],
  },
  {
    level: 1,
    name: "Crisis Onset",
    rung_range: [2, 3],
    glasl_phase: "win_win",
    reversibility: "freely_reversible",
    description: "A dispute is framed as a crisis. Military signaling escalates. Coercive diplomacy begins. Negotiated resolution still believed possible.",
    characteristic_actions: [
      "Public ultimatums and red-line declarations",
      "Carrier strike group deployments",
      "Embassy recalls or diplomatic downgrades",
      "Comprehensive sanctions / asset freezes",
      "Partial reserve mobilization",
      "Cyber probing of critical infrastructure",
    ],
  },
  {
    level: 2,
    name: "Covert / Deniable Operations",
    rung_range: [4, 6],
    glasl_phase: "win_win",
    reversibility: "costly_reversal",
    description: "Kinetic actions have begun but remain covert or through proxies. Plausible deniability maintained. Last level where actors can credibly claim 'not at war.'",
    characteristic_actions: [
      "Covert sabotage (Stuxnet-style)",
      "Targeted assassinations",
      "Proxy force activation or escalation",
      "Destructive cyber attacks on military targets",
      "Maritime interdiction under ambiguous authority",
    ],
  },
  {
    level: 3,
    name: "Limited Overt Military Operations",
    rung_range: [7, 9],
    glasl_phase: "win_lose",
    reversibility: "difficult_reversal",
    description: "Acknowledged military force within constraints — geographic, temporal, or target-set. Both sides recognize armed conflict but actively limit scope. Back-channels may still function.",
    characteristic_actions: [
      "Acknowledged precision strikes on military targets",
      "No-fly zone enforcement",
      "Naval blockade / strait closure",
      "Air defense suppression campaigns",
      "Limited ground operations (SOF, raids)",
      "Conventional retaliatory missile exchanges",
    ],
  },
  {
    level: 4,
    name: "Major Conventional War",
    rung_range: [10, 13],
    glasl_phase: "win_lose",
    reversibility: "difficult_reversal",
    description: "Full-scale conventional operations. Strategic bombing. Dual-use infrastructure targeted. War aims may include regime change. Civilian casualties significant.",
    characteristic_actions: [
      "Strategic bombing of dual-use infrastructure (power, ports, comms)",
      "Ground invasion with armored formations",
      "Sustained air superiority campaigns",
      "Full naval combat operations",
      "Economic infrastructure attacks (oil, finance)",
      "Full mobilization and war economy",
    ],
  },
  {
    level: 5,
    name: "Strategic Escalation",
    rung_range: [14, 16],
    glasl_phase: "lose_lose",
    reversibility: "near_irreversible",
    description: "Crosses fundamental thresholds: WMD facilities struck, civilian centers targeted, nuclear breakout underway, or regime existence threatened. Nuclear shadow looms. Use-or-lose pressures emerge.",
    characteristic_actions: [
      "Strikes on nuclear / WMD facilities",
      "Chemical or biological weapons use",
      "Deliberate attacks on civilian population centers",
      "Regime decapitation attempts",
      "Nuclear breakout / weaponization (short of use)",
      "Destruction of critical national infrastructure threatening mass casualties",
    ],
  },
  {
    level: 6,
    name: "Limited Nuclear Use",
    rung_range: [17, 18],
    glasl_phase: "lose_lose",
    reversibility: "near_irreversible",
    description: "Nuclear taboo broken. One or more weapons detonated — demonstrative, military target, or limited exchange. All actors reassessing. De-escalation possible but requires extraordinary effort.",
    characteristic_actions: [
      "Demonstrative nuclear detonation (uninhabited area)",
      "Tactical nuclear strike on military concentration",
      "Nuclear EMP attack",
      "Limited nuclear exchange (counter-force)",
    ],
  },
  {
    level: 7,
    name: "General Nuclear War",
    rung_range: [19, 20],
    glasl_phase: "lose_lose",
    reversibility: "irreversible",
    description: "Unrestricted nuclear exchange. Counter-value targeting. No meaningful constraints remain. Glasl's 'Together Into the Abyss' — actors accept own destruction to ensure the enemy's.",
    characteristic_actions: [
      "Counter-value nuclear strikes on cities",
      "Full strategic nuclear exchange",
      "Spasm / insensate war",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// NAMED DYADS
// All actor pairs we track threshold state for.
// ─────────────────────────────────────────────────────────────────────────────

export const TRACKED_DYADS = [
  // Primary belligerents
  "us_iran",
  "us_israel",
  "israel_iran",
  // Proxy dyads
  "us_houthis",
  "iran_houthis",
  "us_hezbollah",
  "iran_hezbollah",
  "us_iraqi_militia",
  "iran_iraqi_militia",
  // Observer pairs (nuclear signaling)
  "us_russia",
  "us_china",
] as const

export type DyadKey = (typeof TRACKED_DYADS)[number]

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD DEFINITIONS
// Named thresholds between levels. From Morgan (2008) "dangerous thresholds."
// ─────────────────────────────────────────────────────────────────────────────

export interface Threshold {
  id: string
  name: string
  from_level: number
  to_level: number
  crossing_indicators: string[]
}

export const THRESHOLDS: Threshold[] = [
  {
    id: "thresh_crisis",
    name: "Crisis Declaration",
    from_level: 0,
    to_level: 1,
    crossing_indicators: [
      "Public ultimatum with deadline issued",
      "Emergency UNSC session called",
      "Military alert level raised above routine",
      "Evacuation of diplomatic personnel ordered",
    ],
  },
  {
    id: "thresh_covert_force",
    name: "First Use of Force (Deniable)",
    from_level: 1,
    to_level: 2,
    crossing_indicators: [
      "Confirmed covert strike or sabotage operation",
      "Proxy force engagement with confirmed state direction",
      "Destructive cyber attack on critical infrastructure",
      "Confirmed assassination of military or political figure",
    ],
  },
  {
    id: "thresh_overt_force",
    name: "Acknowledged Military Force",
    from_level: 2,
    to_level: 3,
    crossing_indicators: [
      "State publicly claims or acknowledges air/missile strikes",
      "Military forces engage in acknowledged direct combat",
      "Formal war powers notification or equivalent",
    ],
  },
  {
    id: "thresh_total_war",
    name: "Constraint Removal",
    from_level: 3,
    to_level: 4,
    crossing_indicators: [
      "Strategic bombing of civilian dual-use infrastructure",
      "Ground invasion launched",
      "War aims publicly stated as regime change",
      "Full national mobilization ordered",
    ],
  },
  {
    id: "thresh_wmd",
    name: "WMD / Existential Threshold",
    from_level: 4,
    to_level: 5,
    crossing_indicators: [
      "WMD (chemical/biological) confirmed use",
      "Strikes on nuclear facilities causing radiological release",
      "Nuclear breakout confirmed by intelligence",
      "Regime decapitation strike executed",
    ],
  },
  {
    id: "thresh_nuclear_use",
    name: "Nuclear Threshold",
    from_level: 5,
    to_level: 6,
    crossing_indicators: [
      "Confirmed nuclear detonation (any yield, any target type)",
      "Nuclear EMP confirmed",
    ],
  },
  {
    id: "thresh_armageddon",
    name: "Strategic Nuclear Exchange",
    from_level: 6,
    to_level: 7,
    crossing_indicators: [
      "Nuclear strikes on population centers",
      "Multiple simultaneous nuclear detonations",
      "Full strategic arsenal launch",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVE SCORING CRITERIA
// Each event is scored on 6 criteria. The weighted composite maps to a rung.
// Derived from Morgan et al.'s finding that target sensitivity and lethality
// are the strongest predictors of perceived escalatory significance.
// ─────────────────────────────────────────────────────────────────────────────

export interface EscalationCriteria {
  /** 0=non-lethal, 1=individuals, 2=dozens, 3=hundreds, 4=thousands, 5=mass casualties */
  lethality: 0 | 1 | 2 | 3 | 4 | 5
  /**
   * 0=fully deniable, 1=suspected, 2=likely attributed,
   * 3=acknowledged, 4=publicly claimed
   */
  attribution: 0 | 1 | 2 | 3 | 4
  /**
   * 0=military forces in theater, 1=military infrastructure,
   * 2=dual-use infrastructure, 3=economic infrastructure,
   * 4=civilian population/leadership, 5=nuclear/WMD sites
   */
  target_sensitivity: 0 | 1 | 2 | 3 | 4 | 5
  /**
   * 0=within existing conflict zone, 1=adjacent/EEZ,
   * 2=opponent non-core sovereign territory, 3=opponent core/capital region,
   * 4=third-party state territory, 5=global commons
   */
  geographic_scope: 0 | 1 | 2 | 3 | 4 | 5
  /**
   * 0=fully reversible (sanctions lifted), 1=mostly reversible (deploy/withdraw),
   * 2=partially reversible (infrastructure rebuilt), 3=mostly irreversible (casualties),
   * 4=fully irreversible (nuclear use, regime destroyed)
   */
  reversibility: 0 | 1 | 2 | 3 | 4
  /**
   * 0=within norms of state competition, 1=gray zone (legally ambiguous),
   * 2=violates international law (precedented), 3=violates major norm (sovereignty),
   * 4=breaks fundamental taboo (WMD use, genocide)
   */
  norm_violation: 0 | 1 | 2 | 3 | 4
}

const CRITERIA_WEIGHTS = {
  lethality: 0.22,
  target_sensitivity: 0.22,
  norm_violation: 0.18,
  geographic_scope: 0.15,
  reversibility: 0.13,
  attribution: 0.10,
}

/** Compute composite score (0-100) from criteria. */
export function computeCompositeScore(criteria: EscalationCriteria): number {
  const score =
    (criteria.lethality / 5) * 100 * CRITERIA_WEIGHTS.lethality +
    (criteria.target_sensitivity / 5) * 100 * CRITERIA_WEIGHTS.target_sensitivity +
    (criteria.norm_violation / 4) * 100 * CRITERIA_WEIGHTS.norm_violation +
    (criteria.geographic_scope / 5) * 100 * CRITERIA_WEIGHTS.geographic_scope +
    (criteria.reversibility / 4) * 100 * CRITERIA_WEIGHTS.reversibility +
    (criteria.attribution / 4) * 100 * CRITERIA_WEIGHTS.attribution

  return Math.round(Math.min(100, Math.max(0, score)))
}

/** Map composite score (0-100) to escalation rung (0-20). */
export function scoreToRung(score: number): number {
  return Math.round((score / 100) * 20)
}

/** Map rung (0-20) to macro level (0-7). */
export function rungToLevel(rung: number): MacroLevel {
  for (const level of MACRO_LEVELS) {
    if (rung >= level.rung_range[0] && rung <= level.rung_range[1]) {
      return level
    }
  }
  return MACRO_LEVELS[MACRO_LEVELS.length - 1]
}

/** Full scoring: criteria → composite → rung → level */
export function scoreEscalation(criteria: EscalationCriteria): {
  composite: number
  rung: number
  level: MacroLevel
} {
  const composite = computeCompositeScore(criteria)
  const rung = scoreToRung(composite)
  const level = rungToLevel(rung)
  return { composite, rung, level }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT FRAGMENT
// Embed in enrichment/rescore prompts so Claude scores against criteria,
// not arbitrary intuition.
// ─────────────────────────────────────────────────────────────────────────────

export const ESCALATION_FRAMEWORK_PROMPT = `
ESCALATION FRAMEWORK — score each actor's position using objective criteria:

MACRO LEVELS (0-7) mapped to rungs (0-20):
  Level 0 "Baseline Competition"         → rungs 0-1   (sanctions, intel ops, rhetoric)
  Level 1 "Crisis Onset"                 → rungs 2-3   (ultimatums, carrier deployments, embassy recalls)
  Level 2 "Covert/Deniable Operations"   → rungs 4-6   (assassinations, sabotage, proxy activation)
  Level 3 "Limited Overt Military"       → rungs 7-9   (acknowledged precision strikes on military targets)
  Level 4 "Major Conventional War"       → rungs 10-13 (strategic bombing, ground invasion, infrastructure)
  Level 5 "Strategic Escalation"         → rungs 14-16 (nuclear facility strikes, regime targeting, WMD)
  Level 6 "Limited Nuclear Use"          → rungs 17-18 (nuclear detonation, tactical nuclear strike)
  Level 7 "General Nuclear War"          → rungs 19-20 (counter-value, strategic exchange)

CRITICAL RULE — actor position is based on the most escalatory action THEY have taken,
scored from THEIR strategic doctrine perspective, not the target's experience.
A US precision strike on a nuclear facility is Level 3 from the US perspective
(limited overt military, constrained targeting) even though Iran experiences it as Level 5.

6 OBJECTIVE SCORING CRITERIA (fill these in for each actor's action in this event):
  lethality:          0=non-lethal, 1=individuals, 2=dozens, 3=hundreds, 4=thousands, 5=mass casualties
  attribution:        0=fully deniable, 1=suspected, 2=likely, 3=acknowledged, 4=publicly claimed
  target_sensitivity: 0=military forces, 1=military infrastructure, 2=dual-use, 3=economic, 4=civilian/leadership, 5=nuclear/WMD
  geographic_scope:   0=existing conflict zone, 1=adjacent, 2=opponent non-core territory, 3=opponent core/capital, 4=third-party state, 5=global commons
  reversibility:      0=fully reversible, 1=mostly, 2=partially, 3=mostly irreversible, 4=fully irreversible
  norm_violation:     0=within norms, 1=gray zone, 2=violates law (precedented), 3=violates major norm, 4=breaks fundamental taboo

DYADS — track threshold state for each relevant actor pair:
  us_iran, us_israel, israel_iran,
  us_houthis, iran_houthis, us_hezbollah, iran_hezbollah,
  us_iraqi_militia, iran_iraqi_militia, us_russia, us_china

THRESHOLDS (list which are crossed by this event):
  thresh_crisis (0→1), thresh_covert_force (1→2), thresh_overt_force (2→3),
  thresh_total_war (3→4), thresh_wmd (4→5), thresh_nuclear_use (5→6), thresh_armageddon (6→7)

PERCEIVED POSITIONS — each actor's intel estimate of the other's rung (may differ from actual).
Use the actor's intelligence profile and fog-of-war to determine what they can observe.
`
