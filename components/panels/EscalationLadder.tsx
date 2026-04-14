'use client'

import type { EscalationRungSummary } from '@/lib/types/panels'
import { Tooltip } from '@/components/ui/Tooltip'

interface Props {
  rungs: EscalationRungSummary[]
  currentRung: number
  actorColor: string
}

const REVERSIBILITY_STYLES: Record<string, { label: string; color: string }> = {
  easy:         { label: 'REVERSIBLE',           color: '#5ebd8e' },
  moderate:     { label: 'PARTLY REVERSIBLE',    color: '#f39c12' },
  difficult:    { label: 'HARD TO REVERSE',      color: '#e67e22' },
  irreversible: { label: 'IRREVERSIBLE',         color: '#e74c3c' },
}

export function EscalationLadder({ rungs, currentRung, actorColor }: Props) {
  const sorted = [...rungs].sort((a, b) => b.level - a.level)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sorted.map((rung, i) => {
        const isCurrent  = rung.level === currentRung
        const isPast     = rung.level < currentRung
        const isFuture   = rung.level > currentRung
        const isIrreversible = rung.reversibility === 'irreversible'
        const rev = REVERSIBILITY_STYLES[rung.reversibility] ?? REVERSIBILITY_STYLES.easy

        return (
          <div
            key={rung.level}
            style={{
              display:       'flex',
              alignItems:    'stretch',
              gap:           8,
              opacity:       rung.isBlocked ? 0.45 : 1,
            }}
          >
            {/* Left gutter: spine + level number */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
              <Tooltip
                content={isCurrent ? `Current posture: ${rung.name}` : isPast ? `Past posture (rung ${rung.level})` : `Future escalation step — not yet reached`}
                placement="right"
                maxWidth={180}
              >
                <div style={{
                  width:        24, height: 24, borderRadius: '50%', display: 'flex',
                  alignItems:   'center', justifyContent: 'center',
                  flexShrink:   0,
                  background:   isCurrent ? actorColor : isPast ? `${actorColor}44` : 'transparent',
                  border:       `1px solid ${isCurrent ? actorColor : isPast ? `${actorColor}44` : '#3a3a3a'}`,
                  fontSize:     9, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                  color:        isCurrent ? '#0d0d0d' : isPast ? actorColor : '#555',
                  cursor: 'default',
                }}>
                  {rung.level}
                </div>
              </Tooltip>
              {/* Spine connector — skip for last item */}
              {i < sorted.length - 1 && (
                <div style={{
                  flex:      1, width: 1, marginTop: 2,
                  background: isPast ? `${actorColor}44` : '#2a2a2a',
                  minHeight:  8,
                }} />
              )}
            </div>

            {/* Rung content */}
            <div style={{
              flex:          1, minWidth: 0, paddingBottom: i < sorted.length - 1 ? 8 : 0,
              paddingTop:    1,
              borderLeft:    isCurrent ? `2px solid ${actorColor}` : isIrreversible ? '2px solid #e74c3c44' : '2px solid transparent',
              paddingLeft:   8,
            }}>
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize:   12, fontWeight: isCurrent ? 700 : 600,
                  color:      isCurrent ? actorColor : isFuture ? '#c8c6c0' : '#888',
                  letterSpacing: '0.02em',
                  textDecoration: rung.isBlocked ? 'line-through' : 'none',
                }}>
                  {rung.name}
                </span>

                {isCurrent && (
                  <span style={{
                    fontFamily:  "'IBM Plex Mono', monospace",
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                    color: '#0d0d0d', background: actorColor,
                    padding: '1px 5px', borderRadius: 2,
                    flexShrink: 0,
                  }}>
                    CURRENT
                  </span>
                )}

                {isIrreversible && (
                  <span style={{
                    fontFamily:  "'IBM Plex Mono', monospace",
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                    color: '#e74c3c', border: '1px solid #e74c3c44',
                    padding: '1px 5px', borderRadius: 2, flexShrink: 0,
                  }}>
                    ⚠ IRREVERSIBLE
                  </span>
                )}

                {rung.isBlocked && rung.blockReason && (
                  <span style={{
                    fontFamily:  "'IBM Plex Mono', monospace",
                    fontSize: 8, letterSpacing: '0.06em',
                    color: '#888', border: '1px solid #3a3a3a',
                    padding: '1px 5px', borderRadius: 2, flexShrink: 0,
                  }}>
                    BLOCKED: {rung.blockReason.slice(0, 28)}
                  </span>
                )}
              </div>

              {/* Description — shown for all rungs, slightly muted for non-current */}
              {rung.description && (
                <p style={{
                  fontFamily: "'Newsreader', serif",
                  fontSize: isCurrent ? 11 : 10,
                  color: isCurrent ? '#a8a6a0' : '#5a5856',
                  lineHeight: 1.5,
                  margin: '3px 0 4px',
                  fontStyle: isCurrent ? 'normal' : 'italic',
                }}>
                  {rung.description}
                </p>
              )}

              {/* Trigger/threshold — what causes transition to this rung */}
              {rung.trigger && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 4,
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 8, color: '#4a6a4a', flexShrink: 0, marginTop: 1,
                    letterSpacing: '0.08em',
                  }}>
                    THRESHOLD:
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 8,
                    color: isCurrent ? '#6a9e6a' : '#3a5a3a',
                    lineHeight: 1.5,
                    letterSpacing: '0.04em',
                  }}>
                    {rung.trigger}
                  </span>
                </div>
              )}

              {/* Reversibility badge */}
              {(isCurrent || !isFuture) && (
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 8, color: rev.color, letterSpacing: '0.06em',
                }}>
                  {rev.label}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
