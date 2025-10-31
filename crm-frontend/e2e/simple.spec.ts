import { test, expect } from '@playwright/test'

test('simple test to validate Playwright works', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toHaveTitle(/Example Domain/)
})
