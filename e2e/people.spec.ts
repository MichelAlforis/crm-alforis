import { test, expect } from '@playwright/test'

test.describe('People CRUD Operations', () => {
  test('should display people list page', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    await expect(page.locator('h1, h2').filter({ hasText: /personnes|people|contacts/i })).toBeVisible()
  })

  test('should create a new person', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const timestamp = Date.now()
    const testPerson = {
      firstName: 'Playwright',
      lastName: `Test${timestamp}`,
      email: `playwright.test${timestamp}@example.com`,
      phone: '+33612345678',
    }

    await page.click('text=/nouvelle personne|add person|créer|nouveau/i')
    
    await page.fill('input[name="first_name"], input[name="firstName"]', testPerson.firstName)
    await page.fill('input[name="last_name"], input[name="lastName"]', testPerson.lastName)
    await page.fill('input[name="personal_email"], input[name="email"]', testPerson.email)
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=/succès|success|créé/i')).toBeVisible({ timeout: 10000 })
    
    await page.goto('/dashboard/people')
    await expect(page.locator(`text=${testPerson.lastName}`)).toBeVisible()
  })

  test('should search for a person', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const searchInput = page.locator('input[placeholder*="Recherch"], input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill('Test')
    
    await page.waitForTimeout(500)
    
    const rows = await page.locator('table tbody tr, [role="row"]').count()
    expect(rows).toBeGreaterThan(0)
  })

  test('should view person details', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    await page.locator('table tbody tr, [role="row"]').first().click()
    
    await expect(page.locator('text=/détails|details|informations/i')).toBeVisible({ timeout: 5000 })
  })

  test('should edit a person', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    await page.locator('button:has-text("Modifier"), button:has-text("Edit"), [aria-label*="edit"]').first().click()
    
    const timestamp = Date.now()
    await page.fill('input[name="phone"], input[name="tel"]', `+336${timestamp}`)
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=/modifié|updated|success/i')).toBeVisible({ timeout: 10000 })
  })

  test('should delete a person', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const timestamp = Date.now()
    await page.click('text=/nouvelle personne|add person|créer/i')
    await page.fill('input[name="first_name"], input[name="firstName"]', 'ToDelete')
    await page.fill('input[name="last_name"], input[name="lastName"]', `Test${timestamp}`)
    await page.fill('input[name="personal_email"], input[name="email"]', `delete${timestamp}@test.com`)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1000)
    
    await page.goto('/dashboard/people')
    const row = page.locator(`tr:has-text("Test${timestamp}")`).first()
    await row.locator('button:has-text("Supprimer"), button:has-text("Delete"), [aria-label*="delete"]').click()
    
    page.on('dialog', dialog => dialog.accept())
    
    await expect(page.locator('text=/supprimé|deleted|success/i')).toBeVisible({ timeout: 10000 })
  })
})
