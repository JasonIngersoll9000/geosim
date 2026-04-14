'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/** Sanitize redirect URL — only allow same-origin relative paths. */
function sanitizeRedirect(raw: string | null): string {
  if (!raw) return '/scenarios'
  // Must start with '/' but not '//' (protocol-relative) to be relative
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/scenarios'
}

function LoginForm() {
  const router     = useRouter()
  const params     = useSearchParams()
  const redirectTo = sanitizeRedirect(params.get('redirect'))

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.replace(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="analyst@wargame.gov"
          className="w-full px-3 py-2.5 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      <div>
        <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
          Access Code
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3 py-2.5 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="px-3 py-2 border border-status-critical-border bg-status-critical-bg font-mono text-[11px] text-status-critical"
        >
          ACCESS DENIED — {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] bg-gold text-bg-base hover:bg-[#e5a600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE →'}
      </button>

      <p className="text-center font-mono text-[10px] text-text-tertiary">
        No account?{' '}
        <Link href="/auth/signup" className="text-status-info hover:underline">
          CREATE ACCOUNT
        </Link>
      </p>

      <p className="text-center font-mono text-[10px] text-text-tertiary">
        <Link href="/" className="text-text-tertiary hover:text-text-secondary transition-colors">
          ← Back to Home
        </Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-4 pt-8">
      {/* Classification header */}
      <div className="mb-8 text-center">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold mb-4">
          ◆&nbsp;&nbsp;SECRET // WAR GAME ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY&nbsp;&nbsp;◆
        </div>
        <h1 className="font-label font-bold text-2xl uppercase tracking-[0.08em] text-text-primary mb-1">
          WAR GAME
        </h1>
        <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
          Analyst Authentication Portal
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm bg-bg-surface-dim border border-border-subtle p-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-5 pb-3 border-b border-border-subtle flex items-center justify-between">
          <span>Identity Verification</span>
          <span className="text-status-warning">● SECURE CHANNEL</span>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Bottom classification */}
      <div className="mt-6 font-mono text-[8px] uppercase tracking-[0.15em] text-text-tertiary text-center">
        WAR-GAME-IRN-2026 // CLASSIFICATION: SECRET // AUTHORIZED USE ONLY
      </div>
    </div>
  )
}
