# GeoSim Frontend — Stitch Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate GeoSim frontend to the Stitch "Analytical Noir" design language — new color tokens, Inter/Newsreader/Space Grotesk/IBM Plex Mono typography, updated UI primitives, and ~30 new components — while wiring the full game view to live API data. reference @DESIGN.md for guiding design inspiration, use the mockups for reference design wise (components are for inspiration not necessarily alligned with project), and @frontend-checklist.md for philosophy.

**Architecture:** Two parallel tracks. Track 1 (design foundation) must complete Tasks 1–2 before Track 2 begins any frontend work; backend wiring in Track 2 can proceed in parallel. All component tests use React Testing Library; UI components are purely presentational (no Supabase calls in components — hooks fetch, components render).

**Tech Stack:** Next.js 14 App Router, TypeScript 5, React 18, Tailwind CSS, Vitest + React Testing Library, Supabase, Mapbox GL JS. Package manager: `bun` (not npm/npx — WSL2).

---

## File Structure

```
app/
  globals.css                         MODIFY — token replacement
  layout.tsx                          MODIFY — next/font/google import
  scenarios/
    page.tsx                          MODIFY — scenario browser (New D)
    [id]/
      page.tsx                        CREATE — scenario hub (New B)
  chronicle/
    [branchId]/
      page.tsx                        MODIFY — wire to real data (#25)

components/
  ui/
    Button.tsx                        MODIFY — Inter (UI font), Stitch tokens
    Badge.tsx                         MODIFY — Stitch status palette
    ClassificationBanner.tsx          MODIFY — gold #ffba20, letter-spacing 0.2em
    DocumentIdHeader.tsx              MODIFY — IBM Plex Mono, tertiary color
    ExpandableSection.tsx             MODIFY — Stitch toggle style
    ProgressBar.tsx                   MODIFY — Stitch status colors
    ScoreDisplay.tsx                  MODIFY — IBM Plex Mono, Stitch thresholds
    SectionDivider.tsx                MODIFY — Inter overline
    SlideOverPanel.tsx                MODIFY — --bg-surface-low background
    TopBar.tsx                        MODIFY — Inter wordmark
  layout/
    GameLayout.tsx                    CREATE — collapsible 60/40 split shell
    MapSide.tsx                       CREATE — left panel + collapse controls
    PanelSide.tsx                     CREATE — right panel + tab nav
  map/
    GameMap.tsx                       CREATE — Mapbox GL wrapper
    ActorLayer.tsx                    CREATE — country fill layers
    ChokepointMarker.tsx              CREATE — Strait of Hormuz marker
    MapLegend.tsx                     CREATE — actor colors legend
    FloatingMetricChip.tsx            CREATE — overlay metrics (New E)
  game/
    EscalationLadder.tsx              CREATE — 8-rung bar visualization
    ActorAvatar.tsx                   CREATE — colored dot/initials
    EscalationBadge.tsx               CREATE — "Rung N" pill
    DimensionTag.tsx                  CREATE — military/economic/etc tags
    ConfidenceBadge.tsx               CREATE — confirmed/high/moderate/low
    TurnPhaseIndicator.tsx            CREATE — phase badge
    ActorCard.tsx                     CREATE — Strategic Hub card (New C)
    ConstraintCascadeAlert.tsx        CREATE — cascade warning card (New F)
    IntelligenceReportBlock.tsx       CREATE — monospace briefing block (New F)
    DispatchTerminal.tsx              CREATE — turn resolution animation
  panels/
    ActorList.tsx                     CREATE — actor list with escalation badges
    ActorDetailPanel.tsx              CREATE — full actor state dossier
    GlobalIndicators.tsx              CREATE — oil/air defense/support bars
    DecisionCatalog.tsx               CREATE — decisions by dimension
    DecisionDetailPanel.tsx           CREATE — params, profiles, concurrency
    TurnPlanBuilder.tsx               CREATE — primary + concurrent + sliders
    EventsTab.tsx                     CREATE — turn summary + judge scores
    ObserverOverlay.tsx               CREATE — omniscient toggle + perspective
  chronicle/
    ChronicleTimeline.tsx             CREATE — vertical timeline
    TurnEntry.tsx                     CREATE — prose entry + expandable detail
    GlobalTicker.tsx                  CREATE — running totals strip

tailwind.config.ts                    MODIFY — Stitch color aliases
docs/strategos-design-system.md       MODIFY — rewrite to reference Stitch
docs/frontend-design.md               MODIFY — rewrite to reference Stitch

tests/
  components/
    ui/Button.test.tsx                CREATE
    ui/Badge.test.tsx                 CREATE
    game/IntelligenceReportBlock.test.tsx  CREATE
    game/ConstraintCascadeAlert.test.tsx   CREATE
    game/EscalationLadder.test.tsx    CREATE
    game/ActorCard.test.tsx           CREATE
    panels/ActorList.test.tsx         CREATE
    panels/ActorDetailPanel.test.tsx  CREATE
    panels/TurnPlanBuilder.test.tsx   CREATE
    panels/DecisionCatalog.test.tsx   CREATE
    panels/EventsTab.test.tsx         CREATE
    game/DispatchTerminal.test.tsx    CREATE
    layout/GameLayout.test.tsx        CREATE
    chronicle/TurnEntry.test.tsx      CREATE
    chronicle/GlobalTicker.test.tsx   CREATE
```

---

## TRACK 1 — Design Foundation

---

### Task 1: Design Token Migration (#28 + New A)

**Prerequisite for everything else. Complete and merge before any other frontend task.**

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts`
- Modify: `docs/strategos-design-system.md` (rewrite in-place)
- Modify: `docs/frontend-design.md` (rewrite in-place)

- [ ] **Step 1: Switch to `next/font/google` in `app/layout.tsx`**

Remove any `<link>` tag loading fonts. Use `next/font/google` with the `variable` option for all four fonts (self-hosted, no external request at runtime):

```tsx
// app/layout.tsx
import { Inter, Newsreader, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500'],
})

// In the <html> element, spread all four variables:
// <html className={`${inter.variable} ${newsreader.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
```

**DESIGN.md rule:** NO `<link>` tag for fonts anywhere — use `next/font/google` exclusively.

- [ ] **Step 2: Replace all CSS custom properties in `app/globals.css`**

Replace the `:root` block entirely:

```css
:root {
  /* Backgrounds */
  --bg-base:                #0D1117;
  --bg-surface-dim:         #131313;
  --bg-surface-low:         #1c1b1b;
  --bg-surface:             #201f1f;
  --bg-surface-high:        #2a2a2a;
  --bg-surface-highest:     #353534;

  /* Borders */
  --border-subtle:          #414751;
  --border-hi:              #8b919d;

  /* Text */
  --text-primary:           #e5e2e1;
  --text-secondary:         #c1c7d3;
  --text-tertiary:          rgba(229,226,225,0.45);

  /* Gold accent */
  --gold:                   #ffba20;
  --gold-dim:               rgba(255,186,32,0.18);
  --gold-glow:              rgba(255,186,32,0.08);
  --gold-border:            rgba(255,186,32,0.40);
  --gold-dark:              #bc8700;

  /* Actor colors */
  --actor-us:               #4A7FA5;
  --actor-iran:             #8B2635;
  --actor-israel:           #ffba20;
  --actor-russia:           #7B68C8;
  --actor-generic:          #5EBD8E;

  /* Status */
  --status-critical:        #ffb4ac;
  --status-critical-bg:     rgba(255,180,172,0.12);
  --status-critical-border: rgba(255,180,172,0.30);
  --status-warning:         #ffba20;
  --status-warning-bg:      rgba(255,186,32,0.15);
  --status-stable:          #a4c9ff;   /* "Command-Center Blue" per DESIGN.md — NOT green */
  --status-stable-bg:       rgba(164,201,255,0.12);
  --status-info:            #a4c9ff;
  --status-info-bg:         rgba(164,201,255,0.12);
  --status-info-border:     rgba(164,201,255,0.25);

  /* Typography — four-font system per DESIGN.md */
  /* Inter = UI chrome (nav, buttons, labels, panel body) */
  --font-sans:  var(--font-inter), 'Inter', system-ui, sans-serif;
  /* Newsreader = Display & Headline (Chronicle prose, simulation titles) */
  --font-serif: var(--font-newsreader), 'Newsreader', Georgia, serif;
  /* Space Grotesk = Labels ONLY (telemetry, coordinates, military unit data) */
  --font-label: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  /* IBM Plex Mono = Timestamps, classification banners, code */
  --font-mono:  var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace;
}
```

Also update the `body` rule to remove any Barlow references and use `var(--font-sans)`.

- [ ] **Step 3: Update `tailwind.config.ts`**

```typescript
// tailwind.config.ts — colors.extend section
colors: {
  'bg-base':            'var(--bg-base)',
  'bg-surface-dim':     'var(--bg-surface-dim)',
  'bg-surface-low':     'var(--bg-surface-low)',
  'bg-surface':         'var(--bg-surface)',
  'bg-surface-high':    'var(--bg-surface-high)',
  'bg-surface-highest': 'var(--bg-surface-highest)',
  'border-subtle':      'var(--border-subtle)',
  'border-hi':          'var(--border-hi)',
  'gold':               'var(--gold)',
  'gold-dark':          'var(--gold-dark)',
  'status-critical':    'var(--status-critical)',
  'status-warning':     'var(--status-warning)',
  'status-stable':      'var(--status-stable)',
  'status-info':        'var(--status-info)',
  'actor-us':           'var(--actor-us)',
  'actor-iran':         'var(--actor-iran)',
  'actor-israel':       'var(--actor-israel)',
  'actor-russia':       'var(--actor-russia)',
  'actor-generic':      'var(--actor-generic)',
},
fontFamily: {
  sans:  ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
  serif: ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
  label: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],  /* telemetry/coords/unit data */
  mono:  ['var(--font-ibm-plex-mono)', 'IBM Plex Mono', 'monospace'],
},
```

Remove `font-condensed` entry and old `bg-surface-1/2/3` entries.

- [ ] **Step 4: Run typecheck to verify no broken token references**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 5: Start dev server and visually confirm fonts load**

```bash
bun run dev
```

Open `http://localhost:3000`. Verify Inter renders for UI chrome (not system-ui fallback), Space Grotesk renders for label/telemetry elements, Newsreader renders for chronicle text, and gold accent shows `#ffba20` (orange-yellow, not `#C9983A` amber).

- [ ] **Step 6: Rewrite `docs/strategos-design-system.md` in-place**

Replace content to mark Stitch as canonical, include the new token table from Section 1.1 of the spec. Keep the file at the same path — `CLAUDE.md` imports it. Header:

```markdown
# GeoSim Design System — Stitch Edition

> **CANONICAL REFERENCE.** This file supersedes the original Strategos design system.
> The Stitch mockup screens are the authoritative visual source of truth.
> All token values and typography rules below are final.
```

Include all tokens from the spec Section 1.1 and typography table from Section 1.2.

- [ ] **Step 7: Update `docs/frontend-design.md` in-place**

Replace Barlow/EB Garamond references with the four-font system: Inter (UI chrome), Newsreader (chronicle/display), Space Grotesk (labels/telemetry), IBM Plex Mono (timestamps/classification). Update gold hex values from `#C9983A` to `#ffba20`. Add note at top:

```markdown
> **Updated 2026-03-24.** Visual source of truth is now the Stitch mockup screens
> in `docs/frontend_mockups/`. All typography and color decisions in this document
> have been updated to reflect the Stitch design language.
```

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/layout.tsx tailwind.config.ts docs/strategos-design-system.md docs/frontend-design.md
git commit -m "feat: migrate design tokens to Stitch palette — Inter/Newsreader/Space Grotesk/IBM Plex Mono, new gold/status colors (#28)"
```

---

### Task 2: UI Primitives Visual Update (New F / #28)

Update all 10 existing `components/ui/` components to Stitch tokens. These are visual-only changes — no interface changes.

**Files:**
- Modify: `components/ui/Button.tsx`, `Badge.tsx`, `ClassificationBanner.tsx`, `DocumentIdHeader.tsx`, `ExpandableSection.tsx`, `ProgressBar.tsx`, `ScoreDisplay.tsx`, `SectionDivider.tsx`, `SlideOverPanel.tsx`, `TopBar.tsx`
- Create: `tests/components/ui/Button.test.tsx`, `tests/components/ui/Badge.test.tsx`

- [ ] **Step 1: Write failing tests for Button**

```tsx
// tests/components/ui/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders primary variant with gold background', () => {
    render(<Button variant="primary">Submit</Button>)
    const btn = screen.getByRole('button', { name: 'Submit' })
    expect(btn).toHaveClass('bg-gold')
  })

  it('renders ghost variant with border', () => {
    render(<Button variant="ghost">Cancel</Button>)
    const btn = screen.getByRole('button', { name: 'Cancel' })
    expect(btn).toHaveClass('border')
  })

  it('renders with Inter UI font class', () => {
    render(<Button variant="primary">Go</Button>)
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn).toHaveClass('font-sans')  // font-sans = Inter per DESIGN.md
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test -- --run tests/components/ui/Button.test.tsx
```

Expected: FAIL (class assertions may not match current implementation)

- [ ] **Step 3: Update `Button.tsx`**

Remove `font-condensed` class. Replace with `font-sans`. Replace old gold (`#C9983A`) hardcoded values with `bg-gold` / `text-[#0D1117]`. Update ghost border to `border-border-hi`.

```tsx
// Primary: bg-gold text-[#0D1117] hover:bg-gold-dark font-sans text-[11px] font-semibold uppercase tracking-[0.03em] rounded-none px-4 py-2
// Ghost: bg-bg-surface border border-border-hi text-text-secondary hover:text-text-primary hover:border-border-hi/80 font-sans text-[11px] rounded-none px-4 py-2
// DESIGN.md: 0px border-radius on ALL components — NO rounded corners ever
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test -- --run tests/components/ui/Button.test.tsx
```

Expected: PASS

- [ ] **Step 5: Write failing Badge tests**

```tsx
// tests/components/ui/Badge.test.tsx
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('renders military variant with status-critical color', () => {
    render(<Badge variant="military">Military</Badge>)
    const badge = screen.getByText('Military')
    expect(badge).toHaveClass('text-status-critical')
  })

  it('renders info variant with status-info color', () => {
    render(<Badge variant="info">Info</Badge>)
    const badge = screen.getByText('Info')
    expect(badge).toHaveClass('text-status-info')
  })

  it('renders stable variant with status-stable color', () => {
    render(<Badge variant="stable">Stable</Badge>)
    expect(screen.getByText('Stable')).toHaveClass('text-status-stable')
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
bun run test -- --run tests/components/ui/Badge.test.tsx
```

Expected: FAIL

- [ ] **Step 7: Update `Badge.tsx`**

Replace hardcoded `#5EBD8E` (old green) with `var(--status-stable)` which is now `#a4c9ff` "Command-Center Blue" per DESIGN.md. Update all status colors to use Stitch coral/sky/gold values. All variants use `font-mono text-[9px]`. **DESIGN.md rule:** "DON'T use 'Safety Green' for success states. Use `secondary` (#a4c9ff) to represent stability."

- [ ] **Step 8: Update remaining 8 UI primitives**

For each file, replace old token values:

**`ClassificationBanner.tsx`**: `#C9983A` → `var(--gold)`, `0.12em` letter-spacing → `0.2em`

**`DocumentIdHeader.tsx`**: font → `font-mono`, color → `text-text-tertiary`

**`ExpandableSection.tsx`**: toggle text → `text-status-info`, background hover → `bg-bg-surface-high`

**`ProgressBar.tsx`**: fill colors → map to Stitch status colors via variant prop

**`ScoreDisplay.tsx`**: font → `font-mono`, color thresholds: ≥70=`text-status-stable`, 40-69=`text-status-warning`, <40=`text-status-critical`

**`SectionDivider.tsx`**: font → `font-sans`, size `text-[10px]`, uppercase, `text-text-tertiary`

**`SlideOverPanel.tsx`**: background → `bg-bg-surface-low`, border → `border-border-subtle`

**`TopBar.tsx`**: wordmark font → `font-sans font-bold`, gold → `text-gold`, scenario name → `font-mono text-[10px] text-text-tertiary`

- [ ] **Step 9: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 10: Commit**

```bash
git add components/ui/ tests/components/ui/
git commit -m "feat: update UI primitives to Stitch tokens — Inter UI font, Newsreader, Space Grotesk labels, new status colors (New F)"
```

---

### Task 3: New Shared Game Components — IntelligenceReportBlock + ConstraintCascadeAlert (New F)

**Files:**
- Create: `components/game/IntelligenceReportBlock.tsx`
- Create: `components/game/ConstraintCascadeAlert.tsx`
- Create: `tests/components/game/IntelligenceReportBlock.test.tsx`
- Create: `tests/components/game/ConstraintCascadeAlert.test.tsx`

- [ ] **Step 1: Write failing IntelligenceReportBlock test**

```tsx
// tests/components/game/IntelligenceReportBlock.test.tsx
import { render, screen } from '@testing-library/react'
import { IntelligenceReportBlock } from '@/components/game/IntelligenceReportBlock'

describe('IntelligenceReportBlock', () => {
  it('renders header in brackets', () => {
    render(<IntelligenceReportBlock header="ASSESSMENT" body="Iran readiness degraded." />)
    expect(screen.getByText('[ASSESSMENT]')).toBeInTheDocument()
  })

  it('renders body text', () => {
    render(<IntelligenceReportBlock header="ASSESSMENT" body="Iran readiness degraded." />)
    expect(screen.getByText('Iran readiness degraded.')).toBeInTheDocument()
  })

  it('has gold left border styling', () => {
    const { container } = render(<IntelligenceReportBlock header="H" body="B" />)
    expect(container.firstChild).toHaveClass('border-l-4')
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun run test -- --run tests/components/game/IntelligenceReportBlock.test.tsx
```

Expected: FAIL — `IntelligenceReportBlock` not found

- [ ] **Step 3: Implement `IntelligenceReportBlock.tsx`**

```tsx
// components/game/IntelligenceReportBlock.tsx
interface Props {
  header: string
  body: string
  className?: string
}

export function IntelligenceReportBlock({ header, body, className = '' }: Props) {
  return (
    <div
      className={`border-l-4 pl-3 py-2 bg-bg-surface-dim ${className}`}
      style={{ borderColor: 'var(--gold)' }}
    >
      <div className="font-mono text-[10px] text-gold uppercase tracking-[0.06em] mb-1">
        [{header}]
      </div>
      <div className="font-mono text-[11px] text-text-secondary leading-relaxed">
        {body}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

```bash
bun run test -- --run tests/components/game/IntelligenceReportBlock.test.tsx
```

Expected: PASS

- [ ] **Step 5: Write failing ConstraintCascadeAlert test**

```tsx
// tests/components/game/ConstraintCascadeAlert.test.tsx
import { render, screen } from '@testing-library/react'
import { ConstraintCascadeAlert } from '@/components/game/ConstraintCascadeAlert'

const mockSteps = [
  { condition: 'Ayatollah killed', constraintRemoved: 'Religious prohibition on nukes' },
  { condition: 'Attack already in progress', constraintRemoved: 'Nuclear deterrence' },
]

describe('ConstraintCascadeAlert', () => {
  it('renders title', () => {
    render(<ConstraintCascadeAlert title="Nuclear Cascade Forming" steps={mockSteps} likelihood={65} />)
    expect(screen.getByText('Nuclear Cascade Forming')).toBeInTheDocument()
  })

  it('renders all cascade steps', () => {
    render(<ConstraintCascadeAlert title="Test" steps={mockSteps} likelihood={65} />)
    expect(screen.getByText(/Ayatollah killed/)).toBeInTheDocument()
    expect(screen.getByText(/Religious prohibition/)).toBeInTheDocument()
  })

  it('renders likelihood percentage', () => {
    render(<ConstraintCascadeAlert title="Test" steps={mockSteps} likelihood={65} />)
    expect(screen.getByText(/65%/)).toBeInTheDocument()
  })

  it('has critical left border', () => {
    const { container } = render(<ConstraintCascadeAlert title="T" steps={[]} likelihood={0} />)
    expect(container.firstChild).toHaveClass('border-l-4')
  })
})
```

- [ ] **Step 6: Run to verify fail**

```bash
bun run test -- --run tests/components/game/ConstraintCascadeAlert.test.tsx
```

Expected: FAIL

- [ ] **Step 7: Implement `ConstraintCascadeAlert.tsx`**

```tsx
// components/game/ConstraintCascadeAlert.tsx
interface CascadeStep {
  condition: string
  constraintRemoved: string
}

interface Props {
  title: string
  steps: CascadeStep[]
  likelihood: number
  className?: string
}

export function ConstraintCascadeAlert({ title, steps, likelihood, className = '' }: Props) {
  return (
    <div
      className={`border-l-4 pl-3 py-2 rounded-none ${className}`}
      style={{ borderColor: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px]" style={{ color: 'var(--status-critical)' }}>⚠</span>
        <span
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.03em]"
          style={{ color: 'var(--status-critical)' }}
        >
          {title}
        </span>
        <span className="font-mono text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          {likelihood}%
        </span>
      </div>
      {steps.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {steps.map((step, i) => (
            <div key={i} className="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>→ </span>
              {step.condition} — <em style={{ color: 'var(--status-critical)' }}>{step.constraintRemoved} removed</em>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Run all component tests so far**

```bash
bun run test -- --run tests/components/
```

Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add components/game/IntelligenceReportBlock.tsx components/game/ConstraintCascadeAlert.tsx tests/components/game/
git commit -m "feat: add IntelligenceReportBlock and ConstraintCascadeAlert shared components (New F)"
```

---

### Task 4: Game Shared Components — EscalationLadder, ActorAvatar, Badges

**Files:**
- Create: `components/game/EscalationLadder.tsx`, `ActorAvatar.tsx`, `EscalationBadge.tsx`, `DimensionTag.tsx`, `ConfidenceBadge.tsx`, `TurnPhaseIndicator.tsx`
- Create: `tests/components/game/EscalationLadder.test.tsx`

- [ ] **Step 1: Write failing EscalationLadder test**

```tsx
// tests/components/game/EscalationLadder.test.tsx
import { render } from '@testing-library/react'
import { EscalationLadder } from '@/components/game/EscalationLadder'

describe('EscalationLadder', () => {
  it('renders 8 rungs', () => {
    const { container } = render(<EscalationLadder currentRung={5} maxRung={8} />)
    expect(container.querySelectorAll('[data-rung]').length).toBe(8)
  })

  it('marks current rung with aria-current', () => {
    const { container } = render(<EscalationLadder currentRung={3} maxRung={8} />)
    const current = container.querySelector('[aria-current="true"]')
    expect(current).not.toBeNull()
    expect(current?.getAttribute('data-rung')).toBe('3')
  })

  it('applies gold styling to current rung', () => {
    const { container } = render(<EscalationLadder currentRung={5} maxRung={8} />)
    const current = container.querySelector('[aria-current="true"]')
    expect(current?.className).toMatch(/gold/)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun run test -- --run tests/components/game/EscalationLadder.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `EscalationLadder.tsx`**

```tsx
// components/game/EscalationLadder.tsx
interface Props {
  currentRung: number
  maxRung?: number
  labels?: string[]
}

const DEFAULT_LABELS = ['Diplomacy', 'Sanctions', 'Covert', 'Proxy', 'Air', 'Naval', 'Ground', 'Nuclear']

export function EscalationLadder({ currentRung, maxRung = 8, labels = DEFAULT_LABELS }: Props) {
  return (
    <div className="flex gap-[3px] items-end">
      {Array.from({ length: maxRung }, (_, i) => {
        const rung = i + 1
        const isCurrent = rung === currentRung
        const isDanger = rung >= 6
        const height = 16 + rung * 8

        let bg = 'var(--bg-surface-high)'
        if (isCurrent) bg = 'var(--gold-dim)'
        else if (isDanger) bg = 'var(--status-critical-bg)'

        let border = isCurrent ? '1.5px solid var(--gold)' : 'none'

        return (
          <div key={rung} className="flex flex-col items-center flex-1">
            <div
              data-rung={rung}
              aria-current={isCurrent ? "true" : undefined}
              className={`w-full ${isCurrent ? 'border-gold' : ''}`}
              style={{ height, background: bg, border }}
            />
            <div
              className="font-mono text-[8px] mt-[3px]"
              style={{ color: isCurrent ? 'var(--gold)' : 'var(--text-tertiary)' }}
            >
              {rung}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
bun run test -- --run tests/components/game/EscalationLadder.test.tsx
```

Expected: PASS

- [ ] **Step 5: Implement remaining small components (no failing tests needed — purely presentational)**

```tsx
// components/game/ActorAvatar.tsx
export function ActorAvatar({ actorId, name }: { actorId: string; name: string }) {
  const colorMap: Record<string, string> = {
    united_states: 'var(--actor-us)',
    iran: 'var(--actor-iran)',
    israel: 'var(--actor-israel)',
    russia: 'var(--actor-russia)',
  }
  const color = colorMap[actorId] ?? 'var(--actor-generic)'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-none flex items-center justify-center font-sans font-semibold text-[13px] flex-shrink-0"
      style={{ background: `${color}30`, color }}
    >
      {initials}
    </div>
  )
}
```

```tsx
// components/game/EscalationBadge.tsx
export function EscalationBadge({ rung }: { rung: number }) {
  const color = rung >= 6 ? 'var(--status-critical)' : rung >= 4 ? 'var(--status-warning)' : 'var(--status-info)'
  const bg = rung >= 6 ? 'var(--status-critical-bg)' : rung >= 4 ? 'var(--status-warning-bg)' : 'var(--status-info-bg)'
  return (
    <span className="font-mono text-[9px] px-[7px] py-[2px] rounded-none border"
      style={{ color, background: bg, borderColor: color + '50' }}>
      Rung {rung}
    </span>
  )
}
```

```tsx
// components/game/DimensionTag.tsx
type Dimension = 'military' | 'economic' | 'diplomatic' | 'intelligence' | 'political'
const styles: Record<Dimension, { color: string; bg: string }> = {
  military:     { color: 'var(--status-critical)', bg: 'var(--status-critical-bg)' },
  economic:     { color: 'var(--status-stable)',   bg: 'var(--status-stable-bg)' },
  diplomatic:   { color: 'var(--status-info)',     bg: 'var(--status-info-bg)' },
  intelligence: { color: 'var(--gold)',            bg: 'var(--gold-dim)' },
  political:    { color: '#A899E0',                bg: 'rgba(123,104,200,0.15)' },
}
export function DimensionTag({ dimension }: { dimension: Dimension }) {
  const s = styles[dimension] ?? styles.military
  return (
    <span className="font-mono text-[9px] px-[7px] py-[2px] rounded-none border capitalize"
      style={{ color: s.color, background: s.bg, borderColor: s.color + '50' }}>
      {dimension}
    </span>
  )
}
```

```tsx
// components/game/ConfidenceBadge.tsx
type Confidence = 'confirmed' | 'high' | 'moderate' | 'low' | 'unverified' | 'disputed'
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const high = ['confirmed', 'high']
  const mid = ['moderate']
  const color = high.includes(confidence) ? 'var(--status-stable)' : mid.includes(confidence) ? 'var(--status-warning)' : 'var(--status-critical)'
  return (
    <span className="font-mono text-[9px] px-[7px] py-[2px] rounded-none" style={{ color }}>
      {confidence.toUpperCase()}
    </span>
  )
}
```

```tsx
// components/game/TurnPhaseIndicator.tsx
type Phase = 'planning' | 'resolution' | 'reaction' | 'judging' | 'complete'
export function TurnPhaseIndicator({ phase }: { phase: Phase }) {
  const colors: Record<Phase, string> = {
    planning:   'var(--status-info)',
    resolution: 'var(--gold)',
    reaction:   'var(--status-warning)',
    judging:    'var(--status-stable)',
    complete:   'var(--text-tertiary)',
  }
  return (
    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: colors[phase] }}>
      {phase}
    </span>
  )
}
```

- [ ] **Step 6: Run all game component tests**

```bash
bun run test -- --run tests/components/game/
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add components/game/ tests/components/game/
git commit -m "feat: add EscalationLadder, ActorAvatar, DimensionTag, ConfidenceBadge, TurnPhaseIndicator game components"
```

---

### Task 5: Game Layout Shell — Collapsible Map (#20)

**Files:**
- Create: `components/layout/GameLayout.tsx`, `MapSide.tsx`, `PanelSide.tsx`
- Test: `tests/components/layout/GameLayout.test.tsx`
- Modify: `app/scenarios/[id]/play/[branchId]/page.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/layout/GameLayout.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GameLayout } from '@/components/layout/GameLayout'

describe('GameLayout', () => {
  it('renders map and panel content side by side', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    expect(screen.getByText('map')).toBeTruthy()
    expect(screen.getByText('panel')).toBeTruthy()
  })

  it('hides map when collapse button is clicked', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    const collapseBtn = screen.getByTitle('Collapse map')
    fireEvent.click(collapseBtn)
    expect(screen.queryByText('map')).toBeNull()
  })

  it('shows expand button after map is collapsed', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    fireEvent.click(screen.getByTitle('Collapse map'))
    expect(screen.getByText('› Show Map')).toBeTruthy()
  })

  it('restores map when expand button is clicked', () => {
    render(
      <GameLayout mapContent={<div>map</div>} panelContent={<div>panel</div>} />
    )
    fireEvent.click(screen.getByTitle('Collapse map'))
    fireEvent.click(screen.getByText('› Show Map'))
    expect(screen.getByText('map')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test -- --run tests/components/layout/GameLayout.test.tsx
```

Expected: FAIL — `GameLayout` not found

- [ ] **Step 3: Implement `GameLayout.tsx`**

```tsx
// components/layout/GameLayout.tsx
'use client'
import { useState } from 'react'
import { MapSide } from './MapSide'
import { PanelSide } from './PanelSide'

interface Props {
  mapContent: React.ReactNode
  panelContent: React.ReactNode
}

export function GameLayout({ mapContent, panelContent }: Props) {
  const [mapCollapsed, setMapCollapsed] = useState(false)

  return (
    <div className="flex h-[calc(100vh-66px)] overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>
      {!mapCollapsed && (
        <MapSide onCollapse={() => setMapCollapsed(true)}>
          {mapContent}
        </MapSide>
      )}
      <PanelSide
        mapCollapsed={mapCollapsed}
        onExpandMap={() => setMapCollapsed(false)}
      >
        {panelContent}
      </PanelSide>
    </div>
  )
}
```

- [ ] **Step 4: Implement `MapSide.tsx`**

```tsx
// components/layout/MapSide.tsx
interface Props {
  onCollapse: () => void
  children: React.ReactNode
}

export function MapSide({ onCollapse, children }: Props) {
  return (
    <div className="relative flex-[1.5] min-w-0 overflow-hidden"
      style={{ background: '#0A0F18' }}>
      {children}
      <button
        onClick={onCollapse}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-none flex items-center justify-center font-mono text-[10px] transition-all"
        style={{
          background: 'var(--bg-surface-low)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-tertiary)',
        }}
        title="Collapse map"
      >
        ‹
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Implement `PanelSide.tsx`**

```tsx
// components/layout/PanelSide.tsx
interface Props {
  mapCollapsed: boolean
  onExpandMap: () => void
  children: React.ReactNode
}

export function PanelSide({ mapCollapsed, onExpandMap, children }: Props) {
  return (
    <div
      className={`flex flex-col overflow-y-auto transition-all duration-200 ${mapCollapsed ? 'flex-1' : 'w-[380px]'}`}
      style={{ background: 'var(--bg-surface-low)', borderLeft: '1px solid var(--border-subtle)' }}
    >
      {mapCollapsed && (
        <button
          onClick={onExpandMap}
          className="self-start m-2 px-2 py-1 font-mono text-[9px] rounded-none transition-all"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)',
          }}
        >
          › Show Map
        </button>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify pass**

```bash
bun run test -- --run tests/components/layout/GameLayout.test.tsx
```

Expected: PASS — 4 tests passing

- [ ] **Step 7: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 8: Commit**

```bash
git add components/layout/ tests/components/layout/
git commit -m "feat: game layout shell with collapsible map — 60/40 split, collapse/expand controls (#20)"
```

---

### Task 6: ActorCard + Scenario Hub Page (New B + New C)

**Files:**
- Create: `components/game/ActorCard.tsx`
- Create: `app/scenarios/[id]/page.tsx`
- Create: `tests/components/game/ActorCard.test.tsx`

- [ ] **Step 1: Write failing ActorCard test**

```tsx
// tests/components/game/ActorCard.test.tsx
import { render, screen } from '@testing-library/react'
import { ActorCard } from '@/components/game/ActorCard'

const mockActor = {
  id: 'united_states',
  name: 'United States',
  escalationRung: 5,
  status: 'escalating' as const,
  metrics: [
    { label: 'Air Defense', value: '42%' },
    { label: 'Readiness', value: '58' },
  ],
}

describe('ActorCard', () => {
  it('renders actor name', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByText(/escalating/i)).toBeInTheDocument()
  })

  it('renders all metrics', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByText('Air Defense')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('renders View Dossier button', () => {
    render(<ActorCard actor={mockActor} />)
    expect(screen.getByRole('button', { name: /view dossier/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun run test -- --run tests/components/game/ActorCard.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `ActorCard.tsx`**

```tsx
// components/game/ActorCard.tsx
import { EscalationLadder } from './EscalationLadder'

type ActorStatus = 'stable' | 'escalating' | 'critical'

interface ActorMetric { label: string; value: string }

interface Props {
  actor: {
    id: string
    name: string
    escalationRung: number
    status: ActorStatus
    metrics: ActorMetric[]
  }
  onViewDossier?: () => void
}

const statusConfig: Record<ActorStatus, { color: string; bg: string; label: string }> = {
  stable:     { color: 'var(--status-stable)',   bg: 'var(--status-stable-bg)',   label: 'Stable' },
  escalating: { color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',  label: 'Escalating' },
  critical:   { color: 'var(--status-critical)', bg: 'var(--status-critical-bg)', label: 'Critical' },
}

export function ActorCard({ actor, onViewDossier }: Props) {
  const s = statusConfig[actor.status]
  return (
    <div className="relative overflow-hidden rounded-none p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      {/* Ghost background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] text-[80px] pointer-events-none select-none font-sans font-bold">
        {actor.name.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex items-center justify-between relative">
        <span className="font-sans font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>
          {actor.name}
        </span>
        <span className="font-mono text-[9px] px-2 py-[2px] rounded-none"
          style={{ color: s.color, background: s.bg }}>
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 relative">
        {actor.metrics.map(m => (
          <div key={m.label} className="rounded-none p-2" style={{ background: 'var(--bg-surface-high)' }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.04em]" style={{ color: 'var(--text-tertiary)' }}>
              {m.label}
            </div>
            <div className="font-mono text-[14px] font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <EscalationLadder currentRung={actor.escalationRung} maxRung={8} />
      </div>

      <button onClick={onViewDossier}
        className="font-sans text-[11px] font-semibold uppercase tracking-[0.04em] py-2 rounded-none transition-all hover:opacity-80 relative"
        style={{ background: 'var(--bg-surface-high)', border: '1px solid var(--border-hi)', color: 'var(--text-secondary)' }}>
        View Dossier
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
bun run test -- --run tests/components/game/ActorCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Create Scenario Hub page**

```tsx
// app/scenarios/[id]/page.tsx
import { Suspense } from 'react'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { TopBar } from '@/components/ui/TopBar'
import { DocumentIdHeader } from '@/components/ui/DocumentIdHeader'

// Tabs: Timeline | Actors (Strategic Hub)
export default function ScenarioHubPage({ params }: { params: { id: string } }) {
  return (
    <>
      <ClassificationBanner text="SECRET // GEOSIM ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY" />
      <TopBar scenarioName="US-ISRAEL-IRAN CONFLICT 2025-2026" />
      <main className="pt-[66px]" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
        <div className="max-w-5xl mx-auto px-5 py-4">
          <DocumentIdHeader parts={[`SCENARIO: ${params.id.toUpperCase()}`, 'BRANCH SELECTOR']} />
          {/* TODO wire to GET /api/scenarios/[id] and GET /api/scenarios/[id]/branches */}
          <ScenarioHubTabs scenarioId={params.id} />
        </div>
      </main>
    </>
  )
}
```

Include a `ScenarioHubTabs` component with "Timeline" and "Actors" tabs. The Actors tab renders a 3-column grid of `ActorCard` components (mock data for now).

- [ ] **Step 6: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 7: Commit**

```bash
git add components/game/ActorCard.tsx app/scenarios/ tests/components/game/ActorCard.test.tsx
git commit -m "feat: ActorCard component and Scenario Hub page with Strategic Actors tab (New B + New C)"
```

---

### Task 7: Scenario Browser Page (New D)

**Files:**
- Modify: `app/scenarios/page.tsx`

- [ ] **Step 1: Update scenario browser page**

Wire to `GET /api/scenarios`. Display scenario cards with: name, description, category badge (using `DimensionTag` or equivalent), branch count, play count, rating stars. Filter by category using a tab strip.

```tsx
// app/scenarios/page.tsx — key structure
// Category filter tabs using Stitch selected state (gold border + gold-glow bg)
// Scenario cards: bg-bg-surface, border-border-subtle, hover: bg-bg-surface-high
// Category badge: status-info-bg / status-info color
// Click card → navigate to /scenarios/[id]
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 3: Commit**

```bash
git add app/scenarios/page.tsx
git commit -m "feat: scenario browser page with category filter and Stitch card styling (New D)"
```

---

### Task 8: War Chronicle Components (#25)

**Files:**
- Create: `components/chronicle/GlobalTicker.tsx`, `TurnEntry.tsx`, `ChronicleTimeline.tsx`
- Modify: `app/chronicle/[branchId]/page.tsx`
- Create: `tests/components/chronicle/TurnEntry.test.tsx`, `GlobalTicker.test.tsx`

- [ ] **Step 1: Write failing TurnEntry test**

```tsx
// tests/components/chronicle/TurnEntry.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TurnEntry } from '@/components/chronicle/TurnEntry'

const mockEntry = {
  turnNumber: 3,
  date: '15 Mar 2026',
  title: 'The Oil War Escalates',
  narrative: 'US and Israeli forces struck Iran oil infrastructure.',
  severity: 'critical' as const,
  tags: ['Ras Tanura Hit', 'Oil $142/bbl'],
}

describe('TurnEntry', () => {
  it('renders turn date', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument()
  })

  it('renders title in condensed font', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText('The Oil War Escalates')).toBeInTheDocument()
  })

  it('renders narrative prose', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText(/US and Israeli forces/)).toBeInTheDocument()
  })

  it('renders all tags', () => {
    render(<TurnEntry entry={mockEntry} />)
    expect(screen.getByText('Ras Tanura Hit')).toBeInTheDocument()
    expect(screen.getByText('Oil $142/bbl')).toBeInTheDocument()
  })

  it('has critical severity styling', () => {
    const { container } = render(<TurnEntry entry={mockEntry} />)
    // critical entries have left border
    expect(container.querySelector('[data-severity="critical"]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun run test -- --run tests/components/chronicle/TurnEntry.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `TurnEntry.tsx`**

```tsx
// components/chronicle/TurnEntry.tsx
import { useState } from 'react'

type Severity = 'critical' | 'major' | 'moderate' | 'minor'

interface Props {
  entry: {
    turnNumber: number
    date: string
    title: string
    narrative: string
    severity: Severity
    tags: string[]
    detail?: React.ReactNode
  }
}

const severityBorder: Record<Severity, string> = {
  critical: 'var(--actor-iran)',
  major:    'var(--gold)',
  moderate: 'var(--actor-us)',
  minor:    'var(--border-subtle)',
}

export function TurnEntry({ entry }: Props) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = severityBorder[entry.severity]

  return (
    <div
      data-severity={entry.severity}
      className="pl-3 mb-7"
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.04em] mb-1"
        style={{ color: 'var(--text-tertiary)' }}>
        Turn {entry.turnNumber} — {entry.date}
      </div>
      <div className="font-serif font-bold text-[15px] uppercase tracking-[0.02em] mb-2"
        style={{ color: 'var(--text-primary)' }}>
        {entry.title}
      </div>
      <div className="font-serif italic text-[15px] leading-[1.75]"
        style={{ color: 'var(--text-secondary)' }}>
        {entry.narrative}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {entry.tags.map(tag => (
          <span key={tag} className="font-mono text-[9px] px-[7px] py-[2px] rounded-none"
            style={{ background: 'var(--bg-surface-high)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            {tag}
          </span>
        ))}
      </div>
      {entry.detail && (
        <div className="mt-2 rounded-none overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex justify-between items-center px-3 py-2 font-mono text-[11px] transition-all"
            style={{ color: 'var(--status-info)', background: expanded ? 'var(--bg-surface)' : 'transparent' }}>
            <span>Detailed resolution</span>
            <span>{expanded ? '−' : '+'}</span>
          </button>
          {expanded && (
            <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {entry.detail}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write failing GlobalTicker test**

```tsx
// tests/components/chronicle/GlobalTicker.test.tsx
import { render, screen } from '@testing-library/react'
import { GlobalTicker } from '@/components/chronicle/GlobalTicker'

describe('GlobalTicker', () => {
  it('renders oil price', () => {
    render(<GlobalTicker oilPrice={142} oilChange="+94%" straitStatus="BLOCKED" airDefense={42} />)
    expect(screen.getByText('142')).toBeInTheDocument()
  })

  it('renders BLOCKED status in critical color', () => {
    const { container } = render(<GlobalTicker oilPrice={142} oilChange="+94%" straitStatus="BLOCKED" airDefense={42} />)
    const blocked = screen.getByText('BLOCKED')
    expect(blocked).toHaveStyle({ color: 'var(--status-critical)' })
  })

  it('renders air defense percentage', () => {
    render(<GlobalTicker oilPrice={142} oilChange="+94%" straitStatus="BLOCKED" airDefense={42} />)
    expect(screen.getByText(/42%/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run to verify fail**

```bash
bun run test -- --run tests/components/chronicle/GlobalTicker.test.tsx
```

Expected: FAIL

- [ ] **Step 6: Implement `GlobalTicker.tsx` and `ChronicleTimeline.tsx`**

```tsx
// components/chronicle/GlobalTicker.tsx
interface Props {
  oilPrice: number
  oilChange: string
  straitStatus: 'OPEN' | 'BLOCKED' | 'RESTRICTED'
  airDefense: number
}

export function GlobalTicker({ oilPrice, oilChange, straitStatus, airDefense }: Props) {
  const straitColor = straitStatus === 'OPEN' ? 'var(--status-stable)' : 'var(--status-critical)'
  return (
    <div className="flex gap-4 flex-wrap py-2 font-mono text-[10px]"
      style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
      <span>Oil: <strong style={{ color: 'var(--status-critical)' }}>{oilPrice}</strong> <span style={{ color: 'var(--status-critical)' }}>{oilChange}</span></span>
      <span>Strait: <strong style={{ color: straitColor }}>{straitStatus}</strong></span>
      <span>US Air Defense: <strong style={{ color: airDefense < 50 ? 'var(--status-critical)' : 'var(--status-warning)' }}>{airDefense}%</strong></span>
    </div>
  )
}
```

```tsx
// components/chronicle/ChronicleTimeline.tsx
import { TurnEntry } from './TurnEntry'

interface Props {
  entries: React.ComponentProps<typeof TurnEntry>['entry'][]
}

export function ChronicleTimeline({ entries }: Props) {
  return (
    <div className="relative pl-7 pt-5">
      <div className="absolute left-[7px] top-5 bottom-0 w-px" style={{ background: 'var(--border-subtle)' }} />
      {entries.map((entry) => (
        <div key={entry.turnNumber} className="relative mb-1">
          <div
            className="absolute -left-7 top-1 w-3 h-3 rounded-none z-10"
            style={{
              background: 'var(--bg-base)',
              border: `2px solid ${entry.severity === 'critical' ? 'var(--status-critical)' : entry.severity === 'major' ? 'var(--gold)' : 'var(--border-hi)'}`,
            }}
          />
          <TurnEntry entry={entry} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Run all chronicle tests**

```bash
bun run test -- --run tests/components/chronicle/
```

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add components/chronicle/ tests/components/chronicle/
git commit -m "feat: ChronicleTimeline, TurnEntry, GlobalTicker — Newsreader prose, severity borders (#25)"
```

---

### Task 9: Map Components + FloatingMetricChip (New E)

**Files:**
- Create: `components/map/GameMap.tsx`, `ActorLayer.tsx`, `ChokepointMarker.tsx`, `MapLegend.tsx`, `FloatingMetricChip.tsx`

- [ ] **Step 1: Implement `FloatingMetricChip.tsx`**

```tsx
// components/map/FloatingMetricChip.tsx
interface Props {
  icon?: string
  label: string
  value: string
  variant?: 'default' | 'critical' | 'warning'
  style?: React.CSSProperties
}

export function FloatingMetricChip({ icon, label, value, variant = 'default', style }: Props) {
  const valueColor = variant === 'critical' ? 'var(--status-critical)' : variant === 'warning' ? 'var(--status-warning)' : 'var(--text-secondary)'
  return (
    <div
      className="absolute font-mono text-[9px] flex items-center gap-1 px-[7px] py-[3px] rounded-none pointer-events-none z-10"
      style={{
        background: 'rgba(13,17,23,0.88)',
        border: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      <span style={{ color: 'var(--text-tertiary)' }}>{label}:</span>
      <strong style={{ color: valueColor }}>{value}</strong>
    </div>
  )
}
```

- [ ] **Step 2: Implement `GameMap.tsx` shell**

```tsx
// components/map/GameMap.tsx
'use client'
import { useEffect, useRef } from 'react'
import { FloatingMetricChip } from './FloatingMetricChip'
import type { GlobalState } from '@/lib/types/simulation'

interface Props {
  globalState?: GlobalState
}

export function GameMap({ globalState }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // Mapbox initialization happens here — requires NEXT_PUBLIC_MAPBOX_TOKEN
  // Actual map init deferred to when token is available

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {globalState && (
        <>
          <FloatingMetricChip
            label="Oil"
            value={`$${globalState.oilPricePerBarrel}/bbl`}
            variant="critical"
            style={{ bottom: 40, left: 10 }}
          />
          <FloatingMetricChip
            label="Strait"
            value="BLOCKED"
            variant="critical"
            style={{ bottom: 40, left: 160 }}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Implement `MapLegend.tsx`**

```tsx
// components/map/MapLegend.tsx
const ACTORS = [
  { label: 'US / Israel', color: 'var(--actor-us)' },
  { label: 'Iran',        color: 'var(--actor-iran)' },
  { label: 'Gulf States', color: 'var(--actor-generic)' },
  { label: 'Russia',      color: 'var(--actor-russia)' },
]

export function MapLegend() {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 font-mono text-[9px]"
      style={{ color: 'var(--text-tertiary)' }}>
      {ACTORS.map(a => (
        <div key={a.label} className="flex items-center gap-1">
          <div className="w-[7px] h-[7px] rounded-full" style={{ background: a.color }} />
          <span style={{ color: a.color }}>{a.label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 5: Commit**

```bash
git add components/map/
git commit -m "feat: GameMap shell, FloatingMetricChip, MapLegend, map component stubs (New E)"
```

---

## TRACK 2 — Game Engine Wiring

> **Prerequisite:** Tasks 1–3 from Track 1 must be merged. All Stitch token references and `IntelligenceReportBlock`/`ConstraintCascadeAlert` components are available.

---

### Task 10: Actor Panels — ActorList, ActorDetailPanel, GlobalIndicators (#21, #22)

**Files:**
- Create: `components/panels/ActorList.tsx`, `ActorDetailPanel.tsx`, `GlobalIndicators.tsx`
- Create: `tests/components/panels/ActorList.test.tsx`
- Create: `tests/components/panels/ActorDetailPanel.test.tsx`

- [ ] **Step 1: Write failing ActorList test**

```tsx
// tests/components/panels/ActorList.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActorList } from '@/components/panels/ActorList'

const mockActors = [
  { id: 'united_states', name: 'United States', escalationRung: 5 },
  { id: 'iran', name: 'Iran', escalationRung: 6 },
]

describe('ActorList', () => {
  it('renders all actors', () => {
    render(<ActorList actors={mockActors} selectedActorId={null} onSelect={() => {}} />)
    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('Iran')).toBeInTheDocument()
  })

  it('calls onSelect when actor row clicked', async () => {
    const onSelect = vi.fn()
    render(<ActorList actors={mockActors} selectedActorId={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('United States'))
    expect(onSelect).toHaveBeenCalledWith('united_states')
  })

  it('shows escalation badge for each actor', () => {
    render(<ActorList actors={mockActors} selectedActorId={null} onSelect={() => {}} />)
    expect(screen.getByText('Rung 5')).toBeInTheDocument()
    expect(screen.getByText('Rung 6')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun run test -- --run tests/components/panels/ActorList.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `ActorList.tsx`**

```tsx
// components/panels/ActorList.tsx
import { ActorAvatar } from '@/components/game/ActorAvatar'
import { EscalationBadge } from '@/components/game/EscalationBadge'

interface Actor { id: string; name: string; escalationRung: number }
interface Props {
  actors: Actor[]
  selectedActorId: string | null
  onSelect: (id: string) => void
}

export function ActorList({ actors, selectedActorId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-0.5">
      {actors.map(actor => (
        <div
          key={actor.id}
          onClick={() => onSelect(actor.id)}
          className="flex items-center gap-2 px-2 py-[6px] rounded-none cursor-pointer transition-all"
          style={{
            background: selectedActorId === actor.id ? 'var(--bg-surface-high)' : 'transparent',
          }}
        >
          <ActorAvatar actorId={actor.id} name={actor.name} />
          <span className="font-sans font-semibold text-[13px] flex-1"
            style={{ color: 'var(--text-primary)' }}>
            {actor.name}
          </span>
          <EscalationBadge rung={actor.escalationRung} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
bun run test -- --run tests/components/panels/ActorList.test.tsx
```

Expected: PASS

- [ ] **Step 5: Implement `GlobalIndicators.tsx`**

```tsx
// components/panels/GlobalIndicators.tsx
interface Props {
  oilPrice: number
  oilChange: string
  straitStatus: string
  airDefensePercent: number
  domesticSupport: number
}

export function GlobalIndicators({ oilPrice, oilChange, straitStatus, airDefensePercent, domesticSupport }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-sans text-[12px]" style={{ color: 'var(--text-secondary)' }}>Oil price</span>
        <span className="font-mono text-[12px] font-medium" style={{ color: 'var(--status-critical)' }}>
          ${oilPrice}/bbl {oilChange}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="font-sans text-[12px]" style={{ color: 'var(--text-secondary)' }}>Strait of Hormuz</span>
        <span className="font-mono text-[12px] font-medium"
          style={{ color: straitStatus === 'BLOCKED' ? 'var(--status-critical)' : 'var(--status-stable)' }}>
          {straitStatus}
        </span>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-sans text-[12px]" style={{ color: 'var(--text-secondary)' }}>US air defense</span>
          <span className="font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>{airDefensePercent}%</span>
        </div>
        <div className="h-[4px] rounded-none" style={{ background: 'var(--bg-surface-highest)' }}>
          <div className="h-full rounded-none"
            style={{ width: `${airDefensePercent}%`, background: airDefensePercent < 30 ? 'var(--status-critical)' : 'var(--status-warning)' }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-sans text-[12px]" style={{ color: 'var(--text-secondary)' }}>US domestic support</span>
          <span className="font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>{domesticSupport}%</span>
        </div>
        <div className="h-[4px] rounded-none" style={{ background: 'var(--bg-surface-highest)' }}>
          <div className="h-full rounded-none"
            style={{ width: `${domesticSupport}%`, background: domesticSupport < 40 ? 'var(--status-critical)' : 'var(--status-stable)' }} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write failing ActorDetailPanel test**

```tsx
// tests/components/panels/ActorDetailPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ActorDetailPanel } from '@/components/panels/ActorDetailPanel'

const mockActor = {
  id: 'united_states',
  name: 'United States',
  escalationRung: 5,
  keyFigures: [{ id: 'dt', name: 'Donald Trump', role: 'President', status: 'active' as const, disposition: 'Hawk', influence: 95 }],
  objectives: [{ id: 'obj1', description: 'Regime Change', priority: 'existential' as const, currentProgress: 15 }],
  constraints: [{ id: 'c1', description: 'No ground invasion', status: 'active' as const }],
}

describe('ActorDetailPanel', () => {
  it('renders actor name in header', () => {
    render(<ActorDetailPanel actor={mockActor} omniscient={false} onClose={() => {}} />)
    expect(screen.getByText('United States')).toBeTruthy()
  })

  it('renders key figures section', () => {
    render(<ActorDetailPanel actor={mockActor} omniscient={false} onClose={() => {}} />)
    expect(screen.getByText('Donald Trump')).toBeTruthy()
    expect(screen.getByText('President')).toBeTruthy()
  })

  it('renders objectives with progress', () => {
    render(<ActorDetailPanel actor={mockActor} omniscient={false} onClose={() => {}} />)
    expect(screen.getByText('Regime Change')).toBeTruthy()
  })

  it('renders constraints', () => {
    render(<ActorDetailPanel actor={mockActor} omniscient={false} onClose={() => {}} />)
    expect(screen.getByText('No ground invasion')).toBeTruthy()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

```bash
bun run test -- --run tests/components/panels/ActorDetailPanel.test.tsx
```

Expected: FAIL — `ActorDetailPanel` not found

- [ ] **Step 8: Implement `ActorDetailPanel.tsx` structure**

Create the slide-over wrapper with sections: Key Figures, Military State (asset table, escalation ladder), Economic State, Political State (influence channels), Objectives (progress bars), Constraints, Intelligence Picture. Use `IntelligenceReportBlock` for briefing sections and `Newsreader` italic for prose descriptions. Use `--bg-surface-low` background.

- [ ] **Step 9: Run test to verify pass**

```bash
bun run test -- --run tests/components/panels/ActorDetailPanel.test.tsx
```

Expected: PASS — 4 tests passing

- [ ] **Step 10: Run typecheck and all panel tests**

```bash
bun run typecheck && bun run test -- --run tests/components/panels/
```

Expected: `0 errors`, all PASS

- [ ] **Step 11: Commit**

```bash
git add components/panels/ActorList.tsx components/panels/GlobalIndicators.tsx components/panels/ActorDetailPanel.tsx tests/components/panels/
git commit -m "feat: ActorList, GlobalIndicators, ActorDetailPanel with Stitch token styling (#21 #22)"
```

---

### Task 11: Decision Catalog + TurnPlanBuilder (#23, #24)

**Files:**
- Create: `components/panels/DecisionCatalog.tsx`, `DecisionDetailPanel.tsx`, `TurnPlanBuilder.tsx`
- Create: `tests/components/panels/TurnPlanBuilder.test.tsx`
- Create: `tests/components/panels/DecisionCatalog.test.tsx`

- [ ] **Step 1: Write failing TurnPlanBuilder test**

```tsx
// tests/components/panels/TurnPlanBuilder.test.tsx
import { render, screen } from '@testing-library/react'
import { TurnPlanBuilder } from '@/components/panels/TurnPlanBuilder'

describe('TurnPlanBuilder', () => {
  it('renders primary action slot', () => {
    render(<TurnPlanBuilder primaryAction={null} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByText(/primary action/i)).toBeInTheDocument()
  })

  it('shows filled state when primary action selected', () => {
    const action = { id: '1', title: 'Intensify Air Campaign', dimension: 'military' as const }
    render(<TurnPlanBuilder primaryAction={action} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByText('Intensify Air Campaign')).toBeInTheDocument()
  })

  it('shows resource allocation when actions are selected', () => {
    const action = { id: '1', title: 'Air Campaign', dimension: 'military' as const }
    render(<TurnPlanBuilder primaryAction={action} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('disables submit when no primary action', () => {
    render(<TurnPlanBuilder primaryAction={null} concurrentActions={[]} onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun run test -- --run tests/components/panels/TurnPlanBuilder.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `TurnPlanBuilder.tsx`**

Core structure: primary action slot (dashed border, gold when filled), 0-3 concurrent action slots, resource allocation sliders (gold fill, sum to 100%), live validation section (synergies in `--status-info`, incompatibilities in `--status-critical`), submit button (disabled until primary selected). Profile quick-pick cards use gold border + gold-glow on selected. Resource sliders use `--gold` fill color.

- [ ] **Step 4: Run TurnPlanBuilder tests to verify pass**

```bash
bun run test -- --run tests/components/panels/TurnPlanBuilder.test.tsx
```

Expected: PASS

- [ ] **Step 5: Write failing DecisionCatalog test**

```tsx
// tests/components/panels/DecisionCatalog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DecisionCatalog } from '@/components/panels/DecisionCatalog'

const mockDecisions = [
  { id: 'd1', title: 'Intensify Air Campaign', dimension: 'military' as const, escalationRung: 5, isEscalation: false, resourceWeight: 'heavy' as const },
  { id: 'd2', title: 'Propose Ceasefire', dimension: 'diplomatic' as const, escalationRung: 3, isEscalation: false, resourceWeight: 'light' as const },
]

describe('DecisionCatalog', () => {
  it('renders decisions grouped by dimension', () => {
    render(<DecisionCatalog decisions={mockDecisions} onSelect={() => {}} />)
    expect(screen.getByText('Intensify Air Campaign')).toBeTruthy()
    expect(screen.getByText('Propose Ceasefire')).toBeTruthy()
  })

  it('shows dimension labels as group headers', () => {
    render(<DecisionCatalog decisions={mockDecisions} onSelect={() => {}} />)
    expect(screen.getByText(/military/i)).toBeTruthy()
    expect(screen.getByText(/diplomatic/i)).toBeTruthy()
  })

  it('calls onSelect when a decision card is clicked', () => {
    const onSelect = vi.fn()
    render(<DecisionCatalog decisions={mockDecisions} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Intensify Air Campaign'))
    expect(onSelect).toHaveBeenCalledWith('d1')
  })
})
```

- [ ] **Step 6: Run to verify DecisionCatalog test fails**

```bash
bun run test -- --run tests/components/panels/DecisionCatalog.test.tsx
```

Expected: FAIL — `DecisionCatalog` not found

- [ ] **Step 7: Implement `DecisionCatalog.tsx` and `DecisionDetailPanel.tsx`**

`DecisionCatalog`: decisions grouped by dimension using `DimensionTag`. Each card: title (Inter semibold 12px), escalation direction tag, resource weight badge. Click → opens `DecisionDetailPanel` slide-over.

`DecisionDetailPanel`: uses `IntelligenceReportBlock` for strategic rationale. Profile quick-picks as cards. Parameter configurators as dropdowns. Live cost preview updates on parameter change. Concurrency indicators (compatible = `--status-stable`, incompatible = `--status-critical`).

- [ ] **Step 8: Run all panel tests to verify pass**

```bash
bun run test -- --run tests/components/panels/TurnPlanBuilder.test.tsx && bun run test -- --run tests/components/panels/DecisionCatalog.test.tsx
```

Expected: PASS — both test files green

- [ ] **Step 9: Commit**

```bash
git add components/panels/DecisionCatalog.tsx components/panels/DecisionDetailPanel.tsx components/panels/TurnPlanBuilder.tsx tests/components/panels/TurnPlanBuilder.test.tsx tests/components/panels/DecisionCatalog.test.tsx
git commit -m "feat: DecisionCatalog, DecisionDetailPanel, TurnPlanBuilder with Stitch token styling (#23 #24)"
```

---

### Task 12: DispatchTerminal — Turn Resolution Animation (#29)

**Files:**
- Create: `components/game/DispatchTerminal.tsx`
- Create: `tests/components/game/DispatchTerminal.test.tsx`
- Modify: `app/globals.css` (add `@keyframes blink`)
- Modify: the turn resolution view in `app/scenarios/[id]/play/[branchId]/page.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/game/DispatchTerminal.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DispatchTerminal, type DispatchLine } from '@/components/game/DispatchTerminal'

const mockLines: DispatchLine[] = [
  { timestamp: '22:14:03', text: 'RESOLUTION ENGINE ACTIVE', type: 'default' },
  { timestamp: '22:14:07', text: 'COLLISION DETECTED: STRAIT OF HORMUZ', type: 'critical' },
  { timestamp: '22:14:10', text: 'EVENT CONFIRMED: TURN COMPLETE', type: 'confirmed' },
]

describe('DispatchTerminal', () => {
  it('renders all dispatch lines', () => {
    render(<DispatchTerminal lines={mockLines} isRunning={false} />)
    expect(screen.getByText('RESOLUTION ENGINE ACTIVE')).toBeTruthy()
    expect(screen.getByText('COLLISION DETECTED: STRAIT OF HORMUZ')).toBeTruthy()
    expect(screen.getByText('EVENT CONFIRMED: TURN COMPLETE')).toBeTruthy()
  })

  it('renders timestamps for each line', () => {
    render(<DispatchTerminal lines={mockLines} isRunning={false} />)
    expect(screen.getByText('[22:14:03]')).toBeTruthy()
  })

  it('shows blinking cursor when isRunning is true', () => {
    render(<DispatchTerminal lines={mockLines} isRunning={true} />)
    expect(screen.getByText('▋')).toBeTruthy()
  })

  it('hides cursor when isRunning is false', () => {
    render(<DispatchTerminal lines={mockLines} isRunning={false} />)
    expect(screen.queryByText('▋')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test -- --run tests/components/game/DispatchTerminal.test.tsx
```

Expected: FAIL — `DispatchTerminal` not found

- [ ] **Step 3: Implement `DispatchTerminal.tsx`**

```tsx
// components/game/DispatchTerminal.tsx
'use client'
import { useEffect, useRef } from 'react'

type LineType = 'default' | 'critical' | 'confirmed' | 'info' | 'stable'

export interface DispatchLine {
  timestamp: string
  text: string
  type: LineType
}

interface Props {
  lines: DispatchLine[]
  isRunning: boolean
}

const lineColors: Record<LineType, string> = {
  default:   'var(--text-secondary)',
  critical:  'var(--status-critical)',
  confirmed: 'var(--gold)',
  info:      'var(--status-info)',
  stable:    'var(--status-stable)',
}

export function DispatchTerminal({ lines, isRunning }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  return (
    <div className="min-h-[400px] p-4 rounded-none"
      style={{ background: 'var(--bg-surface-dim)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
      <div className="text-[9px] uppercase tracking-[0.06em] pb-2 mb-3"
        style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
        ━━━ GEOSIM RESOLUTION ENGINE ━━━
      </div>
      {lines.map((line, i) => (
        <div key={i} className="text-[11px] py-[2px]" style={{ color: lineColors[line.type] }}>
          <span style={{ color: 'var(--text-tertiary)', marginRight: '8px' }}>[{line.timestamp}]</span>
          {line.text}
        </div>
      ))}
      {isRunning && (
        <div className="text-[14px] mt-1" style={{ color: 'var(--gold)', animation: 'blink 800ms step-end infinite' }}>
          ▋
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
```

Add `@keyframes blink { 50% { opacity: 0; } }` to `globals.css`.

- [ ] **Step 4: Run test to verify pass**

```bash
bun run test -- --run tests/components/game/DispatchTerminal.test.tsx
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 6: Commit**

```bash
git add components/game/DispatchTerminal.tsx tests/components/game/DispatchTerminal.test.tsx app/globals.css
git commit -m "feat: DispatchTerminal — stamped dispatch lines, amber cursor, no spinner (#29)"
```

---

### Task 13: EventsTab + ObserverOverlay (#26, #31)

**Files:**
- Create: `components/panels/EventsTab.tsx`, `ObserverOverlay.tsx`
- Create: `tests/components/panels/EventsTab.test.tsx`

- [ ] **Step 1: Write failing EventsTab test**

```tsx
// tests/components/panels/EventsTab.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EventsTab } from '@/components/panels/EventsTab'

const mockResolution = {
  narrative: 'In the predawn hours, the conflict entered a new phase.',
  actionOutcomes: [
    { actorId: 'united_states', decisionId: 'd1', succeeded: true, outcome: 'Air strikes hit 12 targets', parameterEffects: 'Overwhelming force profile applied' },
  ],
  reactionPhase: null,
  judgeScores: { plausibility: 84, consistency: 81, proportionality: 76, rationality: 72, cascadeLogic: 78, overallScore: 78 },
}

describe('EventsTab', () => {
  it('renders turn narrative', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText(/predawn hours/)).toBeTruthy()
  })

  it('renders action outcome cards', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText('Air strikes hit 12 targets')).toBeTruthy()
  })

  it('renders judge scores', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.getByText('84')).toBeTruthy()  // plausibility
  })

  it('shows no reaction block when reactionPhase is null', () => {
    render(<EventsTab resolution={mockResolution} />)
    expect(screen.queryByText(/reaction phase/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test -- --run tests/components/panels/EventsTab.test.tsx
```

Expected: FAIL — `EventsTab` not found

- [ ] **Step 3: Implement `EventsTab.tsx`**

Structure: last turn narrative (Newsreader italic), per-action outcome cards (`--bg-surface` bg, outcome title + whether succeeded, parameter effects note), reaction phase block (`--status-warning-bg` distinct background with "REACTION PHASE" label in IBM Plex Mono), judge scores section (five dimensions in `font-mono` with Stitch status colors).

- [ ] **Step 4: Implement `ObserverOverlay.tsx`**

Fixed position overlay controls visible in observer mode: fog-of-war toggle (`'OMNISCIENT VIEW'` vs `'ACTOR PERSPECTIVE'` in `font-mono`), perspective actor selector (dropdown with actor names), auto-advance play/pause/speed controls.

- [ ] **Step 5: Run test to verify EventsTab passes**

```bash
bun run test -- --run tests/components/panels/EventsTab.test.tsx
```

Expected: PASS — 4 tests passing

- [ ] **Step 6: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 7: Commit**

```bash
git add components/panels/EventsTab.tsx components/panels/ObserverOverlay.tsx tests/components/panels/EventsTab.test.tsx
git commit -m "feat: EventsTab with per-action outcomes and judge scores, ObserverOverlay (#26 #31)"
```

---

### Task 14: Realtime Wiring — Connect Frontend to Live APIs (#32, #39)

**Files:**
- Modify: `app/scenarios/[id]/play/[branchId]/page.tsx`
- Create: `hooks/useRealtime.ts` (wire to Supabase channel)

- [ ] **Step 1: Implement `useRealtime.ts`**

```typescript
// hooks/useRealtime.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGame } from '@/components/providers/GameProvider'

export function useRealtime(branchId: string) {
  const { dispatch } = useGame()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`branch:${branchId}`)
      .on('broadcast', { event: 'turn_started' }, ({ payload }) => {
        dispatch({ type: 'SET_TURN_PHASE', payload: 'planning' })
        dispatch({ type: 'SET_AVAILABLE_DECISIONS', payload: payload.availableDecisions })
      })
      .on('broadcast', { event: 'resolution_progress' }, ({ payload }) => {
        dispatch({ type: 'SET_RESOLUTION_PROGRESS', payload: payload.message })
      })
      .on('broadcast', { event: 'turn_completed' }, ({ payload }) => {
        dispatch({ type: 'SET_COMMIT', payload: payload })
        dispatch({ type: 'SET_TURN_PHASE', payload: 'complete' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [branchId, dispatch, supabase])
}
```

- [ ] **Step 2: Wire game view page to live APIs**

In `app/scenarios/[id]/play/[branchId]/page.tsx`:
- Call `useRealtime(branchId)` to subscribe to live updates
- Fetch initial scenario state from `GET /api/branches/[branchId]/commits?limit=1`
- Dispatch `SET_COMMIT` with head commit data
- Connect `DispatchTerminal` to `GameContext.resolutionProgress` messages
- Connect `ActorList` and `GlobalIndicators` to `GameContext.scenarioSnapshot`
- Connect `DecisionCatalog` to `GameContext.availableDecisions[userActorId]`

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Step 4: Run full test suite**

```bash
bun run test -- --run
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useRealtime.ts app/scenarios/
git commit -m "feat: wire game view to live APIs — Supabase Realtime, scenario state, decisions (#32 #39)"
```

---

## Final Verification

- [ ] **Run full typecheck**

```bash
bun run typecheck
```

Expected: `0 errors`

- [ ] **Run full test suite**

```bash
bun run test -- --run
```

Expected: All PASS, no failures

- [ ] **Visual smoke test**

```bash
bun run dev
```

Visit:
- `http://localhost:3000/scenarios` — scenario browser loads with Stitch styling
- `http://localhost:3000/scenarios/[id]` — scenario hub renders ActorCards
- `http://localhost:3000/chronicle/[branchId]` — chronicle renders with Newsreader italic prose
- Classification banner visible on all pages (gold `#ffba20`, not `#C9983A`)
- Inter loaded for UI chrome (not fallback system-ui)
- No rounded corners, no box-shadow

- [ ] **Final commit**

```bash
git add .
git commit -m "feat: complete Stitch design migration — all components, routes, and live API wiring"
```

---

## Spec 1 Carry-Forwards

> These architectural decisions from `docs/superpowers/specs/2026-03-22-frontend-spec1-design.md`
> were not covered by the Stitch plan and must not be lost during execution. Apply them at the
> task callout points below.

---

### 1. Font loading — modify Task 1 Step 1

Use `next/font/google` with the `variable` option instead of a plain `<link>` tag. Next.js
self-hosts the fonts, eliminates FOUT, and manages CSS variables automatically.

Replace Task 1 Step 1 with:

```tsx
// app/layout.tsx
// DESIGN.md font roles:
//   Inter         → UI & Title (all interface chrome) → font-sans / --font-sans
//   Newsreader    → Display & Headline (chronicle prose, simulation titles) → font-serif / --font-serif
//   Space Grotesk → Labels ONLY (telemetry, coordinates, military unit data) → font-label / --font-label
//   IBM Plex Mono → Timestamps, classification banners → font-mono / --font-mono
import { Inter, Space_Grotesk, Newsreader, IBM_Plex_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${ibmPlexMono.variable}`}>
      ...
    </html>
  )
}
```

Then in `globals.css` and `tailwind.config.ts`, reference these variables:

```css
/* globals.css */
--font-sans:  var(--font-inter);           /* Inter — all UI chrome */
--font-serif: var(--font-newsreader);      /* Newsreader — chronicle prose, titles */
--font-label: var(--font-space-grotesk);   /* Space Grotesk — labels/telemetry ONLY */
--font-mono:  var(--font-ibm-plex-mono);   /* IBM Plex Mono — timestamps, banners */
```

```typescript
// tailwind.config.ts
fontFamily: {
  sans:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
  serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
  label: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],  // telemetry/coords only
  mono:  ['var(--font-ibm-plex-mono)', 'monospace'],
},
```

Do **not** hardcode font family strings in `globals.css` — `next/font` manages them via CSS variables.

---

### 2. RSC → GameProvider boundary — add to Task 13

`app/scenarios/[id]/play/[branchId]/page.tsx` must be a **React Server Component**. It fetches
`initialSnapshot` server-side (using the service role key) and passes it as a prop to the client
`<GameProvider>`. This eliminates loading flash — the user sees a fully populated view on first
render.

```typescript
// app/scenarios/[id]/play/[branchId]/page.tsx  (Server Component — no 'use client')
import { createServerClient } from '@/lib/supabase/server'
import { GameProvider } from '@/components/providers/GameProvider'
import { GameLayout } from '@/components/layout/GameLayout'

const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

export default async function GamePage({
  params,
}: {
  params: { id: string; branchId: string }
}) {
  const snapshot = isDev
    ? await getIranSeedSnapshot()
    : await getScenarioSnapshot(params.branchId, createServerClient())

  return (
    <GameProvider initialSnapshot={snapshot}>
      <GameLayout />
    </GameProvider>
  )
}
```

**Security invariants (enforce on every edit to this file):**
- `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix — server-only, never in any `'use client'` file
- The Supabase service role client is instantiated inside this RSC only, never exported or passed as a prop
- `initialSnapshot` is a plain serializable object — safe to cross the RSC boundary as a prop
- In dev mode, `getIranSeedSnapshot()` uses the **anon key**, not the service role key

The client-side `useRealtime` hook (from Task 13 Step 2) handles live updates **after** initial load.
The RSC handles the initial hydration. Both are needed; neither replaces the other.

---

### 3. Dev bypass — add to Task 13

When `NEXT_PUBLIC_DEV_MODE=true`:

1. `middleware.ts` skips the session check for game routes — no redirect to `/auth/login`
2. `hooks/useDevAuth.ts` returns a hardcoded `devUser` object
3. The RSC fetcher calls `getIranSeedSnapshot()` instead of querying Supabase with the service role
4. Home page (`app/page.tsx`) shows a "Jump to game →" link pointing to `/scenarios/iran-seed/play/trunk`

```typescript
// hooks/useDevAuth.ts
export function useDevAuth() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') return null
  return {
    id: 'dev-user',
    email: 'dev@geosim.local',
    role: 'admin' as const,
  }
}
```

```typescript
// middleware.ts — add before the session check
if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && request.nextUrl.pathname.startsWith('/scenarios')) {
  return NextResponse.next()
}
```

Set to `false` (or remove) to restore full auth in staging/production.

---

### 4. Missing components — add to Task 3

Two components from Spec 1 are absent from the Stitch plan's file structure. Add them to Task 3
alongside the other game atoms:

**`components/ui/TagList.tsx`** — flex row of `Badge` components with wrapping. Used in:
- Chronicle turn entries (dimension tags)
- Actor intel picture section
- Decision cards

```tsx
import { Badge } from './Badge'

interface TagListProps {
  tags: { label: string; variant: string }[]
  className?: string
}

export function TagList({ tags, className }: TagListProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ''}`}>
      {tags.map((t) => (
        <Badge key={t.label} variant={t.variant as any}>{t.label}</Badge>
      ))}
    </div>
  )
}
```

**`components/game/CostMagnitude.tsx`** — semantic cost label. Used in decision cards and analysis panel.

```tsx
const colors = {
  low:      'text-status-stable',
  moderate: 'text-status-warning',
  high:     'text-status-critical',
  extreme:  'text-status-critical font-semibold',
} as const

interface CostMagnitudeProps {
  level: keyof typeof colors
}

export function CostMagnitude({ level }: CostMagnitudeProps) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-[0.04em] ${colors[level]}`}>
      {level}
    </span>
  )
}
```
