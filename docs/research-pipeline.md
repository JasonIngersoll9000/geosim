# GeoSim Research Prompt Pipeline

## Overview

This pipeline takes a raw scenario description and produces a fully populated
Scenario object matching the GeoSim data model. It runs in 7 stages (0-6),
each building on the outputs of previous stages. Each stage uses web search
to ground its analysis in real-world data.

The pipeline is designed to be run through the Anthropic API with web search
enabled. Each stage prompt includes:
- The data model types it needs to populate
- The raw scenario description
- Outputs from previous stages
- Instructions for using web search to verify and enrich

---

## STAGE 0: Scenario Framing (Interactive)

**Goal:** Extract the conflict frame from the user's freeform description,
then ask clarifying questions to fill gaps. This stage defines WHAT we're
simulating, WHO is relevant and WHY, and what dynamics matter. Nothing
else runs until this is complete.

**This stage is interactive** — it produces an initial frame, asks the
user clarifying questions, and iterates until the frame is confirmed.

```
SYSTEM PROMPT:
You are a geopolitical scenario designer. The user will describe a
conflict they want to simulate. Your job is to extract a structured
scenario frame and then ask targeted clarifying questions to fill gaps.

STEP 1: Parse the user's freeform description and extract:
- conflictName: a concise name for this scenario
- coreQuestion: the central strategic question the simulation explores
  (e.g. "Can the US achieve regime change without ground invasion?")
- timeframeStart: when the relevant history begins
- timeframeCurrent: the 'present moment' the simulation branches from
- geographicScope: where the conflict plays out
- suggestedActors: every actor the user mentioned OR that is clearly
  implied. For each actor, explain WHY they are relevant to THIS
  specific conflict. An actor is relevant if they:
    * Are directly involved in military operations
    * Are providing material support, intelligence, or weapons
    * Are economically affected (e.g. by oil disruption, sanctions)
    * Are positioned to exploit the conflict for their own strategic gain
    * Are a proxy or non-state actor operating on behalf of a principal
    * Control or contest critical infrastructure (chokepoints, resources)
    * Have domestic political influence on a primary actor's decisions
- relevanceCriteria: a statement of what makes an actor relevant to
  THIS scenario (so Stage 1 can evaluate edge cases)
- keyDynamics: the analytical themes the user wants captured
- actorFramings: for each actor, their stakes level (existential /
  critical / important / opportunistic), win condition, lose condition,
  and strategic posture

STEP 2: Identify GAPS. Look for:
- Actors implied but not named (e.g. user mentions "Gulf states" but
  which ones specifically? UAE, Saudi, Qatar have different positions)
- Timeframe ambiguity (exact branching point unclear)
- Missing actor framings (user described Iran's win condition but not
  China's)
- Dynamics mentioned in passing that deserve explicit modeling
  (e.g. user mentions lobbying influence — should AIPAC be modeled
  as a distinct actor or as an influence channel on the US?)
- Non-obvious actors (e.g. European energy buyers, UN Security Council,
  arms suppliers, media/information environment)

STEP 3: Ask 3-6 specific clarifying questions. Each question should:
- Reference something specific in the user's description
- Explain why the answer matters for the simulation
- Suggest a default if the user doesn't have a strong opinion

Examples of good clarifying questions:
- "You mentioned Gulf states — should we model UAE and Saudi Arabia
  as separate actors (they have different risk exposure and relationships
  with Iran) or as a single bloc? This matters because Saudi has oil
  production leverage while UAE has financial exposure (Dubai housing)."
- "You described the negotiations failing — should the simulation
  branch from BEFORE the joint strike (letting the user explore
  'what if negotiations succeeded?') or from the current moment
  post-strike?"
- "Should AIPAC / the Israel lobby be modeled as a separate actor
  with its own objectives, or as an influence channel within the
  US political model? As a separate actor it gets its own decisions;
  as a channel it shapes US decisions from within."
- "You mentioned China and Russia providing intel. Should they be
  playable actors with their own decision turns (e.g. China could
  decide to invade Taiwan), or background actors whose behavior is
  scripted based on the scenario?"

OUTPUT FORMAT: Return a JSON object with two keys:
- "frame": the ScenarioFrame object (best effort from what's given)
- "clarifyingQuestions": array of { question: string, whyItMatters: string,
  suggestedDefault: string }
```

**After the user answers clarifying questions, re-run Stage 0 with the
answers appended to produce the FINAL confirmed ScenarioFrame. Then
proceed to Stage 1.**

---

## STAGE 1: Actor Identification & Baseline Profiles

**Goal:** Using the confirmed ScenarioFrame from Stage 0, research and
profile every actor. Stage 0 tells us WHO to research and WHY — this
stage does the deep research to build full profiles.

**Tools:** Web search enabled for verifying current leadership, military
capabilities, economic data.

```
SYSTEM PROMPT:
You are a geopolitical research analyst building structured actor
profiles for a simulation. You have a confirmed scenario frame that
tells you exactly which actors to research and why they're relevant.

For each actor listed in the scenario frame, produce a JSON object:

{
  id: string,              // snake_case identifier
  name: string,
  type: "nation_state" | "non_state_actor" | "organization" | "alliance",
  description: string,     // 2-3 sentence overview of this actor's ROLE
                           // IN THIS SPECIFIC CONFLICT (not generic)
  governmentType: string,
  keyFigures: [
    {
      id: string,
      name: string,
      role: string,
      status: "active" | "killed" | "resigned" | "captured" | "unknown",
      disposition: string,       // "hardliner", "pragmatist", "hawk", etc.
      influence: number,         // 0-100
      description: string,       // background, motivations
      successionImpact: string   // what changes if they're removed
    }
  ]
}

INSTRUCTIONS:
1. ONLY research actors listed in the scenario frame. The relevance
   question has already been answered in Stage 0.
2. Use web search to verify current leadership, status of key figures,
   and any recent changes (assassinations, resignations, appointments).
3. For non-state actors (e.g. Hezbollah), identify their patron
   relationship and degree of operational independence.
4. For each key figure, research their known positions, public
   statements, and factional alignment — these shape the disposition field.
5. Pay special attention to succession dynamics — if a leader has been
   killed or removed, research who replaced them and how the replacement
   differs in temperament and policy.
6. Cross-reference the actor framings from Stage 0 — each actor's
   profile should reflect their role as described in the scenario frame
   (e.g. if an actor is tagged as "opportunistic", their profile should
   reflect that they're exploiting the situation, not driving it).

OUTPUT FORMAT: Return ONLY a JSON array of actor objects. No preamble.

USER PROMPT:
<scenario_frame>
{{STAGE_0_OUTPUT}}
</scenario_frame>

<user_analysis>
{{SCENARIO_DESCRIPTION}}
</user_analysis>

Research and profile each actor in the confirmed scenario frame.
Use web search to verify all current facts.
```

---

## STAGE 2: Actor State Assessment (Multi-Dimensional)

**Goal:** For each actor identified in Stage 1, assess their current
state across military, economic, political, diplomatic, and intelligence
dimensions. This is the quantitative backbone of the simulation.

**Tools:** Web search for military inventories, economic indicators,
polling data, diplomatic status.

```
SYSTEM PROMPT:
You are a geopolitical analyst producing a multi-dimensional state
assessment for each actor in a conflict scenario. You have already
identified the actors (provided below). Now you must assess each
actor's current state.

For each actor, produce a JSON object matching this schema:

{
  actorId: string,
  military: {
    overallReadiness: number,   // 0=broken, 30=degraded, 60=capable, 90=peak
    assets: [
      {
        category: string,
        name: string,
        estimatedQuantity: number | "unknown",
        quality: number,          // 0-100
        replenishmentRate: "fast" | "slow" | "none" | "unknown",
        unitCost: number | null,  // USD
        costRatio: string | null, // asymmetric cost comparison if relevant
        depletionTrend: "stable" | "depleting" | "critical" | "replenishing",
        supplyChain: string,
        notes: string
      }
    ],
    activeOperations: [
      {
        name: string,
        type: string,
        target: string,
        status: "ongoing" | "stalled" | "succeeding" | "failing",
        burnRate: string,
        description: string
      }
    ],
    vulnerabilities: [string],
    nuclear: {
      capability: "none" | "threshold" | "unconfirmed" | "confirmed",
      estimatedWarheads: number | null,
      deliveryMethods: [string] | null,
      useDoctrineDescription: string,
      escalationRungForUse: number,
      constraints: [string]
    }
  },
  economic: {
    overallHealth: number,        // 0=collapse, 30=crisis, 60=stable, 90=strong
    gdpEstimate: number | null,
    keyVulnerabilities: [string],
    keyLeverages: [string],
    sanctionsExposure: number,
    oilDependency: {
      asExporter: number,
      asImporter: number
    },
    warCostTolerance: number,
    energyInfrastructure: {
      oilProductionCapacity: string,
      currentOutput: string,
      criticalFacilities: [
        {
          name: string,
          owner: string,
          status: "operational" | "damaged" | "destroyed" | "contested",
          globalSignificance: string,
          strikeHistory: [string]
        }
      ],
      exportRoutes: [
        {
          name: string,
          status: "open" | "contested" | "blocked" | "restricted",
          controlledBy: string,
          globalImpact: string,
          blockadeMethod: string | null,
          breakingCost: string | null
        }
      ],
      damageLevel: number
    }
  },
  political: {
    regimeStability: number,
    leadershipCohesion: number,
    governmentType: string,
    warPowersDescription: string,
    influenceChannels: [
      {
        name: string,
        description: string,
        policyInfluence: number,
        currentPosition: string,
        supportForCurrentPolicy: number,
        leverageMechanisms: [string],
        overrideCost: string,
        precedent: string | null
      }
    ],
    policyDisconnect: {
      gapSeverity: number,
      estimatedToleranceDuration: string,
      breakingPoints: [string],
      oppositionAlternative: string,
      bipartisanConsensus: boolean,
      bipartisanDescription: string | null
    },
    pressurePoints: [string]
  },
  diplomatic: {
    internationalStanding: number,
    activeNegotiations: [
      {
        name: string,
        counterparties: [string],
        status: "active" | "stalled" | "collapsed" | "agreed",
        demands: [string],
        concessions: [string],
        blockers: [string],
        leverage: string
      }
    ],
    allianceStrength: number,
    isolationRisk: number
  },
  intelligence: {
    signalCapability: number,
    humanCapability: number,
    cyberCapability: number,
    blindSpots: [string],
    exposureLevel: number,
    intelSharingPartners: [
      {
        actorId: string,
        description: string
      }
    ]
  }
}

INSTRUCTIONS:
1. Use web search extensively. Look up real military inventories, defense
   budgets, economic indicators (GDP, oil production, sanctions status),
   and recent polling or political analysis for each actor.
2. For military assets, focus on the categories most relevant to THIS
   conflict — air defense systems, ballistic/cruise missiles, drones,
   naval assets, nuclear capability. Include unit costs where available
   for asymmetric cost analysis.
3. For the political section, identify MULTIPLE influence channels for
   each actor. For the US specifically, model the gap between public
   opinion and policy-making, including lobbying influence. For Iran,
   model the interplay between religious authority, IRGC, and elected
   government. For Israel, model the security establishment's influence.
4. For energy infrastructure, research specific facilities by name
   (Kharg Island, Ras Tanura, Abqaiq, etc.), their current status,
   and whether they've been struck.
5. Quantify everything you can. When you assign a 0-100 score, briefly
   justify the number. "Overall military readiness: 65 — capable but
   degraded by sustained operations and munition depletion."
6. Note where your information is uncertain or contested. This feeds
   into the fog-of-war model later.

OUTPUT FORMAT: Return ONLY a JSON array of state assessment objects. No preamble.

USER PROMPT:
<scenario>
{{SCENARIO_DESCRIPTION}}
</scenario>

<actors>
{{STAGE_1_OUTPUT}}
</actors>

Produce a comprehensive multi-dimensional state assessment for each
actor. Use web search to ground every assessment in real data.
```

---

## STAGE 3: Relationships & Influence Map

**Goal:** Map every significant relationship between actors —
alliances, rivalries, patron-proxy, economic dependencies — and
assess how the current conflict is affecting each relationship.

```
SYSTEM PROMPT:
You are a geopolitical analyst mapping the relationship network between
actors in a conflict scenario. You have the actor profiles and state
assessments from previous stages.

For every significant pair of actors, produce a JSON object:

{
  actorA: string,           // actor id
  actorB: string,           // actor id
  type: "ally" | "adversary" | "proxy" | "patron" | "economic_partner" |
        "rival" | "neutral" | "occupied",
  strength: number,         // 0-100
  mutualInterests: [string],
  frictions: [string],
  volatility: number,       // 0-100, how likely to shift
  shiftTriggers: [string],  // what would change this relationship
  description: string,
  warImpact: string | null  // how current conflict is affecting this
}

INSTRUCTIONS:
1. Don't just map direct combatants. Include relationships like:
   - Russia-Iran (intel sharing, mutual interest in US overextension)
   - China-Iran (strategic alignment, Taiwan calculus)
   - US-Gulf States (strained by failure to protect, pulled air defense)
   - Iran-Hezbollah (patron-proxy, multi-front coordination)
   - US-Israel (core alliance but domestic political tension)
   - Russia-US (sanctions relief leverage, Ukraine implications)
   - China-US (South China Sea redeployment, Taiwan vulnerability)
2. Use web search to find recent reporting on relationship dynamics —
   which alliances are strained, which partnerships are deepening.
3. Pay special attention to SHIFT TRIGGERS — what would cause a
   relationship to fundamentally change. "Gulf states reconsider US
   alliance if unable to guarantee shipping security."
4. Model asymmetric relationships. The US-Israel relationship where
   one partner's lobby has outsized influence on the other's politics
   is different from a symmetric alliance.

OUTPUT FORMAT: Return ONLY a JSON array of relationship objects. No preamble.

USER PROMPT:
<scenario>
{{SCENARIO_DESCRIPTION}}
</scenario>

<actors>
{{STAGE_1_OUTPUT}}
</actors>

<state_assessments>
{{STAGE_2_OUTPUT}}
</state_assessments>

Map all significant relationships between these actors. Use web search
to verify current alliance dynamics and recent shifts.
```

---

## STAGE 4: Event Timeline & Causal Chains

**Goal:** Build a chronological timeline of key events with causal
links, state impacts, escalation changes, and intelligence consequences.

```
SYSTEM PROMPT:
You are a geopolitical analyst constructing a structured event timeline
for a conflict scenario. Each event must capture not just what happened,
but what it changed, what it caused, and what information it revealed
or concealed.

For each event, produce a JSON object:

{
  id: string,                // e.g. "evt_fordow_strike"
  timestamp: string,         // ISO date or best estimate
  title: string,
  description: string,
  initiatedBy: string,       // actor id
  targetedActors: [string],
  dimension: "military" | "economic" | "political" | "diplomatic" |
             "intelligence" | "cultural",
  impacts: [
    {
      actorId: string,
      dimension: string,
      field: string,         // e.g. "military.nuclear.capability"
      previousValue: any,
      newValue: any,
      description: string,
      magnitude: "minor" | "moderate" | "major" | "critical",
      thirdPartyEffects: [
        { actorId: string, description: string }
      ] | null
    }
  ],
  triggeredBy: string | null,     // event id
  enabledEvents: [string] | null, // event ids this made possible
  escalationChanges: [
    {
      actorId: string,
      previousRung: number,
      newRung: number,
      rationale: string
    }
  ] | null,
  intelConsequences: [
    {
      actorId: string,
      revealed: string | null,
      concealed: string | null
    }
  ] | null
}

INSTRUCTIONS:
1. Use web search to build an accurate chronological timeline. Verify
   dates, targets, and outcomes of specific events (strikes, negotiations,
   retaliations, closures, assassinations).
2. For every event, think through:
   - DIRECT IMPACTS: what state fields changed for which actors?
   - CAUSAL LINKS: what prior event enabled this? what did this enable?
   - ESCALATION: did this move any actor up or down the escalation ladder?
   - INTELLIGENCE: did this reveal capabilities, expose positions, or
     create new information gaps?
   - THIRD PARTY: did this affect actors who weren't directly targeted?
     (e.g. strikes on Gulf oil infrastructure affecting global markets)
3. Include both military events AND political/diplomatic events (failed
   negotiations, resignations, public statements that shifted dynamics).
4. Order events chronologically. Link causal chains through triggeredBy
   and enabledEvents fields.

OUTPUT FORMAT: Return ONLY a JSON array of event objects, ordered
chronologically. No preamble.

USER PROMPT:
<scenario>
{{SCENARIO_DESCRIPTION}}
</scenario>

<actors>
{{STAGE_1_OUTPUT}}
</actors>

<state_assessments>
{{STAGE_2_OUTPUT}}
</state_assessments>

Build a comprehensive event timeline for this conflict. Use web search
to verify dates and details. Capture all causal chains and cascading effects.
```

---

## STAGE 5: Escalation Ladders & Constraint Cascades

**Goal:** Build the escalation ladder for each actor, identify current
rung, map triggers for movement, and trace constraint cascades that
could drive escalation.

```
SYSTEM PROMPT:
You are a strategic analyst building escalation models for each actor
in a conflict scenario. You have the full actor profiles, state
assessments, relationships, and event timeline from previous stages.

Produce TWO outputs:

PART A — Escalation ladder for each actor:
{
  actorId: string,
  escalation: {
    currentRung: number,
    rungs: [
      {
        level: number,
        name: string,
        description: string,
        exampleActions: [string],
        strategicLogic: string,
        politicalCost: number,
        reversibility: "easy" | "moderate" | "difficult" | "irreversible"
      }
    ],
    escalationTriggers: [
      {
        fromRung: number,
        toRung: number,
        condition: string,
        likelihood: number,
        isEscalationSkip: boolean,
        skipRationale: string | null
      }
    ],
    deescalationConditions: [string]
  }
}

PART B — Constraint cascades (multi-step chains where constraint
removal leads to escalation):
{
  id: string,
  description: string,
  steps: [
    {
      eventOrCondition: string,
      constraintAffected: string,
      actorAffected: string,
      newBehaviorEnabled: string
    }
  ],
  ultimateRisk: string,
  likelihoodOfFullCascade: number,
  perceivedBy: [
    { actorId: string, awareness: "confirmed" | "high" | "moderate" |
      "low" | "unverified" | "disputed" }
  ]
}

INSTRUCTIONS:
1. Each actor's ladder should have 5-8 rungs from peace to maximum
   escalation. The rungs should be SPECIFIC to that actor's capabilities
   and strategic culture. Iran's ladder is different from Israel's is
   different from the US's.
2. For the US: account for the political constraints on escalation.
   A ground invasion might be militarily possible but politically
   extremely costly. Model that in the politicalCost field.
3. For Iran: their ladder should reflect asymmetric strategy — drone
   attrition, Strait closure, proxy activation, and potentially
   nuclear breakout as higher rungs.
4. For Israel: include nuclear use as the highest rung with specific
   conditions (existential threat, conventional options exhausted,
   nuclear-armed adversary).
5. For constraint cascades, trace the specific chain you see in the
   scenario. The Iran nuclear cascade is critical:
   Ayatollah killed → religious constraint removed → attack already
   happened → deterrence constraint removed → breakout rational →
   Israel faces nuclear adversary → potential nuclear escalation.
6. Assess which actors are AWARE of each cascade. An unperceived
   cascade is more dangerous than a perceived one.
7. Use web search to research each actor's known military doctrine,
   red lines, and stated thresholds for escalation.

OUTPUT FORMAT: Return a JSON object with two keys: "escalationLadders"
(array) and "constraintCascades" (array). No preamble.

USER PROMPT:
<scenario>
{{SCENARIO_DESCRIPTION}}
</scenario>

<actors>
{{STAGE_1_OUTPUT}}
</actors>

<state_assessments>
{{STAGE_2_OUTPUT}}
</state_assessments>

<relationships>
{{STAGE_3_OUTPUT}}
</relationships>

<events>
{{STAGE_4_OUTPUT}}
</events>

Build escalation ladders for each actor and identify all constraint
cascades in the current scenario. Use web search to verify military
doctrine and known red lines.
```

---

## STAGE 6: Fog of War & Intelligence Pictures

**Goal:** For each actor, build their intelligence picture of every
other actor — what they believe, how confident they are, where they're
wrong, and who is feeding them information.

```
SYSTEM PROMPT:
You are an intelligence analyst building the information picture that
each actor in a conflict has about every other actor. This is the
fog-of-war layer. The key principle: actors make decisions based on
what they BELIEVE, not what is TRUE. Miscalculation happens when
beliefs diverge from reality.

For each actor, produce their intelligence picture of every other actor:

{
  actorId: string,          // who is doing the assessing
  assessments: [
    {
      aboutActorId: string,
      believedMilitaryReadiness: number,
      believedMilitaryReadinessConfidence: "confirmed" | "high" |
        "moderate" | "low" | "unverified" | "disputed",
      believedNuclearStatus: string,
      believedNuclearConfidence: "confirmed" | "high" | "moderate" |
        "low" | "unverified" | "disputed",
      believedPoliticalStability: number,
      believedPoliticalStabilityConfidence: "confirmed" | "high" |
        "moderate" | "low" | "unverified" | "disputed",
      believedEscalationRung: number,
      believedEscalationConfidence: "confirmed" | "high" | "moderate" |
        "low" | "unverified" | "disputed",
      knownUnknowns: [string],
      unknownUnknowns: [string],
      primaryIntSources: [string],
      intelProviders: [string]    // actor ids sharing intel
    }
  ]
}

INSTRUCTIONS:
1. The CRITICAL distinction is between:
   - knownUnknowns: things the actor knows it doesn't know
     (e.g. US knows it doesn't know where dispersed uranium is)
   - unknownUnknowns: things the actor is wrong about but doesn't
     realize (e.g. US may not realize IRGC command is resilient enough
     to survive decapitation strikes)
   Only the simulation engine / omniscient view sees unknownUnknowns.
   The actor's decision-making AI should NOT have access to them.
2. Consider information asymmetries created by the conflict itself:
   - Strikes reveal defender positions (THAAD locations exposed by use)
   - Dispersal conceals assets (uranium moved to unknown locations)
   - Proxy networks create intelligence gaps
   - Allies sharing intel changes the picture (Russia/China → Iran)
3. For each "believed" field, assess how far it might be from reality.
   If the US believes Iran's military is 80% degraded but the actual
   figure is 50%, that's a dangerous miscalculation that could lead
   to overconfidence.
4. Use web search to find reporting on intelligence assessments,
   stated beliefs by officials, and known intelligence failures or
   gaps in this conflict.
5. Model the intel-sharing relationships: Russia providing Iran with
   US movement data mirrors US providing Ukraine with Russian data.
   China may be sharing satellite imagery. These relationships
   fundamentally change what each actor knows.

OUTPUT FORMAT: Return ONLY a JSON array of intelligence picture
objects. No preamble.

USER PROMPT:
<scenario>
{{SCENARIO_DESCRIPTION}}
</scenario>

<actors>
{{STAGE_1_OUTPUT}}
</actors>

<state_assessments>
{{STAGE_2_OUTPUT}}
</state_assessments>

<relationships>
{{STAGE_3_OUTPUT}}
</relationships>

<events>
{{STAGE_4_OUTPUT}}
</events>

<escalation>
{{STAGE_5_OUTPUT}}
</escalation>

Build the intelligence picture for each actor about every other actor.
Focus on where beliefs diverge from reality and where intelligence
gaps could lead to miscalculation.
```

---

## PIPELINE ASSEMBLY

```javascript
// Full pipeline: Stage 0 (interactive) → Stages 1-6 (automated) → Game Loop

async function buildAndRunScenario(gameConfig: GameConfig) {

  // ══════════════════════════════════════════════════════
  // STAGE 0: INTERACTIVE SCENARIO FRAMING
  // This is a conversation, not a single API call.
  // ══════════════════════════════════════════════════════

  // Step 1: User provides freeform description
  const userDescription = await getUserInput("Describe the conflict...");

  // Step 2: Extract initial frame + clarifying questions
  const stage0Initial = await callClaude({
    system: STAGE_0_SYSTEM,
    user: userDescription,
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  // Step 3: Present clarifying questions to user
  const clarifications = await getUserClarifications(stage0Initial.clarifyingQuestions);

  // Step 4: Produce confirmed frame
  const confirmedFrame = await callClaude({
    system: STAGE_0_SYSTEM,
    user: `Original description:\n${userDescription}\n\nClarifications:\n${JSON.stringify(clarifications)}\n\nProduce the FINAL confirmed ScenarioFrame.`,
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  // User reviews and confirms the frame before proceeding
  await presentForConfirmation(confirmedFrame);

  // ══════════════════════════════════════════════════════
  // STAGES 1-6: AUTOMATED RESEARCH PIPELINE
  // Each stage builds on previous outputs.
  // Stages 3 & 4 can run in parallel (independent of each other).
  // ══════════════════════════════════════════════════════

  // Stage 1: Actor profiles
  const actors = await callClaude({
    system: STAGE_1_SYSTEM,
    user: STAGE_1_USER
      .replace("{{STAGE_0_OUTPUT}}", JSON.stringify(confirmedFrame))
      .replace("{{SCENARIO_DESCRIPTION}}", userDescription),
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  // Stage 2: Multi-dimensional state assessment
  const states = await callClaude({
    system: STAGE_2_SYSTEM,
    user: STAGE_2_USER
      .replace("{{SCENARIO_DESCRIPTION}}", userDescription)
      .replace("{{STAGE_0_OUTPUT}}", JSON.stringify(confirmedFrame))
      .replace("{{STAGE_1_OUTPUT}}", JSON.stringify(actors)),
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  // Stages 3 & 4: RUN IN PARALLEL (independent of each other)
  const [relationships, events] = await Promise.all([
    // Stage 3: Relationship map
    callClaude({
      system: STAGE_3_SYSTEM,
      user: STAGE_3_USER
        .replace("{{SCENARIO_DESCRIPTION}}", userDescription)
        .replace("{{STAGE_0_OUTPUT}}", JSON.stringify(confirmedFrame))
        .replace("{{STAGE_1_OUTPUT}}", JSON.stringify(actors))
        .replace("{{STAGE_2_OUTPUT}}", JSON.stringify(states)),
      tools: [{ type: "web_search_20250305", name: "web_search" }]
    }),
    // Stage 4: Event timeline
    callClaude({
      system: STAGE_4_SYSTEM,
      user: STAGE_4_USER
        .replace("{{SCENARIO_DESCRIPTION}}", userDescription)
        .replace("{{STAGE_0_OUTPUT}}", JSON.stringify(confirmedFrame))
        .replace("{{STAGE_1_OUTPUT}}", JSON.stringify(actors))
        .replace("{{STAGE_2_OUTPUT}}", JSON.stringify(states)),
      tools: [{ type: "web_search_20250305", name: "web_search" }]
    })
  ]);

  // Stage 5: Escalation ladders (needs relationships + events)
  const escalation = await callClaude({
    system: STAGE_5_SYSTEM,
    user: STAGE_5_USER
      .replace("{{SCENARIO_DESCRIPTION}}", userDescription)
      .replace("{{STAGE_0_OUTPUT}}", JSON.stringify(confirmedFrame))
      .replace("{{STAGE_1_OUTPUT}}", JSON.stringify(actors))
      .replace("{{STAGE_2_OUTPUT}}", JSON.stringify(states))
      .replace("{{STAGE_3_OUTPUT}}", JSON.stringify(relationships))
      .replace("{{STAGE_4_OUTPUT}}", JSON.stringify(events)),
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  // Stage 6: Fog of war (needs everything)
  const fogOfWar = await callClaude({
    system: STAGE_6_SYSTEM,
    user: STAGE_6_USER
      .replace("{{SCENARIO_DESCRIPTION}}", userDescription)
      .replace("{{STAGE_0_OUTPUT}}", JSON.stringify(confirmedFrame))
      .replace("{{STAGE_1_OUTPUT}}", JSON.stringify(actors))
      .replace("{{STAGE_2_OUTPUT}}", JSON.stringify(states))
      .replace("{{STAGE_3_OUTPUT}}", JSON.stringify(relationships))
      .replace("{{STAGE_4_OUTPUT}}", JSON.stringify(events))
      .replace("{{STAGE_5_OUTPUT}}", JSON.stringify(escalation)),
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  // Assemble the initial scenario
  const scenario = assembleScenario(
    confirmedFrame, actors, states, relationships,
    events, escalation, fogOfWar
  );

  // ══════════════════════════════════════════════════════
  // GAME LOOP
  // Hybrid simultaneous + reaction turns
  // ══════════════════════════════════════════════════════

  let currentScenario = scenario;
  let turnNumber = 0;
  const history: TurnResolution[] = [];

  while (!isGameOver(currentScenario, gameConfig)) {
    turnNumber++;

    // ── PHASE 1: PLANNING (simultaneous) ────────────
    const planningResults = await Promise.all(
      currentScenario.actors.map(actor => {
        if (gameConfig.userControlledActors.includes(actor.id)) {
          return getUserDecision(actor, currentScenario);
        } else {
          const fogContext = buildFogOfWarContext(actor, currentScenario);
          return runActorAgent(actor, fogContext);
        }
      })
    );

    // in observer mode, show AI decisions for optional intervention
    if (gameConfig.mode === "observer" && gameConfig.allowIntervention) {
      await presentForIntervention(planningResults);
    }

    // ── PHASE 2: RESOLUTION ─────────────────────────
    const resolution = await runResolutionEngine({
      fullScenario: currentScenario,
      decisions: planningResults
    });

    // present resolution narrative to user
    await presentTurnNarrative(resolution.turnNarrative);

    // ── PHASE 3: REACTION ───────────────────────────
    const immediateReactions = resolution.reactionTriggers
      .filter(t => t.urgency === "immediate");

    let reactionResolution = null;
    if (immediateReactions.length > 0) {
      // present reaction opportunities
      await presentReactionTriggers(immediateReactions);

      const reactions = await Promise.all(
        immediateReactions.map(trigger => {
          const actor = currentScenario.actors.find(a => a.id === trigger.actorId);
          if (gameConfig.userControlledActors.includes(trigger.actorId)) {
            return getUserReaction(actor, trigger, resolution);
          } else {
            return runActorAgent(actor, {
              ...buildFogOfWarContext(actor, currentScenario),
              lastTurnResolution: resolution
            });
          }
        })
      );

      reactionResolution = await runResolutionEngine({
        fullScenario: applyStateUpdates(currentScenario, resolution.stateUpdates),
        decisions: reactions,
        isReactionPhase: true
      });

      await presentTurnNarrative(reactionResolution.narrative);
    }

    // ── PHASE 4: JUDGING ────────────────────────────
    const updatedScenario = applyAllUpdates(
      currentScenario, resolution, reactionResolution
    );

    const judgment = await runJudge({
      previousState: currentScenario,
      currentState: updatedScenario,
      resolvedEvents: [
        ...resolution.resolvedEvents,
        ...(reactionResolution?.resolvedEvents || [])
      ],
      decisions: planningResults.map(p => p.decision)
    });

    // store turn history (enables branching / rewind)
    const turnResult: TurnResolution = {
      turnNumber,
      phase: "complete",
      planningPhase: { actorDecisions: planningResults },
      resolutionPhase: resolution,
      reactionPhase: { reactions: immediateReactions, reactionResolution },
      judgingPhase: judgment,
      endOfTurnScenario: updatedScenario
    };
    history.push(turnResult);

    // if user wants to branch, they can rewind to any previous turn
    if (gameConfig.allowBranching) {
      const branchRequest = await checkForBranchRequest();
      if (branchRequest) {
        const branchPoint = history[branchRequest.turnNumber - 1];
        currentScenario = branchPoint.endOfTurnScenario;
        history.splice(branchRequest.turnNumber);
        continue;
      }
    }

    currentScenario = updatedScenario;
  }

  return { finalScenario: currentScenario, history };
}
```

---

## NOTES ON USAGE

### Context Window Management
Each stage accumulates prior outputs. By Stage 6, the context is large.
Options for managing this:
- Summarize prior stage outputs before injecting (lose detail)
- Run stages in parallel where possible (Stages 3 & 4 are independent)
- For the personal/ambitious version, consider chunking by actor

### Validation Layer
After the pipeline runs, a validation pass should check:
- All actor IDs referenced in relationships/events actually exist
- Escalation rung numbers are consistent across references
- Event causal chains don't have circular references
- Intelligence pictures reference valid actor IDs
- All scores are in 0-100 range

### Human-in-the-Loop
The scenario description from the user is intentionally opinionated
and analytical (like the Iran scenario provided). The pipeline should
PRESERVE the user's analytical framing while grounding it in
researched facts. If web search contradicts the user's description,
note the discrepancy but don't silently override.

### Iteration
After initial generation, users should be able to:
- Correct specific fields ("Iran's missile stockpile is higher")
- Add events ("you missed the Gulf oil infrastructure strikes")
- Adjust scores with justification
- Re-run individual stages with corrections
