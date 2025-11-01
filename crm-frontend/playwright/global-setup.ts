import type { FullConfig } from '@playwright/test';

/**
 * Global setup pour Playwright E2E tests
 *
 * Ce setup s'exécute AVANT tous les tests et garantit que :
 * 1. L'API backend est disponible et healthy
 * 2. La base de données est prête avec les données de seed
 *
 * En cas d'échec, tous les tests sont abandonnés (fail-fast).
 */
export default async function globalSetup(config: FullConfig) {
  const apiBaseURL = process.env.API_BASE_URL || 'http://localhost:8000';
  const maxRetries = 40;
  const retryDelayMs = 2000;

  console.log('🔧 Global Setup: Checking API health...');
  console.log(`📍 API URL: ${apiBaseURL}/api/v1/health`);

  // Wait for API to be healthy
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const response = await fetch(`${apiBaseURL}/api/v1/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({ status: 'ok' }));
        console.log(`✅ API is healthy (attempt ${i}/${maxRetries}):`, data);
        return;
      }

      console.log(`⏳ API not ready yet (attempt ${i}/${maxRetries}): HTTP ${response.status}`);
    } catch (error: any) {
      console.log(`⏳ Waiting for API (attempt ${i}/${maxRetries}): ${error.message || error}`);
    }

    // Wait before next retry (except on last attempt)
    if (i < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  // If we reach here, API never became healthy
  console.error('❌ API health check failed after maximum retries');
  console.error(`   Tried ${maxRetries} times over ${(maxRetries * retryDelayMs) / 1000}s`);
  console.error(`   URL: ${apiBaseURL}/api/v1/health`);

  throw new Error(
    `API did not become healthy within ${(maxRetries * retryDelayMs) / 1000}s. ` +
    `Check that the backend is running and the database is properly seeded.`
  );
}
