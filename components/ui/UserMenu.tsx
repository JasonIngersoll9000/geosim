'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/signup"
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Create Account
        </Link>
        <Link
          href="/auth/login"
          className="font-mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 border border-gold text-gold hover:bg-gold hover:text-bg-base transition-colors"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.08em] hidden sm:inline">
        {user.email?.split('@')[0]}
      </span>
      <Link
        href="/auth/signout"
        className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary hover:text-status-critical transition-colors"
      >
        Sign Out
      </Link>
    </div>
  )
}
