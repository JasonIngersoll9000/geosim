import { test, expect } from '@playwright/test'

test('home page loads with correct heading', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/GeoSim|War Game|Geopolitical/i)
  await expect(page.locator('body')).toBeVisible()
})

test('home page has navigation to scenarios', async ({ page }) => {
  await page.goto('/')
  // Either a link or the page itself should reference scenarios
  const scenarioLink = page.getByRole('link', { name: /scenario|simulation|start/i }).first()
  const hasLink = await scenarioLink.count() > 0
  if (hasLink) {
    await expect(scenarioLink).toBeVisible()
  } else {
    // Page itself may be the landing with scenario content
    await expect(page.locator('body')).toContainText(/scenario|simulation|geosim/i)
  }
})
