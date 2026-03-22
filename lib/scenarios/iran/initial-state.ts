// ============================================================
// IRAN CONFLICT SCENARIO — VERIFIED INITIAL STATE
// Operation Epic Fury — Day 19 branching point (March 19, 2026)
//
// Sources:
//   docs/Iran Research/research-military.md
//   docs/Iran Research/research-political.md
//   docs/Iran Research/research-economic.md
//
// Only fields with verified values from the research docs are populated.
// The research pipeline fills in remaining fields (escalation ladders,
// fog of war, full objectives, decision factors, etc.)
// ============================================================

import type {
  Actor,
  ActorState,
  Constraint,
  GlobalAsset,
  GlobalState,
  KeyFigure,
  Relationship,
  ScenarioPhase,
} from '../../types/simulation'

// DeepPartial utility — allows partial nesting without fighting TS for seed data
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Minimal shape for the seed scenario (avoids requiring every field of Scenario)
export interface IranInitialState {
  name: string
  description: string
  timestamp: string
  backgroundContext: string
  phases: ScenarioPhase[]
  currentPhaseId: string
  actors: DeepPartial<Actor>[]
  relationships: DeepPartial<Relationship>[]
  globalState: GlobalState
}

// ── KEY FIGURES ──────────────────────────────────────────────

const US_KEY_FIGURES: KeyFigure[] = [
  {
    id: 'trump',
    name: 'Donald Trump',
    role: 'President / Commander in Chief',
    status: 'active',
    disposition: 'hawk',
    influence: 90,
    description:
      'Authorized Operation Epic Fury Feb 28. Public framing: regime change. ' +
      'Claimed US "totally obliterated every military target" on Kharg Island (March 13). ' +
      'Faces declining approval amid low public support for war.',
    successionImpact: 'Vance is less hawkish on Middle East entanglement; would likely seek exit ramp.',
  },
  {
    id: 'rubio',
    name: 'Marco Rubio',
    role: 'Secretary of State',
    status: 'active',
    disposition: 'hawk-wavering',
    influence: 55,
    description:
      'Initially hawkish. By Day 18 press conference used phrase "Israel\'s security objectives" ' +
      'three times without saying "America\'s" — noted by Washington reporters as signal of doubt.',
    successionImpact: 'Would likely seek negotiated off-ramp if given cover.',
  },
  {
    id: 'kent',
    name: 'Joe Kent',
    role: 'Director of Counterterrorism (resigned)',
    status: 'resigned',
    disposition: 'dove',
    influence: 0,
    description:
      'Resigned publicly stating war serves Israel\'s interests, not America\'s. ' +
      'First senior official to break ranks. Created political cover for further dissent.',
    successionImpact: 'Resignation signals fracture in MAGA foreign policy coalition.',
  },
]

const IRAN_KEY_FIGURES: KeyFigure[] = [
  {
    id: 'ali_khamenei',
    name: 'Ali Khamenei',
    role: 'Supreme Leader (deceased)',
    status: 'killed',
    disposition: 'hardliner',
    influence: 0,
    description:
      'Killed Day 1 (Feb 28, 2026) in joint US-Israel decapitation strike on his bunker. ' +
      'Death one day after Oman announced diplomatic breakthrough. ' +
      'Had issued fatwa against nuclear weapons — death removed this constraint.',
    successionImpact:
      'Son Mojtaba is more hardline. Nuclear fatwa no longer binding. ' +
      'IRGC consolidated power. Martyrdom narrative strengthens regime domestically.',
  },
  {
    id: 'mojtaba_khamenei',
    name: 'Mojtaba Khamenei',
    role: 'Supreme Leader (elected March 8)',
    status: 'active',
    disposition: 'hardliner',
    influence: 75,
    description:
      'Elected Supreme Leader March 8, 2026. More hardline than his father. ' +
      'Praised Houthi attacks. Possibly incapacitated or in Moscow per US intelligence. ' +
      'IRGC effectively governing in his name.',
    successionImpact: 'No successor identified. IRGC assumes full control if incapacitated.',
  },
  {
    id: 'araghchi',
    name: 'Abbas Araghchi',
    role: 'Foreign Minister',
    status: 'active',
    disposition: 'pragmatist',
    influence: 35,
    description:
      'Admitted March 1: "Our military units are now, in fact, independent and somewhat isolated, ' +
      'and they are acting based on general instructions given to them in advance." ' +
      'Potential back-channel conduit if negotiations resume.',
  },
  {
    id: 'vahidi',
    name: 'Ahmad Vahidi',
    role: 'IRGC Commander-in-Chief',
    status: 'active',
    disposition: 'hardliner',
    influence: 80,
    description:
      'Appointed IRGC deputy in December 2025 specifically to prepare for possible US attack. ' +
      'Promoted to commander-in-chief after original commander killed Day 1. ' +
      'Overseeing Mosaic Defense — 31 autonomous provincial commands.',
    successionImpact: 'Deeply embedded in IRGC power structure; removal would not break decentralized command.',
  },
]

const ISRAEL_KEY_FIGURES: KeyFigure[] = [
  {
    id: 'netanyahu',
    name: 'Benjamin Netanyahu',
    role: 'Prime Minister',
    status: 'active',
    disposition: 'hawk',
    influence: 80,
    description:
      'Called Trump Feb 23 to share Khamenei\'s location. Initiated strike one day after ' +
      'Oman announced diplomatic breakthrough. Faces existential political deadline: ' +
      'March 31 budget must pass or Knesset dissolves. 74% of Jewish Israelis trust him to manage operation.',
    successionImpact: 'Bennett polling 18-21 seats as main rival. Election would produce less hawkish coalition.',
  },
]

// ── ACTOR STATES ─────────────────────────────────────────────

const US_STATE: DeepPartial<ActorState> = {
  military: {
    overallReadiness: 72,
    // Readiness: 82 pre-conflict, degraded by sustained operations and munition depletion
    assets: [
      {
        category: 'air_defense',
        name: 'Patriot PAC-3 MSE interceptors',
        estimatedQuantity: 200,
        // ~300+ expended first 36 hours; Qatar Patriot stocks ~4 days at current rates
        quality: 90,
        replenishmentRate: 'slow',
        unitCost: 3900000,
        costRatio: '1 Patriot PAC-3 MSE ($3.9M) vs 1 Shahed-136 ($35K) = ~111:1 cost disadvantage',
        depletionTrend: 'critical',
        notes: 'Production bottleneck: Lockheed produced only 620 PAC-3 MSE in all of 2025. Replacing stocks takes 15+ months.',
        supplyChain: 'Lockheed Martin domestic production; Ukraine drain pre-conflict',
      },
      {
        category: 'air_defense',
        name: 'THAAD interceptors',
        estimatedQuantity: 120,
        // ~150 consumed in June 2025 war (25% of total US stockpile); 70 more in first 36hrs of Epic Fury
        quality: 95,
        replenishmentRate: 'slow',
        unitCost: 13500000,
        costRatio: '1 THAAD interceptor ($12-15M) vs 1 Shahed-136 ($35K) = ~350:1 cost disadvantage',
        depletionTrend: 'critical',
        notes: 'Only 96 THAAD interceptors produced in all of 2025. At current burn rate, US exhausts half total stockpile in 4-5 weeks.',
        supplyChain: 'Lockheed Martin; multi-year production lead times',
      },
      {
        category: 'air_defense',
        name: 'THAAD batteries (AN/TPY-2 radars)',
        estimatedQuantity: 5,
        // 8 globally; Muwaffaq Salti (Jordan) radar destroyed; Prince Sultan (Saudi) charred; 2 others at risk
        quality: 70,
        replenishmentRate: 'none',
        unitCost: 500000000,
        depletionTrend: 'critical',
        notes: 'Muwaffaq Salti (Jordan) AN/TPY-2 radar destroyed by Iranian strike March 1-2. Prince Sultan (Saudi) radar damaged. Al Udeid early-warning radar damaged. Loss of radar is operationally decisive.',
        supplyChain: 'No replacement timeline; $500M per radar',
      },
      {
        category: 'carrier_strike_group',
        name: 'Carrier Strike Groups in theater',
        estimatedQuantity: 2,
        // USS Abraham Lincoln and USS Gerald R. Ford
        quality: 85,
        replenishmentRate: 'slow',
        depletionTrend: 'stable',
        notes: 'USS Abraham Lincoln + USS Gerald R. Ford. 120+ aircraft including F-22s at Ovda Airbase. USS Tripoli ARG with 31st MEU also deployed from Okinawa.',
        supplyChain: 'US Pacific Fleet; drawn from Indo-Pacific',
      },
      {
        category: 'aircraft',
        name: 'F-35A / F-15E strike aircraft',
        estimatedQuantity: 180,
        quality: 90,
        replenishmentRate: 'slow',
        depletionTrend: 'depleting',
        notes: 'Deployed to Ovda Airbase, Israel and regional bases. F-22s also present.',
        supplyChain: 'USAF/USN; surge deployments from CONUS and EUCOM',
      },
      {
        category: 'cruise_missiles',
        name: 'Tomahawk cruise missiles',
        estimatedQuantity: 350,
        quality: 90,
        replenishmentRate: 'slow',
        unitCost: 2000000,
        depletionTrend: 'depleting',
        notes: 'Fired extensively in opening strikes. ~1,000 guided munitions withdrawn from Korea pre-war.',
        supplyChain: 'Raytheon domestic production; multi-month replenishment',
      },
    ],
    activeOperations: [
      {
        name: 'Operation Epic Fury',
        type: 'air_campaign',
        target: 'iran',
        status: 'ongoing',
        burnRate: '$480M/day military expenditure; $11.3B in first 6 days',
        description:
          'Joint US-Israel air campaign targeting Iranian military, nuclear, and leadership infrastructure. ' +
          'Nearly 900 strikes in first 12 hours. By Day 19 campaign is stalling on dispersed/hardened targets.',
      },
    ],
    vulnerabilities: [
      'THAAD radar network severely degraded — 3 of 8 batteries compromised',
      'Patriot and THAAD interceptor stocks depleting faster than production can replace',
      'No ground forces in theater for Strait reopening',
      'Gulf state basing access contested — allies blocked US base use for offensive strikes',
      'THAAD removal from South Korea created intelligence blind spot in Indo-Pacific',
    ],
    nuclear: {
      capability: 'confirmed',
      estimatedWarheads: 5550,
      deliveryMethods: ['ICBMs', 'SLBMs', 'strategic bombers'],
      useDoctrineDescription: 'Last resort; would require nuclear attack on US or allies to authorize',
      escalationRungForUse: 8,
      constraints: ['NATO non-first-use doctrine', 'catastrophic escalation risk', 'international pariah status'],
    },
  },
  economic: {
    overallHealth: 62,
    gdpEstimate: 28000000000000,
    keyVulnerabilities: [
      'Oil at $109/bbl straining economy and inflation',
      '$480M/day military burn rate; $11.3B in first 6 days alone',
      'Gulf sovereign wealth funds reviewing $2T+ in US asset commitments',
      'Supply chain disruption from Strait closure affecting global markets',
    ],
    keyLeverages: [
      'World reserve currency status',
      'Global financial system dominance (SWIFT)',
      'Sanction capacity against Iran and allies',
    ],
    sanctionsExposure: 5,
    oilDependency: { asExporter: 5, asImporter: 60 },
    warCostTolerance: 70,
    energyInfrastructure: {
      oilProductionCapacity: '13.2M barrels/day',
      currentOutput: '13.2M barrels/day (domestic unaffected)',
      criticalFacilities: [],
      exportRoutes: [],
      damageLevel: 0,
    },
  },
  political: {
    regimeStability: 72,
    leadershipCohesion: 60,
    governmentType: 'Federal republic — constitutional democracy',
    warPowersDescription:
      'President authorized strikes under claimed Article II authority and emergency AUMF. ' +
      'Congress has not formally declared war. Bipartisan support in Congress despite public opposition.',
    influenceChannels: [
      {
        name: 'general_public',
        description: 'American public opinion on the war',
        policyInfluence: 25,
        currentPosition:
          'Lowest initial support for any major US military operation in modern polling history. ' +
          'NPR/PBS/Marist (Mar 2-4): 44% support. Quinnipiac (Mar 8-9): 40% support. ' +
          'Fox News (mid-Mar): 50/50. Independents oppose 61%. Democrats oppose 74-90%.',
        supportForCurrentPolicy: 40,
        leverageMechanisms: ['protests', 'congressional pressure', 'midterm elections 2026'],
        overrideCost:
          'Policy disconnect can persist 12-18 months per Vietnam precedent. ' +
          'No electoral alternative — Democrats equally hawkish on Israel.',
        precedent: 'Vietnam: public opposition took 7+ years to force withdrawal. Iraq opened at 76% support.',
      },
      {
        name: 'israel_lobby',
        description: 'AIPAC and allied organizations with direct congressional access',
        policyInfluence: 82,
        currentPosition: 'Full support for continued and escalated military action against Iran.',
        supportForCurrentPolicy: 95,
        leverageMechanisms: [
          'campaign funding ($100M+ per election cycle)',
          'primary challenges against insufficiently hawkish members',
          'bipartisan donor network',
          'media narrative shaping',
        ],
        overrideCost:
          'Defying AIPAC risks primary challenges and loss of donor access for both parties. ' +
          'Both parties receive AIPAC funding — no viable alternative policy from opposition.',
      },
      {
        name: 'defense_establishment',
        description: 'Pentagon, Joint Chiefs, defense industry',
        policyInfluence: 70,
        currentPosition:
          'Operationally supportive but increasingly concerned about munition depletion rates, ' +
          'Pacific redeployment risks, and lack of ground force strategy for Strait.',
        supportForCurrentPolicy: 60,
        leverageMechanisms: ['classified briefings', 'congressional testimony', 'media leaks'],
        overrideCost: 'Military cannot publicly oppose CiC; dissent through leaks and congressional testimony.',
      },
      {
        name: 'maga_base',
        description: 'Trump\'s core political coalition',
        policyInfluence: 65,
        currentPosition: 'Republicans approve at 77-90%; MAGA self-identifiers at 90%.',
        supportForCurrentPolicy: 85,
        leverageMechanisms: ['Trump personal loyalty', 'primary threats', 'media ecosystem'],
        overrideCost: 'Trump cannot afford to lose MAGA base; any retreat framed as weakness.',
      },
    ],
    policyDisconnect: {
      gapSeverity: 68,
      estimatedToleranceDuration:
        '12-18 months before midterm pressure forces shift. ' +
        'But bipartisan congressional consensus means no electoral alternative.',
      breakingPoints: [
        'Significant US military casualties (none yet — creates false sense of cost-free war)',
        'Oil at $150+/barrel triggering recession',
        'Draft discussion',
        'Failed regime change after 6+ months',
        'Gulf states withdrawing $2T+ in US investments',
      ],
      oppositionAlternative:
        'Democrats equally hawkish on Israel — 6-7% of Democrats approve but no leader offering alternative. ' +
        'Bipartisan AIPAC funding ensures no viable opposition policy.',
      bipartisanConsensus: true,
      bipartisanDescription:
        'Both parties receive AIPAC campaign funding. Both voted for emergency Israel aid. ' +
        'No major Democratic figure has challenged the war itself — only specific tactics.',
    },
    pressurePoints: [
      'Joe Kent resignation opened space for further senior dissents',
      'Rubio signaling doubt by Day 18',
      'Gulf states reviewing $2T+ in US asset commitments',
      'THAAD removal from South Korea generating Asia-Pacific ally anxiety',
    ],
  },
  diplomatic: {
    internationalStanding: 45,
    activeNegotiations: [
      {
        name: 'Strait of Hormuz reopening',
        counterparties: ['iran'],
        status: 'collapsed',
        demands: ['Iran reopen Strait unconditionally', 'Iran halt military operations'],
        concessions: [],
        blockers: [
          'US refused to offer ceasefire',
          'Iran killed Khamenei one day after Iran agreed to nuclear breakthrough — destroyed trust',
          'Mojtaba Khamenei more hardline than father',
        ],
        leverage: 'Iran holds chokepoint leverage; US has air superiority but no ground force',
      },
    ],
    allianceStrength: 50,
    isolationRisk: 40,
  },
  intelligence: {
    signalCapability: 88,
    humanCapability: 72,
    cyberCapability: 90,
    blindSpots: [
      'Location of Iran\'s dispersed enriched uranium (~440 kg of 60% HEU — IAEA cannot account for it)',
      'Remaining Iranian ballistic missile stockpile locations after dispersal',
      'Mojtaba Khamenei\'s actual physical status and location',
      'Extent of Russia intel-sharing with Iran (confirmed but not fully mapped)',
    ],
    exposureLevel: 40,
    intelSharingPartners: [
      { actorId: 'israel', description: 'Full Five Eyes-level sharing; Netanyahu provided Khamenei location Feb 23' },
    ],
  },
}

const IRAN_STATE: DeepPartial<ActorState> = {
  military: {
    overallReadiness: 35,
    // Heavily degraded by June 2025 war and Epic Fury strikes, but Mosaic Defense functioning
    assets: [
      {
        category: 'suicide_drones',
        name: 'Shahed-136 / Shahed-238 loitering munitions',
        estimatedQuantity: 2500,
        // Pre-war stockpile ~3,000+; ~500+ expended in retaliation waves
        quality: 55,
        replenishmentRate: 'slow',
        unitCost: 35000,
        costRatio: '1 Shahed-136 ($35K) forces expenditure of 1 Patriot ($3.9M) = 111:1 cost ADVANTAGE for Iran',
        depletionTrend: 'depleting',
        notes:
          'Iran deliberately rationing — missile launch rate declined 90%+ by Day 10. ' +
          'IRGC claims weapons cache "mostly intact." Saving assets for protracted attrition.',
        supplyChain: 'Domestic production; Russian components pre-sanctions; ~3,000 tons sodium perchlorate from China',
      },
      {
        category: 'ballistic_missiles',
        name: 'Ballistic missile arsenal (Shahab, Sejjil, Kheibar Shekan, Emad)',
        estimatedQuantity: 1100,
        // Pre-conflict rebuilt ~2,500; ~500+ fired + stockpile strikes = ~1,000-1,200 remaining per Haaretz
        quality: 65,
        replenishmentRate: 'slow',
        unitCost: 1000000,
        depletionTrend: 'depleting',
        notes:
          'Haaretz/IDF assessment: ~1,000-1,200 remaining as of mid-March 2026. ' +
          'Production capacity 50-100+/month. Received ~3,000 tons sodium perchlorate from China (enough for hundreds of missiles).',
        supplyChain: 'Domestic production; Chinese chemical precursors',
      },
      {
        category: 'hypersonic_missiles',
        name: 'Fattah-2 hypersonic glide vehicle',
        estimatedQuantity: 'unknown',
        quality: 80,
        replenishmentRate: 'none',
        unitCost: 5000000,
        depletionTrend: 'stable',
        notes:
          'First combat use March 1, 2026. Claimed Mach 13-15, range ~1,400-1,500 km, 200 kg warhead. ' +
          'Reportedly killed 7 senior IDF officers at fortified command center. ' +
          'SM-6 (Mach 4) cannot intercept. Inventory believed limited. Western analysts skeptical of full speed claims.',
        supplyChain: 'Domestic production; limited inventory',
      },
      {
        category: 'naval',
        name: 'IRGC Navy fast attack craft / mine warfare assets',
        estimatedQuantity: 'unknown',
        quality: 60,
        replenishmentRate: 'slow',
        depletionTrend: 'stable',
        notes:
          'Strait of Hormuz closed via combination of mine threat, drone threat to shipping, and IRGC Navy. ' +
          'Mine clearing would take 3-6 months minimum even after military threat removed. ' +
          'Selective passage policy: allowing Chinese, Turkish, Indian-flagged vessels trading in yuan.',
        supplyChain: 'Domestic; North Korean mine expertise suspected',
      },
      {
        category: 'air_defense',
        name: 'S-300 / Bavar-373 air defense systems',
        estimatedQuantity: 'unknown',
        quality: 30,
        replenishmentRate: 'none',
        depletionTrend: 'critical',
        notes: 'Largely destroyed in June 2025 war. Iran flying nearly blind on air defense.',
        supplyChain: 'Russian S-300 supply chain severed by sanctions',
      },
    ],
    activeOperations: [
      {
        name: 'Strait of Hormuz closure',
        type: 'naval_blockade',
        target: 'global_shipping',
        status: 'succeeding',
        burnRate: 'Low — primarily mine threat and IRGC Navy presence',
        description:
          'First-ever Strait closure in history. Effective from Day 2. ' +
          '21+ attacks on merchant ships as of March 12. ' +
          'Selective passage for Chinese/Turkish/Indian vessels in yuan. ' +
          'Creates $130/bbl+ oil price pressure on US economy.',
      },
      {
        name: 'Drone attrition campaign',
        type: 'air_campaign',
        target: 'united_states_israel',
        status: 'succeeding',
        burnRate: 'Low per unit ($35K/drone vs $3.9M interceptor)',
        description:
          'Deliberate attritional drone waves forcing expenditure of irreplaceable interceptors. ' +
          'IRGC rationing assets for prolonged campaign. ' +
          'Saudi Arabia expended $150M+ in interceptors to defeat $3M worth of drones on single day.',
      },
      {
        name: 'Gulf oil infrastructure strikes',
        type: 'strike_campaign',
        target: 'gulf_states',
        status: 'ongoing',
        burnRate: 'Moderate — ballistic missile and drone expenditure',
        description:
          'Retaliatory strikes on UAE, Saudi, Bahrain, Qatar oil infrastructure. ' +
          'Abu Dhabi Shah gas field suspended. Qatar Ras Laffan gas production halted. ' +
          'Message: if Iran oil burns, everyone\'s burns.',
      },
    ],
    vulnerabilities: [
      'Air defense largely destroyed — flying blind',
      'Conventional command structure decapitated (Day 1) but Mosaic Defense compensates',
      'Nuclear facilities heavily damaged — Fordow, Natanz, Isfahan struck in June 2025 and Epic Fury',
      'Kharg Island (90% of oil exports) struck and "obliterated" per Trump (March 13)',
      'Oil export infrastructure severely degraded',
    ],
    nuclear: {
      capability: 'threshold',
      estimatedWarheads: 0,
      deliveryMethods: ['ballistic_missiles', 'potentially_Fattah_series'],
      useDoctrineDescription:
        'No nuclear weapon yet. 440 kg of 60% HEU survived strikes; location unknown to IAEA. ' +
        'Enrichment to 90% would take "a few weeks" once decision made. ' +
        'Weaponization takes months beyond that. ' +
        'Nuclear fatwa by Ali Khamenei no longer binding — REMOVED by his death. ' +
        'Deterrence constraint REMOVED — attack already happening. ' +
        'International isolation constraint WEAKENED — already sanctioned and at war.',
      escalationRungForUse: 7,
      constraints: [
        'Requires months for weaponization beyond fissile material',
        'International pariah risk (WEAKENED by existing isolation)',
        'Israel nuclear first strike if Iran announces weapon',
      ],
    },
  },
  economic: {
    overallHealth: 18,
    // Deep crisis: sanctions, war damage, currency collapse, January protest triggers
    keyVulnerabilities: [
      'Kharg Island terminal struck — handles 90% of Iran oil exports',
      'South Pars gas field struck March 18 — world\'s largest shared gas field',
      'Currency collapse triggered December 2025 protests (5,000-36,500 killed in crackdown)',
      'Sanctions regime pre-existing; now compounded by wartime destruction',
      'Oil export revenue near-zero due to infrastructure damage',
    ],
    keyLeverages: [
      'Strait of Hormuz closure ($20M bbl/day, 20% of global oil)',
      'Threat of further Gulf state infrastructure strikes',
      'China and Russia purchasing remaining oil exports in yuan',
    ],
    sanctionsExposure: 95,
    oilDependency: { asExporter: 85, asImporter: 10 },
    warCostTolerance: 40,
    // Sustained by "just survive" logic; economy already in crisis before war
    energyInfrastructure: {
      oilProductionCapacity: '3.4M barrels/day',
      currentOutput: '0.5M barrels/day (Kharg Island destroyed; South Pars struck)',
      criticalFacilities: [
        {
          name: 'Kharg Island terminal',
          owner: 'iran',
          status: 'destroyed',
          globalSignificance: 'Handles 90% of Iranian crude oil exports',
          strikeHistory: [
            'Struck March 7 (Israel)',
            '"Totally obliterated every military target" per Trump March 13',
          ],
        },
        {
          name: 'South Pars natural gas field',
          owner: 'iran',
          status: 'damaged',
          globalSignificance: "World's largest natural gas field; shared with Qatar",
          strikeHistory: ['Struck by Israel March 18, 2026'],
        },
        {
          name: 'Fordow nuclear facility',
          owner: 'iran',
          status: 'damaged',
          globalSignificance: 'Deeply buried uranium enrichment; struck by B-2 with MOPs June 2025',
          strikeHistory: ['Operation Midnight Hammer June 21, 2025 (B-2 bombers, MOPs)'],
        },
        {
          name: 'Natanz enrichment facility',
          owner: 'iran',
          status: 'damaged',
          globalSignificance: 'Primary uranium enrichment complex',
          strikeHistory: ['Operation Midnight Hammer June 21, 2025'],
        },
      ],
      exportRoutes: [
        {
          name: 'Strait of Hormuz',
          status: 'blocked',
          controlledBy: 'iran',
          globalImpact: '20M bbl/day (20% of global oil); 34% of global crude trade in 2024',
          blockadeMethod:
            'Mine threat + IRGC fast attack craft + drone threat to commercial shipping. ' +
            '21+ attacks on merchant ships as of March 12.',
          breakingCost:
            'Requires ground occupation of Iranian coastline along Strait. ' +
            'No US ground forces in theater. Mine clearing alone takes 3-6 months after military threat removed.',
          mineThreat: {
            level: 'extreme',
            estimatedMinesPlaced: 'unknown',
            clearingTimeline: '3-6 months minimum even after military threat removed',
            mineTypes: ['contact', 'influence', 'rising'],
            clearingAssetsAvailable:
              'US MCM fleet limited; Gulf state MCM assets minimal; allied nations declined participation',
          },
          selectivePassage: {
            allowedFlags: ['Chinese', 'Turkish', 'Indian'],
            conditions: 'Cargo traded in yuan; not supporting US/Israeli operations',
            volumeGettingThrough: '8 non-Iranian vessels detected Monday; trickle, not flow',
          },
        },
      ],
      damageLevel: 75,
    },
  },
  political: {
    regimeStability: 68,
    // Weakened but holding. US intelligence: "will likely remain in place, more hard-line"
    leadershipCohesion: 55,
    governmentType: 'Islamic Republic — theocratic hybrid with elected institutions',
    warPowersDescription:
      'Supreme Leader constitutionally supreme commander. After Ayatollah\'s death, ' +
      'Assembly of Experts elected Mojtaba March 8. IRGC effectively governing under ' +
      'Mosaic Defense pre-delegated authority. 31 autonomous provincial commands.',
    influenceChannels: [
      {
        name: 'irgc',
        description: 'Islamic Revolutionary Guard Corps — dominant power after decapitation',
        policyInfluence: 90,
        currentPosition:
          'Continue resistance; attritional strategy is working. Do not negotiate under fire. ' +
          'Nuclear breakout option now unconstrained by fatwa.',
        supportForCurrentPolicy: 95,
        leverageMechanisms: ['military force', 'internal security apparatus', 'economic leverage over elites'],
        overrideCost: 'IRGC cannot be overridden — they ARE the government at this point',
      },
      {
        name: 'iranian_public',
        description: 'Iranian population — 70% anti-regime pre-war; some nationalist rally',
        policyInfluence: 5,
        currentPosition:
          'Deeply divided. 70% anti-regime pre-war. Some nationalist rally against foreign attack. ' +
          'Primary mechanism of control is repression, not consent. ' +
          'January 2026 massacre killed 5,000-36,500 protesters.',
        supportForCurrentPolicy: 35,
        leverageMechanisms: ['protest', 'civil disobedience', 'defection'],
        overrideCost: 'Regime massacres protesters; no security force defections as of Day 19',
      },
    ],
    policyDisconnect: {
      gapSeverity: 80,
      estimatedToleranceDuration:
        'Indefinite under current repression capacity. Breaks if: ' +
        'US ground invasion creates true existential crisis, or IRGC fractures.',
      breakingPoints: [
        'Security force defections (none yet)',
        'US/Israeli ground invasion unifying population around survival',
        'Economic collapse triggering broader security force breakdown',
      ],
      oppositionAlternative:
        'Exile opposition fragmented; unable to fill power vacuum. ' +
        'No organized internal force capable of regime change per US intelligence assessment.',
      bipartisanConsensus: false,
    },
    pressurePoints: [
      'Martyrdom narrative strengthening IRGC internal cohesion',
      'Mojtaba possibly incapacitated/in Moscow — legitimacy question',
      'Population deeply traumatized by January massacre — suppressed but not compliant',
    ],
  },
  diplomatic: {
    internationalStanding: 25,
    activeNegotiations: [],
    allianceStrength: 35,
    isolationRisk: 75,
  },
  intelligence: {
    signalCapability: 55,
    humanCapability: 60,
    cyberCapability: 65,
    blindSpots: [
      'US air defense remaining interceptor counts (known to be depleting but exact figures unknown)',
      'Extent of US ground force pre-positioning',
      'Israeli nuclear readiness posture',
    ],
    exposureLevel: 50,
    intelSharingPartners: [
      {
        actorId: 'russia',
        description:
          'Russia providing intelligence on US warship positions (Washington Post, 3 senior US officials). ' +
          'Mirrors US intel support to Ukraine against Russia.',
      },
      {
        actorId: 'china',
        description: 'China sharing satellite imagery; not confirmed active weapons support.',
      },
    ],
  },
}

const ISRAEL_STATE: DeepPartial<ActorState> = {
  military: {
    overallReadiness: 78,
    assets: [
      {
        category: 'air_force',
        name: 'F-35I Adir / F-15I Ra\'am strike aircraft',
        estimatedQuantity: 160,
        quality: 90,
        replenishmentRate: 'slow',
        depletionTrend: 'depleting',
        notes: 'Operating on three fronts: Iran, Lebanon, Gaza. High sortie rate.',
        supplyChain: 'US F-35 supply chain; domestic F-15I maintenance',
      },
      {
        category: 'air_defense',
        name: 'Iron Dome batteries',
        estimatedQuantity: 12,
        quality: 85,
        replenishmentRate: 'slow',
        unitCost: 40000,
        costRatio: '1:1 vs Shahed-136 — one of few favorable intercept ratios',
        depletionTrend: 'depleting',
        notes: 'Tamir interceptors most cost-effective at ~$40K each. Stocks strained by high engagement rate.',
        supplyChain: 'US/Israeli coproduction; Rafael domestic',
      },
      {
        category: 'ground_forces',
        name: 'IDF reserve forces mobilized',
        estimatedQuantity: 100000,
        quality: 80,
        replenishmentRate: 'slow',
        depletionTrend: 'stable',
        notes: 'Up from 60,000 pre-Iran war. Southern Lebanon invasion began March 16.',
        supplyChain: 'Domestic mobilization; economic cost NIS 9.4B/week',
      },
    ],
    activeOperations: [
      {
        name: 'Iran air campaign',
        type: 'air_campaign',
        target: 'iran',
        status: 'ongoing',
        burnRate: 'NIS 1.5B ($480M)/day military expenditure',
        description: 'Strikes on Iranian military, nuclear, oil infrastructure. Fattah-2 reportedly killed 7 senior IDF officers at fortified command center Day 1.',
      },
      {
        name: 'Southern Lebanon ground invasion',
        type: 'ground_invasion',
        target: 'hezbollah',
        status: 'ongoing',
        burnRate: 'Heavy ground force commitment',
        description: 'Invasion began March 16. Third front after Iran and Gaza.',
      },
    ],
    vulnerabilities: [
      'Three-front overextension: Iran, Lebanon, Gaza simultaneously',
      'Fattah-2 hypersonic threat — no effective interceptor',
      'Defense budget already expanded to NIS 144B+ (unsustainable)',
      'March 31 budget deadline creates political cliff',
    ],
    nuclear: {
      capability: 'unconfirmed',
      estimatedWarheads: 90,
      deliveryMethods: ['Jericho III ICBMs', 'aircraft delivery', 'submarine-launched'],
      useDoctrineDescription:
        'Ambiguity policy (officially denied). Would use only under existential threat: ' +
        'nuclear attack by Iran, or conventional defeat threatening state survival.',
      escalationRungForUse: 8,
      constraints: [
        'Ambiguity policy — use would end strategic ambiguity permanently',
        'US pressure against nuclear use',
        'Would trigger Russian/Chinese response',
      ],
    },
  },
  economic: {
    overallHealth: 52,
    gdpEstimate: 522000000000,
    keyVulnerabilities: [
      'NIS 9.4B ($3B)/week economic loss under Home Front Command restrictions',
      'NIS 1.5B ($480M)/day military expenditure',
      'Cumulative war costs since Oct 2023: $55.6B (~10% GDP)',
      'Budget deficit projected 5.1-5.5% of GDP (target was 3.9%)',
      'Debt-to-GDP rising from ~60% pre-Oct 2023 to ~70%',
      'GDP growth forecast cut from 5.2% to 4.7%',
    ],
    keyLeverages: [
      'US military and financial backing',
      'Technology sector resilience',
      'Diamond and high-tech exports',
    ],
    sanctionsExposure: 10,
    oilDependency: { asExporter: 0, asImporter: 75 },
    warCostTolerance: 45,
    energyInfrastructure: {
      oilProductionCapacity: '0',
      currentOutput: '0 (importer)',
      criticalFacilities: [],
      exportRoutes: [],
      damageLevel: 0,
    },
  },
  political: {
    regimeStability: 78,
    leadershipCohesion: 70,
    governmentType: 'Parliamentary democracy — coalition government',
    warPowersDescription:
      'War Cabinet authorized operation. Knesset required for budget (March 31 deadline critical). ' +
      'Emergency powers in effect. Coalition government has slim majority.',
    influenceChannels: [
      {
        name: 'jewish_israeli_public',
        description: 'Jewish Israeli population — near-unanimous support at war start',
        policyInfluence: 60,
        currentPosition:
          'IDI (Mar 10-11): 81% overall support; 92.5% Jewish Israelis. ' +
          '74% support continuing until regime overthrow — but only 11% think it will succeed. ' +
          '74% trust Netanyahu to manage the operation.',
        supportForCurrentPolicy: 81,
        leverageMechanisms: ['elections', 'protest', 'reserve service refusal'],
        overrideCost:
          'Support could flag if: many Israeli deaths, significant damage, or US withdraws. ' +
          'Naftali Bennett at 18-21 seats as main electoral rival.',
      },
      {
        name: 'security_establishment',
        description: 'IDF leadership, Mossad, Shin Bet',
        policyInfluence: 75,
        currentPosition:
          'Operationally committed but aware of three-front strain. ' +
          'Concerns about March 31 budget cliff and coalition instability.',
        supportForCurrentPolicy: 72,
        leverageMechanisms: ['War Cabinet influence', 'operational recommendations', 'media leaks'],
        overrideCost: 'Cannot publicly oppose government; leaks only mechanism',
      },
    ],
    policyDisconnect: {
      gapSeverity: 15,
      estimatedToleranceDuration: 'Minimal gap now; could grow rapidly if casualty rate increases',
      breakingPoints: [
        'Significant IDF casualties',
        'US withdrawal from joint operations',
        'March 31 budget failure triggering elections',
        'Fattah-2 strikes killing large numbers of civilians',
      ],
      oppositionAlternative: 'Bennett offers nationalist alternative but not peace. Lapid filed no-confidence motion March 16.',
      bipartisanConsensus: true,
      bipartisanDescription: 'All major parties support the war; opposition challenge is on process, not the war itself.',
    },
    pressurePoints: [
      'March 31 budget deadline — Knesset dissolves if budget fails',
      'Lapid no-confidence motion filed March 16',
      'Yair Golan first major opposition figure to challenge war policy (March 16)',
      'Coalition arithmetic: 53-45 first reading; Shas/UTJ wavering on Haredi draft',
    ],
  },
  diplomatic: {
    internationalStanding: 30,
    activeNegotiations: [],
    allianceStrength: 72,
    isolationRisk: 55,
  },
  intelligence: {
    signalCapability: 90,
    humanCapability: 85,
    cyberCapability: 88,
    blindSpots: [
      'Iran enriched uranium dispersal locations',
      'Fattah-2 full inventory size',
      'Mojtaba Khamenei current location and health',
    ],
    exposureLevel: 35,
    intelSharingPartners: [
      { actorId: 'united_states', description: 'Full strategic intelligence sharing; Netanyahu provided Khamenei location' },
    ],
  },
}

// ── CONSTRAINTS ──────────────────────────────────────────────

const IRAN_CONSTRAINTS: Constraint[] = [
  {
    dimension: 'military',
    description: 'Religious prohibition on nuclear weapons — Supreme Leader\'s fatwa',
    severity: 'hard',
    status: 'removed',
    statusRationale:
      'Ali Khamenei killed Day 1. His fatwa against nuclear weapons died with him. ' +
      'Mojtaba Khamenei has NOT reissued the fatwa. Nuclear constraint chain: ' +
      '(1) fatwa removed by death + (2) deterrence removed by attack already happening + ' +
      '(3) isolation risk weakened by existing sanctions/war = all three breakout constraints degraded simultaneously.',
    removedByEventId: 'evt_khamenei_killed_day1',
    enabledActions: [
      'Nuclear breakout — enrichment to 90% in "a few weeks" (440 kg of 60% HEU location unknown to IAEA)',
      'Nuclear weapons program restart without religious prohibition',
    ],
  },
  {
    dimension: 'military',
    description: 'Nuclear deterrence — fear of catastrophic response to nuclear program',
    severity: 'soft',
    status: 'removed',
    statusRationale:
      'Attack already happened. Iran attacked anyway. Deterrence has demonstrably failed. ' +
      'Marginal cost of nuclear breakout is now low — Iran is already at war with the US.',
    removedByEventId: 'evt_operation_epic_fury_day1',
    enabledActions: ['Nuclear breakout timeline accelerated — no additional deterrence cost'],
  },
  {
    dimension: 'diplomatic',
    description: 'International isolation risk from nuclear program',
    severity: 'soft',
    status: 'weakened',
    statusRationale:
      'Iran already under maximum sanctions and in active war with US. ' +
      'Additional isolation from nuclear breakout is marginal. ' +
      'China and Russia providing economic lifeline regardless.',
  },
]

const US_CONSTRAINTS: Constraint[] = [
  {
    dimension: 'military',
    description: 'No ground invasion without congressional AUMF and political cover',
    severity: 'hard',
    status: 'active',
    releaseCondition: 'Mass casualty attack on US soil, or Strait closure causing severe recession requiring ground option',
    enabledActions: [],
  },
  {
    dimension: 'political',
    description: 'War powers — no formal declaration of war',
    severity: 'soft',
    status: 'active',
    statusRationale: 'Operating under claimed Article II authority. Congress has not formally authorized.',
  },
]

const ISRAEL_CONSTRAINTS: Constraint[] = [
  {
    dimension: 'political',
    description: 'March 31 budget deadline — Knesset auto-dissolves if budget fails',
    severity: 'hard',
    status: 'active',
    releaseCondition: 'Budget passes second and third readings before March 31, 2026',
    statusRationale:
      'First reading passed 53-45. Shas and UTJ support likely after Haredi draft law set aside March 10. ' +
      'Failure triggers elections ~90 days later during active war.',
  },
  {
    dimension: 'military',
    description: 'Three-front operational limit — cannot sustain Iran + Lebanon + Gaza indefinitely',
    severity: 'soft',
    status: 'active',
    statusRationale: 'NIS 9.4B/week economic loss; $480M/day military; reserve force strain.',
  },
]

// ── RELATIONSHIPS ─────────────────────────────────────────────

const RELATIONSHIPS: DeepPartial<Relationship>[] = [
  {
    actorA: 'united_states',
    actorB: 'iran',
    type: 'adversary',
    strength: 5,
    mutualInterests: ['Avoiding nuclear use', 'Preventing regional collapse'],
    frictions: [
      'US regime change objective vs Iranian survival',
      'Strait closure vs US economic interests',
      'Nuclear breakout cascade risk',
    ],
    volatility: 90,
    shiftTriggers: [
      'Iran announces nuclear weapon — may trigger Israeli nuclear first strike',
      'US domestic collapse of support forces ceasefire offer',
      'Gulf state economic pressure on US',
    ],
    description:
      'Active hot war. US objective: regime change. Iran objective: survive as a state. ' +
      'Trust destroyed by striking one day after diplomatic breakthrough.',
    warImpact:
      'Diplomatic breakthrough (Feb 27) followed by joint strike (Feb 28) has eliminated ' +
      'any Iranian trust in US negotiations. "Talks while bombing" now impossible.',
  },
  {
    actorA: 'united_states',
    actorB: 'israel',
    type: 'ally',
    strength: 82,
    mutualInterests: ['Iranian nuclear neutralization', 'Regional stability'],
    frictions: [
      'Netanyahu initiated strike over US diplomatic preferences',
      'Israel\'s March 31 budget pressure may force unilateral decisions',
      'Joe Kent resignation signals MAGA fracture on Israel priority',
    ],
    volatility: 30,
    shiftTriggers: [
      'US midterm election pressure forces policy shift',
      'Israel pursues nuclear first strike without US consultation',
      'March 31 elections produce Bennett-led coalition less aligned with Trump',
    ],
    description:
      'Core alliance but with significant tensions. Netanyahu provided Khamenei location to Trump Feb 23. ' +
      'AIPAC (policyInfluence: 82) ensures bipartisan US support regardless of public opinion.',
    warImpact:
      'Alliance functioning but strained. Rubio signaling Israel\'s vs America\'s objectives are diverging.',
  },
  {
    actorA: 'russia',
    actorB: 'iran',
    type: 'patron',
    strength: 72,
    mutualInterests: ['US overextension', 'Dollar/SWIFT erosion', 'Multipolar world order'],
    frictions: ['Russia cannot directly intervene without triggering NATO Article 5'],
    volatility: 25,
    shiftTriggers: ['Iran nuclear use — Russia would distance itself'],
    description:
      'Russia providing intelligence on US warship positions (Washington Post, 3 senior US officials). ' +
      'Russia-China-Iran joint naval drills in Strait of Hormuz February 2026. ' +
      'Russia selling oil at premium to replace Iranian supplies. ' +
      'Mirrors US intel support to Ukraine.',
    warImpact: 'Russia benefiting passively: oil revenue windfall, US Pacific redeployment, Ukraine pressure relief.',
  },
  {
    actorA: 'china',
    actorB: 'iran',
    type: 'economic_partner',
    strength: 60,
    mutualInterests: ['Dollar erosion', 'Yuan oil trade', 'US overextension'],
    frictions: ['China does not want nuclear Iran triggering regional proliferation'],
    volatility: 35,
    shiftTriggers: ['Iran nuclear breakout — China would withdraw economic support'],
    description:
      'China purchasing Iranian oil in yuan. Provided ~3,000 tons sodium perchlorate (missile precursor) pre-conflict. ' +
      'Sharing satellite imagery. Strategic patience — NOT opportunistic aggression on Taiwan. ' +
      'THAAD removal from South Korea = intelligence windfall (AN/TPY-2 no longer peering 3,000km into China).',
    warImpact:
      'China passively benefiting. Accelerating yuan oil trade. Positioned as diplomatic alternative to US. ' +
      'De-escalating around Taiwan — summit diplomacy prioritized.',
  },
  {
    actorA: 'united_states',
    actorB: 'gulf_states',
    type: 'ally',
    strength: 28,
    mutualInterests: ['Regional security', 'Oil market stability', 'Iranian containment'],
    frictions: [
      'US pulled THAAD from Saudi Arabia and South Korea for Israel — Gulf states defenseless',
      'Gulf states blocked US base/airspace access for offensive Iran strikes',
      'Iran attacking Gulf oil infrastructure — direct consequence of US war',
      '$2T+ Gulf sovereign wealth in US assets under review',
    ],
    volatility: 75,
    shiftTriggers: [
      'Further Iranian strikes on Gulf infrastructure without effective US protection',
      'US ground invasion of Iran requiring Gulf basing — would force explicit choice',
      'Gulf states invoke force majeure on $2T+ US investment commitments',
    ],
    description:
      'Relationship critically strained. Gulf states "explicitly told US their territory could not be used for strikes on Iran." ' +
      'Hussein Ibish: "Three layers: rage against Iran, dismay with Washington, suspicion about Israel." ' +
      'Vice Adm. Harward: "We have failed to earn the trust and confidence of our Gulf partners."',
    warImpact:
      'THAAD removal left Gulf states defenseless. Iran attacking their oil infrastructure. ' +
      'Three major Gulf economies reviewing $2T+ in US investment commitments. ' +
      'Russia/China filling security vacuum.',
  },
]

// ── SCENARIO PHASES ───────────────────────────────────────────

const PHASES: ScenarioPhase[] = [
  {
    id: 'phase_1_twelve_day_war',
    name: 'The Twelve-Day War',
    startDate: '2025-06-13',
    endDate: '2025-06-24',
    description:
      'Israel initiated with massive surprise attack on Iran military and nuclear infrastructure. ' +
      'Iran retaliated with 550+ ballistic missiles and 1,000+ suicide drones. ' +
      'US joined Day 9 with Operation Midnight Hammer (B-2 bombers, Tomahawks, first combat use of MOPs). ' +
      'Ceasefire brokered by US/Qatar June 24. Nuclear program degraded but NOT destroyed. ' +
      '~440 kg of 60% enriched uranium survived; location uncertain.',
    dominantDynamics: [
      'Israeli surprise attack',
      'Iranian ballistic missile and drone retaliation',
      'US Operation Midnight Hammer',
      'First combat use of Massive Ordnance Penetrators',
      'Ceasefire diplomacy',
    ],
    triggerEvent: 'evt_israel_initial_strikes_june13',
    endingEvent: 'evt_ceasefire_june24',
  },
  {
    id: 'phase_2_interwar',
    name: 'Interwar Period',
    startDate: '2025-07-01',
    endDate: '2026-02-27',
    description:
      'Iran expelled IAEA inspectors, halted cooperation, reconstituted capabilities at deeply buried sites. ' +
      'Economic crisis triggered massive protests December 2025; regime killed 5,000-36,500 in January 2026 crackdown. ' +
      'Diplomatic breakthrough announced February 27 — Iran agreed to full nuclear verification and uranium transfer. ' +
      'US executed largest Middle East military buildup since 2003.',
    dominantDynamics: [
      'Iranian nuclear reconstitution',
      'IAEA access suspended',
      'Economic crisis and mass protests',
      'January 2026 massacre',
      'US military buildup',
      'Diplomatic breakthrough (Feb 27)',
    ],
    triggerEvent: 'evt_ceasefire_june24',
    endingEvent: 'evt_operation_epic_fury_day1',
  },
  {
    id: 'phase_3_epic_fury',
    name: 'Operation Epic Fury',
    startDate: '2026-02-28',
    endDate: 'ongoing',
    description:
      'Joint US-Israel decapitation strike launched ONE DAY after Oman announced diplomatic breakthrough. ' +
      'Nearly 900 strikes in first 12 hours. Khamenei killed along with ~40 officials. ' +
      'Iran retaliated across region — missiles/drones against Israel, 27+ US bases, Gulf states. ' +
      'Strait of Hormuz closed for first time in history. Mojtaba Khamenei appointed March 8. ' +
      'Israel invaded southern Lebanon March 16. War ongoing at Day 19.',
    dominantDynamics: [
      'Decapitation strike one day after diplomatic breakthrough',
      'Ayatollah killed — religious nuclear constraint removed',
      'Mosaic Defense — 31 autonomous IRGC commands functioning',
      'Strait of Hormuz first-ever closure',
      'Drone attrition campaign (111:1 cost advantage for Iran)',
      'Gulf oil infrastructure targeting',
      'Nuclear breakout cascade activating',
    ],
    triggerEvent: 'evt_operation_epic_fury_day1',
  },
]

// ── GLOBAL STATE ──────────────────────────────────────────────

const GLOBAL_STATE: GlobalState = {
  oilPricePerBarrel: 109,
  // Brent: $108.78/bbl March 18; peaked $119-126 around March 9-10; baseline was $65-73 pre-conflict
  oilPriceChange: '+47-68% since conflict began (baseline $65-73; current $109)',
  globalStabilityIndex: 28,
  criticalAssets: [
    {
      name: 'Strait of Hormuz',
      controlledBy: 'iran',
      contestedBy: ['united_states'],
      globalImpact:
        '20M bbl/day (20% of global oil supply); 34% of global crude trade. ' +
        'First-ever closure in history. Mine threat makes clearing 3-6 months minimum.',
      currentStatus: 'blocked — first-ever closure in history',
    },
    {
      name: 'Kharg Island oil terminal',
      controlledBy: 'iran',
      contestedBy: [],
      globalImpact: 'Handles 90% of Iranian crude oil exports',
      currentStatus: 'destroyed — struck March 7 (Israel), "totally obliterated" per Trump March 13',
    },
    {
      name: 'South Pars natural gas field',
      controlledBy: 'iran',
      contestedBy: ['qatar'],
      globalImpact: "World's largest natural gas field; shared with Qatar",
      currentStatus: 'damaged — struck by Israel March 18, 2026',
    },
    {
      name: 'Ras Tanura (Saudi Arabia)',
      controlledBy: 'gulf_states',
      contestedBy: [],
      globalImpact: 'Largest oil export terminal in the world; Saudi Aramco primary export point',
      currentStatus: 'operational but threatened — 12 drones intercepted March 16',
    },
    {
      name: 'Abqaiq processing facility (Saudi Arabia)',
      controlledBy: 'gulf_states',
      contestedBy: [],
      globalImpact: 'Processes ~7% of global oil supply',
      currentStatus: 'operational but under threat',
    },
    {
      name: 'Ras Laffan LNG facility (Qatar)',
      controlledBy: 'gulf_states',
      contestedBy: [],
      globalImpact: "Qatar's main LNG export facility; key European gas supplier",
      currentStatus: 'damaged — struck by Iran; gas production halted temporarily',
    },
    {
      name: 'Fordow nuclear facility (Iran)',
      controlledBy: 'iran',
      contestedBy: [],
      globalImpact: 'Deeply buried uranium enrichment; first-ever combat use of MOPs against it',
      currentStatus: 'damaged — struck by B-2/MOPs June 2025; operational status uncertain',
    },
  ] satisfies GlobalAsset[],
  wildcards: [
    'Iran nuclear breakout — 440 kg of 60% HEU location unknown to IAEA; enrichment to 90% in "a few weeks"',
    'Fattah-2 hypersonic inventory — if larger than assessed, could defeat all US/Israeli air defense',
    'Gulf states $2T+ US investment withdrawal — would trigger financial crisis',
    'Mojtaba Khamenei incapacitation — IRGC fully autonomous governance',
    'Russia escalation in Ukraine while US pinned in Middle East',
    'China Taiwan action window — THAAD removed from Korea; US tied down',
    'Iraqi militia activation — 300+ attacks pre-war; Mojtaba praised them; could reopen second front',
  ],
  globalEconomicEffects: [
    {
      description: 'Oil price surge driving global inflation and potential recession',
      affectedRegions: ['Europe', 'Asia-Pacific', 'Global South', 'United States'],
      severity: 72,
    },
    {
      description: 'Gulf sovereign wealth funds reviewing $2T+ in US asset commitments',
      affectedRegions: ['United States', 'Global financial markets'],
      severity: 65,
    },
    {
      description: 'Semiconductor supply chain disruption — helium (from Qatar) critical for chip manufacturing',
      affectedRegions: ['Asia-Pacific', 'United States', 'Europe'],
      severity: 55,
    },
    {
      description: 'Fertilizer supply chain disruption — Iran/Gulf gas feedstocks for ammonia production',
      affectedRegions: ['Global South', 'Africa', 'South Asia'],
      severity: 60,
    },
    {
      description: 'Yuan oil trade expanding — China/Russia accepting payment in yuan; petrodollar erosion',
      affectedRegions: ['Global', 'Middle East', 'Asia'],
      severity: 45,
    },
    {
      description: 'Dubai real estate market collapse — regional instability, foreign exodus',
      affectedRegions: ['UAE', 'Gulf region'],
      severity: 50,
    },
  ],
}

// ── ASSEMBLED INITIAL STATE ───────────────────────────────────

export const IRAN_INITIAL_STATE: IranInitialState = {
  name: 'US-Israel-Iran Conflict 2026',
  description:
    'Operation Epic Fury — Day 19 branching point. ' +
    'The simulation branches from March 19, 2026, 19 days into the joint US-Israel ' +
    'strike campaign against Iran that began one day after a diplomatic breakthrough.',
  timestamp: '2026-03-19',
  backgroundContext:
    'CRITICAL DIPLOMATIC CONTEXT: The joint US-Israel strike package was launched ONE DAY after ' +
    "Oman's FM announced a diplomatic breakthrough — Iran had agreed to transfer enriched uranium " +
    'abroad and accept full IAEA verification. Netanyahu called Trump on Feb 23 to share ' +
    "Khamenei's location. This timing fundamentally shapes every actor's reasoning about " +
    'legitimacy, trust, and negotiation credibility. Iran will not negotiate under fire; ' +
    'US diplomatic credibility with third parties is severely damaged; Gulf states view ' +
    'US as an unreliable partner that prioritizes Israeli objectives over their security.\n\n' +
    'NUCLEAR CONSTRAINT CASCADE: All three constraints on Iranian nuclear breakout have degraded simultaneously: ' +
    "(1) Religious prohibition — Ayatollah's fatwa REMOVED by his death on Day 1; " +
    '(2) Deterrence constraint — REMOVED because attack is already happening; ' +
    "(3) International isolation risk — WEAKENED because Iran is already under maximum sanctions. " +
    'This cascade is the single most dangerous strategic dynamic in the simulation.',
  phases: PHASES,
  currentPhaseId: 'phase_3_epic_fury',
  actors: [
    {
      id: 'united_states',
      name: 'United States of America',
      type: 'nation_state',
      description:
        'Primary military force in the coalition. War of choice framed as regime change. ' +
        'Faces lowest initial public support for any US military operation in modern polling history (40-44%). ' +
        'AIPAC influence (82/100) ensures bipartisan policy consensus despite public opposition.',
      keyFigures: US_KEY_FIGURES,
      state: US_STATE as ActorState,
      constraints: US_CONSTRAINTS,
      objectives: [],
      capabilities: { strengths: [], limitations: [] },
      decisionFactors: [],
      escalation: { currentRung: 5, rungs: [], escalationTriggers: [], deescalationConditions: [] },
      intelligencePicture: [],
    },
    {
      id: 'iran',
      name: 'Islamic Republic of Iran',
      type: 'nation_state',
      description:
        'Defensive actor using asymmetric attrition strategy. Win condition: survive as a state. ' +
        'Mosaic Defense (31 autonomous IRGC commands) functioning despite decapitation. ' +
        'Strait closure is primary economic leverage. Nuclear breakout cascade now unconstrained.',
      keyFigures: IRAN_KEY_FIGURES,
      state: IRAN_STATE as ActorState,
      constraints: IRAN_CONSTRAINTS,
      objectives: [],
      capabilities: { strengths: [], limitations: [] },
      decisionFactors: [],
      escalation: { currentRung: 6, rungs: [], escalationTriggers: [], deescalationConditions: [] },
      intelligencePicture: [],
    },
    {
      id: 'israel',
      name: 'State of Israel',
      type: 'nation_state',
      description:
        'Initiated Operation Epic Fury one day after diplomatic breakthrough. ' +
        'Fighting on three simultaneous fronts (Iran, Lebanon, Gaza). ' +
        'Faces March 31 budget deadline that could dissolve Knesset and trigger elections. ' +
        '81% domestic support but structural fragility from multi-front overextension.',
      keyFigures: ISRAEL_KEY_FIGURES,
      state: ISRAEL_STATE as ActorState,
      constraints: ISRAEL_CONSTRAINTS,
      objectives: [],
      capabilities: { strengths: [], limitations: [] },
      decisionFactors: [],
      escalation: { currentRung: 6, rungs: [], escalationTriggers: [], deescalationConditions: [] },
      intelligencePicture: [],
    },
    {
      id: 'russia',
      name: 'Russian Federation',
      type: 'nation_state',
      description:
        'Opportunistic beneficiary. Providing Iran intelligence on US warship positions. ' +
        'Oil revenue windfall from $109/bbl prices. Using US Middle East overextension for Ukraine pressure. ' +
        'Russia-China-Iran conducted joint naval drills in Strait of Hormuz February 2026.',
      keyFigures: [],
      state: {
        military: { overallReadiness: 60, assets: [], activeOperations: [], vulnerabilities: [], nuclear: { capability: 'confirmed', estimatedWarheads: 6257, deliveryMethods: ['ICBMs', 'SLBMs', 'aircraft'], useDoctrineDescription: 'First use permitted if state survival threatened; lower threshold than NATO', escalationRungForUse: 6, constraints: [] } },
        economic: { overallHealth: 42, keyVulnerabilities: ['Sanctions', 'Ukraine war costs'], keyLeverages: ['Oil/gas exports at $109/bbl', 'SWIFT alternative (SPFS)', 'OPEC+ leverage'], sanctionsExposure: 70, oilDependency: { asExporter: 80, asImporter: 5 }, warCostTolerance: 55, energyInfrastructure: { oilProductionCapacity: '9.5M barrels/day', currentOutput: '9.5M barrels/day', criticalFacilities: [], exportRoutes: [], damageLevel: 0 } },
        political: { regimeStability: 72, leadershipCohesion: 78, governmentType: 'Authoritarian presidential system', warPowersDescription: 'Putin has full war powers; no legislative constraint', influenceChannels: [], policyDisconnect: { gapSeverity: 30, estimatedToleranceDuration: '2-3 years', breakingPoints: ['Elite defection', 'Ukraine stalemate'], oppositionAlternative: 'No viable alternative', bipartisanConsensus: true }, pressurePoints: ['Ukraine attrition', 'Elite coalition stability'] },
        diplomatic: { internationalStanding: 22, activeNegotiations: [], allianceStrength: 40, isolationRisk: 65 },
        intelligence: { signalCapability: 80, humanCapability: 75, cyberCapability: 85, blindSpots: [], exposureLevel: 30, intelSharingPartners: [{ actorId: 'iran', description: 'Providing US warship position intelligence to Iran' }] },
      } as ActorState,
      constraints: [],
      objectives: [],
      capabilities: { strengths: [], limitations: [] },
      decisionFactors: [],
      escalation: { currentRung: 2, rungs: [], escalationTriggers: [], deescalationConditions: [] },
      intelligencePicture: [],
    },
    {
      id: 'china',
      name: "People's Republic of China",
      type: 'nation_state',
      description:
        'Strategic patience — NOT opportunistic aggression. Passively benefiting from US overextension. ' +
        'THAAD removal from South Korea = intelligence windfall (AN/TPY-2 no longer peering 3,000km into China). ' +
        'De-escalating around Taiwan; prioritizing summit diplomacy. Expanding yuan oil trade.',
      keyFigures: [],
      state: {
        military: { overallReadiness: 82, assets: [], activeOperations: [], vulnerabilities: ['Taiwan Strait exposure', 'South China Sea overextension'], nuclear: { capability: 'confirmed', estimatedWarheads: 500, deliveryMethods: ['ICBMs', 'SLBMs', 'aircraft', 'DF-41'], useDoctrineDescription: 'No first use doctrine (officially); modernizing to second-strike assured destruction', escalationRungForUse: 7, constraints: ['No first use doctrine'] } },
        economic: { overallHealth: 65, gdpEstimate: 18000000000000, keyVulnerabilities: ['Strait of Hormuz closure (imports 40% of oil via Strait)', 'Export market disruption'], keyLeverages: ['World\'s largest oil importer (leverage on producers)', 'Yuan oil trade expanding', 'Belt and Road infrastructure leverage', 'Supply chain dominance'], sanctionsExposure: 25, oilDependency: { asExporter: 2, asImporter: 75 }, warCostTolerance: 75, energyInfrastructure: { oilProductionCapacity: '4M barrels/day (domestic)', currentOutput: '4M barrels/day', criticalFacilities: [], exportRoutes: [], damageLevel: 0 } },
        political: { regimeStability: 80, leadershipCohesion: 82, governmentType: 'Single-party authoritarian state', warPowersDescription: 'Xi Jinping has full strategic authority; PLA under party control', influenceChannels: [], policyDisconnect: { gapSeverity: 20, estimatedToleranceDuration: 'Indefinite', breakingPoints: ['Economic crisis', 'Taiwan humiliation'], oppositionAlternative: 'None', bipartisanConsensus: true }, pressurePoints: ['Property market crisis', 'Youth unemployment'] },
        diplomatic: { internationalStanding: 55, activeNegotiations: [], allianceStrength: 45, isolationRisk: 30 },
        intelligence: { signalCapability: 78, humanCapability: 70, cyberCapability: 88, blindSpots: [], exposureLevel: 25, intelSharingPartners: [{ actorId: 'iran', description: 'Satellite imagery sharing; strategic alignment' }] },
      } as ActorState,
      constraints: [
        {
          dimension: 'military',
          description: 'No direct military intervention in Iran conflict — would trigger US direct confrontation',
          severity: 'hard',
          status: 'active',
          releaseCondition: 'Direct US attack on Chinese assets or personnel',
        },
      ],
      objectives: [],
      capabilities: { strengths: [], limitations: [] },
      decisionFactors: [],
      escalation: { currentRung: 1, rungs: [], escalationTriggers: [], deescalationConditions: [] },
      intelligencePicture: [],
    },
    {
      id: 'gulf_states',
      name: 'Gulf Cooperation Council States (UAE, Saudi Arabia, Qatar, Bahrain)',
      type: 'alliance',
      description:
        'Caught in crossfire between US ally obligations and Iranian retaliation. ' +
        'Furious at US for THAAD removal leaving them defenseless. ' +
        'Reviewing $2T+ in US investment commitments. ' +
        'Qatar Ras Laffan struck (gas production halted). Saudi Shaybah targeted. UAE Shah gas field suspended.',
      keyFigures: [],
      state: {
        military: { overallReadiness: 45, assets: [], activeOperations: [], vulnerabilities: ['THAAD removed by US', 'Iranian missile/drone range', 'Qatar Patriot stocks ~4 days at current rates'], nuclear: { capability: 'none', useDoctrineDescription: 'No nuclear capability', escalationRungForUse: 10, constraints: ['Non-proliferation treaty'] } },
        economic: { overallHealth: 55, keyVulnerabilities: ['Oil infrastructure under attack', 'Qatar gas production disrupted', 'Dubai real estate collapse'], keyLeverages: ['$2T+ US asset leverage', 'OPEC+ production decisions', 'Basing access for US forces'], sanctionsExposure: 5, oilDependency: { asExporter: 90, asImporter: 10 }, warCostTolerance: 60, energyInfrastructure: { oilProductionCapacity: '17M barrels/day combined', currentOutput: '14M barrels/day (Ras Laffan disrupted, Shah gas suspended)', criticalFacilities: [{ name: 'Ras Tanura (Saudi Arabia)', owner: 'gulf_states', status: 'operational', globalSignificance: 'Largest oil export terminal globally', strikeHistory: ['12 drones intercepted March 16'] }, { name: 'Abqaiq processing facility (Saudi Arabia)', owner: 'gulf_states', status: 'operational', globalSignificance: 'Processes ~7% of global oil supply', strikeHistory: [] }, { name: 'Ras Laffan LNG (Qatar)', owner: 'gulf_states', status: 'damaged', globalSignificance: "Qatar's main LNG export facility", strikeHistory: ['Struck by Iran March 2026'] }, { name: 'Shah gas field (UAE)', owner: 'gulf_states', status: 'damaged', globalSignificance: 'UAE domestic gas production', strikeHistory: ['Struck by Iranian drone'] }], exportRoutes: [{ name: 'Strait of Hormuz', status: 'blocked', controlledBy: 'iran', globalImpact: 'Primary export route for all Gulf states', mineThreat: { level: 'extreme', estimatedMinesPlaced: 'unknown', clearingTimeline: '3-6 months', clearingAssetsAvailable: 'Minimal MCM assets; US focused elsewhere' } }], damageLevel: 35 } },
        political: { regimeStability: 62, leadershipCohesion: 55, governmentType: 'Absolute monarchies (Saudi, UAE, Qatar, Bahrain)', warPowersDescription: 'Monarchs have full authority; GCC coordination body for collective decisions', influenceChannels: [], policyDisconnect: { gapSeverity: 25, estimatedToleranceDuration: '6-12 months', breakingPoints: ['Further infrastructure attacks', 'US failure to protect'], oppositionAlternative: 'None — monarchies; but elite dissatisfaction growing', bipartisanConsensus: true }, pressurePoints: ['Rage at Iran for attacks', 'Dismay at Washington for abandonment', 'Suspicion of Israeli regional agenda'] },
        diplomatic: { internationalStanding: 52, activeNegotiations: [{ name: 'Iran backchannel', counterparties: ['iran'], status: 'active', demands: ['Stop attacks on Gulf infrastructure'], concessions: [], blockers: ['US pressure against separate deals'], leverage: 'Gulf states have economic leverage over both US and Iran' }], allianceStrength: 38, isolationRisk: 20 },
        intelligence: { signalCapability: 55, humanCapability: 60, cyberCapability: 50, blindSpots: ['Iranian missile stockpile locations', 'IRGC command structure after decapitation'], exposureLevel: 45, intelSharingPartners: [{ actorId: 'united_states', description: 'Limited after THAAD removal — relationship strained' }] },
      } as ActorState,
      constraints: [
        {
          dimension: 'military',
          description: 'Cannot formally ally with Iran while dependent on US security guarantees',
          severity: 'soft',
          status: 'weakened',
          statusRationale: 'US security guarantee credibility destroyed by THAAD removal. Backchannel with Iran active.',
        },
      ],
      objectives: [],
      capabilities: { strengths: [], limitations: [] },
      decisionFactors: [],
      escalation: { currentRung: 2, rungs: [], escalationTriggers: [], deescalationConditions: [] },
      intelligencePicture: [],
    },
  ],
  relationships: RELATIONSHIPS,
  globalState: GLOBAL_STATE,
}
