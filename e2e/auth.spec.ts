import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => {
      window.localStorage.clear()
    })
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[name="email"]', 'test@alforis.fr')
    await page.fill('input[name="password"]', 'test123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

    // Token should be stored
    const token = await page.evaluate(() => window.localStorage.getItem('access_token'))
    expect(token).toBeTruthy()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[name="email"]', 'wrong@email.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=/erreur|error|invalide|incorrect/i')).toBeVisible({ timeout: 5000 })
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show validation error
    const emailInput = page.locator('input[name="email"]')
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(validationMessage).toBeTruthy()
  })

  test('should require email and password', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.click('button[type="submit"]')

    // Check HTML5 validation
    const emailInput = page.locator('input[name="email"]')
    const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isEmailInvalid).toBe(true)
  })

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/auth\/login/, { timeout: 5000 })
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'test@alforis.fr')
    await page.fill('input[name="password"]', 'test123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Logout
    await page.click('text=/déconnecter|logout|sign out/i')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/auth\/login/, { timeout: 5000 })

    // Token should be cleared
    const token = await page.evaluate(() => window.localStorage.getItem('access_token'))
    expect(token).toBeNull()
  })
})
