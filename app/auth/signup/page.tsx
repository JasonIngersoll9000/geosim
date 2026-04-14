'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Access codes do not match.')
      return
    }
    if (password.length < 8) {
      setError('Access code must be at least 8 characters.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/scenarios` },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-status-stable mb-3">
          ● Clearance Request Submitted
        </div>
        <p className="font-mono text-[11px] text-text-secondary leading-relaxed mb-4">
          A confirmation dispatch has been sent to{' '}
          <span className="text-text-primary">{email}</span>.
          Verify your identity to complete registration.
        </p>
        <Link
          href="/auth/login"
          className="inline-block font-mono text-[10px] uppercase tracking-[0.1em] text-status-info hover:underline"
        >
          ← Return to Authentication Portal
        </Link>
      </div>
    )
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
          placeholder="analyst@geosim.gov"
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
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="w-full px-3 py-2.5 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      <div>
        <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
          Confirm Access Code
        </label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat access code"
          className="w-full px-3 py-2.5 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="px-3 py-2 border border-status-critical-border bg-status-critical-bg font-mono text-[11px] text-status-critical"
        >
          ERROR — {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] bg-gold text-bg-base hover:bg-[#e5a600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'PROCESSING…' : 'REQUEST CLEARANCE →'}
      </button>

      <p className="text-center font-mono text-[10px] text-text-tertiary">
        Already cleared?{' '}
        <Link href="/auth/login" className="text-status-info hover:underline">
          AUTHENTICATE
        </Link>
      </p>
    </form>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-4 pt-8">
      {/* Classification header */}
      <div className="mb-8 text-center">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold mb-4">
          ◆&nbsp;&nbsp;SECRET // GEOSIM ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY&nbsp;&nbsp;◆
        </div>
        <h1 className="font-label font-bold text-2xl uppercase tracking-[0.08em] text-text-primary mb-1">
          GEOSIM
        </h1>
        <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
          Analyst Clearance Request
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm bg-bg-surface-dim border border-border-subtle p-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary mb-5 pb-3 border-b border-border-subtle flex items-center justify-between">
          <span>New Analyst Registration</span>
          <span className="text-status-warning">● SECURE CHANNEL</span>
        </div>

        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </div>

      {/* Bottom classification */}
      <div className="mt-6 font-mono text-[8px] uppercase tracking-[0.15em] text-text-tertiary text-center">
        GEOSIM-IRN-2026 // CLASSIFICATION: SECRET // AUTHORIZED USE ONLY
      </div>
    </div>
  )
}
