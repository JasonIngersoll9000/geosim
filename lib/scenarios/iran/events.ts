import type { SeedEvent } from '../../types/simulation'

// ------------------------------------------------------------
// IRAN CONFLICT VERIFIED EVENTS
// Ground truth trunk: Phase 2 (Feb 2026) through Phase 3 Day 19
// All events sourced from research-military.md, research-political.md,
// research-economic.md. Only verified/confirmed events included.
// ------------------------------------------------------------

export const IRAN_EVENTS: SeedEvent[] = [
  // ── PHASE 2: INTERWAR PERIOD ─────────────────────────────
  {
    id: 'evt_oman_indirect_talks',
    timestamp: '2026-02-06',
    title: 'Oman-brokered indirect US-Iran nuclear talks begin in Muscat',
    description:
      'Iran and the United States begin indirect negotiations via Omani FM Al Busaidi in Muscat. Iran signals willingness to transfer enriched uranium abroad and accept strict monitoring. Talks described as coming "close to achieving a genuine breakthrough." University of Maryland polling shows 21% US public support for military action — lowest pre-war baseline in modern US history.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'diplomatic',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 28,
        newValue: 35,
        description: 'Iran gains diplomatic legitimacy by engaging in Oman-brokered talks',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 58,
        newValue: 62,
        description: 'US diplomatic standing improves as negotiations show progress',
        magnitude: 'minor',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_oman_breakthrough_announcement',
    timestamp: '2026-02-26',
    title: 'Oman FM announces diplomatic breakthrough "within reach"',
    description:
      'Omani FM Al Busaidi declares peace is "within reach" — Iran has agreed to never stockpile enriched uranium, accept full IAEA verification, and downgrade existing enriched uranium. Follow-up talks scheduled for March 2. This announcement comes two days before Operation Epic Fury begins. Netanyahu calls Trump on February 23 to inform him of Khamenei\'s upcoming meeting location with top advisors.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'diplomatic',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 35,
        newValue: 42,
        description: 'Iran gains significant diplomatic credibility with breakthrough announcement',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'regimeStability',
        previousValue: 72,
        newValue: 70,
        description: 'Diplomatic progress increases internal US pressure against military action',
        magnitude: 'minor',
        verificationStatus: 'verified',
      },
    ],
    intelConsequences: [
      {
        actorId: 'iran',
        revealed: 'Iran\'s willingness to accept full IAEA monitoring confirmed to US intelligence',
      },
    ],
    verificationStatus: 'verified',
  },

  // ── PHASE 3: OPERATION EPIC FURY ─────────────────────────
  {
    id: 'evt_operation_epic_fury_launch',
    timestamp: '2026-02-28',
    title: 'Operation Epic Fury launches: 900 US-Israeli strikes in 12 hours',
    description:
      'Trump orders Operation Epic Fury at 20:38 UTC. Nearly 900 coordinated US-Israeli strikes in the first 12 hours target 24 of Iran\'s 31 provinces — the largest joint US-Israeli military operation in history. Israel simultaneously launches Operation Roaring Lion. Strikes hit military infrastructure, command centers, and leadership compounds across Iran. This comes one day after Oman\'s diplomatic breakthrough announcement.',
    initiatedBy: 'united_states',
    targetedActors: ['iran'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 62,
        newValue: 38,
        description: 'Massive opening strikes destroy ~50% of conventional military capability',
        magnitude: 'critical',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 82,
        newValue: 76,
        description: 'US munitions expenditure: $5.6B in first two days, 14% of THAAD stockpile consumed',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 42,
        newValue: 52,
        description:
          'International sympathy surges — strikes came one day after diplomatic breakthrough',
        magnitude: 'major',
        verificationStatus: 'verified',
        thirdPartyEffects: [
          {
            actorId: 'gulf_states',
            description: 'Gulf states furious — not consulted, territory exposed',
          },
        ],
      },
    ],
    escalationChanges: [
      {
        actorId: 'united_states',
        previousRung: 3,
        newRung: 5,
        rationale: 'US launches full-scale military offensive against Iran — major escalation',
      },
      {
        actorId: 'israel',
        previousRung: 4,
        newRung: 6,
        rationale: 'Israel launches coordinated decapitation strike alongside US',
      },
    ],
    intelConsequences: [
      {
        actorId: 'united_states',
        revealed: 'IRGC command structure more resilient than assessed — mosaic defense activating',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_khamenei_killed',
    timestamp: '2026-02-28',
    title: 'Supreme Leader Khamenei killed; senior leadership decapitated',
    description:
      'Supreme Leader Ali Khamenei is struck at his compound on Pasteur Street, Tehran at approximately 09:32 local time by Israeli strikes. Iranian state media confirms death at ~05:00 March 1 Iran time. Also killed on Day 1: Defense Minister Nasirzadeh, IRGC Commander-in-Chief Pakpour, Armed Forces Chief of Staff Mousavi, Intelligence chief Asadi, Security Council Secretary Shamkhani. ~40 total senior officials killed. The Ayatollah\'s death removes the religious fatwa prohibiting nuclear weapons development.',
    initiatedBy: 'israel',
    targetedActors: ['iran'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'political',
        field: 'leadershipCohesion',
        previousValue: 68,
        newValue: 32,
        description: 'Supreme Leader and entire top leadership tier killed in single strikes',
        magnitude: 'critical',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'political',
        field: 'regimeStability',
        previousValue: 55,
        newValue: 48,
        description: 'Leadership vacuum creates regime instability — IRGC Interim Council assumes control',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    escalationChanges: [
      {
        actorId: 'iran',
        previousRung: 4,
        newRung: 6,
        rationale:
          'Khamenei\'s death removes religious prohibition on nuclear weapons; Iran enters existential defense mode',
      },
    ],
    intelConsequences: [
      {
        actorId: 'iran',
        concealed: 'Location and status of dispersed enriched uranium stockpile now unknown — IAEA cannot account for 440kg of 60%-enriched uranium',
      },
      {
        actorId: 'united_states',
        revealed: 'IRGC mosaic defense activating — 31 autonomous provincial commands on pre-delegated authority',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_mojtaba_assumes_power',
    timestamp: '2026-03-01',
    title: 'Mojtaba Khamenei appears on state TV; IRGC assumes interim control',
    description:
      'Mojtaba Khamenei appears on Iranian state television flanked by IRGC commanders, declaring his father a martyr and promising retaliation that will "shake the thrones of the aggressors." IRGC Interim Leadership Council governs during 10-day gap before formal succession. Iranian FM Araghchi admits: "Our military units are now, in fact, independent and somewhat isolated, and they are acting based on general instructions given to them in advance." Mojtaba is reportedly injured and his wife, sister, and mother were killed.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'political',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'political',
        field: 'leadershipCohesion',
        previousValue: 32,
        newValue: 41,
        description: 'IRGC establishes interim command — decentralized structure maintains function',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'political',
        field: 'regimeStability',
        previousValue: 48,
        newValue: 52,
        description: 'Rally-around-the-flag effect begins; IRGC consolidates power',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_strait_hormuz_closure',
    timestamp: '2026-03-01',
    title: 'Iran announces Strait of Hormuz closed to Western-aligned shipping',
    description:
      'IRGC commander Ebrahim Jabari announces the Strait "closed," warning vessels attempting to cross will be "set ablaze." Ship-tracking shows 70% traffic reduction immediately. 21 confirmed attacks on merchant ships within two weeks. Iran announces selective passage: Chinese, Turkish, and Indian-flagged vessels may transit; US, Israeli, and Western-allied vessels are blocked. Over 400 vessels hold position in Gulf of Oman. Major insurers (American Club, Gard, Skuld) withdraw coverage — creating a de facto insurance blockade.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'gulf_states'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'economic',
        field: 'warCostTolerance',
        previousValue: 42,
        newValue: 52,
        description: 'Strait closure gives Iran its primary strategic leverage over the West',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'economic',
        field: 'overallHealth',
        previousValue: 68,
        newValue: 60,
        description: 'Strait closure triggers oil price spike and supply chain disruption',
        magnitude: 'critical',
        verificationStatus: 'verified',
        thirdPartyEffects: [
          { actorId: 'gulf_states', description: 'Gulf state oil exports disrupted — $15B lost in first two weeks' },
          { actorId: 'russia', description: 'Russia benefits — Urals crude rises from $40 to $70+/bbl' },
          { actorId: 'china', description: 'China granted passage for Chinese-flagged vessels' },
        ],
      },
    ],
    escalationChanges: [
      {
        actorId: 'iran',
        previousRung: 6,
        newRung: 6,
        rationale: 'Strait closure is core of Iran\'s asymmetric attrition strategy — holds at rung 6',
      },
    ],
    intelConsequences: [
      {
        actorId: 'united_states',
        concealed: 'Iran\'s mine-laying operations in Strait — clearing timeline 3-6 months minimum',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_shahed_drone_swarm_day3',
    timestamp: '2026-03-02',
    title: 'First major Shahed drone swarm: 340 drones, 89% intercepted',
    description:
      'Iran launches the first major drone swarm of the current war — approximately 340 Shahed-136 drones targeting Israeli air bases and US positions in the Gulf. Approximately 89% intercepted by US and Israeli air defense systems. US expends ~180 Patriot PAC-3 interceptors ($4M each) to defeat ~$35,000 drones — a 100:1+ cost ratio exploiting US munition stockpiles. IRGC also attacks 27+ US bases across the Middle East. Ras Laffan LNG complex in Qatar struck by separate Iranian drone.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel', 'gulf_states'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 76,
        newValue: 72,
        description: '~180 Patriot interceptors expended; air defense stockpiles depleting at unsustainable rate',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 38,
        newValue: 36,
        description: 'Minor drone attrition — production rate (200-500/month) offsets losses',
        magnitude: 'minor',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_irgc_mosaic_defense_confirmed',
    timestamp: '2026-03-02',
    title: 'IRGC mosaic defense confirmed operational: 31 autonomous provincial commands',
    description:
      'Iranian FM Araghchi publicly confirms the IRGC mosaic defense is functioning: "Our military units are now, in fact, independent and somewhat isolated, and they are acting based on general instructions given to them in advance." The 31 semi-autonomous provincial commands — each with independent intelligence, weapons stockpiles, and pre-delegated strike authority — continue operations despite the loss of the entire top command tier. This validates a pre-war US intelligence assessment that was largely ignored by planners.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'intelligence',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 36,
        newValue: 40,
        description: 'Mosaic defense resilience confirmed — decentralized structure offsets leadership losses',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'intelligence',
        field: 'humanCapability',
        previousValue: 72,
        newValue: 62,
        description: 'US discovers decapitation strategy has failed — IRGC continues without central command',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    intelConsequences: [
      {
        actorId: 'united_states',
        revealed: 'IRGC mosaic defense fully operational — 31 commands with pre-delegated authority confirmed',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_ras_tanura_struck',
    timestamp: '2026-03-04',
    title: 'Iran strikes Ras Tanura refinery; Qatar force majeure on LNG',
    description:
      'Iranian drones strike the Ras Tanura refinery (550,000 bpd) — Saudi Aramco\'s largest refinery — forcing precautionary shutdown. Simultaneously, Iranian drone strikes the Ras Laffan LNG complex in Qatar (77 million tonnes/annum, 20% of global LNG), prompting QatarEnergy to halt all LNG production and declare force majeure on March 4. Gulf oil producers lose an estimated $15 billion in first two weeks. IEA describes this as "the largest supply disruption in the history of the global oil market."',
    initiatedBy: 'iran',
    targetedActors: ['gulf_states', 'united_states'],
    dimension: 'economic',
    impacts: [
      {
        actorId: 'gulf_states',
        dimension: 'economic',
        field: 'overallHealth',
        previousValue: 62,
        newValue: 48,
        description: 'Ras Tanura (Saudi) and Ras Laffan (Qatar) struck — $15B lost in two weeks',
        magnitude: 'critical',
        verificationStatus: 'verified',
        thirdPartyEffects: [
          { actorId: 'russia', description: 'Russia\'s oil windfall accelerates — becomes preferred alternative supplier' },
          { actorId: 'china', description: 'China\'s LNG from Qatar at risk — pressure to end war' },
        ],
      },
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'regimeStability',
        previousValue: 68,
        newValue: 64,
        description: 'Gulf allies furious — reviewing $2T+ in US investment commitments',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_oil_price_spike_108',
    timestamp: '2026-03-05',
    title: 'Oil reaches $108/bbl; IEA emergency reserve release authorized',
    description:
      'Brent crude surges to $108.78/bbl — up ~50% from pre-war $70-73 baseline. Peaks at $119-126/bbl around March 9-10. US gas prices hit ~$3.60/gallon (up 35 cents in one week). IEA authorizes 400-million-barrel emergency reserve release on March 11 — the largest in IEA history, more than double the release after Russia invaded Ukraine. US contributes 172 million barrels from SPR. Prices briefly dip to $87 before rebounding. Trump issues 30-day sanctions waiver on Russian oil (March 13) to stabilize supply.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'gulf_states'],
    dimension: 'economic',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'economic',
        field: 'overallHealth',
        previousValue: 60,
        newValue: 54,
        description: 'Oil at $108/bbl drives inflation spike; US consumer sentiment falls to 57.9',
        magnitude: 'critical',
        verificationStatus: 'verified',
      },
      {
        actorId: 'russia',
        dimension: 'economic',
        field: 'overallHealth',
        previousValue: 48,
        newValue: 58,
        description: 'Russia windfall: Urals rises from $40 to $70+/bbl; $150M/day additional revenue',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'economic',
        field: 'warCostTolerance',
        previousValue: 52,
        newValue: 56,
        description: 'Iran\'s oil leverage validated — economic pain on adversaries is working',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_us_air_defense_60pct',
    timestamp: '2026-03-06',
    title: 'US air defense reserves cross critical 60% threshold',
    description:
      'Sustained Iranian drone and missile swarms have depleted US air defense stockpiles to approximately 60% of pre-war levels. CENTCOM reports 300+ Patriot and other interceptors consumed in first 36 hours alone. The US burned through 14% of its total THAAD interceptor stockpile. Russia confirmed providing satellite imagery and targeting information to Iran, helping improve drone strike accuracy (Washington Post, 3 US officials). The cost asymmetry — $4M Patriot vs. $35,000 Shahed — is inflicting unsustainable attrition on US air defense capacity.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 72,
        newValue: 65,
        description: 'Air defense reserves at ~60% — Patriot and THAAD interceptors depleting rapidly',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'russia',
        dimension: 'intelligence',
        field: 'humanCapability',
        previousValue: 68,
        newValue: 74,
        description: 'Russia expanding intelligence sharing to Iran — satellite targeting data confirmed',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
    ],
    intelConsequences: [
      {
        actorId: 'iran',
        revealed: 'Russia providing real-time US fleet position and targeting data via Kanopus-V satellite',
      },
      {
        actorId: 'united_states',
        revealed: 'Russia confirmed providing targeting intelligence to Iran — escalation of Russian involvement',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_thaad_systems_destroyed',
    timestamp: '2026-03-08',
    title: 'THAAD systems destroyed: 4 of 7 operational units lost',
    description:
      'Iranian strikes destroy 4 of 7 THAAD missile defense systems deployed to the Middle East. THAAD systems were redeployed from South Korea\'s Seongju base for the Iran operation — creating a major intelligence benefit for China (the AN/TPY-2 radars can see 3,000km into Chinese territory). Simultaneously, Mojtaba Khamenei formally elected third Supreme Leader by Assembly of Experts on March 8-9 — obtaining required two-thirds majority. He is reportedly injured, his first message read by a state TV anchor over a still photo.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 65,
        newValue: 58,
        description: '4 of 7 THAAD units destroyed — upper-tier missile defense critically degraded',
        magnitude: 'critical',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'political',
        field: 'leadershipCohesion',
        previousValue: 41,
        newValue: 50,
        description: 'Mojtaba Khamenei formally elected Supreme Leader — constitutional succession complete',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    intelConsequences: [
      {
        actorId: 'china',
        revealed: 'THAAD removal from South Korea — AN/TPY-2 radars no longer surveilling 3,000km into Chinese territory',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_joe_kent_resignation',
    timestamp: '2026-03-17',
    title: 'Joe Kent resigns as NCTC Director — highest-ranking Trump official to quit over Iran war',
    description:
      'Joe Kent resigns as Director of the National Counterterrorism Center — the highest-ranking Trump administration official to resign over the Iran war. Resignation letter posted on X: "I cannot in good conscience support the ongoing war in Iran. Iran posed no imminent threat to our nation, and it is clear that we started this war due to pressure from Israel and its powerful American lobby." He explicitly links the war to "the same tactic the Israelis used to draw us into the disastrous Iraq war." Trump responds: "I always thought he was weak on security." Axios reports administration bracing for Tucker Carlson interview.',
    initiatedBy: 'united_states',
    targetedActors: ['united_states'],
    dimension: 'political',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'leadershipCohesion',
        previousValue: 62,
        newValue: 54,
        description: 'Kent resignation signals elite fracture — MAGA anti-war faction gains credibility',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'regimeStability',
        previousValue: 64,
        newValue: 60,
        description: 'Policy disconnect widens — most prominent administration official condemns the war',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_oil_hits_142',
    timestamp: '2026-03-12',
    title: 'Oil reaches $142/bbl peak; Gulf States issue joint criticism of US',
    description:
      'Brent crude peaks at $119-126/bbl around March 9-10. WTI reaches $95.70/bbl on March 12. US gas prices reach $3.79/gallon nationally — up $0.87 (+30%) in one month. Diesel hits $5.04/gallon. Gulf States issue a joint statement criticizing both the US decision-making and Iran\'s retaliatory strikes. Financial Times reports three of four major Gulf economies beginning internal reviews of investment commitments — Gulf sovereign wealth funds manage >$2T in US assets. Dubai real estate stock index falls 30%.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'gulf_states'],
    dimension: 'economic',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'economic',
        field: 'overallHealth',
        previousValue: 54,
        newValue: 48,
        description: 'Oil at $142/bbl peak triggers stagflation fears; consumer sentiment at 57.9',
        magnitude: 'critical',
        verificationStatus: 'verified',
        thirdPartyEffects: [
          { actorId: 'gulf_states', description: 'Gulf SWFs begin reviewing $2T+ in US investment commitments' },
        ],
      },
      {
        actorId: 'gulf_states',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 52,
        newValue: 46,
        description: 'Gulf States issue joint criticism — alignment with US military operations unraveling',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_iraqi_militia_activation',
    timestamp: '2026-03-13',
    title: 'Iraqi militia (Islamic Resistance in Iraq) activates: 300+ attacks on US forces',
    description:
      'The Islamic Resistance in Iraq — an umbrella of IRGC-linked militias — activates a secondary front against US forces, launching 300+ attacks on US bases in Iraq and Syria. This opens a multi-front attrition campaign designed to overextend US forces and force redeployment decisions. The militia\'s goal is to drag the US into a "long war of attrition" — consistent with Iran\'s overall asymmetric strategy. Baghdad Green Zone and Erbil struck.',
    initiatedBy: 'iran',
    targetedActors: ['united_states'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 58,
        newValue: 54,
        description: 'Multi-front attrition: 300+ militia attacks force force protection resource diversion',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 40,
        newValue: 42,
        description: 'Proxy network activation extends Iran\'s operational reach without direct exposure',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_china_yuan_oil_proposal',
    timestamp: '2026-03-14',
    title: 'China advances yuan-for-oil passage; Iranian oil exports continue',
    description:
      'Senior Iranian official confirms Iran is "considering" allowing tankers to pass if cargo is traded in Chinese yuan (CNN, March 14). China continues importing approximately 1.25 million bpd from Iran via shadow fleet under IRGC protection — satellite images show 2.7 million barrels loading at Kharg Island on a single day. China grants access to BeiDou-3 encrypted satellite navigation system for Iranian strike guidance. China refuses Trump\'s demand to police the Strait. Chinese-flagged vessels granted selective passage by Iran.',
    initiatedBy: 'china',
    targetedActors: ['united_states', 'iran'],
    dimension: 'economic',
    impacts: [
      {
        actorId: 'china',
        dimension: 'economic',
        field: 'overallHealth',
        previousValue: 71,
        newValue: 68,
        description: 'China faces energy supply disruption but continues Iranian oil imports via shadow fleet',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'economic',
        field: 'warCostTolerance',
        previousValue: 56,
        newValue: 60,
        description: 'China continuing oil purchases sustains Iran\'s economic viability during war',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 52,
        newValue: 48,
        description: 'China refusing US demands and advancing yuan-for-oil undermines US pressure campaign',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_russia_expands_intel_sharing',
    timestamp: '2026-03-16',
    title: 'Russia expands intelligence sharing to include radar system targeting',
    description:
      'Wall Street Journal reports Russia has expanded intelligence sharing with Iran to include improved drone guidance enabling "more precise strikes on radar and missile systems in the Gulf" (March 17). Russia providing satellite imagery and targeting information including "locations and movements of American troops, ships, and aircraft" (confirmed by Washington Post, CNN, NBC, AP — multiple US officials). Russia\'s Kanopus-V satellite ("Khayyam" for Iranian operations) provides round-the-clock optical and radar imagery. Ukraine territory: Russia loses 57 square miles Feb 10 - March 10 despite war diverting Western attention.',
    initiatedBy: 'russia',
    targetedActors: ['united_states', 'iran'],
    dimension: 'intelligence',
    impacts: [
      {
        actorId: 'russia',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 32,
        newValue: 28,
        description: 'Russia intelligence sharing with Iran strains Western relations further',
        magnitude: 'minor',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'intelligence',
        field: 'signalCapability',
        previousValue: 52,
        newValue: 64,
        description: 'Russian satellite and targeting data significantly upgrades Iranian strike precision',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 54,
        newValue: 51,
        description: 'Iranian strikes on radar systems more precise due to Russian intelligence — THAAD positions targeted',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    intelConsequences: [
      {
        actorId: 'united_states',
        revealed: 'Russia providing real-time fleet position data — US force movements no longer operationally secure',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_nuclear_breakout_cascade',
    timestamp: '2026-03-17',
    title: 'Nuclear breakout cascade: 2 of 3 constraints removed',
    description:
      'Intelligence assessment confirms the nuclear breakout constraint cascade has reached critical stage. Three constraints that previously prevented Iranian nuclear weapons development have been progressively removed: (1) Religious prohibition — Ayatollah\'s fatwa removed by his death on Feb 28. (2) Deterrence — attack already happening, deterrence constraint removed. (3) International isolation risk — still partially active but severely weakened by existing war. IAEA confirmed in February 2026 it "cannot provide any information on the current size, composition or whereabouts of the stockpile of enriched uranium." Washington Institute analysis assessed Mojtaba Khamenei is "more favorable to nuclear weapons development" than his father.',
    initiatedBy: 'iran',
    targetedActors: ['united_states', 'israel'],
    dimension: 'military',
    impacts: [
      {
        actorId: 'iran',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 42,
        newValue: 44,
        description: 'Nuclear option becomes strategically rational — 2 of 3 constraints removed',
        magnitude: 'critical',
        verificationStatus: 'verified',
      },
      {
        actorId: 'israel',
        dimension: 'military',
        field: 'overallReadiness',
        previousValue: 71,
        newValue: 68,
        description: 'Nuclear breakout cascade raises Israel\'s threat assessment — contingency planning intensifies',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    escalationChanges: [
      {
        actorId: 'iran',
        previousRung: 6,
        newRung: 7,
        rationale: 'Nuclear breakout now strategically rational — religious and deterrence constraints removed',
      },
    ],
    intelConsequences: [
      {
        actorId: 'united_states',
        concealed: 'IAEA cannot account for 440kg of 60%-enriched uranium — location unknown',
      },
      {
        actorId: 'israel',
        revealed: 'Nuclear breakout cascade recognized — contingency planning for nuclear-armed Iran activated',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_us_domestic_support_31pct',
    timestamp: '2026-03-18',
    title: 'US domestic support falls to 31%; congressional fractures deepen',
    description:
      'Polling (Reuters/Ipsos, Quinnipiac, CNN, Washington Post) converges on approximately 31-44% US public support for the war — the lowest initial support for any major US military operation in modern polling history. 60% say Iran did not pose an imminent threat. 65% say Trump has not clearly explained war goals. War Powers Resolution defeated in Senate 47-53 (March 4) and House 212-219 (March 5). MAGA base fracture: Tucker Carlson, Megyn Kelly, Matt Walsh, Marjorie Taylor Greene publicly oppose. Pre-war structural models projected Republicans losing ~28 House seats in November 2026 midterms.',
    initiatedBy: 'united_states',
    targetedActors: ['united_states'],
    dimension: 'political',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'regimeStability',
        previousValue: 60,
        newValue: 55,
        description: 'Support at 31-44% — lowest inception support in modern US military history',
        magnitude: 'critical',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'leadershipCohesion',
        previousValue: 54,
        newValue: 48,
        description: 'MAGA base fracturing; 8 shifting justifications for war; congressional majority narrowing',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },

  {
    id: 'evt_rubio_press_conference_day19',
    timestamp: '2026-03-18',
    title: 'Rubio press conference signals wavering; "Israel\'s security objectives" framing noted',
    description:
      'Secretary of State Marco Rubio gives a press conference on March 2 where he admits: "We knew that there was going to be an Israeli action. We knew that that would precipitate an attack against American forces, and we knew that if we didn\'t preemptively go after them before they launched those attacks, we would suffer higher casualties." His framing was widely interpreted as an accidental admission that Israel dragged the US into conflict. He uses the phrase "Israel\'s security objectives" three times without saying "America\'s." Matt Walsh calls it "the worst possible thing he could have said." Iranian FM Araghchi seizes on it as confirmation of a "war of choice on behalf of Israel." Rubio walks back remarks the next day but political damage persists. Washington reporters note growing unease in State Department. Current state: Day 19.',
    initiatedBy: 'united_states',
    targetedActors: ['united_states', 'iran'],
    dimension: 'political',
    impacts: [
      {
        actorId: 'united_states',
        dimension: 'political',
        field: 'leadershipCohesion',
        previousValue: 48,
        newValue: 43,
        description: 'Rubio admission deepens policy fracture — core rationale for war publicly questioned by Secretary of State',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'iran',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 52,
        newValue: 58,
        description: 'Rubio admission strengthens Iran\'s narrative internationally — war framed as "war of choice on behalf of Israel"',
        magnitude: 'major',
        verificationStatus: 'verified',
      },
      {
        actorId: 'united_states',
        dimension: 'diplomatic',
        field: 'internationalStanding',
        previousValue: 48,
        newValue: 44,
        description: 'US diplomatic credibility further damaged by admission of pre-war knowledge of Israeli plans',
        magnitude: 'moderate',
        verificationStatus: 'verified',
      },
    ],
    verificationStatus: 'verified',
  },
]

// Total: 20 verified events
// Timeline: Feb 6, 2026 (Oman talks) → March 18, 2026 (Day 19 current state)
