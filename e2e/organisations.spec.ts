import { test, expect } from '@playwright/test'

test.describe('Organisation CRUD Operations', () => {
  test('should display organisations list page', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    await expect(page.locator('h1, h2').filter({ hasText: /organisations?|companies/i })).toBeVisible()
  })

  test('should create a new organisation', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    const timestamp = Date.now()
    await page.click('text=/nouvelle organisation|add organisation|créer|nouveau/i')
    await page.fill('input[name="name"]', `Playwright Org ${timestamp}`)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/succès|success|créé/i')).toBeVisible({ timeout: 10000 })
  })

  test('should search for an organisation', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    const searchInput = page.locator('input[placeholder*="Recherch"], input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill('Playwright')
    await page.waitForTimeout(500)
  })

  test('should view organisation details', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    await page.locator('table tbody tr, [role="row"]').first().click()
    await expect(page.locator('text=/détails|details|informations/i')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to contacts tab', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    await page.locator('table tbody tr, [role="row"]').first().click()
    await page.click('text=/contacts/i')
    await expect(page.locator('text=/contacts/i')).toBeVisible()
  })

  test('should edit an organisation', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    await page.locator('button:has-text("Modifier"), button:has-text("Edit"), [aria-label*="edit"]').first().click()
    await page.fill('input[name="name"]', `Updated Org`)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/modifié|updated|success/i')).toBeVisible({ timeout: 10000 })
  })
})
