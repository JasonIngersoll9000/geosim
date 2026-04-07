# Research Gap-Fill Prompts

Run each prompt separately in Claude Web (with web search enabled).
Save results to `docs/Iran Research/research-gap-fill-results.md`.

We already have pre-war baseline inventories in `data/capabilities-*.json` —
these prompts focus on **depletion trends, current status, and key inflection dates**.

---

## PROMPT 1 — Military Asset Depletion & Current Status

```
I'm researching the US-Iran conflict that began in late February 2026
(Operation Midnight Hammer / Operation Epic Fury). I need current status
and depletion trends for military assets. Use web search for the most
recent reporting available.

For each item give:
- Current estimated status / remaining capacity
- Approximate daily consumption or depletion rate
- Any significant dates where the rate shifted substantially
- Confidence level in your estimate (high / medium / low)

US ASSETS:
- Tomahawk cruise missiles: estimated total expended so far in this
  conflict, approximate daily strike rate, any signs of supply
  constraint or drawdown concerns
- GBU-57 Massive Ordnance Penetrator: how many used on hardened
  sites (Fordow, others), remaining usable inventory concerns
- SM-3 / SM-6 interceptors: daily intercept rate in theater,
  any reported shortfalls or resupply movements
- THAAD and Patriot PAC-3: intercept rates, any reported depletion
  concerns or emergency resupply
- US radar systems degraded or destroyed: which sites, what
  capability lost, dates — especially any that affect intercept
  effectiveness
- US military bases: Al Udeid (Qatar), Al Dhafra (UAE),
  Ain al-Assad (Iraq), Diego Garcia — any damage, operational
  degradation, dates
- Carrier strike groups: current position (Red Sea / Persian Gulf /
  Arabian Sea), any damage or operational constraints

ISRAELI ASSETS:
- Arrow-3 / Arrow-2 interceptors: daily intercept rate,
  estimated remaining stock, any emergency US resupply
- David's Sling and Iron Dome: daily usage rates, any
  reported depletion in northern batteries (Lebanon front)
- F-35I sortie rate and any attrition
- IDF military casualties — cumulative and rate per week
- Israeli civilian casualties — cumulative

IRANIAN ASSETS:
- Ballistic missile launches to date: total count, rate per
  day/week, any apparent reduction suggesting depletion
- Drone launches (Shahed and others): total count, rate,
  any reduction trend
- Iranian air defense systems: how many S-300 / Bavar-373 /
  Khordad-15 batteries destroyed or degraded, dates
- Iranian naval activity in Strait of Hormuz: mine-laying
  status, fast attack craft losses, submarine activity
- IRGC Aerospace Force operational capacity — any significant
  commanders killed, dates
- Iranian military casualties — cumulative estimate
- Iranian civilian casualties — cumulative estimate
```

---

## PROMPT 2 — Infrastructure & Economic Trends

```
I'm researching the economic and infrastructure impact of the US-Iran
conflict that began late February 2026. Focus on trends and inflection
points, not just current snapshots. Use web search.

For each item give current status, key dates where things changed
significantly, and trajectory (improving / stable / worsening).

OIL & GLOBAL ECONOMY:
- Brent crude price: trajectory since conflict began with key
  dates and price levels, current price, analyst projections
- Strait of Hormuz throughput: what percentage of normal traffic
  is moving, what is being blocked or rerouted, dates of any
  changes (mining, US naval escorts, etc.)
- Iranian oil production: current output as % of pre-war,
  key dates of facility strikes or shutdowns
- Global supply gap: estimated barrels/day shortfall,
  which producers are compensating and by how much
- IEA emergency releases: amounts, dates, price impact
- Countries implementing emergency rationing or fuel controls —
  list with dates
- Fertilizer supply disruption: estimated impact, which
  regions facing shortage, timeline to food security crisis
- Any global recession indicators triggered: central bank
  actions, credit downgrades, major market moves

IRANIAN INFRASTRUCTURE:
- Nuclear facilities post-strike status: Fordow, Natanz,
  Arak, Bushehr (nuclear plant hit), Parchin — current
  operational status, date of each significant strike
- Oil/gas infrastructure: Kharg Island export terminal,
  Bandar Abbas refinery, South Pars gas field — current
  % operational, dates of strikes or shutdowns
- Power grid: estimated % of pre-war coverage, major
  blackout areas, dates of significant strikes on grid
- Water treatment and civilian infrastructure: any reported
  shortages or collapse in major cities
- Port of Bandar Abbas: operational status
- Tehran-Karaj B1 bridge: confirmed destroyed, date

GULF STATE INFRASTRUCTURE:
- UAE Habshan gas facility: current status, % operational
- Saudi Aramco: any precautionary shutdowns or attacks,
  East-West pipeline capacity being used
- Any other Gulf energy infrastructure affected
```

---

## PROMPT 3 — Political & Diplomatic Status

```
I'm researching the political and diplomatic dimensions of the US-Iran
conflict that began late February 2026. Use web search. Give current
status with key inflection dates.

US DOMESTIC:
- Trump approval rating: current overall and specifically
  on war conduct, trend since conflict began
- Congressional authorization: any AUMF vote attempted,
  any war powers challenges, current status
- Cabinet and military personnel removed since conflict began:
  names, roles, dates, stated reasons (confirm Pam Bondi,
  Kristi Noem firings and any generals — add any others)
- Joe Kent resignation: date, role, stated reason
- Republican dissent: any significant GOP figures publicly
  criticizing war conduct or escalation
- Democrat position: formal opposition or support, any
  notable votes or statements
- Public opinion polling: support/oppose % trend over
  conflict duration
- Protests or civil unrest: scale, locations, dates

NATO & KEY ALLIES:
- Which NATO members have provided material support vs. refused
- Trump's NATO withdrawal threats: exact statements, dates,
  allied responses
- UK, France, Germany specific positions and actions
- South Korea, Japan, Australia: any requests for military
  support made, their responses
- India's position (major Iranian oil customer)
- Pakistan's role — are they facilitating anything

IRAN DOMESTIC:
- Public sentiment indicators: any protests, any
  rally-around-flag evidence, social media reporting
- Mojtaba Khamenei's authority: IRGC acceptance, any
  internal challenges to his leadership
- Iranian negotiation signals: any backchannel contacts
  or public statements suggesting willingness to negotiate

RUSSIA & CHINA:
- Russia's material support to Iran: any confirmed weapons,
  intelligence sharing, diplomatic cover
- China's material support: any confirmed assistance
- How conflict is affecting Russia's Ukraine front:
  any US capability or attention shift noted
- China's Taiwan posture: any changes since conflict began
- Pakistan-China peace initiative: current status, any
  progress toward ceasefire framework

INTERNATIONAL:
- UN Security Council: any resolutions, vetoes, current
  state of play
- Ceasefire proposals: who made them, current status
- Countries that have broken diplomatic relations with US
  or Israel
- ICC or international legal proceedings initiated
- Arab League / Gulf states: public positions vs. private
  cooperation with US
```

---

## Where to Save Results

Paste each prompt's output into:

`docs/Iran Research/research-gap-fill-results.md`

Use this structure:

```markdown
# Research Gap-Fill Results
_Date: YYYY-MM-DD_

## Military Assets & Depletion
[paste Prompt 1 results here]

## Infrastructure & Economic Trends
[paste Prompt 2 results here]

## Political & Diplomatic Status
[paste Prompt 3 results here]
```
