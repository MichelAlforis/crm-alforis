import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration - CRM Alforis
 *
 * Configuration complète pour tests E2E avec rapports détaillés
 *
 * Commandes:
 * - npm run test:e2e           # Tous les tests headless
 * - npm run test:e2e:ui        # Mode UI interactif
 * - npm run test:e2e:headed    # Voir le navigateur
 * - npm run test:e2e:debug     # Mode debug
 * - npm run test:e2e:report    # Voir rapport HTML
 */
export default defineConfig({
  testDir: './e2e',

  /* Timeout par test (30s) */
  timeout: 30000,

  /* Expect timeout (5s) */
  expect: {
    timeout: 5000,
  },

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail on CI if test.only */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests on CI */
  retries: process.env.CI ? 2 : 0,

  /* Parallel workers */
  workers: process.env.CI ? 1 : undefined,

  /* Reporters - HTML + JSON + GitHub Actions */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['list'],
    ['github'], // Pour GitHub Actions
  ],

  /* Shared settings */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:3010',

    /* Collect trace always (pour debug) */
    trace: 'retain-on-failure',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Viewport */
    viewport: { width: 1280, height: 720 },

    /* Action timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 15000,
  },

  /* Projects pour différents types de tests */
  projects: [
    /* Tests sans authentification (login, public pages) */
    {
      name: 'chromium-public',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: [/login-page\.spec\.ts/, /site-navigation\.spec\.ts/, /simple\.spec\.ts/],
    },

    /* Setup authentification (à activer quand user test existe) */
    /* Décommenter ces 2 projects quand user test@alforis.fr existe */
    /*
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    */

    /* Tests avec authentification complète */
    /* Décommenter pour tester People, Organisations, Bulk Actions */
    /*
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/login-page\.spec\.ts/, /simple\.spec\.ts/],
    },
    */
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3010',
    reuseExistingServer: true,
  },
});
