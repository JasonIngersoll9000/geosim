// lib/game/iran-decisions.ts
// Static decision catalog for the Iran 2026 scenario.
// These represent real available strategic options — stored as static data
// until a decisions table is implemented in a future sprint.
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export const IRAN_DECISIONS: DecisionOption[] = [
  { id: 'expand-air',       title: 'Expand Air Campaign',          dimension: 'military',     escalationDirection: 'escalate',    resourceWeight: 0.6  },
  { id: 'special-ops',      title: 'Special Ops Insertion',        dimension: 'military',     escalationDirection: 'escalate',    resourceWeight: 0.4  },
  { id: 'ceasefire-signal', title: 'Signal Ceasefire Willingness', dimension: 'diplomatic',   escalationDirection: 'de-escalate', resourceWeight: 0.2  },
  { id: 'oman-backchannel', title: 'Activate Oman Back-Channel',   dimension: 'diplomatic',   escalationDirection: 'de-escalate', resourceWeight: 0.15 },
  { id: 'iea-release',      title: 'IEA Reserve Release',          dimension: 'economic',     escalationDirection: 'neutral',     resourceWeight: 0.25 },
  { id: 'asset-freeze',     title: 'Expand Asset Freeze',          dimension: 'economic',     escalationDirection: 'escalate',    resourceWeight: 0.3  },
  { id: 'proxy-disrupt',    title: 'Disrupt Proxy Networks',       dimension: 'intelligence', escalationDirection: 'escalate',    resourceWeight: 0.35 },
]

export const IRAN_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'expand-air': {
    id: 'expand-air', title: 'Expand Air Campaign', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.6,
    strategicRationale: 'Targeting remaining hardened sites. Fordow requires GBU-57 penetrators on second sortie.',
    expectedOutcomes: 'Iranian air defense suppression in western corridor. Coalition military readiness strain increases by ~12%.',
    concurrencyRules: [
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
      { decisionId: 'proxy-disrupt',    decisionTitle: 'Disrupt Proxy Networks',       compatible: true  },
    ],
  },
  'special-ops': {
    id: 'special-ops', title: 'Special Ops Insertion', dimension: 'military', escalationDirection: 'escalate', resourceWeight: 0.4,
    strategicRationale: 'JSOC units designated for Fordow access shaft demolition and IRGC leadership targeting.',
    expectedOutcomes: 'If successful: Fordow offline 18–24 months. IRGC retaliation probability 94%.',
    concurrencyRules: [
      { decisionId: 'expand-air',       decisionTitle: 'Expand Air Campaign',          compatible: true  },
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
    ],
  },
  'ceasefire-signal': {
    id: 'ceasefire-signal', title: 'Signal Ceasefire Willingness', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.2,
    strategicRationale: 'Backchannel messaging through Swiss Embassy. Window closing in 48–72 hours.',
    expectedOutcomes: 'Temporary Hormuz reopening achievable within 96 hours. Risk: Iran reconstitutes defenses.',
    concurrencyRules: [
      { decisionId: 'expand-air',  decisionTitle: 'Expand Air Campaign',  compatible: false },
      { decisionId: 'special-ops', decisionTitle: 'Special Ops Insertion', compatible: false },
    ],
  },
  'oman-backchannel': {
    id: 'oman-backchannel', title: 'Activate Oman Back-Channel', dimension: 'diplomatic', escalationDirection: 'de-escalate', resourceWeight: 0.15,
    strategicRationale: 'Sultan Haitham has offered to host direct talks.',
    expectedOutcomes: 'Reduces allied pressure for negotiated solution. Iran may demand additional concessions.',
    concurrencyRules: [
      { decisionId: 'expand-air',  decisionTitle: 'Expand Air Campaign',  compatible: false },
      { decisionId: 'iea-release', decisionTitle: 'IEA Reserve Release',  compatible: true  },
    ],
  },
  'iea-release': {
    id: 'iea-release', title: 'IEA Reserve Release', dimension: 'economic', escalationDirection: 'neutral', resourceWeight: 0.25,
    strategicRationale: "120 million barrel release over 30 days. Caps oil at $120/bbl and reduces Iran's Hormuz leverage.",
    expectedOutcomes: 'Oil price correction to $115–125/bbl. Iran loses $4.2B monthly revenue leverage.',
    concurrencyRules: [
      { decisionId: 'asset-freeze',     decisionTitle: 'Expand Asset Freeze',          compatible: true },
      { decisionId: 'oman-backchannel', decisionTitle: 'Activate Oman Back-Channel',   compatible: true },
    ],
  },
  'asset-freeze': {
    id: 'asset-freeze', title: 'Expand Asset Freeze', dimension: 'economic', escalationDirection: 'escalate', resourceWeight: 0.3,
    strategicRationale: 'Treasury-coordinated freeze of Iranian sovereign wealth. Targets IRGC commercial fronts.',
    expectedOutcomes: 'Iranian central bank reserves reduced by ~$12B. China/Russia accelerate yuan alternatives.',
    concurrencyRules: [
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
      { decisionId: 'iea-release',      decisionTitle: 'IEA Reserve Release',          compatible: true  },
    ],
  },
  'proxy-disrupt': {
    id: 'proxy-disrupt', title: 'Disrupt Proxy Networks', dimension: 'intelligence', escalationDirection: 'escalate', resourceWeight: 0.35,
    strategicRationale: 'CIA and Mossad joint operation targeting Hezbollah financial networks.',
    expectedOutcomes: 'Hezbollah resupply delayed 14–21 days. Northern front capability reduced by 30%.',
    concurrencyRules: [
      { decisionId: 'expand-air',       decisionTitle: 'Expand Air Campaign',          compatible: true  },
      { decisionId: 'ceasefire-signal', decisionTitle: 'Signal Ceasefire Willingness', compatible: false },
    ],
  },
}
