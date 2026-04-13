'use client'

import { useState } from 'react'
import { SlideOverPanel } from '@/components/ui/SlideOverPanel'
import { EscalationLadder } from '@/components/panels/EscalationLadder'
import type { ActorDetail } from '@/lib/types/panels'

interface Props {
  actor: ActorDetail
  open: boolean
  onClose: () => void
}

type DossierTab = 'overview' | 'military' | 'escalation' | 'intelligence' | 'history'

const TABS: { id: DossierTab; label: string }[] = [
  { id: 'overview',      label: 'OVERVIEW'     },
  { id: 'military',      label: 'MILITARY'     },
  { id: 'escalation',    label: 'ESCALATION'   },
  { id: 'intelligence',  label: 'INTELLIGENCE' },
  { id: 'history',       label: 'HISTORY'      },
]

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'rgba(229,226,225,0.45)', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function FowLabel({ label = 'UNVERIFIED / ESTIMATED' }: { label?: string }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 8, letterSpacing: '0.08em', fontWeight: 700,
      color: '#f39c12', border: '1px solid #f39c1244',
      padding: '1px 5px', borderRadius: 2, marginLeft: 6,
      verticalAlign: 'middle',
    }}>
      {label}
    </span>
  )
}

function ScoreBar({ label, value, isAdversary, actorColor }: {
  label: string; value: number; isAdversary: boolean; actorColor: string
}) {
  const display = isAdversary ? Math.round(value / 10) * 10 : value
  const barWidth = isAdversary ? Math.round(value / 10) * 10 : value

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(229,226,225,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: actorColor, fontWeight: 600 }}>
          {display}
          {isAdversary && <FowLabel label="EST." />}
        </span>
      </div>
      <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${barWidth}%`, borderRadius: 2,
          background: value >= 70 ? '#5ebd8e' : value >= 40 ? '#f39c12' : '#e74c3c',
          opacity: isAdversary ? 0.6 : 1,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ── Tab panes ────────────────────────────────────────────────────────────────

function OverviewTab({ actor }: { actor: ActorDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Briefing */}
      {actor.briefing && (
        <section>
          <SectionLabel>Intelligence Briefing</SectionLabel>
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 13, lineHeight: 1.75,
            color: '#c1c7d3',
            fontStyle: 'italic',
          }}>
            {actor.isAdversary
              ? actor.briefing
              : actor.briefing}
          </p>
        </section>
      )}

      {/* Objectives */}
      {actor.objectives.length > 0 && (
        <section>
          <SectionLabel>Strategic Objectives</SectionLabel>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
            {actor.objectives.map((obj, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: actor.actorColor, marginTop: 2, fontSize: 12, flexShrink: 0 }}>›</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#c1c7d3', lineHeight: 1.5 }}>
                  {obj}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Strategic Doctrine */}
      {actor.strategicDoctrine && (
        <section>
          <SectionLabel>Strategic Doctrine</SectionLabel>
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 12, lineHeight: 1.65, color: '#a8a6a0',
          }}>
            {actor.strategicDoctrine}
          </p>
        </section>
      )}

      {/* Win condition */}
      {actor.winCondition && (
        <section>
          <SectionLabel>Win / Success Condition</SectionLabel>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, lineHeight: 1.6, color: '#5ebd8e',
          }}>
            {actor.winCondition}
          </p>
        </section>
      )}
    </div>
  )
}

function MilitaryTab({ actor }: { actor: ActorDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Score bars */}
      <section>
        <SectionLabel>Operational Metrics</SectionLabel>
        <ScoreBar label="Military Strength"   value={actor.militaryStrength}   isAdversary={actor.isAdversary} actorColor={actor.actorColor} />
        <ScoreBar label="Economic Health"     value={actor.economicStrength}   isAdversary={actor.isAdversary} actorColor={actor.actorColor} />
        <ScoreBar label="Political Stability" value={actor.politicalStability} isAdversary={actor.isAdversary} actorColor={actor.actorColor} />
        {actor.isAdversary && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#f39c12', marginTop: 6, letterSpacing: '0.06em' }}>
            ⚠ ADVERSARY DATA — ALL METRICS ARE ESTIMATES BASED ON AVAILABLE INTEL
          </p>
        )}
      </section>

      {/* Historical precedents */}
      {actor.historicalPrecedents && (
        <section>
          <SectionLabel>Historical Precedents</SectionLabel>
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 12, lineHeight: 1.65, color: '#a8a6a0',
          }}>
            {actor.historicalPrecedents}
          </p>
        </section>
      )}
    </div>
  )
}

function EscalationTab({ actor }: { actor: ActorDetail }) {
  const currentRungData = actor.escalationRungs.find(r => r.level === actor.escalationRung)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Current rung summary */}
      <section>
        <SectionLabel>Current Posture</SectionLabel>
        <div style={{
          padding: '10px 12px',
          background: `${actor.actorColor}12`,
          border: `1px solid ${actor.actorColor}44`,
          borderLeft: `3px solid ${actor.actorColor}`,
          borderRadius: 3,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: actor.actorColor, letterSpacing: '0.1em' }}>
              RUNG {actor.escalationRung}
            </span>
            {actor.isAdversary && <FowLabel label="ESTIMATED" />}
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14, fontWeight: 700, color: actor.actorColor,
          }}>
            {actor.escalationRungName}
          </div>
          {currentRungData?.description && (
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: 11, color: '#a8a6a0', lineHeight: 1.5, marginTop: 6 }}>
              {currentRungData.description}
            </p>
          )}
        </div>
      </section>

      {/* Full ladder */}
      <section>
        <SectionLabel>Full Escalation Ladder</SectionLabel>
        {actor.escalationRungs.length > 0 ? (
          <EscalationLadder
            rungs={actor.escalationRungs}
            currentRung={actor.escalationRung}
            actorColor={actor.actorColor}
          />
        ) : (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(229,226,225,0.45)' }}>
            Escalation ladder data not available.
          </p>
        )}
      </section>
    </div>
  )
}

function IntelligenceTab({ actor }: { actor: ActorDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Leadership profile */}
      {actor.leadershipProfile && (
        <section>
          <SectionLabel>Key Figures &amp; Leadership</SectionLabel>
          {actor.isAdversary && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, color: '#f39c12', letterSpacing: '0.06em',
              }}>
                ⚠ UNVERIFIED — BASED ON OPEN-SOURCE &amp; SIGINT
              </span>
            </div>
          )}
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 12, lineHeight: 1.65,
            color: actor.isAdversary ? '#c8a850' : '#c1c7d3',
          }}>
            {actor.leadershipProfile}
          </p>
        </section>
      )}

      {/* Relationship stance */}
      <section>
        <SectionLabel>Relationship to Player-Controlled Faction</SectionLabel>
        <RelationshipStanceBadge stance={actor.relationshipStance} />
      </section>

      {/* No intel fallback */}
      {!actor.leadershipProfile && (
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(229,226,225,0.45)' }}>
          {actor.isAdversary
            ? 'INTEL REDACTED — INSUFFICIENT HUMINT COVERAGE'
            : 'Leadership profile not available in current briefing.'}
        </p>
      )}
    </div>
  )
}

function HistoryTab({ actor }: { actor: ActorDetail }) {
  const hasHistory = actor.historicalPrecedents || actor.strategicDoctrine

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {actor.historicalPrecedents && (
        <section>
          <SectionLabel>Historical Precedents</SectionLabel>
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 12, lineHeight: 1.7, color: '#c1c7d3',
          }}>
            {actor.historicalPrecedents}
          </p>
        </section>
      )}
      {!hasHistory && (
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(229,226,225,0.45)' }}>
          No historical record available for this actor.
        </p>
      )}
    </div>
  )
}

function RelationshipStanceBadge({ stance }: { stance: string }) {
  const STANCE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
    ally:       { label: 'ALLY',             color: '#5ebd8e', bg: '#5ebd8e18' },
    adversary:  { label: 'ADVERSARY',        color: '#e74c3c', bg: '#e74c3c18' },
    rival:      { label: 'RIVAL',            color: '#e67e22', bg: '#e67e2218' },
    neutral:    { label: 'NEUTRAL',          color: '#a8a6a0', bg: '#a8a6a018' },
    proxy:      { label: 'PROXY / PARTNER',  color: '#4a90d9', bg: '#4a90d918' },
  }
  const s = STANCE_STYLES[stance] ?? STANCE_STYLES.neutral
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: s.color, background: s.bg,
      border: `1px solid ${s.color}44`,
      padding: '3px 8px', borderRadius: 2,
      display: 'inline-block',
    }}>
      {s.label}
    </span>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ActorDetailPanel({ actor, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<DossierTab>('overview')

  return (
    <SlideOverPanel open={open} onClose={onClose} title={actor.name}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Actor sub-header: rung + stance — name already shown by SlideOverPanel */}
        <div style={{
          padding: '8px 16px 0',
          borderBottom: '1px solid #1c1f23',
        }}>
          {/* Color dot + short name + rung + stance badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: `${actor.actorColor}22`,
              border: `2px solid ${actor.actorColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8, fontWeight: 700, color: actor.actorColor, letterSpacing: '0.05em',
            }}>
              {actor.shortName.slice(0, 3).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, color: actor.actorColor, letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                }}>
                  RUNG {actor.escalationRung} — {actor.escalationRungName.toUpperCase()}
                </span>
                {actor.isAdversary && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 8, color: '#f39c12', border: '1px solid #f39c1244',
                    padding: '1px 4px', borderRadius: 2, letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    ADVERSARY
                  </span>
                )}
              </div>
            </div>
            <RelationshipStanceBadge stance={actor.relationshipStance} />
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, letterSpacing: '0.1em', fontWeight: activeTab === tab.id ? 700 : 400,
                  color: activeTab === tab.id ? actor.actorColor : 'rgba(229,226,225,0.45)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 10px 8px',
                  borderBottom: activeTab === tab.id ? `2px solid ${actor.actorColor}` : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
          {activeTab === 'overview'     && <OverviewTab     actor={actor} />}
          {activeTab === 'military'     && <MilitaryTab     actor={actor} />}
          {activeTab === 'escalation'   && <EscalationTab   actor={actor} />}
          {activeTab === 'intelligence' && <IntelligenceTab actor={actor} />}
          {activeTab === 'history'      && <HistoryTab      actor={actor} />}
        </div>
      </div>
    </SlideOverPanel>
  )
}
