'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Custom fallback renderer. Receives the caught error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * React error boundary for the GameView subtree.
 *
 * Catches runtime errors (hydration failures, unhandled component crashes)
 * and renders a fallback UI instead of a white-screen crash.
 *
 * Usage:
 *   <GameErrorBoundary>
 *     <GameView ... />
 *   </GameErrorBoundary>
 *
 * Or with a custom fallback:
 *   <GameErrorBoundary fallback={(err, reset) => <MyFallback err={err} onReset={reset} />}>
 *     ...
 *   </GameErrorBoundary>
 */
export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Non-invasive logging — no external service required.
    console.error('[GameErrorBoundary] Caught unhandled error:', error, info.componentStack)
  }

  reset() {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback) {
        return fallback(error, this.reset)
      }

      // Default fallback — "Declassified War Room" tone, Stitch design tokens
      return (
        <div
          className="flex flex-col items-center justify-center w-full h-full min-h-[320px] gap-4 p-8 text-center"
          style={{ background: 'var(--bg-base)' }}
          role="alert"
        >
          {/* Red accent rule */}
          <div className="w-10 h-px" style={{ background: 'var(--status-critical)' }} />

          <div className="font-mono text-2xs uppercase tracking-[0.18em] text-status-critical">
            SYSTEM FAULT DETECTED
          </div>

          <p className="font-serif italic text-sm text-text-tertiary leading-relaxed max-w-[320px]">
            An unhandled error has disrupted the simulation display. Your session state
            is intact — reload the panel to continue operations.
          </p>

          {/* Error detail (collapsed, dev-friendly) */}
          <details className="w-full max-w-sm text-left">
            <summary className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-tertiary cursor-pointer hover:text-text-secondary">
              Error details
            </summary>
            <pre className="mt-2 px-3 py-2 font-mono text-[9px] text-status-critical bg-bg-surface border border-status-critical overflow-auto whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          </details>

          <button
            onClick={this.reset}
            className="mt-2 px-6 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] border border-gold text-gold hover:bg-gold hover:text-bg-base transition-colors"
          >
            RELOAD PANEL →
          </button>
        </div>
      )
    }

    return children
  }
}
