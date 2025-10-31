import { test, expect } from '@playwright/test'

test.describe('Site Navigation & Structure Tests', () => {
  test('should load homepage and check meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check title
    await expect(page).toHaveTitle(/CRM|Alforis|TPM/)
    
    // Check viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewportMeta).toContain('width=device-width')
  })

  test('should redirect root to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to login
    await page.waitForURL(/.*auth\/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/.*auth\/login/)
  })

  test('should load login page with correct structure', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check form elements exist
    const emailInput = page.locator('input[name="email"], input[type="email"]')
    const passwordInput = page.locator('input[name="password"], input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    // Check input types
    const emailType = await emailInput.getAttribute('type')
    expect(emailType).toBe('email')
    
    const passwordType = await passwordInput.getAttribute('type')
    expect(passwordType).toBe('password')
  })

  test('should have proper form attributes for accessibility', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check email input has proper attributes
    const emailInput = page.locator('input[name="email"], input[type="email"]')
    const emailName = await emailInput.getAttribute('name')
    expect(emailName).toBeTruthy()
    
    // Check password input has proper attributes
    const passwordInput = page.locator('input[name="password"], input[type="password"]')
    const passwordName = await passwordInput.getAttribute('name')
    expect(passwordName).toBeTruthy()
  })

  test('should prevent access to dashboard without authentication', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/')
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    
    // Try to access dashboard
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 })
  })

  test('should prevent access to people page without authentication', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    
    await page.goto('/dashboard/people')
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 })
  })

  test('should prevent access to organisations page without authentication', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    
    await page.goto('/dashboard/organisations')
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 })
  })

  test('should have no console errors on login page', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Filter out known acceptable errors (like failed auth attempts)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('401') && 
      !err.includes('fetch') &&
      !err.includes('NetworkError')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })

  test('should load page assets successfully', async ({ page }) => {
    const failedRequests: string[] = []
    
    page.on('requestfailed', request => {
      failedRequests.push(request.url())
    })
    
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Filter out API calls (they might fail without backend)
    const assetFailures = failedRequests.filter(url => 
      !url.includes('/api/') && 
      !url.includes('localhost:8000')
    )
    
    expect(assetFailures).toHaveLength(0)
  })

  test('should have responsive viewport', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
  })

  test('should have no a11y violations on login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check for basic a11y: focusable elements
    const emailInput = page.locator('input[name="email"], input[type="email"]')
    await emailInput.focus()
    await expect(emailInput).toBeFocused()
    
    const passwordInput = page.locator('input[name="password"], input[type="password"]')
    await passwordInput.focus()
    await expect(passwordInput).toBeFocused()
    
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.focus()
    await expect(submitButton).toBeFocused()
  })
})
