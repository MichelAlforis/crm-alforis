import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Remplir le formulaire de login
    await page.fill('input[type="email"]', 'admin@tpmfinance.com');
    await page.fill('input[type="password"]', 'admin123');

    // Soumettre le formulaire
    await page.click('button[type="submit"]');

    // Attendre la redirection vers le dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Vérifier que nous sommes bien sur le dashboard
    await expect(page.locator('main h1').first()).toContainText('Bienvenue');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Attendre le message d'erreur
    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/auth/login');

    // Cliquer sur submit sans remplir les champs
    await page.click('button[type="submit"]');

    // Vérifier les messages de validation
    await expect(page.locator('text=Email requis')).toBeVisible();
  });
});
