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

      <main className="topo-grid pt-[90px] pb-16 min-h-screen">

        {/* Hero — full viewport, centered */}
        <section
          className="-mx-0 px-8 flex flex-col items-center justify-center text-center relative overflow-hidden border-b border-[#1a1a1a] bg-[#0b0b0b]"
          style={{ minHeight: 'calc(100vh - 90px)' }}
        >
          {/* Ghost watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span
              className="font-label font-black text-gold leading-none tracking-[-0.03em]"
              style={{ fontSize: '22vw', opacity: 0.03 }}
            >
              GEOSIM
            </span>
          </div>

          {/* Doc ID — pinned top */}
          <div className="absolute top-5 left-0 right-0 flex justify-center">
            <div className="font-mono text-text-tertiary uppercase tracking-[0.1em] opacity-50" style={{ fontSize: '8px' }}>
              DOC-ID: GS-OVERVIEW-001 {' // '} UNCLASSIFIED {' // '} 30 MARCH 2026
            </div>
          </div>

          {/* Overline with gold rule dividers */}
          <div className="flex items-center gap-4 mb-8 z-10">
            <span className="block w-10 h-px" style={{ backgroundColor: '#ffba20', opacity: 0.4 }}></span>
            <span className="font-mono text-text-tertiary tracking-[0.14em] uppercase" style={{ fontSize: '9px' }}>
              INTELLIGENCE-GROUNDED {' // '} MULTI-ACTOR {' // '} BRANCHING TIMELINES
            </span>
            <span className="block w-10 h-px" style={{ backgroundColor: '#ffba20', opacity: 0.4 }}></span>
          </div>

          {/* H1 — large, centered */}
          <h1
            className="font-label font-bold text-text-primary leading-[1.15] tracking-[-0.01em] mb-6 z-10"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', maxWidth: '860px' }}
          >
            Model the decisions that shape history.{' '}
            Explore every{' '}
            <em
              className="not-italic text-gold"
              style={{ borderBottom: '1px solid rgba(255,186,32,0.35)', paddingBottom: '2px' }}
            >
              alternate timeline.
            </em>
          </h1>

          {/* Sub */}
          <p className="font-sans text-text-secondary leading-[1.7] max-w-[520px] mb-10 z-10" style={{ fontSize: '14px' }}>
            AI-powered strategic simulation grounded in real intelligence data.
            Every actor modeled from their own perspective.
            Every decision a fork in history.
          </p>

          {/* CTAs */}
          <div className="flex gap-3 items-center justify-center z-10">
            <Link href="/scenarios/iran-2026">
              <Button variant="primary">&#9655; LAUNCH SIMULATION</Button>
            </Link>
            <Link href="/scenarios">
              <Button variant="ghost">BROWSE SCENARIOS</Button>
            </Link>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className="font-mono text-text-tertiary tracking-[0.1em] animate-pulse" style={{ fontSize: '8px' }}>
              &#9660; SCROLL TO BRIEF
            </div>
          </div>
        </section>

        <div className="px-8">

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

        </div>{/* end px-8 wrapper */}

        {/* Closing CTA — centered, gold accent */}
        <div className="px-8 py-10 border-t border-[#1a1a1a] bg-[#0b0b0b] flex flex-col items-center text-center">
          <div className="font-mono text-text-tertiary tracking-[0.1em] uppercase mb-5" style={{ fontSize: '8px' }}>
            READY TO RUN THE SCENARIO? {' // '} CHOOSE YOUR ENTRY POINT
          </div>
          <div className="flex gap-3 items-center justify-center">
            <Link href="/scenarios/iran-2026">
              <Button variant="primary">&#9655; LAUNCH SIMULATION &mdash; IRAN 2026</Button>
            </Link>
            <Link href="/scenarios">
              <Button variant="ghost">BROWSE ALL SCENARIOS</Button>
            </Link>
          </div>
        </div>

      </main>
    </>
  );
}
