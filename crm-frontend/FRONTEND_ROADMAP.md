# 🗺️ CRM Frontend - Roadmap Refactoring

**Dernière mise à jour:** 31 Octobre 2025 - 18:00
**Version:** Phase 2 en cours
**Build Status:** ✅ Stable (71 routes)

---

## 📊 Vue d'Ensemble

| Phase | Status | Progress | Effort |
|-------|--------|----------|--------|
| **Phase 1** - Quick Wins | ✅ Complété | 100% | ~1,565 lignes |
| **Phase 1 Bonus** - localStorage Migration | ✅ Complété | 100% | ~1,270 lignes |
| **Phase 2** - Migration & Cleanup | 🔄 En cours | 90% | ~16h / ~18h |
| **Phase 3** - Optimizations | 📋 Planifié | 0% | ~20h |

**Total Code Écrit:** ~3,820 lignes (+985 hooks/labels)
**Total Code Économisé:** ~1,199 lignes (modals, forms, labels, tables)
**Total Fichiers Migrés:** 71+ fichiers
**Breaking Changes:** 0

**Commits cette session (6):**
- `6fdfd806` - Modal migration (MandatProduitAssociationModal)
- `c618d99e` - Label centralization (8 pages dashboard)
- `2ea48c63` - Roadmap update Phase 2.3 progress 75%
- `97c3658f` - Hook useEntityDetail for detail pages
- `47d52b0f` - Remove Table.tsx V1 (-409L)
- `d17a01cd` - Hook useSearchableDropdown for select components

---

## ✅ Phase 1 - Quick Wins (COMPLÉTÉ - 100%)

**Date:** 31 Octobre 2025
**Durée:** 1 journée
**Status:** ✅ **COMPLÉTÉ**

### 1.1 Centralized Constants (8 fichiers, ~1,270 lignes)

**Location:** `lib/constants/`

| Fichier | Lignes | Contenu |
|---------|--------|---------|
| `api.ts` | ~200 | 100+ API endpoints (AI, Email, CRM, Auth, etc.) |
| `routes.ts` | ~160 | Routes app avec types (CRM, AI, Email, Tasks, etc.) |
| `storage.ts` | ~130 | Storage helper SSR-safe + keys constants |
| `pagination.ts` | ~120 | Config pagination + helpers |
| `timeouts.ts` | ~180 | Timers, polling, cache TTL + helpers |
| `status.ts` | ~120 | Status enums (colors, labels, icons) |
| `messages.ts` | ~180 | Messages erreurs/succès standardisés |
| `index.ts` | ~20 | Central export point |

**Usage:**
```typescript
import {
  AI_ENDPOINTS,
  EMAIL_ENDPOINTS,
  ROUTES,
  storage,
  AUTH_STORAGE_KEYS,
  DEFAULT_PAGE_SIZE
} from '@/lib/constants';

// API calls
fetch(AI_ENDPOINTS.SUGGESTIONS);
fetch(EMAIL_ENDPOINTS.CAMPAIGNS);

// Navigation
router.push(ROUTES.AI.SUGGESTIONS);
router.push(ROUTES.CRM.ORGANISATIONS);

// Storage
const token = storage.get(AUTH_STORAGE_KEYS.TOKEN);
storage.set(AUTH_STORAGE_KEYS.TOKEN, newToken);

// Pagination
const pageSize = DEFAULT_PAGE_SIZE;
```

**Impact:** 200+ magic strings identifiés pour migration

---

### 1.2 Consolidated Types (1 fichier)

**Location:** `types/index.ts`

**Avant:**
```typescript
import { Organisation } from '@/lib/types';
import { AISuggestion } from '@/types/ai';
import { EmailCampaign } from '@/lib/types/email';
```

**Après:**
```typescript
import { Organisation, AISuggestion, EmailCampaign } from '@/types';
```

**Bénéfice:** Single source of truth pour tous les types

---

### 1.3 Breadcrumb Navigation (1 fichier, ~285 lignes)

**Location:** `components/navigation/Breadcrumbs.tsx`

**Features:**
- ✅ Auto-génération depuis pathname
- ✅ 40+ routes mappées vers labels français
- ✅ Détection entity ID (Organisation #123, Personne #456)
- ✅ Support max items avec ellipsis (...)
- ✅ Séparateur customisable
- ✅ Intégré dans `app/dashboard/layout.tsx`

**Résultat:**
```
🏠 Accueil > CRM > Organisations > Organisation #123
🏠 Accueil > IA > Suggestions > Détails
```

---

## ✅ Phase 1 Bonus - localStorage Migration (COMPLÉTÉ - 100%)

**Date:** 31 Octobre 2025
**Durée:** 1 journée
**Status:** ✅ **COMPLÉTÉ À 100%**

### Migration Complète localStorage → storage helper

**Statistiques:**
- ✅ **40+ fichiers migrés**
- ✅ **63 → 0 localStorage** directs (100% éliminé)
- ✅ **11 commits pushés** sur GitHub
- ✅ **Build stable** (71 routes)

**Fichiers migrés par catégorie:**

#### Hooks (8 fichiers)
1. `useLocalStorage.ts` - Hook central
2. `usePersistentFlag.ts` - Flags booléens
3. `useSidebar.ts` - État sidebar (4 clés)
4. `useNotifications.ts` - Snapshots notifications
5. `useTableColumns.ts` - Préférences colonnes
6. `useSidebarAnalytics.ts` - Analytics sidebar
7. `useWorkflows.ts` - API workflows
8. `useExport.ts` - Export data

#### Pages (9 fichiers)
9. `app/dashboard/page.tsx`
10. `app/dashboard/autofill-hitl/page.tsx`
11. `app/dashboard/settings/page.tsx`
12. `app/dashboard/settings/email-accounts/page.tsx`
13. `app/dashboard/kpis/page.tsx`
14. `app/dashboard/monitoring/page.tsx`
15. `app/dashboard/email-campaigns/[id]/page.tsx`
16. `app/dashboard/workflows/new/page.tsx`
17. `app/dashboard/campaigns/new/page.tsx`

#### Composants (21 fichiers)
18-20. **PWA:** BannerManager, PWAInstallPrompt, InstallPrompt
21-23. **Activities:** CreateActivityModal, QuickInteractionButton, RecentActivities
24-27. **Widgets:** AIInsightsWidget, EmailPerformanceWidget, RevenueChartWidget, TopClientsWidget
28-29. **Integrations:** OutlookConnector, GlobalSearchInputAdvanced
30. **Performance:** WebVitalsReporter
31. **Interactions:** InteractionCreateModal

#### Lib (3 fichiers)
39. `lib/commandHistory.ts` - Command palette history
40. `lib/offline-sync.ts` - Queue offline
41. `lib/feedback.ts` - Haptic/sound preferences

**Bénéfices:**
- ✅ **SSR-safe:** Check `typeof window` centralisé
- ✅ **Type-safe:** `storage.get<T>()` avec inférence TypeScript
- ✅ **Maintenable:** Single source of truth
- ✅ **DRY:** Constants centralisées (AUTH_STORAGE_KEYS, etc.)

**Commits:**
```
ec17513b refactor(frontend): Complete localStorage migration to 100% ⭐
23a502f5 refactor(frontend): Migrate InteractionCreateModal
9285e207 refactor(frontend): Migrate WebVitalsReporter
83987201 refactor(frontend): Migrate remaining hooks
bbb9aab2 refactor(frontend): Migrate more components
fb9f7ada refactor(frontend): Migrate localStorage to storage helper
```

---

## 🔄 Phase 2 - Migration & Cleanup (EN COURS - 90%)

**Durée estimée:** 2-3 jours
**Status:** 🔄 **90% COMPLÉTÉ**

### 2.1 Migration localStorage (✅ COMPLÉTÉ - 100%)

**Voir Phase 1 Bonus ci-dessus**

---

### 2.2 Migration vers Constants (✅ COMPLET - 100%)

**Objectif:** Migrer tous les magic strings vers les constants centralisées

#### ✅ API Endpoints Migration (100%)

**Migré (25+ fichiers):**
1. ✅ `hooks/useAI.ts` - 20+ endpoints → `AI_ENDPOINTS`
2. ✅ `lib/api.ts` - Auth tokens → `AUTH_STORAGE_KEYS`
3. ✅ `app/dashboard/email-campaigns/*.tsx` - 3 pages → `EMAIL_ENDPOINTS`
4. ✅ `app/dashboard/email-templates/page.tsx` - Templates endpoint
5. ✅ `app/dashboard/settings/email-accounts/page.tsx` - EMAIL_ACCOUNTS
6. ✅ `components/forms/ImportPeopleForm.tsx` - PEOPLE_BULK
7. ✅ `components/forms/ImportUnifiedForm.tsx` - ORGANISATIONS_BULK + PEOPLE_BULK
8. ✅ `lib/feedback.ts` - Preferences → `PREFERENCES_STORAGE_KEYS`

**Résultat:**
- ✅ **0 hardcoded '/api/v1/' endpoints** (100% migrated!)
- ✅ Added EMAIL_ACCOUNTS + EMAIL_ACCOUNT_DETAIL to constants
- ✅ Build passes (71 routes)

#### ✅ Routes Migration (100%)

**Migré (30+ fichiers):**
- ✅ Auth routes: `/auth/login` → `ROUTES.AUTH.LOGIN`
- ✅ CRM routes: `/dashboard/organisations`, `/dashboard/people`, `/dashboard/mandats`, `/dashboard/produits`
- ✅ Workflows: `/dashboard/workflows` → `ROUTES.WORKFLOWS.BASE`
- ✅ Marketing: campaigns, mailing-lists, templates → `ROUTES.MARKETING.*`
- ✅ Settings: email-apis, webhooks, integrations → `ROUTES.SETTINGS.*`
- ✅ Query params: utilisé `withQuery()` helper pour routes avec paramètres

**Résultat:**
- ✅ **0 hardcoded route strings** (31 → 0!)
- ✅ Added EMAIL_APIS, WEBHOOKS, EMAIL_ACCOUNTS to SETTINGS
- ✅ Added LOGIN, RESET_PASSWORD to AUTH
- ✅ Build passes (71 routes)

---

### 2.3 Consolidate Duplicate Components (🔄 EN COURS - 85%)

**Objectif:** Éliminer les composants dupliqués et centraliser les patterns communs

**Progress:**
- ✅ Modals: 4/4 migrés vers ModalForm (-122 lignes)
- ✅ Forms: 6/13 migrés (-140 lignes) - MandatForm, TaskForm, PersonForm, OrganisationForm, ProduitForm, KPIForm
- ✅ Labels: Centralisés dans lib/enums/labels.ts (~150 lignes)
- ✅ Select Components: 3/3 migrés vers useSearchableDropdown (-170 lignes)
- ✅ Tables: Table.tsx V1 supprimé (-409 lignes)
- ✅ Detail Pages: 4/4 CRM pages migrées vers useEntityDetail

**Duplications identifiées:**

#### 🔴 Tables (3 implémentations)
- `components/shared/Table.tsx` (basique, ~13KB) - ⚠️ **1 usage** → À supprimer
- `components/shared/TableV2.tsx` (moderne, ~15KB) - **11 usages** → Legacy support
- `components/shared/DataTable/` (ultra-premium, ~30KB) - **3 usages** → ✅ **RÉFÉRENCE**

**Analyse complétée:**
- ✅ DataTable est le système le plus complet:
  - Multi-sélection + bulk actions
  - Tri, recherche, pagination
  - Quick actions au survol
  - Dark mode, skeletons, états vides
  - README complet avec exemples
- ⚠️ TableV2 largement utilisé (11 fichiers) → migration risquée
- ✅ Table.tsx peu utilisé (1 fichier) → supprimer d'abord

**Décision:** DataTable devient la référence pour les nouvelles features

**Migration Plan:**
1. ✅ Analyse complétée - DataTable = référence
2. ✅ Supprimé Table.tsx + migré RecipientSelectorTableV2 (-409L)
3. ⏳ Documenter migration TableV2 → DataTable
4. ⏳ Migrer progressivement les 11 usages TableV2
5. ⏳ Supprimer TableV2 quand migration 100%

**Effort:** ~2-3h restant

#### ✅ Search Components (4 → 2 variants modulaires)
- ~~`GlobalSearchInput.tsx`~~ (supprimé - 0 usages)
- ~~`GlobalSearchInputAdvanced.tsx`~~ (supprimé - remplacé)
- ~~`SearchBar.tsx`~~ (supprimé - remplacé)
- `components/search/AdvancedFilters.tsx` - Composant support (keep)

**Nouveau système modulaire:**
```
components/shared/Search/
├── SearchGlobal.tsx       - Global search (Cmd+K + history)
├── SearchEntity.tsx       - Entity search (keyboard nav)
├── useSearchCore.ts       - Hook partagé (debounce, abort)
├── useSearchHistory.ts    - Persistance storage
├── types.ts               - Types partagés
└── index.ts               - Exports
```

**Migrations:**
- ✅ Navbar → SearchGlobal (Cmd+K, historique, multi-types)
- ✅ Mandats page → SearchEntity (mode contrôlé, callbacks)

**Résultats:**
- Code: 32KB → 15KB modulaire (-53%)
- Duplication: Éliminée via hooks partagés
- Maintenabilité: +++ (single source of truth)

**Status:** ✅ COMPLETÉ!

#### ✅ Modal System Consolidation (4 modals → ModalForm)

**Objectif:** Migrer tous les modaux vers le système ModalForm unifié

**Modaux migrés:**
1. ✅ `InteractionCreateModal.tsx` (254 → 224L, -30L, -12%)
2. ✅ `CreateActivityModal.tsx` (358 → 326L, -32L, -9%)
3. ✅ `TemplateCreateModal.tsx` (173 → 154L, -19L, -11%)
4. ✅ `MandatProduitAssociationModal.tsx` (239 → 199L, -40L, -17%)

**Améliorations:**
- Élimination de 60+ lignes de boilerplate par modal (backdrop, header, footer, buttons)
- Error handling standardisé via `useFormToast`
- Support dark mode ajouté partout
- Validation form avec prop `submitDisabled`
- Messages toast avec accord grammatical français (masculin/féminin)

**Économies:** -122 lignes au total (-10.2% en moyenne)

**Commit:** `6fdfd806` - refactor(modals): Migrate MandatProduitAssociationModal to ModalForm

#### ✅ Form Hooks & Consolidation (4/13 formulaires)

**Hooks créés:**
1. ✅ `hooks/useOrganisationSelect.ts` (148L) - Logique autocomplete organisation réutilisable
2. ✅ `hooks/useFormToast.ts` (163L) - Messages toast standardisés avec genre grammatical
3. ✅ `hooks/useFormAutoFocus.ts` (44L) - Auto-focus sur premier champ avec erreur
4. ✅ `hooks/useEntityDetail.ts` (167L) - Logique commune pages détail (ID, modals, tabs, delete)
5. ✅ `hooks/useSearchableDropdown.ts` (230L) - État dropdown (search, keyboard nav, infinite scroll)

**Formulaires migrés:**
1. ✅ `MandatForm.tsx` (248 → 223L, -25L, -10%)
2. ✅ `TaskForm.tsx` (436 → 391L, -45L, -10%)
3. ✅ `PersonForm.tsx` (549 → 521L, -28L, -5%)
4. ✅ `OrganisationForm.tsx` (337 → 317L, -20L, -6%)

**Patterns préservés:**
- Hooks AI (useAutofillV2, useAutofillPreview) maintenus
- Context menus AI suggestions préservés
- Détection doublons intacte
- Toute la logique métier conservée

**Économies:** -118 lignes au total (-7.5% en moyenne)

**Select Components migrés:** 3/3 vers useSearchableDropdown
1. ✅ `SearchableSelect.tsx` (308 → 237L, -71L)
2. ✅ `SearchableMultiSelect.tsx` (302 → 245L, -57L)
3. ✅ `EntityAutocompleteInput.tsx` (315 → 273L, -42L)

**Économies:** -170 lignes au total (-18% en moyenne)

**Formulaires restants:** 9/13 (migration future quand patterns émergent)

#### ✅ Label Mappings Centralization (8 pages dashboard)

**Problème:** Labels dupliqués dans 21+ pages dashboard

**Solution:** Créé `lib/enums/labels.ts` (126 lignes) - Single source of truth

**Labels centralisés:**
```typescript
// Organisation
ORGANISATION_CATEGORY_LABELS: Record<string, string>
ORGANISATION_STATUS_LABELS: Record<string, string>

// Produits
PRODUIT_TYPE_LABELS: Record<string, string>
PRODUIT_STATUS_LABELS: Record<string, string>

// Mandats
MANDAT_STATUS_LABELS: Record<string, string>
MANDAT_TYPE_LABELS: Record<string, string>

// AI & RGPD
AI_INTENT_LABELS: Record<string, string>
ENTITY_TYPE_LABELS: Record<string, string>

// Helpers
getLabel(value, labels): string
getLabelOptions(labels): Array<{value, label}>
```

**Pages migrées:**
1. ✅ `organisations/page.tsx` - CATEGORY_LABELS → ORGANISATION_CATEGORY_LABELS
2. ✅ `organisations/[id]/page.tsx` - 2 labels → centralisés
3. ✅ `produits/page.tsx` - TYPE_LABELS → PRODUIT_TYPE_LABELS
4. ✅ `produits/[id]/page.tsx` - 3 labels → centralisés
5. ✅ `mandats/page.tsx` - STATUS_LABELS → MANDAT_STATUS_LABELS
6. ✅ `mandats/[id]/page.tsx` - 2 labels → centralisés
7. ✅ `settings/rgpd/access-logs/page.tsx` - ENTITY_TYPE_LABELS centralisé
8. ✅ `ai/intelligence/page.tsx` - INTENT_LABELS → AI_INTENT_LABELS

**Impact:**
- ~150 lignes de duplication éliminées
- Maintenance simplifiée (1 seul endroit pour modifier les labels)
- Convention de nommage cohérente
- Aucun breaking change

**Commit:** `c618d99e` - refactor(frontend): Centralize label mappings in lib/enums/labels.ts

**Status:** ✅ COMPLETÉ!

#### ✅ CommandPalette (3 versions → 1)
- ~~CommandPalette.tsx~~ (supprimé)
- ~~CommandPaletteV2.tsx~~ (supprimé)
- CommandPaletteV3.tsx (version finale) ✅

**Status:** ✅ Déjà fait !

#### ✅ RecipientSelectorTable (2 versions → 1)
- ~~RecipientSelectorTable.tsx (V1)~~ (supprimé)
- RecipientSelectorTableV2.tsx ✅

**Status:** ✅ Déjà fait !

---

#### ✅ useEntityDetail Hook (Ready for use)

**Hook créé:** `hooks/useEntityDetail.ts` (167 lignes)

**Objectif:** Consolider logique commune des pages detail

**Fonctionnalités:**
- Extraction et validation ID depuis params
- Gestion états modals (edit, confirm dialogs)
- Gestion tabs (informations, activité)
- Helper delete avec redirection automatique

**Testé sur:** organisations/[id]/page.tsx (471 → 467L)

**Appliqué à:**
1. ✅ organisations/[id]/page.tsx (471 → 467L)
2. ✅ mandats/[id]/page.tsx
3. ✅ produits/[id]/page.tsx
4. ✅ people/[id]/page.tsx

**Commits:**
- `97c3658f` - feat(hooks): Add useEntityDetail
- `ce7204ad` - refactor(detail-pages): Migrate 3 detail pages to useEntityDetail hook

#### ✅ useSearchableDropdown Hook (Applied to all Select variants)

**Hook créé:** `hooks/useSearchableDropdown.ts` (230 lignes)

**Objectif:** Consolider logique des 3 variants Select (925L total)

**Fonctionnalités:**
- Dropdown state management
- Search avec filtrage local/remote
- Click outside detection
- Keyboard navigation
- Infinite scroll
- Focus management

**Appliqué à:**
1. ✅ SearchableSelect.tsx (308 → 237L, -71L)
2. ✅ SearchableMultiSelect.tsx (302 → 245L, -57L)
3. ✅ EntityAutocompleteInput.tsx (315 → 273L, -42L)

**Économies réalisées:** -170 lignes (-18%)

**Commits:**
- `d17a01cd` - feat(hooks): Add useSearchableDropdown
- `81775848` - refactor(select): Migrate 3 Select variants to useSearchableDropdown hook

---

### 2.4 Refactor API Client (📋 FUTURE - Hors scope Phase 2)

**Objectif:** Splitter `lib/api.ts` monolithique (1,140 lignes)

**Problème actuel:**
```typescript
// lib/api.ts - 1,140 lignes dans une seule classe
class APIClient {
  // Auth methods (login, logout, register, etc.)
  // CRUD Organisations
  // CRUD People
  // CRUD Tasks
  // AI endpoints
  // Email endpoints
  // File uploads
  // ... tout mélangé
}
```

**Solution proposée:**
```
lib/api/
├── core/
│   ├── client.ts          // Base HTTP client (fetch wrapper)
│   ├── types.ts           // API types communs
│   └── errors.ts          // Error handling
├── modules/
│   ├── auth.ts            // Authentication
│   ├── organisations.ts   // Organisations CRUD
│   ├── people.ts          // People CRUD
│   ├── tasks.ts           // Tasks CRUD
│   ├── ai.ts              // AI endpoints
│   ├── email.ts           // Email endpoints
│   └── files.ts           // File uploads
└── index.ts               // Exports + backward compat
```

**Migration:**
```typescript
// Backward compatible
import { apiClient } from '@/lib/api';
// OU nouveau style
import { authAPI, organisationsAPI } from '@/lib/api';

await authAPI.login(email, password);
await organisationsAPI.list({ page: 1 });
```

**Effort:** ~4h

---

### 2.5 Standardize State Management (📋 FUTURE - Décision stratégique requise)

**Objectif:** Architecture state unifiée

**Note:** Nécessite une décision architecturale stratégique avant implémentation.

**Situation actuelle:**
- Mix `useState` local
- React Query pour API calls (bon ✅)
- Custom hooks pour complex state
- Context API pour auth/theme (limité)
- Pas de state global management

**Options à évaluer:**

#### Option A: React Query + Context (Minimal)
```typescript
// API state: React Query (déjà en place) ✅
// Global state: Context API (auth, theme, sidebar)
// Local state: useState
```
**Pros:** Simple, pas de deps
**Cons:** Context peut être verbose

#### Option B: React Query + Zustand (Moderne)
```typescript
// API state: React Query ✅
// Global state: Zustand (lightweight, simple)
// Local state: useState
```
**Pros:** Zustand super simple, performant
**Cons:** +1 dépendance

#### Option C: Tout-en-un avec TanStack Query + Router
```typescript
// API state + cache: TanStack Query v5
// Router state: TanStack Router (avec search params)
```
**Pros:** Écosystème cohérent, type-safe
**Cons:** Migration plus lourde

**Décision à prendre:** Quelle architecture choisir ?

**Effort:** ~4h (selon choix)

---

## 📋 Phase 3 - Optimizations (PLANIFIÉ - 0%)

**Durée estimée:** 1 semaine
**Status:** 📋 **PLANIFIÉ**

### 3.1 Performance Optimizations
- [ ] Code splitting (React.lazy, dynamic imports)
- [ ] Image optimization (Next.js Image)
- [ ] Bundle analysis (webpack-bundle-analyzer)
- [ ] Tree shaking improvements
- [ ] Memo/useMemo strategic usage

**Effort:** ~6h

### 3.2 Testing
- [ ] Unit tests (Vitest) pour hooks critiques
- [ ] Integration tests pour API client
- [ ] E2E tests (Playwright) pour flows critiques
- [ ] Visual regression tests (Chromatic?)

**Effort:** ~8h

### 3.3 Documentation
- [ ] Storybook pour components library
- [ ] JSDoc pour fonctions publiques
- [ ] Architecture decision records (ADRs)
- [ ] Contributing guide

**Effort:** ~6h

---

## 📊 Métriques Globales

### Code Quality

| Métrique | Avant | Après | Delta |
|----------|-------|-------|-------|
| localStorage direct | 63 | 0 | -100% ✅ |
| Magic strings API | ~200 | ~5 | -97% ✅ |
| Magic strings routes | ~150 | ~28 | -81% ✅ |
| Duplicate components | ~10 | ~3 | -70% 🔄 |
| Monolithic files | api.ts (1,140L) | TBD | 🔄 |

### Build & Performance

| Métrique | Valeur | Status |
|----------|--------|--------|
| Build time | 15-21s | ✅ Stable |
| Routes générées | 71 | ✅ |
| Bundle size | TBD | 📊 À mesurer |
| TypeScript errors | 0 critical | ✅ |
| Lighthouse score | TBD | 📊 À mesurer |

### Code Stats

| Catégorie | Valeur |
|-----------|--------|
| Lignes ajoutées | ~2,835 |
| Fichiers créés | 25+ |
| Fichiers modifiés | 56+ |
| Commits | 17+ |
| Breaking changes | 0 |

---

## 🎯 Prochaines Actions (Priorité)

### 🔴 **Court Terme (1-2h)**
1. **Finir Phase 2.2** - Migrer 5 endpoints + 28 routes restants
2. **Commit + Push** - Phase 2.2 complète à 100%

### 🟡 **Moyen Terme (4-6h)**
3. **Phase 2.3** - Unifier Tables (3h)
4. **Phase 2.3** - Unifier Search (2h)

### 🟢 **Long Terme (8-12h)**
5. **Phase 2.4** - Refactor API Client (4h)
6. **Phase 2.5** - Standardize State Management (4h)

---

## 🚀 Quick Reference

### Imports Constants
```typescript
import {
  // API Endpoints
  AI_ENDPOINTS,
  EMAIL_ENDPOINTS,
  CRM_ENDPOINTS,

  // Routes
  ROUTES,

  // Storage
  storage,
  AUTH_STORAGE_KEYS,
  PREFERENCES_STORAGE_KEYS,

  // Config
  DEFAULT_PAGE_SIZE,
  POLLING_INTERVALS,
  CACHE_TTL,

  // Status
  STATUS_COLORS,
  ACTIVITY_TYPES
} from '@/lib/constants';
```

### Imports Types
```typescript
import {
  Organisation,
  Person,
  AISuggestion,
  EmailCampaign,
  Task,
  Interaction
} from '@/types';
```

### Usage Examples
```typescript
// API calls
const suggestions = await fetch(AI_ENDPOINTS.SUGGESTIONS);
const campaigns = await fetch(EMAIL_ENDPOINTS.CAMPAIGNS);

// Navigation
router.push(ROUTES.AI.SUGGESTIONS);
router.push(ROUTES.CRM.ORGANISATION_DETAIL(123));

// Storage
const token = storage.get(AUTH_STORAGE_KEYS.TOKEN);
storage.set(PREFERENCES_STORAGE_KEYS.THEME, 'dark');

// Pagination
const config = {
  pageSize: DEFAULT_PAGE_SIZE,
  pageSizeOptions: PAGINATION_PAGE_SIZE_OPTIONS
};
```

---

**Dernière mise à jour:** 31 Octobre 2025 - 23:30
**Prochaine revue:** Après completion Phase 2.2
