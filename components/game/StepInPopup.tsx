'use client'
import type { BranchWorthiness, CachedResponse } from '@/lib/types/simulation'

const DIRECTION_ICON: Record<string, string> = {
  up:      '↑',
  down:    '↓',
  lateral: '→',
  none:    '—',
}

const DIRECTION_COLOR: Record<string, string> = {
  up:      '#e74c3c',
  down:    '#2ecc71',
  lateral: '#f39c12',
  none:    '#8a8880',
}

interface Props {
  reactingActorName: string
  triggeringEventSummary: string
  aiChosenResponse: CachedResponse
  worthiness: BranchWorthiness
  onProceed: () => void
  onStepIn: (actorId: string) => void
}

export function StepInPopup({
  reactingActorName,
  triggeringEventSummary,
  aiChosenResponse,
  worthiness,
  onProceed,
  onStepIn,
}: Props) {
  const dirIcon  = DIRECTION_ICON[aiChosenResponse.escalationDirection] ?? '—'
  const dirColor = DIRECTION_COLOR[aiChosenResponse.escalationDirection] ?? '#8a8880'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f1114',
        border: '1px solid #2a2d32',
        borderRadius: 6,
        padding: 24,
        maxWidth: 480, width: '100%',
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#e8e6e0',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{
          fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em',
          color: '#e74c3c', marginBottom: 4,
        }}>
          {'RESPONSE REQUIRED'}
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16, fontWeight: 700, color: '#ffba20', marginBottom: 4,
        }}>
          {reactingActorName}
        </div>

        <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 16 }}>
          {'Reacting to: '}<span style={{ color: '#c8c6c0' }}>{triggeringEventSummary}</span>
        </div>

        {/* AI chosen response */}
        <div style={{
          padding: '12px 14px',
          background: 'rgba(15,17,20,0.8)',
          border: '1px solid #2a2d32',
          borderRadius: 4, marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            {'AI Assessment'}
          </div>
          <div style={{ fontSize: 12, color: '#e8e6e0', marginBottom: 6, lineHeight: 1.4 }}>
            {reactingActorName}{' has decided to —'}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            color: '#c8c6c0', marginBottom: 8,
          }}>
            {'"'}{aiChosenResponse.decision.name ?? aiChosenResponse.decision.id}{'"'}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
            <span style={{ color: '#8a8880' }}>
              {'Escalation: '}<span style={{ color: dirColor, fontWeight: 600 }}>{dirIcon}{' '}{aiChosenResponse.escalationDirection.toUpperCase()}</span>
            </span>
            <span style={{ color: '#8a8880' }}>
              {'Significance: '}<span style={{ color: '#ffba20' }}>{worthiness.score}{'/100'}</span>
            </span>
          </div>
        </div>

        {/* Rationale */}
        <div style={{ fontSize: 10, color: '#8a8880', lineHeight: 1.5, marginBottom: 20, fontStyle: 'italic' }}>
          {aiChosenResponse.rationale}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onProceed}
            style={{
              flex: 1, padding: '10px 0',
              background: 'rgba(41,128,185,0.15)',
              border: '1px solid rgba(41,128,185,0.4)',
              borderRadius: 4, color: '#5dade2', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.08em',
            }}
          >
            {'PROCEED WITH AI DECISION'}
          </button>
          <button
            onClick={() => onStepIn(aiChosenResponse.actorId)}
            style={{
              flex: 1, padding: '10px 0',
              background: 'rgba(255,186,32,0.1)',
              border: '1px solid rgba(255,186,32,0.35)',
              borderRadius: 4, color: '#ffba20', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            {'STEP IN AS '}{reactingActorName.toUpperCase()}
          </button>
        </div>

        {/* Alternate responses hint */}
        {(worthiness.alternateResponses?.length ?? 0) > 0 && (
          <div style={{ marginTop: 12, fontSize: 9, color: '#555', textAlign: 'center' }}>
            {worthiness.alternateResponses!.length}{' alternate'}{worthiness.alternateResponses!.length !== 1 ? 's' : ''}{' cached — available from branch tree'}
          </div>
        )}
      </div>
    </div>
  )
}
