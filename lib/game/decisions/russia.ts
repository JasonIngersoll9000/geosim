// lib/game/decisions/russia.ts
// Russia decision catalog for the Iran 2026 scenario.
//
// Strategic context (turn 115):
//  - Russia is Iran's primary patron since the 2022 Ukraine war alignment.
//  - Per WaPo (3 US officials) and corroborating CNN/NBC/AP sources, Russia is
//    sharing US warship positions and satellite imagery with Iran.
//  - Mojtaba Khamenei transported to Moscow on a Russian military plane ~March 16.
//  - Russia benefits from oil price spikes (Urals crude ~$70+, well above its $59
//    budget assumption, netting ~$150 M/day extra — research-economic.md §3).
//  - Ukraine war limits bandwidth: Russia consumes the same weapons categories as
//    Iran (SAMs, ballistic missiles, drones) — large-scale arms transfers are
//    constrained (research-military.md §, research-economic.md §3).
//  - BRICS/yuan de-dollarization narrative serves Russian geopolitical interests,
//    but no single BRICS currency is imminent (research-economic.md §2).
//
// Source citations in strategicRationale reference the verified research files.
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export const RU_DECISIONS: DecisionOption[] = [
  {
    id: 'ru-arms-transfer-air-defense',
    title: 'Arms Transfer — Air Defense Replenishment',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.45,
    // No requiredAssets — Russia's leverage is political/economic/information
  },
  {
    id: 'ru-unsc-veto',
    title: 'UN Security Council Veto — Block Sanctions',
    dimension: 'diplomatic',
    escalationDirection: 'escalate',
    resourceWeight: 0.2,
  },
  {
    id: 'ru-mediation-offer',
    title: 'Good Offices — Offer Mediation Platform',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.15,
  },
  {
    id: 'ru-opec-production-cut',
    title: 'OPEC+ Coordination — Production Cut',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.3,
  },
  {
    id: 'ru-intel-pipeline',
    title: 'Intel Pipeline — Share US Carrier Positions',
    dimension: 'intelligence',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
  },
  {
    id: 'ru-disinfo-us-war-fatigue',
    title: 'Disinfo Campaign — "Endless US War" Narrative',
    dimension: 'information',
    escalationDirection: 'escalate',
    resourceWeight: 0.25,
  },
]

export const RU_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'ru-arms-transfer-air-defense': {
    id: 'ru-arms-transfer-air-defense',
    title: 'Arms Transfer — Air Defense Replenishment',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.45,
    strategicRationale:
      "Iran's IADS was Israel's first target on both June 13, 2025, and February 28, 2026 " +
      "(research-military.md §1, §10 — Trump claimed Iran had 'no air detection or radar'). " +
      "Pre-existing contracts for S-400 components and confirmed Yak-130 / Mi-28 deliveries " +
      "(research-military.md §3) establish a transfer channel via the Caspian Sea corridor. " +
      "Replenishing short-range SAMs and EW modules extends the attrition dynamic, " +
      "raising the cost of sustained US-Israeli air operations without committing Russian combat forces.",
    expectedOutcomes:
      "Partial restoration of Iranian point-defence coverage over Tehran and Fordow corridor " +
      "within 4–6 weeks. Forces US to expend an additional estimated 80–120 Patriot/SM-6 " +
      "interceptors per week to suppress newly emplaced systems. " +
      "Russian defence-industrial exposure: moderate — transfers draw from stocks " +
      "already strained by Ukraine (research-economic.md §3, research-military.md §3).",
    concurrencyRules: [
      {
        decisionId: 'ru-unsc-veto',
        decisionTitle: 'UN Security Council Veto — Block Sanctions',
        compatible: true,
        // Both obstruct US-led pressure; arms transfer + diplomatic cover reinforce each other
      },
      {
        decisionId: 'ru-mediation-offer',
        decisionTitle: 'Good Offices — Offer Mediation Platform',
        compatible: false,
        // Simultaneous peace-broker posture and active arms delivery is contradictory
      },
      {
        decisionId: 'ru-intel-pipeline',
        decisionTitle: 'Intel Pipeline — Share US Carrier Positions',
        compatible: true,
        // Both escalate Iran's defensive and offensive capacity; mutually reinforcing
      },
      {
        decisionId: 'ru-opec-production-cut',
        decisionTitle: 'OPEC+ Coordination — Production Cut',
        compatible: true,
        // Military support and economic pressure are orthogonal postures
      },
    ],
  },

  'ru-unsc-veto': {
    id: 'ru-unsc-veto',
    title: 'UN Security Council Veto — Block Sanctions',
    dimension: 'diplomatic',
    escalationDirection: 'escalate',
    resourceWeight: 0.2,
    strategicRationale:
      "Russia holds a permanent UNSC veto and has exercised it consistently to shield Iran " +
      "and Syria from multilateral sanctions. Iran's propaganda matrix explicitly cites " +
      "'Russian and Chinese UNSC backing' as a legitimising frame (research-political.md §5). " +
      "A veto on any new Iran sanctions resolution prevents the US from building the " +
      "multilateral coercive coalition that accelerated Iraq/Libya capitulations, " +
      "while signalling to Gulf states that Washington cannot weaponise the UN architecture.",
    expectedOutcomes:
      "Blocks any UNSC sanctions resolution with a single vote, requiring zero additional " +
      "Russian resource commitment. US forced back to unilateral sanctions, which China and " +
      "Gulf states will partially circumvent (research-economic.md §2). " +
      "Reinforces the narrative — already circulating in MAGA circles — that US multilateral " +
      "leadership is degraded (research-political.md §1, §4).",
    concurrencyRules: [
      {
        decisionId: 'ru-arms-transfer-air-defense',
        decisionTitle: 'Arms Transfer — Air Defense Replenishment',
        compatible: true,
        // Diplomatic obstruction and military support both block US pressure tracks
      },
      {
        decisionId: 'ru-mediation-offer',
        decisionTitle: 'Good Offices — Offer Mediation Platform',
        compatible: true,
        // Vetoing US-drafted sanctions while offering Russian mediation is classic
        // "spoiler/honest-broker" dual posture; not logically contradictory
      },
      {
        decisionId: 'ru-disinfo-us-war-fatigue',
        decisionTitle: 'Disinfo Campaign — "Endless US War" Narrative',
        compatible: true,
        // UNSC veto generates news cycles that RT/Sputnik can amplify
      },
    ],
  },

  'ru-mediation-offer': {
    id: 'ru-mediation-offer',
    title: 'Good Offices — Offer Mediation Platform',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.15,
    strategicRationale:
      "Mojtaba Khamenei was transported to Moscow on a Russian military plane ~March 16 " +
      "(research-political.md §2) — the clearest signal that Russia has unique access to " +
      "Iran's de-facto leadership. Putin proposing Moscow or Sochi as a US-Iran negotiation " +
      "venue positions Russia as indispensable interlocutor, mirroring the Oman model " +
      "(research-political.md §4) while shifting diplomatic capital eastward. " +
      "Success is not required — the mere offer generates leverage and a narrative of " +
      "Russian statesmanship versus US unilateralism.",
    expectedOutcomes:
      "Even a rejected offer improves Russia's image in Global South and non-aligned states. " +
      "If accepted, Moscow gains a treaty-signing venue comparable to the 1975 Helsinki Accords, " +
      "boosting Putin's domestic legitimacy ahead of any post-Ukraine peace process. " +
      "US domestic audience effect: amplifies Congressional voices calling for negotiated exit " +
      "(research-political.md §1 — 65% of Americans say Trump has not explained war goals).",
    concurrencyRules: [
      {
        decisionId: 'ru-arms-transfer-air-defense',
        decisionTitle: 'Arms Transfer — Air Defense Replenishment',
        compatible: false,
        // Active weapons delivery while claiming peace-broker role destroys credibility
      },
      {
        decisionId: 'ru-intel-pipeline',
        decisionTitle: 'Intel Pipeline — Share US Carrier Positions',
        compatible: false,
        // Providing real-time US military targeting data while hosting peace talks
        // would collapse any negotiations if revealed
      },
      {
        decisionId: 'ru-opec-production-cut',
        decisionTitle: 'OPEC+ Coordination — Production Cut',
        compatible: true,
        // Economic posture (oil price) and diplomatic posture are orthogonal
      },
      {
        decisionId: 'ru-disinfo-us-war-fatigue',
        decisionTitle: 'Disinfo Campaign — "Endless US War" Narrative',
        compatible: false,
        // Running US-war-fatigue propaganda while presenting as neutral mediator is
        // contradictory; if surfaced it poisons the mediation channel
      },
    ],
  },

  'ru-opec-production-cut': {
    id: 'ru-opec-production-cut',
    title: 'OPEC+ Coordination — Production Cut',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.3,
    strategicRationale:
      "Russia's February 2026 oil revenue was at its weakest since the 2022 invasion " +
      "— $9.5 B with Urals at ~$40/bbl — but the conflict has already pushed Urals " +
      "above $70/bbl, netting Russia ~$150 M/day in additional revenue " +
      "(research-economic.md §3). Coordinating with Saudi Arabia and UAE through " +
      "OPEC+ to hold or deepen supply cuts keeps prices elevated above $100/bbl, " +
      "maximising Russia's windfall while prolonging the US economic strain that " +
      "Sen. Rand Paul (research-political.md §1) and the Consumer Sentiment collapse " +
      "to 57.9 (research-economic.md §5) make politically damaging for the White House.",
    expectedOutcomes:
      "Each additional $10/bbl sustained above baseline generates ~$1.63 B/month for " +
      "Russia (Carnegie Russia Eurasia Center, research-economic.md §3). " +
      "Maintaining Brent above $110 through OPEC+ discipline could yield an additional " +
      "~$30–50 B annually for the Russian budget, offsetting continued Ukraine war costs. " +
      "Higher US gas prices (already at $3.79/gal, research-economic.md §5) compound " +
      "midterm electoral pressure on Republicans (research-political.md §1).",
    concurrencyRules: [
      {
        decisionId: 'ru-arms-transfer-air-defense',
        decisionTitle: 'Arms Transfer — Air Defense Replenishment',
        compatible: true,
        // Economic and military support tracks are orthogonal
      },
      {
        decisionId: 'ru-mediation-offer',
        decisionTitle: 'Good Offices — Offer Mediation Platform',
        compatible: true,
        // Economic pressure and diplomatic posture are separable
      },
      {
        decisionId: 'ru-disinfo-us-war-fatigue',
        decisionTitle: 'Disinfo Campaign — "Endless US War" Narrative',
        compatible: true,
        // High gas prices provide real-world evidence for the "economic drain" narrative
      },
    ],
  },

  'ru-intel-pipeline': {
    id: 'ru-intel-pipeline',
    title: 'Intel Pipeline — Share US Carrier Positions',
    dimension: 'intelligence',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    strategicRationale:
      "Washington Post (3 US officials), CNN (multiple sources), NBC (4 sources), and AP " +
      "(2 officials) all independently confirmed on March 6, 2026 that Russia is sharing " +
      "satellite imagery and real-time locations of American troops, ships, and aircraft " +
      "with Iran (research-political.md §4, research-economic.md §3, research-military.md §6). " +
      "The Kanopus-V / 'Khayyam' satellite provides continuous optical and radar coverage; " +
      "by March 17 WSJ reported the sharing expanded to include improved drone guidance. " +
      "Deepening this pipeline maximises Iran's ability to strike high-value targets while " +
      "Russia maintains plausible deniability through 'technical cooperation' framing.",
    expectedOutcomes:
      "Iran's targeting accuracy against US carrier strike groups and air bases improves " +
      "by an estimated 30–40% for stand-off weapons. Risk: if the US confirms the link " +
      "publicly and imposes secondary sanctions on Russian energy exports, Russia loses " +
      "part of its oil windfall. Counter-risk is bounded because the Trump administration " +
      "has already issued a 30-day sanctions waiver on Russian oil (research-economic.md §3), " +
      "signalling reluctance to escalate against Moscow.",
    concurrencyRules: [
      {
        decisionId: 'ru-arms-transfer-air-defense',
        decisionTitle: 'Arms Transfer — Air Defense Replenishment',
        compatible: true,
        // Intel sharing and arms delivery both enhance Iran's military capacity
      },
      {
        decisionId: 'ru-mediation-offer',
        decisionTitle: 'Good Offices — Offer Mediation Platform',
        compatible: false,
        // Active real-time targeting assistance is incompatible with peace-broker posture
      },
      {
        decisionId: 'ru-disinfo-us-war-fatigue',
        decisionTitle: 'Disinfo Campaign — "Endless US War" Narrative',
        compatible: true,
        // Intelligence pipeline and information operations serve parallel tracks
      },
    ],
  },

  'ru-disinfo-us-war-fatigue': {
    id: 'ru-disinfo-us-war-fatigue',
    title: 'Disinfo Campaign — "Endless US War" Narrative',
    dimension: 'information',
    escalationDirection: 'escalate',
    resourceWeight: 0.25,
    strategicRationale:
      "The propaganda classification matrix (research-political.md §5) identifies " +
      "'US war-of-choice for Israel' and 'imminent threat was fabricated' as the two " +
      "most traction-gaining frames in US domestic discourse — validated by Kent's " +
      "resignation letter, Tucker Carlson, MTG, and Rogan (research-political.md §1). " +
      "RT and Sputnik — plus secondary amplification networks in MAGA-adjacent social " +
      "media — can inject and amplify these narratives in US and European audiences " +
      "at negligible cost, exploiting authentic MAGA fractures and 57.9-point " +
      "consumer-sentiment collapse (research-economic.md §5).",
    expectedOutcomes:
      "Estimated 5–8 point additional decline in US public war support within 30 days " +
      "if messaging aligns with authentic grievance cycles (gas prices, casualty counts, " +
      "Rubio admission). Accelerates pressure on Republican House members in vulnerable " +
      "seats — pre-war models already projected R losing ~28 seats (research-political.md §1). " +
      "European audiences: amplifies 'US unilateralism' frame, complicating NATO burden-sharing " +
      "asks and reducing allied willingness to backstop US munitions depletion.",
    concurrencyRules: [
      {
        decisionId: 'ru-unsc-veto',
        decisionTitle: 'UN Security Council Veto — Block Sanctions',
        compatible: true,
        // UNSC veto generates authentic news events that disinfo can amplify
      },
      {
        decisionId: 'ru-mediation-offer',
        decisionTitle: 'Good Offices — Offer Mediation Platform',
        compatible: false,
        // War-fatigue propaganda contradicts neutral-mediator persona
      },
      {
        decisionId: 'ru-intel-pipeline',
        decisionTitle: 'Intel Pipeline — Share US Carrier Positions',
        compatible: true,
        // Information operations and intelligence activities are parallel tracks
      },
      {
        decisionId: 'ru-opec-production-cut',
        decisionTitle: 'OPEC+ Coordination — Production Cut',
        compatible: true,
        // High gas prices provide material evidence for the economic-drain narrative
      },
    ],
  },
}
