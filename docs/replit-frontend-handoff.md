# GeoSim — Replit Frontend Handoff

**Date:** 2026-03-30
**Repo:** https://github.com/JasonIngersoll9000/GeoSim
**Active branch for Issue 1:** `feat/landing-page-issue-29`
**Your role:** All frontend — visual quality, interactions, animations, Mapbox map, wiring UI to API calls. Claude Code handles backend (API routes, Supabase schema, AI agent pipeline, game loop logic). Do not touch `app/api/`, `lib/`, `supabase/`, or `scripts/`.

---

## What Is GeoSim

GeoSim is an AI-powered geopolitical simulation engine. Users load a real-world scenario (currently: Iran 2026 — Strait of Hormuz closure), watch AI agents simultaneously play every nation-state actor (USA, Iran, Israel, Saudi Arabia, China), then fork the timeline at any turning point to explore alternate histories.

The aesthetic is **"Declassified War Room"** — it should feel like a real US government intelligence monitoring system that has been partially declassified and made accessible to researchers. Every surface carries institutional weight. This is not a game, not a SaaS dashboard — it's a classified intelligence file that happens to be interactive.

**The test for every design decision:** Does this look like it belongs in a SCIF, or does it look like a SaaS product? If the latter, reconsider.

---

## Tech Stack

- **Next.js 14** (App Router, React Server Components)
- **TypeScript 5** (strict mode — no `any`, no `unknown` without narrowing)
- **Tailwind CSS** for all styling — no separate CSS files unless absolutely necessary
- **Framer Motion** for animations — install with `bun add framer-motion`
- **Mapbox GL JS** for map — `mapbox-gl` already referenced in components
- **Supabase** — backend only, don't instantiate in client components unless Claude Code has set it up
- Package manager: **bun** (not npm/npx — WSL2 environment where npm is a Windows binary)

---

## Design System — Read Before Touching Any File

Read **`docs/frontend-design.md`** in full before building anything. Below is a summary but the full doc has all the detail.

### Fonts (configured in `tailwind.config.ts` and loaded in `app/layout.tsx`)

| Tailwind class | Font | Use for |
|---|---|---|
| `font-label` | Space Grotesk | All headings, labels, badges, step numbers, button text, tab labels, actor names |
| `font-mono` | IBM Plex Mono | Timestamps, doc IDs, classification tags, coordinates, all numbers/scores |
| `font-serif` | Newsreader | Chronicle prose body, intel report narratives, strategic rationale text |
| `font-sans` | Inter | UI descriptions, body copy, panel content, anything dense and functional |

### Colors

```
Gold:              #ffba20   — Tailwind: text-gold, or inline style backgroundColor: '#ffba20'
Background:        #0a0a0a (base), #0b0b0b, #0c0c0c, #0d0d0d, #111 (surface)
Border:            #1a1a1a (default), #181818, #222, #2a2a2a
Text primary:      #ebebeb
Text secondary:    #ccc / #bbb
Text tertiary:     #555 / #444 / #333
Classification red:#b91c1c
Actor US blue:     #4a90d9
Actor Iran:        #c0392b (crimson)
```

Gold is ONLY used for: left border stripe on hero sections, badge chips, primary CTA buttons, gold underlines on key phrases, step number text, escalation current-rung indicator. Never as a decorative color.

### Aesthetic Rules

- **No gradients** — flat dark surfaces only
- **No rounded corners above 4px** — hard edges everywhere
- **No glassmorphism, no white cards, no emoji**
- **No toast notifications** — events appear as dispatch lines
- **No modals** — everything is a slide-over panel from the right
- **No loading spinners** — use the DispatchTerminal pattern for async
- Typography is tight, tracked, and uppercase for labels

### Anti-Patterns to Avoid

Do not use: purple/blue gradients, heavy box-shadows, `rounded-xl` or above, glassmorphism blur, glowing neon, bouncy transitions, chat bubbles, robot icons, "AI is thinking" labels. These make GeoSim feel generic.

### Existing UI Components (already built — use them, don't rebuild)

```
components/ui/TopBar.tsx                  — site navigation bar
components/ui/ClassificationBanner.tsx    — red classification stripe
components/ui/DocumentIdHeader.tsx        — monospace doc ID header
components/ui/SectionDivider.tsx          — ruled section separator
components/ui/Badge.tsx                   — status chips (variant: critical/military/warning/economic)
components/ui/Button.tsx                  — CTAs (variant: primary/ghost)
components/ui/ScoreDisplay.tsx            — score visualization
components/ui/ProgressBar.tsx             — progress/resource bars
components/ui/SlideOverPanel.tsx          — slide-over from right

components/game/ActorCard.tsx             — actor grid card for hub
components/game/ActorAvatar.tsx           — actor icon/avatar
components/game/EscalationLadder.tsx      — escalation rung visualization
components/game/IntelligenceReportBlock.tsx
components/game/DimensionTag.tsx          — Military/Political/Economic/Cyber tags
components/game/DispatchTerminal.tsx      — typewriter-style resolution animation
components/game/TurnPhaseIndicator.tsx

components/chronicle/TurnEntry.tsx        — single chronicle entry
components/chronicle/ChronicleTimeline.tsx
components/chronicle/GlobalTicker.tsx     — scrolling status ticker

components/panels/ActorList.tsx           — left panel actor list
components/panels/ActorDetailPanel.tsx    — actor dossier slide-over
components/panels/DecisionCatalog.tsx     — available decisions panel
components/panels/TurnPlanBuilder.tsx     — player turn submission
components/panels/DecisionDetailPanel.tsx
components/panels/EventsTab.tsx
components/panels/GlobalIndicators.tsx    — oil price, support, air defense
components/panels/ObserverOverlay.tsx

components/map/GameMap.tsx                — map shell (currently placeholder)
components/map/ActorLayer.tsx
components/map/ChokepointMarker.tsx
components/map/FloatingMetricChip.tsx
components/map/MapLegend.tsx

components/layout/GameLayout.tsx
components/layout/MapSide.tsx
components/layout/PanelSide.tsx
components/game/GameView.tsx              — full play view orchestrator
components/providers/GameProvider.tsx     — React context + Supabase Realtime
```

---

## Current State — What's Built vs What Needs Work

### Pages (all exist as files)

| Route | Status | Notes |
|---|---|---|
| `/` (`app/page.tsx`) | Needs major visual upgrade | Content correct, not captivating enough |
| `/scenarios` | Built with mock data | Visual polish + animations needed |
| `/scenarios/[id]` | Built with mock data | Visual polish, tab UX, branch selection |
| `/scenarios/[id]/play/[branchId]` | Built, mock-wired | Visual polish, interactions, real Mapbox |
| `/chronicle/[branchId]` | Exists | Needs visual audit and polish |
| `/scenarios/[id]/branches` | **Does not exist** | Needs to be built |

### Components

All components listed above exist. They were built in Sprint 2 and are connected with mock data (`MOCK_*` constants inside the components). Claude Code will replace mock data with real Supabase queries (that's backend territory) — but right now, everything renders with static placeholder data.

**Your job is to make all of this look and feel exceptional**, not to wire the Supabase queries.

---

## The User Flow to Implement

```
Landing (/)
  → Scenario Browser (/scenarios)
    → Scenario Hub (/scenarios/[id])
      → Pick a branch (existing or create new)
        → Play View (/scenarios/[id]/play/[branchId])    ← the war room
          ↕ Chronicle (/chronicle/[branchId])             ← full narrative view
          ↕ Branch List (/scenarios/[id]/branches)        ← alternate timelines
```

Every step needs to feel like opening a deeper layer of a classified file.

---

## Issue 1 — Landing Page Visual Upgrade

**File:** `app/page.tsx`
**Branch:** `feat/landing-page-issue-29` (already exists, work here)
**Priority:** HIGH — this is the first impression

The landing page content is correct. The unit tests check for specific text — do not remove: "Model the decisions", "alternate timeline", step numbers "01"/"02"/"03", links to `/scenarios/iran-2026` and `/scenarios`, "SECRET" badge text, "IRAN 2026", "The Oil War Escalates".

**What needs to change:**

**Hero section** (the full-viewport centered section):
- H1 size should be dramatically larger: `clamp(52px, 8vw, 88px)`, max-width 900px
- Add a large faint classification stamp behind the H1 — `TOP SECRET` in huge red text at opacity 0.025, absolute positioned, same technique as the GEOSIM watermark
- The ghost GEOSIM watermark can go up to `28vw` and `opacity: 0.04`
- The overline divider lines (currently two gold rules with text between) should read more like a document stamp — consider wrapping in a `border border-[#1f1f1f]` container to make it feel like a stamped field
- A very subtle CSS grid texture on the hero background: add a `backgroundImage` with a `1px` repeating grid at very low opacity (`rgba(255,186,32,0.02)`) using `repeating-linear-gradient`
- The scroll hint arrow at the bottom should be more prominent

**"How It Works" steps:**
- Step body paragraphs should use `font-serif` (Newsreader) — these are intel briefs, not UI copy
- The bullet list items inside steps should also use `font-serif`
- Step number badges could be larger — `text-[11px]` with `px-3 py-1.5`

**Iran 2026 scenario card:**
- The intel excerpt body text must use `font-serif` (Newsreader) — this is narrative prose
- The card should feel heavier — increase the left border to show it's a CRITICAL entry
- Consider a very faint background pattern on the card itself

**Closing CTA:**
- Add the same gold left border treatment as the hero (`border-left: 3px solid #ffba20`) to match the spec doc's description of "visually brackets the page"

---

## Issue 2 — Scenario Browser Polish

**File:** `app/scenarios/page.tsx`
**Branch:** `feat/scenario-browser-polish` (create off `feat/landing-page-issue-29` or `main`)

The scenario browser exists with a category filter strip and scenario cards. It needs visual quality.

**What to build:**

**Page header:**
- Full-width classification banner at top (use `<ClassificationBanner />`)
- `<TopBar />` below it
- `<DocumentIdHeader />` with `DOC-ID: GS-SCENARIOS-INDEX` and today's date

**Category filter strip:**
- Styled tabs: `ALL SCENARIOS`, `ACTIVE CONFLICTS`, `HISTORICAL`, `HYPOTHETICAL`
- Selected tab: gold bottom border (`border-b-2 border-gold`) + gold text
- Unselected: `text-text-tertiary`, no border, hover lightens text

**Scenario cards** (currently: Iran 2026 is the only one, with mock placeholders for others):
- Card: `bg-[#0d0d0d]`, `border: 1px solid #1a1a1a`, `border-left: 3px solid #b91c1c` (critical/active) or `border-left: 3px solid #2a2a2a` (inactive)
- Card header: classification badge (SECRET/CONFIDENTIAL) + scenario title + status chip (ACTIVE/ARCHIVED)
- Brief description in `font-serif` Newsreader, 13px
- Metadata row: `font-mono` 9px — actor count, branch count, last active date
- Hover state: `border-color: #2a2a2a` → `#3a3a3a`, slight bg lift `#111`
- Click navigates to `/scenarios/[id]`

**Iran 2026 card specifically:**
- Should look like the hero preview on the landing page — classify it SECRET, show the actor strip, show TURN 03 // ACTIVE
- This is the only real scenario, make it feel prominent

---

## Issue 3 — Scenario Hub Polish + Branch Selection

**File:** `app/scenarios/[id]/page.tsx`
**Branch:** `feat/scenario-hub-polish`

The scenario hub has two tabs: "Actors" and "Timeline". It needs visual polish and a functional branch selector.

**Page structure:**
```
[ClassificationBanner]
[TopBar — with scenario name]
[DocumentIdHeader — SCENARIO: IRAN-2026 // BRANCH SELECTOR]
[Scenario overview card — title, classification, last active turn]
[Branch selector — "TRUNK (active)" card + "NEW BRANCH" button]
[Tabs: ACTORS | TIMELINE]
  → Actors tab: 3-column grid of ActorCard components
  → Timeline tab: ChronicleTimeline component with mock turn data
```

**Visual requirements:**
- The scenario overview card: dark bg, red left border, SECRET badge, title in Space Grotesk Bold 14px, classification stamp
- Branch selector: each branch is a card with `branch name`, `last turn`, `created date`, `status (ACTIVE/ARCHIVED)`. Active branch gets gold left border. "Start New Branch" button is ghost-styled.
- Actor cards: already built in `ActorCard.tsx` — just make sure the grid layout feels right, 3 columns on desktop, 2 on tablet
- "View Dossier" button on each actor card should open `ActorDetailPanel` slide-over
- Timeline tab: `ChronicleTimeline` with mock turn entries. Entries should look like intel dispatches (they already use `TurnEntry` component).

**The "Enter Simulation" flow:**
- Each branch card has a `RESUME →` button that navigates to `/scenarios/[id]/play/[branchId]`
- "Start New Branch" calls `POST /api/branches` (Claude Code implements the API, Replit wires the button)

---

## Issue 4 — Play View (War Room) Visual + Interaction Polish

**Files:** `app/scenarios/[id]/play/[branchId]/page.tsx`, `components/game/GameView.tsx`, related components
**Branch:** `feat/play-view-polish`

This is the main game view. It's the most complex page. Everything exists as mock-wired components. The layout is:
- Left 60%: Map (currently a placeholder — see Issue 7 for real Mapbox)
- Right 40%: Tabbed panel (Actors, Decisions, Events, Chronicle)

**Visual requirements:**

**Top bar:**
- `<TopBar />` with scenario name, turn indicator (`TURN 03 // PLANNING PHASE`), game mode badge
- `<TurnPhaseIndicator />` should be prominent — users need to always know if they're in Planning or Resolution phase
- `<ObserverOverlay />` (fog-of-war toggle, perspective selector) should feel like a real control panel

**Left panel (map side):**
- Until Mapbox is wired (Issue 7), the map placeholder should look intentional — a dark surface with coordinate grid overlay (CSS-only, fine lines at `rgba(255,186,32,0.04)`) and a centered "MAP CLASSIFIED — LOADING INTELLIGENCE PICTURE" message
- `<FloatingMetricChip />` overlays should be positioned correctly on the map surface
- `<MapLegend />` bottom-left, dark and monospace

**Right panel tabs (Actors, Decisions, Events, Chronicle):**
- Tab strip: same selected-tab treatment as scenario browser — gold underline + gold text
- **Actors tab:** `<ActorList />` with `<GlobalIndicators />` — each actor row shows name (Space Grotesk), escalation rung (EscalationBadge), colored status dot. Click → `ActorDetailPanel` slide-over. Global indicators (oil price, domestic support %) should use `<ProgressBar />` components.
- **Decisions tab:** `<DecisionCatalog />` showing available decisions as cards. Each card: dimension tag (Military/Political/Economic/Cyber), action title, brief description, escalation impact. Click → `DecisionDetailPanel` slide-over. Selected decisions populate `<TurnPlanBuilder />` at the bottom.
- **Events tab:** `<EventsTab />` with last turn summary — narrative in `font-serif`, severity badges
- **Chronicle tab:** `<ChronicleTimeline />` with all turns — each `<TurnEntry />` is expandable

**ActorDetailPanel slide-over:**
- Header: `DOSSIER: [ACTOR NAME]` in Space Grotesk Bold, `CLASSIFICATION: SECRET // GEOSIM-IRN`, `LAST UPDATED: TURN 03`
- Section dividers use the `━━━ SECTION TITLE ━━━` pattern (see `SectionDivider` component)
- Shows: strategic objectives, capabilities, current escalation rung on `EscalationLadder`, intelligence picture, known decisions
- Slides in from the right, background dims slightly

**TurnPlanBuilder (bottom of right panel in Planning phase):**
- Shows selected primary decision + up to 3 concurrent actions
- "SUBMIT TURN PLAN" primary button — gold fill, Space Grotesk Bold
- While submitting: button disabled, `<DispatchTerminal />` shows `SUBMITTING TURN PLAN...`
- Wire submit to `POST /api/branches/[branchId]/advance` (see Issue 6 for the full interaction)

**DispatchTerminal:**
- During turn resolution, this takes over the right panel or the full view
- Monospace lines stamp in with 40ms stagger — each line just appears, no fade
- Lines: `[22:14:03] RESOLUTION ENGINE ACTIVE`, `[22:14:04] PROCESSING ACTOR TURNPLANS...`, etc.
- Blinking amber cursor `▋` while processing
- When complete, chronicle updates

---

## Issue 5 — Full Chronicle Page

**File:** `app/chronicle/[branchId]/page.tsx`
**Branch:** `feat/chronicle-polish`

A full-screen narrative view of the war timeline. Already exists but needs a visual audit.

**Structure:**
```
[ClassificationBanner]
[TopBar — with branch name]
[GlobalTicker — scrolling horizontal strip: Oil $142/bbl | Strait: CLOSED | US Support: 62%]
[Dimension filter tabs: ALL | MILITARY | POLITICAL | ECONOMIC | CYBER]
[ChronicleTimeline — full list of TurnEntry components]
```

**GlobalTicker:**
- Continuous horizontal auto-scroll (CSS marquee or `requestAnimationFrame` loop)
- Data items separated by `//`, IBM Plex Mono, 9px, tertiary text
- Pauses on hover

**TurnEntry (each turn):**
- Left border: crimson for Critical, gold for Major, blue for Moderate, subtle for Minor
- Header: `INTEL BRIEF // TURN 04 // 22 MARCH 2026 // SEVERITY: CRITICAL` — IBM Plex Mono 8px
- Title: Space Grotesk Bold, 14px, uppercase
- Narrative: Newsreader, 13px, `line-height: 1.75`, secondary text color
- Tags: DimensionTag components for Military/Political/Economic
- Expandable section (click to open): decisions made, judge scores, escalation changes
- Expand animation: max-height transition from 0 → auto, content fades in after border reveals

---

## Issue 6 — Branch List Page (New Page)

**File:** `app/scenarios/[id]/branches/page.tsx` (does not exist, create it)
**Branch:** `feat/branch-list-page`

A page showing all branches for a scenario — the alternate timelines view. This is the "decision tree" visualization.

**Structure:**
```
[ClassificationBanner]
[TopBar]
[DocumentIdHeader — TIMELINE DIVERGENCE MAP // SCENARIO: IRAN-2026]

[Branch tree visualization]
  TRUNK ————————————●—————●—————●
                          |           |
              BRANCH A ——●—●         |
                                  BRANCH B ——●

[Branch list below the tree — cards for each branch]
```

**Branch tree visualization:**
- SVG or CSS-only horizontal timeline tree
- Each branch is a horizontal line with nodes (dots) for each turn
- Branch points are vertical connectors
- Active turn: gold dot, past turns: white/secondary dots
- Trunk is the primary horizontal line; branches fork from it
- IBM Plex Mono labels: branch name, turn count, last active date

**Branch cards (below the tree):**
- Card per branch: `TRUNK`, `BRANCH-A: [WHAT IF IRAN YIELDED?]`, etc.
- Shows: branch name, forked from turn X, last turn played, status (ACTIVE/DORMANT)
- Active branch: gold left border; inactive: dark border
- Two CTAs per card: `RESUME →` (if active or can be continued) and `VIEW CHRONICLE →`
- "Fork New Branch from Turn X" interaction — opens a turn selector

---

## Issue 7 — Mapbox Real Map

**File:** `components/map/GameMap.tsx` (and ActorLayer, ChokepointMarker)
**Branch:** `feat/mapbox-map`
**Dependencies:** Mapbox token needed — check `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`

Replace the map placeholder with a real Mapbox GL JS map.

**Map style:** Dark/military — use `mapbox://styles/mapbox/dark-v11` as base or a custom style

**Required layers:**
- **Actor fills:** Semi-transparent country fills for each actor's territory. Iran: crimson `rgba(192,57,43,0.1)`, US Navy presence: blue `rgba(74,144,217,0.08)`. On hover: opacity increases.
- **Strait of Hormuz marker:** `<ChokepointMarker />` at 56.5°E, 26.5°N. When CLOSED: dashed crimson line across the strait with animated stroke-dashoffset (4s loop) + `CLOSED` label in IBM Plex Mono
- **Carrier group position:** Blue dot for USS Nimitz with `<FloatingMetricChip />` overlay
- **Chokepoint markers:** Strait of Hormuz, Bab-el-Mandeb
- **Coordinate grid overlay:** Very faint CSS grid overlaid on the map at `rgba(255,255,255,0.03)` — IBM Plex Mono labels at grid intersections

**Map controls:**
- Navigation controls: small, dark-styled (no default Mapbox blue)
- No street labels — this should feel like a classified satellite image
- Initial view: Persian Gulf region, zoom 5

**Event animations (when Claude Code triggers them via Realtime):**
- Strike trajectory: arc from origin to target, 600ms, `rgba(255,186,32,0.8)` line
- Explosion: brief `radial-gradient` pulse at target that fades over 400ms — no particle effects

---

## Issue 8 — Turn Submission Flow

**Files:** `components/panels/TurnPlanBuilder.tsx`, `components/game/GameView.tsx`
**Branch:** `feat/turn-submission`
**Dependencies:** Claude Code must complete the game loop API (`POST /api/branches/[branchId]/advance`) first

Wire the TurnPlanBuilder submit button to the game loop.

**The interaction flow:**
1. Player selects primary decision from `DecisionCatalog` (click on a decision card)
2. Selected decision appears in `TurnPlanBuilder` at the bottom of the panel
3. Player optionally selects up to 3 concurrent actions (same DecisionCatalog, different section)
4. Player clicks `SUBMIT TURN PLAN →`
5. Button disabled, right panel switches to `DispatchTerminal` view showing live resolution
6. `POST /api/branches/[branchId]/advance` with the turn plan payload
7. SSE stream or polling returns resolution events as they happen — each event stamps a new line in `DispatchTerminal`
8. On completion: `ChronicleTimeline` receives new entry, `TurnPlanBuilder` resets
9. Turn phase advances to next planning phase

**Create:** `hooks/useSubmitTurn.ts`
```typescript
// Returns: { submitTurn, isSubmitting, error }
// Calls POST /api/branches/[branchId]/advance
// Streams response lines to DispatchTerminal
```

**DispatchTerminal messages during resolution:**
```
[14:32:01]  SUBMITTING TURN PLAN...
[14:32:02]  TURN PLAN RECEIVED — RESOLUTION ENGINE ACTIVE
[14:32:03]  PROCESSING 5 ACTOR TURNPLANS...
[14:32:04]  ACTOR: UNITED STATES — NAVAL BLOCKADE POSTURE
[14:32:05]  ACTOR: IRAN — STRAIT CLOSURE ENFORCEMENT
[14:32:06]  COLLISION DETECTED: STRAIT OF HORMUZ
[14:32:07]  SEVERITY: CRITICAL — OIL INFRASTRUCTURE STRIKE
[14:32:08]  JUDGE EVALUATION: 81/100 — PLAUSIBLE
[14:32:09]  NARRATOR GENERATING CHRONICLE ENTRY...
[14:32:10]  TURN 04 COMPLETE ▋
```

---

## Issue 9 — Animations Pass (All Pages)

**Branch:** `feat/animations`
**Install:** `bun add framer-motion`

Add entrance animations to every page and component. All animations should feel deliberate — like classified documents loading in, not bouncy consumer UI.

**Rules:**
- Use `useReducedMotion()` and skip all animations if true
- Duration: 0.3–0.5s max. Never longer.
- Easing: `easeOut` everywhere. Nothing bouncy (no `spring` with high stiffness).
- Stagger: 80–150ms between elements
- Movement: small vertical translate only — `y: 12 → 0` or `y: 8 → 0`. Never horizontal on page load.

**`app/page.tsx` — hero:**
- Classification banner, overline, H1, subheading, CTAs stagger in on mount
- Ghost watermark fades in last (0.8s, no translate)
- "HOW IT WORKS" section fades in when scrolled into viewport (use `whileInView`)

**`app/scenarios/page.tsx`:**
- Page header fades in on mount
- Scenario cards stagger-fade: 80ms between each card, `y: 12 → 0`, `opacity: 0 → 1`

**`app/scenarios/[id]/page.tsx`:**
- Scenario overview fades in on mount
- Actor cards stagger-fade when "Actors" tab is selected
- Tab content cross-fade on switch

**`app/scenarios/[id]/play/[branchId]/page.tsx`:**
- Game layout panels slide in from their respective sides on mount
- Panel tab content fades on tab switch

**`components/chronicle/TurnEntry.tsx`:**
- Each new entry slides in: `x: -16 → 0`, `opacity: 0 → 1`, 0.4s

**`components/chronicle/GlobalTicker.tsx`:**
- Continuous CSS marquee scroll using `@keyframes scroll` + `animation: scroll 30s linear infinite`
- Pause on hover with `animation-play-state: paused`

**`components/game/DispatchTerminal.tsx`:**
- Each new line stamps in with 40ms stagger — `opacity: 0 → 1`, no transition (instant stamp per the design doc)

**`components/panels/ActorDetailPanel.tsx`:**
- Slide-over already built — confirm it uses `transform: translateX(100%) → 0` with `transition: 250ms ease`

**`components/ui/Button.tsx`:**
- Add `active:scale-[0.97] transition-transform duration-75` to all buttons

**`components/panels/DecisionCatalog.tsx`:**
- On card hover: `DimensionTag` fades in (opacity 0 → 1 on hover, no translate)

---

## Git Workflow

```bash
# Issue 1 (landing page — already started):
git checkout feat/landing-page-issue-29
# ... make changes ...
git add app/page.tsx
git commit -m "feat: landing page visual upgrade — captivating hero and polish"
git push origin feat/landing-page-issue-29
# Open PR: "Closes #54"

# Each subsequent issue gets its own branch off main:
git checkout main && git pull
git checkout -b feat/scenario-browser-polish
# ... implement ...
git push origin feat/scenario-browser-polish
# Open PR: "Closes #[issue number]"
```

Work on one issue at a time. Each issue = one branch = one PR. Don't stack changes across multiple issues on a single branch.

---

## What NOT to Touch

**These are exclusively Claude Code's territory:**
- `app/api/**` — all API routes
- `lib/**` — game logic, AI prompts, Supabase queries, types
- `supabase/**` — database schema and migrations
- `middleware.ts` — Supabase auth middleware
- `scripts/**` — seed scripts

**Don't break these tests:**
- `tests/components/LandingPage.test.tsx` — 7 passing tests for `app/page.tsx`

---

## ESLint Rules (violations fail the Vercel build)

- No `// comment` directly inside JSX — use `{/* comment */}` or `{' // text '}`
- No unused destructured params — prefix with `_` (e.g., `_labels`)
- No `border: 'none'` after `borderBottom` in the same inline style object
- TypeScript strict mode: no `any`

---

## Running the App

```bash
bun run dev         # starts http://localhost:3000
bun run test -- --run tests/components/LandingPage.test.tsx  # unit tests
bun run lint        # ESLint
bun run typecheck   # tsc --noEmit
```

---

## Context: How Backend + Frontend Connect

Claude Code is building the backend in parallel. The connection points are:

| Claude Code builds | Replit wires |
|---|---|
| `POST /api/branches/[branchId]/advance` | TurnPlanBuilder submit button + DispatchTerminal streaming |
| `GET /api/scenarios/[id]/actors` | `app/scenarios/[id]/page.tsx` actor grid |
| `GET /api/branches/[branchId]/commits` | ChronicleTimeline entries |
| `POST /api/branches` | "Start New Branch" button in scenario hub |
| Supabase Realtime events | GameProvider already has the `useRealtime` hook shell |

The `GameProvider` component already has a Supabase Realtime channel subscription shell. When Claude Code emits game events, the frontend will receive them through this existing hook.

---

## The Single Most Important Thing

This should feel like opening a classified intelligence file, not like using a web app. Every pixel should carry weight. The fonts, the spacing, the left border accents, the monospace timestamps — they all work together to create the sensation of reading a real intelligence document. When a user submits their turn and watches the DispatchTerminal stamp in resolution events, it should feel genuinely tense and real.

Don't ship anything that looks generic. If a component could appear in a random SaaS dashboard, it needs more work.
