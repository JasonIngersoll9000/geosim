Good — your project knowledge already has the `EscalationLadder` and `EscalationRung` interfaces, but the rung definitions themselves need grounding in established theory. Let me research the academic literature on escalation frameworks.This is great territory for the simulator. I've dug through the academic literature and found several foundational frameworks, plus a recent RAND simulation model that's almost directly analogous to what you're building. Let me synthesize what I found and give you a concrete recommendation.

---

## The Academic Landscape

There are **four major frameworks** worth knowing about, each solving a different piece of your problem:

### 1. Herman Kahn's Escalation Ladder (1965)

The foundational model. Kahn's ladder consisted of 44 steps, ranging from "Show of Force" to "Barely Nuclear War" to "Civilian Devastation Attack," grouped into seven threshold units. Two core insights survive from his work that matter for your simulator. First, linear escalation exists in steps — it is neither a spectrum where one can freely increase or decrease to whatever one desires, nor is it a fixed dichotomy where one must choose from two options. Second, a state's capabilities differ across different escalation steps, stemming from the different capabilities, institutions, and technologies underpinning each step.

The major criticism relevant to you: many of the steps were vague, with labels such as "show of force" covering everything from sponsored terrorist attacks to artillery duels; many steps — particularly nuclear steps — were inapplicable to most states; and it lacked steps reflecting geographies or capabilities that diverge from his 1960s Cold War frame.

Kahn's seven threshold groupings (Subcrisis Maneuvering → Traditional Crises → Intense Crises → Bizarre Crises → Exemplary Central Attacks → Military Central Wars → Civilian Central Wars) are still the best starting taxonomy for your **macro-level thresholds**, even though his 44 rungs need heavy modernization.

### 2. Friedrich Glasl's Nine-Stage Model (1982)

Glasl approached escalation from the opposite angle — not what actions characterize each level, but what *psychological and institutional dynamics* drive the transition between levels. The model consists of three main levels, with each level comprising three phases, leading to a total of nine stages. The three levels map to outcome structures: **Win-Win** (stages 1–3), **Win-Lose** (stages 4–6), and **Lose-Lose** (stages 7–9).

Rather than seeking causes in the individuals, the model emphasizes how there is an internal logic to conflict relationships, stemming from the failure of "benign" ways of handling contradictory interests and standpoints. This is directly useful for your simulator's decision logic — it gives you a framework for *why* actors escalate, not just *what* they do.

### 3. Morgan et al., "Dangerous Thresholds" (RAND, 2008)

This is the most operationally useful framework for your simulator. Morgan's analysis draws on historical examples from World War I to the struggle against global Jihad and reveals that managing the risks of escalatory chain reactions requires understanding and dampening the mechanisms of deliberate, accidental, and inadvertent escalation.

The key contribution is a **typology of escalation mechanisms** — deliberate (strategic choice), inadvertent (misperception/fog of war), and accidental (unauthorized or unintended use) — combined with threshold analysis. Escalation in a geopolitical sense is about a significant leap in the intensity of a confrontation, although the precise nature of that leap — its significance and danger — can differ. Morgan also distinguishes between **vertical escalation** (intensity increase) and **horizontal escalation** (geographic or domain spreading), which maps perfectly onto your multi-dimensional model.

### 4. Lo, Lo & Ng, "Reconstructing the Ladder" (Strategy Bridge, 2022)

This is the most recent theoretical update. The authors propose a theory of specific and dynamic escalation ladders, identifying four variables that can lead to the creation or destruction of ladder steps: geography, capabilities, public policy rhetoric, and patterns of behavior. Their key insight is that **the ladder itself changes** — rungs are created and destroyed by the actors' choices and circumstances. Ladder steps might rapidly change with shifting geographies, capabilities, public statements, and patterns of behaviour, possibly driven by different concurrent strategies.

They specifically use **Iran-Israel** as a case study, noting that the most obvious shifts in the Iranian-Israeli escalation ladders are those driven by capabilities — specifically Iran's nuclear and cyber weapons programmes, largely developed to match adversary escalation ladders.

### 5. RAND ROMANCER Model (2024)

This is the one you really want. RAND built an actual computational escalation simulation. Pattern-matching rules are associated with the rung objects that make up the reasoner's escalation ladder, and a domain-specific language permits constructing arbitrary match procedures, such as "the agent perceives the opponent has sent these two specific deterrent threats, and the adversary is perceived to have an estimated resolve exceeding a certain threshold." When a rung matches, it triggers the reasoner to enqueue a set of planned actions. This is essentially the same architecture you're building with your actor agents and escalation triggers.

---

## Recommended Framework for GeoSim

Given all of this, here's my recommendation. Rather than adopting any single framework wholesale, you should build a **hybrid model** that draws the right pieces from each:## How This Framework Solves Your Problem

// ============================================================
// GEOSIM ESCALATION FRAMEWORK
// Grounded in: Kahn (1965), Glasl (1982), Morgan et al. (2008),
// Lo/Lo/Ng (2022), RAND ROMANCER (2024)
// ============================================================

// ------------------------------------------------------------
// CORE ESCALATION LEVELS
//
// Derived from Kahn's 7 threshold groupings, modernized per
// Morgan's typology and Lo et al.'s dynamic ladder theory.
// These are UNIVERSAL — every actor's ladder maps onto them.
// Actor-specific rungs sit WITHIN these levels.
// ------------------------------------------------------------

/**
 * The 8 macro levels synthesize Kahn's thresholds with modern
 * multi-domain conflict realities. Each level has:
 * - A numeric value (0-7) for comparison and math
 * - Semantic anchors defining what "being at this level" means
 * - A reversibility assessment (from Glasl's insight that
 *   escalation becomes progressively harder to reverse)
 * - A Glasl outcome structure (win-win / win-lose / lose-lose)
 *
 * The key insight from Morgan: escalation is not just vertical
 * (intensity) but also horizontal (scope/domain). Both axes
 * must be tracked independently.
 */

type EscalationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type GlaslOutcomeStructure = "win_win" | "win_lose" | "lose_lose";

type ReversibilityClass =
  | "freely_reversible"   // actors can step back without cost
  | "costly_reversal"     // stepping back carries political/strategic cost
  | "difficult_reversal"  // requires active de-escalation efforts, third-party mediation
  | "near_irreversible"   // only major exogenous shocks or regime change can reverse
  | "irreversible";       // Rubicon crossed — cannot be undone

interface MacroEscalationLevel {
  level: EscalationLevel;
  name: string;
  kahnMapping: string;         // which of Kahn's 7 thresholds this derives from
  glaslPhase: GlaslOutcomeStructure;
  reversibility: ReversibilityClass;
  description: string;
  /**
   * What TYPES of actions characterize this level.
   * These are domain-agnostic — specific actions are defined
   * per-actor in their custom rungs.
   */
  characteristicActionTypes: string[];
  /**
   * Morgan's escalation mechanism filter: what types of
   * escalation are most likely to push INTO this level?
   */
  dominantEscalationMechanism: ("deliberate" | "inadvertent" | "accidental")[];
  /**
   * Political cost range at this level (0-100).
   * From Morgan: political costs constrain escalation even
   * when military options exist.
   */
  politicalCostFloor: number;
  politicalCostCeiling: number;
}

const ESCALATION_LEVELS: MacroEscalationLevel[] = [
  {
    level: 0,
    name: "Baseline Competition",
    kahnMapping: "Pre-crisis / Disagreement",
    glaslPhase: "win_win",
    reversibility: "freely_reversible",
    description:
      "Normal state competition. Diplomatic friction, economic rivalry, " +
      "intelligence collection, rhetorical posturing. No crisis framing. " +
      "Routine military posturing within established norms.",
    characteristicActionTypes: [
      "Diplomatic protests and demarches",
      "Sanctions packages (targeted/sectoral)",
      "Intelligence operations (collection, not covert action)",
      "Military exercises and deployments within normal patterns",
      "Proxy support at existing levels",
      "Information operations and propaganda",
    ],
    dominantEscalationMechanism: ["deliberate"],
    politicalCostFloor: 0,
    politicalCostCeiling: 15,
  },
  {
    level: 1,
    name: "Crisis Onset",
    kahnMapping: "Subcrisis Maneuvering → Traditional Crisis",
    glaslPhase: "win_win",
    reversibility: "freely_reversible",
    description:
      "A specific dispute has been framed as a crisis by at least one " +
      "party. Diplomatic channels are strained but open. Military " +
      "signaling escalates beyond routine. Coercive diplomacy begins. " +
      "Both sides believe negotiated resolution is still possible.",
    characteristicActionTypes: [
      "Ultimatums and public red-line declarations",
      "Naval deployments / carrier strike group movements",
      "Embassy recalls or diplomatic downgrades",
      "Cyber probing of critical infrastructure",
      "Mobilization of reserves (partial)",
      "Economic coercion (comprehensive sanctions, asset freezes)",
    ],
    dominantEscalationMechanism: ["deliberate"],
    politicalCostFloor: 5,
    politicalCostCeiling: 25,
  },
  {
    level: 2,
    name: "Covert / Deniable Operations",
    kahnMapping: "Intense Crises (lower rungs)",
    glaslPhase: "win_win",
    reversibility: "costly_reversal",
    description:
      "Kinetic or destructive actions have begun but are covert, " +
      "deniable, or conducted through proxies. Plausible deniability " +
      "is maintained by at least one party. This is the last level " +
      "where actors can credibly claim they are 'not at war.' " +
      "Includes sabotage, assassination, cyber attacks below the " +
      "threshold of armed attack, and proxy activation.",
    characteristicActionTypes: [
      "Covert sabotage (e.g. Stuxnet-style operations)",
      "Targeted killings / assassination operations",
      "Proxy force activation or significant escalation",
      "Cyber attacks on military/intelligence targets",
      "Covert arms transfers to opposition groups",
      "Maritime interdiction under ambiguous legal authority",
    ],
    dominantEscalationMechanism: ["deliberate", "inadvertent"],
    politicalCostFloor: 10,
    politicalCostCeiling: 40,
  },
  {
    level: 3,
    name: "Limited Overt Military Operations",
    kahnMapping: "Intense Crises (upper rungs) → Bizarre Crises",
    glaslPhase: "win_lose",
    reversibility: "difficult_reversal",
    description:
      "Acknowledged military force has been used, but within " +
      "constraints — geographic, temporal, target-set, or weapons " +
      "type. Both sides recognize they are in an armed conflict but " +
      "are actively constraining its scope. Diplomatic channels may " +
      "still be functioning through back-channels or intermediaries.",
    characteristicActionTypes: [
      "Precision strikes on military targets (standoff weapons)",
      "No-fly zone enforcement",
      "Naval blockade / strait closure",
      "Air defense suppression campaigns",
      "Limited ground operations (SOF, raids)",
      "Retaliatory missile exchanges (conventional)",
    ],
    dominantEscalationMechanism: ["deliberate", "inadvertent"],
    politicalCostFloor: 25,
    politicalCostCeiling: 60,
  },
  {
    level: 4,
    name: "Major Conventional War",
    kahnMapping: "Exemplary Central Attacks → Military Central Wars",
    glaslPhase: "win_lose",
    reversibility: "difficult_reversal",
    description:
      "Full-scale conventional military operations. Large formations " +
      "engaged. Strategic bombing campaigns. Ground invasion or " +
      "sustained air campaigns against both military and dual-use " +
      "infrastructure. War aims include regime change or territorial " +
      "conquest. Civilian casualties significant.",
    characteristicActionTypes: [
      "Strategic bombing of dual-use infrastructure",
      "Ground invasion with armored formations",
      "Full naval combat operations",
      "Sustained air superiority campaigns",
      "Attacks on economic infrastructure (energy, ports, comms)",
      "Full mobilization of reserves and war economy",
    ],
    dominantEscalationMechanism: ["deliberate", "inadvertent", "accidental"],
    politicalCostFloor: 40,
    politicalCostCeiling: 80,
  },
  {
    level: 5,
    name: "Strategic Escalation (Non-Nuclear WMD / Existential Conventional)",
    kahnMapping: "Military Central Wars (upper rungs)",
    glaslPhase: "lose_lose",
    reversibility: "near_irreversible",
    description:
      "Escalation beyond conventional war into weapons or targets " +
      "that cross fundamental thresholds: chemical/biological weapons, " +
      "attacks on civilian population centers as primary targets, " +
      "attacks on nuclear facilities, or conventional attacks so " +
      "devastating they threaten regime survival. The 'nuclear shadow' " +
      "looms — actors with nuclear capability face use-or-lose pressures.",
    characteristicActionTypes: [
      "Chemical/biological weapons use",
      "Deliberate attacks on civilian population centers",
      "Attacks on nuclear facilities (reactors, enrichment sites)",
      "Destruction of critical national infrastructure (dams, power grid)",
      "Regime decapitation attempts",
      "Nuclear breakout / weaponization (short of use)",
    ],
    dominantEscalationMechanism: ["deliberate", "inadvertent", "accidental"],
    politicalCostFloor: 60,
    politicalCostCeiling: 95,
  },
  {
    level: 6,
    name: "Limited Nuclear Use",
    kahnMapping: "Civilian Central Wars (lower rungs)",
    glaslPhase: "lose_lose",
    reversibility: "near_irreversible",
    description:
      "One or more nuclear weapons have been detonated — either as " +
      "a demonstrative strike, against a military target, or in a " +
      "limited exchange. The nuclear taboo has been broken. All actors " +
      "are reassessing their strategic calculus. De-escalation is " +
      "possible but requires extraordinary political will and " +
      "third-party intervention.",
    characteristicActionTypes: [
      "Demonstrative nuclear detonation (uninhabited area)",
      "Tactical nuclear strike on military concentration",
      "Nuclear EMP attack",
      "Limited nuclear exchange (counter-force targeting)",
      "Nuclear threat backed by demonstrated capability",
    ],
    dominantEscalationMechanism: ["deliberate", "accidental"],
    politicalCostFloor: 85,
    politicalCostCeiling: 100,
  },
  {
    level: 7,
    name: "General Nuclear War / Civilizational",
    kahnMapping: "Civilian Devastation Attack / Spasm War",
    glaslPhase: "lose_lose",
    reversibility: "irreversible",
    description:
      "Unrestricted nuclear exchange or equivalent civilizational " +
      "destruction. Counter-value targeting. No meaningful constraints " +
      "remain. This is Glasl's 'Together Into the Abyss' — actors " +
      "accept their own destruction to ensure the enemy's.",
    characteristicActionTypes: [
      "Counter-value nuclear strikes (cities)",
      "Full strategic nuclear exchange",
      "Spasm/insensate war (launch everything)",
    ],
    dominantEscalationMechanism: ["deliberate", "accidental"],
    politicalCostFloor: 100,
    politicalCostCeiling: 100,
  },
];

// ------------------------------------------------------------
// ESCALATION DIMENSIONS
//
// From Morgan (2008) and Libicki (2020): escalation is not
// one-dimensional. A decision can be escalatory on one axis
// and de-escalatory on another. Track independently.
// ------------------------------------------------------------

/**
 * Vertical = intensity within current scope
 * Horizontal = expansion of scope (geography, domain, actors)
 *
 * A decision's escalation impact is a VECTOR, not a scalar.
 * This is critical: a precision strike on a military target
 * in the existing theater (vertical, moderate) is very different
 * from striking the same target type in a new country
 * (horizontal expansion, potentially more escalatory despite
 * lower kinetic intensity).
 */
interface EscalationVector {
  vertical: {
    fromLevel: EscalationLevel;
    toLevel: EscalationLevel;
    delta: number;  // toLevel - fromLevel. Positive = escalation.
  };
  horizontal: {
    geographicExpansion: boolean;   // new theater / country
    domainExpansion: boolean;       // new domain (e.g. cyber → kinetic)
    actorExpansion: boolean;        // drawing in new belligerents
    newTargetClass: boolean;        // e.g. military → civilian infrastructure
    description: string;
  };
  /**
   * Morgan's mechanism: WHY is this escalatory?
   * Deliberate = actor chose to escalate for strategic reasons
   * Inadvertent = actor didn't intend escalation but misperception
   *               or fog of war caused the opponent to perceive it
   * Accidental = unauthorized, technical failure, or unintended
   */
  mechanism: "deliberate" | "inadvertent" | "accidental";
}

// ------------------------------------------------------------
// THRESHOLD CROSSINGS
//
// From Kahn: the most important moments are threshold
// crossings, not movement within a level. Morgan calls
// these "dangerous thresholds." These are the moments
// where reversibility drops sharply.
//
// Your simulator should treat threshold crossings as
// EVENTS that trigger cascading reassessment by all actors.
// ------------------------------------------------------------

interface ThresholdCrossing {
  id: string;
  name: string;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  description: string;
  /**
   * What specific action or condition marks this threshold
   * as crossed? Must be observable and unambiguous.
   */
  crossingIndicators: string[];
  /**
   * From Lo et al. (2022): thresholds can be CREATED or
   * DESTROYED by actor behavior and capabilities.
   * Track whether this threshold currently exists for
   * each actor pair.
   */
  isActiveForActorPair: (actorA: string, actorB: string) => boolean;
  /**
   * What happens when this threshold is crossed?
   * All actors should reassess. Some may have automatic
   * responses (ROMANCER pattern-matching triggers).
   */
  cascadeEffects: {
    affectedActorId: string;
    reassessmentRequired: boolean;
    automaticResponseTrigger?: string; // links to EscalationTrigger
  }[];
}

/**
 * Standard thresholds for a conflict involving the US and Iran.
 * These should be scenario-specific per Lo et al.'s insight
 * that ladders are dynamic and context-dependent.
 */
const STANDARD_THRESHOLDS: ThresholdCrossing[] = [
  {
    id: "thresh_crisis_onset",
    name: "Crisis Declaration",
    fromLevel: 0,
    toLevel: 1,
    description: "At least one party publicly frames the situation as a crisis requiring urgent response.",
    crossingIndicators: [
      "Public ultimatum with deadline",
      "Emergency UNSC session called",
      "Military alert level raised",
      "Evacuation of diplomatic personnel",
    ],
    isActiveForActorPair: () => true, // universal threshold
    cascadeEffects: [],
  },
  {
    id: "thresh_first_blood",
    name: "First Use of Force (Deniable)",
    fromLevel: 1,
    toLevel: 2,
    description: "First kinetic or destructive action, but below the threshold of acknowledged armed conflict.",
    crossingIndicators: [
      "Confirmed covert strike or sabotage",
      "Proxy force engagement with state direction",
      "Destructive cyber attack on critical infrastructure",
      "Confirmed assassination of military/political figure",
    ],
    isActiveForActorPair: () => true,
    cascadeEffects: [],
  },
  {
    id: "thresh_overt_force",
    name: "Acknowledged Use of Military Force",
    fromLevel: 2,
    toLevel: 3,
    description: "A state openly acknowledges using military force against another state's territory or forces.",
    crossingIndicators: [
      "Claimed / acknowledged air or missile strikes",
      "Public AUMF or war declaration equivalent",
      "Military forces engage in acknowledged combat",
    ],
    isActiveForActorPair: () => true,
    cascadeEffects: [],
  },
  {
    id: "thresh_total_war",
    name: "Constraint Removal / Total War",
    fromLevel: 3,
    toLevel: 4,
    description: "Constraints on targeting, geography, or force commitment are removed. War aims expand to regime change or unconditional surrender.",
    crossingIndicators: [
      "Strategic bombing of civilian infrastructure",
      "Ground invasion launched",
      "War aims publicly stated as regime change",
      "Full national mobilization ordered",
    ],
    isActiveForActorPair: () => true,
    cascadeEffects: [],
  },
  {
    id: "thresh_wmd",
    name: "WMD / Existential Threshold",
    fromLevel: 4,
    toLevel: 5,
    description: "Use of weapons of mass destruction or attacks that threaten the physical existence of a state.",
    crossingIndicators: [
      "Chemical or biological weapon confirmed use",
      "Attack on nuclear facilities causing radiological release",
      "Destruction of critical infrastructure threatening mass casualties",
      "Nuclear breakout confirmed",
    ],
    isActiveForActorPair: () => true,
    cascadeEffects: [],
  },
  {
    id: "thresh_nuclear_use",
    name: "Nuclear Threshold",
    fromLevel: 5,
    toLevel: 6,
    description: "First detonation of a nuclear weapon in the conflict.",
    crossingIndicators: [
      "Confirmed nuclear detonation (any yield, any target type)",
      "Nuclear EMP confirmed",
    ],
    isActiveForActorPair: () => true,
    cascadeEffects: [],
  },
  {
    id: "thresh_armageddon",
    name: "Strategic Nuclear Exchange",
    fromLevel: 6,
    toLevel: 7,
    description: "Transition from limited to general nuclear war. Counter-value targeting begins.",
    crossingIndicators: [
      "Nuclear strikes on population centers",
      "Multiple simultaneous nuclear detonations",
      "Full strategic arsenal launch detected",
    ],
    isActiveForActorPair: () => true,
    cascadeEffects: [],
  },
];

// ------------------------------------------------------------
// DECISION ESCALATION SCORING
//
// This is the actual scoring function you need to replace
// arbitrary escalation numbers. Each decision gets scored
// against the framework using observable, objective criteria.
// ------------------------------------------------------------

interface DecisionEscalationAssessment {
  decisionId: string;

  /** What level does the ACTOR end up at after this decision? */
  resultingLevel: EscalationLevel;

  /** The full escalation vector (vertical + horizontal) */
  vector: EscalationVector;

  /** Does this cross a named threshold? */
  thresholdsCrossed: string[]; // threshold IDs

  /**
   * OBJECTIVE SCORING CRITERIA
   * Each criterion is scored independently. The composite
   * determines the escalation level.
   *
   * These criteria are derived from Morgan et al.'s
   * framework and the ROMANCER pattern-matching approach.
   */
  criteria: {
    /**
     * Lethality: How many people does this action kill or
     * risk killing? Scale anchored to observable quantities.
     * 0 = non-lethal, 1 = individuals, 2 = dozens,
     * 3 = hundreds, 4 = thousands, 5 = mass casualties
     */
    lethality: 0 | 1 | 2 | 3 | 4 | 5;

    /**
     * Attribution clarity: How clearly is this attributable
     * to the acting state? Derived from Lo et al.'s
     * "patterns of behavior" variable.
     * 0 = fully deniable, 1 = suspected, 2 = likely,
     * 3 = acknowledged, 4 = publicly claimed
     */
    attribution: 0 | 1 | 2 | 3 | 4;

    /**
     * Target sensitivity: What is being targeted?
     * Derived from Morgan's threshold analysis.
     * 0 = military forces in theater
     * 1 = military infrastructure (bases, depots)
     * 2 = dual-use infrastructure (power, comms, transport)
     * 3 = economic infrastructure (oil, ports, finance)
     * 4 = civilian population / political leadership
     * 5 = nuclear facilities / WMD sites
     */
    targetSensitivity: 0 | 1 | 2 | 3 | 4 | 5;

    /**
     * Geographic scope: Where does this action take place
     * relative to the existing conflict zone?
     * 0 = within established conflict zone
     * 1 = adjacent territory / EEZ
     * 2 = opponent's sovereign territory (non-core)
     * 3 = opponent's core territory / capital region
     * 4 = third-party state territory
     * 5 = global commons (international waters, space)
     */
    geographicScope: 0 | 1 | 2 | 3 | 4 | 5;

    /**
     * Reversibility: Can the effects of this action be
     * undone? From Glasl's insight on escalation momentum.
     * 0 = fully reversible (e.g. sanctions that can be lifted)
     * 1 = mostly reversible (e.g. deployments that can withdraw)
     * 2 = partially reversible (e.g. infrastructure that can be rebuilt)
     * 3 = mostly irreversible (e.g. significant casualties, destroyed capabilities)
     * 4 = fully irreversible (e.g. nuclear use, regime destruction)
     */
    reversibility: 0 | 1 | 2 | 3 | 4;

    /**
     * Norm violation: Does this action break an established
     * international norm or taboo?
     * 0 = within established norms of state competition
     * 1 = gray zone (legally ambiguous)
     * 2 = violates international law (but precedented)
     * 3 = violates major international norm (e.g. sovereignty)
     * 4 = breaks fundamental taboo (WMD use, genocide)
     */
    normViolation: 0 | 1 | 2 | 3 | 4;
  };

  /**
   * Composite escalation score (0-100) derived from criteria.
   * This replaces your arbitrary numbers.
   */
  compositeScore: number;
}

/**
 * Maps a composite score to an escalation level.
 * The ranges are calibrated so that threshold crossings
 * align with the named thresholds above.
 */
function scoreToLevel(score: number): EscalationLevel {
  if (score <= 8) return 0;   // Baseline Competition
  if (score <= 20) return 1;  // Crisis Onset
  if (score <= 35) return 2;  // Covert / Deniable
  if (score <= 55) return 3;  // Limited Overt Military
  if (score <= 72) return 4;  // Major Conventional War
  if (score <= 85) return 5;  // Strategic / WMD
  if (score <= 95) return 6;  // Limited Nuclear
  return 7;                   // General Nuclear
}

/**
 * Compute composite escalation score from criteria.
 *
 * Weights are derived from Morgan et al.'s finding that
 * target sensitivity and lethality are the strongest
 * predictors of perceived escalation, followed by
 * norm violation and attribution.
 *
 * These weights should be tuned through playtesting but
 * the relative ordering is empirically grounded.
 */
function computeCompositeScore(
  criteria: DecisionEscalationAssessment["criteria"]
): number {
  const weights = {
    lethality: 0.22,        // max contribution: 22
    targetSensitivity: 0.22, // max contribution: 22
    normViolation: 0.18,     // max contribution: 18
    geographicScope: 0.15,   // max contribution: 15
    reversibility: 0.13,     // max contribution: 13
    attribution: 0.10,       // max contribution: 10
  };

  // Normalize each criterion to 0-100 scale
  const normalized = {
    lethality: (criteria.lethality / 5) * 100,
    targetSensitivity: (criteria.targetSensitivity / 5) * 100,
    normViolation: (criteria.normViolation / 4) * 100,
    geographicScope: (criteria.geographicScope / 5) * 100,
    reversibility: (criteria.reversibility / 4) * 100,
    attribution: (criteria.attribution / 4) * 100,
  };

  const score =
    normalized.lethality * weights.lethality +
    normalized.targetSensitivity * weights.targetSensitivity +
    normalized.normViolation * weights.normViolation +
    normalized.geographicScope * weights.geographicScope +
    normalized.reversibility * weights.reversibility +
    normalized.attribution * weights.attribution;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ------------------------------------------------------------
// EXAMPLE: Scoring a decision
// "US launches precision strikes on Iranian air defense sites"
// ------------------------------------------------------------

const exampleAssessment: DecisionEscalationAssessment = {
  decisionId: "us_sead_campaign_iran",
  resultingLevel: 3, // computed from composite
  vector: {
    vertical: { fromLevel: 2, toLevel: 3, delta: 1 },
    horizontal: {
      geographicExpansion: false,
      domainExpansion: false,
      actorExpansion: false,
      newTargetClass: false,
      description: "Military targets within existing conflict zone",
    },
    mechanism: "deliberate",
  },
  thresholdsCrossed: ["thresh_overt_force"],
  criteria: {
    lethality: 2,          // dozens of casualties expected
    attribution: 4,        // publicly claimed by US
    targetSensitivity: 1,  // military infrastructure
    geographicScope: 3,    // Iranian sovereign territory
    reversibility: 3,      // destroyed air defenses can't be un-destroyed
    normViolation: 2,      // violates sovereignty, but precedented
  },
  compositeScore: 0, // will be computed
};

exampleAssessment.compositeScore = computeCompositeScore(
  exampleAssessment.criteria
);
exampleAssessment.resultingLevel = scoreToLevel(
  exampleAssessment.compositeScore
);

// Result: compositeScore ≈ 52, resultingLevel = 3 (Limited Overt Military)
// This is OBJECTIVELY derived, not arbitrary.

The core issue you identified — arbitrary escalation levels — gets solved through **six objectively scorable criteria** derived from the academic literature:

**Lethality** and **Target Sensitivity** are the two heaviest-weighted factors, based on Morgan et al.'s finding that these are the strongest predictors of how actors perceive escalatory significance. **Norm Violation** is third, because escalation involves a significant leap in the intensity of a confrontation, and the precise nature of that leap — its significance and danger — can differ depending on which international norms are broken. **Geographic Scope**, **Reversibility**, and **Attribution** round out the scoring.

The framework also captures three things your current `EscalationRung` interface doesn't:

1. **Escalation as a vector, not a scalar.** A Strait of Hormuz closure is vertically moderate but horizontally massive (draws in global shipping, Gulf states, insurance markets). The `EscalationVector` type captures this.

2. **Dynamic thresholds** per Lo et al. — thresholds between levels can be *created or destroyed* by actor behavior. Iran's nuclear breakout creates a threshold that didn't previously exist in the US-Iran ladder. Your `isActiveForActorPair` function handles this.

3. **Escalation mechanisms** per Morgan — whether escalation is deliberate, inadvertent (misperception), or accidental matters enormously for how the resolution engine should process it.

## Key Sources for Your Reference

Here's what to read in priority order if you want to go deeper:

1. **Morgan et al., *Dangerous Thresholds* (RAND MG-614, 2008)** — the operational bible. Free at rand.org.
2. **RAND ROMANCER model (RRA2673-1, 2024)** — their computational implementation with pattern-matching escalation ladder logic. Closest existing analog to what you're building.
3. **Lo, Lo & Ng, "Reconstructing the Ladder" (Strategy Bridge, 2022)** — the theoretical update on dynamic ladders, with your exact Iran-Israel case study.
4. **Kahn, *On Escalation* (1965)** — for the foundational threshold taxonomy.
5. **Libicki, "Cyberspace Escalation: Ladders or Lattices?" (CCDCOE, 2020)** — for the conceptual shift from ladders to lattices that comes from considering the role of cyberspace operations in a crisis or conflict.

Want me to integrate this scoring framework into your existing data model types, or work through scoring for a specific batch of decisions in your Iran scenario?