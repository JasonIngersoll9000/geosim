'use client'

import type { ReactNode } from 'react'

interface Props {
  variant: 'empty' | 'error'
  title: string
  body?: string
  action?: ReactNode
}

/**
 * Consistent empty / error state block used across game panels.
 *
 * - `empty`  — neutral tone; valid/expected state (no data yet).
 * - `error`  — warning tone; something broke (fetch failed, etc.).
 */
export function EmptyState({ variant, title, body, action }: Props) {
  const isError = variant === 'error'

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center gap-3 ${
        isError
          ? 'border border-status-critical bg-[rgba(231,76,60,0.05)]'
          : ''
      }`}
      style={{ minHeight: 200 }}
      role={isError ? 'alert' : undefined}
    >
      {/* Accent line */}
      <div
        className="w-8 h-px"
        style={{
          background: isError ? 'var(--status-critical)' : 'var(--border-subtle)',
        }}
      />

      {/* Title */}
      <div
        className={`font-mono text-2xs uppercase tracking-[0.12em] ${
          isError ? 'text-status-critical' : 'text-text-tertiary'
        }`}
      >
        {title}
      </div>

      {/* Body */}
      {body && (
        <p
          className={`font-serif italic text-sm leading-relaxed max-w-[240px] ${
            isError ? 'text-status-critical opacity-70' : 'text-text-tertiary'
          }`}
        >
          {body}
        </p>
      )}

      {/* Optional action (e.g. a Reload button) */}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
