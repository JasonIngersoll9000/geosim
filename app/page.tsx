'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

// ─── Animation variants ───────────────────────────────────────────────────────

const heroContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const heroItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

const heroItemSlow: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const watermark: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.04, transition: { duration: 0.8, ease: "easeOut", delay: 0.5 } },
}

const inViewContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const inViewItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FeaturedScenario {
  id: string
  name: string
  description: string
  latestTurnNumber: number | null
  latestHeadline: string | null
  latestNarrative: string | null
  latestDate: string | null
  actorLabels: { label: string; color: string }[]
}

const ACTOR_COLORS: Record<string, string> = {
  usa: '#4a90d9', irn: '#c0392b', isr: '#ffba20',
  sau: '#5EBD8E', chn: '#4A90B8', rus: '#9B59B6',
}

function getColor(code: string) {
  return ACTOR_COLORS[code.toLowerCase()] ?? '#888'
}

export default function Home() {
  const shouldSkip = useReducedMotion()
  const heroInit = shouldSkip ? "visible" : "hidden"

  const [featured, setFeatured] = useState<FeaturedScenario | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const scenRes = await fetch('/api/scenarios?limit=1')
        if (!scenRes.ok) return
        const scenJson = await scenRes.json() as { data: Array<{ id: string; name: string; description: string; actorCount?: number }> }
        const sc = scenJson.data?.[0]
        if (!sc) return

        const branchApiRes = await fetch(`/api/branches?scenarioId=${encodeURIComponent(sc.id)}`)
        if (!branchApiRes.ok) return
        const branchJson = await branchApiRes.json() as {
          branches: Array<{ id: string; is_trunk: boolean; turn_commits: Array<{ turn_number: number; simulated_date: string; chronicle_headline: string | null; chronicle_entry?: string; narrative_entry?: string }> }>;
          actors: Array<{ id: string; name: string; short_name: string | null }>;
        }

        const trunk = branchJson.branches?.find(b => b.is_trunk)
        const commits = (trunk?.turn_commits ?? []).sort((a, b) => b.turn_number - a.turn_number)
        const latestCommit = commits[0] ?? null

        const actors = branchJson.actors ?? []

        setFeatured({
          id: sc.id,
          name: sc.name,
          description: sc.description,
          latestTurnNumber: latestCommit?.turn_number ?? null,
          latestHeadline: latestCommit?.chronicle_headline ?? null,
          latestNarrative: (latestCommit?.chronicle_entry ?? latestCommit?.narrative_entry) ?? null,
          latestDate: latestCommit?.simulated_date ?? null,
          actorLabels: actors.slice(0, 5).map(a => ({
            label: (a.short_name ?? a.name.slice(0, 3)).toUpperCase(),
            color: getColor(a.short_name ?? a.name.slice(0, 3)),
          })),
        })
      } catch (err) {
        console.error('[Home] fetch error:', err)
      }
    })()
  }, [])

  return (
    <>
      <TopBar scenarioName="Strategic Simulation Engine" />

      <main>
        {/* Hero */}
        <section
          className="relative flex flex-col items-center justify-center min-h-screen px-8 overflow-hidden"
          style={{
            backgroundImage: [
              "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,186,32,0.02) 40px)",
              "repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,186,32,0.02) 40px)",
            ].join(", "),
          }}
        >
          {/* GEOSIM watermark — fades in last, no translate */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center font-label font-bold uppercase tracking-[0.08em] text-text-primary"
            style={{ fontSize: "28vw", zIndex: 0 }}
            variants={watermark}
            initial={heroInit}
            animate="visible"
          >
            GEOSIM
          </motion.span>

          <motion.span
            aria-hidden="true"
            className="pointer-events-none select-none absolute font-label font-bold uppercase tracking-[0.15em]"
            style={{
              fontSize: "clamp(48px, 9vw, 110px)",
              color: "#b91c1c",
              zIndex: 1,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-8deg)",
              whiteSpace: "nowrap",
            }}
            initial={shouldSkip ? { opacity: 0.025 } : { opacity: 0 }}
            animate={{ opacity: 0.025 }}
            transition={shouldSkip ? {} : { duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            TOP SECRET
          </motion.span>

          <motion.div
            className="relative flex flex-col items-center text-center"
            style={{ zIndex: 2, paddingTop: "66px" }}
            variants={heroContainer}
            initial={heroInit}
            animate="visible"
          >
            {/* Overline */}
            <motion.div
              variants={heroItem}
              className="inline-flex items-center gap-3 border border-[#1f1f1f] px-4 py-2 mb-8"
            >
              <span className="inline-block w-4 h-px bg-gold opacity-60" />
              <span className="font-mono text-2xs text-text-tertiary tracking-[0.14em] uppercase">
                Classified Research Framework&nbsp;&nbsp;//&nbsp;&nbsp;GEOSIM-IRN-2026
              </span>
              <span className="inline-block w-4 h-px bg-gold opacity-60" />
            </motion.div>

            {/* H1 */}
            <motion.h1
              variants={heroItemSlow}
              className="font-label font-bold uppercase tracking-[0.02em] text-text-primary max-w-[900px]"
              style={{ fontSize: "clamp(52px, 8vw, 88px)", lineHeight: 1.05 }}
            >
              Model the decisions.{" "}
              <br className="hidden md:block" />
              <span style={{ color: "var(--gold)" }}>Fork the timeline.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={heroItem}
              className="font-sans text-lg text-text-secondary max-w-[640px] mt-6 leading-[1.7]"
            >
              AI-powered geopolitical simulation. Every actor plays simultaneously.
              Explore any{" "}
              <span className="font-serif italic text-text-primary">
                alternate timeline
              </span>{" "}
              from any turning point — grounded in real-world intelligence.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={heroItem} className="flex items-center gap-4 mt-10">
              <Link href="/scenarios/iran-2026">
                <Button variant="primary">Enter Simulation &rarr;</Button>
              </Link>
              <Link href="/scenarios">
                <Button variant="ghost">Browse Scenarios</Button>
              </Link>
            </motion.div>

            <motion.div variants={heroItem} className="mt-16 flex flex-col items-center gap-2">
              <span className="font-mono text-2xs text-text-tertiary tracking-[0.1em] uppercase">
                Scroll for briefing
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="text-gold"
              >
                <path
                  d="M10 4v12M5 11l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section className="px-8 py-20 max-w-[1100px] mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <span className="inline-block h-px flex-1 bg-[#1a1a1a] max-w-[40px]" />
            <span className="font-mono text-2xs text-text-tertiary tracking-[0.12em] uppercase">
              System Overview // How It Works
            </span>
            <span className="inline-block h-px flex-1 bg-[#1a1a1a]" />
          </div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={inViewContainer}
            initial={shouldSkip ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div variants={inViewItem} className="border border-[#1a1a1a] border-l-[3px] border-l-gold p-6">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-mono font-medium text-gold bg-[#1a1300] border border-[rgba(255,186,32,0.2)] px-3 py-1.5"
                  style={{ fontSize: "11px", letterSpacing: "0.05em" }}
                >
                  01
                </span>
                <span className="font-label font-bold text-sm text-text-primary uppercase tracking-[0.06em]">
                  Load a Scenario
                </span>
              </div>
              <p className="font-serif text-lg text-text-secondary leading-[1.75]">
                Select a real-world geopolitical crisis — Iran 2026, Taiwan Strait,
                or any scenario you define. Each scenario is a fully-modeled
                environment with actors, objectives, and intelligence data.
              </p>
              <ul className="mt-3 space-y-1.5 list-none pl-0">
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Real-world intelligence grounding
                </li>
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Nation-state and faction actors
                </li>
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Live escalation ladder tracking
                </li>
              </ul>
            </motion.div>

            <motion.div variants={inViewItem} className="border border-[#1a1a1a] border-l-[3px] border-l-[#2a2a2a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-mono font-medium text-text-tertiary bg-bg-surface-low border border-[#2a2a2a] px-3 py-1.5"
                  style={{ fontSize: "11px", letterSpacing: "0.05em" }}
                >
                  02
                </span>
                <span className="font-label font-bold text-sm text-text-primary uppercase tracking-[0.06em]">
                  Watch AI Actors Play
                </span>
              </div>
              <p className="font-serif text-lg text-text-secondary leading-[1.75]">
                AI agents simultaneously drive every actor in the scenario — each
                with distinct objectives, constraints, and intelligence pictures.
                No two resolutions play out the same.
              </p>
              <ul className="mt-3 space-y-1.5 list-none pl-0">
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Simultaneous multi-actor resolution
                </li>
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Independent intel per actor
                </li>
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Plausibility-scored outcomes
                </li>
              </ul>
            </motion.div>

            <motion.div variants={inViewItem} className="border border-[#1a1a1a] border-l-[3px] border-l-[#2a2a2a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-mono font-medium text-text-tertiary bg-bg-surface-low border border-[#2a2a2a] px-3 py-1.5"
                  style={{ fontSize: "11px", letterSpacing: "0.05em" }}
                >
                  03
                </span>
                <span className="font-label font-bold text-sm text-text-primary uppercase tracking-[0.06em]">
                  Fork the Timeline
                </span>
              </div>
              <p className="font-serif text-lg text-text-secondary leading-[1.75]">
                At any turning point, fork the scenario into a new branch and
                replay history under different decisions. Each branch is a parallel
                timeline — a new{" "}
                <span className="italic">alternate timeline</span> to explore.
              </p>
              <ul className="mt-3 space-y-1.5 list-none pl-0">
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Branch from any completed turn
                </li>
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Divergent timelines tracked
                </li>
                <li className="font-serif text-base text-text-tertiary leading-[1.7] before:content-['—'] before:mr-2 before:text-gold before:opacity-60">
                  Full chronicle of every branch
                </li>
              </ul>
            </motion.div>
          </motion.div>
        </section>

        {/* Featured Scenario Card */}
        <section className="px-8 py-12 max-w-[1100px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-block h-px flex-1 bg-[#1a1a1a] max-w-[40px]" />
            <span className="font-mono text-2xs text-text-tertiary tracking-[0.12em] uppercase">
              Active Scenario // Intel Package
            </span>
            <span className="inline-block h-px flex-1 bg-[#1a1a1a]" />
          </div>

          <div
            className="relative border border-[#1a1a1a] overflow-hidden"
            style={{ borderLeft: "3px solid #b91c1c" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: [
                  "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(185,28,28,0.03) 20px)",
                  "repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(185,28,28,0.03) 20px)",
                ].join(", "),
              }}
            />

            <div className="relative p-8">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Badge variant="critical">SECRET</Badge>
                  <span className="font-mono text-2xs text-text-tertiary tracking-[0.08em] uppercase">
                    {featured ? featured.name.toUpperCase() : 'IRAN 2026 // STRAIT OF HORMUZ'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs text-text-tertiary">
                    {featured?.latestTurnNumber != null
                      ? `TURN ${String(featured.latestTurnNumber).padStart(2, '0')} // ACTIVE`
                      : 'TURN 03 // ACTIVE'}
                  </span>
                  <span
                    className="inline-block w-2 h-2 rounded-full actor-pulse"
                    style={{ background: "#b91c1c" }}
                  />
                </div>
              </div>

              <h2 className="font-label font-bold text-xl text-text-primary uppercase tracking-[0.02em] mb-1">
                {featured?.latestHeadline ?? 'The Oil War Escalates'}
              </h2>
              <div className="font-mono text-2xs text-text-tertiary tracking-[0.04em] mb-4">
                {featured?.latestDate
                  ? `${new Date(featured.latestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} // INTEL BRIEF // T${featured.latestTurnNumber ?? 1} // ACTIVE`
                  : 'INTEL BRIEF // AWAITING LIVE DATA'}
              </div>

              <div className="prose-chronicle max-w-[760px]">
                {featured?.latestNarrative ?? (
                  <>
                    Frustrated by the Strait closure,{" "}
                    <strong>US and Israeli</strong> forces pivoted to economic warfare,
                    striking Iran&rsquo;s oil export infrastructure &mdash; Kharg Island
                    terminal, refineries near Abadan.{" "}
                    <strong>Iran</strong> responded in kind with devastating precision.
                    Ballistic missiles struck the <strong>Ras Tanura</strong> complex in
                    Saudi Arabia. The message was unmistakable: if Iran&rsquo;s oil burned,
                    so would everyone else&rsquo;s.
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mt-5 mb-5">
                {(featured?.actorLabels.length
                  ? featured.actorLabels
                  : [
                      { label: "USA", color: "#4a90d9" },
                      { label: "IRN", color: "#c0392b" },
                      { label: "ISR", color: "#ffba20" },
                      { label: "SAU", color: "#5EBD8E" },
                      { label: "CHN", color: "#4A90B8" },
                    ]
                ).map(({ label, color }) => (
                  <span
                    key={label}
                    className="font-mono text-2xs px-2 py-0.5 border"
                    style={{
                      color,
                      borderColor: `${color}40`,
                      background: `${color}12`,
                    }}
                  >
                    {label}
                  </span>
                ))}
                <span className="font-mono text-2xs text-text-tertiary ml-1">
                  {featured?.actorLabels.length
                    ? `${featured.actorLabels.length} actors // simultaneous resolution`
                    : '5 actors // simultaneous resolution'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {featured?.latestTurnNumber != null ? (
                  <>
                    <Badge variant="critical">
                      {`TURN ${String(featured.latestTurnNumber).padStart(2, '0')}`}
                    </Badge>
                    {featured.latestDate && (
                      <Badge variant="military">
                        {new Date(featured.latestDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase()}
                      </Badge>
                    )}
                    {featured.actorLabels.length > 0 && (
                      <Badge variant="warning">{`${featured.actorLabels.length} ACTORS ACTIVE`}</Badge>
                    )}
                    <Badge variant="escalation">SCENARIO LIVE</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="critical">SCENARIO LOADING</Badge>
                    <Badge variant="escalation">MULTI-ACTOR</Badge>
                  </>
                )}
              </div>

              <Link href={featured ? `/scenarios/${featured.id}` : '/scenarios/iran-2026'}>
                <Button variant="primary">Enter Simulation &rarr;</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section
          className="px-8 py-20 max-w-[1100px] mx-auto"
          style={{ borderLeft: "3px solid #ffba20", marginBottom: "80px" }}
        >
          <div className="font-mono text-2xs text-text-tertiary tracking-[0.12em] uppercase mb-3">
            GeoSim // Strategic Analysis Framework // Research Access
          </div>
          <h2 className="font-label font-bold text-2xl text-text-primary uppercase tracking-[0.02em] mb-4">
            Start Your Analysis
          </h2>
          <p className="font-sans text-lg text-text-secondary max-w-[560px] leading-[1.7] mb-8">
            Select a scenario, watch history unfold, and branch at the moment that
            changes everything. The chronicle records every decision.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/scenarios">
              <Button variant="primary">Browse Scenarios &rarr;</Button>
            </Link>
            <Link href="/scenarios/iran-2026">
              <Button variant="ghost">Iran 2026 — Strait of Hormuz</Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
