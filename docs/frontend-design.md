# GeoSim Frontend Design Vision

> **Relationship to `strategos-design-system.md`:** That document defines the token system
> (colors, spacing, borders, base typography). This document defines the *identity* — the
> concept, the signature moments, and the surface-by-surface treatment that makes GeoSim
> feel unlike anything else. Read both before building any UI.

---

## The Concept: Declassified War Room

GeoSim should feel like a real US government intelligence monitoring system that has been
partially declassified and made accessible to researchers. Every surface carries institutional
weight. The user isn't playing a game — they're reading actual intercepts, building actual
intelligence pictures, and making decisions that will be recorded in the historical record.

**The test for every design decision:** Does this look like it belongs in a SCIF, or does it
look like a SaaS dashboard? If it's the latter, reconsider.

### What makes generic AI apps feel samey (avoid all of this)

- Purple-to-blue gradient backgrounds
- White cards with heavy `box-shadow`
- Inter or system-ui as the only font
- Rounded corners above 6px
- "Glassmorphism" blur effects
- Glowing neon accents
- Chat-style message bubbles
- Smooth bouncy transitions
- Emoji in functional UI

### What gives GeoSim its identity

Four specific things. Every one must be executed without compromise.

1. **The classification banner** — a single institutional stripe that sets tone in 200ms
2. **Three-font typography** with extreme contrast between roles
3. **The chronicle as intelligence dispatch** — not a feed, a document
4. **Turn resolution as incoming intercepts** — not a spinner, a live briefing

---

## Signature Elements

### 1. Classification Banner

A fixed stripe at the very top of every page. Non-interactive, purely atmospheric.

```
◆  SECRET // GEOSIM ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY  ◆
```

```css
height: 24px;
background: #0A0D12;
border-bottom: 1px solid rgba(201, 152, 58, 0.25);
font-family: var(--font-mono);
font-size: 9px;
letter-spacing: 0.12em;
color: rgba(201, 152, 58, 0.6);   /* gold, dimmed */
text-transform: uppercase;
display: flex;
align-items: center;
justify-content: center;
```

This stripe is the single fastest signal that GeoSim is serious. Never remove it.
On the Iran scenario, the classification changes to `TOP SECRET // NOFORN // IRAN-CONFLICT`.

### 2. Document ID Header

Every major view has a document identifier in the top-left corner, monospace, tertiary text:

```
GEOSIM-IRN-2026-0322 // BRANCH: MAIN // TURN 04 / 12
```

This replaces a generic breadcrumb. It makes the user feel like they opened a classified file,
not navigated to a page.

### 3. Section Dividers

Replace horizontal rules with document-style dividers:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILITARY ASSESSMENT // UNITED STATES // AS OF TURN 04
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```css
font-family: var(--font-mono);
font-size: 8px;
letter-spacing: 0.06em;
color: var(--text-tertiary);
text-transform: uppercase;
margin: 16px 0 12px;
```

---

## Typography — Stitch Four-Font System

The Strategos design system defined three font roles. The Stitch migration (2026-03-24)
upgrades to four fonts and loads them via `next/font/google` — never a `<link>` tag.

### Font Stack

```css
--font-sans:  var(--font-inter), 'Inter', system-ui, sans-serif;
--font-serif: var(--font-newsreader), 'Newsreader', Georgia, serif;
--font-label: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
--font-mono:  var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace;
```

**Why these specifically:**

- **Inter (`--font-sans`)** — the gold standard for dense UI text. Highly legible at 11–13px,
  neutral enough to disappear as chrome. Used for body copy, descriptions, panel content —
  anywhere text needs to be readable without calling attention to itself.
- **Newsreader (`--font-serif`)** — an editorial serif designed for long-form reading on screen.
  When someone reads the war chronicle, they should feel like they're reading a serious book
  about a historical event. 15px / line-height 1.75 in the chronicle. Supports italic for
  stylistic emphasis without switching fonts.
- **Space Grotesk (`--font-label`)** — slightly geometric, slightly condensed, technical without
  being cold. The "telemetry" voice: labels, badges, section overlines, button text, actor names,
  tab labels. Gives UI elements a precision-instrument quality with excellent screen rendering.
- **IBM Plex Mono (`--font-mono`)** — institutional, slightly cold, designed by IBM for technical
  documents. All numbers, all timestamps, all scores, all coordinates. Never use a proportional
  font for data.

### Loading — next/font/google ONLY

```tsx
// app/layout.tsx — the ONLY correct way to load fonts in this project
import { Inter, Newsreader, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', style: ['normal', 'italic'], display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' })
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-ibm-plex-mono', weight: ['400', '500'], display: 'swap' })
```

**Never** use a `<link>` tag for Google Fonts. `next/font/google` self-hosts the fonts,
eliminates the external request, and ensures the CSS variables are available from first render.

### Application Rules

| Context | Font | Tailwind class | Size | Weight | Notes |
|---|---|---|---|---|---|
| Classification banner | IBM Plex Mono | `font-mono` | 9px | 400 | Letter-spacing 0.12em |
| Document IDs | IBM Plex Mono | `font-mono` | 9px | 400 | Tertiary color |
| Section overlines | Space Grotesk | `font-label` | 10px | 700 | Uppercase, letter-spacing 0.08em |
| Actor names | Space Grotesk | `font-label` | 13px | 600 | |
| Panel body text | Inter | `font-sans` | 12px | 400 | |
| Button labels | Space Grotesk | `font-label` | 11px | 600 | Uppercase |
| Decision titles | Space Grotesk | `font-label` | 13px | 600 | |
| Tag / badge labels | Space Grotesk | `font-label` | 9px | 500 | |
| All scores / numbers | IBM Plex Mono | `font-mono` | varies | 500 | Never use sans for numbers |
| All timestamps | IBM Plex Mono | `font-mono` | 9px | 400 | Tertiary color |
| Chronicle prose | Newsreader | `font-serif` | 15px | 400 | Line-height 1.75, --text-secondary |
| Chronicle entity names | Newsreader | `font-serif` | 15px | 500 | --text-primary, no bold |
| Chronicle titles | Space Grotesk | `font-label` | 17px | 700 | Uppercase |
| Decision rationale | Newsreader | `font-serif` | 13px | 400 | Line-height 1.65 |

---

## Surface-by-Surface Treatment

### The War Chronicle

The most distinctive surface. This is where GeoSim's identity is most visible.

**Each turn entry is a received intelligence dispatch, not a feed card.**

Structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTEL BRIEF  //  TURN 04  //  22 MARCH 2026  //  SEVERITY: CRITICAL
SOURCE: GEOSIM RESOLUTION ENGINE  //  CONFIDENCE: HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Title in Space Grotesk Bold, ~17px]

[Narrative prose in Newsreader, 15px, line-height 1.75]

[Tag row: severity dot + dimension tags]

[Expand to reveal: decisions made, escalation changes, judge scores]
```

**Expand animation:** When the user clicks to expand, the document "opens" — a border-reveal
from top to bottom over 300ms, then content fades in. Feels like unsealing a classified file.

```css
/* Collapsed state */
.chronicle-detail {
  max-height: 0;
  overflow: hidden;
  border-top: 0px solid var(--border-subtle);
  transition: max-height 300ms ease, border-top-width 300ms ease;
}

/* Expanded state */
.chronicle-detail.open {
  max-height: 800px;
  border-top: 1px solid var(--border-subtle);
}
```

**Left border color by severity** (from Strategos, kept):
- Critical: `--actor-iran` (crimson)
- Major: `--gold`
- Moderate/diplomatic: `--actor-us` (blue)
- Minor: `--border-subtle`

### Turn Resolution: The Dispatch Sequence

When the AI resolves a turn, the center of the screen switches to a full-panel terminal
view. No spinner. No progress bar. Live incoming dispatches.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GEOSIM RESOLUTION ENGINE  //  TURN 04 ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[22:14:03]  RESOLUTION ENGINE ACTIVE
[22:14:04]  PROCESSING 6 ACTOR TURNPLANS...
[22:14:05]  ACTOR: UNITED STATES — PLAN RECEIVED
[22:14:05]  ACTOR: IRAN — PLAN RECEIVED
[22:14:06]  COLLISION DETECTED: STRAIT OF HORMUZ
[22:14:07]  EVENT CONFIRMED: STRAIT CLOSURE — SEVERITY: CRITICAL
[22:14:08]  CASCADING EFFECTS: 4 ACTORS AFFECTED
[22:14:09]  ECONOMIC IMPACT: OIL PRICE +12% (+$17/BBL)
[22:14:10]  JUDGE EVALUATION IN PROGRESS...
[22:14:11]  PLAUSIBILITY: 82/100  //  CONSISTENCY: 79/100
[22:14:12]  NARRATOR GENERATING CHRONICLE ENTRY...
[22:14:13]  TURN 04 COMPLETE — ADVANCING TO PLANNING PHASE
```

```css
/* Each line stamps in with a 40ms stagger, no animation — just appears */
.dispatch-line {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  padding: 2px 0;
  opacity: 0;
  animation: stamp-in 0ms forwards;
}

.dispatch-line.timestamp {
  color: var(--text-tertiary);
}

.dispatch-line.event-critical {
  color: var(--status-critical);
}

.dispatch-line.event-confirmed {
  color: var(--gold);
}

@keyframes stamp-in {
  to { opacity: 1; }
}
```

**The cursor:** A blinking amber block cursor (`▋`) appears after the last line while
the engine is still working. Disappears when complete.

This is the moment users will screenshot. It should feel real.

### Actor Detail Panel

Each actor opens as a classified dossier, not a modal. The panel slides in from the right.

The header:

```
┌─────────────────────────────────────────────────────────┐
│  DOSSIER: UNITED STATES OF AMERICA                      │
│  CLASSIFICATION: SECRET // GEOSIM-IRN                   │
│  LAST UPDATED: TURN 04 // 22 MARCH 2026                 │
└─────────────────────────────────────────────────────────┘
```

Section headers use the `━━━ SECTION TITLE ━━━` divider pattern.

The escalation ladder: render as a horizontal bar divided into numbered segments. The
current rung glows gold. Higher (dangerous) rungs shift toward crimson. The rung label
beneath uses IBM Plex Mono.

The intelligence picture section — a separate sub-section for each other actor, with
`BELIEVED STATE` and `ACTUAL STATE` columns side by side in observer mode. In single-actor
mode, the ACTUAL STATE column is hidden and replaced with `[REDACTED]` in the cells.

### Decision Cards

Decisions are denser than most UIs. Each card is a miniature briefing slide.

```
┌─────────────────────────────────────────────────────────────┐
│  LAUNCH COASTAL GROUND OPERATION                            │
│  ─────────────────────────────────────────────────────────  │
│  MILITARY  ●  ESCALATION: RUNG 5→7  ●  RESOURCE: HEAVY     │
│  ─────────────────────────────────────────────────────────  │
│  Establishes physical control of Strait coastline.          │
│  Addresses Strait closure but requires 80-150K troops.      │
└─────────────────────────────────────────────────────────────┘
```

The description line uses Inter 12px (not Newsreader — the catalog is UI, not prose).
The detail panel that opens when you click "Analyze" switches to Newsreader for the
strategic rationale.

### Map

**Extend beyond Strategos:** The map should feel like a real operational map, not a
styled basemap. Additional elements:

- **Coordinate grid overlay** at medium zoom: thin `rgba(255,255,255,0.04)` lines with
  MGRS-style labels at grid intersections. IBM Plex Mono, 8px.
- **Actor fill opacity** is dynamic: actors in `active operations` have slightly brighter
  fill (`0.12` vs `0.06`). Actors at high escalation rungs have a barely-visible crimson
  tint over their territory.
- **Strait of Hormuz when blocked:** A dashed crimson line across the strait with a
  `BLOCKED` label. The dashes animate (stroke-dashoffset) at 4s to suggest the closure
  is ongoing, not static.
- **Resolution animation:** When a strike event fires, draw a trajectory arc from
  origin to target over 600ms, then a brief flash at the target. No explosions —
  a subtle `radial-gradient` pulse that fades over 400ms.

---

## Page Identity

The top bar (42px, from Strategos) should contain:

**Left:** GeoSim wordmark — `GEOSIM` in Space Grotesk Bold, 16px, gold. Followed by
a thin separator and the scenario name in IBM Plex Mono, 10px, tertiary.

**Center:** Classification banner text (or blank if unclassified scenario).

**Right:** Turn indicator `TURN 04 / 12`, game mode badge, user avatar.

---

## What To Avoid (additions to Strategos list)

- **No loading spinners.** Use the dispatch sequence animation for async operations.
  For fast operations (<500ms), skip animation entirely.
- **No toast notifications.** Critical events are logged as dispatch lines. Minor
  confirmations appear as document-header status updates.
- **No modals.** Everything slides in as a panel. The dossier pattern — slide from right,
  existing content stays visible behind.
- **No pagination.** The chronicle scrolls infinitely. The decision catalog scrolls
  within its container. Virtual windowing if performance requires it, but never pages.
- **No hero gradients.** The map is the visual hero. Panel backgrounds are flat dark surfaces.
- **No "AI-ness."** No robot icons, no typing indicators, no "Claude is thinking" labels.
  The system speaks in dispatches and timestamps, not chat messages.

---

## Implementation Priority

When building the frontend, implement surfaces in this order. Each one proves out
the aesthetic before investing in the next.

1. **Classification banner + document ID header** — 30 minutes, immediate identity
2. **War chronicle entry component** — the flagship surface, proves the three-font system
3. **Turn resolution dispatch animation** — the most memorable moment
4. **Actor dossier panel** — the deepest content surface
5. **Decision catalog + TurnPlan builder** — the most complex interaction
6. **Map extensions** — coordinate grid, trajectory animations, dynamic fills

The first three items can be built with mock data before any API is live. Build them
early and show them to people — they will immediately understand what GeoSim is.

---

## Reference Documents

- `docs/strategos-design-system.md` — color tokens, spacing, border radius, base patterns
- `docs/all-ui-mockups.html` — interactive mockups showing layout and component structure
- `docs/component-tree.ts` — React component hierarchy and state management
- `docs/prd.md` — product principles, especially section 2.4 (Transparency) and section 7 (Frontend)
