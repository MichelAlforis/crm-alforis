import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Aller sur la page de login
  await page.goto('/auth/login');

  // Se connecter avec l'utilisateur de test
  const testEmail = process.env.TEST_USER_EMAIL || 'test@alforis.fr';
  const testPassword = process.env.TEST_USER_PASSWORD || 'test123';

  await page.fill('input[name="email"], input[type="email"]', testEmail);
  await page.fill('input[name="password"], input[type="password"]', testPassword);
  await page.click('button[type="submit"]');

  // Attendre que l'authentification soit terminée
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

  // Vérifier qu'on a bien un token
  const token = await page.evaluate(() => window.localStorage.getItem('access_token'));
  expect(token).toBeTruthy();

  // Sauvegarder l'état d'authentification
  await page.context().storageState({ path: authFile });
});
