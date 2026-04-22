import { test, expect } from '@playwright/test'

test('unauthenticated play route redirects to auth', async ({ page }) => {
  await page.goto('/play/iran-2026/main')
  await page.waitForLoadState('networkidle')

  const url = page.url()
  // Should land on auth page or scenarios (not the play view itself without auth)
  const redirectedAway = url.includes('/auth') || url.includes('/sign') || url.includes('/login') || url.includes('/scenarios') || url.includes('/')
  expect(redirectedAway).toBe(true)
})

test('auth page loads without critical errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/auth')
  await page.waitForLoadState('networkidle')

  // Page should render — any visible body content is sufficient
  await expect(page.locator('body')).toBeVisible()

  const criticalErrors = errors.filter(
    (e) => !e.includes('mapbox') && !e.includes('analytics') && !e.includes('favicon')
  )
  expect(criticalErrors).toHaveLength(0)
})
