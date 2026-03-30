'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClassificationBanner } from '@/components/ui/ClassificationBanner'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) {
        setError(authError.message)
      } else {
        router.push('/scenarios')
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ClassificationBanner classification="TOP SECRET // NOFORN // AUTHENTICATION REQUIRED" />

      <main
        className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: 'var(--bg-base)', paddingTop: '24px' }}
      >
        <div className="w-full max-w-md">

          {/* Wordmark */}
          <div className="mb-8">
            <Link
              href="/"
              className="font-label font-bold text-gold text-2xl tracking-[0.04em] hover:opacity-80 transition-opacity"
            >
              GEOSIM
            </Link>
            <p className="font-mono text-2xs text-text-tertiary mt-1 tracking-[0.12em] uppercase">
              Geopolitical Simulation Engine
            </p>
          </div>

          {/* Card */}
          <div
            className="p-8"
            style={{
              background: '#0d0d0d',
              border: '1px solid #1a1a1a',
              borderLeft: '3px solid var(--gold)',
            }}
          >
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-[#1a1a1a]">
              <p className="font-mono text-2xs text-text-tertiary tracking-[0.12em] uppercase mb-1">
                Operator Enrollment
              </p>
              <h1 className="font-label font-bold text-lg text-text-primary uppercase tracking-[0.04em]">
                Request Access
              </h1>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.1em]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full font-mono text-xs text-text-primary bg-bg-base border border-border-subtle px-3 py-2.5 focus:outline-none focus:border-gold transition-colors rounded-none"
                  style={{ background: '#0a0a0a' }}
                  placeholder="operator@command.mil"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.1em]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full font-mono text-xs text-text-primary bg-bg-base border border-border-subtle px-3 py-2.5 focus:outline-none focus:border-gold transition-colors rounded-none"
                  style={{ background: '#0a0a0a' }}
                  placeholder="Min. 8 characters"
                />
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirm"
                  className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.1em]"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full font-mono text-xs text-text-primary bg-bg-base border border-border-subtle px-3 py-2.5 focus:outline-none focus:border-gold transition-colors rounded-none"
                  style={{ background: '#0a0a0a' }}
                  placeholder="••••••••••••"
                />
              </div>

              {/* Inline error */}
              {error && (
                <p className="font-mono text-2xs uppercase tracking-[0.06em]" style={{ color: 'var(--status-critical)' }}>
                  ⚠ {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full py-3 text-[12px] tracking-[0.08em]"
              >
                {loading ? 'CREATING ACCOUNT...' : 'REQUEST ACCESS →'}
              </Button>
            </form>
          </div>

          {/* Footer link */}
          <div className="mt-4 text-center">
            <span className="font-mono text-2xs text-text-tertiary tracking-[0.06em] uppercase">
              Already have access?&nbsp;
            </span>
            <Link
              href="/auth/sign-in"
              className="font-mono text-2xs text-gold uppercase tracking-[0.06em] hover:opacity-80 transition-opacity"
            >
              Sign In →
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
