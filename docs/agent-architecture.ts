// ============================================================
// GEOSIM AGENT ARCHITECTURE & GAME LOOP
// ============================================================

// ------------------------------------------------------------
// GAME MODES
// ------------------------------------------------------------

type GameMode =
  | "observer"      // all AI, user watches and can intervene/rewind
  | "single_actor"  // user controls one actor, AI plays the rest
  | "free_roam"     // user can switch between any actor at any time
  ;

interface GameConfig {
  mode: GameMode;
  userControlledActors: string[];   // actor ids (empty for observer)
  turnTimeframe: string;            // what does one turn represent? "1 week", "1 month"
  maxTurns?: number;
  // simulation speed for observer mode
  autoAdvance: boolean;
  autoAdvanceDelay?: number;        // ms between turns in observer mode
  // can the user override AI decisions before they resolve?
  allowIntervention: boolean;
  // can the user rewind to a previous turn and branch?
  allowBranching: boolean;
}

// ------------------------------------------------------------
// STAGE 0: SCENARIO FRAMING
// The user defines WHAT we're simulating before anything else.
// Accepts freeform input, then asks clarifying questions.
// ------------------------------------------------------------

interface ScenarioFrame {
  // extracted from user's freeform description
  conflictName: string;             // e.g. "US-Israel-Iran Conflict 2025-2026"
  coreQuestion: string;             // e.g. "Can the US achieve regime change without a ground invasion?"
  timeframeStart: string;           // when does the scenario begin
  timeframeCurrent: string;         // the 'present moment' we're simulating from
  geographicScope: string;          // e.g. "Middle East, with global economic ripple effects"

  // the user's analytical framing — preserved throughout the pipeline
  userAnalysis: string;             // the raw freeform description

  // extracted actor candidates (confirmed by user before Stage 1 runs)
  suggestedActors: SuggestedActor[];

  // what makes an actor "relevant" to THIS scenario
  relevanceCriteria: string;        // e.g. "directly involved in military operations, providing
                                    //  material/intel support, economically affected by Strait
                                    //  closure, or positioned to exploit US overextension"

  // key dynamics the user wants the simulation to capture
  keyDynamics: string[];            // e.g. ["asymmetric cost attrition", "political constraints
                                    //  on US escalation", "nuclear breakout cascade",
                                    //  "oil as strategic weapon"]

  // win/loss conditions per actor (high level, refined in later stages)
  actorFramings: ActorFraming[];
}

interface SuggestedActor {
  name: string;
  type: "nation_state" | "non_state_actor" | "organization" | "alliance";
  whyRelevant: string;              // why this actor matters to the scenario
  suggestedByUser: boolean;         // did the user name them, or did the AI infer them?
  confirmed: boolean;               // has the user confirmed this actor should be included?
}

interface ActorFraming {
  actorName: string;
  stakesLevel: "existential" | "critical" | "important" | "opportunistic";
  winCondition: string;             // e.g. "Iran: survive as a state with nuclear capability"
  loseCondition: string;            // e.g. "Iran: regime collapse or complete disarmament"
  strategicPosture: string;         // e.g. "defensive — making the war too costly to continue"
}

// ------------------------------------------------------------
// STAGE 0 PROMPT
// ------------------------------------------------------------

const STAGE_0_SYSTEM = `
You are a geopolitical scenario designer. The user will describe a
conflict they want to simulate. Your job is to extract a structured
scenario frame and then ask clarifying questions to fill any gaps.

STEP 1: Parse the user's freeform description and extract:
- The core conflict and its central strategic question
- The timeframe (when it started, where we are now)
- All actors the user mentioned, and WHY they're relevant
- The key dynamics the user wants captured
- Each actor's stakes level and win/lose conditions
- What criteria make an actor "relevant" to this scenario

STEP 2: Identify GAPS in the user's description. Common gaps include:
- Actors the user didn't mention but who are clearly relevant
  (e.g. did they mention economic effects but not the actors
  most affected? did they mention proxy groups but not name them?)
- Timeframe ambiguity (when exactly does the simulation start?)
- Missing win/lose conditions for some actors
- Key dynamics that seem important but weren't explicitly stated
- Secondary theaters or fronts that connect to the main conflict

STEP 3: Return the extracted ScenarioFrame as JSON, followed by
a set of clarifying questions for the user. Questions should be
specific and actionable, not vague.

For clarifying questions, focus on:
- "You mentioned X but not Y — should Y be included as an actor?"
- "What's the specific moment you want the simulation to branch from?"
- "You described Iran's position as defensive — do you see any
  conditions where they'd shift to offensive?"
- "Should the simulation model [specific dynamic] or is that
  out of scope?"

The goal is: after the user answers your clarifying questions,
Stage 1 should have ZERO ambiguity about who to research and why.

OUTPUT FORMAT: Return a JSON object with two keys:
- "frame": the ScenarioFrame object (best effort from what's provided)
- "clarifyingQuestions": array of strings (questions to fill gaps)
`;

// ------------------------------------------------------------
// AGENT ROLES
// Three distinct AI roles with different information access
// ------------------------------------------------------------

/**
 * ACTOR AGENT
 * Plays as a specific country/group.
 * ONLY sees its own intelligence picture — NOT the omniscient truth.
 * Generates a comprehensive list of available decisions with
 * operational parameters, then assembles a multi-action TurnPlan.
 */
interface ActorAgentContext {
  // who am I?
  actor: Actor;

  // what do I BELIEVE about the world? (fog of war)
  myIntelligencePicture: IntelligencePicture[];

  // what are my relationships?
  myRelationships: Relationship[];

  // what has happened? (only events this actor would know about)
  knownEvents: Event[];

  // what game am I playing?
  framing: ActorFraming;

  // what just happened? (for reaction phase)
  lastTurnResolution?: TurnResolution;

  // what am I currently doing? (ongoing operations carry over between turns)
  ongoingOperations: ActiveOperation[];
}

const ACTOR_AGENT_SYSTEM = `
You are the strategic decision-making apparatus of {{ACTOR_NAME}}.
You are playing this actor in a geopolitical simulation. You must
make decisions that are RATIONAL FROM THIS ACTOR'S PERSPECTIVE,
given what this actor knows and believes.

CRITICAL RULES:
1. You do NOT have omniscient knowledge. You only know what is in
   your intelligence picture. Your intelligence picture may be WRONG.
   Make decisions based on what you BELIEVE, not what is objectively true.
2. You are constrained by your actor's political system, culture,
   capabilities, and decision factors. A theocratic republic makes
   decisions differently than a liberal democracy.
3. You prefer the LOWEST escalation level that can achieve your
   objectives. Escalation has costs. Only escalate when the strategic
   logic demands it — when current-rung options cannot achieve your
   goals or when you're responding to the adversary's escalation.
4. Consider second and third-order effects. A tactically brilliant
   move that alienates your allies or triggers an adversary's
   constraint cascade is not necessarily good strategy.
5. You have a PERSONALITY shaped by your key decision-makers'
   dispositions. If your leadership is hawkish, your risk tolerance
   is higher. If pragmatist, you seek off-ramps.
6. You care about your win condition: {{WIN_CONDITION}}
   You fear your lose condition: {{LOSE_CONDITION}}
   Your stakes are: {{STAKES_LEVEL}}

For each turn, you will:
A. Assess the current situation from your perspective
B. Identify 3-5 available decisions (spanning different escalation
   levels and dimensions — military, economic, diplomatic, etc.)
C. Evaluate each decision against your objectives, constraints,
   and anticipated adversary responses
D. Select ONE decision and explain your strategic rationale
E. Optionally, propose a CUSTOM decision not in the generated list

OUTPUT FORMAT: Return a JSON object with:
- "situationAssessment": string (your read of the current state)
- "availableDecisions": array of Decision objects
- "selectedDecision": the Decision you chose
- "rationale": string (why this decision, why not the others)
- "anticipatedResponses": what you expect other actors to do
- "customDecision": Decision | null (if you want to do something not listed)
`;

/**
 * RESOLUTION ENGINE
 * The omniscient referee. Sees TRUE state.
 * Takes all actors' TurnPlans (multi-action).
 * Models how actions interact within and across actors.
 * Generates resulting events and state updates.
 */
interface ResolutionContext {
  // omniscient view
  fullScenario: Scenario;

  // all TurnPlans submitted this turn (from all actors simultaneously)
  turnPlans: TurnPlan[];

  // reaction-phase plans (made after initial resolution)
  reactionPlans?: TurnPlan[];
}

const RESOLUTION_ENGINE_SYSTEM = `
You are the resolution engine for a geopolitical simulation. You have
OMNISCIENT knowledge of the true state of all actors. Your job is to
take the simultaneous decisions of all actors and determine what
actually happens.

STEP 1: COLLISION DETECTION
Multiple actors are acting simultaneously. Their decisions may:
- Directly conflict (both sides striking each other's assets)
- Interact unexpectedly (one side's move changes the context for another's)
- Create compound effects (strikes + Strait closure + oil spike = cascade)
Identify all interactions between simultaneous decisions.

STEP 2: OUTCOME RESOLUTION
For each decision and interaction, determine:
- What actually happens (using TRUE state, not actors' beliefs)
- Where actors' plans fail because their intelligence was wrong
- What the cascading effects are across all dimensions
- How this changes each actor's state
- Whether this triggers any escalation ladder movement
- Whether this creates or resolves intelligence gaps
- Third-party effects on actors who didn't make decisions this turn

STEP 3: GENERATE EVENTS
Convert outcomes into structured Event objects with:
- Full impact chains (direct → cascading → third party)
- Escalation changes
- Intelligence consequences (what was revealed/concealed)
- Causal links to the decisions that produced them

STEP 4: IDENTIFY REACTION TRIGGERS
Determine which outcomes are significant enough to warrant a
reaction-phase response. Not everything triggers a reaction —
only surprising, threatening, or opportunity-creating outcomes.
Flag which actors would want to react and why.

STEP 5: STATE UPDATE
Produce the updated Scenario state reflecting all resolved events.

CRITICAL RULES:
1. Be REALISTIC. The fog of war matters. If the US strikes a
   facility they believe holds uranium but it was already moved,
   the strike succeeds militarily but fails strategically.
2. Model FRICTION. Operations don't go perfectly. Supply chains
   break. Missiles miss. Intelligence is late. Political reactions
   are unpredictable.
3. Asymmetric outcomes are common. A swarm of cheap drones forcing
   the expenditure of expensive interceptors is a strategic win
   for the drone operator even if every drone is shot down.
4. Consider what the WORLD sees. Media coverage, public perception,
   and international reaction are real consequences of military action.
5. Economic effects cascade FAST. Oil price spikes affect every
   actor and many non-actors. Model these ripple effects.

OUTPUT FORMAT: Return a JSON object with:
- "resolvedEvents": array of Event objects
- "stateUpdates": array of per-actor state deltas
- "escalationChanges": array of escalation movements
- "reactionTriggers": array of { actorId, trigger, urgency }
- "globalStateUpdate": changes to oil prices, stability index, etc.
- "turnNarrative": string (human-readable summary of what happened)
`;

/**
 * JUDGE / EVALUATOR
 * Assesses plausibility and consistency of simulation outputs.
 * This is your LLM-as-judge for the rubric.
 */
interface JudgeContext {
  // the scenario before and after the turn
  previousState: Scenario;
  currentState: Scenario;
  // what happened
  resolvedEvents: Event[];
  // the decisions that were made
  decisions: Decision[];
}

const JUDGE_SYSTEM = `
You are a plausibility judge for a geopolitical simulation. Your job
is to evaluate whether the simulation's outputs are realistic,
internally consistent, and historically grounded.

Evaluate on these dimensions:

1. PLAUSIBILITY (0-100): Would real-world analysts find these
   outcomes reasonable? Are the cause-effect chains logical?
   Compare to historical precedents where possible.

2. INTERNAL CONSISTENCY (0-100): Do the outcomes contradict
   established actor states, capabilities, or constraints?
   Does an actor do something their political system or culture
   would prevent?

3. PROPORTIONALITY (0-100): Are the magnitudes of effects
   reasonable? A single drone strike shouldn't collapse a
   major economy. A nuclear strike shouldn't be brushed off.

4. STRATEGIC RATIONALITY (0-100): Did each actor's AI agent
   make decisions that are rational from THEIR perspective
   (given their information, not omniscient knowledge)?

5. CASCADE LOGIC (0-100): Do the second and third-order effects
   follow logically? Are important cascades being missed?

For any score below 70, provide specific feedback on what's
unrealistic and suggest corrections.

OUTPUT FORMAT: Return a JSON object with:
- "scores": { plausibility, consistency, proportionality,
              rationality, cascadeLogic }
- "overallScore": weighted average
- "issues": array of { dimension, description, severity, suggestion }
- "historicalComparisons": array of relevant real-world parallels
- "missedEffects": array of cascading effects the resolution missed
`;

// ------------------------------------------------------------
// GAME LOOP: the hybrid simultaneous + reaction model
// ------------------------------------------------------------

interface TurnResolution {
  turnNumber: number;
  phase: "planning" | "resolution" | "reaction" | "complete";

  // Phase 1: PLANNING (simultaneous)
  // All actor agents generate comprehensive decision lists
  // and assemble multi-action TurnPlans
  planningPhase: {
    actorPlans: TurnPlan[];
  };

  // Phase 2: RESOLUTION
  // Resolution engine processes all TurnPlans together,
  // modeling within-actor synergies/tensions and cross-actor collisions
  resolutionPhase: {
    resolvedEvents: Event[];
    stateUpdates: any[];
    turnNarrative: string;
    // which actions succeeded/failed and why
    actionOutcomes: {
      actorId: string;
      decisionId: string;
      succeeded: boolean;
      outcome: string;
      parameterEffects: string;     // how the chosen parameters shaped the result
      synergyEffects: string[];     // bonuses from concurrent actions
      tensionEffects: string[];     // penalties from conflicting actions
    }[];
    reactionTriggers: {
      actorId: string;
      trigger: string;
      urgency: "immediate" | "next_turn" | "optional";
    }[];
  };

  // Phase 3: REACTION
  // Actors with "immediate" reaction triggers can submit
  // a reactive TurnPlan (typically 1-2 actions, not a full plan)
  reactionPhase: {
    reactionPlans: TurnPlan[];
    reactionResolution: {
      resolvedEvents: Event[];
      stateUpdates: any[];
      narrative: string;
    };
  };

  // Phase 4: JUDGING
  judgingPhase: {
    scores: {
      plausibility: number;
      consistency: number;
      proportionality: number;
      rationality: number;
      cascadeLogic: number;
    };
    overallScore: number;
    issues: any[];
    missedEffects: string[];
  };

  endOfTurnScenario: Scenario;
}

// ------------------------------------------------------------
// GAME LOOP PSEUDOCODE
// ------------------------------------------------------------

/*
async function runTurn(
  scenario: Scenario,
  gameConfig: GameConfig,
  turnNumber: number
): Promise<TurnResolution> {

  // ── PHASE 1: PLANNING ──────────────────────────────
  const planningResults = await Promise.all(
    scenario.actors.map(actor => {
      if (gameConfig.userControlledActors.includes(actor.id)) {
        // present decisions to user, wait for selection
        return getUserDecision(actor, scenario);
      } else {
        // run actor agent with fog-of-war filtered context
        return runActorAgent(actor, buildFogOfWarContext(actor, scenario));
      }
    })
  );
  // in observer mode, show all AI decisions to user
  // user can intervene and override before resolution
  if (gameConfig.allowIntervention) {
    await presentForIntervention(planningResults);
  }

  // ── PHASE 2: RESOLUTION ────────────────────────────
  const resolution = await runResolutionEngine({
    fullScenario: scenario,
    decisions: planningResults
  });

  // ── PHASE 3: REACTION ──────────────────────────────
  const reactingActors = resolution.reactionTriggers
    .filter(t => t.urgency === "immediate");

  const reactions = await Promise.all(
    reactingActors.map(trigger => {
      const actor = scenario.actors.find(a => a.id === trigger.actorId);
      if (gameConfig.userControlledActors.includes(trigger.actorId)) {
        return getUserReaction(actor, trigger, resolution);
      } else {
        return runActorAgent(actor, {
          ...buildFogOfWarContext(actor, scenario),
          lastTurnResolution: resolution
        });
      }
    })
  );

  // resolve reactions through the engine
  const reactionResolution = reactions.length > 0
    ? await runResolutionEngine({
        fullScenario: applyStateUpdates(scenario, resolution.stateUpdates),
        decisions: reactions,
        isReactionPhase: true
      })
    : null;

  // ── PHASE 4: JUDGING ───────────────────────────────
  const updatedScenario = applyAllUpdates(scenario, resolution, reactionResolution);
  const judgment = await runJudge({
    previousState: scenario,
    currentState: updatedScenario,
    resolvedEvents: [
      ...resolution.resolvedEvents,
      ...(reactionResolution?.resolvedEvents || [])
    ],
    decisions: planningResults.map(p => p.decision)
  });

  // if judge flags major issues, optionally re-run resolution
  if (judgment.overallScore < 50) {
    // flag for human review or re-run with corrections
  }

  return {
    turnNumber,
    phase: "complete",
    planningPhase: { actorDecisions: planningResults },
    resolutionPhase: resolution,
    reactionPhase: { reactions, reactionResolution },
    judgingPhase: judgment,
    endOfTurnScenario: updatedScenario
  };
}
*/

// ------------------------------------------------------------
// FOG OF WAR CONTEXT BUILDER
// Filters the scenario to only what a specific actor can see
// ------------------------------------------------------------

/*
function buildFogOfWarContext(actor: Actor, scenario: Scenario): ActorAgentContext {
  return {
    actor: actor,
    myIntelligencePicture: actor.intelligencePicture,
    myRelationships: scenario.relationships.filter(
      r => r.actorA === actor.id || r.actorB === actor.id
    ),
    // filter events to only those this actor would know about
    // (events they initiated, events that targeted them,
    //  events reported in media, events shared by intel partners)
    knownEvents: scenario.eventHistory.filter(
      e => actorWouldKnowAbout(actor, e, scenario)
    ),
    framing: getActorFraming(actor, scenario)
  };
}

function actorWouldKnowAbout(actor: Actor, event: Event, scenario: Scenario): boolean {
  // actor knows about events they initiated
  if (event.initiatedBy === actor.id) return true;
  // actor knows about events that targeted them
  if (event.targetedActors.includes(actor.id)) return true;
  // actor knows about major public events (above a significance threshold)
  if (event.impacts.some(i => i.magnitude === "critical" || i.magnitude === "major")) return true;
  // actor knows about events shared by intel partners
  const intelPartners = actor.state.intelligence.intelSharingPartners.map(p => p.actorId);
  if (intelPartners.includes(event.initiatedBy)) return true;
  // covert events by adversaries — actor may NOT know
  return false;
}
*/
