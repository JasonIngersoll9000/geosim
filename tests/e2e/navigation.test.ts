import { test, expect } from '@playwright/test'

test('no critical JavaScript errors on home page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const criticalErrors = errors.filter(
    (e) =>
      !e.includes('mapbox') &&
      !e.includes('analytics') &&
      !e.includes('favicon') &&
      !e.includes('ResizeObserver')
  )
  expect(criticalErrors).toHaveLength(0)
})

test('page responds within acceptable time', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  const loadTime = Date.now() - startTime

  // Should load within 10 seconds (generous for cold Vercel start)
  expect(loadTime).toBeLessThan(10000)
})
