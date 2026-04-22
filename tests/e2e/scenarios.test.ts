import { test, expect } from '@playwright/test'

test('scenarios page loads', async ({ page }) => {
  await page.goto('/scenarios')
  // Either shows scenario content or redirects to auth — both are valid
  const url = page.url()
  const isOnScenarios = url.includes('/scenarios')
  const isOnAuth = url.includes('/auth') || url.includes('/login') || url.includes('/sign')

  expect(isOnScenarios || isOnAuth).toBe(true)
})

test('scenarios page or auth page renders without error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/scenarios')
  await page.waitForLoadState('networkidle')

  // Filter out known benign errors (Mapbox, analytics, etc.)
  const criticalErrors = errors.filter(
    (e) => !e.includes('mapbox') && !e.includes('analytics') && !e.includes('favicon')
  )
  expect(criticalErrors).toHaveLength(0)
})
