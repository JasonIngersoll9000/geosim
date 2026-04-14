'use client'
import { useState } from 'react'

interface Step {
  tag: string
  title: string
  body: string
  diagram: string
  tip?: string
}

const STEPS: Step[] = [
  {
    tag: '01 / MAP',
    title: 'The Strategic Map',
    body: 'Your intelligence picture. Click any city, military base, naval asset, missile battery, or radar installation to open a live intel brief showing nation, type, status, and capability. Use the layer controls to overlay strike envelopes, SAM coverage rings, chokepoint status, and individual actor assets.',
    diagram:
      '┌────────────────────────────┐\n' +
      '│  CITY       ●  IR          │\n' +
      '│  AIR BASE   ▲  US          │\n' +
      '│  NAVAL      ▶  IL          │\n' +
      '│  MISSILE    ✕  ALERT       │\n' +
      '│  RADAR      ◎  ACTIVE      │\n' +
      '└────────────────────────────┘',
    tip: 'Toggle "Strike Rings" and "Threat Rings" to visualize missile range envelopes and SAM coverage.',
  },
  {
    tag: '02 / ACTORS',
    title: 'Actor Intelligence Dossiers',
    body: 'Select any actor in the ACTORS tab to open their classified dossier. Each dossier contains: overview & strategic objectives, military order of battle, current escalation posture on the ladder, intelligence assessment with fog-of-war redaction for adversaries, and historical precedents.',
    diagram:
      '┌────────────────────────────┐\n' +
      '│  ● United States     ALLY  │\n' +
      '│  R8 · MAXIMUM PRESSURE     │\n' +
      '│  MIL ████████░░  79        │\n' +
      '│  ECO ███████░░░  68        │\n' +
      '│  ● Islamic Republic  ADV.  │\n' +
      '│  R11 · MASS ESCALATION     │\n' +
      '│  MIL ████░░░░░░  ~40       │\n' +
      '└────────────────────────────┘',
    tip: 'Adversary metrics are fog-of-war estimated (~). Your own actor shows confirmed values.',
  },
  {
    tag: '03 / ESCALATION',
    title: 'The Escalation Ladder',
    body: 'Each actor has an escalation ladder — a ranked sequence of postures from diplomatic restraint to open warfare. Actors always prefer the lowest rung that can achieve their goals. They move up when current options are failing, when they\'re forced to respond to an adversary\'s escalation, or when constraint cascades remove what was previously holding them back. They can de-escalate when objectives are met, when costs become unsustainable, or under diplomatic pressure.\n\nThe ladder for this scenario runs from Rung 1 (back-channel diplomacy) through Rung 15 (full-spectrum warfare). Rung 6 is covert operations and proxy activity. Rung 8 is direct military pressure and sanctions. Rung 11–12 is active conflict with missile exchanges. Rung 14–15 is existential warfare including nuclear signaling. Watch the ESCALATION tab in each actor\'s dossier to see their current posture and what would push them higher.',
    diagram:
      '┌────────────────────────────────┐\n' +
      '│  R01  Diplomatic back-channel  │\n' +
      '│  R03  Economic pressure        │\n' +
      '│  R06  Covert ops / proxies     │\n' +
      '│  R08  ● MAXIMUM PRESSURE  ←US  │\n' +
      '│  R10  Limited strikes          │\n' +
      '│  R11  ● MASS ESCALATION  ←IR   │\n' +
      '│  R12  ● OPEN CONFLICT    ←IL   │\n' +
      '│  R14  Strategic warfare        │\n' +
      '│  R15  Nuclear threshold        │\n' +
      '└────────────────────────────────┘',
    tip: 'Each submitted turn plan can move an actor\'s rung up or down. Watch the ESCALATION tab in actor dossiers and the Chronicle for rung changes.',
  },
  {
    tag: '04 / DECISIONS',
    title: 'Decision Planning',
    body: 'In player mode, open the DECISIONS tab to browse available actions. Click any decision to review its strategic rationale, expected outcomes, and concurrency rules before committing. Then choose one Primary Action (mandatory) plus up to three concurrent supporting operations per turn.',
    diagram:
      '┌────────────────────────────┐\n' +
      '│  PRIMARY ACTION            │\n' +
      '│  ◉ Surgical Strike     [×] │\n' +
      '│                            │\n' +
      '│  CONCURRENT 1 (optional)   │\n' +
      '│  ◉ ISR Surge           [×] │\n' +
      '│                            │\n' +
      '│  ▓▓▓▓ SUBMIT TURN PLAN ▓▓▓ │\n' +
      '└────────────────────────────┘',
    tip: 'You need at least one Primary Action to submit. Concurrent actions share remaining resources.',
  },
  {
    tag: '05 / RESOLUTION',
    title: 'Turn Resolution',
    body: 'When you submit your turn plan, all actors resolve their decisions simultaneously. The AI engine weighs each action against current state, generates narrative outcomes, updates actor strength scores and escalation rungs, and broadcasts the new world state. Watch the resolution log stream in real time.',
    diagram:
      '┌────────────────────────────┐\n' +
      '│  ► RESOLUTION IN PROGRESS  │\n' +
      '│  [14:32:01] Evaluating US  │\n' +
      '│  [14:32:02] Iran responds  │\n' +
      '│  [14:32:03] Israel acts    │\n' +
      '│  [14:32:04] State updated  │\n' +
      '│  ● TURN 05 RESOLVED        │\n' +
      '└────────────────────────────┘',
    tip: 'After resolution, check the EVENTS tab for a structured breakdown of what happened this turn.',
  },
  {
    tag: '06 / CHRONICLE',
    title: 'The Chronicle',
    body: 'Every resolved turn creates a Chronicle entry — the living narrative history of your simulation. Expand any entry to read the full AI-generated briefing. Entries note severity level, simulated date, and actor actions. The Chronicle is the story you are writing, turn by turn.',
    diagram:
      '┌────────────────────────────┐\n' +
      '│  ◆ T03  March 14, 2026     │\n' +
      '│  Phase 2: Operation begins │\n' +
      '│  [Expand ▼]                │\n' +
      '│                            │\n' +
      '│  ◆ T04  March 16, 2026     │\n' +
      '│  Hormuz closure imminent   │\n' +
      '│  [Expand ▼]                │\n' +
      '└────────────────────────────┘',
    tip: 'Switch to the CHRONICLE tab after any turn submission to read the full narrative outcome.',
  },
  {
    tag: '07 / FORK',
    title: 'Fork the Timeline',
    body: 'At any point in the Ground Truth timeline, press FORK NEW BRANCH to create your own diverging scenario. Each fork runs independently from that decision point forward — you can explore "what if the strike had been delayed?" or "what if Iran had stood down?" without altering the Ground Truth.',
    diagram:
      '┌────────────────────────────┐\n' +
      '│  GROUND TRUTH              │\n' +
      '│  T01─T02─T03─T04─T05─▶    │\n' +
      '│                ╲           │\n' +
      '│  PLAYER BRANCH  ╲          │\n' +
      '│                T04─T05─▶   │\n' +
      '│                            │\n' +
      '│  [FORK NEW BRANCH →]       │\n' +
      '└────────────────────────────┘',
    tip: 'The NEXT EVENT button steps through Ground Truth one turn at a time. Fork from any turn.',
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function TutorialModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0)

  if (!open) return null

  const s = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const isFirst = step === 0

  function handleClose() {
    setStep(0)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(5,10,18,0.85)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 'min(92vw, 560px)',
          background: 'rgba(10,15,24,0.99)',
          border: '1px solid #2a2a2a',
          borderTop: '3px solid rgba(255,186,32,0.85)',
          boxShadow: '0 0 60px rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #1e1e1e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8, letterSpacing: '0.16em', color: 'rgba(255,186,32,0.7)',
            }}>
              HOW TO PLAY
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8, color: '#3a3a3a',
            }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#5a5856', fontSize: 16, lineHeight: 1, padding: 2,
            }}
          >
            ×
          </button>
        </div>

        {/* Step tag */}
        <div style={{ padding: '20px 20px 0' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,186,32,0.5)',
          }}>
            {s.tag}
          </span>
        </div>

        {/* Title */}
        <div style={{ padding: '6px 20px 0' }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, fontWeight: 700, color: '#e5e2e1',
            margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15,
          }}>
            {s.title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px 0' }}>
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 13, lineHeight: 1.75, color: '#a8a6a0', margin: 0,
          }}>
            {s.body}
          </p>
        </div>

        {/* Diagram */}
        <div style={{ padding: '16px 20px 0' }}>
          <pre style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, lineHeight: 1.6,
            color: '#4a6a8a',
            background: '#050a12',
            border: '1px solid #1a1a1a',
            padding: '12px 14px',
            margin: 0,
            overflowX: 'auto',
          }}>
            {s.diagram}
          </pre>
        </div>

        {/* Tip */}
        {s.tip && (
          <div style={{
            margin: '14px 20px 0',
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '9px 12px',
            background: 'rgba(255,186,32,0.04)',
            border: '1px solid rgba(255,186,32,0.12)',
            borderLeft: '2px solid rgba(255,186,32,0.4)',
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, color: 'rgba(255,186,32,0.6)', flexShrink: 0, letterSpacing: '0.08em',
            }}>
              TIP
            </span>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, lineHeight: 1.6, color: 'rgba(255,186,32,0.5)', margin: 0, letterSpacing: '0.03em',
            }}>
              {s.tip}
            </p>
          </div>
        )}

        {/* Step dots */}
        <div style={{
          display: 'flex', gap: 5, justifyContent: 'center',
          padding: '20px 20px 4px',
        }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                background: i === step ? 'rgba(255,186,32,0.8)' : '#2a2a2a',
                border: 'none', cursor: 'pointer', borderRadius: 3,
                transition: 'all 0.2s ease',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 20px 20px',
          borderTop: '1px solid #1a1a1a',
          marginTop: 8,
        }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={isFirst}
            style={{
              flex: 1, padding: '9px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: isFirst ? '#2a2a2a' : '#8a8880',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ← PREV
          </button>

          {isLast ? (
            <button
              onClick={handleClose}
              style={{
                flex: 2, padding: '9px 0',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: 'rgba(255,186,32,0.9)',
                border: '1px solid rgba(255,186,32,0.9)',
                color: '#050a12',
                cursor: 'pointer',
              }}
            >
              BEGIN SIMULATION →
            </button>
          ) : (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              style={{
                flex: 2, padding: '9px 0',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: 'transparent',
                border: '1px solid rgba(255,186,32,0.5)',
                color: 'rgba(255,186,32,0.85)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              NEXT →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
