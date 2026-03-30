# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/page.tsx` component showcase with a real landing page — classification banner, hero, how-it-works (3 steps with full prose), Iran 2026 scenario excerpt, and dual CTAs.

**Architecture:** Single file replacement (`app/page.tsx`). All UI uses existing `components/ui/` primitives. No new components — inline JSX for one-off landing elements. Tests use `@testing-library/react` with the existing jsdom Vitest setup.

**Tech Stack:** Next.js 14 App Router (RSC), Tailwind CSS, `@testing-library/react`, Vitest

**Spec:** `docs/superpowers/specs/2026-03-30-landing-page-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/page.tsx` | Replace showcase with landing page |
| Create | `tests/components/LandingPage.test.tsx` | Verify content and routing |

---

### Task 1: Create feature branch

- [ ] **Step 1: Branch off main**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
git checkout main && git pull
git checkout -b feat/landing-page-issue-29
```

Expected: switched to new branch `feat/landing-page-issue-29`

---

### Task 2: Write failing tests

- [ ] **Step 1: Create test file**

Create `tests/components/LandingPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Landing page — issue #29', () => {
  it('renders classification banner', () => {
    render(<Home />)
    expect(
      screen.getByText(/TOP SECRET.*GEOSIM.*DECLASSIFIED/i)
    ).toBeInTheDocument()
  })

  it('renders hero headline with alternate timeline phrase', () => {
    render(<Home />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/Model the decisions that shape history/i)
    expect(h1).toHaveTextContent(/alternate timeline/i)
  })

  it('renders all three how-it-works step numbers', () => {
    render(<Home />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
  })

  it('renders hero Launch Simulation CTA linking to /scenarios/iran-2026', () => {
    render(<Home />)
    const links = screen.getAllByRole('link', { name: /launch simulation/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/scenarios/iran-2026')
  })

  it('renders Browse Scenarios CTA linking to /scenarios', () => {
    render(<Home />)
    const links = screen.getAllByRole('link', { name: /browse/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/scenarios')
  })

  it('renders Iran 2026 scenario card with SECRET badge', () => {
    render(<Home />)
    expect(screen.getByText('SECRET')).toBeInTheDocument()
    expect(screen.getByText(/IRAN 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/The Oil War Escalates/i)).toBeInTheDocument()
  })

  it('does not render component showcase elements', () => {
    render(<Home />)
    expect(screen.queryByText(/System Status/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Global Indicators/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Sample Progress/i)).not.toBeInTheDocument()
  })
})
```

---

### Task 3: Run tests — confirm they fail

- [ ] **Step 1: Run the test file**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
bun run test -- --run tests/components/LandingPage.test.tsx
```

Expected: 7 failures. The component showcase page doesn't have a classification banner, an `<h1>`, step numbers, or the other expected elements. If tests unexpectedly pass, re-read them — something is wrong.

---

### Task 4: Implement the landing page

- [ ] **Step 1: Replace `app/page.tsx` entirely**

```tsx
import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <>
      {/* Classification banner — static, scrolls away */}
      <div className="bg-[#b91c1c] text-white font-mono text-[9px] tracking-[0.12em] text-center py-[3px]">
        TOP SECRET {' // '} GEOSIM {' // '} DECLASSIFIED FOR PUBLIC RESEARCH
      </div>

      <TopBar />

      <main className="topo-grid pt-[90px] px-8 pb-16 min-h-screen">

        {/* Document ID row */}
        <div className="font-mono text-[8px] text-text-tertiary uppercase tracking-[0.08em] py-2.5 border-b border-border-subtle flex gap-6">
          <span>DOC-ID: <span className="text-text-secondary">GS-OVERVIEW-001</span></span>
          <span>CLASSIFICATION: <span className="text-text-secondary">UNCLASSIFIED {' // '} PUBLIC</span></span>
          <span>VERSION: <span className="text-text-secondary">SPRINT 3 {' // '} 30 MARCH 2026</span></span>
        </div>

        {/* Hero — gold left border */}
        <section
          className="-mx-8 px-8 py-7 mt-0 border-b border-[#1a1a1a] bg-[#0c0c0c]"
          style={{ borderLeft: '3px solid #ffba20' }}
        >
          <div className="font-mono text-[8px] text-text-tertiary tracking-[0.12em] uppercase mb-2.5">
            INTELLIGENCE-GROUNDED {' // '} MULTI-ACTOR {' // '} BRANCHING TIMELINES
          </div>

          <h1 className="font-label font-bold text-[28px] text-text-primary leading-[1.3] tracking-[0.01em] mb-2.5">
            Model the decisions that shape history.<br />
            Explore every{' '}
            <em
              className="not-italic text-gold"
              style={{ borderBottom: '1px solid rgba(255,186,32,0.4)', paddingBottom: '1px' }}
            >
              alternate timeline.
            </em>
          </h1>

          <p className="font-sans text-[13px] text-text-secondary leading-[1.7] max-w-[560px] mb-5">
            GeoSim is an AI-powered strategic simulation engine grounded in real-world
            intelligence data. Load a real-world scenario, watch AI agents model every actor
            simultaneously, then fork the timeline at any turning point to discover what might
            have been.
          </p>

          <div className="flex gap-2.5 items-center">
            <Link href="/scenarios/iran-2026">
              <Button variant="primary">&#9655; LAUNCH SIMULATION</Button>
            </Link>
            <Link href="/scenarios">
              <Button variant="ghost">BROWSE SCENARIOS</Button>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <SectionDivider title="HOW IT WORKS" subtitle="OPERATIONAL OVERVIEW" />

        <div className="flex flex-col divide-y divide-[#141414] mb-2">

          {/* Step 01 */}
          <div className="flex gap-4 py-4">
            <div className="flex-shrink-0 mt-0.5 h-fit px-[9px] py-1 bg-[#141414] border border-[#222] font-label font-bold text-[9px] text-gold tracking-[0.04em]">
              01
            </div>
            <div>
              <h3 className="font-label font-bold text-[10px] text-text-secondary tracking-[0.08em] uppercase mb-1.5">
                Seed &mdash; Load Real-World Intelligence
              </h3>
              <p className="font-sans text-[10px] text-text-tertiary leading-[1.7]">
                Every simulation begins with verified data. GeoSim seeds each scenario from
                open-source intelligence sources &mdash; military deployments, economic indicators,
                political alignment scores, and infrastructure vulnerability assessments. Iran 2026
                draws from actual Strait of Hormuz shipping data, IRGC order of battle estimates,
                and US Fifth Fleet positioning records.
              </p>
            </div>
          </div>

          {/* Step 02 */}
          <div className="flex gap-4 py-4">
            <div className="flex-shrink-0 mt-0.5 h-fit px-[9px] py-1 bg-[#141414] border border-[#222] font-label font-bold text-[9px] text-gold tracking-[0.04em]">
              02
            </div>
            <div>
              <h3 className="font-label font-bold text-[10px] text-text-secondary tracking-[0.08em] uppercase mb-1.5">
                Simulate &mdash; AI Agents Model Every Actor
              </h3>
              <p className="font-sans text-[10px] text-text-tertiary leading-[1.7] mb-1.5">
                Once seeded, AI agents take control of each actor simultaneously &mdash; US, Iran,
                Israel, Saudi Arabia, China. Each agent operates from its own intelligence picture
                under fog of war, pursues its own strategic objectives, and selects actions from an
                escalation ladder calibrated to that actor&rsquo;s doctrine and constraints.
              </p>
              <ul className="font-sans text-[10px] text-text-tertiary leading-[1.7] pl-3.5 space-y-0.5 list-disc">
                <li>Agents submit turn plans with <strong className="text-text-secondary">primary + concurrent actions</strong> &mdash; diplomacy, military, economic, cyber</li>
                <li>A <strong className="text-text-secondary">resolution engine</strong> evaluates interactions and calculates second and third-order effects</li>
                <li>A <strong className="text-text-secondary">judge</strong> scores the resolution for plausibility and retries if the outcome is implausible</li>
                <li>A <strong className="text-text-secondary">narrator</strong> renders the turn as a classified intelligence dispatch &mdash; timestamped, sourced</li>
              </ul>
            </div>
          </div>

          {/* Step 03 */}
          <div className="flex gap-4 py-4">
            <div className="flex-shrink-0 mt-0.5 h-fit px-[9px] py-1 bg-[#141414] border border-[#222] font-label font-bold text-[9px] text-gold tracking-[0.04em]">
              03
            </div>
            <div>
              <h3 className="font-label font-bold text-[10px] text-text-secondary tracking-[0.08em] uppercase mb-1.5">
                Branch &mdash; Fork the Timeline at Any Decision
              </h3>
              <p className="font-sans text-[10px] text-text-tertiary leading-[1.7] mb-1.5">
                At any turn, branch the simulation: &ldquo;What if Iran had chosen differently at
                Turn 4?&rdquo; or &ldquo;What if the US had not repositioned the carrier
                group?&rdquo; Each branch is a full parallel timeline with its own chronicle,
                escalation trajectory, and outcome.
              </p>
              <ul className="font-sans text-[10px] text-text-tertiary leading-[1.7] pl-3.5 space-y-0.5 list-disc">
                <li>Branches are <strong className="text-text-secondary">git-like</strong> &mdash; every turn is an immutable commit, every fork is a new branch</li>
                <li>Compare timelines <strong className="text-text-secondary">side-by-side</strong> to see how a single decision reshapes the entire trajectory</li>
                <li>There is no &ldquo;correct&rdquo; outcome &mdash; every branch reveals a <strong className="text-text-secondary">plausible alternate history</strong></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Active scenario */}
        <SectionDivider title="ACTIVE SCENARIO" subtitle="IRAN 2026 — STRAIT OF HORMUZ CLOSURE" />

        <div
          className="bg-[#0d0d0d] p-4 mb-8"
          style={{ border: '1px solid #1a1a1a', borderLeft: '3px solid #b91c1c' }}
        >
          {/* Card header */}
          <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
            <span className="bg-[#b91c1c] text-white font-mono text-[8px] tracking-[0.08em] px-1.5 py-0.5">
              SECRET
            </span>
            <span className="font-label font-bold text-[11px] text-text-primary tracking-[0.04em]">
              IRAN 2026 &mdash; STRAIT OF HORMUZ
            </span>
            <span className="ml-auto font-mono text-[8px] text-text-tertiary tracking-[0.06em]">
              TURN 03 {' // '} 15 MARCH 2026
            </span>
          </div>

          {/* Intel excerpt */}
          <div className="border-l-2 border-l-gold pl-2.5 mb-3">
            <div className="font-mono text-[8px] text-text-tertiary tracking-[0.06em] mb-1">
              15 MAR 2026 {' // '} 14:32 UTC {' // '} SEVERITY: CRITICAL
            </div>
            <div className="font-label font-bold text-[11px] text-text-primary tracking-[0.02em] uppercase mb-1.5">
              The Oil War Escalates
            </div>
            <div className="prose-chronicle text-[10px]">
              Frustrated by the Strait closure, <strong>US and Israeli</strong>{" "}
              forces pivoted to economic warfare, striking Iran&rsquo;s oil export
              infrastructure &mdash; Kharg Island terminal, refineries near Abadan.{" "}
              <strong>Iran</strong> responded in kind. Ballistic missiles struck the{" "}
              <strong>Ras Tanura</strong> complex in Saudi Arabia. The message was
              unmistakable: if Iran&rsquo;s oil burned, so would everyone else&rsquo;s.
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Badge variant="critical">Gulf Infrastructure</Badge>
              <Badge variant="military">Ras Tanura Hit</Badge>
              <Badge variant="warning">Oil $142/bbl</Badge>
            </div>
          </div>

          {/* Actor strip */}
          <div className="flex gap-1.5 pt-2.5 border-t border-[#181818] flex-wrap">
            <span className="font-mono text-[8px] text-text-secondary tracking-[0.06em] px-2 py-0.5 border border-[#2a2a2a]">USA</span>
            <span className="font-mono text-[8px] text-text-secondary tracking-[0.06em] px-2 py-0.5 border border-[#2a2a2a]">IRAN</span>
            <span className="font-mono text-[8px] text-text-secondary tracking-[0.06em] px-2 py-0.5 border border-[#2a2a2a]">ISRAEL</span>
            <span className="font-mono text-[8px] text-text-tertiary tracking-[0.06em] px-2 py-0.5 border border-[#1e1e1e]">SAUDI ARABIA</span>
            <span className="font-mono text-[8px] text-text-tertiary tracking-[0.06em] px-2 py-0.5 border border-[#1e1e1e]">CHINA</span>
          </div>
        </div>

        {/* Closing CTA — gold left border mirrors hero */}
        <section
          className="-mx-8 px-8 py-5 border-t border-[#1a1a1a] bg-[#0c0c0c]"
          style={{ borderLeft: '3px solid #ffba20' }}
        >
          <div className="font-mono text-[8px] text-text-tertiary tracking-[0.1em] uppercase mb-3.5">
            READY TO RUN THE SCENARIO? {' // '} CHOOSE YOUR ENTRY POINT
          </div>
          <div className="flex gap-2.5 items-center">
            <Link href="/scenarios/iran-2026">
              <Button variant="primary">&#9655; LAUNCH SIMULATION &mdash; IRAN 2026</Button>
            </Link>
            <Link href="/scenarios">
              <Button variant="ghost">BROWSE ALL SCENARIOS</Button>
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}
```

---

### Task 5: Run tests — confirm they pass

- [ ] **Step 1: Run the test file**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
bun run test -- --run tests/components/LandingPage.test.tsx
```

Expected: 7 tests pass. If any fail, read the error carefully — common issues:
- Classification banner test: check the exact text content rendered. The `{' // '}` JSX pattern renders as ` // ` (spaces included). Use `/TOP SECRET/i` + `/GEOSIM/i` separately if the regex doesn't match.
- Heading test: if `screen.getByRole('heading', { level: 1 })` throws, ensure `<h1>` is used (not `<div>`).
- Link test: `next/link` renders as `<a href="...">` in jsdom — if `toHaveAttribute('href')` fails, log `document.body.innerHTML` to inspect rendered output.

- [ ] **Step 2: Run full test suite to check for regressions**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
bun run test -- --run
```

Expected: all pre-existing tests still pass. The landing page change is isolated to `app/page.tsx`.

---

### Task 6: Lint and typecheck

- [ ] **Step 1: Run ESLint**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
bun run lint
```

Expected: no errors. Common gotchas from CLAUDE.md:
- `// text` inside JSX → use `{' // text '}` (already done in implementation above)
- Unused destructured params → prefix with `_`
- `border: 'none'` after `borderBottom` in inline styles → put shorthand first (already done)

- [ ] **Step 2: Run typecheck**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
bun run typecheck
```

Expected: no errors. The page only uses typed component props — all are correct as written.

---

### Task 7: Playwright visual validation

- [ ] **Step 1: Start the dev server**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
bun run dev
```

- [ ] **Step 2: Run Playwright skill**

Use the `geosim-playwright` skill to verify the landing page at `http://localhost:3000`.

Check for:
- Classification banner visible at top
- Hero headline present with gold "alternate timeline." underline
- Three step badge numbers (01, 02, 03) visible
- Iran 2026 scenario card with SECRET badge and intel excerpt
- Both CTAs present (Launch Simulation, Browse Scenarios)
- No component showcase elements (no badge grid, no score displays, no progress bars)

---

### Task 8: UI/UX validation

- [ ] **Step 1: Run geosim-uiux-validation skill**

Use the `geosim-uiux-validation` skill against the landing page.

User must approve all 4 categories (CAT 1–4) before proceeding to commit.

---

### Task 9: Commit and open PR

- [ ] **Step 1: Stage and commit**

```bash
cd '/mnt/c/Users/Jason Ingersoll/dev/GeoSim'
git add app/page.tsx tests/components/LandingPage.test.tsx
git commit -m "feat: landing page — replace component showcase with real product page (#29)"
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/landing-page-issue-29
gh pr create \
  --title "feat: landing page — replace component showcase (#29)" \
  --body "$(cat <<'EOF'
## Summary
- Replaces component showcase in `app/page.tsx` with a real product landing page
- Sections: classification banner, hero with gold left-border treatment, 3-step how-it-works with full prose, Iran 2026 scenario excerpt, dual CTAs
- All content static (no Supabase — that's #28)

## Visual design
- Option A layout (Intelligence Briefing Document) + Option Y treatment (gold border accent system)
- Hero: `border-left: 3px solid #ffba20`, H1 with gold underline on "alternate timeline."
- Steps: bordered gold badge chips (01/02/03), divider-separated rows
- Scenario card: red left border (`#b91c1c`), gold inner annotation block

## Test plan
- [ ] `bun run test -- --run tests/components/LandingPage.test.tsx` — 7 tests pass
- [ ] `bun run lint` — no errors
- [ ] `bun run typecheck` — no errors
- [ ] Playwright validation — all landing page elements present
- [ ] UI/UX validation — CAT 1–4 approved

Closes #29

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Classification banner (red, `#b91c1c`, correct text)
- ✅ TopBar reused unchanged
- ✅ Doc-ID row (custom implementation — DocumentIdHeader format doesn't map to landing page fields)
- ✅ Hero: gold left border, overline tag, H1 with gold underlined phrase, sub paragraph, CTAs
- ✅ How It Works: 3 steps, badge chips, Step 01 paragraph, Step 02 paragraph + 4 bullets, Step 03 paragraph + 3 bullets
- ✅ Scenario card: red left border, SECRET badge, intel excerpt with gold annotation, badge row, actor strip
- ✅ Closing CTA: gold left border, label, dual CTAs linking to correct routes
- ✅ SectionDivider used for both section headers
- ✅ Badge component used for intel tags (variant="critical", "military", "warning")
- ✅ Button component used for all CTAs (variant="primary", "ghost")
- ✅ Tests cover all 7 spec requirements
- ✅ No ScoreDisplay, ProgressBar, or showcase elements remain

**Placeholder scan:** No TBDs, no "implement later", no vague steps. All code is complete.

**Type consistency:** `Badge` uses `variant="critical"/"military"/"warning"` — all valid BadgeVariant values per component definition. `Button` uses `variant="primary"/"ghost"` — both valid. `SectionDivider` uses `title` (required) + `subtitle` (optional) — correct.
