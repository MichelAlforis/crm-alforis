import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login')

  // Fill in credentials (use your test user credentials)
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@alforis.fr')
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'test123')

  // Click submit button
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 })

  // Verify token is stored
  const token = await page.evaluate(() => window.localStorage.getItem('access_token'))
  expect(token).toBeTruthy()

  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile })
})
