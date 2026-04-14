'use client'
import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function UserMenu() {
  const { user, loading } = useUser()
  const [open, setOpen]   = useState(false)
  const router            = useRouter()

  if (loading) {
    return (
      <div className="font-mono text-[9px] text-text-tertiary animate-pulse">
        ●
      </div>
    )
  }

  if (!user) return null

  const displayName = user.email?.split('@')[0]?.toUpperCase() ?? 'ANALYST'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary hover:text-text-secondary transition-colors"
        aria-expanded={open}
        aria-label="User menu"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-status-stable shrink-0" />
        {displayName}
        <span className="text-[7px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            aria-hidden="true"
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-bg-surface border border-border-subtle shadow-lg py-1">
            <div className="px-3 py-1.5 border-b border-border-subtle">
              <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-text-tertiary">Signed in as</div>
              <div className="font-mono text-[10px] text-text-primary truncate">{user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-status-critical hover:bg-status-critical-bg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
