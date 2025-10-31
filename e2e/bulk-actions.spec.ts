import { test, expect } from '@playwright/test'

test.describe('Bulk Actions', () => {
  test('should select multiple people', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    
    if (count > 1) {
      await checkboxes.nth(0).check()
      await checkboxes.nth(1).check()
      
      const checkedCount = await checkboxes.filter({ checked: true }).count()
      expect(checkedCount).toBeGreaterThanOrEqual(2)
    }
  })

  test('should bulk delete people', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const timestamp = Date.now()
    
    await page.click('text=/nouvelle personne|add person|créer/i')
    await page.fill('input[name="first_name"], input[name="firstName"]', 'BulkDelete1')
    await page.fill('input[name="last_name"], input[name="lastName"]', `Test${timestamp}`)
    await page.fill('input[name="personal_email"], input[name="email"]', `bulk1-${timestamp}@test.com`)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(500)
    
    await page.goto('/dashboard/people')
    const row = page.locator(`tr:has-text("Test${timestamp}")`).first()
    await row.locator('input[type="checkbox"]').check()
    
    await page.click('text=/supprimer|delete/i')
    
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain(/irréversible|irreversible|permanently/i)
      dialog.accept()
    })
    
    await expect(page.locator('text=/supprimé|deleted/i')).toBeVisible({ timeout: 10000 })
  })

  test('should bulk export people to Excel', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    
    if (count > 0) {
      await checkboxes.first().check()
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('text=/exporter|export/i')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
    }
  })

  test('should show selection count', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    
    if (count > 1) {
      await checkboxes.nth(0).check()
      await checkboxes.nth(1).check()
      
      await expect(page.locator('text=/2.*sélectionné|selected/i')).toBeVisible()
    }
  })

  test('should clear selection', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    
    if (count > 0) {
      await checkboxes.first().check()
      
      await page.click('text=/effacer|clear|annuler/i')
      
      const checkedCount = await checkboxes.filter({ checked: true }).count()
      expect(checkedCount).toBe(0)
    }
  })

  test('should select all people', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    const selectAllCheckbox = page.locator('thead input[type="checkbox"], th input[type="checkbox"]').first()
    await selectAllCheckbox.check()
    
    await page.waitForTimeout(300)
    
    const checkboxes = page.locator('tbody input[type="checkbox"]')
    const checkedCount = await checkboxes.filter({ checked: true }).count()
    const totalCount = await checkboxes.count()
    
    expect(checkedCount).toBe(totalCount)
  })
})
