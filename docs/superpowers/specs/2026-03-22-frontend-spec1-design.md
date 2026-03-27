# GeoSim Frontend — Spec 1: Foundation + Game Shell

**Date:** 2026-03-22
**Issues:** #10, #11, #12, #20, #27, #28
**Spec 2:** Panels + special surfaces (#21–#26, #29) — separate document

---

## Overview

Spec 1 establishes everything required before game content panels can be built: the design system identity, app infrastructure, shared component library, Mapbox map, split-screen game shell, and scenario browser. It delivers a demoable, aesthetically complete shell with real Supabase data and a working auth layer.

The guiding constraint: **identity first**. The classification banner, three-font system, and war chronicle entry are built before any infrastructure — so every subsequent component is built on the correct aesthetic foundation from day one.

---

## 1. Data Architecture

### RSC → GameProvider boundary

The game view at `app/scenarios/[id]/play/[branchId]/page.tsx` is a **React Server Component**. It fetches the initial scenario snapshot from Supabase using the service role client (bypasses RLS), then passes it as `initialSnapshot` to the client `<GameProvider>`. This eliminates loading flash on page load — the user sees a fully populated game view immediately.

```
RSC page.tsx
  └── fetches initialSnapshot (service role, server-only)
      └── <GameProvider initialSnapshot={...}>   ← client boundary
              └── all game UI components
```

Inside `GameProvider`, live updates arrive via **Supabase Realtime** subscriptions on mount:
- `branch:[id]` — turn progress, resolution events
- `commit:[id]` — phase changes, narrative ready

Mutations never go direct to Supabase from components. All writes go through `app/api/` routes which enforce auth server-side.

### GameState shape (two-slice rule)

```typescript
interface GameState {
  // Server data — sourced from RSC initialSnapshot, updated by Realtime
  scenarioSnapshot:   Scenario | null
  availableDecisions: Record<string, Decision[]>
  resolutionResult:   ResolutionResult | null
  reactionTriggers:   ReactionTrigger[]

  // UI state — ephemeral, never persisted, reset independently of server data
  ui: {
    selectedActorId:    string | null
    selectedDecisionId: string | null
    activeTab:          'actors' | 'decisions' | 'events' | 'chronicle'
    viewMode:           'map' | 'chronicle'
    omniscientView:     boolean
    perspectiveActorId: string | null
    slideOver:          'none' | 'actor' | 'decision'
  }

  // Loading
  isResolutionRunning:  boolean
  resolutionProgress:   string[]   // dispatch terminal lines (Spec 2)
  turnPhase:            TurnPhase
}
```

Resetting UI state after a turn (e.g. closing slide-overs, returning to Actors tab) never touches `scenarioSnapshot`.

### Dev bypass (`NEXT_PUBLIC_DEV_MODE=true`)

When the env var is set:

1. `middleware.ts` skips the session check for game routes — no redirect to `/auth/login`
2. `hooks/useDevAuth.ts` returns a hardcoded `devUser` object
3. The RSC fetcher uses the anon key instead of service role and calls `getIranSeedSnapshot()` — automatically loads the Iran scenario ground truth trunk
4. Home page shows a direct link to the game view

Remove or set to `false` to restore full auth.

---

## 2. Design System (Issue #28)

### Concept

GeoSim should feel like a US government intelligence monitoring system that has been partially declassified. The test for every design decision: does this look like it belongs in a SCIF, or a SaaS dashboard?

Four non-negotiable identity elements:
1. **The classification banner** — sets tone in 200ms
2. **Three-font typography** — extreme contrast between UI, prose, and data roles
3. **The chronicle as intelligence dispatch** — not a feed, a document
4. **Turn resolution as incoming intercepts** — not a spinner, a live briefing (Spec 2)

### Classification banner

Fixed 24px stripe at the top of every page. Non-interactive, purely atmospheric.

```
◆  SECRET // GEOSIM ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY  ◆
```

Iran scenario variant: `TOP SECRET // NOFORN // IRAN-CONFLICT`

```css
height: 24px;
background: #0A0D12;
border-bottom: 1px solid rgba(201, 152, 58, 0.25);
font-family: var(--font-mono);
font-size: 9px;
letter-spacing: 0.12em;
color: rgba(201, 152, 58, 0.6);
text-transform: uppercase;
```

### Document ID header

Replaces breadcrumb on all major views. IBM Plex Mono, 9px, tertiary color.

```
GEOSIM-IRN-2026-0322 // BRANCH: MAIN // TURN 04 / 12
```

### Section dividers

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MILITARY ASSESSMENT // UNITED STATES // AS OF TURN 04
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

IBM Plex Mono, 8px, letter-spacing 0.06em, tertiary color, uppercase.

### Three-font system

Load all three via `next/font/google` with the `variable` option in `app/layout.tsx`. Each call generates a separate CSS variable (e.g. `--font-barlow`, `--font-barlow-condensed`, `--font-garamond`, `--font-ibm-plex-mono`). Inject these onto `<html>`. The Tailwind `fontFamily` config (see below) is the source of truth — do **not** declare a manual `--font-sans` variable in `globals.css`, as `next/font` manages these variables automatically.

| Context | Font | Size | Weight |
|---|---|---|---|
| Classification banner | IBM Plex Mono | 9px | 400 |
| Document IDs | IBM Plex Mono | 9px | 400 |
| Section overlines | Barlow Condensed | 10px | 700 uppercase |
| Actor names / decision titles | Barlow Condensed | 13px | 600 |
| Panel body text | Barlow | 12px | 400 |
| Button labels | Barlow Condensed | 11px | 600 uppercase |
| All scores / numbers | IBM Plex Mono | varies | 500 |
| All timestamps | IBM Plex Mono | 9px | 400 tertiary |
| Chronicle prose | EB Garamond | 15px | 400 line-height 1.75 |
| Chronicle entity names | EB Garamond | 15px | 500 |
| Chronicle turn titles | Barlow Condensed | 17px | 700 uppercase |
| Decision rationale (Spec 2) | EB Garamond | 13px | 400 |

### Strategos color tokens (Tailwind extension)

```typescript
// tailwind.config.ts
colors: {
  bg:     { base: '#0D1117', s1: '#161B24', s2: '#1D2433', s3: '#242B3D' },
  gold:   { DEFAULT: '#C9983A', dim: 'rgba(201,152,58,0.18)', border: 'rgba(201,152,58,0.40)' },
  border: { subtle: 'rgba(255,255,255,0.08)', hi: 'rgba(255,255,255,0.14)' },
  text:   { primary: '#E8E4DC', secondary: 'rgba(232,228,220,0.55)', tertiary: 'rgba(232,228,220,0.32)' },
  actor:  { us: '#4A7FA5', iran: '#8B2635', israel: '#C9983A', russia: '#7B68C8', generic: '#5EBD8E' },
  status: { critical: '#E27085', warning: '#C9983A', stable: '#5EBD8E', info: '#7BAED4' },
},
fontFamily: {
  sans:  ['var(--font-barlow)', 'var(--font-barlow-condensed)', 'system-ui'],
  serif: ['var(--font-garamond)', 'Georgia'],
  mono:  ['var(--font-ibm-plex-mono)', 'monospace'],
},
```

### What to avoid

- No `box-shadow` on any component — elevation via background stepping only
- No rounded corners above 6px on interactive elements
- No gradients on UI surfaces (fog-of-war map overlay is the only exception)
- No Inter/system-ui as the sole font anywhere
- No spinner animations — use the dispatch terminal (Spec 2)
- No toast notifications — events go to dispatch log or chronicle
- No modals — everything slides in as a panel

---

## 3. App Structure + Shared Components (Issues #10, #11)

### File changes

```
app/
├── layout.tsx                    REDESIGNED — fonts, providers, banner
├── auth/
│   ├── login/page.tsx            NEW
│   └── callback/route.ts         NEW (Supabase PKCE callback)
├── scenarios/
│   ├── page.tsx                  NEW (#27)
│   └── [id]/play/[branchId]/
│       └── page.tsx              NEW (#20 RSC entry point)

components/
├── providers/
│   ├── GameProvider.tsx          NEW — GameState context + useReducer
│   ├── AuthProvider.tsx          NEW — Supabase session
│   └── RealtimeProvider.tsx      NEW — wired in Spec 2
├── ui/
│   ├── Button.tsx                NEW
│   ├── Badge.tsx                 NEW
│   ├── Card.tsx                  NEW
│   ├── Tabs.tsx                  NEW
│   ├── ProgressBar.tsx           NEW
│   ├── ScoreDisplay.tsx          NEW
│   ├── SlideOverPanel.tsx        NEW
│   └── ExpandableSection.tsx     NEW
├── game/
│   ├── EscalationLadder.tsx      NEW
│   ├── ActorAvatar.tsx           NEW
│   ├── EscalationBadge.tsx       NEW
│   ├── DimensionTag.tsx          NEW
│   └── TurnPhaseIndicator.tsx    NEW
├── layout/
│   ├── ClassificationBanner.tsx  NEW
│   ├── DocumentIdHeader.tsx      NEW
│   ├── SectionDivider.tsx        NEW
│   └── TopBar.tsx                NEW

hooks/
├── useGame.ts                    NEW — access GameState + dispatch
└── useDevAuth.ts                 NEW — dev bypass

tailwind.config.ts                EXTENDED — Strategos tokens
app/globals.css                   EXTENDED — font vars, topographic grid texture
```

### Shared component catalog

**`components/ui/`** — generic primitives, no GameContext dependency:

| Component | Purpose |
|---|---|
| `Button` | Primary (gold bg), Ghost, Danger variants. Barlow Condensed Bold 11px uppercase. No box-shadow. |
| `Badge` | 9–10px IBM Plex Mono, colored by semantic role. Thin matching border. |
| `Tabs` | Underline-style. Active = gold bottom border. |
| `SlideOverPanel` | Right-side slide-in. Overlay dims map. No modal. |
| `ProgressBar` | 4px, colored by value (green/amber/red). |
| `ScoreDisplay` | IBM Plex Mono number. 0–39 red, 40–69 amber, 70–100 green. |
| `ExpandableSection` | Border-reveal open animation 300ms. |
| `TagList` | Flex row of `Badge` components with wrapping. Used in chronicle, actor intel section, decision cards. |

**`components/game/`** — game-specific atoms, pure props:

| Component | Purpose |
|---|---|
| `EscalationLadder` | Horizontal numbered segments. Current rung gold. Higher rungs shift toward crimson. |
| `ActorAvatar` | Colored dot/initials with actor color token. |
| `EscalationBadge` | "Rung 5" pill with color coding. |
| `DimensionTag` | military / economic / diplomatic / intelligence / political / information, fixed color per dimension. |
| `TurnPhaseIndicator` | planning / resolution / reaction / judging badge. |
| `ConfidenceBadge` | confirmed / high / moderate / low / unverified / disputed — color-coded per tier. Used in actor intel picture (Spec 2). |
| `CostMagnitude` | low / moderate / high / extreme — color-coded label. Used in decision cards and analysis (Spec 2). |

**`components/layout/`** — identity shell:

| Component | Purpose |
|---|---|
| `ClassificationBanner` | 24px fixed stripe. Accepts `variant` prop for scenario-specific text. |
| `DocumentIdHeader` | Replaces breadcrumb. Accepts `scenarioId`, `branch`, `turn`, `maxTurns`. |
| `SectionDivider` | `━━━ SECTION TITLE ━━━` pattern. Accepts `title` prop. |
| `TopBar` | 42px bar. GEOSIM wordmark left, scenario name center, turn indicator right. |

---

## 4. Mapbox Tier 1 (Issue #12)

### Map style

Base: **Mapbox Monochrome Dark**.

| Layer | Value |
|---|---|
| Land | `#131A24` |
| Water | `#0A0F18` |
| Country borders | `#3A4D5A` |
| Roads / POI / 3D buildings | hidden |

### Actor fill layer

`fill-color` expression keyed to `ISO_A3` country code, mapped to actor alignment in `scenarioSnapshot`. Opacity: `0.08` default, `0.14` for actors with active operations.

Actor colors: US/Israel `#4A7FA5` · Iran `#8B2635` · Gulf States `#C9983A` · Russia/China `#7B68C8` · Neutral `#5EBD8E`

### Strait of Hormuz

When `scenarioSnapshot` shows the Strait as blocked:
- Dashed crimson line (`#8B2635`) across the Strait
- `stroke-dasharray: 4 3`, animated `stroke-dashoffset` at 4s loop
- `BLOCKED` label in IBM Plex Mono 9px

### Country click → actor select

```
map.on('click', 'country-fill', e) →
  get ISO_A3 from feature →
  lookup actorId in scenarioSnapshot →
  dispatch SELECT_ACTOR to GameContext →
  opens actor slide-over panel (Spec 2)
```

### Component files

```
components/map/
├── GameMap.tsx          — Mapbox GL canvas, token from NEXT_PUBLIC_MAPBOX_TOKEN
├── ActorLayer.tsx       — fill expressions from scenarioSnapshot
├── ChokepointMarker.tsx — Strait pin + status
└── MapLegend.tsx        — actor color key
hooks/useMapbox.ts       — map init, style load, ref management
```

---

## 5. Split-Screen Game Shell (Issue #20)

### Layout

```
<GameLayout>  (flex row, 100vh)
  ├── <MapSide>   (flex: 1.5, ~60%, overflow hidden)
  │   ├── <GameMap>
  │   └── <ObserverOverlay>  (absolute, only in observer mode)
  │       ├── fog-of-war toggle
  │       ├── perspective actor selector
  │       └── auto-advance controls
  └── <PanelSide>  (width: 280px, flex-shrink: 0)
      ├── <TopBar>  (42px, scenario name, turn/phase)
      ├── <DocumentIdHeader>
      ├── <PanelTabs>  (Actors / Decisions / Events / Chronicle)
      ├── <TabContent>  (scrollable flex-1)
      └── <TurnControls>  (Rewind + Advance, pinned bottom)
```

### RSC entry point

`app/scenarios/[id]/play/[branchId]/page.tsx` is a Server Component:

```typescript
// Server: fetch initial snapshot, pass to client provider
const snapshot = isDev
  ? await getIranSeedSnapshot()
  : await getScenarioSnapshot(branchId, supabaseServiceRole)

return <GameProvider initialSnapshot={snapshot}><GameLayout /></GameProvider>
```

`GameProvider` and all children are Client Components (`'use client'`).

#### Security invariants for the service role client

- `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix — it is a server-only env var and must never appear in any file with `'use client'` or in any value passed as a JSX prop to a Client Component.
- `supabaseServiceRole` (the Supabase client instance created from the service role key) is instantiated inside this RSC, used to fetch `snapshot`, and never exported or passed down the component tree.
- `initialSnapshot` (the fetched data) is a plain serializable object — safe to pass as a prop. Only the data crosses the RSC boundary, never the client.
- In dev mode, `getIranSeedSnapshot()` uses the **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), not the service role key — dev mode must never weaken this constraint.

### Observer overlay

Rendered in `MapSide` as `position: absolute; top: 12px; left: 12px`. Only visible when `state.gameMode === 'observer'`. Hidden entirely in single-actor and free-roam modes.

---

## 6. Scenario Browser (Issue #27)

### User flow

```
/scenarios  →  click scenario  →  mode picker  →  actor picker (single-actor only)
           →  branch from commit  →  /scenarios/[id]/play/[branchId]
```

### Scenario browser page (`app/scenarios/page.tsx`)

RSC. Fetches public scenarios from Supabase. Renders `ScenarioCard` grid:
- Name, description, category badge
- Rating stars, branch count, play count
- Iran scenario pinned as featured

### Mode picker

Three cards: Observer / Single Actor / Free Roam. Each with a brief description. Selecting "Single Actor" reveals the actor picker (actor list with colored dot + description). On confirm, POSTs to `POST /api/scenarios/[id]/branches` and redirects to the game view.

### Dev shortcut

`NEXT_PUBLIC_DEV_MODE=true` adds a "Jump to game →" link on the home page pointing directly to `/scenarios/iran-seed/play/trunk`. One click from cold start to game view.

---

## 7. Build Order

Identity-first — each step is independently demoable:

1. `#28` — Classification banner + fonts + Tailwind tokens (30 min, immediate identity signal)
2. `#28` — Static war chronicle entry component (proves three-font system, no API needed)
3. `#10` — Layout, auth flow, GameProvider with dev bypass
4. `#11` — Shared UI component library
5. `#12` — Mapbox map with actor fills and Strait marker
6. `#20` — Split-screen shell with tabs and observer overlay
7. `#27` — Scenario browser with mode picker

Steps 1–2 can be shown to stakeholders before any backend work is done.

---

## 8. Acceptance Criteria

Spec 1 is complete when all of the following pass:

- [ ] `bun run dev` — classification banner visible immediately on page load
- [ ] Three fonts loading: Barlow Condensed, EB Garamond, IBM Plex Mono (verify DevTools Network)
- [ ] Tailwind tokens accessible: `text-gold`, `bg-bg-s1`, `text-actor-iran`, `text-status-critical`, etc.
- [ ] Auth flow: signup, login, logout working via Supabase; middleware redirects unauthenticated users to `/auth/login`
- [ ] `NEXT_PUBLIC_DEV_MODE=true` — app loads with no login, Iran scenario auto-loaded
- [ ] `useGame()` hook returns state from GameContext; throws if called outside `<GameProvider>`
- [ ] All shared UI components render without errors (Button, Badge, Tabs, SlideOverPanel, ProgressBar, ScoreDisplay, ExpandableSection)
- [ ] All game atoms render: EscalationLadder, ActorAvatar, EscalationBadge, DimensionTag
- [ ] Layout components render: ClassificationBanner, DocumentIdHeader, SectionDivider, TopBar
- [ ] Mapbox map renders centered on Middle East with actor country fills
- [ ] Strait of Hormuz shown as blocked with animated dashed line
- [ ] Clicking a country dispatches `SELECT_ACTOR` to GameContext
- [ ] Split-screen layout renders at full viewport height: map (60%) + panel (40%)
- [ ] Tabs switch between Actors / Decisions / Events / Chronicle panels
- [ ] Observer overlay visible in observer mode, hidden in single-actor mode
- [ ] Scenario browser loads from Supabase (or mock); Iran scenario shown as featured
- [ ] Mode picker → actor picker (single-actor) → branch creation → navigates to game view
- [ ] No `box-shadow`, no rounded corners > 6px, no gradient backgrounds in any component
- [ ] No Inter/system-ui as sole font anywhere in the rendered UI

---

## 9. Out of Scope (Spec 2)

The following are explicitly deferred to Spec 2:

- Actor detail dossier panel (#22)
- Decision catalog and TurnPlan builder (#23)
- Decision analysis view (#24)
- War chronicle (full interactive) (#25)
- Events tab + judge scores (#26)
- Actors panel with global indicators (#21)
- Turn resolution dispatch terminal animation (#29)
- Supabase Realtime wiring for live turn updates
- Mapbox Tier 2 (asset markers, animated strikes)
