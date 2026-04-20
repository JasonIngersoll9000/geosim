// lib/game/decisions/gulf-states.ts
// Gulf Cooperation Council (GCC) States decision catalog for the Iran 2026 scenario.
// Models GCC as a COLLECTIVE actor; decisions reflect weighted consensus positions
// across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.
//
// Current state (turn 115):
// - Iran has struck all six GCC members (political §4: 2,000+ missiles/drones)
// - Saudi + UAE trust in US is shattered (US bases used without full consultation)
// - Dubai real estate equities down ~30%; tourism losing $600M/day (political §4)
// - Backchannel diplomacy with Iran persists despite attacks (political §4)
// - GCC is NOT unified: Qatar hosts Al Udeid; Oman is mediator; SA/UAE/Bahrain direct victims
// - Saudi-Iran March 2023 rapprochement technically still in effect (political §4)
//
// Source: docs/Iran Research/research-{political,economic,military}.md
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export const GCC_DECISIONS: DecisionOption[] = [
  {
    id: 'gcc-deny-airbases',
    title: 'Deny US Further Use of Airbases for Strikes on Iran',
    dimension: 'political',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.3,
  },
  {
    id: 'gcc-oman-backchannel',
    title: 'Activate Oman Backchannel — Full-Spectrum Talks',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.2,
  },
  {
    id: 'gcc-opec-adjustment',
    title: 'OPEC+ Production Adjustment — Price Stabilization',
    dimension: 'economic',
    escalationDirection: 'neutral',
    resourceWeight: 0.35,
  },
  {
    id: 'gcc-swf-divestment',
    title: 'Sovereign Fund Divestment — US Treasuries',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.4,
  },
  {
    id: 'gcc-saudi-iran-bilateral',
    title: 'Saudi-Iran Direct Bilateral Talks',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.25,
  },
  {
    id: 'gcc-security-summit',
    title: 'Emergency Regional Security Summit — GCC+Jordan+Egypt+Turkey',
    dimension: 'diplomatic',
    escalationDirection: 'neutral',
    resourceWeight: 0.2,
  },
]

export const GCC_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'gcc-deny-airbases': {
    id: 'gcc-deny-airbases',
    title: 'Deny US Further Use of Airbases for Strikes on Iran',
    dimension: 'political',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.3,
    strategicRationale:
      'Gulf states explicitly told the US their territory could not be used for strikes on Iran (Fox News/WSJ: blocked base and airspace access late January 2026). Despite being overridden, Iran struck all six GCC members in retaliation for hosting US forces — killing dozens, setting ablaze the Ras Tanura refinery, forcing Qatar force majeure on LNG, striking US Fifth Fleet base in Bahrain. A formal GCC communiqué formalizing a cap on US offensive operational tempo distances GCC from co-belligerent status, reduces the targeting rationale for further Iranian strikes, and reasserts sovereign control over territory. Consistent with Vice Adm. Harward assessment: "We have failed to earn the trust and confidence of our Gulf partners." (political §4)',
    expectedOutcomes:
      'Estimated 40–60% reduction in Iranian targeting of GCC infrastructure within 14 days of communiqué. Reduces risk of further Ras Tanura or LNG strikes. Expected US diplomatic friction — potential review of defence guarantees for 1–2 GCC states. Does NOT terminate existing US basing agreements; restricts offensive sortie authorisation only.',
    concurrencyRules: [
      {
        decisionId: 'gcc-oman-backchannel',
        decisionTitle: 'Activate Oman Backchannel — Full-Spectrum Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-opec-adjustment',
        decisionTitle: 'OPEC+ Production Adjustment — Price Stabilization',
        compatible: true,
      },
      {
        decisionId: 'gcc-saudi-iran-bilateral',
        decisionTitle: 'Saudi-Iran Direct Bilateral Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-swf-divestment',
        decisionTitle: 'Sovereign Fund Divestment — US Treasuries',
        compatible: true,
      },
    ],
  },

  'gcc-oman-backchannel': {
    id: 'gcc-oman-backchannel',
    title: 'Activate Oman Backchannel — Full-Spectrum Talks',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.2,
    strategicRationale:
      'Oman hosted indirect US-Iran talks (February 6, 2026) that came "close to a genuine breakthrough" — Omani FM Al Busaidi declared peace was "within reach" two days before the strikes. Sultan Haitham has offered to host direct talks. The Soufan Center assesses Gulf and Iranian diplomats are "back-channeling on how to prevent further Iranian attacks." GCC states are preparing for the scenario where the Iranian regime survives, making a durable communication channel a strategic asset regardless of war outcome. Qatar — GCC member that shot down two Iranian jets — also maintains separate channels. Expansion from ceasefire-focused messaging to a comprehensive framework (infrastructure targeting halt, IRGC-GCC deconfliction, post-war economic guarantees) raises the stakes and credibility. (political §4)',
    expectedOutcomes:
      'Framework agenda within 7–10 days. Mutual ceasefire on GCC-targeting strikes achievable within 21 days if both sides engage. Oman mediation restores pre-war "within reach" status. Qatar LNG force majeure lifted once Ras Laffan targeting ceases — restoring up to 77 million tonnes per annum and $2–3B/month in Qatari revenue.',
    concurrencyRules: [
      {
        decisionId: 'gcc-deny-airbases',
        decisionTitle: 'Deny US Further Use of Airbases for Strikes on Iran',
        compatible: true,
      },
      {
        decisionId: 'gcc-swf-divestment',
        decisionTitle: 'Sovereign Fund Divestment — US Treasuries',
        compatible: true,
      },
      {
        decisionId: 'gcc-saudi-iran-bilateral',
        decisionTitle: 'Saudi-Iran Direct Bilateral Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-security-summit',
        decisionTitle: 'Emergency Regional Security Summit — GCC+Jordan+Egypt+Turkey',
        compatible: true,
      },
    ],
  },

  'gcc-opec-adjustment': {
    id: 'gcc-opec-adjustment',
    title: 'OPEC+ Production Adjustment — Price Stabilization',
    dimension: 'economic',
    escalationDirection: 'neutral',
    resourceWeight: 0.35,
    strategicRationale:
      'Saudi Arabia holds ~3 million bpd spare capacity; UAE adds ~440,000 bpd via ADCOP bypass. With Brent at $108.78/bbl (March 18, peaked $119.48 on March 12) and IEA warning of the "largest supply disruption in history," a coordinated OPEC+ production increase caps oil at ~$115/bbl, avoiding a US recession that would crater Gulf export revenue and invite political backlash threatening long-term security ties. Saudi East-West Pipeline (Petroline) is already at ~2.2M bpd (up from 1.1M). The $600M/day in tourism losses and DFM closures signal that economic instability hurts GCC economies even as headline prices rise. Price stabilisation at $115/bbl preserves Saudi/UAE revenue while removing Iran\'s Hormuz leverage narrative. (economic §1)',
    expectedOutcomes:
      'Coordinated production surge of 1.5–2.5M bpd achievable within 30 days. Oil price cap at $110–115/bbl. Reduces Iran\'s Hormuz closure leverage: at $115/bbl Iran extracts ~$55B/yr less than at $130/bbl. US gas prices stabilise at $3.60–3.80/gallon — below recession trigger threshold. Does NOT break OPEC+ agreement; structured as emergency price-management mechanism consistent with 2022 precedents.',
    concurrencyRules: [
      {
        decisionId: 'gcc-deny-airbases',
        decisionTitle: 'Deny US Further Use of Airbases for Strikes on Iran',
        compatible: true,
      },
      {
        decisionId: 'gcc-security-summit',
        decisionTitle: 'Emergency Regional Security Summit — GCC+Jordan+Egypt+Turkey',
        compatible: true,
      },
      {
        decisionId: 'gcc-swf-divestment',
        decisionTitle: 'Sovereign Fund Divestment — US Treasuries',
        compatible: true,
      },
      {
        decisionId: 'gcc-oman-backchannel',
        decisionTitle: 'Activate Oman Backchannel — Full-Spectrum Talks',
        compatible: true,
      },
    ],
  },

  'gcc-swf-divestment': {
    id: 'gcc-swf-divestment',
    title: 'Sovereign Fund Divestment — US Treasuries',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.4,
    strategicRationale:
      'Gulf sovereign wealth funds collectively manage >$2 trillion in US assets (FT, March 5). At least three of four major Gulf economies have begun internal reviews of overseas investment commitments, examining force majeure clauses. An adviser to a Gulf government told the FT this prospect "already caught the White House\'s attention." The petrodollar system generates ~$225–270B annually in US borrowing advantages. A visible rotation of even 5–10% of Gulf SWF holdings ($100–200B) from US Treasuries into euro-denominated bonds, yuan instruments, or gold signals strategic displeasure without triggering a market crash — but demonstrates that the "betrayal" narrative (political §4) has material consequences. The $7B China-Saudi currency swap is an existing channel. (economic §2, political §4)',
    expectedOutcomes:
      'Signal rotation of $50–100B out of US Treasuries over 90 days raises 10-year US yields by an estimated 10–20 basis points. White House receives clear political signal. Yuan-denominated holdings rise from near-zero to 3–5% of total SWF allocation. Petrodollar erosion accelerates by 2–3 years vs. baseline trajectory. Reversible: rotation can be paused or reversed within 30 days if US adjusts posture.',
    concurrencyRules: [
      {
        decisionId: 'gcc-oman-backchannel',
        decisionTitle: 'Activate Oman Backchannel — Full-Spectrum Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-deny-airbases',
        decisionTitle: 'Deny US Further Use of Airbases for Strikes on Iran',
        compatible: true,
      },
      {
        decisionId: 'gcc-opec-adjustment',
        decisionTitle: 'OPEC+ Production Adjustment — Price Stabilization',
        compatible: true,
      },
      {
        decisionId: 'gcc-saudi-iran-bilateral',
        decisionTitle: 'Saudi-Iran Direct Bilateral Talks',
        compatible: true,
      },
    ],
  },

  'gcc-saudi-iran-bilateral': {
    id: 'gcc-saudi-iran-bilateral',
    title: 'Saudi-Iran Direct Bilateral Talks',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.25,
    strategicRationale:
      'Iran publicly expressed appreciation to Saudi Arabia (March 5) for upholding commitments not to allow Saudi territory to be used against Iran — indicating both sides preserve a functional diplomatic channel. The March 2023 Beijing-brokered Saudi-Iran rapprochement is technically in effect despite Saudi FM describing attacks as "brazen and cowardly." Multiple sources indicate diplomatic communications continue. Gulf officials told the Jerusalem Post: "It\'s possible that in the end, the regime will not fall… Gulf states would have to continue dealing with Tehran." MBS-to-Pezeshkian-successor channel bypasses US entirely, establishing a parallel peace track that protects GCC interests regardless of US-Iran outcome. Precedent: Saudi-Iran 2023 deal achieved without US involvement. (political §4)',
    expectedOutcomes:
      'Mutual pledge of no further strikes on civilian infrastructure (Ras Tanura, Ras Laffan, Mussafah) within 10–14 days. Saudi Aramco Ras Tanura refinery (550,000 bpd) returns to operations within 21 days. Reduces operational risk premium on Gulf oil by $8–12/bbl. Does not constitute a formal ceasefire — preserves Iranian ability to strike US/Israeli assets while protecting GCC economic infrastructure.',
    concurrencyRules: [
      {
        decisionId: 'gcc-deny-airbases',
        decisionTitle: 'Deny US Further Use of Airbases for Strikes on Iran',
        compatible: true,
      },
      {
        decisionId: 'gcc-oman-backchannel',
        decisionTitle: 'Activate Oman Backchannel — Full-Spectrum Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-swf-divestment',
        decisionTitle: 'Sovereign Fund Divestment — US Treasuries',
        compatible: true,
      },
      {
        decisionId: 'gcc-security-summit',
        decisionTitle: 'Emergency Regional Security Summit — GCC+Jordan+Egypt+Turkey',
        compatible: true,
      },
    ],
  },

  'gcc-security-summit': {
    id: 'gcc-security-summit',
    title: 'Emergency Regional Security Summit — GCC+Jordan+Egypt+Turkey',
    dimension: 'diplomatic',
    escalationDirection: 'neutral',
    resourceWeight: 0.2,
    strategicRationale:
      'Chatham House assessed: "Whatever was left of that trust has been broken, accelerating the GCC states\' push to diversify security partners." Russia, China, and Iran conducted joint naval drills in the Strait of Hormuz in February 2026. Analyst Hussein Ibish captured the mood: "Three layers: first is rage against Iran, second is dismay with Washington, and third is profound suspicion about Israel\'s regional agenda." An expanded forum — GCC plus Jordan, Egypt, and Turkey — creates a non-US, non-Israeli regional security architecture. Turkey is NATO but has independent Middle East policy; Egypt controls the Suez Canal; Jordan has exposed borders. The forum agenda: coordinated air defence burden-sharing, joint ceasefire demand, and a post-war reconstruction compact for Gulf infrastructure ($15B in losses in first two weeks). (political §4)',
    expectedOutcomes:
      'Summit convened within 14–21 days. Joint communiqué calling for ceasefire issued by 8–10 regional states. Coordinated air defence sharing reduces per-country cost by 20–30%. Establishes permanent secretariat as seed of a post-war regional security architecture independent of US Fifth Fleet dependence. Turkey engagement keeps NATO signalling channel open without subordinating GCC to Washington.',
    concurrencyRules: [
      {
        decisionId: 'gcc-opec-adjustment',
        decisionTitle: 'OPEC+ Production Adjustment — Price Stabilization',
        compatible: true,
      },
      {
        decisionId: 'gcc-oman-backchannel',
        decisionTitle: 'Activate Oman Backchannel — Full-Spectrum Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-saudi-iran-bilateral',
        decisionTitle: 'Saudi-Iran Direct Bilateral Talks',
        compatible: true,
      },
      {
        decisionId: 'gcc-deny-airbases',
        decisionTitle: 'Deny US Further Use of Airbases for Strikes on Iran',
        compatible: true,
      },
    ],
  },
}
