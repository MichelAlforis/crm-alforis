# 🚀 Plan d'Action Frontend - CRM Alforis

**Date**: 20 Octobre 2024
**Statut Actuel**: Frontend ~85% complet (vs 60% estimé initialement)

---

## 📊 Constat après Analyse Complète

### ✅ Déjà Implémenté et Production-Ready

#### 1. **Formulaires** - 100% ✅
- [x] OrganisationForm.tsx (174 lignes) - Complet avec validation
- [x] MandatForm.tsx (166 lignes) - Complet avec info badges
- [x] ProduitForm.tsx (164 lignes) - Complet avec validation ISIN
- [x] PersonForm.tsx (154 lignes) - Complet avec geo selects
- [x] TaskForm.tsx (468 lignes) - Ultra-complet avec SearchableSelect

#### 2. **Hooks API** - 100% ✅
- [x] useOrganisations (142 lignes) - 8 hooks dont search et by-language
- [x] useMandats (154 lignes) - 8 hooks dont check-actif
- [x] useProduits (179 lignes) - **10 hooks avec association mandat-produit**
- [x] useTasks - Complet
- [x] usePeople - Complet

#### 3. **API Client** - 100% ✅
- [x] lib/api.ts (866 lignes) - Singleton avec 78 endpoints
- [x] Auth + token management (localStorage + cookies)
- [x] Organisation + Mandat + Produit + Task + Email + Webhooks endpoints
- [x] **Associate/Delete mandat-produit methods ✅**

#### 4. **Composants UI** - 90% ✅
- [x] OrganisationTimeline.tsx (158 lignes) - Timeline complète avec infinite scroll
- [x] SearchBar.tsx (328 lignes) - Autocomplete avec keyboard nav
- [x] ActivityWidget.tsx (144 lignes) - Widget dashboard

#### 5. **Pages** - 90% ✅
- [x] Dashboard principal (/dashboard/page.tsx)
- [x] Organisations (liste + détail + new + import)
- [x] Mandats (liste + détail + new) - **Affiche produits associés ✅**
- [x] Produits (liste + détail + new)
- [x] People (liste + détail + new + import)
- [x] Tasks (liste + kanban)
- [x] Search globale
- [x] **Webhooks (492 lignes) - UI COMPLÈTE** ✅
- [x] Settings

---

## ⚠️ Ce qui Manque VRAIMENT

### 1. **Association Mandat-Produit - Interface Utilisateur** ❌

**Constat Détaillé**:
- ✅ Backend API: `POST /produits/associate-to-mandat`, `DELETE /produits/association/{id}`
- ✅ Hooks: `useAssociateProduitToMandat()`, `useDeleteMandatProduitAssociation()`
- ✅ Page mandat détail: Affiche déjà la liste des produits via `useProduitsByMandat()`
- ❌ **Bouton "Associer un produit" redirige vers `/produits/new` au lieu d'un modal**

**Ce qu'il faut créer**:

#### Composant 1: `MandatProduitAssociationModal.tsx`
```tsx
// crm-frontend/components/mandats/MandatProduitAssociationModal.tsx
interface Props {
  isOpen: boolean
  onClose: () => void
  mandatId: number
  mandatStatus: MandatStatus
  onSuccess: () => void
}

// Features:
// - SearchableSelect pour choisir produit existant
// - Input allocation % (0-100)
// - Validation: mandat must be SIGNE or ACTIF
// - Toast success/error
```

#### Modification: `app/dashboard/mandats/[id]/page.tsx`
```diff
- <Link href={`/dashboard/produits/new?mandat_id=${mandatId}`}>
-   <Button>+ Associer un produit</Button>
- </Link>

+ <Button onClick={() => setIsAssociationModalOpen(true)}>
+   + Associer un produit
+ </Button>
+
+ <MandatProduitAssociationModal
+   isOpen={isAssociationModalOpen}
+   onClose={() => setIsAssociationModalOpen(false)}
+   mandatId={mandatId}
+   mandatStatus={mandat.status}
+   onSuccess={() => refetch()}
+ />
```

#### Amélioration Table Produits: Ajouter colonne "Allocation %"
```diff
+ {
+   header: 'Allocation',
+   accessor: 'allocation_pourcentage',
+   render: (value: number | null) => value ? `${value}%` : '-',
+ },
  {
    header: 'Actions',
    accessor: 'id',
    render: (id: number, row: any) => (
-     <Link href={`/dashboard/produits/${id}`}>Voir</Link>
+     <div className="flex gap-2">
+       <Link href={`/dashboard/produits/${id}`}>Voir</Link>
+       <Button size="sm" variant="danger" onClick={() => handleDeleteAssociation(row.association_id)}>
+         Retirer
+       </Button>
+     </div>
    ),
  },
```

**Effort estimé**: 3-4h

---

### 2. **Dashboard Principal - Stats Dynamiques** ⚠️

**État actuel**: Stats hardcodées à "0"

**Fichier**: `crm-frontend/app/dashboard/page.tsx`

**À implémenter**:
```tsx
// Utiliser hooks pour charger stats réelles
const { data: organisations } = useOrganisations({ limit: 1 }) // Pour count
const { data: tasks } = useTasks({ limit: 1 })
const { data: mandats } = useMandats({ limit: 1 })

// Remplacer hardcoded "0" par:
<div className="text-3xl font-bold text-bleu">
  {organisations?.total || 0}
</div>
```

**Ou mieux**: Utiliser endpoint stats
```tsx
const { data: stats } = useGlobalDashboardStats()

<Card>
  <div className="text-3xl font-bold">{stats?.organisations_total || 0}</div>
  <p>Organisations</p>
</Card>
<Card>
  <div className="text-3xl font-bold">{stats?.mandats_actifs || 0}</div>
  <p>Mandats actifs</p>
</Card>
```

**Effort estimé**: 1-2h

---

### 3. **Email Campaigns UI** ❌

**Backend**: ✅ Complet
**Frontend**: ❌ Aucune page

**À créer**:
- [ ] Page `/dashboard/campaigns` - Liste campagnes
- [ ] Page `/dashboard/campaigns/new` - Créer campagne
- [ ] Page `/dashboard/campaigns/[id]` - Détail + stats
- [ ] Composant `EmailTemplateEditor.tsx` - Éditeur WYSIWYG
- [ ] Composant `CampaignStats.tsx` - Stats (opens, clicks, bounces)

**Effort estimé**: 10-12h

---

### 4. **Workflows UI** ❌

**Backend**: ✅ Complet (endpoints `/workflows/*`)
**Frontend**: ❌ Aucune page

**À créer**:
- [ ] Page `/dashboard/workflows` - Liste workflows
- [ ] Page `/dashboard/workflows/[id]` - Détail + historique exécutions
- [ ] Composant `WorkflowStats.tsx` - Stats exécutions
- [ ] (Optionnel) Visual workflow builder

**Effort estimé**: 8-10h

---

### 5. **Recherche Avancée** ⚠️

**État actuel**: SearchBar existe avec autocomplete ✅
**Ce qui manque**: Filtres avancés sur page `/dashboard/search`

**À améliorer**:
- [ ] Ajouter filtres: catégorie, langue, statut, type
- [ ] Tabs: Organisations / People / Mandats / Tasks
- [ ] Affichage résultats par type avec preview
- [ ] Pagination

**Effort estimé**: 4-5h

---

## 📅 Plan d'Action Recommandé

### 🔴 PHASE 1 - QUICK WINS (6-8h)

**Objectif**: Compléter les 10% manquants du core CRM

#### Semaine 1 - Jour 1-2
- [ ] **Association Mandat-Produit UI** (4h)
  - Créer `MandatProduitAssociationModal.tsx`
  - Intégrer dans page détail mandat
  - Ajouter colonne "Allocation %" dans table produits
  - Bouton "Retirer" pour delete association

- [ ] **Dashboard Stats Dynamiques** (2h)
  - Remplacer hardcoded "0" par stats réelles
  - Utiliser `useGlobalDashboardStats()` ou counts de listes
  - Ajouter loading states

- [ ] **Tests + Fixes Mineurs** (2h)
  - Tester association mandat-produit end-to-end
  - Tester stats dashboard
  - Corriger bugs éventuels

**Livrable**: CRM fonctionnel à 95% pour use cases métier core

---

### 🟡 PHASE 2 - NICE TO HAVE (10-15h) - Optionnel

**Objectif**: Features avancées pour power users

#### Semaine 2
- [ ] **Recherche Avancée** (4-5h)
  - Filtres sur page search
  - Tabs par type d'entité
  - Pagination résultats

- [ ] **Workflows UI** (8-10h)
  - Page liste workflows
  - Page détail + historique
  - Stats exécutions

- [ ] **Email Campaigns UI** (10-12h)
  - Page liste + création
  - Éditeur template
  - Stats campagnes

**Livrable**: CRM complet à 100% avec automation avancée

---

### 🟢 PHASE 3 - POLISH (5-10h) - Optionnel

**Objectif**: UX améliorée et features bonus

#### Semaine 3
- [ ] **Champs Avancés OrganisationForm** (2h)
  - AUM, strategies, pipeline_stage, tags
  - Rendre optionnel via toggle "Champs avancés"

- [ ] **Amélioration Timeline** (2h)
  - Infinite scroll optimisé
  - Filtres plus granulaires
  - Export timeline en PDF

- [ ] **Amélioration SearchBar** (2h)
  - Raccourci clavier global (Cmd+K)
  - Recherche recent history
  - Favoris

- [ ] **Tests E2E** (3-5h)
  - Playwright tests pour flows critiques
  - Tests création organisation → mandat → produit → association

**Livrable**: CRM ultra-poli avec UX premium

---

## 🎯 Effort Total Estimé

| Phase | Tâches | Effort | Priorité | ROI |
|-------|--------|--------|----------|-----|
| **Phase 1** | Association mandat-produit + Stats dashboard | 6-8h | 🔴 Critique | ⭐⭐⭐⭐⭐ |
| **Phase 2** | Recherche + Workflows + Campaigns | 22-27h | 🟡 Important | ⭐⭐⭐⭐ |
| **Phase 3** | Polish + Tests E2E | 9-13h | 🟢 Nice-to-have | ⭐⭐⭐ |
| **TOTAL** | | **37-48h** | | |

---

## ✅ Décision Recommandée

### Option A - Minimum Viable (6-8h)
**Focus**: Phase 1 uniquement
**Résultat**: CRM fonctionnel à 95% pour tous use cases métier core
**Timeline**: 1-2 jours

### Option B - Complet (16-23h)
**Focus**: Phase 1 + Phase 2 partiel (Recherche + Workflows OU Campaigns)
**Résultat**: CRM à 98% avec automation
**Timeline**: 1 semaine

### Option C - Premium (37-48h)
**Focus**: Toutes phases
**Résultat**: CRM 100% avec UX premium
**Timeline**: 2 semaines

---

## 📝 Notes Importantes

### Découvertes Positives
1. **Webhooks UI existe déjà** (492 lignes) - CRUD complet ✅
2. **Association mandat-produit**: Hooks existent déjà, juste UI manquante
3. **OrganisationTimeline**: Déjà implémentée avec infinite scroll
4. **SearchBar**: Déjà très complet avec keyboard nav

### Architecture Solide
- Tous les hooks suivent pattern React Query
- API client centralisé avec token management
- Forms utilisent react-hook-form uniformément
- Composants shared réutilisables (Card, Button, Table, Modal)

### Prêt pour Production
Le CRM est **déjà utilisable en production** pour:
- ✅ Gestion organisations (CRUD complet)
- ✅ Gestion personnes + liens organisation-personne
- ✅ Gestion mandats (CRUD complet)
- ✅ Gestion produits (CRUD complet)
- ✅ Association **lecture** mandat-produit (affichage liste)
- ✅ Gestion tâches avec kanban
- ✅ Imports massifs (organisations, personnes, unifié)
- ✅ Recherche autocomplete
- ✅ Timeline activités
- ✅ Webhooks complets

**Ce qui bloque vraiment**: Seulement **association mandat-produit UI** (4h)

---

## 🚀 Recommandation Finale

**Faire Phase 1 immédiatement** (6-8h):
1. Association mandat-produit UI (critique pour workflow métier)
2. Dashboard stats dynamiques (améliore UX première impression)

**Phase 2 & 3**: À décider selon priorités business
- Workflows UI → Utile si automation intensive
- Campaigns UI → Utile si email marketing fréquent
- Recherche avancée → Utile si >500 organisations

**Le CRM est déjà à 85-90% de complétion.**
**Les 6-8h de Phase 1 amènent à 95%.**
**C'est largement suffisant pour démarrer en production.**
