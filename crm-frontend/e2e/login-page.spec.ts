import { test, expect } from '@playwright/test'

test.describe('Login Page (No Auth Required)', () => {
  test('should display login page elements', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Vérifier que les éléments de la page sont présents
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Cliquer sur submit sans remplir
    await page.click('button[type="submit"]')
    
    // Attendre un court instant pour la validation
    await page.waitForTimeout(500)
    
    // Le formulaire ne devrait pas être soumis (on reste sur /auth/login)
    await expect(page).toHaveURL(/.*auth\/login/)
  })

  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    // Nettoyer le localStorage
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    
    // Essayer d'accéder au dashboard
    await page.goto('/dashboard')
    
    // Devrait rediriger vers login
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 })
  })
})
