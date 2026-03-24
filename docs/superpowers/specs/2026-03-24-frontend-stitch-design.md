# GeoSim Frontend — Stitch Design Spec
**Date:** 2026-03-24
**Status:** Approved
**Approach:** Spec First → Parallel Tracks (design system + game view)

---

## Overview

This spec defines the frontend implementation plan for GeoSim Sprint 2, updated to adopt the Stitch mockup visual language as the authoritative design direction. The 7 Stitch-generated screens replace the existing `strategos-design-system.md` and `frontend-design.md` as the visual source of truth.

Stitch is **inspiration, not a rigid spec**. Components that don't serve GeoSim's actual functionality are excluded. Components not in the original plan are evaluated on merit and included where they add value. The underlying GeoSim vision (Declassified War Room, intelligence dashboard aesthetic) remains — Stitch is simply a better realization of that vision.

---

## 1. Visual Identity

### 1.1 Color Palette (Stitch → new tokens)

Replace all tokens in `strategos-design-system.md` with the following:

```css
/* Backgrounds */
--bg-base:                #0D1117   /* Page shell — same as before */
--bg-surface-dim:         #131313   /* Deepest surface */
--bg-surface-low:         #1c1b1b   /* Panels, sidebars */
--bg-surface:             #201f1f   /* Cards, metric blocks */
--bg-surface-high:        #2a2a2a   /* Hovered cards, active items */
--bg-surface-highest:     #353534   /* Input backgrounds */

/* Borders */
--border-subtle:          #414751   /* Default borders */
--border-hi:              #8b919d   /* Emphasized borders */

/* Text */
--text-primary:           #e5e2e1   /* Headlines, labels, body */
--text-secondary:         #c1c7d3   /* Muted labels, descriptions */
--text-tertiary:          rgba(229,226,225,0.45)  /* Hints, timestamps */

/* Accent — Gold (primary interactive) */
--gold:                   #ffba20
--gold-dim:               rgba(255,186,32,0.18)
--gold-glow:              rgba(255,186,32,0.08)
--gold-border:            rgba(255,186,32,0.40)
--gold-dark:              #bc8700   /* Button backgrounds, pressed states */

/* Actor Colors */
--actor-us:               #4A7FA5   /* Steel blue */
--actor-iran:             #8B2635   /* Muted crimson */
--actor-israel:           #ffba20   /* Shares gold accent */
--actor-russia:           #7B68C8   /* Muted purple */
--actor-generic:          #5EBD8E   /* Neutral actors */

/* Status */
--status-critical:        #ffb4ac   /* Coral — Stitch tertiary */
--status-critical-bg:     rgba(255,180,172,0.12)
--status-critical-border: rgba(255,180,172,0.30)
--status-warning:         #ffba20   /* Gold */
--status-warning-bg:      rgba(255,186,32,0.15)
--status-stable:          #5EBD8E
--status-stable-bg:       rgba(40,140,90,0.20)
--status-info:            #a4c9ff   /* Stitch secondary — sky blue */
--status-info-bg:         rgba(164,201,255,0.12)
--status-info-border:     rgba(164,201,255,0.25)
```

### 1.2 Typography (Stitch fonts)

Replace existing font stack:

```css
--font-sans:   'Space Grotesk', system-ui, sans-serif;
--font-serif:  'Newsreader', Georgia, serif;
--font-mono:   'IBM Plex Mono', monospace;   /* unchanged */
```

**Usage rules (same roles, new typefaces):**

| Context | Font | Size | Notes |
|---|---|---|---|
| Classification banner | IBM Plex Mono | 9px | Letter-spacing 0.12em, uppercase |
| Document IDs / timestamps | IBM Plex Mono | 9px | Tertiary color |
| Section overlines / labels | Space Grotesk | 10px | Uppercase, letter-spacing 0.08em |
| Actor names / card titles | Space Grotesk | 13px | Semibold |
| Button labels | Space Grotesk | 11px | Uppercase, semibold |
| Panel body text | Space Grotesk | 12px | Regular |
| All scores / numbers | IBM Plex Mono | varies | Never use sans for data |
| Chronicle prose | Newsreader | 15px | Italic, line-height 1.75 |
| Chronicle entity names | Newsreader | 15px | Non-italic, --text-primary |
| Decision rationale | Newsreader | 14px | Italic, line-height 1.65 |
| Intelligence report blocks | IBM Plex Mono | 10px | Monospace briefing aesthetic |

Load from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 1.3 Design Principles (unchanged)

- No `box-shadow` — elevation via background color stepping only
- No rounded corners above 6px
- No gradients on UI surfaces (fog-of-war overlay excepted)
- No spinner during turn resolution — use dispatch terminal animation
- No toast notifications — events log as dispatch lines
- No modals — everything slides in as a panel
- Topographic grid texture on page backgrounds

---

## 2. Routing Architecture

```
/                                  Landing
/auth/login                        Auth
/auth/signup                       Auth
/scenarios                         Scenario browser
/scenarios/new                     Creation wizard
/scenarios/[id]                    Scenario hub (pre-game)
/scenarios/[id]/play/[branchId]    War room (main game view)
/chronicle/[branchId]              Full-page war chronicle
/admin                             Admin dashboard
```

### 2.1 Route Responsibilities

**`/scenarios/[id]`** — Scenario Hub (pre-game briefing)
- Scenario overview header with classification banner
- Branch selector: list of existing branches with fork/resume options
- Two tabs: "Timeline" (branch tree visualization) and "Actors" (Strategic Actors Hub grid)
- "Start New Branch" CTA → branch creation → redirects to `/play/[branchId]`
- "Resume" CTA on existing branches → redirects to `/play/[branchId]`

**`/scenarios/[id]/play/[branchId]`** — War Room
- Collapsible map (default 60/40 split; collapse button → panel expands full-width)
- During planning phase: panel expands. During resolution: map takes focus.
- Right panel tabs: Actors, Decisions, Events, Chronicle
- Slide-overs: Actor Dossier, Strategic Rationale, Decision Log
- Turn controls, phase indicator, observer overlay
- All 7 Stitch screens except #4 and #5 live here

**`/chronicle/[branchId]`** — Full Chronicle
- Full-screen narrative timeline
- Global ticker (oil price, domestic support, Strait status)
- Filter by dimension
- Expandable turn entries with judge scores

### 2.2 Stitch Screen → Route Mapping

| Stitch Screen | Route | Implementation |
|---|---|---|
| 01 Simulation Dashboard | `/play/[branchId]` | Main view |
| 02 Actor Dossier | `/play/[branchId]` | Slide-over panel |
| 03 War Chronicle | `/chronicle/[branchId]` + Chronicle tab | Full page + inline tab |
| 04 Scenario Timeline | `/scenarios/[id]` | Timeline tab |
| 05 Strategic Actors Hub | `/scenarios/[id]` | Actors tab |
| 06 US Decision Log | `/play/[branchId]` | Decisions tab / slide-over |
| 07 Strategic Rationale | `/play/[branchId]` | Slide-over |

---

## 3. Component Inventory

### 3.1 Existing UI Primitives (visual update only)

All 10 components in `components/ui/` keep their interfaces but get updated to Stitch tokens and fonts:

- `Badge` — update colors to Stitch status palette
- `Button` — update to Space Grotesk, #ffba20 primary, Stitch ghost style
- `ClassificationBanner` — update gold to #ffba20, letter-spacing to 0.2em
- `DocumentIdHeader` — update to IBM Plex Mono, Stitch tertiary text color
- `ExpandableSection` — update toggle styling to Stitch
- `ProgressBar` — update to Stitch status colors
- `ScoreDisplay` — update to IBM Plex Mono, Stitch color thresholds
- `SectionDivider` — update to Space Grotesk overline style
- `SlideOverPanel` — update surface color to `--bg-surface-low`
- `TopBar` — update to Space Grotesk wordmark, Stitch surface color

### 3.2 New Components to Build

**Layout (`components/layout/`)**
- `GameLayout` — split-screen shell with collapsible map logic
- `MapSide` — left panel wrapper with collapse/expand controls
- `PanelSide` — right panel wrapper with tab navigation

**Map (`components/map/`)**
- `GameMap` — Mapbox GL wrapper, Middle East focus, Stitch dark basemap
- `ActorLayer` — country fill layers by actor color
- `ChokepointMarker` — Strait of Hormuz and other chokepoints
- `MapLegend` — actor colors, asset types
- `FloatingMetricChip` — overlay chips: oil price, air defense %, Strait status *(from Stitch)*

**Game components (`components/game/`)**
- `EscalationLadder` — horizontal bar, 8 rungs, current rung glows gold, danger rungs shift to --status-critical
- `ActorAvatar` — colored dot/initials
- `EscalationBadge` — "Rung 5" pill
- `DimensionTag` — military/economic/diplomatic/etc
- `ConfidenceBadge` — confirmed/high/moderate/low
- `TurnPhaseIndicator` — planning/resolution/reaction/judging badge
- `ActorCard` — Strategic Hub card: name, status badge, metrics grid, escalation bar, "View Dossier" link *(from Stitch screen 5)*
- `ConstraintCascadeAlert` — 4px red left-border card with warning icon + cascade chain *(from Stitch)*
- `IntelligenceReportBlock` — monospace text block with gold left-border, `[HEADER]` style *(from Stitch)*
- `DispatchTerminal` — turn resolution animation: stamped lines, amber cursor

**Panels (`components/panels/`)**
- `ActorList` — scrollable list with escalation badges
- `ActorDetailPanel` — full actor state dossier (key figures, military, economic, political, escalation ladder, intel picture)
- `GlobalIndicators` — oil price, air defense, domestic support bars
- `DecisionCatalog` — decisions grouped by dimension
- `DecisionDetailPanel` — parameters, profiles, concurrency indicators
- `TurnPlanBuilder` — primary + concurrent slots, resource sliders, live validation
- `EventsTab` — last turn summary, per-action outcomes, judge scores
- `ObserverOverlay` — omniscient toggle, perspective selector, intervention controls

**Chronicle (`components/chronicle/`)**
- `ChronicleTimeline` — vertical timeline with severity dots
- `TurnEntry` — date, title, Newsreader prose, tags, expandable detail
- `GlobalTicker` — running totals strip

---

## 4. GitHub Issue Plan

### 4.1 Issues to Update (#20–#32)

All 13 issues get updated acceptance criteria to reflect Stitch tokens, fonts, and component patterns. Structural/functional scope is preserved unless noted.

**#28 — Classification Banner + Design System** *(Updated — expanded scope)*
This becomes the design token migration issue. Scope increases significantly:
- Replace Barlow/EB Garamond with Space Grotesk/Newsreader in layout and Tailwind config
- Update all CSS custom properties to Stitch palette (see Section 1.1)
- Update Tailwind config with new token aliases
- Update all 10 existing UI primitive components to new tokens/fonts
- Rewrite `strategos-design-system.md` as the new canonical token reference
- Rewrite `frontend-design.md` to reference Stitch as visual source of truth
- **Must be the first issue completed** — prerequisite for all other frontend work

**#20 — Split-Screen Game Layout**
- Add collapsible map behavior: default 60/40, collapse button on divider
- Panel expands to full-width when map is collapsed
- Auto-collapse map during planning phase, auto-expand during resolution
- Map collapse state persists in GameContext (`viewMode`)
- Update to Stitch `--bg-surface-low` for panel background

**#21 — Actors Panel**
- Add `FloatingMetricChip` components to GlobalIndicators section (rendered over map)
- Update actor row styling: Space Grotesk, Stitch badge colors
- Use `--status-info` (#a4c9ff) for escalation rung badges on stable actors
- Use `--status-critical` (#ffb4ac) for high-escalation badges

**#22 — Actor Detail Panel**
- Use Newsreader for prose sections (key figure descriptions, constraint rationale)
- Add ghost background image (opacity 0.05) behind actor header section
- Update stat cards to Stitch surface colors
- Escalation ladder visualization: matches Stitch screen 02 reference

**#23 — Decision Catalog + TurnPlan Builder**
- Use `IntelligenceReportBlock` for decision strategic rationale sections
- Update profile quick-pick cards to Stitch styling (gold border on selected)
- Update resource allocation sliders to Stitch gold fill color
- Synergy/tension validation messages use `--status-info` / `--status-critical`

**#24 — Decision Analysis View**
- Use `IntelligenceReportBlock` for classified briefing sections
- Use Newsreader italic for strategic rationale prose
- Outcome cards use left-border severity coding (red=critical, gold=major, blue=info)
- Update overall assessment section to Stitch verdict card style

**#25 — War Chronicle**
- Newsreader italic 15px / line-height 1.75 for all narrative prose
- Severity dot colors: `--status-critical` (coral) for critical, `--gold` for major, `--status-info` (blue) for diplomatic
- Left-border color coding matches severity dots
- Global ticker uses IBM Plex Mono, Stitch tertiary text

**#26 — Events Tab**
- Update per-action outcome cards to Stitch surface colors
- Judge score display uses IBM Plex Mono with Stitch status colors
- Reaction phase block: visually distinct with `--status-warning-bg` background

**#27 — Game Mode Selection + Scenario Browser**
- Update scenario card styling to Stitch surface colors
- Category badges use `--status-info-bg` / `--status-info` color scheme
- Game mode selector cards: Stitch selected state (gold border + gold-glow bg)

**#29 — Turn Resolution Dispatch Terminal**
- Update terminal background to `--bg-surface-dim` (#131313)
- Update line colors: timestamps → `--text-tertiary`, events → `--text-secondary`, COLLISION → `--status-critical`, CONFIRMED → `--gold`
- Amber cursor uses `--gold` (#ffba20)

**#30 — Constraint Cascade Detection**
- `ConstraintCascadeAlert` component uses Stitch left-border card style (4px `--status-critical` left border)
- Warning icon filled (Material Symbols FILL=1 or equivalent)
- Cascade chain items listed in IBM Plex Mono

**#31 — Reaction Phase UI**
- Reaction phase panel uses `--status-warning-bg` to visually distinguish from planning
- Simplified action picker matches Stitch card selection pattern

**#32 — Supabase Realtime Subscriptions**
- No visual changes — backend/wiring only. Acceptance criteria unchanged.

### 4.2 New Issues

**New A: Design Token Migration** *(can be merged with updated #28 or kept separate)*
- Update `tailwind.config.ts` with Stitch color palette as named tokens
- Update `app/globals.css` with all CSS custom properties from Section 1.1
- Add Google Fonts link (Space Grotesk, Newsreader, IBM Plex Mono)
- Acceptance criteria: `bun run typecheck` passes, dev server shows correct fonts/colors

**New B: Scenario Hub Page — `/scenarios/[id]`**
- Route: `app/scenarios/[id]/page.tsx`
- Components: scenario header (name, classification tag, description), branch selector list, "Start New Branch" + "Resume" CTAs
- Two tabs: Timeline (simplified branch tree) and Actors (Strategic Actors Hub — see New C)
- Connects to `GET /api/scenarios/[id]` and `GET /api/scenarios/[id]/branches`
- Acceptance criteria: page renders with mock data, branch selection navigates to `/play/[branchId]`

**New C: Strategic Actors Hub Section**
- Component: `ActorCard` — Stitch screen 05 reference
- Card contents: actor name (Space Grotesk bold, large), status badge (Stable/Escalating/Critical), key metrics grid (2-3 values with IBM Plex Mono), escalation progress bar, "View Dossier" button
- Ghost background image: very faint actor icon/flag (opacity 0.05) behind card
- Grid layout: 3 columns desktop, 2 tablet, 1 mobile
- Lives inside Scenario Hub `/scenarios/[id]` Actors tab
- Acceptance criteria: all scenario actors render as cards with correct status badges

**New D: Scenario Browser Page — `/scenarios`**
- Route: `app/scenarios/page.tsx`
- Scenario cards: name, description, category badge, branch count, play count, rating
- Filter by category (dropdown or tab strip)
- Shows public scenarios + user's private scenarios
- Connects to `GET /api/scenarios`
- Acceptance criteria: scenarios load from Supabase, filter works, click navigates to `/scenarios/[id]`

**New E: FloatingMetricChip + Map Overlay Metrics**
- Component: `FloatingMetricChip` — positioned absolutely over `MapSide`
- Chips to show: Oil price + % change, Strait status (OPEN/BLOCKED), US air defense %
- Colors: `--status-critical` for blocked/degraded, `--text-secondary` for normal
- Updates reactively from GameContext `scenarioSnapshot.globalState`
- Acceptance criteria: chips visible on map, update when scenario state changes

**New F: IntelligenceReportBlock + ConstraintCascadeAlert**
- Two shared components in `components/game/`
- `IntelligenceReportBlock`: monospace text block, 4px gold left-border, `[SECTION]` header style, dark container background. Used in decision rationale and briefing sections.
- `ConstraintCascadeAlert`: 4px `--status-critical` left-border card, warning icon, title + detail text, cascade steps listed in IBM Plex Mono. Used in actors panel and chronicle.
- Acceptance criteria: both components render correctly with provided props, used in at least one parent component each

---

## 5. Execution Order

### Track 1 — Design Foundation (Partner A)
1. **Updated #28 + New A** — Design token migration first. Unblocks all other frontend work.
2. **New F** — Shared game components (IntelligenceReportBlock, ConstraintCascadeAlert). Unblocks #24, #30.
3. **Updated #21, #22** — Actor panel + detail (uses new shared components)
4. **Updated #20** — Game layout shell (collapsible map)
5. **New B + New C** — Scenario Hub + Actors Hub
6. **New D** — Scenario Browser
7. **Updated #25** — War Chronicle
8. **New E** — FloatingMetricChip

### Track 2 — Game Engine Wiring (Partner B)
**Prerequisite: Updated #28 and New F from Track 1 must be merged before Track 2 frontend work begins.** Backend wiring (API routes, game loop) can proceed in parallel, but any component that references Stitch tokens, IntelligenceReportBlock, or ConstraintCascadeAlert must wait for the Track 1 design foundation.

- Updated #23 — Decision catalog + TurnPlan builder
- Updated #24 — Decision analysis
- Updated #26 — Events tab
- Updated #29 — Dispatch terminal (wired to Supabase Realtime)
- Updated #30, #31 — Cascade + reaction phase
- Updated #32 — Realtime subscriptions

---

## 6. Reference Files

- Stitch mockups: `docs/frontend_mockups/` (01–07)
- Component tree: `docs/component-tree.ts`
- Existing design system (to be replaced by #28): `docs/strategos-design-system.md`, `docs/frontend-design.md` — rewrite both in-place to reference Stitch. Do **not** delete them; `CLAUDE.md` imports both via `@docs/` directives and those imports must continue to point to valid, updated files.
- Existing issues: `docs/scrum-issues.md`
- Game state: `components/providers/GameProvider.tsx`
