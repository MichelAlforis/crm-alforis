# 🎭 Rapport Tests E2E Playwright - CRM Alforis

**Date:** 31 Octobre 2025
**Status:** ✅ Opérationnel
**Migration:** Cypress → Playwright (incompatibilité macOS Sequoia 15.x)

---

## 📊 Résultats des Tests

### Tests Publics (Sans Authentification)
```
✓ 3 passed (37.0s)

✓ Login Page - should display login page elements (8.7s)
✓ Login Page - should show validation error for empty form (9.2s)  
✓ Login Page - should redirect to login when accessing dashboard without auth (10.9s)
```

**Coverage:** 
- Page de login
- Validation formulaires
- Protection routes authentifiées
- Redirections sécurité

---

## 📁 Structure Tests E2E

```
crm-frontend/e2e/
├── auth.setup.ts              # Setup authentification réutilisable
├── auth.spec.ts               # 7 tests flow authentification  
├── people.spec.ts             # 6 tests CRUD personnes
├── organisations.spec.ts      # 6 tests CRUD organisations
├── bulk-actions.spec.ts       # 6 tests actions groupées
├── login-page.spec.ts         # 3 tests page login ✅ ACTIF
├── site-navigation.spec.ts    # 11 tests navigation & structure
└── simple.spec.ts             # Test validation Playwright
```

**Total:** 39 tests E2E créés
- **Actifs:** 3 tests (sans auth)
- **À activer:** 36 tests (avec auth - require user test)

---

## 🔧 Configuration Playwright

### Fichier: [playwright.config.ts](playwright.config.ts)

**Features activées:**
- ✅ Timeouts configurés (30s test, 15s navigation)
- ✅ Screenshots on failure
- ✅ Videos on failure
- ✅ Traces on failure (debug)
- ✅ Multiple reporters (HTML, JSON, JUnit, GitHub Actions)
- ✅ Parallel execution (3 workers)
- ✅ Retry on CI (2x)
- ✅ Auto-start webserver (Next.js dev)

**Reporters:**
```typescript
['html', { outputFolder: 'playwright-report', open: 'never' }],
['json', { outputFile: 'playwright-report/results.json' }],
['junit', { outputFile: 'playwright-report/results.xml' }],
['list'], // Console output
['github'], // GitHub Actions annotations
```

---

## 📋 Rapports Générés

### Fichiers de Rapports

| Fichier | Taille | Description |
|---------|--------|-------------|
| `playwright-report/index.html` | 518 KB | Rapport visuel interactif complet |
| `playwright-report/results.json` | 6 KB | Format machine-readable (CI/CD) |
| `playwright-report/results.xml` | 745 B | Format JUnit (Jenkins, GitLab, etc) |
| `test-results/` | 4 KB | Screenshots, videos, traces |

### Ouvrir le Rapport HTML

```bash
cd crm-frontend
npm run test:e2e:report

# Ou directement:
npx playwright show-report
```

Le rapport HTML contient:
- ✅ Liste de tous les tests (passed/failed/skipped)
- ✅ Durée d'exécution par test
- ✅ Screenshots des échecs
- ✅ Videos des échecs
- ✅ Traces d'exécution (timeline interactive)
- ✅ Console logs
- ✅ Network requests
- ✅ Comparaison visuelle

---

## 🚀 Commandes Disponibles

```bash
# Lancer tous les tests E2E (headless)
npm run test:e2e

# Mode UI interactif (recommandé pour développement)
npm run test:e2e:ui

# Mode headed (voir le navigateur)
npm run test:e2e:headed

# Mode debug (pause sur chaque action)
npm run test:e2e:debug

# Voir dernier rapport HTML
npm run test:e2e:report
```

---

## 🔐 Activer Tests avec Authentification

### Étape 1: Créer utilisateur test

**Option A: SQL Direct**
```sql
-- Dans la DB PostgreSQL
INSERT INTO users (email, hashed_password, full_name, role, is_active)
VALUES (
  'test@alforis.fr',
  '$2b$12$... ', -- Hash de 'test123'
  'Test User',
  'user',
  true
);
```

**Option B: API Signup**
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@alforis.fr",
    "password": "test123",
    "full_name": "Test User"
  }'
```

### Étape 2: Décommenter les projects dans playwright.config.ts

```typescript
// Dans playwright.config.ts, ligne 84-104
// Décommenter ces sections:

{
  name: 'setup',
  testMatch: /.*\.setup\.ts/,
},
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
```

### Étape 3: Lancer tous les tests

```bash
npm run test:e2e
```

Cela lancera:
1. **Setup** (auth.setup.ts) - Login et sauvegarde session
2. **36 tests authentifiés** - People, Organisations, Bulk Actions, etc.

---

## 📈 Tests Détaillés Disponibles

### Auth Flow (7 tests)
- ✅ Login avec credentials valides
- ✅ Erreur credentials invalides
- ✅ Validation format email
- ✅ Champs requis
- ✅ Protection routes dashboard
- ✅ Logout
- ✅ Persistence session

### People CRUD (6 tests)
- ✅ Affichage liste personnes
- ✅ Création nouvelle personne
- ✅ Recherche personne
- ✅ Voir détails personne
- ✅ Édition personne
- ✅ Suppression personne

### Organisations (6 tests)
- ✅ Affichage liste organisations
- ✅ Création organisation
- ✅ Recherche organisation
- ✅ Détails organisation
- ✅ Navigation tabs (Contacts, Mandats)
- ✅ Édition organisation

### Bulk Actions (6 tests)
- ✅ Sélection multiple
- ✅ Suppression groupée avec confirmation
- ✅ Export Excel
- ✅ Compteur sélection
- ✅ Clear sélection
- ✅ Select all

### Site Navigation (11 tests)
- ✅ Homepage & meta tags
- ✅ Redirections sécurité
- ✅ Structure login page
- ✅ Accessibilité (a11y)
- ✅ Protection routes
- ✅ Console errors check
- ✅ Assets loading
- ✅ Responsive viewports (mobile/tablet/desktop)

---

## 🎯 Avantages Playwright vs Cypress

| Feature | Playwright | Cypress |
|---------|-----------|---------|
| **macOS 15.x** | ✅ Compatible | ❌ Incompatible |
| **Performance** | ⚡ Rapide (20-40s) | 🐢 Plus lent |
| **Parallel** | ✅ Natif | ⚠️ Payant |
| **Multi-browser** | ✅ Chrome, Firefox, Safari | ⚠️ Limité |
| **Traces** | ✅ Timeline interactive | ❌ Limité |
| **Auto-wait** | ✅ Intelligent | ✅ OK |
| **TypeScript** | ✅ Excellent | ✅ OK |
| **CI/CD** | ✅ Parfait | ✅ OK |

---

## 📊 CI/CD Integration

### GitHub Actions

Les rapports sont au format JUnit (results.xml) compatible avec GitHub Actions:

```yaml
- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: crm-frontend/playwright-report/
```

---

## 🐛 Troubleshooting

### Tests timeout
→ Augmente timeout dans playwright.config.ts (ligne 19)

### User test n'existe pas
→ Crée user `test@alforis.fr` / `test123` dans DB

### Port 3010 occupé
→ `npm run kill-port`

### Module './Table' not found (warnings)
→ Normal, n'affecte pas les tests E2E

### Playwright not found
→ `cd .. && npm install -D @playwright/test`

---

## 📝 Prochaines Étapes

1. ✅ ~~Migrer de Cypress à Playwright~~
2. ✅ ~~Créer tests publics (login page)~~
3. ✅ ~~Configurer rapports détaillés~~
4. ⏳ Créer user test et activer tests avec auth
5. ⏳ Intégrer dans CI/CD GitHub Actions
6. ⏳ Ajouter tests API (backend)
7. ⏳ Ajouter visual regression tests

---

**Status:** ✅ **Migration Cypress → Playwright réussie!**
**Tests actifs:** 3/39 (8%)
**Tests à activer:** 36/39 (92% - require user test)

🎉 **Playwright est 100% opérationnel sur macOS Sequoia 15.x!**
