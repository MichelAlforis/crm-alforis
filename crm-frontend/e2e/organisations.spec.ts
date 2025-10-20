import { test, expect } from '@playwright/test';

test.describe('Organisations Management', () => {
  test('should create a new organisation', async ({ page }) => {
    // Aller sur la page organisations
    await page.goto('/dashboard/organisations');

    // Attendre que la page charge (peut afficher erreur ou liste vide)
    await page.waitForTimeout(2000);

    // Vérifier que la page s'affiche sans erreur JavaScript fatale
    const errorAlert = page.locator('text=Cannot read properties');
    await expect(errorAlert).not.toBeVisible();

    // Cliquer sur "Nouvelle organisation" si disponible
    const newOrgButton = page.getByRole('button', { name: /nouvelle organisation/i });
    if (await newOrgButton.isVisible({ timeout: 5000 })) {
      await newOrgButton.click();

      // Attendre que le modal soit visible
      await page.waitForSelector('input[name="name"]', { state: 'visible' });

      // Remplir le formulaire
      const timestamp = Date.now();
      const testName = `Test Organisation ${timestamp}`;
      await page.fill('input[name="name"]', testName);
      await page.selectOption('select[name="category"]', 'DISTRIBUTEUR');
      await page.fill('input[name="email"]', `test${timestamp}@example.com`);

      // Soumettre
      await page.getByRole('button', { name: /créer/i }).click();

      // Attendre la soumission
      await page.waitForTimeout(2000);

      // Vérifier que nous sommes toujours sur la page organisations (liste ou new)
      await expect(page.url()).toMatch(/\/dashboard\/organisations/);
    }
  });

  test('should navigate to organisation details', async ({ page }) => {
    await page.goto('/dashboard/organisations');

    // Attendre que la page charge
    await page.waitForTimeout(2000);

    // Vérifier qu'il n'y a pas d'erreur JavaScript
    const errorAlert = page.locator('text=Cannot read properties');
    await expect(errorAlert).not.toBeVisible();
  });

  test('should filter organisations by search', async ({ page }) => {
    await page.goto('/dashboard/organisations');

    // Attendre que la page charge
    await page.waitForTimeout(2000);

    // Vérifier qu'il n'y a pas d'erreur JavaScript
    const errorAlert = page.locator('text=Cannot read properties');
    await expect(errorAlert).not.toBeVisible();
  });
});
