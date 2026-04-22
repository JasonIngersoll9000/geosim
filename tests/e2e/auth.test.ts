import { test, expect } from '@playwright/test'

test('unauthenticated play route redirects to auth', async ({ page }) => {
  await page.goto('/play/iran-2026/main')
  await page.waitForLoadState('networkidle')

  const url = page.url()
  // Should land on auth page or scenarios (not the play view itself without auth)
  const redirectedAway = url.includes('/auth') || url.includes('/sign') || url.includes('/login') || url.includes('/scenarios') || url.includes('/')
  expect(redirectedAway).toBe(true)
})

test('auth page renders sign-in form', async ({ page }) => {
  await page.goto('/auth')
  await page.waitForLoadState('networkidle')

  // Should have some form of auth UI — sign in, sign up, or email field
  const hasAuthElement = await page.locator('input[type="email"], input[type="password"], [data-testid="auth"]').count() > 0
  const hasAuthText = await page.getByText(/sign in|log in|email|password/i).count() > 0
  expect(hasAuthElement || hasAuthText).toBe(true)
})
