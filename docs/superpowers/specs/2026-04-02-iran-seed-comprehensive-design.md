# Comprehensive Iran Scenario Seed — Design Spec

**Date:** 2026-04-02  
**Status:** Approved — ready for implementation planning  
**Goal:** Make the Iran scenario seed as accurate, comprehensive, and immersive as possible. Every fact temporally anchored. Every actor fully profiled. Every decision point identified. A player loading at any turn gets a complete, fog-of-war-aware account of the situation.

---

## Core Principles

1. **No text shorter than a paragraph.** Every description, biography, briefing, and chronicle entry must be substantive prose — not a one-liner. If it can't be explained in a paragraph, it isn't explained.
2. **Temporal anchoring is non-negotiable.** Every fact is pinned to a specific date or period. Post-war developments (after Feb 28, 2026) must not contaminate initial state values for turns that precede them. Branching players inherit a clean pre-branch world.
3. **No RAG.** The research corpus is small enough (~920 lines) to inject directly into AI prompts. Vector retrieval adds latency and infrastructure complexity for no meaningful gain at this scale.
4. **Static identity, dynamic state.** Actor personalities, historical precedents, and strategic doctrine never change. What changes is their capability scores, relationships, and asset status as events accumulate. Anthropic prompt caching applies to the static layer.
5. **Decision points drive the branch tree.** The ground truth trunk has a node at every moment where an actor made a choice that could have gone differently. These are the branching opportunities. Consequence events (oil prices rising, civilian casualties) are not decision points.
6. **Context chain, not full history.** AI agents receive: background context + 1-paragraph summaries of all prior turns + full briefing of the immediately preceding turn. This keeps context bounded regardless of simulation length, and branches accumulate their own diverging summary chains.

---

## What We Are NOT Doing

- No RAG / pgvector — direct injection is sufficient and simpler
- Not extending the timeline before Feb 2026 as navigable turns — Phase 1 (June 2025 nuclear strikes) and earlier history lives as background context text, not turn commits
- Not researching post-Feb-28-2026 relationship dynamics as initial state — Gulf state deterioration, Mojtaba's post-succession behavior, and other post-war developments are consequences of events, not starting conditions

---

## Section 1: Data Model Changes

### New Migration
`supabase/migrations/20260402000000_comprehensive_seed_schema.sql`

Extends existing schema without modifying committed migrations.

---

### New Table: `actors`

Actors currently live as JSONB inside `turn_commits.scenario_snapshot`. This makes them unqueryable, impossible to display without deserializing the full snapshot, and unable to be updated independently. They need proper rows.

```sql
create table actors (
  id                    text not null,
  scenario_id           uuid not null references scenarios(id) on delete cascade,
  name                  text not null,
  short_name            text not null,

  -- Static identity layer (never changes — cacheable as AI system prompt prefix)
  biographical_summary  text not null,  -- 2-3 paragraphs: country strategic culture,
                                        -- historical motivations, how they make decisions
                                        -- at the national level across decades
  leadership_profile    text not null,  -- Current leader(s): full biography, MO,
                                        -- past decisions that define current behavior,
                                        -- how they are specifically processing THIS conflict.
                                        -- For Mojtaba: explicit about known vs. inferred.
                                        -- For Trump: JCPOA withdrawal, Soleimani, 21% support
                                        -- constraint all named.
  win_condition         text not null,  -- Full paragraph. Not a one-liner.
  strategic_doctrine    text not null,  -- Risk tolerance, escalation ladder preferences,
                                        -- override conditions (when political motivation
                                        -- beats strategic logic — e.g. Trump launching war
                                        -- at 21% public support), red lines
  historical_precedents text not null,  -- 3-5 decisions that most define this actor's
                                        -- behavior going forward

  -- Initial dynamic state (seeded here, changes per turn via scenario_snapshot)
  initial_scores        jsonb not null, -- {militaryStrength, politicalStability,
                                        --  economicHealth, publicSupport,
                                        --  internationalStanding, escalationRung}
  intelligence_profile  jsonb not null, -- {signalCapability, humanCapability,
                                        --  cyberCapability, blindSpots[],
                                        --  intelSharingPartners[]}

  primary key (id, scenario_id)
);
```

**Actors to seed:** `united_states`, `iran`, `israel`, `russia`, `china`, `gulf_states`

---

### New Table: `key_figures`

Key figures currently live as arrays inside the actor's initial state. They need independent rows for display, update, and querying — especially critical since Mojtaba Khamenei has no track record and his profile will require revision as the simulation develops.

```sql
create table key_figures (
  id               text not null,
  scenario_id      uuid not null references scenarios(id) on delete cascade,
  actor_id         text not null,

  name             text not null,
  title            text not null,
  role             text not null,  -- 'supreme_leader' | 'president' | 'military_commander' | etc.

  -- All fields are full paragraphs, never sentences
  biography        text not null,  -- Who they are, how they got here, what shaped them.
                                   -- Mojtaba: inferred from father's ideology + IRGC
                                   -- relationships + known background. Explicit about gaps.
  motivations      text not null,  -- What they personally want from this conflict —
                                   -- distinct from what their country wants.
                                   -- Netanyahu: permanent Iran incapacitation, not ceasefire.
                                   -- Trump: a win that doesn't become a quagmire.
  decision_style   text not null,  -- How they process decisions: instinct vs. process,
                                   -- who they listen to, what they fear, when political
                                   -- motivation overrides strategic logic
  current_context  text not null,  -- How they are processing THIS specific situation
                                   -- as of February 2026. The most important field.
                                   -- Mojtaba: legitimacy deficit, IRGC dependency,
                                   -- can't be seen as soft.
                                   -- Trump: needs a win, uncomfortable with open-ended
                                   -- commitments, susceptible to Netanyahu framing.

  -- Inter-figure relationships (JSONB for flexibility)
  relationships    jsonb,          -- [{figureId, actorId, description, influence_direction,
                                   --   dynamic, documented_instances[]}]
                                   -- See Netanyahu-Trump relationship below.

  provenance       text not null default 'inferred',
  source_note      text,
  source_date      text,

  primary key (id, scenario_id)
);
```

#### Netanyahu-Trump Relationship (special case)

This relationship requires explicit treatment because it represents a documented asymmetric influence dynamic that directly affects decision generation. Netanyahu can consistently leverage Trump's pro-Israel instincts to override stated US strategic interests — including bombing potential diplomatic back-channels to prevent peace, and maximizing escalation when de-escalation would better serve US goals.

The `relationships` field for Netanyahu should include:

```json
{
  "figureId": "trump",
  "actorId": "united_states",
  "influence_direction": "netanyahu_over_trump",
  "dynamic": "Netanyahu frames every decision in terms of Trump's personal legacy and strength narrative. Trump processes Israeli intelligence more readily than CIA assessments when they conflict. Netanyahu has exploited this consistently to advance Israeli maximalist objectives at the cost of US strategic interests.",
  "documented_instances": [
    "Netanyahu lobbied Trump for Soleimani authorization",
    "Bombing of Iranian diplomatic back-channel figures to prevent ceasefire negotiations",
    "Maximizing escalation scope beyond what US military planners recommended",
    "Settlement expansion authorized over State Department objections"
  ],
  "override_condition": "Trump will follow Netanyahu's lead UNLESS the domestic political cost becomes visible and personal — specifically if US casualties mount publicly or if the economic impact (Hormuz closure, oil prices) threatens his coalition directly."
}
```

This gets injected into both actors' agent prompts so the AI correctly models this dynamic when generating decisions.

**Research prompt for this relationship:**

> "Document the Netanyahu-Trump relationship dynamic as of early 2026 with specific verified examples. Include: (1) documented instances where Netanyahu influenced Trump to take actions against stated US strategic interests, (2) the psychological mechanisms Netanyahu uses — how he frames requests in terms of Trump's personal strength narrative and legacy, (3) specific cases in the current conflict where this dynamic is visible, (4) what the limits of this influence are — what would cause Trump to push back against Netanyahu's preferences. Cite specific events, statements, or reporting. Anchor to January 2026 — do not include post-February 28 developments."

---

### New Table: `actor_capabilities`

The national capabilities inventory — everything an actor has available beyond what's in `asset_registry`. Answers "what cards does Trump hold that he hasn't played yet" and "what can Iran do that isn't currently deployed in theater."

```sql
create table actor_capabilities (
  id               uuid primary key default gen_random_uuid(),
  scenario_id      uuid not null references scenarios(id) on delete cascade,
  actor_id         text not null,

  category         text not null,  -- 'military' | 'diplomatic' | 'economic' | 'intelligence'
  name             text not null,  -- 'US Army Active Duty', 'Strategic Petroleum Reserve',
                                   -- 'UN Security Council Veto', 'Hormuz Mining Capability'
  description      text not null,  -- Full paragraph: what this is, current status,
                                   -- how it would be used, any degradation from prior events,
                                   -- constraints on use
  quantity         numeric,
  unit             text,           -- 'personnel', 'barrels', 'warheads', 'votes'

  deployment_status text not null default 'available',
  lead_time_days   int,            -- 0 (ICBM), 18 (82nd Airborne), 90 (full Army mobilization)
  political_cost   text,           -- Full sentence: "Requires Congressional AUMF",
                                   -- "Politically toxic at 21% public support",
                                   -- "Would trigger Chinese economic retaliation"
  temporal_anchor  text not null,  -- 'January 2026' — explicit temporal pin
  source_url       text,
  source_date      text
);
```

**Distinct from `asset_registry`:**
- `asset_registry` = theater-level positioned assets (CVN-72 in Arabian Sea, Fordow enrichment facility)
- `actor_capabilities` = full national inventory available for mobilization (1.34M US active duty, Iran's 3,000+ ballistic missile stockpile, US Strategic Petroleum Reserve)

---

### Changes to `turn_commits`

```sql
alter table turn_commits
  -- Content fields (replaces the current one-liner narrative_entry)
  add column full_briefing          text,    -- Pre-turn 3-section intelligence brief:
                                             -- SITUATION / ACTOR PERSPECTIVES / CONTEXT
                                             -- Fog-of-war filtered in actor mode
  add column chronicle_headline     text,    -- "Iran Retaliates: 40 Ballistic Missiles
                                             --  Strike Israeli Population Centers"
                                             -- Sharp, newspaper-style. ChroniclePanel list view.
  add column chronicle_entry        text,    -- 3-4 paragraph post-turn narrative account:
                                             -- Para 1: what happened (specific assets, figures named)
                                             -- Para 2: human dimension (civilian impact, casualties)
                                             -- Para 3: economic/diplomatic consequences
                                             -- Para 4: what it means going forward
  add column chronicle_date_label   text,    -- "Day 3 of Operation Epic Fury — March 2, 2026"

  -- Context chain
  add column context_summary        text,    -- 1-paragraph compressed summary of this turn.
                                             -- Fed forward as context chain input to future turns.
                                             -- Per-branch — diverging branches have different summaries.

  -- Decision point fields
  add column is_decision_point      boolean not null default false,
  add column deciding_actor_id      text,
  add column decision_summary       text,    -- "Trump authorized Operation Epic Fury"
  add column decision_alternatives  jsonb,   -- [{label, description, escalation_direction,
                                             --   escalation_level, why_not_chosen}]
                                             -- why_not_chosen uses actor psychology to explain
                                             -- why the ground truth path was taken

  -- Escalation ladder tracking
  add column escalation_rung_before int,
  add column escalation_rung_after  int,
  add column escalation_direction   text;    -- 'up' | 'down' | 'lateral' | 'none'
```

**Full content per turn_commit:**

| Field | When generated | Purpose |
|---|---|---|
| `full_briefing` | Enrichment pipeline | Pre-turn intel brief shown to player |
| `chronicle_headline` | Enrichment pipeline | ChroniclePanel list headline |
| `chronicle_entry` | Enrichment pipeline | Post-turn narrative (3-4 paragraphs) |
| `chronicle_date_label` | Enrichment pipeline | Display timestamp |
| `context_summary` | Enrichment pipeline | 1-para compressed input for context chain |
| `is_decision_point` | Enrichment pipeline | Is this a branching opportunity? |
| `deciding_actor_id` | Enrichment pipeline | Who made the choice |
| `decision_summary` | Enrichment pipeline | What they chose |
| `decision_alternatives` | Enrichment pipeline | 2-3 alternatives with why_not_chosen |
| `escalation_rung_before/after` | Enrichment pipeline | Escalation ladder tracking |
| `escalation_direction` | Enrichment pipeline | Up / down / lateral / none |

---

### Changes to `scenarios`

```sql
alter table scenarios
  add column background_context_enriched  text,  -- Full multi-paragraph background.
                                                  -- Phase 1 (June 2025 nuclear strikes),
                                                  -- Oct 2024 Iranian missile attacks,
                                                  -- JCPOA collapse, deeper historical roots.
                                                  -- Anchored: "as of February 1, 2026"
                                                  -- This is the static prefix of the context chain.
  add column scenario_start_date          text,  -- '2026-02-06'
  add column ground_truth_through_date    text;  -- '2026-03-19' (updates as new events are seeded)
```

---

## Section 2: Timeline Extraction and Enrichment Pipeline

Four phases. Nothing writes to Supabase until Phase 4 completes. All intermediate output saved to local JSON files for inspection and correction.

---

### Phase 1: Timeline Extraction (automated)

**Script:** `scripts/extract-timeline.ts`

Sends each research doc to Claude with a narrow extraction instruction — no synthesis, no interpretation, just structured event extraction:

```
You are extracting a chronological event list from a research document.

For every event, decision, or state change that can be anchored to a specific
date or period, output:
{
  "timestamp": "2026-02-28",
  "timestamp_confidence": "exact" | "approximate" | "period",
  "title": "...",
  "description": "...",         // everything the doc says about this event
  "actors_involved": [...],
  "dimension": "military" | "diplomatic" | "economic" | "intelligence",
  "is_decision": true,
  "deciding_actor": "...",
  "escalation_direction": "up" | "down" | "lateral" | "none",
  "source_excerpt": "..."       // exact quote from the doc supporting this
}

Output ONLY a JSON array. No prose. Strict chronological order.
Do NOT include facts with no temporal anchor.
```

Run against: `research-military.md`, `research-political.md`, `research-economic.md`

Merge outputs with existing 20 events. Flag (don't auto-resolve) duplicates for human review. Expected output: **60–100 events** covering Feb 6 → Mar 19, 2026.

**Output:** `data/iran-timeline-raw.json`

**Review pass (20–30 min):** Scan only for temporal contamination. Flag any event with `timestamp_confidence: "period"` spanning the Feb 28 war start. Correct timestamps or mark `"exclude": true`. Do not validate every fact — only check temporal anchoring.

---

### Phase 2: Capabilities Research (5 calls, user runs)

**Template prompt:**

```
You are building a capabilities inventory for a geopolitical simulation.
Actor: [ACTOR NAME]

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

For each capability output:
{
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH — current status, how it would be used
                   in Iran conflict, constraints and limitations]",
  "quantity": [number],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "[sentence on constraints]",
  "temporal_anchor": "January 2026",
  "source": "..."
}

Cover: military (full order of battle, NOT just theater assets), diplomatic
tools, economic leverage, intelligence capabilities.
Include capabilities NOT yet deployed to theater.
Flag anything degraded by pre-February-2026 events.
```

**Five calls to run:**
1. United States
2. Iran — add: *"Iran's air defense was partially degraded in October 2024 Israeli strikes. Note affected capabilities and assessed recovery status by January 2026."*
3. Israel
4. Russia + China (combined — their role is indirect support, not direct participation)
5. Gulf States (Saudi Arabia, UAE, Qatar — combined)

**Output:** `data/capabilities-us.json`, `data/capabilities-iran.json`, etc.

---

### Phase 3: Actor and Key Figure Profile Generation (automated)

**Script:** `scripts/generate-profiles.ts`

Generates static actor profiles and key figure biographies before event enrichment runs. These become the cached system prompt prefix for all AI agent calls during gameplay.

**Per actor (one API call):**
- Input: relevant research doc sections + capabilities JSON from Phase 2 + key figure list
- Output: `biographical_summary`, `leadership_profile`, `win_condition`, `strategic_doctrine`, `historical_precedents`

**Per key figure (one API call each):**
- Input: actor profile + research doc sections mentioning this figure
- Output: `biography`, `motivations`, `decision_style`, `current_context`, `relationships`

**Key figures requiring full treatment:**

*United States:* Trump, Rubio, Hegseth (SecDef), CENTCOM commander  
*Iran:* Mojtaba Khamenei (explicit about inferred vs. known), Pezeshkian, Araghchi, Hajizadeh (IRGC Aerospace), Qaani (Quds Force)  
*Israel:* Netanyahu, Gallant (if still Defense Minister), IDF Chief of Staff  
*Russia:* Putin  
*China:* Xi Jinping  
*Gulf States:* MBS (Saudi), MBZ (UAE)

**Netanyahu-Trump relationship:** Generate explicitly using the research prompt in Section 1. Store in both figures' `relationships` JSONB field.

**Output:** `data/actor-profiles.json`, `data/key-figures.json`

---

### Phase 4: Event Enrichment Pipeline (automated)

**Script:** `scripts/enrich-timeline.ts`

Processes events in strict chronological order. Context chain threads forward — each call's `context_summary` output feeds into the next call's input. Saves output after each event (resumable if interrupted).

**Input per event:**

```typescript
interface EnrichmentContext {
  event: TimelineEvent
  actorState: ScenarioState        // cumulative state after applyEventImpact
  actorProfiles: ActorProfile[]    // static, same for every call — cache candidate
  researchSection: string          // relevant doc section for event's dimension
  contextChain: {
    background: string             // scenario background context
    summaries: string[]            // 1-para summaries of all prior events (bounded)
  }
}
```

**Output per event (single structured API call):**

```json
{
  "full_briefing": {
    "situation": "...",
    "actor_perspectives": {
      "us": "...",
      "iran": "...",
      "israel": "..."
    },
    "context": "..."
  },
  "chronicle": {
    "headline": "...",
    "date_label": "...",
    "entry": "..."
  },
  "context_summary": "...",
  "decision_analysis": {
    "is_decision_point": true,
    "deciding_actor_id": "...",
    "decision_summary": "...",
    "alternatives": [
      {
        "label": "...",
        "description": "...",
        "escalation_direction": "...",
        "escalation_level": 4,
        "why_not_chosen": "..."
      }
    ]
  },
  "escalation": {
    "rung_before": 4,
    "rung_after": 8,
    "direction": "up"
  }
}
```

**Quality review checkpoint:** After events 1–10 are enriched, pause and review output before continuing. Check: Are briefings paragraph-depth? Is the context section actually using prior summaries? Are decision alternatives plausible? Is fog-of-war correctly applied in actor perspectives? If quality is good, run the full batch. If not, adjust prompts and re-run the first 10.

**Context chain bounds:** Background context (~500 tokens) + up to 70 summaries at ~80 tokens each (~5,600 tokens) + 1 full briefing (~1,500 tokens) = ~7,600 tokens of context per call. Well within budget regardless of timeline length.

**Output:** `data/iran-enriched.json`

---

### Pipeline Flow

```
research-military.md  ─┐
research-political.md  ─┼──► Phase 1: extract-timeline.ts
research-economic.md  ─┘         │
                                  ▼
                         iran-timeline-raw.json
                         [REVIEW: temporal anchoring]
                                  │
capabilities-[actor].json ────────┼──► Phase 3: generate-profiles.ts
(user runs 5 calls)               │         │
                                  │         ▼
                                  │    actor-profiles.json
                                  │    key-figures.json
                                  │         │
                                  └────┬────┘
                                       ▼
                              Phase 4: enrich-timeline.ts
                              [REVIEW checkpoint: events 1-10]
                                       │
                                       ▼
                               iran-enriched.json
                                       │
                                       ▼
                          Updated seed-iran.ts → Supabase
```

---

## Section 3: Identified Decision Points (Feb 6 → Mar 19)

These are the turns where at least one actor made a choice that could have gone differently. Non-exhaustive — the enrichment pipeline will identify additional granular decision points from the full 60–100 event timeline.

**Major decision points:**

1. **Feb 6** — US choice to engage Oman back-channel (vs. refuse diplomatic contact)
2. **Feb 6** — Iran's choice to offer enriched uranium transfer (vs. stonewall negotiations)
3. **Feb 28** — Trump authorizes Operation Epic Fury (THE pivotal node — entire tree branches here)
4. **Feb 28** — Netanyahu launches simultaneous Lebanon operation (vs. Iran-only)
5. **Feb 28/Mar 1** — US/Israel decision to target Khamenei directly (vs. nuclear sites only)
6. **Mar 1** — Iran chooses ballistic missile retaliation (vs. absorb and negotiate)
7. **Early Mar** — Iran invokes Hormuz closure (vs. keep strait open as leverage)
8. **Early Mar** — Iran selective Hormuz passage policy: friendly ships pass paying yuan (vs. full closure or full opening — marks economic escalation + petrodollar challenge)
9. **Mar (ongoing)** — Iran bombing Gulf state infrastructure in retaliation for US base use
10. **Post-succession** — Mojtaba chooses to continue war (vs. seek ceasefire as legitimacy move)
11. **Mar (ongoing)** — Gulf states choose neutrality (vs. open alignment with US or Iran)
12. **Mar (ongoing)** — Netanyahu bombs Iranian diplomatic back-channel figures (vs. allowing negotiations — documents the Netanyahu-Trump override dynamic in action)

**Escalation ladder mapping:**

The Hormuz yuan policy and Gulf state infrastructure attacks are particularly important — they represent escalation on the economic dimension (not just military), and they mark points where the conflict moved from bilateral US/Israel-Iran to a regional and global economic crisis.

---

## Section 4: Ongoing Update Process

As the real-world situation develops, the ground truth trunk gets extended:

1. **New research arrives** — add doc to `docs/Iran Research/` or run a structured extraction call
2. **Timeline extraction** — run `extract-timeline.ts` with `--from=2026-03-19` to extract only new events
3. **Review pass** — check temporal anchoring for new events only
4. **Enrichment** — run `enrich-timeline.ts --from=lastSeededEventId`
5. **Seed append** — run `seed-iran.ts --from=lastSeededEventId`

The `--from=` flag already exists on the seed script. The `context_summary` of the current head commit becomes the starting point for the new context chain tail — the enrichment script fetches it from Supabase rather than recomputing from scratch.

**Cadence:** Update when significant verified events occur — not on a fixed schedule. The ground truth trunk should only contain verified events, never speculation about what might happen.

---

## Section 5: Research Prompts Reference

### Capabilities inventory (run 5 times, temporally anchored to Jan 2026)

```
You are building a capabilities inventory for a geopolitical simulation.
Actor: [ACTOR NAME]

TEMPORAL ANCHOR: Answer as of January 2026 ONLY.
Do NOT reference events after February 1, 2026.
Do NOT reference Operation Epic Fury or the 2026 Iran War.

For each capability output:
{
  "category": "military" | "diplomatic" | "economic" | "intelligence",
  "name": "...",
  "description": "[FULL PARAGRAPH]",
  "quantity": [number],
  "unit": "...",
  "deployment_status": "available" | "partially_deployed" | "degraded",
  "lead_time_days": [number],
  "political_cost": "...",
  "temporal_anchor": "January 2026",
  "source": "..."
}
```

Add to Iran call: *"Iran's air defense was partially degraded in October 2024 Israeli strikes. Note affected capabilities and assessed recovery status by January 2026."*

### Netanyahu-Trump relationship dynamic

```
Document the Netanyahu-Trump relationship dynamic as of early 2026 with specific
verified examples. Include: (1) documented instances where Netanyahu influenced
Trump to take actions against stated US strategic interests, (2) the psychological
mechanisms Netanyahu uses to frame requests in terms of Trump's personal strength
narrative and legacy, (3) specific cases in the current conflict where this dynamic
is visible, (4) what the limits of this influence are — what would cause Trump to
push back. Cite specific events, statements, or reporting. Anchor to January 2026
— do not include post-February 28 developments.
```

---

## Implementation Notes

### Files to create/modify

| File | Action |
|---|---|
| `supabase/migrations/20260402000000_comprehensive_seed_schema.sql` | New migration |
| `scripts/extract-timeline.ts` | New — Phase 1 extraction |
| `scripts/generate-profiles.ts` | New — Phase 3 actor/figure profiles |
| `scripts/enrich-timeline.ts` | New — Phase 4 enrichment pipeline |
| `scripts/seed-iran.ts` | Modify — populate new tables, use enriched data |
| `lib/types/simulation.ts` | Extend Actor, KeyFigure with new fields |
| `lib/types/database.ts` | Add new table types |
| `data/` | New directory for intermediate JSON artifacts |

### Actor agent context structure (runtime)

When the actor agent runs for turn N:

```
[System prompt — cached]
  Actor biographical_summary
  Actor leadership_profile  
  Actor strategic_doctrine
  Actor historical_precedents
  Key figures biographies + motivations + decision_style
  Key figure relationships (including Netanyahu-Trump dynamic)
  Actor capabilities inventory

[User message — fresh each turn]
  Current actor scores (from scenario_snapshot)
  Current asset status (from asset_registry)
  Context chain:
    background_context_enriched (from scenarios table)
    context_summary[0..N-2] (prior turn summaries)
    full_briefing[N-1] (immediately preceding turn, full detail)
```

The system prompt prefix is identical across turns and branches — prime candidate for Anthropic's prompt caching (beta cache_control parameter). Only the user message changes per turn.

### Fog-of-war application

The `full_briefing` ACTOR PERSPECTIVES section is generated with fog-of-war awareness built in — each actor's perspective reflects only what they know/believe, not ground truth. The `chronicle_entry` is omniscient by default; when serving to a playing actor, the API filters it through `buildFogOfWarContext` before returning.

### Branching and context chain divergence

When a player branches at turn K:
- Turns 0..K-1 summaries are identical to trunk
- Turn K is the branch point — player makes a different decision
- Turn K's new `context_summary` reflects the player's choice, not the ground truth
- All subsequent turns in the branch accumulate their own diverging summary chain
- The branch tree visually shows where the summary chain diverged from trunk

---

*Spec complete. Next step: invoke writing-plans skill to create implementation plan.*
