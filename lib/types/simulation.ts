// ============================================================
// GEOSIM DATA MODELS v2
// Key changes from v1:
//   - Escalation ladder replaces flat scores for conflict posture
//   - Fog of war / intelligence picture per actor
//   - Oil/energy infrastructure as explicit strategic assets
//   - Score type now has semantic context for what levels mean
// ============================================================

// ------------------------------------------------------------
// CORE TYPES
// ------------------------------------------------------------

export type Dimension = "military" | "economic" | "political" | "diplomatic" | "intelligence" | "cultural";
export type ActorType = "nation_state" | "non_state_actor" | "organization" | "alliance";
export type ObjectivePriority = "existential" | "critical" | "important" | "opportunistic";

/**
 * 0-100 scale WITH semantic anchors.
 * Every use of Score should define what key thresholds mean
 * in context. See PoliticalSupport and DomesticSupport for examples.
 */
export type Score = number;

/**
 * Confidence in a piece of intelligence.
 * Maps roughly to US intelligence community standards.
 */
export type Confidence = "confirmed" | "high" | "moderate" | "low" | "unverified" | "disputed";

/**
 * Verification status for seed data events and impacts.
 * Distinguishes verified research from inferred or AI-generated data.
 */
export type VerificationStatus = 'verified' | 'researched' | 'inferred'

export type AssetCategory =
  | 'naval'
  | 'air'
  | 'ground'
  | 'missile'
  | 'nuclear'
  | 'infrastructure'
  | 'cyber'
  | 'air_defense'

export type AssetStatus =
  | 'available'     // ready, in home position
  | 'mobilizing'    // orders issued, preparing to move
  | 'transiting'    // en route to theater
  | 'staged'        // in theater, not yet engaged
  | 'engaged'       // actively executing an operation
  | 'degraded'      // damaged, reduced capability
  | 'destroyed'     // eliminated
  | 'withdrawn'     // pulled back from theater

export interface AssetCapability {
  name: string
  current: number
  max: number
  unit: string
}

export interface PositionedAsset {
  id: string
  scenarioId: string
  actorId: string
  name: string
  shortName: string
  category: AssetCategory
  assetType: string
  description: string
  position: { lat: number; lng: number }
  zone: string
  status: AssetStatus
  capabilities: AssetCapability[]
  strikeRangeNm?: number
  threatRangeNm?: number
  provenance: VerificationStatus
  effectiveFrom: string
  discoveredAt: string
  researchedAt?: string
  sourceUrl?: string
  sourceDate?: string
  notes: string
}

export interface AssetStateDelta {
  assetId: string
  // Only the 4 fields the state machine tracks are audited here.
  // Other field changes (notes, provenance, rangeNm) are made directly to the registry.
  field: 'status' | 'capabilities' | 'position' | 'zone'
  previousValue: unknown
  newValue: unknown
  cause: string
  turnDate: string
}

export interface CityImpact {
  category: 'displacement' | 'infrastructure' | 'casualties' | 'economic' | 'political'
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic'
  description: string
  estimatedValue?: number
  unit?: string
  sourceUrl?: string
  sourceDate?: string
}

export interface City {
  id: string
  scenarioId: string
  name: string
  country: string
  population: number
  economicRole: string
  position: { lat: number; lng: number }
  zone: string
  infrastructureNodes: string[]
  warImpacts: CityImpact[]
  provenance: VerificationStatus
  sourceUrl?: string
  sourceDate?: string
  researchedAt?: string
}

export interface ActorStatusSnapshot {
  actorId: string
  turnDate: string
  politicalStability: number
  economicHealth: number
  militaryReadiness: number
  publicSupport: number
  internationalIsolation: number
  sourceUrl?: string
  notes?: string
}

export type CityStateDelta =
  | {
      cityId: string
      field: 'war_impacts'
      addedImpact: CityImpact
      cause: string
      turnDate: string
    }
  | {
      cityId: string
      field: 'population' | 'infrastructure_nodes'
      previousValue: unknown
      newValue: unknown
      cause: string
      turnDate: string
    }

export type RelationshipType =
  | "ally"
  | "adversary"
  | "proxy"
  | "patron"
  | "economic_partner"
  | "rival"
  | "neutral"
  | "occupied";

// ------------------------------------------------------------
// ESCALATION LADDER
// Core abstraction replacing flat military scores.
// Actors sit on a rung and move up/down based on strategic logic.
// ------------------------------------------------------------

export interface EscalationLadder {
  currentRung: number;              // index into the rungs array
  rungs: EscalationRung[];
  // what would cause this actor to escalate to the next rung
  escalationTriggers: EscalationTrigger[];
  // what would cause de-escalation
  deescalationConditions: string[];
}

export interface EscalationRung {
  level: number;                    // 0 = peace, higher = more escalated
  name: string;                     // e.g. "Covert Operations", "Limited Strikes", "Nuclear"
  description: string;              // what actions characterize this rung
  exampleActions: string[];         // concrete things an actor does at this level
  // what an actor gains/risks by being at this rung
  strategicLogic: string;           // why would they be here vs. going up/down
  politicalCost: Score;             // domestic and international cost of being here
  reversibility: "easy" | "moderate" | "difficult" | "irreversible";
}

export interface EscalationTrigger {
  fromRung: number;
  toRung: number;
  condition: string;                // e.g. "conventional air defense fully depleted"
  likelihood: Score;                // how likely is this trigger to activate
  // can they skip rungs? (e.g. Pearl Harbor-style surprise escalation)
  isEscalationSkip: boolean;
  skipRationale?: string;           // e.g. "preemptive strike to establish dominance early"
}

// ------------------------------------------------------------
// ACTOR
// ------------------------------------------------------------

export interface Actor {
  id: string;
  name: string;
  type: ActorType;
  description: string;

  keyFigures: KeyFigure[];
  state: ActorState;
  objectives: Objective[];
  capabilities: Capabilities;
  constraints: Constraint[];
  decisionFactors: DecisionFactor[];

  // the escalation posture for this actor
  escalation: EscalationLadder;

  // what this actor BELIEVES about other actors (fog of war)
  intelligencePicture: IntelligencePicture[];

  // motivation seed: divergent win/lose conditions and stakes
  winCondition?: string;
  loseCondition?: string;
  stakesLevel?: ObjectivePriority;
}

export interface KeyFigure {
  id: string;
  name: string;
  role: string;
  status: "active" | "killed" | "resigned" | "captured" | "unknown";
  disposition: string;
  influence: Score;                 // 0 = figurehead, 100 = sole decision maker
  description: string;
  // how their removal or addition changes the actor's behavior
  successionImpact?: string;        // e.g. "son is more hardline, likely to escalate"
}

// ------------------------------------------------------------
// FOG OF WAR: what each actor believes about others
// ------------------------------------------------------------

export interface IntelligencePicture {
  aboutActorId: string;             // who they're assessing

  // believed state — may differ from actual state
  believedMilitaryReadiness: Score;
  believedMilitaryReadinessConfidence: Confidence;

  believedNuclearStatus: string;    // what they think the nuclear situation is
  believedNuclearConfidence: Confidence;

  believedPoliticalStability: Score;
  believedPoliticalStabilityConfidence: Confidence;

  believedEscalationRung: number;   // where they think the adversary is
  believedEscalationConfidence: Confidence;

  // specific intelligence gaps — things they know they don't know
  knownUnknowns: string[];          // e.g. "location of dispersed enriched uranium"

  // things they're wrong about but don't know it
  // (only visible to simulation engine / omniscient view, not to the actor)
  unknownUnknowns: string[];        // e.g. "IRGC command structure more resilient than assessed"

  // intelligence sources on this actor
  primaryIntSources: string[];      // e.g. "signals intelligence", "satellite imagery", "HUMINT"

  // who is feeding them intel about this actor
  intelProviders: string[];         // actor ids, e.g. Russia feeding Iran intel on US movements
}

// ------------------------------------------------------------
// ACTOR STATE
// ------------------------------------------------------------

export interface ActorState {
  military: MilitaryState;
  economic: EconomicState;
  political: PoliticalState;
  diplomatic: DiplomaticState;
  intelligence: IntelligenceState;
}

export interface MilitaryState {
  overallReadiness: Score;          // 0=broken, 30=degraded, 60=capable, 90=peak
  assets: MilitaryAsset[];
  activeOperations: ActiveOperation[];
  vulnerabilities: string[];
  nuclear: NuclearPosture;
}

export interface ActiveOperation {
  name: string;
  type: string;                     // e.g. "air_campaign", "ground_invasion", "naval_blockade"
  target: string;                   // actor id or asset name
  status: "ongoing" | "stalled" | "succeeding" | "failing";
  burnRate: string;                 // how fast it's consuming resources
  description: string;
}

export interface MilitaryAsset {
  category: string;
  name: string;
  estimatedQuantity: number | "unknown";
  quality: Score;
  replenishmentRate: "fast" | "slow" | "none" | "unknown";
  unitCost?: number;
  costRatio?: string;               // e.g. "1 Patriot ($3M) per 1 Shahed ($20K) = 150:1 cost disadvantage"
  depletionTrend: "stable" | "depleting" | "critical" | "replenishing";
  notes: string;
  // where these assets came from / depend on
  supplyChain?: string;             // e.g. "domestic production", "US resupply", "Chinese components"
}

export interface NuclearPosture {
  capability: "none" | "threshold" | "unconfirmed" | "confirmed";
  estimatedWarheads?: number;
  deliveryMethods?: string[];
  // replaces flat "willingness" score with escalation logic
  useDoctrineDescription: string;   // e.g. "last resort if state survival threatened"
  escalationRungForUse: number;     // which rung on their ladder corresponds to nuclear use
  constraints: string[];            // e.g. "religious prohibition", "international pariah status"
}

export interface EconomicState {
  overallHealth: Score;             // 0=collapse, 30=crisis, 60=stable, 90=strong
  gdpEstimate?: number;
  keyVulnerabilities: string[];
  keyLeverages: string[];
  sanctionsExposure: Score;
  oilDependency: {
    asExporter: Score;
    asImporter: Score;
  };
  warCostTolerance: Score;          // 0=bankrupt tomorrow, 100=can sustain for years

  // NEW: energy infrastructure as explicit strategic target
  energyInfrastructure: EnergyInfrastructure;
}

export interface EnergyInfrastructure {
  oilProductionCapacity: string;    // e.g. "9.5M barrels/day"
  currentOutput: string;            // e.g. "4M barrels/day (degraded by strikes)"
  criticalFacilities: StrategicFacility[];
  exportRoutes: ExportRoute[];
  damageLevel: Score;               // 0=intact, 100=destroyed
}

export interface StrategicFacility {
  name: string;                     // e.g. "Kharg Island terminal", "Ras Tanura"
  owner: string;                    // actor id
  status: "operational" | "damaged" | "destroyed" | "contested";
  globalSignificance: string;       // e.g. "handles 90% of Iran oil exports"
  // who has struck it and when
  strikeHistory: string[];
}

export interface ExportRoute {
  name: string;                     // e.g. "Strait of Hormuz"
  status: "open" | "contested" | "blocked" | "restricted";
  controlledBy: string;             // actor id
  globalImpact: string;             // e.g. "20% of world oil transits here"
  blockadeMethod?: string;          // e.g. "drone threat to commercial shipping"
  breakingCost?: string;            // e.g. "requires ground occupation of Iranian coast"
  // NEW: mine warfare — critical for Strait reopening timeline
  mineThreat: {
    level: "none" | "low" | "moderate" | "high" | "extreme";
    estimatedMinesPlaced: number | "unknown";
    clearingTimeline: string;       // e.g. "3-6 months minimum even after military threat removed"
    mineTypes?: string[];           // e.g. ["contact", "influence", "rising"]
    clearingAssetsAvailable: string; // e.g. "US MCM fleet limited; allies refused to contribute"
  };
  // NEW: selective passage — Iran allowing some ships through
  selectivePassage?: {
    allowedFlags: string[];         // e.g. ["Chinese", "Turkish", "Indian"]
    conditions: string;             // e.g. "cargo traded in yuan"
    volumeGettingThrough: string;   // e.g. "8 non-Iranian vessels detected Monday"
  };
}

/**
 * Political support with semantic anchors so the AI
 * knows what different score ranges actually mean
 */
export interface PoliticalState {
  regimeStability: Score;           // 0=collapse, 30=shaky, 60=stable, 90=unshakeable
  leadershipCohesion: Score;
  governmentType: string;
  warPowersDescription: string;

  /**
   * Policy is NOT a simple function of public opinion.
   * Multiple influence channels compete, and their relative weight
   * determines whether policy reflects popular will or overrides it.
   * The simulation must reason about WHO has influence, not just
   * what "the public" wants.
   */
  influenceChannels: InfluenceChannel[];

  // the gap between popular will and actual policy — historically
  // this can persist for years (Vietnam, Iraq) but eventually has costs
  policyDisconnect: PolicyDisconnect;

  pressurePoints: string[];
}

export interface InfluenceChannel {
  name: string;                     // e.g. "general_public", "defense_establishment", "israel_lobby", "donor_class", "military_industrial"
  description: string;
  // how much does this channel actually affect policy decisions?
  policyInfluence: Score;           // 0=ignored, 100=decisive
  // what does this channel currently want?
  currentPosition: string;          // e.g. "AIPAC: full support for continued military action"
  supportForCurrentPolicy: Score;
  // what tools does this channel have to exert pressure?
  leverageMechanisms: string[];     // e.g. "campaign funding", "primary challenges", "media narratives", "protest/strikes"
  // can this channel be overridden? at what cost?
  overrideCost: string;             // e.g. "defying AIPAC risks primary challenges and funding loss"
  // historical precedent for this channel's influence
  precedent?: string;               // e.g. "Vietnam: public opposition took 7+ years to force withdrawal despite low support"
}

export interface PolicyDisconnect {
  // how far apart are popular will and actual policy?
  gapSeverity: Score;               // 0=aligned, 100=completely disconnected
  // how long can this gap persist given institutional dynamics?
  estimatedToleranceDuration: string; // e.g. "12-18 months before midterm pressure forces shift"
  // what breaks the dam? what makes the gap unsustainable?
  breakingPoints: string[];         // e.g. "US military casualties", "oil at $200/barrel", "draft discussion"
  // is there actually a viable alternative policy from the opposition?
  oppositionAlternative: string;    // e.g. "Democrats equally hawkish on Israel — no real alternative"
  // when both parties agree, public has no electoral mechanism for change
  bipartisanConsensus: boolean;
  bipartisanDescription?: string;   // e.g. "both parties receive AIPAC funding, both support Israel"
}

export interface SupportThreshold {
  level: Score;
  consequence: string;
}

export interface DiplomaticState {
  internationalStanding: Score;
  activeNegotiations: Negotiation[];
  allianceStrength: Score;
  isolationRisk: Score;
}

export interface Negotiation {
  name: string;                     // e.g. "Iran nuclear deal"
  counterparties: string[];         // actor ids
  status: "active" | "stalled" | "collapsed" | "agreed";
  // what each side wants and has offered
  demands: string[];
  concessions: string[];
  // what's blocking progress
  blockers: string[];               // e.g. "US demanded ballistic missile program — nonstarter"
  leverage: string;                 // who has the upper hand and why
}

export interface IntelligenceState {
  signalCapability: Score;
  humanCapability: Score;
  cyberCapability: Score;
  blindSpots: string[];
  exposureLevel: Score;
  // who is sharing intel with this actor
  intelSharingPartners: {
    actorId: string;
    description: string;            // e.g. "Russia providing US movement data, similar to US support in Ukraine"
  }[];
}

// ------------------------------------------------------------
// OBJECTIVES, CAPABILITIES, CONSTRAINTS, DECISION FACTORS
// (mostly unchanged but with escalation-aware additions)
// ------------------------------------------------------------

export interface Objective {
  id: string;
  description: string;
  priority: ObjectivePriority;
  dimension: Dimension;
  successCondition: string;
  failureCondition: string;
  currentProgress: Score;
  tensions: string[];
  // NEW: what escalation level is needed to achieve this?
  requiredEscalationLevel?: number; // e.g. regime change may require higher escalation than deterrence
  // NEW: is this the kind of objective worth escalating for?
  warrantsFurtherEscalation: boolean;
}

export interface Capabilities {
  strengths: CapabilityEntry[];
  limitations: CapabilityEntry[];
}

export interface CapabilityEntry {
  dimension: Dimension;
  description: string;
  significance: Score;
}

export interface Constraint {
  dimension: Dimension;
  description: string;
  severity: "hard" | "soft";
  releaseCondition?: string;
  overriddenAtEscalationRung?: number;

  /**
   * Constraints can evolve over time. What was once a hard constraint
   * can become irrelevant if the conditions that created it change.
   *
   * Example: Iran's nuclear constraint chain:
   *   1. Religious prohibition (Ayatollah's fatwa) — REMOVED by his death
   *   2. Deterrence (fear of attack) — REMOVED by attack already happening
   *   3. International isolation risk — WEAKENED by existing sanctions/war
   *   Result: all three constraints on nuclear breakout degraded simultaneously
   *
   * The simulation must track how events erode or strengthen constraints,
   * because the removal of constraints is often what enables escalation.
   */
  status: "active" | "weakened" | "removed";
  statusRationale?: string;         // why the constraint status changed
  removedByEventId?: string;        // which event removed/weakened this constraint
  // if removed, what new behavior does this enable?
  enabledActions?: string[];        // e.g. "nuclear breakout now rational from Iran's perspective"
}

/**
 * Tracks a causal chain of constraint removal leading to escalation risk.
 * Useful for the AI to reason about multi-step consequences.
 *
 * Example chain:
 *   Israel kills Ayatollah →
 *     removes religious constraint on nukes →
 *       + attack already removed deterrence constraint →
 *         Iran has rational incentive for nuclear breakout →
 *           Israel faces nuclear-armed adversary →
 *             Israel may escalate to nuclear first strike
 */
export interface ConstraintCascade {
  id: string;
  description: string;              // human-readable summary of the chain
  steps: {
    eventOrCondition: string;       // what happened
    constraintAffected: string;     // which constraint changed
    actorAffected: string;          // whose constraint
    newBehaviorEnabled: string;     // what becomes possible
  }[];
  ultimateRisk: string;             // where does this chain lead if unchecked
  likelihoodOfFullCascade: Score;
  // is any actor aware of this cascade?
  perceivedBy: {
    actorId: string;
    awareness: Confidence;          // do they see this chain of logic?
  }[];
}

export interface DecisionFactor {
  name: string;
  description: string;
  impactOnDecisions: string;
  // NEW: how does this factor interact with escalation logic?
  escalationEffect?: string;        // e.g. "martyrdom culture means decapitation strikes may unify rather than destabilize"
}

// ------------------------------------------------------------
// RELATIONSHIPS
// ------------------------------------------------------------

export interface Relationship {
  actorA: string;
  actorB: string;
  type: RelationshipType;
  strength: Score;
  mutualInterests: string[];
  frictions: string[];
  volatility: Score;
  shiftTriggers: string[];
  description: string;
  // NEW: how does the current conflict affect this relationship?
  warImpact?: string;               // e.g. "US pulled air defense from Gulf states, relationship strained"
}

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------

export interface Event {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  initiatedBy: string;
  targetedActors: string[];
  dimension: Dimension;
  impacts: EventImpact[];
  triggeredBy?: string;
  enabledEvents?: string[];
  // NEW: did this event change anyone's escalation posture?
  escalationChanges?: {
    actorId: string;
    previousRung: number;
    newRung: number;
    rationale: string;
  }[];
  // NEW: did this event reveal or create intelligence gaps?
  intelConsequences?: {
    actorId: string;
    revealed?: string;              // e.g. "strike revealed THAAD positions"
    concealed?: string;             // e.g. "uranium dispersal locations now unknown"
  }[];
  verificationStatus?: VerificationStatus;
}

/**
 * A verified event for seeding the ground truth trunk.
 * Used by lib/scenarios/iran/events.ts
 */
export type SeedEvent = Event & {
  verificationStatus: VerificationStatus
}

export interface EventImpact {
  actorId: string;
  dimension: Dimension;
  field: string;
  previousValue?: string | number;
  newValue?: string | number;
  description: string;
  magnitude: "minor" | "moderate" | "major" | "critical";
  verificationStatus?: VerificationStatus;
  // NEW: does this impact cascade to third parties?
  thirdPartyEffects?: {
    actorId: string;
    description: string;            // e.g. "Dubai housing -30% from Gulf instability"
  }[];
}

// ------------------------------------------------------------
// SCENARIO
// ------------------------------------------------------------

// ------------------------------------------------------------
// SCENARIO PHASES
// A scenario may span multiple distinct phases/eras, each with
// different dynamics. E.g. the Iran conflict has:
//   Phase 1: Twelve-Day War (June 13-24, 2025)
//   Phase 2: Interwar period (July 2025 - Feb 2026)
//   Phase 3: Operation Epic Fury (Feb 28, 2026 - ongoing)
// The simulation branches from a specific phase.
// ------------------------------------------------------------

export interface ScenarioPhase {
  id: string;
  name: string;                     // e.g. "The Twelve-Day War"
  startDate: string;
  endDate: string | "ongoing";
  description: string;
  // what defines this phase — the dominant dynamics
  dominantDynamics: string[];       // e.g. ["air campaign", "nuclear strikes", "ceasefire diplomacy"]
  // what triggered the transition to this phase
  triggerEvent?: string;            // event id that started this phase
  // what ended this phase (if complete)
  endingEvent?: string;             // event id that ended this phase
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  backgroundContext: string;

  // phases of the conflict/competition
  phases: ScenarioPhase[];
  currentPhaseId: string;

  actors: Actor[];
  relationships: Relationship[];
  eventHistory: Event[];

  globalState: GlobalState;
}

export interface GlobalState {
  oilPricePerBarrel: number;
  oilPriceChange: string;           // e.g. "+95% since conflict began"
  globalStabilityIndex: Score;
  criticalAssets: GlobalAsset[];
  wildcards: string[];
  // NEW: global economic ripple effects
  globalEconomicEffects: {
    description: string;
    affectedRegions: string[];
    severity: Score;
  }[];
}

export interface GlobalAsset {
  name: string;
  controlledBy: string;
  contestedBy?: string[];
  globalImpact: string;
  currentStatus: string;
}

// ------------------------------------------------------------
// DECISION ENGINE
// Now integrated with escalation logic
// ------------------------------------------------------------

export interface Decision {
  id: string;
  actorId: string;
  title: string;
  description: string;
  dimension: Dimension;

  // where does this decision sit on the escalation ladder?
  escalationRung: number;           // what rung does taking this action put you on
  isEscalation: boolean;            // does this move you UP the ladder
  isDeescalation: boolean;          // does this move you DOWN

  prerequisites: string[];
  costs: DecisionCost[];
  projectedOutcomes: ProjectedOutcome[];
  advancesObjectives: string[];
  risksObjectives: string[];
  violatesConstraints: string[];

  // NEW: strategic framing — why would a rational actor choose this?
  strategicRationale: string;       // e.g. "attritional drone campaign exploits cost asymmetry"
  // NEW: what information does the actor need to make this decision well?
  intelRequirements: string[];      // e.g. "need to know air defense munition levels"
  // NEW: what does the actor THINK will happen vs what might actually happen
  actorAssessment: string;          // what the deciding actor believes the outcome will be

  // concurrency rules for TurnPlan building
  resourceWeight?: ResourceWeight;
  compatibleWith?: string[];        // decision ids/categories that can run concurrently
  incompatibleWith?: string[];      // decision ids/categories that cannot
  synergiesWith?: { decisionCategory: string; bonus: string }[];
}

export interface DecisionCost {
  dimension: Dimension;
  description: string;
  magnitude: "low" | "moderate" | "high" | "extreme";
}

export interface ProjectedOutcome {
  probability: Score;
  description: string;
  impacts: EventImpact[];
  cascadingEffects: string[];
  anticipatedResponses: {
    actorId: string;
    likelyResponse: string;
    probability: Score;
    // would their response escalate or de-escalate?
    escalationDirection: "up" | "down" | "lateral" | "none";
  }[];
  // NEW: what does this outcome look like from each actor's perspective?
  perceptionByActor: {
    actorId: string;
    interpretation: string;         // e.g. "Iran sees this as a win despite tactical losses"
  }[];
}

// ------------------------------------------------------------
// TURN PLAN — multi-action plan submitted per turn
// ------------------------------------------------------------

export type ResourceWeight = "light" | "moderate" | "heavy" | "total";

export interface TurnPlan {
  actorId: string;
  primaryAction: PlannedAction;
  concurrentActions: PlannedAction[];   // 0-3
}

export interface PlannedAction {
  decisionId: string;
  selectedProfile: string | null;       // named profile or null for default
  customParameters?: { parameterName: string; selectedOptionId: string }[];
  resourcePercent: number;              // % of available resources allocated
}

export interface TurnPlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  synergies: { actions: string[]; bonus: string }[];
  tensions: { actions: string[]; penalty: string }[];
  resourceUtilization: number;          // % of capacity used (should be 100)
}

// ------------------------------------------------------------
// SCENARIO FRAME — Stage 0 output (scenario framing)
// ------------------------------------------------------------

export interface ScenarioFrame {
  conflictName: string;
  coreQuestion: string;
  timeframeStart: string;
  timeframeCurrent: string;
  geographicScope: string;
  userAnalysis: string;
  suggestedActors: SuggestedActor[];
  relevanceCriteria: string;
  keyDynamics: string[];
  actorFramings: ActorFraming[];
}

export interface SuggestedActor {
  name: string;
  type: ActorType;
  whyRelevant: string;
  suggestedByUser: boolean;
  confirmed: boolean;
}

export interface ActorFraming {
  actorName: string;
  stakesLevel: ObjectivePriority;
  winCondition: string;
  loseCondition: string;
  strategicPosture: string;
}

// ------------------------------------------------------------
// AGENT CONTEXT — passed to actor agent and resolution engine
// ------------------------------------------------------------

/**
 * How many turns since this branch diverged from the ground truth trunk.
 * 0 = on trunk or no divergence computed yet.
 * Derived from branch.current_divergence, passed to each
 * /api/ai/actor-agent and /api/ai/resolution-engine call as a
 * top-level field in the request body.
 *
 * Controls web search behavior in agent prompts:
 *   0-3:  use web search to verify facts; defer to research over priors
 *   4-9:  blend research structure with strategic reasoning
 *   10+:  no web search; pure strategic reasoning
 */
export type BranchDivergence = number

/**
 * Context passed to actor agent API calls.
 * Fog-of-war filtered — the actor sees only what it believes, not true state.
 * branchDivergence is computed server-side at turn start from
 * branch.current_divergence and controls whether the agent uses web search.
 */
export interface ActorAgentContext {
  actor: Actor
  myIntelligencePicture: IntelligencePicture[]
  myRelationships: Relationship[]
  knownEvents: Event[]
  framing: ActorFraming
  ongoingOperations: ActiveOperation[]
  /** Turns since branch diverged from ground truth trunk. 0 = on trunk. */
  branchDivergence: BranchDivergence
}

export interface SimulationTurn {
  turnNumber: number;
  timestamp: string;
  scenarioSnapshot: Scenario;
  availableDecisions: {
    actorId: string;
    decisions: Decision[];
  }[];
  selectedDecisions: {
    actorId: string;
    decisionId: string;
    selectedBy: "user" | "ai";
  }[];
  resolvedEvents: Event[];
  turnAnalysis: string;
  // NEW: track escalation movement across the turn
  escalationSummary: {
    actorId: string;
    startRung: number;
    endRung: number;
    movement: "escalated" | "deescalated" | "held";
    rationale: string;
  }[];
}
