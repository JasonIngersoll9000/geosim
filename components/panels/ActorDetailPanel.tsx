'use client'

import { useState, useEffect } from 'react'
import { EscalationLadder } from '@/components/panels/EscalationLadder'
import { getActorMilitaryAssets } from '@/lib/game/military-assets'
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
      {actor.briefing && (
        <section>
          <SectionLabel>Intelligence Briefing</SectionLabel>
          {actor.isAdversary && (
            <div style={{ marginBottom: 6 }}>
              <FowLabel label="UNVERIFIED — BASED ON OPEN-SOURCE INTEL" />
            </div>
          )}
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 13, lineHeight: 1.75,
            color: actor.isAdversary ? '#c8a850' : '#c1c7d3',
            fontStyle: 'italic',
          }}>
            {actor.briefing}
          </p>
        </section>
      )}

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

      {actor.strategicDoctrine && (
        <section>
          <SectionLabel>Strategic Doctrine</SectionLabel>
          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 12, lineHeight: 1.65, color: '#a8a6a0' }}>
            {actor.strategicDoctrine}
          </p>
        </section>
      )}

      {actor.winCondition && (
        <section>
          <SectionLabel>Win / Success Condition</SectionLabel>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, lineHeight: 1.6, color: '#5ebd8e' }}>
            {actor.winCondition}
          </p>
        </section>
      )}
    </div>
  )
}

function MilitaryTab({ actor }: { actor: ActorDetail }) {
  const assets = getActorMilitaryAssets(actor.id)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Combat power readout */}
      <section>
        <SectionLabel>Combat Power Index</SectionLabel>
        <ScoreBar
          label="Military Strength"
          value={actor.militaryStrength}
          isAdversary={actor.isAdversary}
          actorColor={actor.actorColor}
        />
        {actor.isAdversary && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#f39c12', marginTop: 4, letterSpacing: '0.06em' }}>
            ⚠ ADVERSARY — ALL METRICS ESTIMATED FROM AVAILABLE INTEL
          </p>
        )}
      </section>

      {/* Asset inventory */}
      {assets.length > 0 ? (
        <section>
          <SectionLabel>
            Order of Battle &amp; Capabilities
            {actor.isAdversary && <FowLabel label="PARTIAL INTEL" />}
          </SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {assets.map((asset, i) => {
              const isOpen = expandedIdx === i
              return (
                <div
                  key={i}
                  style={{
                    border: `1px solid ${isOpen ? actor.actorColor + '66' : '#222'}`,
                    background: isOpen ? `${actor.actorColor}08` : '#111',
                    borderRadius: 3,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Header row — always visible */}
                  <button
                    onClick={() => setExpandedIdx(isOpen ? null : i)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '8px 10px',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}
                  >
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9, color: actor.actorColor, flexShrink: 0, marginTop: 1,
                    }}>
                      {isOpen ? '▼' : '▶'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 12, fontWeight: 600, color: '#e5e2e1', lineHeight: 1.3,
                      }}>
                        {actor.isAdversary
                          ? asset.name.replace(/—.*/, '').trim()
                          : asset.name}
                      </div>
                      {asset.quantity !== null && (
                        <div style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 9, color: actor.actorColor, marginTop: 2, letterSpacing: '0.06em',
                        }}>
                          {actor.isAdversary
                            ? `~${Math.round(asset.quantity / 100) * 100} ${asset.unit ?? ''}`
                            : `${asset.quantity.toLocaleString()} ${asset.unit ?? ''}`}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 8, color: '#5ebd8e', flexShrink: 0, marginTop: 1,
                      letterSpacing: '0.06em',
                    }}>
                      {asset.deploymentStatus === 'available' ? 'AVAIL' : asset.deploymentStatus.toUpperCase()}
                    </span>
                  </button>

                  {/* Expanded description */}
                  {isOpen && (
                    <div style={{ padding: '0 10px 10px 27px' }}>
                      <p style={{
                        fontFamily: "'Newsreader', serif",
                        fontSize: actor.isAdversary ? 11 : 11,
                        color: actor.isAdversary ? '#c8a850' : '#a8a6a0',
                        lineHeight: 1.6, margin: 0,
                        fontStyle: actor.isAdversary ? 'italic' : 'normal',
                      }}>
                        {actor.isAdversary
                          ? asset.description.split('. ').slice(0, 3).join('. ') + (asset.description.split('. ').length > 3 ? '…' : '')
                          : asset.description}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section>
          <SectionLabel>Order of Battle &amp; Capabilities</SectionLabel>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(229,226,225,0.3)' }}>
            {actor.isAdversary
              ? 'CAPABILITY DATA REDACTED — INSUFFICIENT INTEL COVERAGE'
              : 'Military capability data not available for this actor.'}
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
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: actor.actorColor }}>
            {actor.escalationRungName}
          </div>
          {currentRungData?.description && (
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: 11, color: '#a8a6a0', lineHeight: 1.5, marginTop: 6 }}>
              {currentRungData.description}
            </p>
          )}
        </div>
      </section>

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

const CONFIDENCE_LABEL: Record<string, { text: string; color: string }> = {
  high:       { text: 'HIGH CONFIDENCE',       color: '#5ebd8e' },
  moderate:   { text: 'MODERATE CONFIDENCE',   color: '#f39c12' },
  low:        { text: 'LOW CONFIDENCE',         color: '#e67e22' },
  unverified: { text: 'UNVERIFIED / ESTIMATED', color: '#e74c3c' },
}

function IntelligenceTab({ actor }: { actor: ActorDetail }) {
  const conf = CONFIDENCE_LABEL[actor.intelConfidence ?? 'moderate']
  const hasKnownUnknowns = actor.knownUnknowns && actor.knownUnknowns.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <SectionLabel>Intelligence Assessment Quality</SectionLabel>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', background: '#1a1a1a',
          borderLeft: `3px solid ${conf.color}`,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: conf.color, fontWeight: 700 }}>
            {conf.text}
          </span>
        </div>
      </section>

      <section>
        <SectionLabel>Relationship to Player-Controlled Faction</SectionLabel>
        <RelationshipStanceBadge stance={actor.relationshipStance} />
        {actor.hasLimitedIntel && !actor.isAdversary && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#f39c12', marginTop: 6, letterSpacing: '0.06em' }}>
            ⚠ LIMITED INTELLIGENCE ACCESS — DATA MAY BE INCOMPLETE
          </p>
        )}
      </section>

      {actor.leadershipProfile && (
        <section>
          <SectionLabel>Key Figures &amp; Leadership</SectionLabel>
          {actor.isAdversary && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#f39c12', letterSpacing: '0.06em' }}>
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

      {hasKnownUnknowns && (
        <section>
          <SectionLabel>Known Intelligence Gaps</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actor.knownUnknowns!.map((gap, i) => (
              <div key={i} style={{ padding: '7px 10px', background: '#1a1a1a', borderLeft: '2px solid #f39c1244' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, lineHeight: 1.6, color: '#c8a850', margin: 0 }}>
                  {gap}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!actor.leadershipProfile && !hasKnownUnknowns && (
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(229,226,225,0.45)' }}>
          {actor.isAdversary
            ? 'INTEL REDACTED — INSUFFICIENT HUMINT COVERAGE'
            : actor.hasLimitedIntel
              ? 'LIMITED COVERAGE — PARTIAL INTEL ONLY'
              : 'Leadership profile not available in current briefing.'}
        </p>
      )}
    </div>
  )
}

function HistoryTab({ actor }: { actor: ActorDetail }) {
  const hasRecent = actor.recentHistory && actor.recentHistory.length > 0
  const hasPrecedents = Boolean(actor.historicalPrecedents)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {hasRecent && (
        <section>
          <SectionLabel>Recent Actions &amp; Events</SectionLabel>
          {actor.isAdversary && (
            <div style={{ marginBottom: 8 }}>
              <FowLabel label="PARTIALLY VERIFIED" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actor.recentHistory!.map((entry, i) => (
              <div key={i} style={{ padding: '8px 10px', background: '#1a1a1a', borderLeft: `2px solid ${actor.actorColor}44` }}>
                <p style={{ fontFamily: "'Newsreader', serif", fontSize: 11, lineHeight: 1.55, color: '#a8a6a0', margin: 0 }}>
                  {entry}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasPrecedents && (
        <section>
          <SectionLabel>Historical Precedents</SectionLabel>
          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 12, lineHeight: 1.7, color: '#c1c7d3' }}>
            {actor.historicalPrecedents}
          </p>
        </section>
      )}

      {!hasRecent && !hasPrecedents && (
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

// ── Main component — centered modal ─────────────────────────────────────────

export function ActorDetailPanel({ actor, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<DossierTab>('overview')

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset to overview tab when a new actor is opened
  useEffect(() => {
    if (open) setActiveTab('overview')
  }, [actor.id, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(5,10,18,0.80)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative flex flex-col bg-bg-surface border border-border-subtle overflow-hidden"
        style={{
          width: 'min(92vw, 860px)',
          height: 'min(88vh, 720px)',
          boxShadow: '0 0 60px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal header ── */}
        <div style={{
          padding: '12px 16px 0',
          borderBottom: '1px solid #1c1f23',
          flexShrink: 0,
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 16, color: 'rgba(229,226,225,0.4)',
              lineHeight: 1, padding: '2px 4px',
            }}
          >
            ×
          </button>

          {/* Actor identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: `${actor.actorColor}22`,
              border: `2px solid ${actor.actorColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, fontWeight: 700, color: actor.actorColor, letterSpacing: '0.05em',
            }}>
              {actor.shortName.slice(0, 3).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15, fontWeight: 700, color: '#e5e2e1', lineHeight: 1.2,
              }}>
                {actor.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, color: actor.actorColor, letterSpacing: '0.1em',
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
                <RelationshipStanceBadge stance={actor.relationshipStance} />
              </div>
            </div>
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
                  padding: '6px 12px 8px',
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

        {/* ── Tab content (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'overview'     && <OverviewTab     actor={actor} />}
          {activeTab === 'military'     && <MilitaryTab     actor={actor} />}
          {activeTab === 'escalation'   && <EscalationTab   actor={actor} />}
          {activeTab === 'intelligence' && <IntelligenceTab actor={actor} />}
          {activeTab === 'history'      && <HistoryTab      actor={actor} />}
        </div>
      </div>
    </div>
  )
}
