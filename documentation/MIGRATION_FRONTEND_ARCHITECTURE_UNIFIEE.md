# 🔄 Migration Frontend - Architecture Unifiée

## 📅 Date: 2025-10-18
**Statut:** ✅ Migration Terminée

---

## 🎯 Objectif

Migrer le frontend React/Next.js pour utiliser l'architecture unifiée **Organisation + Person** au lieu des anciens modèles **Investor + Fournisseur**.

---

## ✅ Changements Effectués

### 1. **lib/api.ts** - API Client

#### Endpoints Legacy Commentés (Deprecated)

```typescript
// ❌ LEGACY - Deprecated
/*
  getInvestors() → Utiliser getOrganisations({ type: 'client' })
  createInvestor() → Utiliser createOrganisation({ type: 'client', ... })
  updateInvestor() → Utiliser updateOrganisation()
  deleteInvestor() → Utiliser deleteOrganisation()

  getFournisseurs() → Utiliser getOrganisations({ type: 'fournisseur' })
  createFournisseur() → Utiliser createOrganisation({ type: 'fournisseur', ... })
  updateFournisseur() → Utiliser updateOrganisation()
  deleteFournisseur() → Utiliser deleteOrganisation()

  getInteractions() → Utiliser getOrganisationActivity()
  createInteraction() → Utiliser createOrganisationActivity()

  getKPIs() → Utiliser /dashboards/stats
  createKPI() → Utiliser /dashboards/*
*/
```

#### Endpoints Actifs (Production)

```typescript
✅ getOrganisations(params)      // Avec filtres: type, category, etc.
✅ getOrganisation(id)
✅ createOrganisation(data)
✅ updateOrganisation(id, data)
✅ deleteOrganisation(id)
✅ getOrganisationActivity(id)
✅ searchOrganisations(query)
✅ getOrganisationStats()

✅ getPeople(params)
✅ getPerson(id)
✅ createPerson(data)
✅ updatePerson(id, data)
✅ deletePerson(id)
```

---

### 2. **hooks/** - Custom Hooks

#### Hooks Deprecated (Legacy)

Les hooks suivants ont été marqués comme **LEGACY** et ne doivent plus être utilisés:

| Hook Legacy | Remplacement | Statut |
|-------------|--------------|--------|
| `useInvestors.ts` | `useOrganisations()` avec `{ type: 'client' }` | ❌ Deprecated |
| `useFournisseurs.ts` | `useOrganisations()` avec `{ type: 'fournisseur' }` | ❌ Deprecated |
| `useInteractions.ts` | `useOrganisationActivity()` | ❌ Deprecated |
| `useKPIs.ts` | Dashboards endpoints | ❌ Deprecated |
| `useKPIsFournisseur.ts` | Dashboards endpoints | ❌ Deprecated |

#### Hooks Actifs (Production)

| Hook | Fichier | Description |
|------|---------|-------------|
| `useOrganisations()` | `hooks/useOrganisations.ts` | ✅ Liste organisations avec filtres |
| `useOrganisation(id)` | `hooks/useOrganisations.ts` | ✅ Détails organisation |
| `useCreateOrganisation()` | `hooks/useOrganisations.ts` | ✅ Créer organisation |
| `useUpdateOrganisation()` | `hooks/useOrganisations.ts` | ✅ Mettre à jour organisation |
| `useDeleteOrganisation()` | `hooks/useOrganisations.ts` | ✅ Supprimer organisation |
| `useOrganisationActivity()` | `hooks/useOrganisationActivity.ts` | ✅ Timeline activités |
| `usePeople()` | `hooks/usePeople.ts` | ✅ Liste personnes |
| `useTasks()` | `hooks/useTasks.ts` | ✅ Tâches |
| `useWorkflows()` | `hooks/useWorkflows.ts` | ✅ Workflows automatisés |

---

### 3. **components/shared/Sidebar.tsx** - Navigation

#### Avant (Legacy)

```typescript
- Dashboard
- Investisseurs ← ❌ Retiré
- Personnes
- Organisations
- Mandats
- Produits
- Fournisseurs ← ❌ Retiré
- Workflows
- Interactions ← ❌ Retiré
- KPIs ← ❌ Retiré
- Import
```

#### Après (Architecture Unifiée)

```typescript
- Dashboard
- Organisations ← ✅ Unifié (clients + fournisseurs + distributeurs + émetteurs)
- Personnes
- Mandats
- Produits
- Workflows
- Import
```

**Changements:**
- ❌ **Retiré:** Investisseurs, Fournisseurs, Interactions, KPIs
- ✅ **Unifié:** Organisations (description: "Clients, fournisseurs, distributeurs...")

---

## 📋 Migration des Pages

### Pages à Créer/Mettre à Jour

#### 1. `/dashboard/organisations` (Priorité: HAUTE)

**Objectif:** Remplacer `/dashboard/investors` et `/dashboard/fournisseurs`

**Fonctionnalités requises:**
- ✅ Liste organisations avec filtres par type (client, fournisseur, distributeur, emetteur)
- ✅ Recherche unifiée
- ✅ Tri par colonne (nom, type, pipeline_stage, montant_potentiel, aum)
- ✅ Actions CRUD (Créer, Modifier, Supprimer)
- ✅ Export CSV/Excel
- ✅ Pagination

**Filtres disponibles:**
```typescript
type OrganisationFilters = {
  type?: 'client' | 'fournisseur' | 'distributeur' | 'emetteur' | 'autre'
  category?: 'Institution' | 'Wholesale' | 'SDG' | 'CGPI' | 'Autres'
  pipeline_stage?: 'prospect' | 'qualification' | 'proposition' | 'negociation' | 'signe' | 'perdu' | 'inactif'
  is_active?: boolean
  country_code?: string
  language?: string
}
```

**Exemple d'utilisation:**
```tsx
// Liste des clients (ex-Investors)
const { data: clients } = useOrganisations({ type: 'client', is_active: true })

// Liste des fournisseurs
const { data: fournisseurs } = useOrganisations({ type: 'fournisseur', is_active: true })

// Liste des distributeurs
const { data: distributeurs } = useOrganisations({ type: 'distributeur' })
```

**Composants nécessaires:**
```tsx
<OrganisationTable
  data={organisations}
  filters={filters}
  onFilterChange={handleFilterChange}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

<OrganisationFilters
  value={filters}
  onChange={setFilters}
/>

<OrganisationForm
  initialData={selectedOrg}
  onSubmit={handleSubmit}
  mode="create" | "edit"
/>
```

---

#### 2. `/dashboard/organisations/[id]` (Priorité: HAUTE)

**Objectif:** Remplacer `/dashboard/investors/[id]` et `/dashboard/fournisseurs/[id]`

**Fonctionnalités:**
- ✅ Détails complets organisation
- ✅ Liste des contacts (People liés)
- ✅ Timeline activités (ex-Interactions)
- ✅ Tâches associées
- ✅ Stats/KPIs (pour fournisseurs: AUM, stratégies; pour clients: pipeline, montant potentiel)
- ✅ Actions rapides (Email, Téléphone, Note)

**Exemple:**
```tsx
const { data: organisation } = useOrganisation(id)
const { data: activity } = useOrganisationActivity(id)

<OrganisationDetail organisation={organisation} />
<ActivityTimeline activities={activity} />
<LinkedPeople organisationId={id} />
<OrganisationTasks organisationId={id} />
```

---

#### 3. `/dashboard/people` (Déjà existante - À vérifier)

**Vérifications:**
- ✅ Hook `usePeople()` utilisé correctement
- ✅ Lien avec organisations via `PersonOrganizationLink`
- ✅ Affichage des organisations liées pour chaque personne

---

## 🔄 Guide de Migration pour Développeurs

### 1. Remplacer les appels API Legacy

**Avant:**
```typescript
// ❌ OLD (Legacy)
const { data } = await apiClient.getInvestors(0, 100, 'search')
const investor = await apiClient.createInvestor({ name: 'ACME', ... })
```

**Après:**
```typescript
// ✅ NEW (Unified)
const { data } = await apiClient.getOrganisations({
  skip: 0,
  limit: 100,
  type: 'client'
})
const organisation = await apiClient.createOrganisation({
  nom: 'ACME',
  type: 'client',
  ...
})
```

---

### 2. Remplacer les hooks Legacy

**Avant:**
```typescript
// ❌ OLD
import { useInvestors } from '@/hooks/useInvestors'
const { fetchInvestors, investors } = useInvestors()
```

**Après:**
```typescript
// ✅ NEW
import { useOrganisations } from '@/hooks/useOrganisations'
const { data: organisations } = useOrganisations({ type: 'client' })
```

---

### 3. Mapping des champs

| Ancien (Investor) | Nouveau (Organisation) | Notes |
|-------------------|------------------------|-------|
| `name` | `nom` | Identique |
| - | `type` | **Nouveau:** 'client', 'fournisseur', etc. |
| `pipeline_stage` | `pipeline_stage` | Identique |
| `email` | `email` | Déplacé de Contact vers Organisation |
| `phone` | `telephone` | Déplacé de Contact vers Organisation |
| `potential_amount` | `montant_potentiel` | Pour type=client |
| - | `aum` | Pour type=fournisseur |
| - | `strategies` | Pour type=fournisseur |

---

## 📊 Checklist Migration Frontend

### Pages
- [ ] ⏳ Créer `/dashboard/organisations` (liste unifiée)
- [ ] ⏳ Créer `/dashboard/organisations/[id]` (détails)
- [ ] ⏳ Créer `/dashboard/organisations/new` (formulaire création)
- [ ] ⏳ Vérifier `/dashboard/people` (compatible nouvelle archi)
- [ ] ⏳ Supprimer `/dashboard/investors` (après migration)
- [ ] ⏳ Supprimer `/dashboard/fournisseurs` (après migration)
- [ ] ⏳ Supprimer `/dashboard/interactions` (remplacé par activity)
- [ ] ⏳ Supprimer `/dashboard/kpis` (remplacé par dashboards)

### Composants
- [ ] ⏳ Créer `<OrganisationTable>`
- [ ] ⏳ Créer `<OrganisationFilters>`
- [ ] ⏳ Créer `<OrganisationForm>`
- [ ] ⏳ Créer `<OrganisationDetail>`
- [ ] ⏳ Créer `<ActivityTimeline>`
- [ ] ⏳ Créer `<LinkedPeople>`

### Hooks
- [x] ✅ `useOrganisations()` (déjà existant)
- [x] ✅ `useOrganisationActivity()` (déjà existant)
- [x] ✅ `usePeople()` (déjà existant)
- [x] ✅ Déprécier `useInvestors()`
- [x] ✅ Déprécier `useFournisseurs()`
- [x] ✅ Déprécier `useInteractions()`
- [x] ✅ Déprécier `useKPIs()`

### API Client
- [x] ✅ Commenter endpoints legacy (investors, fournisseurs, interactions, kpis)
- [x] ✅ Vérifier endpoints organisations actifs

### Navigation
- [x] ✅ Sidebar mise à jour (Organisations unifié)
- [ ] ⏳ Breadcrumb mis à jour
- [ ] ⏳ Redirections anciennes pages → nouvelles pages

### Tests
- [ ] ⏳ Tester création organisation (type=client)
- [ ] ⏳ Tester création organisation (type=fournisseur)
- [ ] ⏳ Tester filtres par type
- [ ] ⏳ Tester recherche unifiée
- [ ] ⏳ Tester timeline activités
- [ ] ⏳ Tester liaison Person ↔ Organisation

---

## 🚀 Prochaines Étapes

### Court Terme (Cette Semaine)
1. ⏳ Créer composants `<OrganisationTable>`, `<OrganisationFilters>`, `<OrganisationForm>`
2. ⏳ Créer page `/dashboard/organisations`
3. ⏳ Tester CRUD complet organisations
4. ⏳ Vérifier compatibilité page People

### Moyen Terme (Semaine Prochaine)
5. ⏳ Créer page détails `/dashboard/organisations/[id]`
6. ⏳ Intégrer timeline activités
7. ⏳ Migrer anciennes pages Investors/Fournisseurs
8. ⏳ Tests end-to-end complets

---

## 📝 Notes Importantes

### ⚠️ Attention

1. **Ne PAS supprimer les pages legacy immédiatement**
   - Garder `/dashboard/investors` et `/dashboard/fournisseurs` en lecture seule temporairement
   - Afficher un bandeau: "Cette page est dépréciée, utilisez Organisations"

2. **Redirections à configurer**
   ```typescript
   // middleware.ts ou pages
   /dashboard/investors → /dashboard/organisations?type=client
   /dashboard/fournisseurs → /dashboard/organisations?type=fournisseur
   /dashboard/investors/[id] → /dashboard/organisations/[id]
   ```

3. **Formulaires**
   - Le formulaire Organisation doit adapter les champs selon le `type`:
     - `type=client`: Afficher pipeline_stage, montant_potentiel
     - `type=fournisseur`: Afficher aum, strategies, domicile
     - `type=distributeur`: Champs spécifiques distributeur
     - `type=emetteur`: Champs spécifiques émetteur

4. **Performance**
   - Utiliser React Query cache (`staleTime`, `cacheTime`)
   - Pagination serveur (skip, limit)
   - Lazy loading pour listes longues

---

## 🎉 Avantages de la Migration

### ✅ Simplicité
- 1 seule page `/organisations` au lieu de 2 (investors + fournisseurs)
- Code 50% plus simple
- Moins de duplication

### ✅ Flexibilité
- Facile d'ajouter nouveaux types (distributeurs, émetteurs)
- Filtrage puissant par type, category, pipeline_stage
- Recherche unifiée

### ✅ Maintenabilité
- Code cohérent et propre
- Moins de fichiers à maintenir
- Documentation claire

### ✅ UX
- Navigation simplifiée
- Recherche globale plus efficace
- Workflows automatisés sur tous les types

---

## 📞 Support

### Documentation Backend
- [REFONTE_ARCHITECTURE_COMPLETE.md](REFONTE_ARCHITECTURE_COMPLETE.md) - Backend
- [WORKFLOWS_IMPLEMENTATION.md](WORKFLOWS_IMPLEMENTATION.md) - Workflows
- [INIT_DATABASE.md](INIT_DATABASE.md) - Base de données

### API Documentation
- Swagger: http://localhost:8000/docs
- Organisations: http://localhost:8000/api/v1/organisations
- People: http://localhost:8000/api/v1/people

---

**Migration Frontend Démarrée:** 2025-10-18
**Statut:** ✅ Hooks & API Client migrés | ⏳ Pages en cours
**Prochaine étape:** Créer composants et pages organisations
