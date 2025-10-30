# 🔥 Guide de Refactorisation - Découpage des Fichiers > 500 Lignes

**Dette technique identifiée** : 51 fichiers > 500 lignes
**Plan d'action** : Découpage progressif par domaine, sans casser le code existant

---

## 📊 État des lieux

### Backend (Python)
- **2,617L** - `api/routes/integrations.py` ➜ 4 fichiers (~500L chacun)
- **1,412L** - `api/routes/email_campaigns.py` (P1)
- **1,362L** - `services/ai_agent.py` (P0)
- **1,338L** - `services/outlook_integration.py` (P0)

### Frontend (TypeScript)
- **1,140L** - `lib/api.ts` ➜ 8 fichiers (~150L chacun)
- **959L** - `lib/types.ts` (P1 - codegen OpenAPI)
- **909L** - `app/dashboard/settings/page.tsx` (P1)
- **803L** - `components/email/RecipientSelectorTableV2.tsx` (P1)

---

## 🎯 Phase 1 : Backend - `api/routes/integrations.py` (P0)

### Structure créée

```
crm-backend/api/routes/integrations/
├── __init__.py          # Router principal (✅ créé)
├── outlook.py           # 15 endpoints OAuth/Sync (✅ squelette)
├── email_accounts.py    # 7 endpoints CRUD comptes (✅ squelette)
├── email_sync.py        # 13 endpoints orchestration (✅ squelette)
└── autofill.py          # 3 endpoints AI autofill (✅ squelette)
```

### Migration pas-à-pas

#### Étape 1 : Copier les endpoints Outlook (15 fonctions)

**Fichier source** : `crm-backend/api/routes/integrations.py` (lignes 57-903)

**Commandes copier-coller** :

```bash
# 1. Ouvrir l'ancien fichier
code crm-backend/api/routes/integrations.py

# 2. Sélectionner lignes 57-903 (tous les endpoints /outlook/*)
# 3. Copier dans crm-backend/api/routes/integrations/outlook.py
# 4. Remplacer @router.post("/outlook/... par @router.post("/...
#    (le prefix /outlook est déjà dans __init__.py)
```

**Checklist après copie** :
- [ ] Les imports sont corrects (OutlookIntegration, schémas)
- [ ] Tous les `@router.post("/outlook/...` deviennent `@router.post("/...`
- [ ] Tous les `Depends()` sont importés
- [ ] Tester : `curl http://localhost:8000/api/v1/integrations/outlook/signatures`

#### Étape 2 : Copier les endpoints Email Accounts (7 fonctions)

**Fichier source** : `crm-backend/api/routes/integrations.py` (lignes 1900-2482)

**Copier dans** : `crm-backend/api/routes/integrations/email_accounts.py`

**⚠️ Important** :
- Copier la fonction helper `_get_user_context_from_token()` (ligne 1900)
- Déplacer les classes Pydantic vers `schemas/integrations.py` si besoin

**Checklist** :
- [ ] Helper function copiée
- [ ] 7 endpoints fonctionnels
- [ ] Tester : `curl http://localhost:8000/api/v1/integrations/email-accounts -H "Authorization: Bearer $TOKEN"`

#### Étape 3 : Copier les endpoints Email Sync (13 fonctions)

**Fichier source** : `crm-backend/api/routes/integrations.py` (lignes 1190-1900)

**Copier dans** : `crm-backend/api/routes/integrations/email_sync.py`

**Imports nécessaires** :
```python
from services.o365_oauth_service import O365OAuthService
from models.email_message import EmailMessage
from models.interaction import Interaction
```

**Checklist** :
- [ ] Tous les imports OK
- [ ] Classes Pydantic déplacées vers schemas/
- [ ] Tester : `curl -X POST http://localhost:8000/api/v1/integrations/sync-all-emails`

#### Étape 4 : Copier les endpoints Autofill (3 fonctions)

**Fichier source** : `crm-backend/api/routes/integrations.py` (lignes 904-1189)

**Copier dans** : `crm-backend/api/routes/integrations/autofill.py`

**Services nécessaires** :
```python
from services.autofill_service_v2 import AutofillServiceV2
from services.interaction_suggestion_service import InteractionSuggestionService
from services.matching_scorer import MatchingScorer
from services.autofill_apply_service import AutofillApplyService
```

**Checklist** :
- [ ] 3 endpoints copiés (v2, preview, apply)
- [ ] Tester : `curl -X POST http://localhost:8000/api/v1/integrations/ai/autofill/v2 -d '{"person_id": 123}'`

#### Étape 5 : Mise à jour du routage principal

**Fichier** : `crm-backend/main.py` (ou équivalent)

**Avant** :
```python
from api.routes.integrations import router as integrations_router
app.include_router(integrations_router)
```

**Après** :
```python
from api.routes.integrations import router as integrations_router
app.include_router(integrations_router)  # Inchangé !
```

✅ **Aucun changement nécessaire** grâce au `__init__.py` !

#### Étape 6 : Validation et cleanup

```bash
# 1. Vérifier que tous les endpoints répondent
pytest crm-backend/tests/test_integrations.py -v

# 2. Vérifier les imports circulaires
pylint crm-backend/api/routes/integrations/ --disable=all --enable=cyclic-import

# 3. Supprimer l'ancien fichier (APRÈS validation complète)
git mv crm-backend/api/routes/integrations.py crm-backend/api/routes/integrations_OLD.py
# Tester en prod pendant 1 semaine, puis supprimer
```

---

## 🎯 Phase 2 : Frontend - `lib/api.ts` (P0)

### Structure créée

```
crm-frontend/lib/api/
├── index.ts          # Client principal + rétrocompatibilité (✅ créé)
├── auth.ts           # Login, logout, profile (✅ créé)
├── people.ts         # CRUD personnes (✅ créé)
├── organisations.ts  # CRUD orgs + stats (✅ créé)
├── email.ts          # Campaigns, templates (✅ créé)
├── tasks.ts          # CRUD tâches (✅ créé)
├── integrations.ts   # Outlook, webhooks, autofill (✅ créé)
├── products.ts       # CRUD produits (✅ créé)
├── mandats.ts        # CRUD mandats (✅ créé)
└── types.ts          # Réexport types (✅ créé)
```

### Migration pas-à-pas

#### Étape 1 : Mettre à jour les imports dans les composants

**Avant** (ancien import) :
```typescript
import { api } from '@/lib/api'

// Utilisation inchangée
const people = await api.getPeople()
const user = await api.getCurrentUser()
```

**Après** (nouveau import - **100% rétrocompatible**) :
```typescript
import { api } from '@/lib/api'

// Les anciennes méthodes fonctionnent toujours !
const people = await api.getPeople()  // Délègue à api.people.list()
const user = await api.getCurrentUser()  // Délègue à api.auth.getCurrentUser()

// Nouveau style (optionnel, migrer progressivement)
const people = await api.people.list()
const user = await api.auth.getCurrentUser()
```

✅ **Aucun changement obligatoire** dans les composants existants !

#### Étape 2 : Migration progressive (optionnel)

**Exemple** : Migrer `app/dashboard/people/page.tsx`

**Avant** :
```typescript
const { data } = await api.getPeople({ search: 'John' })
```

**Après** :
```typescript
const { data } = await api.people.list({ search: 'John' })
```

**Commande recherche/remplacement** :
```bash
# Trouver tous les usages
grep -r "api\.getPeople" crm-frontend/

# Remplacer progressivement (pas urgent)
sed -i '' 's/api\.getPeople(/api.people.list(/g' crm-frontend/app/dashboard/people/page.tsx
```

#### Étape 3 : Supprimer l'ancien fichier (après migration complète)

```bash
# 1. Vérifier qu'aucun import direct de l'ancien fichier n'existe
grep -r "from '@/lib/api'" crm-frontend/ | grep -v "from '@/lib/api'"

# 2. Renommer l'ancien fichier
git mv crm-frontend/lib/api.ts crm-frontend/lib/api_OLD.ts

# 3. Tester le build
npm run build

# 4. Si OK, supprimer définitivement
git rm crm-frontend/lib/api_OLD.ts
```

---

## 🛡️ Garde-fous : Configs Linters (P0)

### Pylint (Python)

**Fichier** : `crm-backend/.pylintrc`

```ini
[MASTER]
load-plugins=pylint.extensions.mccabe

[FORMAT]
max-module-lines=600

[DESIGN]
max-parents=7
max-attributes=12
max-args=8
max-branches=15
max-locals=20
max-statements=50

[MESSAGES CONTROL]
# Warnings pour les nouveaux fichiers
disable=fixme,missing-docstring
```

**Installation** :
```bash
cd crm-backend
pip install pylint pylint-mccabe
pylint --generate-rcfile > .pylintrc  # Puis éditer avec valeurs ci-dessus
```

**Usage** :
```bash
# Check un fichier
pylint crm-backend/api/routes/integrations/outlook.py

# Check tout le projet
pylint crm-backend/ --exit-zero --output-format=colorized
```

### ESLint (TypeScript/React)

**Fichier** : `crm-frontend/.eslintrc.cjs`

**Ajouter ces rules** :
```javascript
module.exports = {
  extends: [/* votre config actuelle */],
  rules: {
    // Limite fichiers
    'max-lines': ['warn', {
      max: 500,
      skipBlankLines: true,
      skipComments: true
    }],

    // Limite fonctions
    'max-lines-per-function': ['warn', {
      max: 80,
      skipBlankLines: true,
      skipComments: true
    }],

    // Complexité cyclomatique
    'complexity': ['warn', 12],
  },

  // Exceptions pour pages Next.js (peuvent être plus longues)
  overrides: [
    {
      files: ['**/pages/**', '**/app/**/page.tsx'],
      rules: {
        'max-lines': ['warn', { max: 800 }],
      },
    },
  ],
}
```

**Installation** :
```bash
cd crm-frontend
npm install --save-dev eslint-plugin-complexity
```

**Usage** :
```bash
# Check un fichier
npx eslint lib/api/people.ts

# Check tout le projet
npm run lint
```

---

## 🚀 CI/CD : GitHub Actions Guard

**Fichier** : `.github/workflows/size-guard.yml`

```yaml
name: Size Guard

on:
  pull_request:
    paths:
      - 'crm-backend/**/*.py'
      - 'crm-frontend/**/*.ts'
      - 'crm-frontend/**/*.tsx'

jobs:
  check-file-sizes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Python files > 600 lines
        run: |
          FILES=$(find crm-backend -name "*.py" -exec awk 'END {if (NR > 600) print FILENAME}' {} \;)
          if [ -n "$FILES" ]; then
            echo "❌ Files exceeding 600 lines:"
            echo "$FILES"
            exit 1
          fi
          echo "✅ All Python files under 600 lines"

      - name: Check TypeScript files > 500 lines
        run: |
          FILES=$(find crm-frontend -name "*.ts" -o -name "*.tsx" | xargs awk 'END {if (NR > 500) print FILENAME}')
          if [ -n "$FILES" ]; then
            echo "⚠️ Files exceeding 500 lines:"
            echo "$FILES"
            exit 1
          fi
          echo "✅ All TS files under 500 lines"
```

---

## 📋 Checklist Complète

### Backend - `integrations.py`

- [ ] **Étape 1** : Créer structure dossiers (✅ FAIT)
- [ ] **Étape 2** : Copier endpoints Outlook (15 fonctions)
- [ ] **Étape 3** : Copier endpoints Email Accounts (7 fonctions)
- [ ] **Étape 4** : Copier endpoints Email Sync (13 fonctions)
- [ ] **Étape 5** : Copier endpoints Autofill (3 fonctions)
- [ ] **Étape 6** : Tests endpoints (curl + pytest)
- [ ] **Étape 7** : Supprimer ancien fichier

### Frontend - `api.ts`

- [ ] **Étape 1** : Créer structure dossiers (✅ FAIT)
- [ ] **Étape 2** : Vérifier rétrocompatibilité (build OK)
- [ ] **Étape 3** : Migrer composants progressivement (optionnel)
- [ ] **Étape 4** : Supprimer ancien fichier (après validation)

### Garde-fous

- [ ] **Pylint** : Config `.pylintrc` créée et testée
- [ ] **ESLint** : Rules `max-lines` ajoutées
- [ ] **CI/CD** : GitHub Action `size-guard.yml` active

---

## 🎯 Prochaines Phases (P1)

### Phase 2 : Services Backend

1. **`services/outlook_integration.py` (1,338L)** ➜ 3 fichiers
   - `services/outlook/client.py` (auth, calls)
   - `services/outlook/mappers.py` (EWS ➜ models)
   - `services/outlook/sync.py` (orchestration)

2. **`services/ai_agent.py` (1,362L)** ➜ 4 fichiers
   - `services/ai/agent.py` (orchestration)
   - `services/ai/policies.py` (garde-fous)
   - `services/ai/providers.py` (LLM router)
   - `services/ai/parsers.py` (signatures, intents)

### Phase 3 : Composants Frontend

1. **`RecipientSelectorTableV2.tsx` (803L)** ➜ Pattern container/presentational
   - `RecipientSelector.tsx` (container)
   - `RecipientTable.tsx` (presentational)
   - `RecipientToolbar.tsx`, `RecipientFilters.tsx`

2. **`app/dashboard/settings/page.tsx` (909L)** ➜ Sous-sections
   - `SettingsPage.tsx` (container)
   - `EmailPanel.tsx`, `AIConfigSection.tsx`, `WebhooksPanel.tsx`

---

## 📊 Métriques de Succès

- ✅ **Aucun fichier > 600 lignes** (backend)
- ✅ **Aucun fichier > 500 lignes** (frontend, hors pages)
- ✅ **Couverture tests inchangée ou ↑**
- ✅ **Zéro régression** (tests E2E passent)
- ✅ **CI verte** (lint + size guard)

---

## 🆘 En cas de problème

### Rollback rapide

```bash
# Backend
git checkout main -- crm-backend/api/routes/integrations.py
rm -rf crm-backend/api/routes/integrations/

# Frontend
git checkout main -- crm-frontend/lib/api.ts
rm -rf crm-frontend/lib/api/

# Rebuild
docker-compose down && docker-compose up --build
```

### Debug imports circulaires

```bash
# Python
pylint crm-backend/ --disable=all --enable=cyclic-import

# TypeScript
npx madge --circular --extensions ts,tsx crm-frontend/
```

---

**🔥 Prêt à démarrer ?**
Commence par **Phase 1 - Étape 2** (copier endpoints Outlook).
Les squelettes sont prêts, il ne reste que le copier-coller ! 🚀
