// lib/game/decisions/china.ts
// China decision catalog for the Iran 2026 scenario.
//
// Strategic position (Turn 115):
//   - ~45–50% of China's oil transits Hormuz — largest non-belligerent exposure
//     (research-economic §1: "84% of oil and 83% of LNG shipped through Hormuz was bound for Asia")
//   - Pre-war stockpiling: 1.2–1.4 billion barrels in strategic reserves (~120 days net imports)
//   - China continues receiving ~1.25 mbd of Iranian oil at ~$8–10/bbl discount
//   - USD share of global reserves declining from 72% (2001) to 57% (2025); yuan only 2%
//   - China has de-escalated Taiwan pressure since conflict began (research-economic §4)
//   - Special Envoy Zhai Jun conducting regional diplomatic tour from March 8
//   - China positioning as alternative mediator/peace broker (research-political §5)
//
// Source files: docs/Iran Research/research-{economic,political,military}.md
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export const CN_DECISIONS: DecisionOption[] = [
  {
    id: 'cn-xi-mediation',
    title: 'Xi-Led Mediation Initiative',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.3,
  },
  {
    id: 'cn-yuan-settlement',
    title: 'Accelerate Yuan Settlement for Iran Oil',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.35,
  },
  {
    id: 'cn-spr-release',
    title: 'Strategic Petroleum Reserve Release',
    dimension: 'economic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.2,
  },
  {
    id: 'cn-cyber-contractor',
    title: 'Cyber Operations — US Defense Contractor Intrusion',
    dimension: 'intelligence',
    escalationDirection: 'escalate',
    resourceWeight: 0.4,
  },
  {
    id: 'cn-un-narrative',
    title: 'UN Narrative Campaign — "Peace & Development"',
    dimension: 'information',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.15,
  },
  {
    id: 'cn-taiwan-drills',
    title: 'Taiwan / South China Sea Assertion',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
  },
]

export const CN_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'cn-xi-mediation': {
    id: 'cn-xi-mediation',
    title: 'Xi-Led Mediation Initiative',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.3,
    strategicRationale:
      'Beijing hosts a US-Iran summit brokered through Special Envoy Zhai Jun\'s ' +
      'regional tour (active from March 8). China has offered an alternative ' +
      'mediation role distinct from US/Western frameworks — "Peace & Development" ' +
      'framing positions China as the responsible great power (research-political §5). ' +
      'A successful summit breaks US claim that only Washington can end the conflict, ' +
      'boosting Chinese soft power in the Global South.',
    expectedOutcomes:
      'Summit convened within 21 days if Iran agrees. Hormuz partial reopening ' +
      'negotiable as a confidence-building measure. China gains a durable mediation ' +
      'role comparable to the 2023 Saudi-Iran normalization deal it brokered.',
    concurrencyRules: [
      {
        decisionId: 'cn-yuan-settlement',
        decisionTitle: 'Accelerate Yuan Settlement for Iran Oil',
        compatible: false,
      },
      {
        decisionId: 'cn-taiwan-drills',
        decisionTitle: 'Taiwan / South China Sea Assertion',
        compatible: false,
      },
      {
        decisionId: 'cn-cyber-contractor',
        decisionTitle: 'Cyber Operations — US Defense Contractor Intrusion',
        compatible: false,
      },
      {
        decisionId: 'cn-un-narrative',
        decisionTitle: 'UN Narrative Campaign — "Peace & Development"',
        compatible: true,
      },
    ],
  },

  'cn-yuan-settlement': {
    id: 'cn-yuan-settlement',
    title: 'Accelerate Yuan Settlement for Iran Oil',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.35,
    strategicRationale:
      'Iran is actively considering allowing tankers to pass if cargo is traded in yuan ' +
      '(CNN, March 14). China already settles nearly all of its ~1.25 mbd of Iranian oil ' +
      'imports in yuan. Formalizing and publicizing this arrangement — and expanding it to ' +
      'Chinese-flagged third-party shipments — operationalizes the yuan-for-oil wedge ' +
      'into the dollar-denominated global oil market. The petrodollar "exorbitant privilege" ' +
      'is worth ~$225–270B annually to the US; erosion compounds US fiscal strain at $1T+ ' +
      'annual interest payments (research-economic §2).',
    expectedOutcomes:
      'Yuan share of oil payments rises from <5% toward 10–15% for China-corridor ' +
      'shipments within 90 days. Dollar clearing for Chinese-Iran oil becomes de facto ' +
      'optional, providing a replicable template for Russia and Gulf diversification. ' +
      'US Treasury faces symbolic but concrete reserve-currency erosion signal.',
    concurrencyRules: [
      {
        decisionId: 'cn-xi-mediation',
        decisionTitle: 'Xi-Led Mediation Initiative',
        compatible: false,
      },
      {
        decisionId: 'cn-taiwan-drills',
        decisionTitle: 'Taiwan / South China Sea Assertion',
        compatible: true,
      },
      {
        decisionId: 'cn-spr-release',
        decisionTitle: 'Strategic Petroleum Reserve Release',
        compatible: true,
      },
    ],
  },

  'cn-spr-release': {
    id: 'cn-spr-release',
    title: 'Strategic Petroleum Reserve Release',
    dimension: 'economic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.2,
    strategicRationale:
      'China holds an estimated 1.2–1.4 billion barrels in strategic reserves — ' +
      '~120 days of net imports — plus 40 million barrels in floating storage ' +
      '(research-economic §4). Releasing 10 million barrels into Asian spot markets ' +
      'demonstrates China\'s capacity to stabilize regional energy prices independently ' +
      'of the IEA, which already authorized a 400M barrel emergency release on March 11. ' +
      'A unilateral Chinese SPR release builds influence with import-dependent neighbors ' +
      '(South Korea, Japan, India) without requiring military commitment.',
    expectedOutcomes:
      'Release of 10M bbl into Asian spot markets caps Brent at ~$130/bbl for ~60 days ' +
      'on the Asian premium. South Korea\'s KOSPI circuit-breaker pressure eases. ' +
      'China positions itself as a responsible stakeholder, softening Global South ' +
      'criticism of Chinese neutrality.',
    concurrencyRules: [
      {
        decisionId: 'cn-un-narrative',
        decisionTitle: 'UN Narrative Campaign — "Peace & Development"',
        compatible: true,
      },
      {
        decisionId: 'cn-yuan-settlement',
        decisionTitle: 'Accelerate Yuan Settlement for Iran Oil',
        compatible: true,
      },
      {
        decisionId: 'cn-taiwan-drills',
        decisionTitle: 'Taiwan / South China Sea Assertion',
        compatible: false,
      },
    ],
  },

  'cn-cyber-contractor': {
    id: 'cn-cyber-contractor',
    title: 'Cyber Operations — US Defense Contractor Intrusion',
    dimension: 'intelligence',
    escalationDirection: 'escalate',
    resourceWeight: 0.4,
    strategicRationale:
      'MSS-affiliated APT groups (Volt Typhoon, Salt Typhoon) maintain persistent ' +
      'access to US defense contractor networks. With US attention on a two-theater ' +
      'commitment (Iran + Ukraine support), operational security discipline degrades. ' +
      'Tasking existing access toward Iran campaign planning — sortie schedules, ' +
      'munitions inventory, strike sequencing — provides intelligence value to China ' +
      'on US war-fighting capacity without direct military exposure. Secondary target: ' +
      'Patriot and THAAD interceptor production data, relevant to Taiwan contingency planning ' +
      '(research-economic §4: US burned 14% of THAAD stockpile against Iran in six days).',
    expectedOutcomes:
      'Campaign-planning documents exfiltrated within 14–21 days. US munitions-depletion ' +
      'rate becomes a known quantity for PLA planning cycles. If discovered, operation is ' +
      'deniable — APT attribution standard is "probable" not "proven." Risk: if publicized ' +
      'during the conflict, US may use it as justification for Hormuz coalition hardening.',
    concurrencyRules: [
      {
        decisionId: 'cn-xi-mediation',
        decisionTitle: 'Xi-Led Mediation Initiative',
        compatible: false,
      },
      {
        decisionId: 'cn-un-narrative',
        decisionTitle: 'UN Narrative Campaign — "Peace & Development"',
        compatible: false,
      },
      {
        decisionId: 'cn-taiwan-drills',
        decisionTitle: 'Taiwan / South China Sea Assertion',
        compatible: true,
      },
    ],
  },

  'cn-un-narrative': {
    id: 'cn-un-narrative',
    title: 'UN Narrative Campaign — "Peace & Development"',
    dimension: 'information',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.15,
    strategicRationale:
      'China frames the conflict through the Non-Aligned Movement lens: US-Israeli ' +
      'strikes violated UN Charter Article 2(4) with no Security Council authorization. ' +
      'Wang Yi\'s statement — "the killing of Khamenei is unacceptable" — and Foreign ' +
      'Minister condemnations of unilateral US action are already on record ' +
      '(research-economic §4). A structured UN narrative campaign, coordinated with ' +
      'BRICS partners and Global South ambassadors, amplifies the "rules-based order" ' +
      'hypocrisy framing. Research-political §5: China offered mediation, positioning ' +
      'itself as the responsible alternative to US unilateralism.',
    expectedOutcomes:
      'UNGA emergency session motion passes with 120+ affirmative votes. China-authored ' +
      '"ceasefire and dialogue" resolution placed in the record even if US vetoes it in ' +
      'the Security Council. Global South credibility for China rises, weakening the ' +
      'US-led post-conflict reconstruction narrative.',
    concurrencyRules: [
      {
        decisionId: 'cn-spr-release',
        decisionTitle: 'Strategic Petroleum Reserve Release',
        compatible: true,
      },
      {
        decisionId: 'cn-xi-mediation',
        decisionTitle: 'Xi-Led Mediation Initiative',
        compatible: true,
      },
      {
        decisionId: 'cn-cyber-contractor',
        decisionTitle: 'Cyber Operations — US Defense Contractor Intrusion',
        compatible: false,
      },
    ],
  },

  'cn-taiwan-drills': {
    id: 'cn-taiwan-drills',
    title: 'Taiwan / South China Sea Assertion',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    strategicRationale:
      'Attested Chinese pattern: coordinate gray-zone moves with US distraction. ' +
      'The December 2025 "Justice Mission" drills rehearsed a full maritime blockade ' +
      'of Taiwan. THAAD components have been removed from South Korea (research-economic §4). ' +
      'USS Tripoli ARG redeployed to CENTCOM. The USS George Washington remains in Japan, ' +
      'but US munitions stockpiles are at historic lows. Resuming ADIZ incursions and ' +
      'conducting coordinated PLA air-naval exercises near Taiwan sends a Taiwan Strait ' +
      'signal without crossing kinetic thresholds, recalibrating deterrence during a window ' +
      'when US two-theater capacity is visibly strained.',
    expectedOutcomes:
      'Taiwan declares heightened alert. US Pacific Command issues a statement but cannot ' +
      'credibly reinforce given current theater commitments. China gains a deterrence data ' +
      'point on US response thresholds with reduced asset exposure. Risk: if the US uses ' +
      'this as a pretext to de-escalate in Iran to pivot east, China\'s window in both ' +
      'theaters narrows simultaneously.',
    concurrencyRules: [
      {
        decisionId: 'cn-xi-mediation',
        decisionTitle: 'Xi-Led Mediation Initiative',
        compatible: false,
      },
      {
        decisionId: 'cn-yuan-settlement',
        decisionTitle: 'Accelerate Yuan Settlement for Iran Oil',
        compatible: true,
      },
      {
        decisionId: 'cn-spr-release',
        decisionTitle: 'Strategic Petroleum Reserve Release',
        compatible: false,
      },
      {
        decisionId: 'cn-cyber-contractor',
        decisionTitle: 'Cyber Operations — US Defense Contractor Intrusion',
        compatible: true,
      },
    ],
  },
}
