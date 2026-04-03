# Game View Design — The Shifting Desk

**Date:** 2026-03-30
**Status:** Draft
**Depends on:** Stitch design system (`docs/strategos-design-system.md`), frontend-design.md

---

## 1. Design Pillars

| Pillar | Description |
|---|---|
| **Narrative weight** | Consequences are told as story, not stat changes. The chronicle reads like serious war correspondence. |
| **Impossible choices** | Every decision has real costs. No clearly right answer. Players sacrifice something every turn. |
| **Suzerain emotional wrapper, strategy game mechanical core** | You *feel* like you're in Suzerain (reading briefings, making heavy choices). You *think* like you're in a strategy game (assessing the map, weighing escalation trade-offs). |
| **Serious analytical tone** | Educational simulation, not war game. Consequences, not victories. No celebration mechanics. |
| **Variable pacing** | Quick if you trust your gut, deep if you want to analyze. Player-driven, not system-driven. |

---

## 2. The Two Modes

The game blends two modes that correspond to different *activities*, not different themes. Both use the Stitch dark system.

| Mode | Activity | Layout | Feel |
|---|---|---|---|
| **Narrative** | Reading briefings, making decisions, reading chronicles | Main panel dominant (65%), side context (35%) | Serif prose, advisor voices, documents |
| **Strategic** | Watching resolution, assessing the board, planning ahead | Map dominant (60%), data panel (40%) | Map overlays, data grids, terminal dispatch |

The layout shifts per phase. The theme stays consistent (Stitch dark). The distinction is **typography and content density**, not color.

---

## 3. Player Journey

### Step 0: Scenario Selection

Player picks a scenario (e.g., Iran conflict). Chooses role:
- "Play as United States" / "Play as Iran" / "Observer Mode"

Context card with analytical disclaimer:
> *"This simulation models ongoing events using publicly available information. It is designed for analytical and educational purposes. All actors' perspectives are represented with equal rigor."*

### Step 1: Orientation (2-3 minutes, first time only)

Four interactive steps, not a text wall:
1. **The Rhythm of War** — 4-beat turn structure (Briefing → Decide → Resolution → Overview)
2. **The Escalation Ladder** — visual ladder with current position highlighted
3. **The Fog of War** — side-by-side: what you believe vs. reality (reality hidden in player mode)
4. **"You Are the President"** — sets the scene (date, situation), shows the nuclear cascade alert preview, then drops you into the first briefing

Skippable. Does not reappear after first session.

### Step 2: The Turn Rhythm (repeats)

```
BRIEFING (read) → DECIDE (choose) → RESOLUTION (watch) → OVERVIEW (assess)
     ^                                                          |
     +----------------------------------------------------------+
```

Each phase has its own layout (see Section 4).

### Step 3: Complexity Arc

- **Turns 1-3:** Simpler decisions, 3 advisor recommendations, no multi-action plans. Teaching the system.
- **Turns 4-8:** Full complexity. Multi-action TurnPlans available. Cascades forming. Allies wavering.
- **Turns 9-12:** Highest stakes. Every choice feels final.

### Step 4: Session End

No "YOU WIN" screen. A **Presidential Daily Brief** — narrative summary of your leadership. Escalation path visualization. Advisor trust tracker. Sober reckoning.

---

## 4. Phase Layouts — The Shifting Desk

### Phase 1: Briefing — "What Just Happened"

**Layout:** Narrative 65% | Side context 35%
**Purpose:** Player reads what happened last turn through advisor voices and prose.

**Main panel content (top to bottom):**
1. **Document ID header** — `INTELLIGENCE BRIEFING // TURN 04 // 22 MARCH 2026 // SECRET` (font-mono, text-tertiary)
2. **Situation prose** — 2-3 paragraphs in Newsreader serif. Key numbers bolded (text-primary). Framed with left border (gold-border).
3. **Cascade alert** (conditional) — red alert box when a constraint cascade is forming. Shows which constraints removed, which remain, and the ultimate risk.
4. **Advisor section** — section divider: "Your Advisors"

**Advisor cards:**
- Left border colored by advisor's domain (actor-us for Defense, status-info for State, gold for Intel)
- **Portrait:** circle with initials, colored border ring matching domain. 44px.
- **Name** in Space Grotesk bold, uppercase
- **Role** in IBM Plex Mono, text-tertiary
- **Mood tag** — small badge next to name: "Hawkish" / "Cautious" / "Concerned" / "Frustrated" / "Sidelined". Color-coded. Changes across turns based on whether player followed their advice.
- **Quote** in Newsreader serif — the advisor speaks in character, with key data bolded
- **Recommendation line** — gold text: "Recommends: [action name]"

**Side panel content:**
1. Mini map (dark, `bg-base`) — actor positions, strait status, key labels. Provides spatial context without competing for attention.
2. "Your Position" metrics — air defense %, domestic support %, readiness %, nuclear window, oil price. Progress bars with status colors.
3. Actor positions — list with colored dots, names (Space Grotesk), escalation rung (IBM Plex Mono).
4. Global state — oil price, strait status, stability index.

**Proceed button** at bottom of main panel → transitions to Decide phase.

### Phase 2: Decide — "What Will You Do?"

**Layout:** Decisions 60% | Side context 40%
**Purpose:** Player chooses their action. Narrative-lead with analyst view on demand.

**Progressive disclosure (3 layers):**

**Layer 1 — Advisor Recommendations (default):**
3 prioritized decision cards, each containing:
- Priority tag (font-mono): "PRIORITY 1 — CRITICAL"
- Advisor portrait (small, 38px) with initials
- Decision title (Space Grotesk bold, 17px)
- Narrative rationale (Newsreader serif) — 2-3 sentences explaining why this matters, what the costs are. Key trade-offs bolded.
- Dimension + escalation direction badges

Click a card → gold border highlight, selected state.

Below the 3 recommendations:
- "Browse All 10 Available Decisions →" — opens Layer 2
- "Advanced: Build multi-action TurnPlan →" — opens Layer 3

**Layer 2 — Full Decision Catalog (slide-over panel):**
All 8-12+ decisions grouped by dimension with section dividers (Military, Diplomatic, Economic, Intelligence, Political). Each shows title + escalation/dimension badges + resource weight.

Click any decision → opens decision detail with:
- Strategic rationale (Newsreader)
- Parameter profiles as cards ("Surgical" / "Overwhelming" / "Covert")
- Cost breakdown per profile
- Projected outcomes per profile
- Anticipated responses from other actors
- Constraint violations
- Intelligence gap warnings
- Overall assessment

**Layer 3 — Advanced TurnPlan Builder:**
- Primary action slot (required)
- Concurrent action slots (0-3)
- Resource allocation sliders (sum to 100%)
- Validation: compatibility checks, synergy highlights, tension warnings

**Submit bar** at bottom: selected action display, Submit button, "+ Supporting Action" ghost button.

**Side panel:** Same as Briefing but labeled "Key Numbers" — focused metrics relevant to the decision.

### Phase 3: Resolution — "What Happened"

Two sequential beats. Full-width for both.

**Beat 1: Dispatch Terminal**

**Layout:** Terminal 60% | Live Map 40%
**Duration:** 10-15 seconds of staged reveals.

Terminal:
- `--bg-surface-dim` (#131313) background for recessed monitor feel
- Header: `━━━ GEOSIM RESOLUTION ENGINE // TURN 04 ━━━` (font-mono, text-tertiary)
- Lines stamp in sequentially (opacity 0 → 1, staggered by 400-600ms)
- Color coding: default (text-secondary), critical (status-critical), confirmed (gold), info (status-info)
- Blinking cursor (`--gold` color, amber) while processing. Disappears on completion.

Live map alongside terminal:
- Coordinate grid with lat/long labels (font-mono, very low opacity)
- **Drone swarm arcs** animate from Iran toward Israel when drone wave line appears
- **Strike flashes** pulse at IRGC targets when air campaign line appears
- **USS Champion blinks and fades** when mine strike line appears (opacity 1 → dashed border, 0.1 opacity)
- **Oil price chip updates** when economic cascade line appears
- Map tells the same story the terminal is typing — visual + textual reinforcement

After final line → "Read Chronicle →" button appears.

**Beat 2: Chronicle Narrative**

**Layout:** Full width, centered (max-width 660px)
**Purpose:** The Suzerain moment. You read what your decision caused.

Structure:
- Document ID header (font-mono, text-tertiary)
- Severity indicator (colored dot + date)
- Title (Space Grotesk bold, 26-28px, uppercase)
- **Narrative prose** (Newsreader, 17px, line-height 1.85 — intentionally larger than the standard 15px/1.75 to maximize narrative weight during this critical moment) — 3-5 paragraphs of literary war correspondence. Actor names bolded (text-primary, font-weight 500). Specific numbers, costs, and human details woven in.
- Tags row (dimension/event badges)
- Expandable section: judge scores, escalation changes, state deltas

**Narrative standards:**
- Equal narrative weight to all actors (neutrality principle)
- Human cost acknowledged, never trivialized
- No editorializing about who is "right"
- Specific numbers that tell a story (cost asymmetries, casualty counts, oil price movements)

"Continue to Overview →" button at bottom.

### Phase 4: Overview — "Assess the Board"

**Layout:** Map 60% | Strategy panel 40%
**Purpose:** Strategy game moment. Think about next turn.

Map (dominant):
- Full theater view with coordinate grid
- Actor positions with pulsing dots for active operations
- Annotation boxes on key features (Kharg Island status, Ras Tanura damage, mine threat)
- Strait marker (dashed, status-critical)
- Floating metric chips (oil price, air defense %, world oil transit %)
- Damage accumulation visible — facilities change state across turns

Strategy panel:
- Brief narrative summary (Newsreader, 2 sentences)
- Actor positions with escalation rungs
- "Your Position" metrics with delta from last turn (e.g., "38% (was 42%)")
- Escalation ladder visualization (horizontal bar, current rung highlighted)
- Escalation watch: cascade status, next trigger

Footer: "Next Turn Briefing →" (primary), "Chronicle" (ghost), "Rewind" (ghost).

---

## 5. Advisor System

### Advisor Roster (per actor)

Each playable actor has 3 advisors representing different perspectives:

**US advisors:**
| Advisor | Domain | Default disposition |
|---|---|---|
| Secretary of Defense | Military | Hawkish |
| State Department / Ambassador | Diplomatic | Cautious / seeks off-ramps |
| CIA Director | Intelligence | Concerned / data-driven |

### Advisor Portraits

Circle with initials, 44px (briefing) or 38px (decision cards). Colored border ring matching their domain color. The initials use Space Grotesk bold.

Future enhancement: stylized silhouette illustrations or minimalist line-art. For MVP, initials with colored rings.

### Mood Tags

Small badge next to advisor name. Changes across turns:

| Tag | Meaning | Color |
|---|---|---|
| Hawkish | Favors escalation | status-critical-bg |
| Cautious | Favors restraint | status-info-bg |
| Concerned | Worried about specific threat | gold-dim |
| Frustrated | Advice repeatedly ignored | status-warning-bg |
| Sidelined | Ignored 3+ turns in a row | `--bg-surface-high`, `--text-tertiary` |
| Trusted | Advice followed regularly | status-stable-bg |

### Advisor Trust Tracking

Track per-advisor whether player followed their recommendation each turn. Affects:
- Mood tag evolution (ignored advisors become Frustrated → Sidelined)
- Displayed in session summary
- Future: could affect quality of intelligence/advice from that advisor

---

## 6. Map Integration

### Map Responsibilities by Phase

| Phase | Map role | Size | Features |
|---|---|---|---|
| Briefing | Spatial context | 35% side | Actor positions, strait status, basic labels |
| Decide | Theater context | 40% side | Same as briefing. Future: highlight zones on decision hover |
| Resolution | Live storytelling | 40% alongside terminal | Animated: drone arcs, strike flashes, ship events, oil updates |
| Overview | Strategic assessment | 60% dominant | Full annotations, damage states, metric chips, coordinate grid |

### Map Elements

**Always present:**
- Country/region labels (font-mono, low opacity)
- Actor position dots (colored, pulsing for active ops)
- Strait of Hormuz marker (dashed line, status-critical when blocked)

**Resolution phase animations:**
- Drone swarm arcs: thin lines from Iran toward Israel, gradient from transparent to actor-iran
- Strike flashes: radial gradient pulse at target, fades over 1.2s
- Ship events: targeted dot blinks and fades to dashed/low opacity
- Oil price chip: textContent updates when economic cascade triggers
- Friendly fire: brief flash at the friendly unit position

**Overview phase annotations:**
- Facility status boxes (name, status, significance)
- Mine threat assessment at Strait
- Floating metric chips at screen edges
- Damage accumulation (facilities degrade visually across turns)

### Map Technology

MVP: SVG-based map component with positioned elements. Matches the existing mockup approach in `all-ui-mockups.html`.

Tier 2 (post-MVP): Mapbox GL JS integration with custom style matching Stitch tokens.

---

## 7. Session Summary — Presidential Daily Brief

Appears at session end or on demand. Full-width centered paper-style layout.

**Content:**

1. **Header:** "End of Session Report" (Space Grotesk bold). Sub-line with scenario, turns played, role.

2. **Stat grid** (3x2):
   - Escalations (count)
   - De-escalations (count)
   - Casualties (total)
   - War cost (USD)
   - Oil price (final)
   - Approval rating (final)

3. **Escalation path visualization:** horizontal node chain showing your rung each turn. Gold for current, connected by lines.

4. **Narrative assessment** (Newsreader serif): 2-3 paragraphs summarizing what happened under player's leadership. Sober, analytical. Ends with a line about the future: *"The war you inherited has no clean exit. The choices ahead are harder than the ones behind."*

5. **Advisor trust tracker:** 3 cards showing each advisor, their trust level (Trusted/Neutral/Sidelined), and how many turns their advice was followed.

6. **Disclaimer footer:** "No outcome is celebrated. No actor is favored."

---

## 8. Onboarding Details

### Orientation Component

- 4-step card with dot progress indicator
- Each step has: title (Space Grotesk bold, gold), body text (Newsreader), and a visual element
- Step 1: Turn rhythm diagram (4 numbered boxes)
- Step 2: Escalation ladder visualization with "YOU" marker
- Step 3: Fog of war comparison (believed vs. reality columns)
- Step 4: Scenario setup + cascade alert preview
- Skip link always visible
- Final step button: "Begin Turn [N]"
- Does not reappear after first session (persisted in React state or user profile)

### Progressive Complexity

The system deliberately simplifies early turns:
- Turns 1-3: Only 3 advisor recommendations shown. No "Browse All" or "Advanced TurnPlan" options visible.
- Turn 4: "Browse All Decisions" link appears.
- Turn 5+: "Advanced TurnPlan" link appears.

This prevents information overload while teaching the core loop.

**Important:** The actor agent API always generates the full 8-12 decision set per the PRD. The progressive disclosure UI hides the "Browse All" entry point in turns 1-3; the full catalog exists in state but is not exposed to the player.

---

## 9. Stitch Token Mapping

All UI uses the updated Stitch design system tokens. Key mappings:

| Element | Token | Value |
|---|---|---|
| Page background | `--bg-base` | #0D1117 |
| Recessed areas (terminal) | `--bg-surface-dim` | #131313 |
| Panels, sidebars | `--bg-surface-low` | #1c1b1b |
| Cards, inputs | `--bg-surface` | #201f1f |
| Hover states | `--bg-surface-high` | #2a2a2a |
| Tooltips, top-layer | `--bg-surface-highest` | #353534 |
| Default borders | `--border-subtle` | #414751 |
| Emphasized borders | `--border-hi` | #8b919d |
| Primary text | `--text-primary` | #e5e2e1 |
| Secondary text | `--text-secondary` | #c1c7d3 |
| Tertiary text | `--text-tertiary` | rgba(229,226,225,0.45) |
| Gold accent | `--gold` | #ffba20 |
| Critical/danger | `--status-critical` | #ffb4ac (coral) |
| Stable/nominal | `--status-stable` | #a4c9ff (command-center blue, NOT green) |
| Warning | `--status-warning` | #ffba20 (same as gold) |
| Border radius | — | 0px everywhere |

**Typography tokens — four distinct roles:**

| Token | Font | Role | Used for |
|---|---|---|---|
| `--font-sans` | Inter | UI chrome | Body text, descriptions, panel content — the default |
| `--font-serif` | Newsreader | Narrative prose | Chronicle entries, advisor quotes, decision rationale, briefing text |
| `--font-label` | Space Grotesk | Labels & telemetry | Section overlines, actor names, badges, buttons, decision titles, tab labels |
| `--font-mono` | IBM Plex Mono | Numbers & data | Scores, timestamps, oil prices, document IDs, coordinates, escalation rungs |

---

## 10. Sensitivity & Tone

### Framing

GeoSim is an **analytical simulation tool**, not a war game. This is reinforced through:
- Analytical disclaimer on scenario entry
- "Simulation" and "analyst" language, never "game" or "player" in the UI
- No celebration mechanics, no score-based rewards
- Chronicle narrative acknowledges human cost without trivializing it
- Equal narrative weight and humanization for all actors (neutrality principle)
- Session summary presents consequences, not victories

### Content Standards

- When strikes happen, civilian impact is acknowledged
- Casualty numbers are never presented as scores
- The narrator gives equal space to all actors' perspectives
- Diplomatic context (e.g., strikes after negotiations) is always surfaced
- No loaded framing ("retaliation" vs. "aggression" depends on perspective)

---

## 11. Technical Architecture

### Phase Mapping — Spec Phases to GameContext

The spec's 4 display phases map to `GameContext.turnPhase` as follows:

| Spec phase | GameContext `turnPhase` | Trigger |
|---|---|---|
| **Briefing** | `'planning'` (before user selects action) | Turn starts or user clicks "Next Turn Briefing" |
| **Decide** | `'planning'` (after user clicks "Proceed to Decision") | User transitions from briefing |
| **Resolution** | `'resolution'` → `'reaction'` → `'judging'` | User submits decision |
| **Overview** | `'complete'` | All resolution phases finish |

Implementation: `PhaseRouter` derives a `displayPhase` from `turnPhase` plus a local `hasReadBriefing` boolean. When `turnPhase === 'planning'` and `!hasReadBriefing`, show Briefing. When `turnPhase === 'planning'` and `hasReadBriefing`, show Decide. This avoids modifying the `GameState` type union.

### Component Structure

```
app/scenarios/[id]/play/[branchId]/page.tsx   — main game view
  <GameProvider>
    <PhaseRouter>                              — derives displayPhase, renders correct layout
      <BriefingPhase />                        — narrative-lead layout
      <DecisionPhase />                        — decision-lead layout
      <ResolutionPhase />                      — terminal + map, then chronicle
      <OverviewPhase />                        — strategy-lead layout
    </PhaseRouter>
  </GameProvider>
```

### New Components Needed

| Component | Location | Purpose |
|---|---|---|
| `PhaseRouter` | `components/game/PhaseRouter.tsx` | Switches layout based on `turnPhase` from GameContext |
| `BriefingPhase` | `components/game/phases/BriefingPhase.tsx` | Briefing layout with advisors |
| `DecisionPhase` | `components/game/phases/DecisionPhase.tsx` | Decision cards + progressive disclosure |
| `ResolutionPhase` | `components/game/phases/ResolutionPhase.tsx` | Terminal → Chronicle transition |
| `OverviewPhase` | `components/game/phases/OverviewPhase.tsx` | Map-dominant strategic view |
| `AdvisorCard` | `components/game/AdvisorCard.tsx` | Advisor with portrait, mood, quote |
| `CascadeAlert` | `components/game/CascadeAlert.tsx` | Nuclear/escalation cascade warning |
| `DecisionCard` | `components/game/DecisionCard.tsx` | Decision recommendation card |
| `DispatchTerminal` | `components/game/DispatchTerminal.tsx` | Animated terminal with staged line reveals |
| `ChronicleEntry` | `components/game/ChronicleEntry.tsx` | Full narrative entry with expandable details |
| `GameMap` (extend existing) | `components/map/GameMap.tsx` | SVG map extended with animation props for resolution phase |
| `MapAnnotation` | `components/map/MapAnnotation.tsx` | Positioned annotation boxes |
| `SessionSummary` | `components/game/SessionSummary.tsx` | Presidential daily brief |
| `Orientation` | `components/game/Orientation.tsx` | 4-step onboarding flow |
| `MoodTag` | `components/game/MoodTag.tsx` | Advisor mood badge |

### State Additions to GameProvider

```typescript
// Add to GameState (in-memory, per-session)
currentTurnComplexityLevel: 'simple' | 'standard' | 'advanced'; // drives progressive disclosure
previousSnapshot: Scenario | null; // cached previous commit snapshot for delta display in Overview
```

### Persisted State (Supabase)

These survive page refresh and cross-session:

```typescript
// profiles table — new column
has_completed_orientation: boolean  // default false, set true after orientation

// branch-level — stored in turn_commits.judging_phase JSONB
advisorTrust: Record<string, {
  followed: number;
  ignored: number;
  currentMood: 'hawkish' | 'cautious' | 'concerned' | 'frustrated' | 'sidelined' | 'trusted';
}>;
```

Write path: after each turn completes, advisor trust is updated in the judging_phase JSONB.
Read path: on branch load, read the latest commit's advisor trust data.

### Data Sources by Phase

| Phase | Data source |
|---|---|
| Briefing | `scenarioSnapshot` from current commit (via GameContext) |
| Decide | `availableDecisions` from `POST /api/branches/[id]/turns/start` |
| Resolution | Realtime events from `branch:[id]` channel, then `GET /api/commits/[id]` |
| Overview | Current `scenarioSnapshot` + `previousSnapshot` (cached from prior commit) for deltas |

---

## 12. What Is NOT In Scope

- Light theme / adaptive theming (dropped — Stitch dark only)
- Mapbox GL JS integration (Tier 2, post-MVP)
- Multiplayer / simultaneous multi-user control
- Scenario creation wizard
- Full decision analysis API integration (mock data for MVP)
- Advisor portrait illustrations (initials + colored rings for MVP)
- Sound design
