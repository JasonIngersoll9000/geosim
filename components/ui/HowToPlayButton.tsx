'use client'
import { useState, useEffect, useRef } from 'react'
import { TutorialModal } from '@/components/ui/TutorialModal'

const STORAGE_KEY = 'wargame_tutorial_seen'

export function HowToPlayButton() {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        timerRef.current = setTimeout(() => setOpen(true), 800)
      }
    } catch { /* localStorage unavailable */ }
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  function handleClose() {
    setOpen(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
          color: 'rgba(229,226,225,0.45)',
          background: 'none',
          border: '1px solid #2a2a2a',
          cursor: 'pointer',
          padding: '3px 8px',
          transition: 'color 0.15s, border-color 0.15s',
          textTransform: 'uppercase',
        }}
        onMouseEnter={e => {
          const t = e.currentTarget
          t.style.color = 'rgba(229,226,225,0.85)'
          t.style.borderColor = '#4a4a4a'
        }}
        onMouseLeave={e => {
          const t = e.currentTarget
          t.style.color = 'rgba(229,226,225,0.45)'
          t.style.borderColor = '#2a2a2a'
        }}
        title="How to Play"
      >
        ?
      </button>

      <TutorialModal open={open} onClose={handleClose} />
    </>
  )
}
