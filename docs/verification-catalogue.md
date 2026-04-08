# GeoSim Verification Catalogue

Tracks provenance of factual claims in scenario data. Updated whenever scenario data changes.

**Provenance levels:**
- ✅ `verified` — directly sourced from research docs with citation
- ⚠️ `researched` — sourced from research docs but interpretation or labeling is mine
- ❌ `inferred` — logical inference from verified facts; needs independent confirmation
- 🔴 `incorrect` — known to be wrong; fixed in code, documented here for history

**Primary sources (as of ground truth date 2026-03-19):**
- `research-political.md` — US/Iran/Israel politics, polling, key events
- `research-military.md` — weapons, force deployments, battle damage
- `research-economic.md` — oil, sanctions, financial data

---

## Key Figures

### US

| Figure | Claim | Status | Source | Source Date | Notes |
|--------|-------|--------|--------|-------------|-------|
| Trump | Authorized Op Epic Fury Feb 28 | ✅ verified | research-political.md §"Operation Epic Fury" | 2026-02-28 | |
| Trump | Claimed "totally obliterated" Kharg Island (March 13) | ✅ verified | research-military.md §10 | 2026-03-13 | Assessed as political claim; actual damage verified separately |
| Trump | Public support 40–44% | ✅ verified | research-political.md §polling | 2026-03-19 | |
| Trump | Vance less hawkish, would seek exit ramp | ❌ inferred | none | — | Not sourced in research docs; needs verification |
| Rubio | Secretary of State since January 2025 | ✅ verified | research-political.md §"Marco Rubio" | 2026-03-19 | |
| Rubio | $1M+ AIPAC contributions since 2010 | ✅ verified | research-political.md §"Marco Rubio" (TrackAIPAC cited) | 2026-03-19 | |
| Rubio | March 2 press conference "accidental admission" | ✅ verified | research-political.md §"Marco Rubio's critical admission" | 2026-03-02 | Exact quotes captured; walked back next day |
| Rubio | `disposition: 'hawk'` | ✅ verified | research-political.md (explicitly corrects "wavering" framing) | 2026-03-19 | **Previously incorrectly coded as 'hawk-wavering'** |
| Kent | Resigned March 17, 2026 | ✅ verified | research-political.md §"Joe Kent's resignation" | 2026-03-17 | Exact resignation letter quotes in source |
| Kent | "Iran posed no imminent threat" | ✅ verified | research-political.md §"Joe Kent's resignation" (direct quote) | 2026-03-17 | |

### Iran

| Figure | Claim | Status | Source | Source Date | Notes |
|--------|-------|--------|--------|-------------|-------|
| Ali Khamenei | Killed Feb 28, 2026 | ✅ verified | research-political.md §"Supreme Leader succession" | 2026-03-01 | Confirmed by Iranian state media March 1 |
| Ali Khamenei | Death one day after Oman diplomatic breakthrough | ✅ verified | research-political.md | 2026-02-28 | |
| Ali Khamenei | Had issued fatwa against nuclear weapons | ❌ inferred | none | — | Not explicitly in research docs. Mojtaba assessed as more open to nukes (implying father had constraints), but the fatwa claim is not sourced. **Needs verification.** |
| Mojtaba Khamenei | Elected Supreme Leader March 8–9 | ✅ verified | research-political.md §"Supreme Leader succession" | 2026-03-08 | Assembly of Experts two-thirds majority |
| Mojtaba Khamenei | Mid-level clerical rank (Hojjatoleslam, not Ayatollah) | ✅ verified | research-political.md §"Mojtaba's profile" | 2026-03-19 | Significant legitimacy deficit |
| Mojtaba Khamenei | More hardline/radical than father | ✅ verified | research-political.md §"Mojtaba's profile" (Carnegie's Sadjadpour cited) | 2026-03-19 | |
| Mojtaba Khamenei | More favorable to nuclear weapons development | ✅ verified | research-political.md §"Mojtaba's profile" (Washington Institute) | 2026-03-19 | |
| Mojtaba Khamenei | Possibly in Moscow (Russian military plane) | ⚠️ researched | research-political.md §"Supreme Leader succession" | 2026-03-16 | "Reports emerged" — not confirmed |
| Mojtaba Khamenei | Status unknown; Hegseth "wounded and likely disfigured" | ✅ verified | research-military.md §"Mojtaba Khamenei as successor" | 2026-03-19 | No video/audio since appointment |
| Mojtaba Khamenei | Praised Houthi attacks | ❌ inferred | none | — | **Not in research docs. Remove or verify independently.** |
| Araghchi | March 1 quote on military independence | ✅ verified | research-political.md §"Command structure resilience" (exact quote) | 2026-03-01 | |
| Araghchi | `disposition: 'pragmatist'` | ❌ inferred | none | — | Labeled by me based on back-channel potential; not explicitly sourced |
| Vahidi | Appointed IRGC deputy December 2025 | ⚠️ researched | research-political.md §"Command structure resilience" | 2026-03-19 | Named as new C-in-C; December appointment implied by "specifically to prepare" |
| Vahidi | Promoted after Pakpour (original C-in-C) killed Day 1 | ✅ verified | research-military.md §8 (Pakpour in killed list); research-political.md | 2026-02-28 | |

### Israel

| Figure | Claim | Status | Source | Source Date | Notes |
|--------|-------|--------|--------|-------------|-------|
| Netanyahu | Called Trump Feb 23 with Khamenei's location | ✅ verified | research-military.md §"Mojtaba Khamenei as successor" | 2026-02-23 | |
| Netanyahu | Strike initiated day after Oman breakthrough | ✅ verified | research-political.md | 2026-02-28 | |
| Netanyahu | 74% of Jewish Israelis trust him on this operation | ✅ verified | research-political.md §"Israeli public opinion" (IDI poll Mar 2–3) | 2026-03-03 | |
| Netanyahu | March 31 budget deadline triggers Knesset dissolution | ✅ verified | research-political.md §"Netanyahu's coalition" | 2026-03-19 | First reading 53–45 |
| Netanyahu | Bennett polling 18–21 seats | ✅ verified | research-political.md §"Netanyahu's coalition" (Channel 12, March 13) | 2026-03-13 | |

---

## Actor State Claims Needing Verification

These are numerical values or characterizations in `US_STATE`, `IRAN_STATE`, `ISRAEL_STATE` etc. that were not explicitly cross-checked against research docs.

| File/Field | Claim | Status | Notes |
|-----------|-------|--------|-------|
| US_STATE.military.overallReadiness: 72 | US military readiness at 72/100 | ❌ inferred | Numerical scoring is my estimate; research docs discuss degradation (THAAD/Patriot depletion) but don't assign a numeric score |
| US_STATE.economic.overallHealth: 62 | US economic health at 62/100 | ❌ inferred | Numerical scoring is my estimate |
| US_STATE.political.leadershipCohesion: 60 | Leadership cohesion 60/100 | ❌ inferred | Kent resignation, Rubio admission suggest fracture but score is mine |
| US_STATE.political.regimeStability: 72 | Regime stability 72/100 | ❌ inferred | Numerical scoring is my estimate |
| IRAN_STATE.* | All numeric readiness/health scores | ❌ inferred | Same — research docs describe qualitative state, numbers are my estimates |
| ISRAEL_STATE.* | All numeric readiness/health scores | ❌ inferred | Same |

---

## Corrections Log

| Date | Field | Old Value | New Value | Reason |
|------|-------|-----------|-----------|--------|
| 2026-04-01 | rubio.disposition | `'hawk-wavering'` | `'hawk'` | research-political.md explicitly corrects: Rubio was making case FOR war, not signaling doubt |
| 2026-04-01 | rubio.description | "By Day 18 press conference used phrase 'Israel's security objectives' three times…noted as signal of doubt" | Accurate description of March 2 accidental admission + walkback | Previous description fabricated a specific incident not in research docs |
| 2026-04-01 | rubio.successionImpact | "Would likely seek negotiated off-ramp if given cover" | "Deeply tied to AIPAC donor network; unlikely to seek off-ramp independently" | Previous assessment contradicted by documented AIPAC ties |

---

## Items Requiring Web Research

These claims were not resolvable from the three research docs. Web verification needed before treating as reliable:

1. **Khamenei nuclear fatwa** — Was there a documented fatwa? What was its exact wording and date?
2. **Mojtaba Khamenei praised Houthi attacks** — Specific statement or source needed; removed from description until sourced
3. **Vance foreign policy posture** — Research docs don't characterize him; "less hawkish on Middle East" is my inference
4. **Araghchi's diplomatic track record / "pragmatist" label** — What specific evidence supports this characterization?
5. **Vahidi December 2025 deputy appointment** — Exact date and source for this appointment
