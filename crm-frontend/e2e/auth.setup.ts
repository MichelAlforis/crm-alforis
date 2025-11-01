import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  // Vérifier si le backend est disponible
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const healthCheck = await request.get(`${backendUrl}/health`, { timeout: 5000 });
    if (!healthCheck.ok()) {
      console.warn('⚠️  Backend API non disponible - Skip authentification test');
      console.warn('   Les tests nécessitant l\'authentification seront également skippés');
      setup.skip();
      return;
    }
  } catch (error) {
    console.warn('⚠️  Backend API non accessible - Skip authentification test');
    console.warn(`   URL testée: ${backendUrl}/health`);
    console.warn('   Les tests nécessitant l\'authentification seront également skippés');
    setup.skip();
    return;
  }

  // Aller sur la page de login
  await page.goto('/auth/login', { waitUntil: 'networkidle' });

  // Se connecter avec l'utilisateur de test
  const testEmail = process.env.TEST_USER_EMAIL || 'test@alforis.fr';
  const testPassword = process.env.TEST_USER_PASSWORD || 'test123';

  // Attendre que les champs soient visibles
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 5000 });
  await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 5000 });

  // Remplir les champs
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);

  // Attendre que le bouton soit prêt et cliquer
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await submitButton.click();

  // Attendre que l'authentification soit terminée (augmenté à 30s pour le CI)
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });

  // Vérifier qu'on a bien un token
  const token = await page.evaluate(() => window.localStorage.getItem('access_token'));
  expect(token).toBeTruthy();

  // Sauvegarder l'état d'authentification
  await page.context().storageState({ path: authFile });
});
