'use client'
import { useState, useEffect } from 'react'
import type { ActorStatusSnapshot } from '@/lib/types/simulation'

const METRIC_LABELS: Record<keyof Omit<ActorStatusSnapshot, 'actorId' | 'turnDate' | 'sourceUrl' | 'notes'>, string> = {
  politicalStability: 'Political Stability',
  economicHealth: 'Economic Health',
  militaryReadiness: 'Military Readiness',
  publicSupport: 'Public Support',
  internationalIsolation: "Int'l Isolation",
}

const ACTOR_LABELS: Record<string, string> = {
  us: 'United States', united_states: 'United States',
  iran: 'Iran', israel: 'Israel',
}

interface Props {
  isGroundTruth?: boolean
}

export function ActorStatusPanel({ isGroundTruth = false }: Props) {
  const [actorSnapshots, setActorSnapshots] = useState<ActorStatusSnapshot[]>([])

  // Static seed until resolution engine writes real snapshots
  useEffect(() => {
    setActorSnapshots([
      { actorId: 'us',     turnDate: '2026-03-19', politicalStability: 72, economicHealth: 68, militaryReadiness: 90, publicSupport: 55, internationalIsolation: 25 },
      { actorId: 'iran',   turnDate: '2026-03-19', politicalStability: 48, economicHealth: 28, militaryReadiness: 65, publicSupport: 58, internationalIsolation: 82 },
      { actorId: 'israel', turnDate: '2026-03-19', politicalStability: 61, economicHealth: 58, militaryReadiness: 88, publicSupport: 72, internationalIsolation: 45 },
    ])
  }, [])

  return (
    <div style={{ background: 'rgba(10,11,13,0.97)', border: '1px solid #2a2d32', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", color: '#e8e6e0', minWidth: 260 }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #1c1f23' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: '#ffba20', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actor Status</div>
      </div>
      {actorSnapshots.map(snap => (
        <div key={snap.actorId} style={{ padding: '8px 12px', borderBottom: '1px solid #1c1f23' }}>
          <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
            {ACTOR_LABELS[snap.actorId] ?? snap.actorId.toUpperCase()}
            {snap.sourceUrl && (
              <a
                href={isGroundTruth ? snap.sourceUrl : undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 6, color: isGroundTruth ? '#5dade2' : '#444', fontSize: 8, textDecoration: 'underline', cursor: isGroundTruth ? 'pointer' : 'help' }}
              >[source]</a>
            )}
          </div>
          {(Object.keys(METRIC_LABELS) as Array<keyof typeof METRIC_LABELS>).map(key => {
            const val = snap[key]
            const barColor = val >= 60 ? '#2ecc71' : val >= 35 ? '#f39c12' : '#e74c3c'
            return (
              <div key={key} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: '#8a8880' }}>{METRIC_LABELS[key]}</span>
                  <span style={{ fontSize: 8, color: barColor }}>{val}</span>
                </div>
                <div style={{ height: 3, background: '#1c1f23', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${val}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
