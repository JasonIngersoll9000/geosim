'use client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export interface UserState {
  user: User | null
  loading: boolean
}

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

export function useUser(): UserState {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(!DEV_MODE)

  useEffect(() => {
    if (DEV_MODE) {
      setUser({ id: 'dev-user', email: 'dev@geosim.local' } as unknown as User)
      setLoading(false)
      return
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return
      const supabase = createClient()

      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) {
          setUser(data.user)
          setLoading(false)
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      })

      unsubscribe = () => subscription.unsubscribe()
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return { user, loading }
}
