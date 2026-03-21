# Strategos — UI Design System

This document defines the visual language for Strategos. The goal is a UI that feels like a serious geopolitical intelligence tool — not a game, not a consumer app. Think classified briefing room, war room display, long-form journalism. Every decision should reinforce analytical weight and seriousness.

---

## Core Philosophy

- **Dark, not black.** Deep slate navy backgrounds, not pure black. Pure black reads as a gaming aesthetic.
- **Amber gold as the primary accent.** Used sparingly — active states, selected elements, key data points. Evokes cartography, brass instruments, archival material.
- **Muted, not neon.** All actor and status colors are desaturated and purposeful. No cyan, no electric blue, no neon red.
- **Type hierarchy does the heavy lifting.** Three type roles: sans-serif for UI chrome, serif for narrative/chronicle prose, monospace for all numerical data.
- **Thin borders, not cards with shadow.** `1px` solid borders with low-opacity white. No `box-shadow` drop shadows — they feel like consumer product UI.

---

## Color Tokens

### Backgrounds

```
--bg-base:       #0D1117   /* Page / outermost shell */
--bg-surface-1:  #161B24   /* Panels, sidebars, top bar */
--bg-surface-2:  #1D2433   /* Cards, metric blocks, input fields */
--bg-surface-3:  #242B3D   /* Hovered cards, active items */
```

### Borders

```
--border-subtle:  rgba(255, 255, 255, 0.08)   /* Default panel borders */
--border-hi:      rgba(255, 255, 255, 0.14)   /* Emphasized borders, hover states */
```

### Text

```
--text-primary:    #E8E4DC                    /* Headlines, labels, body */
--text-secondary:  rgba(232, 228, 220, 0.55)  /* Muted labels, descriptions */
--text-tertiary:   rgba(232, 228, 220, 0.32)  /* Hints, timestamps, section labels */
```

### Accent — Gold (primary interactive color)

```
--gold:         #C9983A
--gold-dim:     rgba(201, 152, 58, 0.18)   /* Selected card backgrounds */
--gold-glow:    rgba(201, 152, 58, 0.08)   /* Subtle active state fill */
--gold-border:  rgba(201, 152, 58, 0.40)   /* Gold-accent borders */
```

### Actor Colors (faction identity — never use neon variants)

```
--actor-us:       #4A7FA5   /* United States — steel diplomatic blue */
--actor-iran:     #8B2635   /* Iran — muted crimson */
--actor-israel:   #C9983A   /* Israel — shares gold accent */
--actor-russia:   #7B68C8   /* Russia — muted purple */
--actor-generic:  #5EBD8E   /* Neutral/other actors — desaturated green */
```

### Status / Escalation

```
--status-critical:   #E27085   /* Text on crimson background */
--status-critical-bg: rgba(139, 38, 53, 0.18)
--status-critical-border: rgba(139, 38, 53, 0.30)

--status-warning:    #C9983A   /* Same as gold — major events */
--status-warning-bg: rgba(201, 152, 58, 0.15)

--status-stable:     #5EBD8E
--status-stable-bg:  rgba(40, 140, 90, 0.20)

--status-info:       #7BAED4
--status-info-bg:    rgba(74, 127, 165, 0.15)
--status-info-border: rgba(74, 127, 165, 0.25)
```

---

## Typography

### Font Stack

```
--font-sans:  system-ui, -apple-system, 'Inter', sans-serif
--font-serif: Georgia, 'Lora', 'Times New Roman', serif
--font-mono:  'JetBrains Mono', 'IBM Plex Mono', 'Fira Mono', monospace
```

### Usage Rules

- **`--font-sans`** — all UI chrome: labels, buttons, tabs, panel headers, actor names, tags.
- **`--font-serif`** — War Chronicle narrative text only. When the UI switches into prose mode (chronicle entries, turn narratives, decision rationale), switch to serif. This is the single most important typographic decision — it signals "you are reading history."
- **`--font-mono`** — all numerical data: turn counters, dimensional scores (military: 82), oil prices, timestamps in chronicle headers, escalation rung numbers.

### Type Scale

```
/* Section labels / overline */
font-size: 9px;
font-weight: 400;
letter-spacing: 0.08em;
text-transform: uppercase;
color: var(--text-tertiary);

/* Tags / badges */
font-size: 9px–10px;
font-weight: 400;
letter-spacing: 0.03em;

/* Chronicle date / metadata */
font-size: 9px;
font-family: var(--font-mono);
color: var(--text-tertiary);

/* Body / panel content */
font-size: 12px–13px;
font-weight: 400;
line-height: 1.5;

/* Card titles / actor names */
font-size: 12px–13px;
font-weight: 500;
color: var(--text-primary);

/* Chronicle body prose */
font-size: 11px–12px;
font-family: var(--font-serif);
line-height: 1.65;
color: var(--text-secondary);

/* Metric values / large numbers */
font-size: 15px–18px;
font-family: var(--font-mono);
font-weight: 500;
```

---

## Component Patterns

### Borders & Radius

- Default border: `1px solid var(--border-subtle)`
- Emphasized border: `1px solid var(--border-hi)`
- Active/selected border: `1px solid var(--gold-border)`
- Border radius: `5px–6px` for cards and rows, `4px` for tags/badges
- **No `box-shadow`** on any component. Elevation is expressed through background color stepping (`--bg-surface-1` → `--bg-surface-2` → `--bg-surface-3`), not shadows.

### Panel Layout

- Top bar: `42px` height, `--bg-surface-1`, `1px` bottom border
- Side panel: `280px` fixed width, `--bg-surface-1`, `1px` left border
- Panel sections separated by `1px solid var(--border-subtle)`
- Section labels: 9px uppercase monochrome overline, `margin-bottom: 8px`
- Inner padding: `12px 14px`

### Tags / Escalation Badges

Tags are small (`9px–10px`), pill-shaped (`border-radius: 3px–4px`), with a colored background and matching text from the status palette. Always include a thin matching border.

```
Military:   bg --status-critical-bg,   text --status-critical,   border --status-critical-border
Diplomatic: bg --status-info-bg,       text --status-info,       border --status-info-border
Economic:   bg rgba(40,140,90,0.20),   text #5EBD8E,             border rgba(40,140,90,0.30)
Escalates:  bg --status-critical-bg,   text --status-critical,   border --status-critical-border
```

### Metric Cards

```
background: var(--bg-surface-2)
border-radius: 5px
padding: 7px 9px
no border

label: 9px uppercase, --text-tertiary, margin-bottom: 3px
value: 15px, --font-mono, font-weight: 500
       → military/info values: --status-info (#7BAED4)
       → warning values:       --gold (#C9983A)
       → danger/low values:    --status-critical (#E27085)
       → healthy values:       --status-stable (#5EBD8E)
```

### Decision Cards

```
background: var(--bg-surface-2)
border: 1px solid var(--border-subtle)
border-radius: 6px
padding: 9px 11px

hover:    border-color var(--border-hi), background var(--bg-surface-3)
selected: border-color var(--gold-border), background var(--gold-glow)

title:    12px, font-weight 500, --text-primary
metadata: flex row, gap 5px, tags + right-aligned cost label in --font-mono --text-tertiary
```

### Buttons

```
Primary:
  background: var(--gold)
  color: #0D1117
  border: none
  border-radius: 5px
  padding: 8px 16px
  font-size: 11px, font-weight 500, letter-spacing 0.03em
  hover: opacity 0.88

Ghost:
  background: var(--bg-surface-2)
  border: 1px solid var(--border-hi)
  color: var(--text-secondary)
  border-radius: 5px
  padding: 8px 10px
  font-size: 11px
  hover: color --text-primary, border-color rgba(255,255,255,0.20)
```

### War Chronicle Entries

```
border-left: 2px solid var(--border-subtle)   /* default */
border-left: 2px solid var(--actor-iran)       /* critical entries */
border-left: 2px solid var(--gold)             /* major entries */
border-left: 2px solid var(--actor-us)         /* diplomatic entries */
padding-left: 12px

date:  9px --font-mono --text-tertiary, letter-spacing 0.04em
title: 12px font-weight 500 --text-primary, margin-bottom 4px
body:  11px–12px --font-serif --text-secondary, line-height 1.65
       → key entity names highlighted in --text-primary (not bold, just color shift)
tags:  flex row, gap 4px, margin-top 5px
```

---

## Map Style (Mapbox)

Start from **Monochrome Dark** base style. The map should function as a **basemap that nearly disappears** — just enough geography to orient, while actor overlays and strategic markers are the visual focus.

### Mapbox Color Overrides

```
Land:            #131A24   /* slightly blue-tinted dark, not grey */
Water:           #0A0F18   /* darker than land for subtle contrast */
Country borders: #3A4D5A   /* blue-grey, visible but not loud */
Roads arterial:  #1E2530   /* barely visible context lines */
Roads local:     hidden
POI labels:      hidden
3D buildings:    off
Road casings:    off
```

### Map Typography

```
Country labels:  DIN Pro or system-ui, uppercase, 10px–12px
                 text-halo: #131A24 (land color), halo-width: 1.5px
City labels:     sentence case, 9px–10px, only major cities
                 hide all sub-city labels
```

### Actor Markers

Use the actor color palette above — not neon, not bright. Markers should be `8px–10px` filled circles with a matching color outer ring at `0.2 opacity` that pulses at `2–3s` interval for active units. Threat lines and arcs use `stroke-dasharray: 4 3`, `opacity: 0.25–0.4`.

### Fog of War

Implement as a Mapbox background layer above terrain but below actor markers. Opacity controlled programmatically: `0` for revealed areas, `0.6–0.75` for fog. In observer mode, disable fog entirely and show a `"Observer mode · Omniscient view"` chip on the map.

---

## Topographic Grid Texture

Behind panels (not the map), use a subtle grid to reinforce the "intelligence dashboard" feel:

```css
background-image:
  repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(232,228,220,0.035) 29px),
  repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(232,228,220,0.035) 29px);
```

Apply at `opacity: 1` — the low opacity is baked into the color value. Use on full-page backgrounds and map overlays only, not inside cards.

---

## Animation Principles

- **Deliberate and weighted, not snappy.** Default transition duration: `150ms–200ms`. Nothing bounces.
- Fade transitions: `opacity` only, `200ms ease`.
- State changes on cards/rows: background color transition, `150ms`.
- Pulse animations for active actor dots: `2s–3s ease-in-out infinite`, opacity cycling `1 → 0.3 → 1`.
- Turn resolution animations: slow, cinematic — `400ms–600ms` staggered per event.
- Always wrap animations in `@media (prefers-reduced-motion: no-preference)`.

---

## What to Avoid

- No `box-shadow` anywhere
- No gradients on UI surfaces (map gradient overlays for fog of war are the only exception)
- No rounded corners above `6px` on interactive elements (`border-radius: 8px+` reads as consumer/mobile)
- No neon or electric accent colors (`#00E5FF`, `#FF2D55`, etc.)
- No uppercase on body text or prose — only section overline labels and country map labels
- No emoji or decorative icons in data-dense contexts
- No animations faster than `150ms` — fast transitions feel gamified
