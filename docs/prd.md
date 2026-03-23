# GeoSim — Strategic Simulation Engine
## Product Requirements Document v1.0

---

## 1. Vision

GeoSim is an AI-powered strategic simulation engine that models competitive dynamics between actors — nations, organizations, political factions, businesses, or any entities with competing objectives — and lets users explore "what if" scenarios through an interactive decision-making loop.

The engine is domain-agnostic. While the flagship scenario models the current US-Israel-Iran conflict, the same architecture supports any competitive scenario: geopolitical conflicts, economic competitions, political campaigns, corporate strategy, public policy debates, historical counterfactuals, or any situation where multiple actors with different objectives, capabilities, and constraints make interdependent decisions.

### Core value proposition

GeoSim answers the question: "Given the current state of affairs, what happens if Actor X does Y?" — and then lets every other actor respond, creating a branching tree of plausible futures grounded in real-world data.

### What makes it different

- **Multi-dimensional modeling**: actors aren't just military powers — they have economic positions, political constraints, cultural factors, intelligence gaps, and domestic audiences, all of which shape their decisions.
- **Fog of war**: actors make decisions based on what they *believe*, not what is *true*. Miscalculation is a feature, not a bug.
- **Escalation logic**: actors prefer the lowest level of action that achieves their goals. Escalation has costs, and the system models when and why actors move up or down.
- **Asymmetric framing**: every actor's rationality is evaluated from their own perspective. There is no "protagonist." Iran's strategy of attrition is as valid as America's strategy of dominance.

---

## 2. Principles

### 2.1 Neutrality and realism

**This is the most important principle in the system.**

The simulation must be as unbiased as possible. Every actor's motivations, capabilities, and strategic logic must be represented with equal rigor and empathy. Specifically:

- **No protagonist bias.** The system does not favor any actor. The US is not the "good guy." Iran is not the "bad guy." Each actor has legitimate (from their perspective) objectives, rational strategies, and real constraints. A simulation that systematically underestimates adversaries or overestimates allies is worse than useless — it produces the kind of analysis that leads to strategic surprise.

- **Empathetic modeling.** Each actor agent must reason from that actor's worldview, values, and strategic culture — not from a Western liberal default. Iran's theocratic decision-making framework is not irrational; it is a different rationality. China's long-term strategic patience is not passivity; it is a different optimization horizon. Russia's risk tolerance is not recklessness; it is shaped by different threat perceptions.

- **Multiple valid interpretations.** When events are ambiguous or contested (e.g., was the Ayatollah's death a strategic failure or a unifying martyrdom?), the system should model both interpretations and track which actors hold which view, rather than asserting one as truth.

- **Source awareness.** The research pipeline must distinguish between information from different sources (government claims, independent reporting, intelligence assessments, propaganda) and weight them accordingly. Western media is not inherently more reliable than non-Western media — both have biases that must be accounted for.

- **Outcome fairness.** The resolution engine must not systematically produce outcomes that favor one actor's narrative. If Iran's asymmetric strategy (drone attrition, Strait closure) is well-designed, the simulation should reflect that it works — even if that's uncomfortable for a Western audience.

### 2.2 Analytical rigor

- All state assessments are grounded in researched data, not assumptions.
- Scores and assessments include justification and confidence levels.
- The judge evaluator catches implausible outcomes regardless of which actor benefits.
- Historical precedents are used to calibrate expectations.

### 2.3 Generalizability

- The data model, agent architecture, and game loop are domain-agnostic.
- The same `Actor`, `Objective`, `Constraint`, `EscalationLadder`, and `Decision` types work for countries, companies, political parties, or any competitive entity.
- Scenario-specific knowledge comes from the research pipeline and scenario framing, not from hardcoded assumptions in the engine.

### 2.4 Transparency

- Users can always inspect the reasoning behind AI decisions.
- The fog of war is visible in observer mode — users can see what each actor believes vs. what is true.
- Judge scores and critiques are visible, so users know when the simulation is uncertain about its own outputs.

---

## 3. Domain model

### 3.1 Core abstractions

The system models five core concepts that apply to any competitive scenario:

**Actors** — entities that make decisions. In geopolitics: nations, militias, organizations. In business: companies, regulators, market segments. In politics: parties, factions, interest groups.

**Dimensions** — the categories of state and action. The default set is military, economic, political, diplomatic, intelligence, and cultural, but this is configurable per scenario. A business scenario might use market_position, financial, regulatory, talent, brand, and technology.

**Escalation ladders** — a model of how actors prefer to compete at the lowest intensity that achieves their goals, and what drives them to escalate. In geopolitics: diplomacy → sanctions → covert ops → limited strikes → full war → nuclear. In business: price competition → marketing war → patent litigation → hostile acquisition → regulatory capture.

**Fog of war** — what each actor believes about others, which may differ from reality. In geopolitics: intelligence assessments. In business: market research and competitive intelligence. In politics: polling and opposition research.

**Constraint cascades** — chains of constraint removal that enable escalation. When conditions that previously prevented an action are removed, new and often dangerous actions become rational. The system tracks these chains and alerts when cascades are forming.

### 3.2 Data model reference

The complete TypeScript data model is maintained in `/docs/data-model.ts` (see artifact: GeoSim Data Models v2). Key types include:

- `Scenario` — full simulation state at a point in time
- `Actor` — entity with state, objectives, capabilities, constraints, escalation ladder, and intelligence picture
- `ActorState` — multi-dimensional snapshot (military, economic, political, diplomatic, intelligence)
- `EscalationLadder` — ordered rungs with triggers and de-escalation conditions
- `IntelligencePicture` — what one actor believes about another (fog of war)
- `InfluenceChannel` — models of how policy decisions are actually made (who has influence vs. who has popular support)
- `PolicyDisconnect` — the gap between popular will and actual policy
- `ConstraintCascade` — multi-step chains where constraint removal enables escalation
- `Decision` — an available action with costs, prerequisites, projected outcomes, and escalation implications
- `SimulationTurn` — a complete turn including planning, resolution, reaction, and judging phases
- `Event` — something that happened, with causal links and state impacts
- `Relationship` — edge between actors with type, strength, volatility, and shift triggers

### 3.3 Scenario dimensions (configurable)

| Scenario type | Dimensions |
|---|---|
| Geopolitical/military | military, economic, political, diplomatic, intelligence, cultural |
| Business competition | market_position, financial, regulatory, talent, brand, technology |
| Political campaign | polling, fundraising, messaging, coalition, media, ground_game |
| Public policy | legislative, judicial, public_opinion, lobbying, media, implementation |

---

## 4. System architecture

### 4.1 Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Map view │  │  Panels  │  │ War chronicle     │  │
│  │ (Mapbox) │  │ (actors, │  │ (narrative log)   │  │
│  │          │  │ decisions│  │                   │  │
│  │          │  │ events)  │  │                   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                  API Layer (Next.js API routes)      │
│  ┌────────────┐ ┌────────────┐ ┌─────────────────┐  │
│  │ Scenario   │ │ Game loop  │ │ Research        │  │
│  │ management │ │ controller │ │ pipeline        │  │
│  └────────────┘ └────────────┘ └─────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                  AI Service Layer                    │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌───────────┐  │
│  │ Actor    │ │Resolution│ │Judge │ │ Narrator  │  │
│  │ agents   │ │ engine   │ │      │ │           │  │
│  │ (per     │ │(omnisci- │ │(eval)│ │(chronicle)│  │
│  │  actor)  │ │  ent)    │ │      │ │           │  │
│  └──────────┘ └──────────┘ └──────┘ └───────────┘  │
│  All agents call Anthropic API with web search      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                  Data Layer (Supabase)               │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │Scenarios │ │ Turns &  │ │ User accounts &   │   │
│  │& actors  │ │ history  │ │ saved games       │   │
│  └──────────┘ └──────────┘ └───────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Tech stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React | Team expertise, SSR for initial load, API routes eliminate separate backend |
| Map | Mapbox GL JS | Beautiful vector tiles, free tier sufficient, strong SDK |
| Styling | Tailwind CSS | Rapid iteration, consistent design system |
| Backend | Next.js API routes | Eliminates separate server, clean service boundaries |
| Database | Supabase (Postgres) | Managed DB + auth + realtime subscriptions for observer mode |
| AI | Anthropic API (Claude Sonnet) | Web search for research pipeline, structured output for agents |
| Deployment | Vercel | Zero-config CI/CD, preview deployments, multi-environment |
| Monitoring | Vercel Analytics + Sentry | Error tracking, performance monitoring |

### 4.3 AI agent roles

| Agent | Information access | Purpose | Bias safeguard |
|---|---|---|---|
| Actor agent | Fog of war only (own intel picture) | Make decisions as a specific actor | System prompt enforces actor's worldview, not Western default |
| Resolution engine | Omniscient (true state) | Resolve simultaneous decisions, model outcomes | Must apply friction and failure equally to all actors |
| Judge / evaluator | Before and after state | Score plausibility, consistency, rationality | Evaluates each actor's rationality from their own perspective |
| Narrator | Resolution output | Write compelling war chronicle entries | Must give equal narrative weight to all actors' perspectives |
| Research pipeline | Web search | Populate scenario with real data | Must distinguish source bias, seek non-Western sources |

### 4.4 Anti-bias architecture

Bias mitigation is not an afterthought — it is embedded in the architecture:

1. **Actor agent prompt template** includes explicit instructions: "You must reason from this actor's worldview, values, and strategic culture. Do not import assumptions from Western liberal democratic norms unless this actor is a Western liberal democracy."

2. **Resolution engine** has a fairness check: outcomes must not systematically favor actors with higher military spending or technological superiority. Asymmetric strategies (attrition, economic leverage, proxy warfare) must be modeled with the same fidelity as conventional ones.

3. **Judge evaluator** scores each actor's rationality from their own perspective. An action that looks irrational from Washington's perspective but is rational from Tehran's perspective should score high on rationality.

4. **Research pipeline** prompts explicitly require seeking sources from multiple geopolitical perspectives and flagging when analysis is predominantly sourced from one side's media ecosystem.

5. **Narrator** must give equal narrative weight and humanization to all actors. If the US president gets named and quoted, the Iranian leadership should too.

---

## 5. Game loop

### 5.1 Turn structure (hybrid simultaneous + reaction)

```
┌─────────────────────────────────────────────┐
│ Phase 1: PLANNING (simultaneous)            │
│ All actor agents assess and decide at once. │
│ User controls their actor(s); AI plays rest.│
│ Parallel execution via Promise.all.         │
├─────────────────────────────────────────────┤
│ Phase 2: RESOLUTION                         │
│ Resolution engine takes all decisions.      │
│ Models collisions, outcomes, cascades.      │
│ Generates events and state updates.         │
│ Identifies reaction triggers.               │
├─────────────────────────────────────────────┤
│ Phase 3: REACTION                           │
│ Actors with immediate triggers respond.     │
│ Reactions are re-resolved through engine.   │
│ Captures "in response to" dynamics.         │
├─────────────────────────────────────────────┤
│ Phase 4: JUDGING                            │
│ Evaluator scores the turn's plausibility.   │
│ Narrator writes the chronicle entry.        │
│ State is finalized, next turn begins.       │
└─────────────────────────────────────────────┘
```

### 5.2 Game modes

| Mode | Description | User role |
|---|---|---|
| Observer | All actors controlled by AI. User watches, can intervene or rewind. | Analyst / student |
| Single actor | User controls one actor, AI plays the rest. | Strategist |
| Free roam | User can switch between any actor at any time. | Sandbox |

All modes support branching (rewind to any previous turn and explore a different path).

### 5.3 Decision depth and breadth

Real strategic decisions are not flat choices — they have operational parameters that dramatically shape outcomes, and actors execute multiple actions simultaneously across different dimensions.

**Decision depth — operational parameters:**
Every decision has configurable parameters (scale, scope, posture, timing, etc.) with 2-4 options each. "Launch ground operation" is not one decision — it's a strategic choice with dozens of configurations:
- Force commitment: Limited (50K) / Standard (100K) / Overwhelming (150K+)
- Scope: Coastal seizure only / Coastal + port cities / Full territorial
- Posture: Surprise (no buildup) / Deliberate (4-week visible buildup) / Covert (SOF only)
- Rules of engagement: Restrictive / Standard / Permissive
- Timing: Immediate / Coordinated with allies / After diplomatic ultimatum

The AI generates 2-3 named "parameter profiles" (pre-set combinations like "Surgical raid" vs "Overwhelming force" vs "Covert insertion") that users can pick from, or users can customize individual parameters. Each parameter setting changes costs, outcomes, escalation level, and adversary responses.

**Decision breadth — multi-action turns:**
Each actor submits a TurnPlan containing a primary action plus 0-3 concurrent actions. Concurrency rules ensure realism:
- Each action has a resource weight (light / moderate / heavy / total)
- Compatible actions can run together; incompatible ones cannot
- Synergies provide bonuses (air campaign + ground op = reduced casualties)
- Tensions create penalties (ceasefire negotiation + military escalation = credibility loss)
- Resource allocation across actions must sum to 100%

This creates a planning experience more like real strategic decision-making: actors balance multiple instruments of power simultaneously, trading off depth of commitment against breadth of action.

### 5.4 Decision generation standards

The AI must generate a comprehensive, thorough decision space for each actor every turn. Minimum requirements:
- 8-12 decisions per actor per turn across ALL relevant dimensions
- At minimum: 2-3 military, 1-2 economic, 1-2 diplomatic, 1 intelligence/covert, 1 political/domestic, 1 information/media
- Decisions must span multiple escalation levels (at least one de-escalation option)
- Include creative, unconventional, and asymmetric options — not just the obvious choices
- Each decision must have 2-5 operational parameters with 2-4 options each
- Each decision must have 2-3 named parameter profiles
- Each decision must have concurrency rules (compatible/incompatible with, resource weight)
- Users can always propose custom decisions that the system structures and evaluates

### 5.5 Custom decisions

Users can propose custom decisions not in the pre-generated list. The system evaluates the custom decision using the same framework: generates full operational parameters and profiles, determines concurrency rules, computes costs per profile, projects outcomes per profile, and assesses escalation impact. This allows exploration of unconventional strategies the AI didn't consider.

---

## 6. Research pipeline

### 6.1 Pipeline stages

The research pipeline converts a freeform scenario description into a fully populated `Scenario` object. It runs in 7 stages:

| Stage | Purpose | Dependencies | Parallelizable |
|---|---|---|---|
| 0: Scenario framing | Extract conflict frame, actors, relevance criteria | User input | No (interactive) |
| 1: Actor identification | Research and profile each actor | Stage 0 | No |
| 2: State assessment | Multi-dimensional state for each actor | Stage 1 | No |
| 3: Relationships | Map all actor relationships | Stages 1, 2 | Yes (with Stage 4) |
| 4: Event timeline | Build causal event chain | Stages 1, 2 | Yes (with Stage 3) |
| 5: Escalation ladders | Build ladders + constraint cascades | Stages 1-4 | No |
| 6: Fog of war | Intelligence pictures per actor | Stages 1-5 | No |

All stages use web search to ground analysis in real-world data.

### 6.2 Source handling

The research pipeline must:
- Seek sources from multiple perspectives (Western, non-Western, independent)
- Tag each claim with its source type (government, independent, intelligence assessment, disputed)
- Flag when a claim is primarily sourced from one side's media ecosystem
- Preserve the user's analytical framing while noting where research contradicts it

---

## 7. Frontend

### 7.1 Layout

Split-screen layout:
- **Left (60%)**: Mapbox GL interactive map showing actor positions, military assets, strategic infrastructure, chokepoints, and animated events during turn resolution.
- **Right (40%)**: Tabbed panel with context-sensitive content:
  - **Actors tab**: actor list with escalation rungs, global indicators, click to expand full actor state
  - **Decisions tab**: available decisions for current turn with escalation tags, custom decision input
  - **Events tab**: last turn resolution with judge scores
  - **Chronicle tab**: full war chronicle / narrative log (can also be a dedicated full-screen page)

### 7.2 War chronicle

A timeline-based narrative view that tells the story of the entire simulation:
- Each turn is a chronicle entry written in literary prose style (serif font)
- Expandable sections reveal detailed resolution data (decisions, state changes, judge scores, escalation movements)
- Filter by dimension (military, political, economic, etc.)
- Global ticker shows running totals (oil price, domestic support, etc.)
- Reaction phases are visually distinguished from planned actions
- Constraint cascade alerts appear when multi-step chains are forming
- Severity indicators (critical / major / moderate) for visual scanning

### 7.3 Decision planning view

When a user is building their TurnPlan:
- **Decision catalog:** Full list of 8-12+ available decisions grouped by dimension (military, economic, diplomatic, intelligence, political, information), each showing title, escalation direction, resource weight, and thumbnail description
- **Decision detail slide-over:** When user selects a decision to inspect:
  - Strategic rationale
  - Operational parameters with option selectors (dropdowns, toggles)
  - Named parameter profiles as quick-pick cards ("Surgical", "Overwhelming", "Covert")
  - Cost breakdown that updates live as parameters change
  - Projected outcomes per profile
  - Concurrency indicators (compatible/incompatible badges)
- **Turn plan builder:** Drag (or click-add) decisions into a planning area:
  - Primary action slot (required)
  - Concurrent action slots (0-3, optional)
  - Resource allocation sliders (must sum to 100%)
  - Live validation: incompatibility warnings, synergy highlights, resource budget meter
  - Combined rationale preview: how the AI would interpret this plan
- **Plan comparison:** Toggle between your plan and what the AI would choose (observer mode) to see alternative strategies
- Custom decision input with full parameter generation

### 7.4 Decision analysis view

When a user selects or inspects a decision:
- Strategic rationale explaining why a rational actor would consider this
- Parameter comparison table: side-by-side costs and outcomes for each profile
- Prerequisite and constraint warnings (may differ by parameter profile)
- Intelligence gap warnings with parameter-specific risks
- Projected outcomes per parameter profile (not generic — "surgical" has different outcomes than "overwhelming")
- Concurrency analysis: best and worst pairings with specific synergy/tension effects
- Anticipated responses from every other actor
- Impact on objectives
- Historical comparisons at this parameter level
- Overall assessment per profile

### 7.4 Actor state view

Full actor dossier showing:
- Key figures with status, disposition, and succession impact
- Multi-dimensional state (military assets with depletion trends, economic health, political influence channels)
- Objectives with progress tracking
- Constraints with lifecycle status (active / weakened / removed)
- Escalation ladder position with triggers and de-escalation conditions
- Intelligence picture (what this actor believes about others)
- Unknown unknowns (visible only in observer mode)

### 7.5 Map features (tiered)

**Tier 1 (MVP):** Country-level color coding by actor alignment. Click country for actor panel. Key chokepoints and contested zones marked.

**Tier 2:** Strategic assets as map markers (carrier groups, air bases, oil facilities). Asset detail on click. Animate movements between turns.

**Tier 3 (post-class):** Strike trajectories, drone swarm visualizations, air defense coverage zones, oil flow lines, real-time turn resolution animation.

---

## 8. User types

| Role | Capabilities |
|---|---|
| Player | Creates/loads scenarios, plays game modes, makes decisions, views chronicle |
| Observer | Watches AI-vs-AI simulations, can intervene and rewind, sees omniscient view |
| Scenario creator | Uses research pipeline to build new scenarios, curates and publishes |
| Admin | Manages scenarios, users, monitors system health, reviews eval metrics |

---

## 9. Evaluation system

### 9.1 Per-turn evaluation (LLM-as-judge)

Every turn is scored by the judge evaluator on five dimensions:

| Dimension | What it measures |
|---|---|
| Plausibility | Would real-world analysts find these outcomes reasonable? |
| Internal consistency | Do outcomes contradict established actor states or capabilities? |
| Proportionality | Are effect magnitudes reasonable? |
| Strategic rationality | Did each actor make decisions rational from their own perspective? |
| Cascade logic | Are second/third-order effects logically traced? |

### 9.2 Historical metrics

- Per-scenario average scores over all turns
- Per-actor rationality tracking (does the AI play each actor consistently?)
- Outcome distribution analysis (are outcomes systematically biased toward certain actors?)
- User satisfaction ratings on decision quality and narrative engagement

### 9.3 Bias detection

- Track outcome distributions across many simulations. If one actor class (e.g., Western democracies) systematically wins more than baseline expectations, flag for prompt tuning.
- Compare AI agent decisions against historical precedent. If agents consistently choose actions that real-world actors in similar positions would not, flag for calibration.
- Monitor research pipeline source distribution. If >70% of sources are from one media ecosystem, flag for diversification.

---

## 10. Scenarios (launch set)

### 10.1 Flagship: US-Israel-Iran conflict (2025-2026)

- **Actors:**
  - Primary: US, Israel, Iran
  - Secondary: Russia, China, Gulf States (UAE, Saudi Arabia, Qatar, Bahrain, Kuwait)
  - Proxy/militia: Hezbollah, Islamic Resistance in Iraq (IRI — 300+ attacks, significant secondary front), Houthis (latent threat — paused but could reactivate)
- **Phases:**
  - Phase 1: The Twelve-Day War (June 13-24, 2025) — Israel initiates strikes during nuclear negotiations, US joins with Operation Midnight Hammer on Day 9, ceasefire June 24
  - Phase 2: Interwar period (July 2025 - Feb 2026) — Iran expels IAEA, reconstitutes capabilities, massive domestic protests/massacre (5,000-36,500 killed Jan 2026), diplomatic "breakthrough" announced Feb 27
  - Phase 3: Operation Epic Fury (Feb 28, 2026 - ongoing) — joint US-Israel decapitation strike ONE DAY after diplomatic breakthrough, Ayatollah killed, Strait closed, multi-front war
- **Critical context for all actor agents:** The strikes came one day after Oman's FM announced a diplomatic breakthrough — Iran had agreed to transfer enriched uranium abroad and accept full IAEA verification. Netanyahu called Trump on Feb 23 to share Khamenei's location. This framing is essential for how actors reason about legitimacy, trust, and negotiation credibility.
- **Key dynamics:** asymmetric cost attrition (100:1 to 350:1 cost ratios verified), nuclear constraint cascade (IAEA cannot account for uranium stockpile), petrodollar erosion (gradual structural trend, not acute event), political disconnect (31-44% US public support, 82/100 AIPAC policy influence), Strait of Hormuz closure + mine warfare (clearing takes months), supply chain cascades (helium/semiconductor, fertilizer/food security), regime resilience (IRGC mosaic defense with 31 autonomous commands)
- **Actor framings:**
  - US: war of choice, regime change objective, political constraints from midterms and bipartisan but eroding consensus
  - Israel: existential framing, multi-front (Iran + Lebanon + Gaza), March 31 budget deadline constraint, nuclear option as last resort
  - Iran: existential/defensive, asymmetric attrition strategy, "just survive" win condition, Strait as primary leverage, nuclear breakout window open
  - Russia: opportunistic beneficiary, intelligence provider, oil revenue windfall, Ukraine pressure relief
  - China: strategic patience (NOT opportunistic aggression), de-escalating around Taiwan, prioritizing summit diplomacy, benefiting passively from THAAD removal intelligence windfall
  - Gulf States: caught in crossfire, furious at US for failed protection, reviewing $2T+ in US investment commitments, backchannel diplomacy with Iran
  - Iraqi militias: active secondary front, 300+ attacks, goal of dragging US into "long war of attrition"
  - Houthis: latent reserve — paused since Gaza ceasefire, could reactivate, Mojtaba Khamenei praised them
- **Branching point:** post-Ayatollah assassination, current state (Day 19)

### 10.2 Planned (post-launch)

- **China-Taiwan contingency**: US, China, Taiwan, Japan, South Korea, ASEAN
- **US political: 2026 midterms**: Republican party, Democratic party, key voter blocs, media, donors, interest groups
- **Tech industry: AI competition**: major AI labs, regulators, open source community, enterprise customers
- **Historical counterfactual: Cuban Missile Crisis**: US, USSR, Cuba — what if Kennedy chose differently?

---

## 11. Non-functional requirements

### 11.1 Performance

- Research pipeline: complete scenario population in <10 minutes
- Turn resolution: <30 seconds for all phases
- Map rendering: 60fps pan/zoom with up to 50 active markers
- Chronicle: smooth scroll with up to 100 turn entries

### 11.2 Security

- API keys stored in environment variables, never client-side
- Supabase Row Level Security for user data isolation
- Rate limiting on AI API calls to prevent abuse
- Input sanitization on custom decisions (prevent prompt injection)
- OWASP top 10 audit before launch

### 11.3 Deployment

- Three environments: development, staging, production
- Preview deployments per PR via Vercel
- Database migrations via Supabase CLI
- Monitoring: Sentry for errors, Vercel Analytics for performance

---

## 12. Sprint plan (3-4 weeks, 2-person team)

### Sprint 1 (Week 1-1.5): Foundation

- Project scaffolding: Next.js + Supabase + Vercel
- CLAUDE.md and project configuration
- Data model implementation (TypeScript types + Supabase schema)
- **Branch architecture: implement commit/branch/fork data model in Supabase**
- Research pipeline (Stages 0-6) — working end-to-end
- Seed Iran scenario with verified data from research prompts
- **Create ground truth trunk for Iran scenario with initial state**
- Basic API routes for scenario CRUD and branch management

### Sprint 2 (Week 1.5-3): Game loop + Frontend

- Actor agent, resolution engine, judge, narrator prompts
- Game loop controller (planning → resolution → reaction → judging)
- **Turn commits: each resolved turn is immutable, stored as a commit**
- **Fork/branch operations: user can branch from any commit**
- Split-screen layout with Mapbox (Tier 1)
- Actor state panel, decision analysis panel
- War chronicle view with expandable turns
- Game mode selection (observer, single actor, free roam)
- Auth + user types via Supabase
- **Ground truth trunk: manual update process for Iran scenario news**

### Sprint 3 (Week 3-4): Polish + Infrastructure

- CI/CD pipeline with performance gates
- Monitoring setup (Sentry + Vercel Analytics)
- Security audit (OWASP top 10)
- Eval system with historical metrics dashboard
- Map Tier 2 (asset markers, facility markers)
- **Public scenario browsing (read-only for MVP)**
- **Scenario creation wizard (simplified version for MVP)**
- UI polish, responsive design, error handling
- Documentation, blog post, presentation prep

---

## 13. Living scenarios and real-time updates

### 13.1 The ground truth trunk

For real-world scenarios like the Iran conflict, there is a special branch called the **ground truth trunk**. This branch is not played by any user or AI — it is updated by the research pipeline as real-world events unfold.

```
Ground truth trunk (auto-updated from real world)
│
│  Week 1: strikes begin (researched, verified)
│  Week 2: Strait closes (researched, verified)
│  Week 3: oil infrastructure escalation (researched, verified)
│  Week 4: [new events as they happen]
│
├── Branch A: "What if the US proposed ceasefire in week 2?"
│   ├── Turn 1: ceasefire proposed...
│   ├── Turn 2: Iran responds...
│   └── Branch A1: "What if Iran rejected it?"
│
├── Branch B: "What if Israel didn't strike in week 1?"
│   ├── Turn 1: negotiations continue...
│   └── ...
│
└── Branch C: user plays as Iran from week 3 onward
    ├── Turn 1: user closes Strait differently...
    └── ...
```

**How updates work:**

1. A scheduled job (daily or triggered manually) runs focused research prompts against current news for active real-world scenarios.
2. New events are parsed into `Event` objects with impacts, escalation changes, and intel consequences.
3. The ground truth trunk is extended with verified events.
4. Actor states on the trunk are updated to reflect current reality.
5. User branches are NOT affected — they diverged at their branch point and follow their own timeline. But users can see how the real world has progressed and create new branches from the latest ground truth.

**For the class version:** the ground truth trunk for the Iran scenario is seeded using a CLI script (`scripts/seed-iran.ts`) that chains verified research events into Supabase turn_commits. Run `bun run scripts/seed-iran.ts` to create the trunk from scratch, or `bun run scripts/seed-iran.ts --from=<event_id>` to append new events incrementally without re-seeding. Seed data lives in `lib/scenarios/iran/`.

**For the post-class version:** automated daily research updates with human review before committing to the trunk.

### 13.2 Branch architecture (Git model)

The branching system is modeled directly on Git's architecture. This is the most important architectural decision for cost management and scalability.

**Core concepts:**

```
Commit    = a single resolved turn (immutable once computed)
Branch    = a sequence of commits diverging from a parent
Trunk     = the ground truth branch (real-world events)
Fork      = a user creating their own branch from any commit
HEAD      = the latest commit on a branch (current game state)
```

**Data model:**

```typescript
interface ScenarioBranch {
  id: string;
  scenarioId: string;
  parentBranchId: string | null;      // null for trunk
  forkPointCommitId: string | null;   // where this branch diverged
  name: string;                       // e.g. "What if ceasefire in week 2"
  description: string;
  createdBy: string;                  // user id
  visibility: "private" | "public";   // public = browsable by others
  headCommitId: string;               // current latest turn
}

interface TurnCommit {
  id: string;
  branchId: string;
  parentCommitId: string | null;      // previous turn (null for first)
  turnNumber: number;
  timestamp: string;                  // simulated date

  // the full resolved turn — immutable once created
  scenarioSnapshot: Scenario;         // full state at START of turn
  planningPhase: PlanningResult;
  resolutionPhase: ResolutionResult;
  reactionPhase: ReactionResult;
  judgingPhase: JudgingResult;
  narrativeEntry: string;             // chronicle text

  // metadata
  computedAt: string;                 // real-world timestamp
  computeCost: number;                // API cost in tokens
  isGroundTruth: boolean;             // true only on trunk
}
```

**Why this matters for cost:**

- Turns are immutable commits. Once computed, they are never recomputed.
- When a user branches from turn 3, they inherit turns 1-3 from the parent branch by reference (just a pointer), not by copy.
- If 100 users branch from the same turn 3, there is still only one copy of turns 1-3 in the database.
- The only new computation happens from the branch point forward.
- Branches that reach the same decision at the same state could theoretically share forward computation too (cache hit), though this is a post-class optimization.

**Branch operations:**

| Operation | What happens |
|---|---|
| Fork | Create new branch from any existing commit. Inherit all parent history by reference. |
| Play forward | Compute new turns on the branch. Each turn becomes a new commit. |
| Rewind | Move HEAD back to a previous commit on the same branch. No data is lost — forward commits still exist but are "ahead of HEAD." |
| Branch from rewind | Fork a new branch from the rewound commit. The original branch is untouched. |
| Merge (post-class) | Compare two branches that diverged from the same point. Useful for "what would have happened differently?" analysis. |

### 13.3 Community scenarios and browsing

**Public scenario library:**

Any user can create a scenario using the research pipeline. Scenarios default to private but can be published as public. Public scenarios are browsable and playable by any user.

```typescript
interface PublicScenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  createdBy: string;
  // the ground truth trunk (curated by creator)
  trunkBranchId: string;
  // community branches (created by other users)
  publicBranches: ScenarioBranch[];
  // metadata
  totalBranches: number;
  totalPlays: number;
  rating: number;
  tags: string[];
}

type ScenarioCategory =
  | "geopolitical_conflict"
  | "economic_competition"
  | "political_campaign"
  | "business_strategy"
  | "public_policy"
  | "historical_counterfactual"
  | "custom";
```

**Scenario creation wizard:**

To make it as easy as possible to create detailed scenarios, the creation flow is:

1. **Describe it**: user writes a freeform description (like the Iran analysis)
2. **Research it**: system runs the 3-part research pipeline to verify, correct, and enrich
3. **Frame it**: Stage 0 extracts the scenario frame, asks clarifying questions
4. **Populate it**: Stages 1-6 run automatically with web search
5. **Review it**: user reviews the populated scenario, corrects any errors
6. **Publish it**: user can keep it private or publish to the community

The goal is: a user with domain knowledge but no technical skills should be able to go from "I want to simulate the 2026 midterm elections" to a fully playable scenario in under 30 minutes.

### 13.4 Scenario tree visualization (post-class)

The branch history of a scenario forms a tree. A dedicated visualization shows:

- The ground truth trunk as the central spine
- Branches diverging at each decision point
- Branch length (how many turns have been played)
- Key decision labels at fork points ("What if ceasefire?" / "What if ground invasion?")
- Outcome summaries at branch tips (who "won," key final state)
- Community activity (which branches are most played / highest rated)

This tree becomes the primary way to explore "how could this have gone differently?" — both for the Iran scenario and for any community-created scenario.

---

## 14. Open questions

1. **Turn timeframe**: should turns represent fixed time periods (1 week) or variable (the AI decides how much time passes based on event cadence)?
2. **Multiplayer**: should multiple users be able to control different actors in the same scenario simultaneously? (Nice-to-have, not MVP)
3. **AI model selection**: should different agent roles use different model tiers? (Actor agents on Sonnet for speed, judge on Opus for depth?)
4. **Ground truth update frequency**: daily automated updates vs. manual curation? Automated risks introducing unverified information. Manual is more accurate but labor-intensive.
5. **Branch pruning**: should old, unvisited branches be archived to save storage? Or keep everything forever?
6. **Scenario moderation**: for the public library, how do we handle scenarios that are offensive, low quality, or designed to produce propaganda? Community reporting + manual review?
