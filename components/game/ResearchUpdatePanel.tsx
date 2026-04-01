'use client'
import { useState } from 'react'
import type { AssetResearchLogRow, ProposedAssetChange } from '@/lib/types/database'

interface Props {
  scenarioId: string
  onApproved?: () => void
}

export function ResearchUpdatePanel({ scenarioId, onApproved }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'reviewing' | 'done' | 'error'>('idle')
  const [logEntry, setLogEntry] = useState<AssetResearchLogRow | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function triggerResearch() {
    setStatus('running')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/assets/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      })
      const { data, error } = await res.json() as { data: AssetResearchLogRow | null; error: string | null }
      if (error) { setErrorMsg(error); setStatus('error'); return }
      setLogEntry(data)
      setStatus('reviewing')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  async function approve() {
    if (!logEntry) return
    const res = await fetch(`/api/assets/research/${logEntry.id}/approve`, { method: 'POST' })
    const { error } = await res.json() as { error: string | null }
    if (error) { setErrorMsg(error); setStatus('error'); return }
    setStatus('done')
    onApproved?.()
  }

  async function reject() {
    if (!logEntry) return
    await fetch(`/api/assets/research/${logEntry.id}/reject`, { method: 'POST' })
    setStatus('idle')
    setLogEntry(null)
  }

  const changes = (logEntry?.proposed_changes ?? []) as ProposedAssetChange[]

  return (
    <div style={{ background: 'rgba(10,11,13,0.97)', border: '1px solid #2a2d32', borderRadius: 4, padding: 16, fontFamily: "'IBM Plex Mono', monospace", color: '#e8e6e0', minWidth: 280 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: '#ffba20', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Ground Truth Research
      </div>

      {status === 'idle' && (
        <button onClick={triggerResearch} style={{ width: '100%', padding: '8px 0', background: 'rgba(255,186,32,0.1)', border: '1px solid rgba(255,186,32,0.3)', borderRadius: 3, color: '#ffba20', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em' }}>
          RUN RESEARCH UPDATE
        </button>
      )}

      {status === 'running' && (
        <div style={{ fontSize: 10, color: '#8a8880', textAlign: 'center', padding: '8px 0' }}>QUERYING RESEARCH PIPELINE…</div>
      )}

      {status === 'reviewing' && logEntry && (
        <div>
          <div style={{ fontSize: 10, color: '#c8c6c0', marginBottom: 10, lineHeight: 1.5 }}>{logEntry.summary}</div>
          {changes.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#8a8880', textTransform: 'uppercase', marginBottom: 6 }}>Proposed Changes ({changes.length})</div>
              {changes.map((c, i) => (
                <div key={i} style={{ padding: '4px 8px', background: '#0f1114', borderRadius: 2, marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: '#ffba20' }}>{c.type.toUpperCase()}</span>
                  {' '}<span style={{ color: '#c8c6c0' }}>{c.assetId}</span>
                  <div style={{ color: '#8a8880', marginTop: 2 }}>{c.rationale}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: '#8a8880', marginBottom: 12 }}>No asset changes proposed.</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={approve} style={{ flex: 1, padding: '6px 0', background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', borderRadius: 3, color: '#2ecc71', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>APPROVE</button>
            <button onClick={reject} style={{ flex: 1, padding: '6px 0', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 3, color: '#e74c3c', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>REJECT</button>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div>
          <div style={{ fontSize: 10, color: '#2ecc71', marginBottom: 8 }}>Research approved and applied.</div>
          <button onClick={() => { setStatus('idle'); setLogEntry(null) }} style={{ width: '100%', padding: '6px 0', background: 'transparent', border: '1px solid #2a2d32', borderRadius: 3, color: '#8a8880', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>RUN ANOTHER UPDATE</button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div style={{ fontSize: 10, color: '#e74c3c', marginBottom: 8 }}>Error: {errorMsg}</div>
          <button onClick={() => { setStatus('idle'); setErrorMsg(null) }} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #2a2d32', borderRadius: 3, color: '#8a8880', cursor: 'pointer', fontSize: 10 }}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
