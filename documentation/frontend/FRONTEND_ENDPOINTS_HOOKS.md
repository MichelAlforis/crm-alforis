# 📚 Documentation Frontend - Endpoints & Hooks

**Date**: 20 Octobre 2024
**Version**: 2.0 (Architecture unifiée)

---

## 🔌 Endpoints API Utilisés

Liste complète des 66 méthodes `apiClient.*` utilisées dans le frontend:

### Authentification (4)
- `apiClient.login(credentials)` - Connexion utilisateur
- `apiClient.logout()` - Déconnexion
- `apiClient.getCurrentUser()` - Récupérer utilisateur courant
- `apiClient.clearToken()` - Nettoyer token stocké

### Token Management (3)
- `apiClient.getToken()` - Récupérer token depuis localStorage
- `apiClient.setToken(token)` - Stocker token dans localStorage
- `apiClient.getBaseUrl()` - Récupérer URL de base de l'API

### Organisations (9)
- `apiClient.getOrganisations(params)` - Liste paginée avec filtres
- `apiClient.getOrganisation(id)` - Détail organisation
- `apiClient.searchOrganisations(query, skip, limit)` - Recherche par nom
- `apiClient.getOrganisationsByLanguage(lang, skip, limit)` - Filtrer par langue
- `apiClient.getOrganisationsStats()` - Statistiques globales
- `apiClient.createOrganisation(data)` - Créer organisation
- `apiClient.updateOrganisation(id, data)` - Mettre à jour
- `apiClient.deleteOrganisation(id)` - Supprimer
- `apiClient.getOrganisationActivity(id, cursor, limit)` - Timeline activités

### Activités Widget (1)
- `apiClient.getActivityWidget(limit)` - Activités récentes pour dashboard

### Personnes (7)
- `apiClient.getPeople(params)` - Liste paginée avec filtres
- `apiClient.getPerson(id)` - Détail personne
- `apiClient.createPerson(data)` - Créer personne
- `apiClient.updatePerson(id, data)` - Mettre à jour
- `apiClient.deletePerson(id)` - Supprimer
- `apiClient.createPersonOrganizationLink(data)` - Lier personne à organisation
- `apiClient.updatePersonOrganizationLink(id, data)` - Mettre à jour lien
- `apiClient.deletePersonOrganizationLink(id)` - Supprimer lien

### Mandats (7)
- `apiClient.getMandats(params)` - Liste paginée avec filtres
- `apiClient.getMandat(id)` - Détail mandat
- `apiClient.getMandatsByOrganisation(org_id)` - Mandats d'une organisation
- `apiClient.getActiveMandats()` - Mandats actifs uniquement
- `apiClient.checkMandatActif(id)` - Vérifier si mandat actif/signé
- `apiClient.createMandat(data)` - Créer mandat
- `apiClient.updateMandat(id, data)` - Mettre à jour
- `apiClient.deleteMandat(id)` - Supprimer

### Produits (9)
- `apiClient.getProduits(params)` - Liste paginée avec filtres
- `apiClient.getProduit(id)` - Détail produit
- `apiClient.searchProduits(query, skip, limit)` - Recherche par nom/ISIN
- `apiClient.getProduitByIsin(isin)` - Récupérer par code ISIN
- `apiClient.getProduitsByMandat(mandat_id)` - Produits d'un mandat
- `apiClient.createProduit(data)` - Créer produit
- `apiClient.updateProduit(id, data)` - Mettre à jour
- `apiClient.deleteProduit(id)` - Supprimer
- `apiClient.associateProduitToMandat(data)` - Associer produit à mandat avec %
- `apiClient.deleteMandatProduitAssociation(assoc_id)` - Retirer association

### Tâches (6)
- `apiClient.getTasks(params)` - Liste paginée avec filtres
- `apiClient.getTask(id)` - Détail tâche
- `apiClient.getTaskStats()` - Statistiques tâches (today, week, overdue)
- `apiClient.createTask(data)` - Créer tâche
- `apiClient.updateTask(id, data)` - Mettre à jour
- `apiClient.deleteTask(id)` - Supprimer
- `apiClient.quickActionTask(id, action)` - Actions rapides (complete, snooze)
- `apiClient.snoozeTask(id, until)` - Reporter tâche

### Email Templates (2)
- `apiClient.getEmailTemplates(params)` - Liste templates
- `apiClient.createEmailTemplate(data)` - Créer template
- `apiClient.updateEmailTemplate(id, data)` - Mettre à jour template

### Email Campaigns (5)
- `apiClient.getEmailCampaigns(filters)` - Liste campagnes
- `apiClient.getEmailCampaign(id)` - Détail campagne
- `apiClient.getEmailCampaignStats(id)` - Stats (opens, clicks, bounces)
- `apiClient.getEmailCampaignSends(id, filters)` - Historique envois
- `apiClient.createEmailCampaign(data)` - Créer campagne
- `apiClient.updateEmailCampaign(id, data)` - Mettre à jour
- `apiClient.scheduleEmailCampaign(id, data)` - Programmer envoi

### Webhooks (6)
- `apiClient.getWebhooks(params)` - Liste webhooks
- `apiClient.getWebhook(id)` - Détail webhook
- `apiClient.getWebhookEvents()` - Liste événements disponibles
- `apiClient.createWebhook(data)` - Créer webhook
- `apiClient.updateWebhook(id, data)` - Mettre à jour
- `apiClient.deleteWebhook(id)` - Supprimer
- `apiClient.rotateWebhookSecret(id, data)` - Régénérer secret

### Workflows (utilisés via fetch direct, pas apiClient)
Les workflows utilisent l'ancien pattern avec fetch direct dans `useWorkflows.ts`:
- `GET /workflows` - Liste workflows
- `GET /workflows/{id}` - Détail workflow
- `POST /workflows` - Créer workflow
- `PUT /workflows/{id}` - Mettre à jour
- `DELETE /workflows/{id}` - Supprimer
- `POST /workflows/{id}/toggle` - Activer/désactiver
- `POST /workflows/{id}/execute` - Exécuter manuellement
- `GET /workflows/{id}/executions` - Historique exécutions
- `GET /workflows/{id}/stats` - Statistiques
- `GET /workflows/templates` - Templates disponibles

**Total: 66 endpoints apiClient + 10 endpoints workflows = 76 endpoints utilisés**

---

## 🪝 Hooks React Utilisés

### 1. **useAuth.ts** - Authentification
**Exports**:
- `useAuth()` → `{ user, isLoading, isAuthenticated, login, logout }`

**Endpoints utilisés**:
- `apiClient.login()`
- `apiClient.logout()`
- `apiClient.getCurrentUser()`

**Usage**: Layout, pages protégées

---

### 2. **useOrganisations.ts** - Gestion Organisations
**Exports** (8 hooks):
- `useOrganisations(params)` - Liste paginée
- `useOrganisation(id)` - Détail
- `useSearchOrganisations(query, options)` - Recherche
- `useOrganisationsByLanguage(lang, options)` - Filtrer par langue
- `useOrganisationStats()` - Statistiques
- `useCreateOrganisation()` - Mutation création
- `useUpdateOrganisation()` - Mutation mise à jour
- `useDeleteOrganisation()` - Mutation suppression

**Endpoints utilisés**:
- `apiClient.getOrganisations()`
- `apiClient.getOrganisation()`
- `apiClient.searchOrganisations()`
- `apiClient.getOrganisationsByLanguage()`
- `apiClient.getOrganisationsStats()`
- `apiClient.createOrganisation()`
- `apiClient.updateOrganisation()`
- `apiClient.deleteOrganisation()`

**Usage**: Pages organisations, dashboard, formulaires

---

### 3. **useOrganisationActivity.ts** - Timeline Activités
**Exports**:
- `useOrganisationActivity(organisationId, limit)` → `{ activities, hasMore, loadMore, isLoading, error, refetch }`

**Endpoints utilisés**:
- `apiClient.getOrganisationActivity()`

**Usage**: Page détail organisation, timeline

---

### 4. **usePeople.ts** - Gestion Personnes
**Exports** (7 hooks):
- `usePeople(params)` - Liste paginée
- `usePerson(id)` - Détail
- `useCreatePerson()` - Mutation création
- `useUpdatePerson()` - Mutation mise à jour
- `useDeletePerson()` - Mutation suppression
- `useCreatePersonOrganizationLink()` - Mutation lier à organisation
- `useUpdatePersonOrganizationLink()` - Mutation mettre à jour lien
- `useDeletePersonOrganizationLink()` - Mutation supprimer lien

**Endpoints utilisés**:
- `apiClient.getPeople()`
- `apiClient.getPerson()`
- `apiClient.createPerson()`
- `apiClient.updatePerson()`
- `apiClient.deletePerson()`
- `apiClient.createPersonOrganizationLink()`
- `apiClient.updatePersonOrganizationLink()`
- `apiClient.deletePersonOrganizationLink()`

**Usage**: Pages people, liens organisation-personne

---

### 5. **useMandats.ts** - Gestion Mandats
**Exports** (8 hooks):
- `useMandats(params)` - Liste paginée
- `useMandat(id)` - Détail
- `useActiveMandats()` - Mandats actifs
- `useMandatsByOrganisation(org_id)` - Mandats d'une organisation
- `useCheckMandatActif(id)` - Vérifier statut
- `useCreateMandat()` - Mutation création
- `useUpdateMandat()` - Mutation mise à jour
- `useDeleteMandat()` - Mutation suppression

**Endpoints utilisés**:
- `apiClient.getMandats()`
- `apiClient.getMandat()`
- `apiClient.getActiveMandats()`
- `apiClient.getMandatsByOrganisation()`
- `apiClient.checkMandatActif()`
- `apiClient.createMandat()`
- `apiClient.updateMandat()`
- `apiClient.deleteMandat()`

**Usage**: Pages mandats, formulaires, associations

---

### 6. **useProduits.ts** - Gestion Produits
**Exports** (10 hooks):
- `useProduits(params)` - Liste paginée
- `useProduit(id)` - Détail
- `useSearchProduits(query, options)` - Recherche
- `useProduitByIsin(isin)` - Recherche par ISIN
- `useProduitsByMandat(mandat_id)` - Produits d'un mandat
- `useCreateProduit()` - Mutation création
- `useUpdateProduit()` - Mutation mise à jour
- `useDeleteProduit()` - Mutation suppression
- `useAssociateProduitToMandat()` - Mutation associer à mandat
- `useDeleteMandatProduitAssociation()` - Mutation retirer association

**Endpoints utilisés**:
- `apiClient.getProduits()`
- `apiClient.getProduit()`
- `apiClient.searchProduits()`
- `apiClient.getProduitByIsin()`
- `apiClient.getProduitsByMandat()`
- `apiClient.createProduit()`
- `apiClient.updateProduit()`
- `apiClient.deleteProduit()`
- `apiClient.associateProduitToMandat()`
- `apiClient.deleteMandatProduitAssociation()`

**Usage**: Pages produits, association mandat-produit, SearchableSelect

---

### 7. **useTasks.ts** - Gestion Tâches
**Exports**:
- `useTasks(filters)` → `{ tasks, isLoading, error, refetch, createTask, updateTask, deleteTask, quickAction }`
- `useTaskViews()` → `{ todayCount, weekCount, overdueCount }`

**Endpoints utilisés**:
- `apiClient.getTasks()`
- `apiClient.getTask()`
- `apiClient.getTaskStats()`
- `apiClient.createTask()`
- `apiClient.updateTask()`
- `apiClient.deleteTask()`
- `apiClient.quickActionTask()`
- `apiClient.snoozeTask()`

**Usage**: Page tâches, kanban, sidebar (badge), formulaires

---

### 8. **useEmailAutomation.ts** - Email Templates & Campaigns
**Exports**:
- `useEmailTemplates(options)` → `{ templates, isLoading, createTemplate, updateTemplate }`
- `useEmailCampaigns(filters)` → `{ campaigns, pagination, isLoading, createCampaign, updateCampaign, scheduleCampaign }`
- `useEmailCampaign(id)` - Détail campagne
- `useEmailCampaignStats(id)` - Statistiques
- `useEmailCampaignSends(id, filters)` - Historique envois

**Endpoints utilisés**:
- `apiClient.getEmailTemplates()`
- `apiClient.createEmailTemplate()`
- `apiClient.updateEmailTemplate()`
- `apiClient.getEmailCampaigns()`
- `apiClient.getEmailCampaign()`
- `apiClient.getEmailCampaignStats()`
- `apiClient.getEmailCampaignSends()`
- `apiClient.createEmailCampaign()`
- `apiClient.updateEmailCampaign()`
- `apiClient.scheduleEmailCampaign()`

**Usage**: Pages campaigns, email builder

---

### 9. **useWebhooks.ts** - Gestion Webhooks
**Exports** (6 hooks):
- `useWebhooks(params)` - Liste webhooks
- `useWebhook(id)` - Détail
- `useWebhookEvents()` - Événements disponibles
- `useCreateWebhook()` - Mutation création
- `useUpdateWebhook()` - Mutation mise à jour
- `useDeleteWebhook()` - Mutation suppression
- `useRotateWebhookSecret()` - Mutation régénérer secret

**Endpoints utilisés**:
- `apiClient.getWebhooks()`
- `apiClient.getWebhook()`
- `apiClient.getWebhookEvents()`
- `apiClient.createWebhook()`
- `apiClient.updateWebhook()`
- `apiClient.deleteWebhook()`
- `apiClient.rotateWebhookSecret()`

**Usage**: Page settings/webhooks

---

### 10. **useWorkflows.ts** - Automatisations (Pattern Legacy)
**Exports**:
- `useWorkflows()` → `{ workflows, singleWorkflow, executions, stats, templates, operation, fetchWorkflows, fetchWorkflow, createWorkflow, updateWorkflow, deleteWorkflow, toggleWorkflow, executeWorkflow, fetchExecutions, fetchStats, fetchTemplates }`

**Endpoints utilisés** (via fetch direct):
- `GET /workflows`
- `GET /workflows/{id}`
- `POST /workflows`
- `PUT /workflows/{id}`
- `DELETE /workflows/{id}`
- `POST /workflows/{id}/toggle`
- `POST /workflows/{id}/execute`
- `GET /workflows/{id}/executions`
- `GET /workflows/{id}/stats`
- `GET /workflows/templates`

**Usage**: Pages workflows, automatisations

---

### 11. **useNotifications.ts** - Notifications Utilisateur
**Exports**:
- `useNotifications()` → `{ notifications, unreadCount, markAsRead, markAllAsRead }`

**Endpoints utilisés**: Mock data (pas d'endpoint backend pour l'instant)

**Usage**: Bell icon dans navbar

---

### 12. **useSettingsData.ts** - Données Settings
**Exports**:
- `useBillingSummary()` - Facturation
- `useTeamOverview()` - Équipe
- `useSecurityEvents()` - Événements sécurité
- `useIntegrationsConfig()` - Intégrations

**Endpoints utilisés**: Mock data (pas d'endpoints backend)

**Usage**: Page settings

---

### 13. **useDebounce.ts** - Utilitaire Debouncing
**Exports**:
- `useDebounce(value, delay)` → Valeur debouncée

**Usage**: SearchBar, filtres, inputs avec recherche

---

### 14. **useToast.ts** - Notifications Toast
**Exports**:
- `useToast()` → `{ showToast }`

**Usage**: Toutes les mutations pour feedback utilisateur

---

### 15. **usePaginatedOptions.ts** - Options Paginées pour Select
**Exports**:
- `usePaginatedOptions(fetcher, params)` → `{ options, loadMore, hasMore, isLoading }`

**Usage**: SearchableSelect pour grandes listes (produits, organisations)

---

## 📊 Résumé Statistiques

### Hooks
- **Total**: 15 fichiers de hooks
- **Exports**: ~70 hooks individuels
- **Pattern**: React Query pour tous sauf workflows (legacy fetch)

### Endpoints
- **Total**: 76 endpoints API utilisés
- **apiClient**: 66 méthodes
- **Fetch direct**: 10 (workflows uniquement)

### Couverture API
- ✅ **Organisations**: 100% (9/9 endpoints)
- ✅ **People**: 100% (7/7 endpoints)
- ✅ **Mandats**: 100% (7/7 endpoints)
- ✅ **Produits**: 100% (9/9 endpoints)
- ✅ **Tâches**: 100% (8/8 endpoints)
- ✅ **Email**: 100% (7/7 templates + campaigns)
- ✅ **Webhooks**: 100% (6/6 endpoints)
- ✅ **Workflows**: 100% (10/10 endpoints)
- ✅ **Auth**: 100% (3/3 endpoints)

---

## 🔄 Migration Investor/Fournisseur → Organisation

### État de la Migration

**Backend**: ✅ Complet (100%)
- Tables `investor` et `fournisseur` supprimées
- Table `organisation` unifiée avec champ `type`
- Tous les endpoints migrés

**Frontend**: ✅ Complet (100%)
- Aucun fichier `InvestorForm.tsx` ou `FournisseurForm.tsx` trouvé
- Tous les formulaires utilisent `OrganisationForm.tsx`
- Types TypeScript nettoyés (sauf legacy dans types.ts)

### Legacy Code Restant (à nettoyer)

#### 1. **lib/types.ts** - Types Legacy
```typescript
// À SUPPRIMER:
export type OrganizationType = "investor" | "fournisseur"  // L31

// Task interfaces avec champs legacy:
interface Task {
  investor_id?: number      // L165, 218
  fournisseur_id?: number   // L219
}

interface TaskWithRelations {
  investor_name?: string    // L235
  fournisseur_name?: string // L236
}

interface TaskFilters {
  investor_id?: number      // L247
  fournisseur_id?: number   // L248
}

interface TaskCreate {
  investor_id?: number      // L260
  fournisseur_id?: number   // L261
}

interface TaskUpdate {
  investor_id?: number      // L279
  fournisseur_id?: number   // L280
}
```

**Action**: Remplacer tous ces champs par `organisation_id`

#### 2. **Commentaires dans Sidebar.tsx**
```typescript
// L38: "- Organisations (remplace Investisseurs + Fournisseurs)"
// L54: "description: 'Clients, fournisseurs, distributeurs...'"
// L108: "- Fournisseurs → Organisations (type=fournisseur)"
```

**Action**: Ces commentaires sont OK, ils documentent la migration

#### 3. **Autres fichiers avec mentions legacy**
- `app/dashboard/campaigns/[id]/page.tsx:121` - Label "Fournisseur" pour provider
- Divers commentaires historiques dans forms, search, etc.

**Action**: Nettoyage cosmétique, pas bloquant

---

## ✅ Actions de Cleanup Recommandées

### Priorité 1 - Types TypeScript
```bash
# Fichier: crm-frontend/lib/types.ts
# Remplacer tous les champs:
investor_id → organisation_id
fournisseur_id → organisation_id
investor_name → organisation_name
fournisseur_name → organisation_name

# Supprimer le type:
export type OrganizationType = "investor" | "fournisseur"
```

### Priorité 2 - Vérifier Usages
```bash
# Rechercher tous les usages restants:
grep -r "investor_id\|fournisseur_id" crm-frontend/
grep -r "investor_name\|fournisseur_name" crm-frontend/
grep -r "OrganizationType" crm-frontend/
```

### Priorité 3 - Tests
```bash
# Tester après cleanup:
npm run type-check  # Doit passer à 0 erreurs
npm run build       # Doit compiler sans erreur
```

---

## 📦 Backup Créé

**Fichier**: `frontend_backup_YYYYMMDD_HHMMSS.tar.gz`

**Contenu**:
- Tout le dossier `crm-frontend/`
- Exclu: `node_modules/`, `.next/`

**Restauration**:
```bash
tar -xzf frontend_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

**Dernière mise à jour**: 20 Octobre 2024
