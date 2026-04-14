'use client'

/**
 * Returns a mock user object when NEXT_PUBLIC_DEV_MODE=true.
 * In production (or when dev mode is off) this returns null.
 *
 * Mirrors the shape from lib/auth/devUser.ts but as a React hook
 * so it integrates cleanly with component-level auth checks.
 */
export interface MockUser {
  id: string
  email: string
  role: 'admin'
}

export function useDevAuth(): MockUser | null {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') return null
  return {
    id:    'dev-user',
    email: 'dev@geosim.local',
    role:  'admin',
  }
}

export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true'
}
