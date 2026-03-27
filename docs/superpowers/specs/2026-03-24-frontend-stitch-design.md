# GeoSim Frontend — Stitch Design Spec
**Date:** 2026-03-24
**Status:** Approved
**Approach:** Spec First → Parallel Tracks (design system + game view)

---

## Overview

This spec defines the frontend implementation plan for GeoSim Sprint 2, updated to adopt the **Analytical Noir** design language from `docs/frontend_mockups/DESIGN.md` as the **authoritative and guiding truth** for all frontend design decisions. The Stitch-generated DESIGN.md export supersedes `strategos-design-system.md` and `frontend-design.md` as the visual source of truth.

**Creative North Star: "The Sovereign Intelligence."** This system rejects generic SaaS aesthetics in favor of rigid architectural precision. Intentional asymmetry, tonal layering, Strategic Clusters grouped by cognitive priority — not mathematical grids. Every design decision is evaluated against this standard: does this look like a high-end command center, or a consumer app? The 7 Stitch-generated screens realize this vision; where screens conflict with DESIGN.md text, DESIGN.md takes precedence.

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

/* Surface variant + outline tokens (Analytical Noir) */
--surface-variant:        rgba(255,255,255,0.06)  /* Floating overlays at 60% opacity + 20px blur */
--outline:                #414751   /* Branching timeline main axis */
--outline-variant:        rgba(65,71,81,0.15)     /* Ghost Border — felt, not seen */
--primary-container:      #bc8700   /* Button pressed state, command gradient end */
--on-primary:             #131313   /* Text on gold/primary backgrounds */
--secondary-container:    rgba(164,201,255,0.15)  /* Strategic chips background */
--on-secondary-container: #a4c9ff   /* Strategic chips text */

/* Status — Analytical Noir semantics */
/* Stable = secondary (#a4c9ff "Command-Center Blue") — NOT green */
/* Caution = primary (#ffba20 gold) */
/* Critical = tertiary (#ffb4ac coral) */
--status-critical:        #ffb4ac   /* Coral — Stitch tertiary */
--status-critical-bg:     rgba(255,180,172,0.12)
--status-critical-border: rgba(255,180,172,0.30)
--status-warning:         #ffba20   /* Gold — caution */
--status-warning-bg:      rgba(255,186,32,0.15)
--status-stable:          #a4c9ff   /* Command-Center Blue — stable/safe. NOT green. */
--status-stable-bg:       rgba(164,201,255,0.12)
--status-info:            #a4c9ff   /* Same as stable — sky blue */
--status-info-bg:         rgba(164,201,255,0.12)
--status-info-border:     rgba(164,201,255,0.25)
```

### 1.2 Typography (DESIGN.md roles — three distinct fonts, three distinct roles)

**Critical: DESIGN.md assigns each font a specific role. Do not swap them.**

```css
--font-display: 'Newsreader', Georgia, serif;         /* Display & Headline ONLY */
--font-ui:      'Inter', system-ui, sans-serif;       /* UI & Title — all interface chrome */
--font-label:   'Space Grotesk', sans-serif;          /* Labels ONLY — telemetry, coordinates, data */
--font-mono:    'IBM Plex Mono', monospace;           /* Code, timestamps, classification */
```

**Font role assignments (from DESIGN.md — strictly enforced):**

| Font | Role | Contexts |
|---|---|---|
| **Newsreader** | Display & Headline | Chronicle narrative prose, simulation titles, war room headers — the "literary/historical" role |
| **Inter** | UI & Title | Navigation, panel labels, button text, actor names, section overlines, body UI text — everything interactive |
| **Space Grotesk** | Labels only (`label-md`, `label-sm`) | Telemetry readouts, coordinates, military unit data, score values, escalation rung numbers |
| **IBM Plex Mono** | Timestamps / classification | Classification banner, document IDs, timestamps, intelligence report `[HEADERS]` |

**Usage table:**

| Context | Font | Size | Notes |
|---|---|---|---|
| Classification banner | IBM Plex Mono | 9px | Letter-spacing 0.12em, uppercase |
| Document IDs / timestamps | IBM Plex Mono | 9px | Tertiary color |
| Section overlines / nav labels | Inter | 10px | Uppercase, letter-spacing 0.08em |
| Actor names / card titles | Inter | 13px | Semibold |
| Button labels | Inter | 11px | Uppercase, semibold |
| Panel body text | Inter | 12px | Regular |
| All telemetry / scores / numbers | Space Grotesk | varies | `label-md` / `label-sm` — evokes command-center |
| Coordinates, unit counts, rung numbers | Space Grotesk | 10–12px | Geometric construction = technical authority |
| Chronicle prose | Newsreader | 15px | Italic, line-height 1.75 — literary authoritative weight |
| Chronicle entity names | Newsreader | 15px | Non-italic, --text-primary |
| Simulation titles / Chronicle headers | Newsreader | 17–20px | Display weight |
| Decision rationale prose | Newsreader | 14px | Italic, line-height 1.65 |
| Intelligence report block headers | IBM Plex Mono | 10px | `[SECTION]` style, monospace |

Load from Google Fonts via `next/font/google` with `variable` option (not `<link>` tag):
```ts
// app/layout.tsx
import { Inter, Newsreader, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', style: ['normal', 'italic'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-ibm-plex-mono', weight: ['400', '500'] })
```

### 1.3 Design Principles (Analytical Noir — DESIGN.md authoritative)

**Surface Hierarchy — depth via nesting, NOT elevation:**
- `surface` (#131313) → deepest, outermost canvas
- `surface_container_low` → large navigational sidebars
- `surface_container_high` → primary data modules
- Boundaries defined **solely** by background transitions — never by lines

**The No-Line Rule (DESIGN.md — strict):**
`1px solid borders are strictly prohibited for sectioning.` Use background color transitions between `surface_container_low` and `surface_container_highest` to define boundaries. No HR elements, no divider borders between sections.

**The 0px Border Radius Rule (DESIGN.md — strict, no exceptions):**
`border-radius: 0` on ALL containers, cards, panels, buttons, chips, and interactive elements. This is non-negotiable — rounded corners signal consumer/mobile UI, not analytical rigor.

**Command Gradient (primary CTAs and critical status indicators only):**
```css
background: linear-gradient(to right, #ffba20, #bc8700);
/* "Metallic tactical feel" — DO NOT use for secondary/ghost elements */
```

**Tactical Glass (floating overlays only — map popups, context menus):**
```css
background: rgba(/* surface_variant color */, 0.60);
backdrop-filter: blur(20px);
/* Allows map to bleed through — spatial awareness preserved */
```

**Ghost Border (high-density data tables only — NOT for sectioning):**
```css
border: 1px solid rgba(/* outline_variant */, 0.15);
/* Should be "felt, not seen" — extremely subtle */
```

**Ambient Shadows (floating elements only — context menus, tooltips):**
```css
box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
/* Must be tinted with secondary color hint — NOT standard grey */
/* Standard grey shadows are prohibited everywhere */
```

**Button Hover Behavior:**
Buttons shift in tonal value on hover — e.g., `primary` (#ffba20) → `primary_fixed` (#bc8700). They do **NOT** glow. No box-shadow, no brightness increase, no neon effect.

**Status Color Semantics (DESIGN.md — do NOT deviate):**
- **Stable/Safe** = `secondary` (#a4c9ff "Command-Center Blue") — NOT safety green
- **Caution** = `primary` (#ffba20 gold)
- **Critical Threat** = `tertiary` (#ffb4ac coral)

**Strategic Chips:**
```css
background: var(--secondary-container);   /* rgba(164,201,255,0.15) */
color: var(--on-secondary-container);     /* #a4c9ff */
border-radius: 0;                         /* square — Noir aesthetic */
```

**Threat Assessment Gauges (escalation bars, readiness bars):**
- Stable state: filled with `secondary` (#a4c9ff)
- Caution state: filled with `primary` (#ffba20)
- Critical state: filled with `tertiary` (#ffb4ac)

**Branching Timeline visualization:**
```css
/* Main axis */ border-color: var(--outline);         /* #414751 */
/* Active node */ background: var(--gold);            /* #ffba20 */
/* Alternate branch */ border: 1px dashed var(--outline-variant); /* 15% opacity */
```

**Additional prohibitions:**
- No spinner during turn resolution — use dispatch terminal animation
- No toast notifications — events log as dispatch lines
- No modals — everything slides in as a panel
- No rounded corners (0px is the system standard — see above)
- No standard grey shadows — use ambient shadow spec above or nothing
- Topographic grid texture on page backgrounds only

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
- `Button` — **Primary:** 0px radius, Command Gradient (#ffba20→#bc8700), Inter uppercase label, hover = tonal shift to `primary_fixed` (#bc8700), no glow. **Secondary/Ghost:** 0px radius, Ghost Border (outline_variant 15%), transparent bg.
- `ClassificationBanner` — gold #ffba20, IBM Plex Mono, letter-spacing 0.12em
- `DocumentIdHeader` — IBM Plex Mono, 9px, `--text-tertiary`
- `ExpandableSection` — 0px radius, no divider borders, background transition for open state
- `ProgressBar` — Stitch status color scale: #a4c9ff (stable) / #ffba20 (caution) / #ffb4ac (critical). NO green.
- `ScoreDisplay` — Space Grotesk (`label-md`) for numeric values, Stitch status thresholds
- `SectionDivider` — Inter 10px uppercase overline style (Inter for UI chrome, NOT Space Grotesk)
- `SlideOverPanel` — `--bg-surface-low` background, 0px radius, Ambient Shadow on floating edge
- `TopBar` — Inter for wordmark and nav labels, IBM Plex Mono for scenario ID/turn counter

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
- Load all four fonts via `next/font/google` with `variable` option in `app/layout.tsx`: Inter, Newsreader, Space_Grotesk, IBM_Plex_Mono
- Set `fontFamily` in `tailwind.config.ts` to reference CSS variables (`var(--font-inter)`, `var(--font-newsreader)`, etc.)
- **No `<link>` tag** for fonts — self-hosted via next/font
- Acceptance criteria: `bun run typecheck` passes, dev server shows all four fonts in correct roles, `border-radius: 0` everywhere, Command Gradient on primary CTAs

**New B: Scenario Hub Page — `/scenarios/[id]`**
- Route: `app/scenarios/[id]/page.tsx`
- Components: scenario header (name, classification tag, description), branch selector list, "Start New Branch" + "Resume" CTAs
- Two tabs: Timeline (simplified branch tree) and Actors (Strategic Actors Hub — see New C)
- Connects to `GET /api/scenarios/[id]` and `GET /api/scenarios/[id]/branches`
- Acceptance criteria: page renders with mock data, branch selection navigates to `/play/[branchId]`

**New C: Strategic Actors Hub Section**
- Component: `ActorCard` — Stitch screen 05 reference
- Card contents: actor name (Inter bold, large), status badge (Stable/Escalating/Critical in Analytical Noir colors: #a4c9ff/#ffba20/#ffb4ac), key metrics grid (2-3 values in Space Grotesk `label-md`), escalation progress bar (Threat Gauge color scale), "View Dossier" button (0px radius, Inter)
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
