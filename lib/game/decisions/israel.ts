// lib/game/decisions/israel.ts
// Israel decision catalog for the Iran 2026 scenario (turn 115).
// Source: docs/Iran Research/research-military.md SS.1,3,7,10,12
//         docs/Iran Research/research-political.md S.3 (Israel), S.4 (Gulf states)
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export const IL_DECISIONS: DecisionOption[] = [
  {
    id: 'il-f35-strike',
    title: 'F-35 Strike on Remaining Iranian Command Nodes',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.65,
    requiredAssets: [
      { assetType: 'iaf_f35i_adir', requiredStatus: ['available'] },
    ],
  },
  {
    id: 'il-hezbollah-preempt',
    title: 'Preemptive Strike on Hezbollah Rocket Caches',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    requiredAssets: [
      { assetType: 'idf_91st_division', requiredStatus: ['available'] },
    ],
  },
  {
    id: 'il-us-nuke-guarantee',
    title: 'Seek US Guarantee on Nuclear Deterrence',
    dimension: 'diplomatic',
    escalationDirection: 'neutral',
    resourceWeight: 0.15,
  },
  {
    id: 'il-gaza-ceasefire',
    title: 'Gaza Ceasefire Offer (Conditional)',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.2,
  },
  {
    id: 'il-mossad-covert',
    title: 'Mossad Covert Ops -- Iran Nuclear Scientists',
    dimension: 'intelligence',
    escalationDirection: 'escalate',
    resourceWeight: 0.35,
  },
  {
    id: 'il-coalition-budget',
    title: 'Coalition Preservation Vote -- Budget Emergency Bill',
    dimension: 'political',
    escalationDirection: 'neutral',
    resourceWeight: 0.1,
  },
]

export const IL_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'il-f35-strike': {
    id: 'il-f35-strike',
    title: 'F-35 Strike on Remaining Iranian Command Nodes',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.65,
    strategicRationale:
      'Operation Roaring Lion (Feb 28, 2026) killed Khamenei and ~40 officials in the first 12 hours using joint US-Israeli precision strikes (military S.7). Surviving IRGC command nodes -- including provincial HQ bunkers identified in the Mosaic Defense reorganisation (political S.3 command resilience) -- remain viable. IAF F-35I Adir jets demonstrated air superiority during Operation Rising Lion after Iranian SAMs were neutralised (military S.1,3). Targeting IRGC Quds Force forward headquarters and Basij command infrastructure could degrade coordinated proxy direction for 30-60 days.',
    expectedOutcomes:
      'IRGC provincial command coherence reduced by 25-40% for 3-5 turns. Hezbollah resupply and tasking disrupted. IDF assessed "thousands of targets remain" (political S.3 IDF statement). Escalation risk: Mojtaba Khamenei\'s IRGC hardliner faction (political S.2) is likely to accelerate nuclear reconstitution if perceived existential threat deepens. IAF readiness cost: ~NIS 900M per major sortie package against $480M/day baseline spend (political S.3 economic strain).',
    concurrencyRules: [
      {
        decisionId: 'il-gaza-ceasefire',
        decisionTitle: 'Gaza Ceasefire Offer (Conditional)',
        compatible: false,
      },
      {
        decisionId: 'il-hezbollah-preempt',
        decisionTitle: 'Preemptive Strike on Hezbollah Rocket Caches',
        compatible: true,
      },
      {
        decisionId: 'il-mossad-covert',
        decisionTitle: 'Mossad Covert Ops -- Iran Nuclear Scientists',
        compatible: true,
      },
      {
        decisionId: 'il-coalition-budget',
        decisionTitle: 'Coalition Preservation Vote -- Budget Emergency Bill',
        compatible: true,
      },
    ],
  },

  'il-hezbollah-preempt': {
    id: 'il-hezbollah-preempt',
    title: 'Preemptive Strike on Hezbollah Rocket Caches',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    strategicRationale:
      'Hezbollah re-entered the war on March 2, firing ~100 rockets/day. Israel launched "limited and targeted ground operations" in southern Lebanon on March 16 -- the largest invasion since 2006 -- with the 91st Division leading and a stated goal of seizing the area south of the Litani River (military S.12). Pre-emptive destruction of rocket caches reduces the salvage-fuse problem: under Israeli doctrine, caches struck before launch cannot be used to absorb Tamir or Patriot interceptors at the unfavourable 1:100 cost ratio (military S.2 cost asymmetry). Hezbollah holds an estimated 150,000+ rockets; neutralising forward-deployed caches offers 14-21 day reprieve on northern front pressure.',
    expectedOutcomes:
      'Northern rocket launch rate reduced by ~30% for 2-3 turns (consistent with CIA-Mossad joint proxy disruption estimate, military S.7 proxy note). 886+ already killed in Lebanon with 1M+ displaced -- further civilian casualties risk third-party pressure for UN ceasefire resolution. IDF stretched across Iran, Lebanon, and Gaza simultaneously: reservists at 100,000 vs. 60,000 pre-Iran war (political S.3 multi-front strain). Incompatible with US ceasefire-signal posture.',
    concurrencyRules: [
      {
        decisionId: 'il-f35-strike',
        decisionTitle: 'F-35 Strike on Remaining Iranian Command Nodes',
        compatible: true,
      },
      {
        decisionId: 'il-gaza-ceasefire',
        decisionTitle: 'Gaza Ceasefire Offer (Conditional)',
        compatible: false,
      },
      {
        decisionId: 'il-mossad-covert',
        decisionTitle: 'Mossad Covert Ops -- Iran Nuclear Scientists',
        compatible: true,
      },
      {
        decisionId: 'il-coalition-budget',
        decisionTitle: 'Coalition Preservation Vote -- Budget Emergency Bill',
        compatible: true,
      },
    ],
  },

  'il-us-nuke-guarantee': {
    id: 'il-us-nuke-guarantee',
    title: 'Seek US Guarantee on Nuclear Deterrence',
    dimension: 'diplomatic',
    escalationDirection: 'neutral',
    resourceWeight: 0.15,
    strategicRationale:
      'Israel maintains nuclear opacity -- 100+ warheads, officially undisclosed. Analysts including Louis Rene Beres (JURIST) and Trump adviser David Sacks have argued Israel should shift from complete ambiguity to selective disclosure to strengthen deterrence (political S.3 nuclear dynamics). With Khamenei dead, his fatwa against nuclear weapons legally void (military S.4), and Mojtaba\'s succession hardening the regime\'s nuclear posture (political S.2 Mojtaba profile), Israeli security planners must hedge against Iranian breakout within weeks to months if hidden centrifuge cascades exist. A formal bilateral commitment from Washington -- extended deterrence analogous to NATO Article 5 nuclear sharing -- would reduce pressure to break opacity unilaterally and signal to Tehran that any nuclear test triggers automatic US retaliation.',
    expectedOutcomes:
      'If secured: raises Iranian breakout calculus by tying US nuclear response to Israeli deterrence. Reduces internal IDF pressure to signal nuclear posture shift. If denied: Netanyahu faces pressure from Beres-school strategists to announce selective disclosure. Washington is currently not ready to escort tankers (military S.3 US response), suggesting appetite for further commitment is limited. Resources: low -- diplomatic channel cost only; creates no IDF readiness burden.',
    concurrencyRules: [
      {
        decisionId: 'il-f35-strike',
        decisionTitle: 'F-35 Strike on Remaining Iranian Command Nodes',
        compatible: true,
      },
      {
        decisionId: 'il-gaza-ceasefire',
        decisionTitle: 'Gaza Ceasefire Offer (Conditional)',
        compatible: true,
      },
      {
        decisionId: 'il-coalition-budget',
        decisionTitle: 'Coalition Preservation Vote -- Budget Emergency Bill',
        compatible: true,
      },
    ],
  },

  'il-gaza-ceasefire': {
    id: 'il-gaza-ceasefire',
    title: 'Gaza Ceasefire Offer (Conditional)',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.2,
    strategicRationale:
      'Netanyahu\'s coalition is on a budget cliff -- the 2026 state budget must pass second and third Knesset readings by March 31 or elections are triggered in ~90 days (political S.3 coalition deadline). The first reading passed only 53-45. Shas and UTJ withdrew active participation over the Haredi draft exemption but signalled likely budget support after Netanyahu shelved the draft law on March 10. A conditional Gaza ceasefire -- trading settlement of the Gaza track for continued US operational support on the Iran campaign -- would free IDF ground divisions currently committed to Gaza, ease Haredi coalition pressure, and reframe Netanyahu as a statesman managing multiple crises rather than a coalition hostage. All Israeli hostages were recovered by January 26, 2026, removing that blocking constraint (military S.12 Gaza status).',
    expectedOutcomes:
      '3-5 IDF infantry and armoured brigades freed for Lebanon or reserve rotation. Coalition budget passage probability increases from ~60% to ~80%. Arab-Israeli domestic approval stabilises: currently only 26% support the Iran campaign (political S.3 IDI polling). Risk: Smotrich\'s Religious Zionism party barely clears the 3.25% threshold and may withdraw over a Gaza deal, potentially offsetting gains. Incompatible with ongoing F-35 strikes and Hezbollah preemption: contradictory escalation signals to both Washington and Tehran.',
    concurrencyRules: [
      {
        decisionId: 'il-f35-strike',
        decisionTitle: 'F-35 Strike on Remaining Iranian Command Nodes',
        compatible: false,
      },
      {
        decisionId: 'il-hezbollah-preempt',
        decisionTitle: 'Preemptive Strike on Hezbollah Rocket Caches',
        compatible: false,
      },
      {
        decisionId: 'il-mossad-covert',
        decisionTitle: 'Mossad Covert Ops -- Iran Nuclear Scientists',
        compatible: false,
      },
      {
        decisionId: 'il-us-nuke-guarantee',
        decisionTitle: 'Seek US Guarantee on Nuclear Deterrence',
        compatible: true,
      },
      {
        decisionId: 'il-coalition-budget',
        decisionTitle: 'Coalition Preservation Vote -- Budget Emergency Bill',
        compatible: true,
      },
    ],
  },

  'il-mossad-covert': {
    id: 'il-mossad-covert',
    title: 'Mossad Covert Ops -- Iran Nuclear Scientists',
    dimension: 'intelligence',
    escalationDirection: 'escalate',
    resourceWeight: 0.35,
    strategicRationale:
      'Operation Rising Lion (June 13, 2025) included assassination of 11+ nuclear scientists alongside 30+ senior IRGC commanders (military S.1). CIA and Mossad have maintained a joint operation targeting Hezbollah financial networks, with confirmed disruption timelines of 14-21 days (military S.7 proxy-disrupt baseline). The IAEA (Feb 27, 2026) cannot provide any information on the current size, composition or whereabouts of Iran\'s enriched uranium stockpile (military S.4 nuclear status). Iran is accelerating work on Pickaxe Mountain -- an underground site potentially impervious to aerial bombardment -- and may have relocated centrifuges to the covert Minzadehei site struck by Israel after an intelligence tip. Targeting scientists, centrifuge component supply chains, and the Minzadehei-class relocation network degrades Iran\'s covert reconstitution timeline by months without visible military escalation.',
    expectedOutcomes:
      'Iranian nuclear reconstitution at covert sites delayed by 2-4 months per successful operation. Mojtaba Khamenei\'s succession hardened the regime\'s nuclear posture (political S.2 Mojtaba profile) -- targeted killing of key scientists increases probability of internal IRGC retaliation against Israeli diplomatic personnel and cyber infrastructure. Israeli cyber capability demonstrated: IDF struck IRGC cyber and electronic headquarters and had access to nearly all Tehran traffic cameras before strikes (military S.7 cyber). Compatible with F-35 strike package, but ongoing covert escalation is incompatible with a credible Gaza ceasefire offer.',
    concurrencyRules: [
      {
        decisionId: 'il-f35-strike',
        decisionTitle: 'F-35 Strike on Remaining Iranian Command Nodes',
        compatible: true,
      },
      {
        decisionId: 'il-hezbollah-preempt',
        decisionTitle: 'Preemptive Strike on Hezbollah Rocket Caches',
        compatible: true,
      },
      {
        decisionId: 'il-gaza-ceasefire',
        decisionTitle: 'Gaza Ceasefire Offer (Conditional)',
        compatible: false,
      },
      {
        decisionId: 'il-coalition-budget',
        decisionTitle: 'Coalition Preservation Vote -- Budget Emergency Bill',
        compatible: true,
      },
    ],
  },

  'il-coalition-budget': {
    id: 'il-coalition-budget',
    title: 'Coalition Preservation Vote -- Budget Emergency Bill',
    dimension: 'political',
    escalationDirection: 'neutral',
    resourceWeight: 0.1,
    strategicRationale:
      'The 2026 state budget deadline is March 31. First reading passed 53-45; failure to pass second and third readings triggers automatic Knesset dissolution and elections in ~90 days (political S.3 Netanyahu coalition fragility). Polling shows coalition 51 seats vs. opposition 59 -- neither bloc can govern without Arab parties (10 seats). Naftali Bennett polls at 18-21 seats as the primary alternative. Lapid filed a no-confidence motion on March 16; Golan (Democrats) became the first major opposition figure to challenge war policy. An emergency budget bill -- bypassing standard Knesset scheduling and extending the budget review window by 60 days under wartime provisions -- would neutralise the March 31 cliff and give Netanyahu political continuity through the Iran campaign. Precedent: Shas and UTJ returned to effective coalition support after the Haredi draft law was set aside (political S.3 Shas/UTJ note).',
    expectedOutcomes:
      'Coalition survival probability increases from ~60% to ~85% for the next 3-4 turns. Economic war burn rate (~$3B/week, $480M/day) continues without budget interruption (political S.3 economic strain). Security establishment skepticism -- off-record concerns about no exit strategy and no one who can replace the regime (political S.3 senior defense official, Foreign Policy Mar 9) -- is not resolved, but is suppressed under wartime cohesion logic. No direct military or intelligence implications; orthogonal to operational axes.',
    concurrencyRules: [
      {
        decisionId: 'il-f35-strike',
        decisionTitle: 'F-35 Strike on Remaining Iranian Command Nodes',
        compatible: true,
      },
      {
        decisionId: 'il-hezbollah-preempt',
        decisionTitle: 'Preemptive Strike on Hezbollah Rocket Caches',
        compatible: true,
      },
      {
        decisionId: 'il-us-nuke-guarantee',
        decisionTitle: 'Seek US Guarantee on Nuclear Deterrence',
        compatible: true,
      },
      {
        decisionId: 'il-gaza-ceasefire',
        decisionTitle: 'Gaza Ceasefire Offer (Conditional)',
        compatible: true,
      },
      {
        decisionId: 'il-mossad-covert',
        decisionTitle: 'Mossad Covert Ops -- Iran Nuclear Scientists',
        compatible: true,
      },
    ],
  },
}
