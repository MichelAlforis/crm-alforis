import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Aller sur la page de login
  await page.goto('/auth/login');

  // Se connecter avec l'utilisateur admin
  await page.fill('input[type="email"]', 'admin@tpmfinance.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Attendre que l'authentification soit terminée
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

  // Sauvegarder l'état d'authentification
  await page.context().storageState({ path: authFile });
});
