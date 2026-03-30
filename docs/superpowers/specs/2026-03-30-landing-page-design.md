# Landing Page Design Spec — Issue #29

**Date:** 2026-03-30
**Issue:** #29
**Status:** Approved

---

## Overview

Replace the current `app/page.tsx` component showcase with a real product landing page that communicates what GeoSim is, how it works, and drives users to launch or browse scenarios.

**Design direction:** Option A layout (Intelligence Briefing Document) + Option Y visual treatment (Gold Border Accent System).

---

## Design Principles

- **Aesthetic:** Declassified War Room — reads like a real US government intelligence document made accessible to researchers. Every surface carries institutional weight.
- **No hero gradients.** Flat dark surfaces (`#0c0c0c`, `#0d0d0d`). The gold left border is the hero's visual signal, not a gradient.
- **No generic SaaS patterns** — no white cards, no glassmorphism, no rounded corners above 6px, no emoji.
- **Gold accent (`#ffba20`)** is used for the left border stripe, badge chips, underline on "alternate timeline.", and the primary CTA button only. Not decorative elsewhere.
- **Four-font system** applies throughout: Space Grotesk for labels/headings, IBM Plex Mono for timestamps/IDs, Newsreader for prose body (scenario intel excerpt), Inter for UI copy.

---

## Page Structure

### 1. Classification Banner
- Red stripe (`#b91c1c`), full width, 9px IBM Plex Mono, `letter-spacing: 0.12em`
- Text: `TOP SECRET // GEOSIM // DECLASSIFIED FOR PUBLIC RESEARCH`

### 2. TopBar
- Reuse existing `<TopBar />` component
- Left: `GEOSIM` wordmark in Space Grotesk Bold gold, separator `|`, `STRATEGIC SIMULATION ENGINE` in IBM Plex Mono tertiary

### 3. Document ID Header
- Reuse existing `<DocumentIdHeader />` component
- Fields: `DOC-ID: GS-OVERVIEW-001`, `CLASSIFICATION: UNCLASSIFIED // PUBLIC`, `VERSION: SPRINT 3 // 30 MARCH 2026`

### 4. Hero Section
- **Gold left border** (`border-left: 3px solid #ffba20`), dark background (`#0c0c0c`)
- Overline tag: `INTELLIGENCE-GROUNDED // MULTI-ACTOR // BRANCHING TIMELINES` — IBM Plex Mono, 8px, tertiary, with a short `::before` line element
- **H1** (Space Grotesk Bold, 28px): `Model the decisions that shape history. Explore every alternate timeline.`
  - "alternate timeline." is rendered in gold with a subtle gold underline (`border-bottom: 1px solid rgba(255,186,32,0.4)`)
- **Subheading** (Inter, 13px, secondary, max-width 560px):
  > GeoSim is an AI-powered strategic simulation engine grounded in real-world intelligence data. Load a real-world scenario, watch AI agents model every actor simultaneously, then fork the timeline at any turning point to discover what might have been.
- **CTAs:**
  - Primary: `▸ LAUNCH SIMULATION` — gold fill button (`#ffba20` bg, `#000` text)
  - Ghost: `BROWSE SCENARIOS` — dark border ghost button

### 5. How It Works
- Section opened by a `<SectionDivider title="HOW IT WORKS" subtitle="OPERATIONAL OVERVIEW" />`
- Three steps, each as a row: `[badge chip] [content]`
  - Badge chip: `01` / `02` / `03` — Space Grotesk Bold, gold text, dark background, 1px border `#222`, no rounding
  - Steps separated by `border-bottom: 1px solid #141414`

**Step 01 — Seed**
- Title: `SEED — LOAD REAL-WORLD INTELLIGENCE` (Space Grotesk Bold, 10px, uppercase)
- Body paragraph (Inter, 10px, tertiary): Every simulation begins with verified data. GeoSim seeds each scenario from open-source intelligence sources — military deployments, economic indicators, political alignment scores, and infrastructure vulnerability assessments. Iran 2026 draws from actual Strait of Hormuz shipping data, IRGC order of battle estimates, and US Fifth Fleet positioning records.

**Step 02 — Simulate**
- Title: `SIMULATE — AI AGENTS MODEL EVERY ACTOR`
- Body paragraph: Once seeded, AI agents take control of each actor simultaneously — US, Iran, Israel, Saudi Arabia, China. Each agent operates from its own intelligence picture under fog of war, pursues its own strategic objectives, and selects actions from an escalation ladder calibrated to that actor's doctrine and constraints.
- Bullet list (4 items):
  - Agents submit turn plans with **primary + concurrent actions** — diplomacy, military, economic, cyber
  - A **resolution engine** evaluates interactions and calculates second and third-order effects
  - A **judge** scores the resolution for plausibility and retries if the outcome is implausible
  - A **narrator** renders the turn as a classified intelligence dispatch — timestamped, sourced

**Step 03 — Branch**
- Title: `BRANCH — FORK THE TIMELINE AT ANY DECISION`
- Body paragraph: At any turn, branch the simulation: "What if Iran had chosen differently at Turn 4?" or "What if the US had not repositioned the carrier group?" Each branch is a full parallel timeline with its own chronicle, its own escalation trajectory, and its own outcome.
- Bullet list (3 items):
  - Branches are **git-like** — every turn is an immutable commit, every fork is a new branch
  - Compare timelines **side-by-side** to see how a single decision reshapes the entire trajectory
  - There is no "correct" outcome — every branch reveals a **plausible alternate history**

### 6. Active Scenario — Iran 2026
- Section opened by a `<SectionDivider title="ACTIVE SCENARIO" subtitle="IRAN 2026 — STRAIT OF HORMUZ CLOSURE" />`
- Card: `background: #0d0d0d`, `border: 1px solid #1a1a1a`, **red left border** (`border-left: 3px solid #b91c1c`)
- Card header row: `SECRET` badge (red bg) + scenario title + turn indicator (`TURN 03 // 15 MARCH 2026`) right-aligned
- Intel excerpt (existing prose from current page.tsx), inside a gold left-border annotation block (`border-left: 2px solid #ffba20`)
  - Timestamp, headline in Space Grotesk Bold uppercase, body in Newsreader 15px
  - Badge row: `CRITICAL — GULF INFRASTRUCTURE` (red), `RAS TANURA HIT` (blue), `OIL $142/BBL` (amber)
- Actor strip: `USA`, `IRAN`, `ISRAEL` (active style), `SAUDI ARABIA`, `CHINA` (inactive style) as bordered chips

### 7. Closing CTA Strip
- **Gold left border** matching hero — visually brackets the page
- Label: `READY TO RUN THE SCENARIO? // CHOOSE YOUR ENTRY POINT` (IBM Plex Mono, 8px, tertiary)
- CTAs:
  - Primary: `▸ LAUNCH SIMULATION — IRAN 2026` → links to `/scenarios/iran-2026`
  - Ghost: `BROWSE ALL SCENARIOS` → links to `/scenarios`

---

## Component Reuse

| Component | Usage |
|-----------|-------|
| `<TopBar />` | Unchanged |
| `<DocumentIdHeader />` | With custom props for landing-page doc ID |
| `<SectionDivider />` | Opened each major section |
| `<Badge />` | Intel excerpt tags (variant="critical", "military", "economic") |
| `<Button />` | Hero and closing CTAs (variant="primary", "ghost") |

The intel excerpt prose block and actor chip strip are inline JSX (no new components needed — they're one-off landing page elements, not reusable).

---

## Routing

- `▸ LAUNCH SIMULATION` CTA → `/scenarios/iran-2026`
- `BROWSE SCENARIOS` → `/scenarios`
- Both use Next.js `<Link>` wrapping `<Button>`

---

## Tests

Test file: `tests/components/LandingPage.test.tsx`

Tests to write (TDD — failing first):
1. Renders classification banner with correct text
2. Renders H1 with "Model the decisions that shape history"
3. Renders all three step numbers (01, 02, 03)
4. Renders "LAUNCH SIMULATION" CTA linking to `/scenarios/iran-2026`
5. Renders "BROWSE SCENARIOS" CTA linking to `/scenarios`
6. Renders Iran 2026 scenario card with classification badge
7. Does not render any component showcase elements (badges grid, score display, progress bars from old page)

---

## What This Is Not

- No animations (that's issue #30)
- No real Supabase data fetch (that's issue #28)
- No auth gate (that's issue #40)
- The Iran 2026 intel excerpt is static prose — same content as current page.tsx, just restyled
