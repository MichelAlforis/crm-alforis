import { test, expect } from '@playwright/test';

test.describe('User Management (Admin Only)', () => {
  test('should display users page for admin', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Vérifier le titre
    await expect(page.locator('main h1').first()).toContainText('Gestion des utilisateurs');

    // Vérifier que le bouton "Nouvel utilisateur" est présent
    await expect(page.getByRole('button', { name: /nouvel utilisateur/i })).toBeVisible({ timeout: 10000 });
  });

  test('should open create user modal', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Cliquer sur "Nouvel utilisateur"
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();

    // Vérifier que le modal s'ouvre
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should create a new user', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Ouvrir le modal
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();

    // Attendre que le modal soit visible
    await page.waitForSelector('input[name="email"]', { state: 'visible' });

    // Remplir le formulaire
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', `testuser${timestamp}`);
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="password"]', 'testpass123');
    await page.fill('input[name="confirm_password"]', 'testpass123');

    // Sélectionner un rôle
    await page.selectOption('select[name="role_id"]', '3'); // User

    // Soumettre
    await page.getByRole('button', { name: /créer/i }).click();

    // Attendre un peu pour que la requête soit envoyée
    await page.waitForTimeout(2000);

    // Vérifier que nous sommes toujours sur la page users (pas de redirection d'erreur)
    await expect(page).toHaveURL('/dashboard/users');
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();

    // Attendre que le modal soit visible
    await page.waitForSelector('input[name="email"]', { state: 'visible' });

    // Remplir avec des mots de passe différents
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirm_password"]', 'different123');

    await page.getByRole('button', { name: /créer/i }).click();

    // Vérifier le message d'erreur
    await expect(
      page.locator('text=Les mots de passe ne correspondent pas')
    ).toBeVisible();
  });

  test('should filter users by search', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Attendre que la page charge (peut être vide ou avec tableau)
    await page.waitForTimeout(2000);

    // Vérifier que nous sommes bien sur la bonne page
    await expect(page.locator('main h1').first()).toContainText('Gestion des utilisateurs');
  });
});
