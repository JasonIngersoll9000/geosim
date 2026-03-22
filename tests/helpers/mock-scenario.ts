import type {
  Scenario,
  Actor,
  ActorState,
  Event,
  Relationship,
  Decision,
  TurnPlan,
} from "../../lib/types/simulation";

// ------------------------------------------------------------
// MOCK SCENARIO FACTORY
// Iran conflict scenario — Turn 4, Week of March 22, 2026
// Key fog-of-war divergence: US believes Iran readiness=25, actual=58
// ------------------------------------------------------------

export function createMockScenario(): Scenario {
  return {
    id: "scenario-iran-2026",
    name: "US-Israel-Iran Conflict 2026",
    description: "Phase 3: Operation Epic Fury, Day 19",
    timestamp: "2026-03-22T00:00:00Z",
    backgroundContext:
      "Strikes came one day after Oman announced a diplomatic breakthrough. Iran had agreed to transfer enriched uranium abroad. Netanyahu called Trump on Feb 23 to share Khamenei's location.",

    phases: [
      {
        id: "phase-1",
        name: "The Twelve-Day War",
        startDate: "2025-06-13",
        endDate: "2025-06-24",
        description: "Israel initiates strikes, US joins Day 9, ceasefire June 24",
        dominantDynamics: ["air_campaign", "ceasefire_diplomacy"],
      },
      {
        id: "phase-2",
        name: "Interwar Period",
        startDate: "2025-07-01",
        endDate: "2026-02-27",
        description: "Iran expels IAEA, reconstitutes, domestic protests",
        dominantDynamics: ["sanctions", "diplomatic_pressure", "domestic_unrest"],
      },
      {
        id: "phase-3",
        name: "Operation Epic Fury",
        startDate: "2026-02-28",
        endDate: "ongoing",
        description: "Joint US-Israel decapitation strike, Ayatollah killed, Strait closed",
        dominantDynamics: ["air_campaign", "drone_attrition", "strait_closure"],
        triggerEvent: "evt-epic-fury-launch",
      },
    ],
    currentPhaseId: "phase-3",

    actors: [createUS(), createIran(), createIsrael(), createRussia()],

    relationships: createRelationships(),

    eventHistory: createEventHistory(),

    globalState: {
      oilPricePerBarrel: 142,
      oilPriceChange: "+94% since conflict began",
      globalStabilityIndex: 28,
      criticalAssets: [
        {
          name: "Strait of Hormuz",
          controlledBy: "iran",
          contestedBy: ["united_states"],
          globalImpact: "20% of world oil transits here",
          currentStatus: "blocked",
        },
      ],
      wildcards: [
        "Iran nuclear breakout (2 of 3 constraints removed)",
        "Gulf state alignment shift toward BRICS",
        "Russian opportunistic Ukraine offensive",
      ],
      globalEconomicEffects: [
        {
          description: "Global oil supply shock from Strait closure",
          affectedRegions: ["Asia", "Europe", "Global"],
          severity: 78,
        },
      ],
    },
  };
}

// ------------------------------------------------------------
// ACTORS
// ------------------------------------------------------------

function createUS(): Actor {
  return {
    id: "united_states",
    name: "United States",
    type: "nation_state",
    description: "Federal republic conducting war of choice for regime change",

    keyFigures: [
      {
        id: "trump",
        name: "Donald Trump",
        role: "President / Commander in Chief",
        status: "active",
        disposition: "hawk",
        influence: 95,
        description: "Pursuing regime change framing, politically invested in outcome",
        successionImpact: "VP Vance more restrained, would seek off-ramp",
      },
      {
        id: "rubio",
        name: "Marco Rubio",
        role: "Secretary of State",
        status: "active",
        disposition: "hawk",
        influence: 60,
        description: "Publicly supportive but showing private reservations",
      },
    ],

    state: createUSState(),

    objectives: [
      {
        id: "us-obj-1",
        description: "Regime change in Iran",
        priority: "existential",
        dimension: "political",
        successCondition: "Iranian government collapses or is replaced",
        failureCondition: "Iran survives with hardened anti-US stance",
        currentProgress: 15,
        tensions: ["Strait closure costs undermining domestic support"],
        warrantsFurtherEscalation: true,
      },
      {
        id: "us-obj-2",
        description: "Neutralize Iran nuclear capability",
        priority: "critical",
        dimension: "military",
        successCondition: "All enrichment facilities destroyed, IAEA verified",
        failureCondition: "Iran achieves nuclear breakout",
        currentProgress: 35,
        tensions: ["Dispersed uranium locations unknown"],
        warrantsFurtherEscalation: true,
      },
    ],

    capabilities: {
      strengths: [
        { dimension: "military", description: "Air superiority, precision strike", significance: 90 },
        { dimension: "economic", description: "Sanctions regime, dollar dominance", significance: 75 },
      ],
      limitations: [
        { dimension: "military", description: "Air defense munitions depleting rapidly", significance: 70 },
        { dimension: "political", description: "31% domestic support, no ground invasion authorization", significance: 80 },
      ],
    },

    constraints: [
      {
        dimension: "military",
        description: "No ground invasion without political authorization",
        severity: "soft",
        releaseCondition: "Homeland attack or mass casualty event",
        status: "active",
      },
      {
        dimension: "political",
        description: "Bipartisan congressional support required for major escalation",
        severity: "soft",
        status: "weakened",
        statusRationale: "Support eroding as casualties and costs mount",
      },
      {
        dimension: "military",
        description: "Occupation and territorial control requires new AUMF — current authorization does not cover sustained ground occupation",
        severity: "hard",
        releaseCondition: "Congressional declaration of war or new AUMF specifically authorizing occupation",
        overriddenAtEscalationRung: 7,
        status: "active",
      },
    ],

    decisionFactors: [
      {
        name: "AIPAC influence",
        description: "Israel lobby has 82/100 policy influence, bipartisan funding",
        impactOnDecisions: "Constrains diplomatic off-ramps; ensures continued Israel support",
      },
    ],

    escalation: {
      currentRung: 5,
      rungs: [
        { level: 1, name: "Diplomacy", description: "Negotiations, sanctions", exampleActions: ["Sanctions"], strategicLogic: "Achieve goals without military cost", politicalCost: 5, reversibility: "easy" },
        { level: 2, name: "Covert Ops", description: "Sabotage, assassinations", exampleActions: ["Cyber strikes"], strategicLogic: "Deniable pressure", politicalCost: 20, reversibility: "moderate" },
        { level: 3, name: "Limited Strikes", description: "Surgical strikes", exampleActions: ["Strike nuclear sites"], strategicLogic: "Degrade without full war", politicalCost: 40, reversibility: "difficult" },
        { level: 4, name: "Sustained Air Campaign", description: "Systematic degradation", exampleActions: ["Multi-week bombing"], strategicLogic: "Attrition without ground troops", politicalCost: 60, reversibility: "difficult" },
        { level: 5, name: "Full Air Campaign + Naval", description: "All-domain air/sea operations", exampleActions: ["Operation Midnight Hammer"], strategicLogic: "Maximum air power short of ground invasion", politicalCost: 75, reversibility: "difficult" },
        { level: 6, name: "Ground Invasion", description: "Boots on the ground", exampleActions: ["Coastal seizure"], strategicLogic: "Required for Strait control and regime change", politicalCost: 90, reversibility: "irreversible" },
        { level: 7, name: "Occupation", description: "Full territorial occupation", exampleActions: ["Tehran occupation"], strategicLogic: "Last resort for regime change", politicalCost: 95, reversibility: "irreversible" },
        { level: 8, name: "Nuclear", description: "Nuclear use", exampleActions: ["Nuclear strike"], strategicLogic: "Only if existential — never seriously contemplated", politicalCost: 100, reversibility: "irreversible" },
      ],
      escalationTriggers: [
        { fromRung: 5, toRung: 6, condition: "Strait remains closed beyond 60 days with no diplomatic solution", likelihood: 40, isEscalationSkip: false },
        { fromRung: 5, toRung: 8, condition: "Iranian nuclear device detonated", likelihood: 80, isEscalationSkip: true, skipRationale: "Massive retaliation doctrine" },
      ],
      deescalationConditions: [
        "Iran agrees to verified nuclear dismantlement",
        "Strait of Hormuz reopens",
        "New Iranian government signals readiness to negotiate",
      ],
    },

    // US INTELLIGENCE PICTURE — fog of war divergence
    intelligencePicture: [
      {
        aboutActorId: "iran",
        // US believes Iran is heavily degraded — WRONG (actual=58)
        believedMilitaryReadiness: 25,
        believedMilitaryReadinessConfidence: "moderate",
        believedNuclearStatus: "Partially neutralized — key sites destroyed",
        believedNuclearConfidence: "low",
        believedPoliticalStability: 45,
        believedPoliticalStabilityConfidence: "moderate",
        believedEscalationRung: 5,
        believedEscalationConfidence: "moderate",
        knownUnknowns: [
          "Location of dispersed enriched uranium",
          "Remaining ballistic missile stockpile",
          "Hypersonic missile capability",
        ],
        // US does NOT know these (only omniscient view sees them)
        unknownUnknowns: [
          "IRGC command structure more resilient than assessed — 31 autonomous commands survive decapitation",
          "Iran regime stability actually 68, not 45 — martyrdom narrative unifying population",
          "Russia sharing real-time US fleet positions with Iran",
        ],
        primaryIntSources: ["signals_intelligence", "satellite_imagery", "Israeli_HUMINT"],
        intelProviders: ["israel"],
      },
    ],
  };
}

function createUSState(): ActorState {
  return {
    military: {
      overallReadiness: 58,
      assets: [
        { category: "air_defense", name: "Patriot PAC-3", estimatedQuantity: 320, quality: 90, replenishmentRate: "slow", unitCost: 3000000, costRatio: "1 Patriot ($3M) vs 1 Shahed ($20K) = 150:1 cost disadvantage", depletionTrend: "depleting", notes: "Approx 180 expended in Turn 3", supplyChain: "Raytheon domestic production, 6-month lead time" },
        { category: "air_defense", name: "THAAD systems", estimatedQuantity: 2, quality: 95, replenishmentRate: "none", unitCost: 800000000, costRatio: undefined, depletionTrend: "critical", notes: "Was 7, now 2 operational — radar exposure from use", supplyChain: "Limited inventory, cannot replace in theater" },
        { category: "carrier", name: "Carrier Strike Groups", estimatedQuantity: 2, quality: 80, replenishmentRate: "slow", depletionTrend: "stable", notes: "USS Eisenhower + USS Lincoln deployed", supplyChain: "US Navy" },
        { category: "aircraft", name: "F-35A / F-15E", estimatedQuantity: 180, quality: 88, replenishmentRate: "slow", depletionTrend: "depleting", notes: "Operational sorties ongoing", supplyChain: "CONUS bases" },
        { category: "cruise_missile", name: "Tomahawk cruise missiles", estimatedQuantity: 400, quality: 92, replenishmentRate: "slow", depletionTrend: "depleting", notes: "Approx 400 remaining from ~800 initial", supplyChain: "Raytheon, 12-month production lead" },
      ],
      activeOperations: [
        { name: "Operation Midnight Hammer", type: "air_campaign", target: "iran", status: "ongoing", burnRate: "$500M/day", description: "Sustained air campaign against Iranian military and nuclear infrastructure" },
      ],
      vulnerabilities: [
        "Air defense munition depletion — Patriot at 42%, THAAD critical",
        "No ground forces positioned for invasion",
        "Carrier groups exposed to Iranian anti-ship missiles",
      ],
      nuclear: {
        capability: "confirmed",
        estimatedWarheads: 5500,
        deliveryMethods: ["ICBM", "SLBM", "B-52", "B-2"],
        useDoctrineDescription: "Last resort only — existential threat to US or allies",
        escalationRungForUse: 8,
        constraints: ["nuclear taboo", "international law", "mutual assured destruction"],
      },
    },
    economic: {
      overallHealth: 62,
      gdpEstimate: 27000000000000,
      keyVulnerabilities: ["$142/bbl oil crushing consumer confidence", "Midterm electoral pressure"],
      keyLeverages: ["Dollar dominance", "SWIFT control", "Sanctions architecture"],
      sanctionsExposure: 5,
      oilDependency: { asExporter: 10, asImporter: 40 },
      warCostTolerance: 70,
      energyInfrastructure: {
        oilProductionCapacity: "13M barrels/day",
        currentOutput: "13M barrels/day",
        criticalFacilities: [],
        exportRoutes: [],
        damageLevel: 0,
      },
    },
    political: {
      regimeStability: 72,
      leadershipCohesion: 65,
      governmentType: "Federal presidential republic",
      warPowersDescription: "AUMF covers current operations; ground invasion requires new congressional authorization",
      influenceChannels: [
        { name: "general_public", description: "Voting electorate", policyInfluence: 25, currentPosition: "31% support war; protests growing", supportForCurrentPolicy: 31, leverageMechanisms: ["elections", "protests"], overrideCost: "Midterm losses; bipartisan consensus means no electoral alternative", precedent: "Vietnam: public opposition took 7+ years to force withdrawal" },
        { name: "israel_lobby", description: "AIPAC and aligned organizations", policyInfluence: 82, currentPosition: "Full support for continued operations", supportForCurrentPolicy: 95, leverageMechanisms: ["campaign_funding", "primary_challenges", "media_narratives"], overrideCost: "Primary challenges, funding loss, media attacks" },
        { name: "defense_establishment", description: "Pentagon, Joint Chiefs, contractors", policyInfluence: 70, currentPosition: "Operationally supportive but concerned about munition depletion and Pacific exposure", supportForCurrentPolicy: 60, leverageMechanisms: ["budget_requests", "classified_briefings", "retired_general_commentary"], overrideCost: "Difficult — civilian control of military is strong" },
      ],
      policyDisconnect: {
        gapSeverity: 71,
        estimatedToleranceDuration: "12-18 months before midterm pressure forces shift",
        breakingPoints: ["US military casualties crossing 500", "Oil at $200/barrel", "Draft discussion"],
        oppositionAlternative: "Democrats equally hawkish on Israel — no real alternative",
        bipartisanConsensus: true,
        bipartisanDescription: "Both parties receive AIPAC funding; both support Israel",
      },
      pressurePoints: ["Midterm elections in 8 months", "Kent resignation creating media narrative", "Rubio showing doubt"],
    },
    diplomatic: {
      internationalStanding: 38,
      activeNegotiations: [],
      allianceStrength: 55,
      isolationRisk: 45,
    },
    intelligence: {
      signalCapability: 90,
      humanCapability: 65,
      cyberCapability: 88,
      blindSpots: ["Dispersed uranium locations", "IRGC autonomous command resilience"],
      exposureLevel: 35,
      intelSharingPartners: [{ actorId: "israel", description: "Deep HUMINT sharing, real-time targeting data" }],
    },
  };
}

function createIran(): Actor {
  return {
    id: "iran",
    name: "Islamic Republic of Iran",
    type: "nation_state",
    description: "Theocratic republic employing asymmetric attrition strategy; 'just survive' win condition",

    keyFigures: [
      {
        id: "mojtaba",
        name: "Mojtaba Khamenei",
        role: "Acting Supreme Leader",
        status: "active",
        disposition: "hardliner",
        influence: 90,
        description: "Son of killed Ayatollah; praised Houthis; more hardline than father on nuclear question",
        successionImpact: "Already in power — succession complete; likely to authorize nuclear breakout",
      },
    ],

    state: {
      military: {
        // ACTUAL readiness 58 — US believes it is 25
        overallReadiness: 58,
        assets: [
          { category: "drone", name: "Shahed-136 drones", estimatedQuantity: 4000, quality: 60, replenishmentRate: "fast", unitCost: 20000, costRatio: "1 Shahed ($20K) vs 1 Patriot ($3M) = 150:1 cost advantage", depletionTrend: "replenishing", notes: "Domestic production rate ~200/week", supplyChain: "Iranian domestic production" },
          { category: "ballistic_missile", name: "Ballistic missiles (Shahab/Emad)", estimatedQuantity: 800, quality: 72, replenishmentRate: "slow", depletionTrend: "depleting", notes: "Approx 400 expended; 800 remaining estimated", supplyChain: "Domestic + North Korean components" },
          { category: "anti_ship", name: "Anti-ship missiles (Noor/Khalij Fars)", estimatedQuantity: 300, quality: 78, replenishmentRate: "slow", depletionTrend: "stable", notes: "Primary threat to carrier groups", supplyChain: "Domestic production" },
        ],
        activeOperations: [
          { name: "Drone Attrition Campaign", type: "air_attack", target: "united_states", status: "succeeding", burnRate: "$50M/day (US interception cost)", description: "Sustained drone swarm forcing US to expend expensive interceptors" },
          { name: "Strait of Hormuz Closure", type: "naval_blockade", target: "global_shipping", status: "ongoing", burnRate: "$5M/day", description: "Mine threat + drone threat to commercial shipping" },
        ],
        vulnerabilities: ["Air defense largely destroyed", "Command posts attrited", "Surface navy limited"],
        nuclear: {
          capability: "threshold",
          estimatedWarheads: 0,
          deliveryMethods: ["ballistic_missile"],
          useDoctrineDescription: "Breakout now rational — religious and deterrence constraints both removed",
          escalationRungForUse: 7,
          constraints: [
            // Religious constraint REMOVED (Ayatollah dead)
            // Deterrence constraint REMOVED (already being attacked)
          ],
        },
      },
      economic: {
        overallHealth: 28,
        keyVulnerabilities: ["Hyperinflation", "Sanctions isolation", "Oil export disrupted"],
        keyLeverages: ["Strait of Hormuz", "Oil price spike benefits from disruption", "Selective yuan-for-oil trade"],
        sanctionsExposure: 90,
        oilDependency: { asExporter: 85, asImporter: 0 },
        warCostTolerance: 65,
        energyInfrastructure: {
          oilProductionCapacity: "3.5M barrels/day",
          currentOutput: "1.2M barrels/day",
          criticalFacilities: [
            { name: "Kharg Island terminal", owner: "iran", status: "damaged", globalSignificance: "90% of Iran oil exports", strikeHistory: ["US strike Turn 3"] },
          ],
          exportRoutes: [
            {
              name: "Strait of Hormuz",
              status: "blocked",
              controlledBy: "iran",
              globalImpact: "20% of world oil transits here",
              blockadeMethod: "Mine threat + drone threat to commercial shipping",
              breakingCost: "Requires ground occupation of Iranian coast",
              mineThreat: { level: "high", estimatedMinesPlaced: 200, clearingTimeline: "3-6 months minimum even after military threat removed", mineTypes: ["contact", "influence"], clearingAssetsAvailable: "US MCM fleet limited; allies refused to contribute" },
              selectivePassage: { allowedFlags: ["Chinese", "Turkish", "Indian"], conditions: "Cargo traded in yuan", volumeGettingThrough: "8 non-Iranian vessels detected Monday" },
            },
          ],
          damageLevel: 65,
        },
      },
      political: {
        regimeStability: 68,
        leadershipCohesion: 78,
        governmentType: "Theocratic republic — Supreme Leader above elected branches",
        warPowersDescription: "Supreme Leader has sole authority over military operations and nuclear decisions",
        influenceChannels: [
          { name: "irgc", description: "Islamic Revolutionary Guard Corps — parallel military with domestic power", policyInfluence: 85, currentPosition: "Hardline — advocate for nuclear breakout and continued attrition", supportForCurrentPolicy: 90, leverageMechanisms: ["military_control", "economic_enterprises", "intelligence"], overrideCost: "Cannot override IRGC — they enforce the regime" },
        ],
        policyDisconnect: { gapSeverity: 20, estimatedToleranceDuration: "Indefinite under wartime conditions", breakingPoints: ["Regime collapse", "Military coup"], oppositionAlternative: "No viable opposition — Jan 2026 massacre eliminated protest leadership", bipartisanConsensus: true },
        pressurePoints: ["Martyrdom narrative may be sustaining rather than destabilizing regime"],
      },
      diplomatic: { internationalStanding: 22, activeNegotiations: [], allianceStrength: 30, isolationRisk: 80 },
      intelligence: {
        signalCapability: 55,
        humanCapability: 70,
        cyberCapability: 60,
        blindSpots: ["US carrier group exact positions", "Israeli strike planning"],
        exposureLevel: 60,
        intelSharingPartners: [
          { actorId: "russia", description: "Russia providing real-time US fleet position data — mirrors US support for Ukraine" },
        ],
      },
    },

    objectives: [
      {
        id: "iran-obj-1",
        description: "Regime survival — just survive as a state",
        priority: "existential",
        dimension: "political",
        successCondition: "Government intact, war ends without regime change",
        failureCondition: "Regime collapses or is removed by force",
        currentProgress: 60,
        tensions: ["Nuclear breakout may invite Israeli nuclear response"],
        warrantsFurtherEscalation: true,
      },
    ],

    capabilities: {
      strengths: [
        { dimension: "military", description: "Asymmetric drone attrition — 150:1 cost advantage", significance: 85 },
        { dimension: "economic", description: "Strait of Hormuz leverage — global oil chokepoint", significance: 90 },
      ],
      limitations: [
        { dimension: "military", description: "Air defense destroyed, surface navy limited", significance: 75 },
      ],
    },

    constraints: [
      {
        dimension: "military",
        description: "Religious prohibition on nuclear weapons (Ayatollah's fatwa)",
        severity: "hard",
        status: "removed",
        statusRationale: "Ayatollah Khamenei killed in Operation Epic Fury Feb 28",
        removedByEventId: "evt-ayatollah-killed",
        enabledActions: ["nuclear_breakout_now_rational"],
      },
      {
        dimension: "military",
        description: "Nuclear deterrence constraint — fear of massive retaliation",
        severity: "hard",
        status: "removed",
        statusRationale: "Attack already occurring — deterrence failed; breakout may be only survival option",
        removedByEventId: "evt-epic-fury-launch",
        enabledActions: ["nuclear_breakout_now_rational"],
      },
    ],

    decisionFactors: [
      {
        name: "Martyrdom culture",
        description: "Ayatollah's death may unify rather than destabilize — martyrdom narrative",
        impactOnDecisions: "Decapitation strikes may backfire; resilience higher than US assesses",
        escalationEffect: "Hardline successor more likely to authorize nuclear breakout",
      },
    ],

    escalation: {
      currentRung: 6,
      rungs: [
        { level: 1, name: "Diplomacy", description: "Negotiations", exampleActions: ["JCPOA negotiations"], strategicLogic: "Buy time, reduce isolation", politicalCost: 5, reversibility: "easy" },
        { level: 2, name: "Proxy Pressure", description: "Hezbollah, Houthis, IRI activation", exampleActions: ["Houthi attacks"], strategicLogic: "Deniable cost imposition", politicalCost: 15, reversibility: "moderate" },
        { level: 3, name: "Cyber + Covert", description: "Cyber attacks, assassinations", exampleActions: ["Stuxnet-style retaliation"], strategicLogic: "Deniable escalation", politicalCost: 25, reversibility: "moderate" },
        { level: 4, name: "Missile Salvos", description: "Ballistic missile strikes", exampleActions: ["Strike Israeli bases"], strategicLogic: "Demonstrate reach and resolve", politicalCost: 50, reversibility: "difficult" },
        { level: 5, name: "Drone Attrition", description: "Sustained drone campaign", exampleActions: ["Daily Shahed waves"], strategicLogic: "Win the accountant's war — exhaust interceptors", politicalCost: 40, reversibility: "moderate" },
        { level: 6, name: "Strait Closure + Oil War", description: "Block Strait, strike Gulf oil", exampleActions: ["Ras Tanura strike", "Mine Strait"], strategicLogic: "Impose global economic pain — make war too costly", politicalCost: 60, reversibility: "difficult" },
        { level: 7, name: "Nuclear Breakout", description: "Rush to build device", exampleActions: ["Enrich to weapons grade", "Device assembly"], strategicLogic: "Ultimate deterrent — nuclear-armed Iran forces ceasefire", politicalCost: 85, reversibility: "irreversible" },
      ],
      escalationTriggers: [
        { fromRung: 6, toRung: 7, condition: "Ground invasion begins OR regime survival appears imminent", likelihood: 55, isEscalationSkip: false },
      ],
      deescalationConditions: [
        "US agrees to halt operations and negotiate",
        "Security guarantees that prevent regime change",
      ],
    },

    intelligencePicture: [
      {
        aboutActorId: "united_states",
        believedMilitaryReadiness: 72,
        believedMilitaryReadinessConfidence: "high",
        believedNuclearStatus: "Full nuclear capability, will not use",
        believedNuclearConfidence: "confirmed",
        believedPoliticalStability: 65,
        believedPoliticalStabilityConfidence: "moderate",
        believedEscalationRung: 5,
        believedEscalationConfidence: "high",
        knownUnknowns: ["Ground invasion timeline", "Air defense remaining stocks exact count"],
        unknownUnknowns: [],
        primaryIntSources: ["Russian_intelligence", "open_source", "proxy_networks"],
        intelProviders: ["russia"],
      },
    ],
  };
}

function createIsrael(): Actor {
  return {
    id: "israel",
    name: "State of Israel",
    type: "nation_state",
    description: "Existential framing, multi-front war, nuclear option as last resort",
    keyFigures: [
      { id: "netanyahu", name: "Benjamin Netanyahu", role: "Prime Minister", status: "active", disposition: "hawk", influence: 88, description: "Architect of Operation Epic Fury; called Trump on Feb 23 to share Khamenei location" },
    ],
    state: createIsraelState(),
    objectives: [
      { id: "il-obj-1", description: "Permanent elimination of Iranian nuclear threat", priority: "existential", dimension: "military", successCondition: "Iran cannot produce nuclear weapons for 10+ years", failureCondition: "Iran achieves nuclear weapon", currentProgress: 35, tensions: ["Nuclear breakout cascade forming"], warrantsFurtherEscalation: true },
    ],
    capabilities: {
      strengths: [{ dimension: "military", description: "Air force quality, precision strike, nuclear deterrent", significance: 88 }],
      limitations: [{ dimension: "military", description: "Multi-front stress (Iran + Lebanon + Gaza)", significance: 70 }],
    },
    constraints: [
      { dimension: "economic", description: "March 31 budget deadline — coalition may collapse without budget passage", severity: "hard", status: "active" },
    ],
    decisionFactors: [
      { name: "Existential framing", description: "Nuclear Iran framed as existential — justifies extreme measures", impactOnDecisions: "Higher risk tolerance than any other actor", escalationEffect: "Nuclear breakout by Iran would trigger Israeli preemptive nuclear consideration" },
    ],
    escalation: {
      currentRung: 6,
      rungs: [
        { level: 1, name: "Diplomacy", description: "Negotiations", exampleActions: ["Abraham Accords"], strategicLogic: "Normalize without addressing Iran", politicalCost: 5, reversibility: "easy" },
        { level: 6, name: "Full air campaign", description: "Joint strikes with US", exampleActions: ["Operation Epic Fury"], strategicLogic: "Degrade Iran maximally", politicalCost: 70, reversibility: "difficult" },
        { level: 7, name: "Nuclear first strike", description: "Preemptive nuclear use against Iran nuclear program", exampleActions: ["Nuclear strike on Fordow"], strategicLogic: "Last resort if Iran achieves nuclear weapon", politicalCost: 95, reversibility: "irreversible" },
      ],
      escalationTriggers: [
        { fromRung: 6, toRung: 7, condition: "Iran announces nuclear device or test", likelihood: 70, isEscalationSkip: true, skipRationale: "Existential threat triggers preemptive nuclear doctrine" },
      ],
      deescalationConditions: ["Verified Iranian nuclear dismantlement"],
    },
    intelligencePicture: [
      {
        aboutActorId: "iran",
        believedMilitaryReadiness: 30,
        believedMilitaryReadinessConfidence: "high",
        believedNuclearStatus: "2 of 3 constraints removed — breakout possible in 4-8 months",
        believedNuclearConfidence: "moderate",
        believedPoliticalStability: 55,
        believedPoliticalStabilityConfidence: "moderate",
        believedEscalationRung: 6,
        believedEscalationConfidence: "high",
        knownUnknowns: ["Enriched uranium dispersal locations — IAEA cannot account for stockpile"],
        unknownUnknowns: [],
        primaryIntSources: ["HUMINT", "signals_intelligence", "Mossad_networks"],
        intelProviders: [],
      },
    ],
  };
}

function createIsraelState(): ActorState {
  return {
    military: {
      overallReadiness: 72,
      assets: [
        { category: "aircraft", name: "F-35I Adir", estimatedQuantity: 50, quality: 95, replenishmentRate: "slow", depletionTrend: "stable", notes: "Primary strike platform", supplyChain: "US supply, some risk if relations strain" },
        { category: "air_defense", name: "Iron Dome batteries", estimatedQuantity: 10, quality: 88, replenishmentRate: "slow", depletionTrend: "depleting", notes: "Stressed by multi-front threat", supplyChain: "US-Israel joint production" },
      ],
      activeOperations: [
        { name: "Multi-front operations", type: "air_campaign", target: "iran", status: "ongoing", burnRate: "$150M/day", description: "Coordinated with US on Iran; also maintaining Lebanon + Gaza fronts" },
      ],
      vulnerabilities: ["Three-front overextension", "THAAD systems nearly depleted in theater"],
      nuclear: { capability: "unconfirmed", estimatedWarheads: 90, deliveryMethods: ["aircraft", "submarine_launched"], useDoctrineDescription: "Last resort — existential threat. Iran nuclear weapon would trigger consideration.", escalationRungForUse: 7, constraints: ["Ambiguity policy", "International pressure"] },
    },
    economic: { overallHealth: 55, keyVulnerabilities: ["March 31 budget deadline", "War costs"], keyLeverages: ["US aid", "Tech sector"], sanctionsExposure: 0, oilDependency: { asExporter: 0, asImporter: 60 }, warCostTolerance: 75, energyInfrastructure: { oilProductionCapacity: "0", currentOutput: "0", criticalFacilities: [], exportRoutes: [], damageLevel: 0 } },
    political: { regimeStability: 60, leadershipCohesion: 65, governmentType: "Parliamentary democracy", warPowersDescription: "Coalition government — March 31 budget deadline is existential political constraint", influenceChannels: [{ name: "security_establishment", description: "IDF and Mossad", policyInfluence: 80, currentPosition: "Support operations but concerned about three-front overextension", supportForCurrentPolicy: 72, leverageMechanisms: ["military_advice", "public_statements"], overrideCost: "Significant — public trusts military establishment" }], policyDisconnect: { gapSeverity: 25, estimatedToleranceDuration: "Until budget deadline March 31", breakingPoints: ["Coalition collapse at budget deadline"], oppositionAlternative: "Opposition would continue war but may seek ceasefire on Lebanon front", bipartisanConsensus: false }, pressurePoints: ["March 31 budget deadline — coalition survival"] },
    diplomatic: { internationalStanding: 30, activeNegotiations: [], allianceStrength: 70, isolationRisk: 55 },
    intelligence: { signalCapability: 85, humanCapability: 90, cyberCapability: 82, blindSpots: ["Uranium dispersal locations"], exposureLevel: 30, intelSharingPartners: [{ actorId: "united_states", description: "Deep bilateral intel sharing" }] },
  };
}

function createRussia(): Actor {
  return {
    id: "russia",
    name: "Russian Federation",
    type: "nation_state",
    description: "Opportunistic beneficiary — intel provider to Iran, oil windfall, Ukraine pressure relief",
    keyFigures: [
      { id: "putin", name: "Vladimir Putin", role: "President", status: "active", disposition: "pragmatist", influence: 95, description: "Strategically patient — exploiting US overextension. Not driving conflict but benefiting maximally." },
    ],
    state: {
      military: { overallReadiness: 55, assets: [], activeOperations: [{ name: "Ukraine offensive", type: "ground_campaign", target: "ukraine", status: "ongoing", burnRate: "$300M/day", description: "Accelerating operations while US focused on Iran" }], vulnerabilities: ["Overextended in Ukraine", "Attrited conventional forces"], nuclear: { capability: "confirmed", estimatedWarheads: 6200, deliveryMethods: ["ICBM", "SLBM", "bomber"], useDoctrineDescription: "Escalate to de-escalate doctrine", escalationRungForUse: 6, constraints: ["MAD", "NATO Article 5"] } },
      economic: { overallHealth: 52, keyVulnerabilities: ["Sanctions isolation", "Ruble weakness"], keyLeverages: ["Oil revenue windfall from $142/bbl", "Gas leverage on Europe"], sanctionsExposure: 75, oilDependency: { asExporter: 70, asImporter: 0 }, warCostTolerance: 65, energyInfrastructure: { oilProductionCapacity: "10M barrels/day", currentOutput: "9M barrels/day", criticalFacilities: [], exportRoutes: [], damageLevel: 0 } },
      political: { regimeStability: 72, leadershipCohesion: 80, governmentType: "Authoritarian presidential system", warPowersDescription: "Putin has sole authority", influenceChannels: [], policyDisconnect: { gapSeverity: 30, estimatedToleranceDuration: "Indefinite while war appears successful", breakingPoints: ["Mass casualties", "Economic collapse"], oppositionAlternative: "No viable opposition", bipartisanConsensus: true }, pressurePoints: [] },
      diplomatic: { internationalStanding: 25, activeNegotiations: [], allianceStrength: 35, isolationRisk: 65 },
      intelligence: { signalCapability: 82, humanCapability: 78, cyberCapability: 80, blindSpots: [], exposureLevel: 40, intelSharingPartners: [{ actorId: "iran", description: "Sharing real-time US fleet positions — strategic value in weakening US globally" }] },
    },
    objectives: [
      { id: "ru-obj-1", description: "Exploit US overextension to advance in Ukraine", priority: "critical", dimension: "military", successCondition: "Significant territorial gains while US is committed to Iran", failureCondition: "NATO intervenes or US pivots back to Ukraine focus", currentProgress: 45, tensions: [], warrantsFurtherEscalation: false },
    ],
    capabilities: { strengths: [{ dimension: "intelligence", description: "Real-time US fleet data sharing with Iran", significance: 80 }], limitations: [{ dimension: "military", description: "Conventional forces attrited in Ukraine", significance: 65 }] },
    constraints: [{ dimension: "military", description: "Avoid direct NATO confrontation", severity: "hard", status: "active" }],
    decisionFactors: [{ name: "Strategic patience", description: "Russia benefits most by watching without direct involvement", impactOnDecisions: "Maximize intel support to Iran; avoid escalation that forces US-Russia direct confrontation" }],
    escalation: {
      currentRung: 1,
      rungs: [
        { level: 1, name: "Covert support", description: "Intelligence sharing, technical support", exampleActions: ["Share US fleet data with Iran"], strategicLogic: "Maximum benefit at minimum risk", politicalCost: 10, reversibility: "easy" },
        { level: 3, name: "Material support", description: "Weapons transfer to Iran", exampleActions: ["Transfer S-400 systems"], strategicLogic: "Shift military balance without direct involvement", politicalCost: 50, reversibility: "difficult" },
      ],
      escalationTriggers: [{ fromRung: 1, toRung: 3, condition: "Iran on verge of regime collapse and requests material support", likelihood: 30, isEscalationSkip: false }],
      deescalationConditions: ["US withdraws from Iran", "Nuclear escalation risk becomes too high"],
    },
    intelligencePicture: [
      {
        aboutActorId: "united_states",
        believedMilitaryReadiness: 60,
        believedMilitaryReadinessConfidence: "high",
        believedNuclearStatus: "Full capability, will not use in Iran context",
        believedNuclearConfidence: "confirmed",
        believedPoliticalStability: 58,
        believedPoliticalStabilityConfidence: "high",
        believedEscalationRung: 5,
        believedEscalationConfidence: "high",
        knownUnknowns: ["Trump's red lines for ground invasion"],
        unknownUnknowns: [],
        primaryIntSources: ["SIGINT", "human_networks", "satellite"],
        intelProviders: [],
      },
    ],
  };
}

// ------------------------------------------------------------
// RELATIONSHIPS
// ------------------------------------------------------------

function createRelationships(): Relationship[] {
  return [
    {
      actorA: "united_states",
      actorB: "israel",
      type: "ally",
      strength: 85,
      mutualInterests: ["Iran nuclear elimination", "Regional stability on US terms"],
      frictions: ["Netanyahu called Trump to share Khamenei location — questions about who is driving policy"],
      volatility: 20,
      shiftTriggers: ["Israeli nuclear use", "US casualty threshold crossed"],
      description: "Core alliance but with Israel driving US strategy more than vice versa",
      warImpact: "Strengthened operationally; AIPAC influence ensuring political support despite 69% US public opposition",
    },
    {
      actorA: "united_states",
      actorB: "iran",
      type: "adversary",
      strength: 5,
      mutualInterests: [],
      frictions: ["Strikes came 1 day after diplomatic breakthrough — Iranian trust in US negotiations at zero"],
      volatility: 80,
      shiftTriggers: ["New Iranian government", "US regime change objective abandoned"],
      description: "Active war — no diplomatic contact",
      warImpact: "All channels closed; zero trust after Feb 27 diplomacy followed by Feb 28 strike",
    },
    {
      actorA: "russia",
      actorB: "iran",
      type: "patron",
      strength: 65,
      mutualInterests: ["US overextension", "Dollar weaponization resistance", "Multipolar order"],
      frictions: ["Russia wants Iran weakened enough to need Russia, not collapsed"],
      volatility: 35,
      shiftTriggers: ["Iranian nuclear breakout (Russia doesn't want nuclear proliferation)", "Iranian regime collapse"],
      description: "Strategic alignment without formal alliance — Russia benefits from Iran as US distraction",
      warImpact: "Deepening — Russia sharing fleet positions, taking oil windfall",
    },
  ];
}

// ------------------------------------------------------------
// EVENT HISTORY
// ------------------------------------------------------------

function createEventHistory(): Event[] {
  return [
    {
      id: "evt-epic-fury-launch",
      timestamp: "2026-02-28T02:00:00Z",
      title: "Operation Epic Fury — Joint US-Israel strike launched",
      description: "One day after Oman announced diplomatic breakthrough, joint strikes launched. Ayatollah Khamenei killed.",
      initiatedBy: "united_states",
      targetedActors: ["iran"],
      dimension: "military",
      impacts: [
        { actorId: "iran", dimension: "military", field: "state.military.overallReadiness", previousValue: 72, newValue: 58, description: "Military infrastructure attrited by initial strikes", magnitude: "major" },
        { actorId: "iran", dimension: "political", field: "keyFigures[ayatollah].status", previousValue: "active", newValue: "killed", description: "Ayatollah Khamenei killed in bunker strike", magnitude: "critical" },
      ],
      escalationChanges: [
        { actorId: "united_states", previousRung: 3, newRung: 5, rationale: "Full air campaign launched" },
        { actorId: "iran", previousRung: 3, newRung: 5, rationale: "Responding to existential attack" },
      ],
      intelConsequences: [
        { actorId: "united_states", concealed: "Uranium dispersal to unknown locations begins" },
      ],
    },
    {
      id: "evt-ayatollah-killed",
      timestamp: "2026-02-28T03:30:00Z",
      title: "Ayatollah Khamenei killed — nuclear constraint removed",
      description: "Supreme Leader killed. Religious prohibition on nuclear weapons (his personal fatwa) dies with him.",
      initiatedBy: "united_states",
      targetedActors: ["iran"],
      dimension: "military",
      impacts: [
        { actorId: "iran", dimension: "military", field: "constraints[religious_nuclear]", previousValue: "active", newValue: "removed", description: "Fatwa against nuclear weapons died with Ayatollah", magnitude: "critical" },
      ],
      escalationChanges: [],
      intelConsequences: [],
    },
    {
      id: "evt-strait-closure",
      timestamp: "2026-03-05T00:00:00Z",
      title: "Iran closes Strait of Hormuz",
      description: "IRGC announces Strait closed to all non-allied shipping. Mine threat + drone threat. Oil +40% overnight.",
      initiatedBy: "iran",
      targetedActors: ["united_states", "israel"],
      dimension: "economic",
      impacts: [
        { actorId: "iran", dimension: "economic", field: "globalState.oilPrice", previousValue: 73, newValue: 104, description: "Oil price spiked on Strait closure", magnitude: "critical", thirdPartyEffects: [{ actorId: "russia", description: "Oil windfall — revenue surges at $104/bbl" }] },
      ],
      escalationChanges: [
        { actorId: "iran", previousRung: 5, newRung: 6, rationale: "Strait closure is rung 6 action — economic warfare" },
      ],
      intelConsequences: [],
    },
    {
      id: "evt-ras-tanura-strike",
      timestamp: "2026-03-15T14:00:00Z",
      title: "Iran strikes Ras Tanura — Gulf oil war begins",
      description: "Ballistic missiles strike Saudi Arabia's Ras Tanura facility. Oil output reduced 15%. Dubai housing -30%.",
      initiatedBy: "iran",
      targetedActors: ["united_states"],
      dimension: "economic",
      impacts: [
        { actorId: "iran", dimension: "economic", field: "globalState.oilPrice", previousValue: 104, newValue: 142, description: "Ras Tanura strike + drone campaign pushed oil to $142", magnitude: "critical", thirdPartyEffects: [{ actorId: "russia", description: "Further oil windfall — revenue at record levels" }] },
      ],
      escalationChanges: [],
      intelConsequences: [],
    },
    {
      id: "evt-covert-by-russia",
      timestamp: "2026-03-10T00:00:00Z",
      title: "Russia begins sharing US fleet positions with Iran",
      description: "Covert intel sharing — Russia providing real-time carrier group positions to Iran. US does not know.",
      initiatedBy: "russia",
      targetedActors: [],  // covert — targeted actors not public
      dimension: "intelligence",
      impacts: [
        { actorId: "iran", dimension: "intelligence", field: "intelligencePicture[us].believedMilitaryReadiness", previousValue: 70, newValue: 72, description: "Iran now has better picture of US fleet positions", magnitude: "moderate" },
      ],
      escalationChanges: [],
      intelConsequences: [
        { actorId: "united_states", concealed: "Russia intel sharing with Iran — US does not know this is happening" },
      ],
    },
  ];
}

// ------------------------------------------------------------
// MOCK DECISIONS
// ------------------------------------------------------------

export function createMockDecisions(actorId: string): Decision[] {
  const base = {
    actorId,
    prerequisites: [],
    projectedOutcomes: [],
    advancesObjectives: [],
    risksObjectives: [],
    violatesConstraints: [],
    strategicRationale: "Mock decision",
    intelRequirements: [],
    actorAssessment: "Expected outcome",
    costs: [],
    isEscalation: false,
    isDeescalation: false,
  };

  return [
    {
      ...base,
      id: "dec-air-campaign",
      title: "Intensify air campaign",
      description: "Continue sustained bombing of military targets",
      dimension: "military",
      escalationRung: 5,
      isEscalation: false,
      resourceWeight: "heavy",
      compatibleWith: ["dec-sanctions"],
      incompatibleWith: ["dec-ceasefire"],
      synergiesWith: [{ decisionCategory: "ground_op", bonus: "Reduced ground casualties from air prep" }],
    },
    {
      ...base,
      id: "dec-ground-op",
      title: "Launch coastal ground operation",
      description: "Seize Iranian coastline along Strait",
      dimension: "military",
      escalationRung: 6,
      isEscalation: true,
      violatesConstraints: ["no_ground_invasion_without_authorization"],
      resourceWeight: "total",
      compatibleWith: [],
      incompatibleWith: ["dec-ceasefire", "dec-air-campaign"],
      synergiesWith: [],
    },
    {
      ...base,
      id: "dec-sanctions",
      title: "Tighten sanctions on Iranian allies",
      description: "Secondary sanctions on Russia and China for supporting Iran",
      dimension: "economic",
      escalationRung: 3,
      isEscalation: false,
      resourceWeight: "light",
      compatibleWith: ["dec-air-campaign"],
      incompatibleWith: [],
      synergiesWith: [],
    },
    {
      ...base,
      id: "dec-ceasefire",
      title: "Propose ceasefire via backchannel",
      description: "Diplomatic off-ramp through Oman or Qatar",
      dimension: "diplomatic",
      escalationRung: 1,
      isDeescalation: true,
      resourceWeight: "light",
      compatibleWith: [],
      incompatibleWith: ["dec-air-campaign", "dec-ground-op"],
      synergiesWith: [],
    },
    {
      ...base,
      id: "dec-intel-op",
      title: "Covert intelligence operation",
      description: "Targeted HUMINT operation to locate uranium caches",
      dimension: "intelligence",
      escalationRung: 2,
      resourceWeight: "moderate",
      compatibleWith: ["dec-air-campaign", "dec-sanctions"],
      incompatibleWith: [],
      synergiesWith: [],
    },
  ];
}

export function createMockTurnPlan(actorId: string): TurnPlan {
  return {
    actorId,
    primaryAction: {
      decisionId: "dec-air-campaign",
      selectedProfile: null,
      resourcePercent: 70,
    },
    concurrentActions: [
      {
        decisionId: "dec-sanctions",
        selectedProfile: null,
        resourcePercent: 30,
      },
    ],
  };
}
