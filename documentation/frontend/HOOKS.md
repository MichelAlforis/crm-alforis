# 🎣 Hooks React - CRM Alforis

**Dernière mise à jour** : 24 Octobre 2025

---

## 📋 Vue d'ensemble

Liste complète des hooks React personnalisés utilisés dans le CRM.

**Total** : **29 hooks** | **Réutilisables** : 4 hooks ⭐ | **Métier** : 17 hooks | **UI/UX** : 6 hooks | **Utilitaires** : 2 hooks

---

## 🎯 Hooks Réutilisables ⭐

Ces hooks ont été créés pour être utilisés dans plusieurs modules.

### 1. useTableColumns
**Fichier** : `hooks/useTableColumns.ts` | **Créé** : Chapitre 5

Gestion des colonnes visibles/cachées avec sauvegarde localStorage.

```typescript
const { visibleColumns, toggleColumn, resetColumns } = useTableColumns(
  'organisations-columns',
  ['name', 'type', 'country', 'aum']
)
```

**Utilisé dans** : Organisations, People, Mandats
**Composant associé** : `ColumnSelector.tsx`

---

### 2. useConfirm
**Fichier** : `hooks/useConfirm.tsx` | **Créé** : Chapitre 5

Modals de confirmation modernes (remplace `window.confirm()`).

```typescript
const confirm = useConfirm()

await confirm({
  title: 'Supprimer ?',
  message: 'Action irréversible',
  type: 'danger', // danger | warning | info | success
  onConfirm: async () => { /* action */ }
})
```

**Utilisé dans** : Organisations, People, Mandats, Mailing Lists
**Composant associé** : `ConfirmDialog.tsx`
**Impact** : 6+ `window.confirm()` remplacés, UX cohérente

---

### 3. useExport
**Fichier** : `hooks/useExport.ts` | **Créé** : Chapitre 5

Exports CSV/Excel/PDF avec gestion erreurs.

```typescript
const { exportCSV, exportExcel, exportPDF, isExporting, error } = useExport()

await exportCSV('/api/v1/exports/organisations/csv', 'orgas.csv')
```

**Utilisé dans** : ExportButtons (185→111 lignes, -40%)
**Fix backend** : `filter_query_by_team()` gère dict/object User (Commit 70dfae70)

---

### 4. useSearchFocus
**Fichier** : `hooks/useSearchFocus.ts` | **Créé** : Chapitre 5

Effets de focus sur barres de recherche.

```typescript
const { isFocused, handleFocus, handleBlur } = useSearchFocus()

<input onFocus={handleFocus} onBlur={handleBlur} />
```

**Utilisé dans** : SearchBar global

---

## 💼 Hooks Métier (17 hooks)

### useAuth ⭐⭐⭐
**Fichier** : `hooks/useAuth.ts`

Authentification JWT et session utilisateur.

```typescript
const { user, login, logout, isAuthenticated, isLoading } = useAuth()
```

**Bug corrigé** : Toast succès lors d'erreur (Chapitre 2, Commit 08e7353b)

---

### useOrganisations
**Fichier** : `hooks/useOrganisations.ts`

CRUD organisations avec React Query.

```typescript
const { organisations, isLoading, createOrganisation, updateOrganisation, deleteOrganisation } = useOrganisations(filters)
```

**Features** : Cache, invalidation auto, filtres avancés, pagination

---

### usePeople
**Fichier** : `hooks/usePeople.ts`

CRUD contacts/personnes.

```typescript
const { people, total, isLoading, createPerson, updatePerson, deletePerson } = usePeople(filters)
```

**Améliorations (Chapitre 4)** : Pagination 50/page, tri multi-colonnes, slugs SEO

---

### useMailingLists
**Fichier** : `hooks/useMailingLists.ts`

Gestion listes de diffusion (Marketing Hub).

```typescript
const { lists, isLoading, createList, updateList, deleteList } = useMailingLists()
```

**Modifications (Chapitre 6)** : Ajout méthode `put()` dans apiClient, pages dédiées

---

### useTasks
**Fichier** : `hooks/useTasks.ts`

Gestion tâches et rappels.

```typescript
const { tasks, createTask, updateTask, deleteTask } = useTasks('today' | 'overdue' | 'all')
```

**Usage** : Création tâche prioritaire depuis tracking leads (score ≥70)

---

### useMandats
**Fichier** : `hooks/useMandats.ts`

CRUD mandats (contrats clients).

```typescript
const { mandats, isLoading, createMandat, updateMandat, deleteMandat } = useMandats(filters)
```

---

### useProduits
**Fichier** : `hooks/useProduits.ts`

Gestion produits/services.

```typescript
const { produits, isLoading, createProduit, updateProduit, deleteProduit } = useProduits()
```

---

### useUsers
**Fichier** : `hooks/useUsers.ts`

Gestion utilisateurs et équipes.

```typescript
const { users, isLoading, createUser, updateUser, deleteUser } = useUsers()
```

---

### useWorkflows ⭐
**Fichier** : `hooks/useWorkflows.ts`

Gestion workflows automatisés.

```typescript
const {
  workflows,
  isLoading,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow
} = useWorkflows()
```

**Features** :
- Triggers : organisation_created, deal_updated, etc.
- Actions : send_email, create_task, update_field
- Conditions : AND/OR avec opérateurs
- Variables dynamiques

---

### useWebhooks
**Fichier** : `hooks/useWebhooks.ts`

Configuration webhooks externes.

```typescript
const { webhooks, isLoading, createWebhook, updateWebhook, deleteWebhook } = useWebhooks()
```

---

### useNotifications
**Fichier** : `hooks/useNotifications.ts`

Notifications temps réel (WebSocket).

```typescript
const { notifications, isConnected, markAsRead, markAllAsRead } = useNotifications()
```

**Features** :
- WebSocket connection
- Auto-reconnect
- Notification list
- Read/unread status

---

### useOrganisationActivity
**Fichier** : `hooks/useOrganisationActivity.ts`

Activités et timeline organisation.

```typescript
const { activities, isLoading } = useOrganisationActivity(organisationId)
```

---

### useCampaignSubscriptions
**Fichier** : `hooks/useCampaignSubscriptions.ts`

Abonnements campagnes email (RGPD).

```typescript
const { subscriptions, subscribe, unsubscribe } = useCampaignSubscriptions(campaignId)
```

---

### useEmailAutomation
**Fichier** : `hooks/useEmailAutomation.ts`

Automatisations email marketing.

```typescript
const { automations, createAutomation, triggerAutomation } = useEmailAutomation()
```

---

### useEmailConfig
**Fichier** : `hooks/useEmailConfig.ts`

Configuration providers email (Resend, SendGrid, Mailgun).

```typescript
const { configs, activeConfig, createConfig, updateConfig, setActive } = useEmailConfig()
```

**Features** :
- Multi-provider support
- Encryption clés API
- Configuration active

---

### useImport
**Fichier** : `hooks/useImport.ts`

Imports massifs (CSV, Excel).

```typescript
const { importData, isImporting, progress, errors } = useImport()

await importData({
  file: file,
  entity: 'people' | 'organisations',
  mapping: { /* colonnes */ }
})
```

---

### usePaginatedOptions
**Fichier** : `hooks/usePaginatedOptions.ts`

Options paginées pour selects (organisations, contacts).

```typescript
const { options, hasMore, loadMore, isLoading } = usePaginatedOptions({
  endpoint: '/api/v1/organisations',
  searchTerm: search
})
```

**Usage** : Dropdowns avec lazy loading

---

### useSettingsData
**Fichier** : `hooks/useSettingsData.ts`

Paramètres application et préférences utilisateur.

```typescript
const { settings, updateSettings, isLoading } = useSettingsData()
```

---

### useAI ⭐
**Fichier** : `hooks/useAI.ts`

Agent IA (suggestions, statistiques).

```typescript
const { statistics, suggestions, isLoading } = useAI()
```

**Bug corrigé** : Double `/api/v1` prefix → 404 en prod (Chapitre 3, lignes 60-66)

---

## 🎨 Hooks UI/UX (6 hooks)

### useSidebar ⭐
**Fichier** : `hooks/useSidebar.ts` | **Créé** : Chapitre 6

Menu collapsible (Marketing Hub).

```typescript
const { isOpen, toggle, open, close } = useSidebar('marketing')
```

**Features** : Auto-ouverture si route active, localStorage persistence

---

### useMediaQuery
**Fichier** : `hooks/useMediaQuery.ts`

Détection breakpoints responsive.

```typescript
const isMobile = useMediaQuery('(max-width: 768px)')
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
const isDesktop = useMediaQuery('(min-width: 1025px)')
```

**Usage** : Composants responsive, affichage conditionnel

---

### useOnlineStatus
**Fichier** : `hooks/useOnlineStatus.ts`

Détection statut réseau (online/offline).

```typescript
const isOnline = useOnlineStatus()

{!isOnline && <Banner>Vous êtes hors ligne</Banner>}
```

**Features** :
- Événements navigator.onLine
- Auto-update
- PWA support

---

### useToast
**Fichier** : `hooks/useToast.ts`

Wrapper pour système de notifications toast.

```typescript
const { toast } = useToast()

toast.success('Sauvegardé !')
toast.error('Erreur')
toast.info('Info')
```

---

## 🛠️ Hooks Utilitaires (2 hooks)

### useDebounce
**Fichier** : `hooks/useDebounce.ts`

Debounce valeurs (recherche temps réel).

```typescript
const debouncedSearch = useDebounce(search, 500)
```

---

### useLocalStorage
**Fichier** : `hooks/useLocalStorage.ts`

Synchronisation état ↔ localStorage.

```typescript
const [theme, setTheme] = useLocalStorage('theme', 'light')
```

---

## 📊 Index Alphabétique (29 hooks)

| Hook | Type | Fichier | Utilité |
|------|------|---------|---------|
| useAI | Métier | useAI.ts | Agent IA statistiques/suggestions |
| useAuth | Métier ⭐⭐⭐ | useAuth.ts | Authentification JWT |
| useCampaignSubscriptions | Métier | useCampaignSubscriptions.ts | Abonnements RGPD |
| useConfirm | UI/UX ⭐ | useConfirm.tsx | Modals confirmation |
| useDebounce | Utilitaire | useDebounce.ts | Debounce valeurs |
| useEmailAutomation | Métier | useEmailAutomation.ts | Automatisations email |
| useEmailConfig | Métier | useEmailConfig.ts | Config providers email |
| useExport | UI/UX ⭐ | useExport.ts | Exports CSV/Excel/PDF |
| useImport | Métier | useImport.ts | Imports massifs |
| useLocalStorage | Utilitaire | - | Sync localStorage |
| useMailingLists | Métier | useMailingLists.ts | Listes diffusion |
| useMandats | Métier | useMandats.ts | CRUD mandats |
| useMediaQuery | UI/UX | useMediaQuery.ts | Breakpoints responsive |
| useNotifications | Métier | useNotifications.ts | WebSocket temps réel |
| useOnlineStatus | UI/UX | useOnlineStatus.ts | Détection réseau |
| useOrganisationActivity | Métier | useOrganisationActivity.ts | Timeline activités |
| useOrganisations | Métier | useOrganisations.ts | CRUD organisations |
| usePaginatedOptions | Métier | usePaginatedOptions.ts | Selects lazy loading |
| usePeople | Métier | usePeople.ts | CRUD contacts |
| useProduits | Métier | useProduits.ts | CRUD produits |
| useSearchFocus | UI/UX ⭐ | useSearchFocus.ts | Focus recherche |
| useSettingsData | Métier | useSettingsData.ts | Paramètres app |
| useSidebar | UI/UX ⭐ | useSidebar.ts | Menu collapsible |
| useTableColumns | UI/UX ⭐ | useTableColumns.ts | Colonnes modifiables |
| useTasks | Métier | useTasks.ts | CRUD tâches |
| useToast | UI/UX | useToast.ts | Notifications toast |
| useUsers | Métier | useUsers.ts | CRUD utilisateurs |
| useWebhooks | Métier | useWebhooks.ts | Config webhooks |
| useWorkflows | Métier ⭐ | useWorkflows.ts | Automatisations |

---

## 🎯 Bonnes Pratiques

### Nomenclature
- ✅ Préfixe `use` obligatoire
- ✅ Nom descriptif (`useConfirm` > `useModal`)

### Retour de Valeur
- **Objet** si > 2 valeurs : `{ data, isLoading, error }`
- **Tableau** si ≤ 2 valeurs : `[value, setValue]`

### localStorage
- Toujours préfixer : `[module]-[feature]`
- Exemple : `'organisations-columns'`, `'people-columns'`

### TypeScript
- Typer paramètres et retours
- Interfaces pour objets complexes

---

## 📈 Statistiques

### Par Catégorie
| Catégorie | Nombre | % |
|-----------|--------|---|
| Métier | 17 | 59% |
| UI/UX | 6 | 21% |
| Utilitaires | 2 | 7% |
| Réutilisables ⭐ | 4 | 14% |

### Impact Projet
| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Hooks totaux | - | 29 | ✅ |
| Lignes ExportButtons | 185 | 111 | -40% |
| Duplications confirm() | 6+ | 0 | ✅ |
| Cohérence UX | ❌ | ✅ | ⭐ |

---

## 🔗 Ressources

- [Chapitre 5 - Organisations](../../checklists/05-organisations.md)
- [Architecture Frontend](./ARCHITECTURE.md)
- [Composants Partagés](./COMPONENTS.md)
