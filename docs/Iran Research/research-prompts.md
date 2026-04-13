# Iran Simulation Research Prompts

## How to Run

**Run each prompt as a separate conversation** — do not chain them in one thread. Each call needs its own fresh context to stay focused. Since none of them depend on each other, you can run all 9 in parallel by opening multiple browser tabs.

**Save outputs** to the `data/` directory at the repo root (gitignored). File names listed under each prompt.

**Total: 9 calls** — 5 national capabilities, 1 coalition capabilities, 4 relationship dynamics.

---

## Section A: National Capabilities

All capabilities calls use the same temporal anchor: **January 2026 only**. Do not reference events after February 1, 2026.

---

### A1 — United States Capabilities

**Save to:** `data/capabilities-us.json`

```
You are building a capabilities inventory for a geopolitical simulation.
Actor: United States

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

SOURCE CONSTRAINT: Use only publicly available, open-source information — IISS Military Balance,
Congressional testimony, CRS reports, official DOD/State statements, or major news reporting
(Reuters, AP, NYT, WSJ). Do not speculate on classified details or operational specifics.

For each capability output a JSON object:
{
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH — current status, how it would be used in an Iran conflict, constraints and limitations. Minimum 4-5 sentences. No one-liners.]",
  "quantity": [number or null],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "[one sentence on domestic/international constraints]",
  "temporal_anchor": "January 2026",
  "source": "..."
}

Cover thoroughly:
- Military: publicly reported order of battle (Army active duty strength, Navy carrier strike groups and publicly known deployments, Air Force bomber and fighter wing assignments, Marine expeditionary forces, nuclear posture — publicly acknowledged delivery system categories and general deterrence posture, Cyber Command as publicly described)
- Diplomatic: UN Security Council veto, treaty obligations to Israel (what the US is and is not legally committed to), NATO implications, Abraham Accords leverage
- Economic: unilateral sanction authority, dollar dominance and SWIFT access, Strategic Petroleum Reserve capacity and release authority, ability to pressure allied economies
- Intelligence: publicly acknowledged collection capabilities — satellite reconnaissance programs (NRO/commercial as publicly reported), intelligence sharing arrangements with Israel and Gulf states, general assessments from open-source and Congressional testimony

Include capabilities NOT yet deployed to theater.
Flag anything degraded by pre-February-2026 events (sustained Middle East deployments, readiness impacts).
Note domestic political constraints — specifically: public support for military action, Congressional AUMF requirements, 21% public support context for Iran strikes.

Output ONLY a JSON array. No prose outside the JSON.
```

---

### A2 — Iran Capabilities

**Save to:** `data/capabilities-iran.json`

```
You are building a capabilities inventory for a geopolitical simulation.
Actor: Iran (Islamic Republic of Iran)

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

SOURCE CONSTRAINT: Use only publicly available, open-source information — IISS Military Balance,
IAEA reports, CRS reports, think-tank analysis (CSIS, RAND, CNAS), or major news reporting.
Do not speculate on classified operational details.

IMPORTANT CONTEXT: Iran's air defense was partially degraded in October 2024 Israeli strikes.
Note which systems were affected based on publicly reported assessments, and assessed recovery
status by January 2026.

For each capability output a JSON object:
{
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH — current status, how it would be used in conflict with the US and Israel, constraints and limitations. Minimum 4-5 sentences.]",
  "quantity": [number or null],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "[one sentence on constraints — domestic, IRGC vs. regular military tensions, etc.]",
  "temporal_anchor": "January 2026",
  "source": "..."
}

Cover thoroughly:
- Military: ballistic missile programs with publicly reported range/payload categories (Shahab, Emad, Khorramshahr, Fattah), drone arsenal (Shahed series — as publicly reported including Russia transfers), naval assets and Hormuz denial capabilities (mine warfare, fast boat doctrine, anti-ship missiles), IRGC vs. Artesh distinction and command structure, underground facilities (Fordow, Natanz — as reported by IAEA), nuclear program status (enrichment levels and breakout estimates as reported by IAEA and public arms control sources)
- Proxy network: Hezbollah remaining capability post-2024 Lebanon war, Houthi capability post-Yemen strikes, Iraqi militia networks — based on publicly reported assessments including degradation
- Diplomatic: Non-Aligned Movement relationships, SCO membership, ability to frame conflict as anti-imperialist in Global South
- Economic: oil export volume and customers (China primarily), Hormuz closure threat and Iran's own vulnerability to closure, foreign currency reserves, sanctions evasion mechanisms
- Intelligence services: MOIS and IRGC Intelligence Organization as publicly described, cyber capabilities as documented in public reporting and government attribution (past attacks on Saudi Aramco, US financial sector)

Output ONLY a JSON array. No prose outside the JSON.
```

---

### A3 — Israel Capabilities

**Save to:** `data/capabilities-israel.json`

```
You are building a capabilities inventory for a geopolitical simulation.
Actor: Israel

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

SOURCE CONSTRAINT: Use only publicly available, open-source information — IISS Military Balance,
Jane's Defence, Israeli government statements, think-tank analysis (INSS, RAND, CSIS), or major
news reporting. Nuclear ambiguity is real — note clearly where figures are publicly assessed
estimates from arms control organizations (FAS, Bulletin of Atomic Scientists), not confirmed.

For each capability output a JSON object:
{
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH — current status, how it would be used against Iran, constraints and limitations. Minimum 4-5 sentences.]",
  "quantity": [number or null],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "[one sentence — domestic coalition politics, US relationship constraints, etc.]",
  "temporal_anchor": "January 2026",
  "source": "..."
}

Cover thoroughly:
- Military: IDF publicly reported order of battle (ground divisions, armor), Air Force long-range strike capability including aerial refueling range and tanker fleet, F-35I Adir capabilities and publicly assessed Iran strike range, Iron Dome / David's Sling / Arrow 3 multi-tier missile defense capacity (after Gaza/Lebanon sustained operations), submarine fleet, nuclear ambiguity — publicly assessed estimates from arms control organizations only (clearly labeled as assessed, not confirmed), special forces (Sayeret Matkal, Shayetet 13) as publicly described
- Mossad: publicly documented track record — covert action against Iranian nuclear program (acknowledged operations), documented cases of targeted operations, general regional reach as publicly reported
- Cyber: Unit 8200 as publicly described, publicly attributed operations track record
- Diplomatic: US relationship leverage, normalization agreements (Abraham Accords — which countries and current status), UN voting coalition
- Economic: high-tech sector as economic resilience, US military aid ($3.8B annual baseline), dependency on US for certain munitions — note any supply constraints from Gaza/Lebanon operations
- Constraints: ongoing Gaza commitment and force readiness impact, domestic political coalition fragility, international isolation concerns, humanitarian pressure from Western allies

Output ONLY a JSON array. No prose outside the JSON.
```

---

### A4 — Russia and China (Combined)

**Save to:** `data/capabilities-russia-china.json`

```
You are building a capabilities inventory for a geopolitical simulation.
Actors: Russia and China — model as indirect supporters of Iran, not direct participants.

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

SOURCE CONSTRAINT: Use only publicly available, open-source information — IISS Military Balance,
think-tank analysis (RAND, CSIS, CNAS, RUSI), official government statements, or major news
reporting. Russia's Ukraine war status is widely publicly reported — use open-source estimates.

For each capability output a JSON object:
{
  "actor": "russia" | "china",
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH — current status, how it would be used to support Iran or counter US pressure in an Iran conflict, hard limits on direct involvement. Minimum 4-5 sentences.]",
  "quantity": [number or null],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "[one sentence — specifically why direct military involvement is not plausible and what the threshold for action would need to be]",
  "temporal_anchor": "January 2026",
  "source": "..."
}

Cover for Russia:
- Arms already transferred to Iran (specific systems: Yakhont/Oniks anti-ship, S-300 variants, UAV technology sharing, documented transfers vs. reported transfers)
- Diplomatic cover: UN Security Council veto use and coordination with China, bilateral statements
- Economic support: oil purchasing volume, sanctions evasion facilitation, SWIFT alternative (SPFS) access
- Military constraints: Ukraine war commitment — assessed readiness, troop deployment levels, ammunition consumption rate, what Russia cannot spare
- Strategic interest: how an Iran-US conflict benefits Russia (US distraction, oil price spike, NATO attention divided) — this is the key motivation to model correctly
- Hard ceiling: what Russia will not do even if Iran is losing badly

Cover for China:
- Economic lifeline: oil purchase volume from Iran (assessed % of Chinese imports), yuan settlement mechanics, trade volume
- Belt and Road: Iran's role in BRI and what China risks if Iran destabilizes
- Diplomatic leverage: SCO membership, coordination with Russia at UNSC, Global South framing
- Military constraints: why direct intervention is implausible (economic interdependence with US, Taiwan priority, no blue-water navy presence in Persian Gulf)
- Technology transfers: dual-use technology Iran has received, drone component supply chains
- Threshold: what level of US action against Iran would force China to escalate its support (vs. quietly accept Iranian defeat to preserve China-US relationship)

Output ONLY a JSON array. No prose outside the JSON.
```

---

### A5 — Gulf States (Combined)

**Save to:** `data/capabilities-gulf-states.json`

```
You are building a capabilities inventory for a geopolitical simulation.
Actors: Gulf States — Saudi Arabia, UAE, and Qatar. Model collectively with actor field distinguishing them.

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

SOURCE CONSTRAINT: Use only publicly available, open-source information — IISS Military Balance,
official US DOD/CENTCOM statements, think-tank analysis (RAND, CSIS, Arab Gulf States Institute),
or major news reporting. US basing arrangements in the Gulf are publicly acknowledged.

For each capability output a JSON object:
{
  "actor": "saudi_arabia" | "uae" | "qatar",
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH — current status, relevance to Iran conflict, constraints including geographic vulnerability, domestic politics, and the tension between US basing and Iranian retaliation threat. Minimum 4-5 sentences.]",
  "quantity": [number or null],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "[one sentence — especially the domestic political cost of being seen as enabling a US/Israel attack on a Muslim country]",
  "temporal_anchor": "January 2026",
  "source": "..."
}

Cover thoroughly:

Saudi Arabia:
- Military: Royal Saudi Air Force order of battle (F-15SA, Typhoon fleets), Patriot missile defense batteries and coverage gaps, ground forces, naval assets in Gulf
- Economic: OPEC+ production capacity, ability to flood or restrict oil market, Aramco infrastructure vulnerability (Abqaiq precedent from 2019 attack), sovereign wealth fund (PIF) scale
- US relationship: Joint Defense Cooperation agreements, US military advisors embedded with Saudi forces, weapons dependency (specific systems), MBS-Trump personal dynamic (separate from formal relationship)
- Iranian vulnerability: what Iran can actually hit in Saudi Arabia (oil infrastructure, desalination plants, Riyadh population centers), assessed missile defense effectiveness against Iranian ballistic missiles

UAE:
- Military: Al Dhafra Air Base (US B-52/F-35 presence), UAE Air Force capability, Patriot coverage
- Economic: Dubai as global financial hub — vulnerability to being cut off from SWIFT or Iranian disruption, Jebel Ali port significance
- Balancing act: UAE has maintained diplomatic channels with Iran while hosting largest US air base in region
- Abraham Accords: Israel normalization and what that means for UAE-Iranian relations

Qatar:
- Al Udeid Air Base: specific US presence (aircraft types, personnel numbers, command functions — CENTCOM forward HQ), the unique tension of Qatar hosting largest US air base while maintaining formal relations with Iran and Hamas political bureau
- LNG exports: Qatar's economic dependency on Hormuz staying open (% of LNG through strait)
- Political position: Qatar's historical mediator role — what they can offer diplomatically that no other Gulf state can

All three:
- Hormuz dependency: assessed % of each country's exports passing through the strait
- Collective vulnerability: if Iran retaliates against Gulf state infrastructure for US base use, what are the highest-value targets and assessed Iranian accuracy against them

Output ONLY a JSON array. No prose outside the JSON.
```

---

## Section B: Relationship Dynamics

Relationship calls do not need temporal anchoring as strictly — focus on the period leading up to February 2026, and note where dynamics have shifted recently.

---

### B1 — Netanyahu-Trump Relationship

**Save to:** `data/relationship-netanyahu-trump.json`

```
Document the Netanyahu-Trump relationship dynamic as of early 2026 with specific verified examples. This is for a geopolitical simulation that needs to model how each party makes decisions when the other is involved.

Output structured JSON:
{
  "relationship_summary": "[FULL PARAGRAPH — the overall dynamic, who holds more leverage and why, how it has evolved across both Trump terms, what makes it structurally asymmetric]",
  "influence_mechanisms": [
    {
      "mechanism": "[name of the mechanism]",
      "description": "[FULL PARAGRAPH — how Netanyahu uses this mechanism, why it works on Trump specifically, examples]"
    }
  ],
  "documented_instances": [
    {
      "event": "...",
      "date": "...",
      "what_netanyahu_wanted": "...",
      "what_trump_did": "...",
      "us_strategic_cost": "[what the US gave up or risked]",
      "source": "..."
    }
  ],
  "override_conditions": "[FULL PARAGRAPH — what would cause Trump to push back against Netanyahu's preferences. Be specific: at what domestic political cost threshold does Trump balk? What economic pain (oil prices, recession risk) overrides the relationship? Are there red lines Trump has stated or demonstrated?]",
  "current_conflict_manifestations": "[FULL PARAGRAPH — specific to the escalation period June 2025 through January 2026, how this dynamic is already visible in decisions made]",
  "implications_for_simulation": "[FULL PARAGRAPH — how an AI agent modeling Trump should weight Netanyahu's requests differently from other allied leaders' requests, and under what circumstances]"
}

Anchor to January 2026. Do NOT include post-February 28, 2026 events.
Cite specific events, statements, or credible reporting throughout.
Be specific — avoid generalities. If something is assessed/inferred rather than documented, note it explicitly.
```

---

### B2 — Iran-Russia Relationship

**Save to:** `data/relationship-iran-russia.json`

```
Document the Iran-Russia relationship dynamic as of early 2026 for a geopolitical simulation. This relationship is critical because it is frequently overstated — Russia provides significant support but has hard limits, and both parties understand it is transactional rather than alliance-based.

Output structured JSON:
{
  "relationship_summary": "[FULL PARAGRAPH — the overall dynamic. Key point: Russia's support for Iran is instrumentalized — Iran destabilizes the US and raises oil prices, which benefits Russia regardless of whether Iran wins or loses. This is not a military alliance. Explain the structural logic.]",
  "russian_support_provided": [
    {
      "category": "military" | "diplomatic" | "economic",
      "description": "[FULL PARAGRAPH — what Russia has actually delivered or provided, verified vs. reported, and Iran's assessed dependency on this support]",
      "documented": true | false,
      "source": "..."
    }
  ],
  "hard_limits": {
    "description": "[FULL PARAGRAPH — what Russia will not do even if Iran is being defeated. Direct military intervention, nuclear umbrella extension, forward deployment of Russian forces — explain why each is off the table and what Russia's stated vs. actual red lines are]",
    "ukraine_constraint": "[FULL PARAGRAPH — how Russia's Ukraine commitment constrains its ability to support Iran even if it wanted to. Specific resource and attention limitations.]"
  },
  "irans_perception": "[FULL PARAGRAPH — how Iran's leadership actually views the reliability of Russian support. Does Tehran trust Moscow? What has Russia done that has created doubt? What has Iran given up (drone technology transfer, etc.) and what has it received in return?]",
  "escalation_thresholds": "[FULL PARAGRAPH — at what point would Russia increase vs. decrease support for Iran? What US actions would cause Russia to escalate its involvement? What Iranian defeats would cause Russia to quietly disengage?]",
  "documented_instances": [
    {
      "event": "...",
      "date": "...",
      "what_happened": "...",
      "significance": "...",
      "source": "..."
    }
  ]
}

Anchor primarily to the period 2022-January 2026. Cover the weapons transfer relationship including Shahed drone technology, S-300 history, and any reported transfers leading up to 2026.
Cite specific events and reporting. Note where information is assessed vs. confirmed.
```

---

### B3 — Iran-China Relationship

**Save to:** `data/relationship-iran-china.json`

```
Document the Iran-China relationship dynamic as of early 2026 for a geopolitical simulation. A critical decision point in our scenario is Iran's selective Hormuz passage policy (allowing friendly ships to pass if they pay in Chinese yuan rather than US dollars). Understanding the Iran-China economic relationship is essential to modeling this decision correctly.

Output structured JSON:
{
  "relationship_summary": "[FULL PARAGRAPH — the overall dynamic. Key structural points: China is Iran's primary economic lifeline (largest oil customer), but China also has far more to lose from a direct US confrontation than it has to gain from defending Iran. This creates a relationship where Iran has significant dependency but limited leverage over Chinese behavior in a crisis.]",
  "economic_ties": {
    "oil_trade": "[FULL PARAGRAPH — assessed volume of Iranian oil exports to China (barrels/day), yuan settlement arrangements and their significance for both parties, the petrodollar challenge dimension of this arrangement, pricing discounts Iran offers China]",
    "trade_volume": "[FULL PARAGRAPH — total bilateral trade, Chinese exports to Iran, BRI projects in Iran, Chinese economic presence in Iranian ports and infrastructure]",
    "sanctions_evasion": "[FULL PARAGRAPH — how China facilitates Iranian sanctions evasion: shadow fleet arrangements, financial intermediaries, dual-use technology supply chains]"
  },
  "diplomatic_support": "[FULL PARAGRAPH — SCO membership, UNSC veto coordination with Russia, Global South narrative support, what China will and won't say publicly about Iranian actions]",
  "chinese_red_lines": {
    "description": "[FULL PARAGRAPH — what China will not do. No direct military involvement. No formal mutual defense commitment. Will reduce oil purchases and distance itself if Iranian actions directly threaten Chinese economic interests or relations with the US. Explain the threshold.]",
    "us_relationship_constraint": "[FULL PARAGRAPH — China's economic interdependence with the US and why this constrains Chinese support for Iran even if Xi wanted to provide more. The Taiwan priority. The trade war risk.]"
  },
  "yuan_oil_mechanism": "[FULL PARAGRAPH — specifically how the yuan oil payment arrangement works, its current scale, and what it means for the dollar's reserve currency status. Why this is strategically significant beyond just Iran — it's part of a larger de-dollarization effort.]",
  "escalation_thresholds": "[FULL PARAGRAPH — what would cause China to increase support for Iran vs. quietly step back? At what point does Chinese support become a liability rather than an asset for Beijing?]",
  "documented_instances": [
    {
      "event": "...",
      "date": "...",
      "what_happened": "...",
      "significance": "...",
      "source": "..."
    }
  ]
}

Anchor primarily to 2021-January 2026 (the 25-year cooperation agreement period and its implementation).
Cite specific reporting on oil volumes, yuan settlements, and diplomatic coordination.
Note where figures are estimated vs. confirmed.
```

---

### B4 — US-Gulf States Relationship

**Save to:** `data/relationship-us-gulf-states.json`

```
Document the US-Gulf States relationship dynamic as of early 2026 for a geopolitical simulation. The central tension is that Gulf states host the US military infrastructure essential for any Iran operation, while simultaneously being the most exposed to Iranian retaliation and having their own independent relationships with Iran that they want to preserve.

Output structured JSON:
{
  "relationship_summary": "[FULL PARAGRAPH — the overall dynamic across Saudi Arabia, UAE, and Qatar. Key tension: these states provide basing and logistical support that makes US Iran operations possible, but they are not aligned with Israeli maximalist objectives and have their own reasons to want a limited, not unlimited, conflict with Iran.]",
  "basing_arrangements": {
    "al_udeid_qatar": "[FULL PARAGRAPH — what Al Udeid provides: CENTCOM forward headquarters, aircraft types and approximate numbers, tanker assets, command and control functions, and the extraordinary political anomaly of Qatar hosting this base while maintaining formal relations with Iran and hosting Hamas political bureau. What Qatar gets in exchange (US security guarantee) and what it costs Qatar (Arab street criticism, Iranian pressure).]",
    "al_dhafra_uae": "[FULL PARAGRAPH — US presence at Al Dhafra, B-52 and stealth aircraft basing, UAE's willingness to provide access and the limits of that willingness]",
    "saudi_bases": "[FULL PARAGRAPH — US presence at Prince Sultan Air Base and other Saudi facilities, the domestic Saudi political sensitivity around US military presence on Saudi soil (9/11 legacy), current status]",
    "basing_as_leverage": "[FULL PARAGRAPH — how Gulf states use basing rights as leverage over US policy — what they can threaten to withdraw and what the US would lose, and conversely what the US can demand in exchange for the security guarantee]"
  },
  "mbs_trump_dynamic": {
    "description": "[FULL PARAGRAPH — the MBS-Trump personal relationship, distinct from the formal US-Saudi relationship. Key elements: arms sales leverage ($450B investment pledge), oil production decisions as economic lever, Khashoggi as a constraint Trump has explicitly dismissed, NEOM and investment ties. How MBS gets things from Trump that formal diplomatic channels could not achieve.]",
    "documented_instances": [
      {
        "event": "...",
        "date": "...",
        "what_mbs_wanted": "...",
        "what_trump_did": "...",
        "source": "..."
      }
    ]
  },
  "gulf_state_preferences": {
    "saudi_arabia": "[FULL PARAGRAPH — what Saudi Arabia actually wants from this conflict: permanent degradation of Iranian power without a regional war that destabilizes the oil market, no Iranian nuclear weapon, but also no open-ended US military presence that inflames domestic Islamist sentiment. How MBS balances these.]",
    "uae": "[FULL PARAGRAPH — UAE's more pragmatic commercial orientation: Dubai as a global hub depends on regional stability. UAE has been quietly hedging — maintaining back-channel Iran contacts while deepening US/Israel ties. What the Abraham Accords cost UAE with Arab neighbors and what it gained.]",
    "qatar": "[FULL PARAGRAPH — Qatar's unique position as the only Gulf state with active diplomacy with Iran, Hamas, and the Taliban simultaneously. Qatar's mediation value to the US (Gaza ceasefire negotiations) as protection against US pressure. How Doha manages the Al Udeid relationship while maintaining Iranian ties.]"
  },
  "iranian_retaliation_vulnerability": "[FULL PARAGRAPH — what Iran can actually target in Gulf states: Abqaiq oil processing facility (precedent from 2019), Ras Tanura terminal, UAE desalination plants, Dubai financial infrastructure, Qatar's North Field LNG platform. The assessed accuracy and penetration capability of Iranian ballistic missiles against Gulf state air defenses as of January 2026. Why Gulf states fear Iranian retaliation more than they fear Iranian regional dominance.]",
  "escalation_thresholds": "[FULL PARAGRAPH — at what point do Gulf states withdraw basing access, go neutral, or even align with Iran against US interests? What Iranian or US actions cross Gulf state red lines? What would cause the Gulf coalition to fracture?]"
}

Anchor to January 2026. Cite specific reporting on basing arrangements, arms sales, and documented diplomatic exchanges.
```

---

## Summary Checklist

| Call | File | Status |
|------|------|--------|
| A1 — US Capabilities | `data/capabilities-us.json` | [ ] |
| A2 — Iran Capabilities | `data/capabilities-iran.json` | [ ] |
| A3 — Israel Capabilities | `data/capabilities-israel.json` | [ ] |
| A4 — Russia + China | `data/capabilities-russia-china.json` | [ ] |
| A5 — Gulf States | `data/capabilities-gulf-states.json` | [ ] |
| B1 — Netanyahu-Trump | `data/relationship-netanyahu-trump.json` | [ ] |
| B2 — Iran-Russia | `data/relationship-iran-russia.json` | [ ] |
| B3 — Iran-China | `data/relationship-iran-china.json` | [ ] |
| B4 — US-Gulf States | `data/relationship-us-gulf-states.json` | [ ] |

Once all 9 files are saved to `data/`, the pipeline scripts can run.

---

## Section C: Timeline Update (March 19 → Present)

**Run after** the 9 capability/relationship calls above. This extends the ground truth timeline from the last research doc date (March 19, 2026) to the present.

**Save output to:** `data/timeline-update-march19-present.json`

---

### C1 — Iran Conflict: March 19, 2026 to Present

**Run as:** Normal chat with web search enabled (NOT deep research)

**Prompt:**

```
I'm building a geopolitical simulation of the 2026 US-Israel-Iran conflict. My research currently covers events through March 19, 2026. I need you to research and document all significant events from March 19, 2026 through today.

Today's date is April 5, 2026.

Focus on events in these categories:
- Military operations: US/Israeli strikes on Iran, Iranian retaliatory strikes, naval operations in the Strait of Hormuz, Hezbollah/Lebanon front, Iraq militia activity
- Diplomatic developments: ceasefire negotiations, Gulf state positioning, China/Russia diplomatic moves, UN Security Council activity
- Regime/political: Iran's new Supreme Leader Mojtaba Khamenei consolidating power, IRGC command structure, Iranian domestic stability or instability
- Economic/energy: Strait of Hormuz shipping status, oil price trajectory, LNG supply disruptions, IEA reserve releases
- US domestic: Congressional actions, polling shifts, Trump administration decisions on war scope or termination

For each event, output a JSON object with these exact fields:
- id: "" (leave blank — will be generated)
- timestamp: "YYYY-MM-DD" (use the actual date; use first of month if only month known)
- timestamp_confidence: "exact" | "approximate" | "period"
- title: brief descriptive title (10 words or fewer)
- description: 2-3 sentence factual description with no editorial commentary
- actors_involved: array of actor IDs from: ["united_states", "iran", "israel", "russia", "china", "gulf_states"]
- dimension: "military" | "diplomatic" | "economic" | "intelligence"
- is_decision: true if an actor made a deliberate strategic choice; false if it's a consequence or development
- deciding_actor: actor ID if is_decision is true, otherwise ""
- escalation_direction: "up" | "down" | "lateral" | "none"
- source_excerpt: one sentence from a credible source (Reuters, AP, NYT, FT, WSJ, BBC) summarizing the event

Output ONLY a JSON array of these objects. No prose, no markdown, no explanation — just the raw JSON array starting with [ and ending with ].

Use only publicly available, open-source information. Anchor all events to their actual dates. Do not speculate or extrapolate beyond what has been reported.
```

**After saving:** Add the contents of this file's `events` array directly into `data/iran-timeline-raw.json` under the `events` key, or keep it separate and merge manually before running `scripts/filter-timeline.ts`.

---

## Progress Tracker

| Call | Output File | Done |
|------|-------------|------|
| A1 — US Capabilities | `data/capabilities-us.json` | [ ] |
| A2 — Iran Capabilities | `data/capabilities-iran.json` | [ ] |
| A3 — Israel Capabilities | `data/capabilities-israel.json` | [ ] |
| A4 — Russia + China Capabilities | `data/capabilities-russia-china.json` | [ ] |
| A5 — Gulf States Capabilities | `data/capabilities-gulf-states.json` | [ ] |
| B1 — Netanyahu-Trump | `data/relationship-netanyahu-trump.json` | [ ] |
| B2 — Iran-Russia | `data/relationship-iran-russia.json` | [ ] |
| B3 — Iran-China | `data/relationship-iran-china.json` | [ ] |
| B4 — US-Gulf States | `data/relationship-us-gulf-states.json` | [ ] |
| C1 — Timeline Update Mar 19→Present | `data/timeline-update-march19-present.json` | [ ] |

Once all files are saved to `data/`, run `scripts/filter-timeline.ts` to clean and deduplicate.
