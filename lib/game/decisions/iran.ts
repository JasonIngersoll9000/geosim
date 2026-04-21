// lib/game/decisions/iran.ts
// Iran decision catalog for the Iran 2026 scenario (turn 115).
// Scenario state: Khamenei killed Feb 28; Mojtaba appointed Mar 8; nuclear program degraded
// but not eliminated; ~1,000–1,200 ballistic missiles remaining; Hormuz effectively closed;
// IRGC's 31 semi-autonomous provincial commands still functioning.
// Sources: docs/Iran Research/research-{military,political,economic}.md
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

// NOTE: Exported as IR_DECISIONS / IR_DECISION_DETAILS to avoid collision with the
// backwards-compat shim in lib/game/iran-decisions.ts (which re-exports US_DECISIONS
// under the alias IRAN_DECISIONS).
export const IR_DECISIONS: DecisionOption[] = [
  {
    id: 'ballistic-strike-gulf-bases',
    title: 'Ballistic Missile Strike — Gulf Bases',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.6,
    requiredAssets: [
      { assetType: 'ballistic_missiles_reserve', requiredStatus: ['available'] },
    ],
  },
  {
    id: 'close-strait-hormuz',
    title: 'Close Strait of Hormuz',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.55,
    requiredAssets: [
      { assetType: 'irgc_naval_fast_attack', requiredStatus: ['available'] },
    ],
  },
  {
    id: 'seek-russian-chinese-mediation',
    title: 'Seek Russian/Chinese Mediation',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.15,
  },
  {
    id: 'nuclear-reconstitution',
    title: 'Accelerate Nuclear Reconstitution',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    requiredAssets: [
      { assetType: 'centrifuge_manufacturing_capacity', requiredStatus: ['available'] },
    ],
  },
  {
    id: 'martyr-state-propaganda',
    title: 'Propaganda Campaign — "Martyr State"',
    dimension: 'information',
    escalationDirection: 'neutral',
    resourceWeight: 0.2,
  },
  {
    id: 'activate-proxies-houthi-hezbollah',
    title: 'Activate Houthi / Hezbollah Proxies',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.45,
  },
]

export const IR_DECISION_DETAILS: Record<string, DecisionDetail> = {
  'ballistic-strike-gulf-bases': {
    id: 'ballistic-strike-gulf-bases',
    title: 'Ballistic Missile Strike — Gulf Bases',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.6,
    strategicRationale:
      'Iran retains an estimated 1,000–1,200 ballistic missiles after the Feb 28–Mar 18 exchange' +
      ' (Haaretz; ~500+ fired, ~75% of launchers destroyed by CENTCOM). Targeting Al Udeid (Qatar),' +
      ' Ain al-Assad (Iraq), and USS Abraham Lincoln in the Arabian Sea exploits the confirmed cost' +
      ' asymmetry: each Shahab or Kheibar Shekan costs $2–5M while a single THAAD interceptor' +
      ' costs $12–15M and US stocks are projected to exhaust in 4–5 weeks at current engagement' +
      ' rates (research-military §10, §2). Fattah-2 hypersonic glide vehicles (Mach 13–15,' +
      ' combat-debut March 1) can defeat SM-6 interceptors and represent Iran\'s highest-value' +
      ' "rationed" reserve for this scenario.',
    expectedOutcomes:
      'A saturation volley of 60–80 missiles divided across 3 targets inflicts' +
      ' THAAD/Patriot depletion on at least one battery, potentially disabling the Al Udeid' +
      ' AN/FPS-132 early-warning radar ($1.1B asset, already damaged). Probability of US/coalition' +
      ' fatalities is high (>80%), triggering a domestic US escalation response while depleting' +
      ' 5–8% of remaining US interceptor inventory. Iran expends ~8–10% of its remaining' +
      ' missile reserve; resupply from covert production lines is 50–100 missiles/month.',
    concurrencyRules: [
      {
        decisionId: 'seek-russian-chinese-mediation',
        decisionTitle: 'Seek Russian/Chinese Mediation',
        compatible: false,
      },
      {
        decisionId: 'nuclear-reconstitution',
        decisionTitle: 'Accelerate Nuclear Reconstitution',
        compatible: true,
      },
      {
        decisionId: 'martyr-state-propaganda',
        decisionTitle: 'Propaganda Campaign — "Martyr State"',
        compatible: true,
      },
      {
        decisionId: 'activate-proxies-houthi-hezbollah',
        decisionTitle: 'Activate Houthi / Hezbollah Proxies',
        compatible: true,
      },
    ],
  },

  'close-strait-hormuz': {
    id: 'close-strait-hormuz',
    title: 'Close Strait of Hormuz',
    dimension: 'economic',
    escalationDirection: 'escalate',
    resourceWeight: 0.55,
    strategicRationale:
      'Iran began planting naval mines around March 10 and the IRGC officially declared the Strait' +
      ' "closed" on March 2 — already in effect for US/Western-aligned shipping (research-military' +
      ' §11; research-economic §1). The strait carries ~20 million bpd (~20% of global petroleum' +
      ' consumption), and China receives 45–50% of its oil via this chokepoint. Only 3.5–5.5M bpd' +
      ' of alternative pipeline capacity exists — wholly insufficient. Iran holds an estimated' +
      ' 5,000–6,000 naval mines and IRGC fast-attack swarms. Tightening the closure by expanding' +
      ' minefields and interdicting neutral tankers raises global oil from $108/bbl toward the' +
      ' $120–130/bbl JP Morgan threshold, maximizing economic leverage on China and Europe to' +
      ' pressure Washington for a ceasefire (research-economic §3).',
    expectedOutcomes:
      'Full mine-field expansion reduces transits from ~21 tankers/week to near zero within 48 hours.' +
      ' Brent crude re-tests $119–126/bbl peak. China, which has maintained back-channel' +
      ' communications with Iran (research-political §4 Gulf states section), faces $40B/month' +
      ' import-cost increase — increasing Beijing\'s incentive to lean on Washington. Marine-clearance' +
      ' operations take months; Iran absorbs ~$1.5B/day in its own lost oil revenue but this is' +
      ' offset by leverage value. Risk: US Tripoli amphibious group (~2,200 Marines) accelerates' +
      ' toward Strait seizure mission.',
    concurrencyRules: [
      {
        decisionId: 'seek-russian-chinese-mediation',
        decisionTitle: 'Seek Russian/Chinese Mediation',
        compatible: false,
      },
      {
        decisionId: 'ballistic-strike-gulf-bases',
        decisionTitle: 'Ballistic Missile Strike — Gulf Bases',
        compatible: true,
      },
      {
        decisionId: 'activate-proxies-houthi-hezbollah',
        decisionTitle: 'Activate Houthi / Hezbollah Proxies',
        compatible: true,
      },
      {
        decisionId: 'martyr-state-propaganda',
        decisionTitle: 'Propaganda Campaign — "Martyr State"',
        compatible: true,
      },
    ],
  },

  'seek-russian-chinese-mediation': {
    id: 'seek-russian-chinese-mediation',
    title: 'Seek Russian/Chinese Mediation',
    dimension: 'diplomatic',
    escalationDirection: 'de-escalate',
    resourceWeight: 0.15,
    strategicRationale:
      'Mojtaba Khamenei was reportedly transported to Moscow on a Russian military plane around' +
      ' March 16 (research-political §2 succession section). Russia has been providing Iran with' +
      ' intelligence on US warship positions (Washington Post, 3 US officials; research-political' +
      ' §4). Domestic opposition is fragmented and "unable to capitalize" (Time, March 16); no' +
      ' organized exile faction has street-level support inside Iran. A formal request for' +
      ' Russian/Chinese good-offices offers Mojtaba legitimacy, halts the command decapitation' +
      ' spiral, and exploits Beijing\'s strategic interest in resuming Hormuz oil flows — all' +
      ' without surrendering the nuclear dossier (research-political §2).',
    expectedOutcomes:
      'If Moscow brokers a 72-hour ceasefire framework, Iranian missile attacks pause and oil' +
      ' markets correct by 15–20%. Mojtaba consolidates IRGC loyalty by demonstrating the new' +
      ' leadership can maneuver diplomatically. Risk: Washington may reject third-party mediation' +
      ' as it did Oman\'s February 26 breakthrough, and the window may close in <48 hours if' +
      ' US strikes accelerate. Iranian concessions required: likely some enriched uranium transfer' +
      ' and IAEA access to undamaged sites.',
    concurrencyRules: [
      {
        decisionId: 'ballistic-strike-gulf-bases',
        decisionTitle: 'Ballistic Missile Strike — Gulf Bases',
        compatible: false,
      },
      {
        decisionId: 'close-strait-hormuz',
        decisionTitle: 'Close Strait of Hormuz',
        compatible: false,
      },
      {
        decisionId: 'nuclear-reconstitution',
        decisionTitle: 'Accelerate Nuclear Reconstitution',
        compatible: false,
      },
      {
        decisionId: 'martyr-state-propaganda',
        decisionTitle: 'Propaganda Campaign — "Martyr State"',
        compatible: true,
      },
    ],
  },

  'nuclear-reconstitution': {
    id: 'nuclear-reconstitution',
    title: 'Accelerate Nuclear Reconstitution',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.5,
    strategicRationale:
      'The IAEA stated on February 27, 2026 that it "cannot provide any information on the' +
      ' current size, composition or whereabouts of the stockpile of enriched uranium" — Iran' +
      ' retains ~440 kg of 60%-enriched uranium, enough for ~10 weapons if further enriched,' +
      ' and IAEA lost centrifuge manufacturing verification in 2021 (research-military §4).' +
      ' Satellite imagery shows Iran accelerating work on Pickaxe Mountain, an underground site' +
      ' buried >100 meters — deeper than Fordow and potentially impervious to GBU-57 MOPs.' +
      ' With Khamenei\'s fatwa effectively void at his death (research-military §4) and both' +
      ' pre-war constraints eliminated, Mojtaba (assessed as "more favorable to nuclear weapons" — ' +
      ' Washington Institute) has strategic and political incentive to covertly reconstitute.',
    expectedOutcomes:
      'Diverting centrifuge cascades rescued from Natanz/Fordow to Pickaxe Mountain and a second' +
      ' covert site shortens breakout timeline from "months to a year" to potentially 4–6 weeks' +
      ' once weapons-grade enrichment resumes. Achieves deterrence value before the end of the' +
      ' current 19-day conflict. If detected, triggers immediate US/Israeli strike authorization;' +
      ' if undetected for 30+ days, IAEA verification becomes virtually impossible.',
    concurrencyRules: [
      {
        decisionId: 'seek-russian-chinese-mediation',
        decisionTitle: 'Seek Russian/Chinese Mediation',
        compatible: false,
      },
      {
        decisionId: 'ballistic-strike-gulf-bases',
        decisionTitle: 'Ballistic Missile Strike — Gulf Bases',
        compatible: true,
      },
      {
        decisionId: 'martyr-state-propaganda',
        decisionTitle: 'Propaganda Campaign — "Martyr State"',
        compatible: true,
      },
      {
        decisionId: 'activate-proxies-houthi-hezbollah',
        decisionTitle: 'Activate Houthi / Hezbollah Proxies',
        compatible: true,
      },
    ],
  },

  'martyr-state-propaganda': {
    id: 'martyr-state-propaganda',
    title: 'Propaganda Campaign — "Martyr State"',
    dimension: 'information',
    escalationDirection: 'neutral',
    resourceWeight: 0.2,
    strategicRationale:
      'Iranian public sentiment is divided, not unified: some Iranians celebrated Khamenei\'s death' +
      ' in Isfahan, Karaj, and Shiraz; diaspora protests drew 350,000 in Los Angeles and Toronto' +
      ' (research-political §2). The regime is "using wartime conditions to suppress all dissent' +
      ' as treason" (Carnegie Endowment). Framing the conflict as unprovoked Western aggression' +
      ' against a sovereign Islamic nation — emphasizing the Jan 2026 massacre cover-up, civilian' +
      ' casualties, and the killing of Khamenei one day after Oman\'s diplomatic breakthrough —' +
      ' targets the nationalist segment of the divided population and exploits anti-war opinion' +
      ' in the US (40–60% opposition; research-political §1) and among Global South audiences.',
    expectedOutcomes:
      'A sustained 2-week campaign across state media, social channels, and Al Jazeera sympathizers' +
      ' raises pro-regime rally-around-the-flag sentiment by an estimated 10–15 percentage points' +
      ' among wavering Iranians, reducing active collaboration with US intelligence networks.' +
      ' Internationally, drives UNGA emergency session rhetoric and increases pressure on US' +
      ' allies to distance themselves from the conflict. Does not require any military resource' +
      ' expenditure; compatible with most concurrent decisions.',
    concurrencyRules: [
      {
        decisionId: 'ballistic-strike-gulf-bases',
        decisionTitle: 'Ballistic Missile Strike — Gulf Bases',
        compatible: true,
      },
      {
        decisionId: 'close-strait-hormuz',
        decisionTitle: 'Close Strait of Hormuz',
        compatible: true,
      },
      {
        decisionId: 'nuclear-reconstitution',
        decisionTitle: 'Accelerate Nuclear Reconstitution',
        compatible: true,
      },
      {
        decisionId: 'seek-russian-chinese-mediation',
        decisionTitle: 'Seek Russian/Chinese Mediation',
        compatible: true,
      },
    ],
  },

  'activate-proxies-houthi-hezbollah': {
    id: 'activate-proxies-houthi-hezbollah',
    title: 'Activate Houthi / Hezbollah Proxies',
    dimension: 'military',
    escalationDirection: 'escalate',
    resourceWeight: 0.45,
    strategicRationale:
      'The IRGC\'s "Axis of Resistance" network continues operating despite command decapitation.' +
      ' Hezbollah re-entered the war March 2 firing ~100 rockets/day and Israel launched its' +
      ' largest Lebanon ground invasion since 2006 on March 16, deploying the 91st Division' +
      ' across three armored/infantry formations (research-military §12). Houthis have' +
      ' demonstrated the ability to strike Gulf oil infrastructure and Red Sea shipping' +
      ' (research-military §11 — Ras Laffan hit, Mesaieed Industrial Area struck).' +
      ' Coordinated multi-front pressure forces Israel to split Iron Dome/David\'s Sling intercept' +
      ' capacity across northern Lebanon and the south, while stretching US naval escort' +
      ' resources across the Red Sea and Arabian Gulf simultaneously.',
    expectedOutcomes:
      'Hezbollah multi-rocket salvos (100–200/day escalating to 300+) combined with Houthi' +
      ' anti-ship missile attacks on Red Sea corridor reduce Israeli northern front defensive' +
      ' depth and inflict 30–40% degradation on David\'s Sling intercept capacity within' +
      ' 10 days. Shipping insurance premiums in the Red Sea re-spike by 4–6x, adding economic' +
      ' pressure on Europe. Risk: accelerates Israel\'s ground offensive into Lebanon, and' +
      ' Hezbollah\'s resupply was already delayed 14–21 days per CIA/Mossad disruption (US' +
      ' proxy-disrupt decision); proxy effectiveness degrades if resupply is cut.',
    concurrencyRules: [
      {
        decisionId: 'seek-russian-chinese-mediation',
        decisionTitle: 'Seek Russian/Chinese Mediation',
        compatible: false,
      },
      {
        decisionId: 'ballistic-strike-gulf-bases',
        decisionTitle: 'Ballistic Missile Strike — Gulf Bases',
        compatible: true,
      },
      {
        decisionId: 'close-strait-hormuz',
        decisionTitle: 'Close Strait of Hormuz',
        compatible: true,
      },
      {
        decisionId: 'nuclear-reconstitution',
        decisionTitle: 'Accelerate Nuclear Reconstitution',
        compatible: true,
      },
    ],
  },
}
