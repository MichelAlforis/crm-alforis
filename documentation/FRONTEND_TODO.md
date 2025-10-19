# 🎨 Frontend - Fonctionnalités à Implémenter

**Date**: 20 Octobre 2024
**Priorité**: Features manquantes pour compléter le CRM

---

## 📊 Vue d'ensemble

### ✅ Déjà Implémenté (Backend 100%)
- API complète avec tous les endpoints
- Architecture unifiée Organisation/Person
- Imports massifs (bulk operations)
- Recherche full-text
- Workflows automatisés
- Email campaigns
- Webhooks
- Dashboards & stats

### ⚠️ À Implémenter Frontend

---

## 🔴 PRIORITÉ 1 - Fonctionnalités Core Manquantes

### 1. **Formulaires Organisations** ❌

**Fichier**: `crm-frontend/components/forms/OrganisationForm.tsx`

**Champs requis**:
```typescript
interface OrganisationFormData {
  // Identité
  name: string                    // ✅ Required
  category: OrganisationCategory  // ✅ Required - Select: Institution, Wholesale, SDG, CGPI, Autres
  type: OrganisationType          // ✅ Required - client, fournisseur, etc.

  // Coordonnées
  email?: string
  phone?: string
  website?: string

  // Adresse
  address?: string
  city?: string
  postal_code?: string
  country_code?: string            // Select pays (FR, US, GB, etc.)
  language: string                 // ✅ Required - Default: "FR" - Select: FR, EN, ES, DE, IT

  // Données métier
  aum?: number                     // Assets Under Management
  aum_date?: Date
  strategies?: string[]            // Tags input (ex: ["Private Equity", "Debt"])

  // Pipeline
  pipeline_stage?: PipelineStage   // prospect, qualification, proposition, etc.
  potential_amount?: number
  signature_probability?: number   // 0-100%

  // Autres
  notes?: string
  tags?: string[]
  is_active: boolean              // Default: true
}
```

**Actions**:
- [ ] Create form component with validation
- [ ] Integrate with `createOrganisation()` API
- [ ] Integrate with `updateOrganisation()` API
- [ ] Add to organisation pages

---

### 2. **Formulaires Mandats** ❌

**Fichier**: `crm-frontend/components/forms/MandatForm.tsx`

**Champs requis**:
```typescript
interface MandatFormData {
  organisation_id: number          // ✅ Required - Select organisation
  number?: string                  // Numéro mandat (auto-généré)
  type: MandatType                 // vente, achat, distribution
  status: MandatStatus             // ✅ Required - draft, active, signed, expired, closed

  // Dates
  start_date?: Date
  end_date?: Date

  // Montants
  amount?: number

  // Détails
  description?: string
  conditions?: string

  // Ownership
  owner_id?: number                // Select user
}
```

**Logique**:
- ⚠️ **Validation**: Un mandat doit avoir status `signed` ou `active` pour permettre association produits
- ✅ **Auto-check**: Afficher badge "Actif" si `status in ['signed', 'active']`

**Actions**:
- [ ] Create form component
- [ ] Integrate with `createMandat()` API
- [ ] Add mandat badge (Actif/Inactif)
- [ ] Add to organisation detail page

---

### 3. **Formulaires Produits** ❌

**Fichier**: `crm-frontend/components/forms/ProduitForm.tsx`

**Champs requis**:
```typescript
interface ProduitFormData {
  name: string                     // ✅ Required
  isin?: string                    // Code ISIN (12 chars, validation)
  type: ProduitType                // OPCVM, FCP, SICAV, ETF, Fonds Alternatif, Autre
  status: ProduitStatus            // actif, inactif, en_attente

  // Classification
  devise?: string                  // EUR, USD, GBP
  srri?: number                    // 1-7 (Risque)

  // Frais
  frais_gestion?: number           // %
  frais_entree?: number            // %
  frais_sortie?: number            // %

  // Détails
  description?: string
  url_documentation?: string
}
```

**Actions**:
- [ ] Create form component
- [ ] ISIN validation (12 chars alphanumeric)
- [ ] Integrate with `createProduit()` API
- [ ] Add produits management page

---

### 4. **Association Mandat-Produit** ❌

**Feature**: Associer des produits à un mandat avec allocation %

**UI Requis**:
```typescript
// Sur la page détail Mandat
interface MandatProduitAssociation {
  mandat_id: number
  produit_id: number               // Select produit
  allocation_pourcentage?: number  // 0-100%
}
```

**Règles métier**:
- ⚠️ **Validation Backend**: Le mandat doit être `actif` (signed ou active)
- ✅ Afficher la liste des produits associés
- ✅ Permettre ajout/suppression
- ✅ Afficher somme allocations (devrait = 100%)

**Endpoint API**:
```
POST /api/v1/produits/associate-to-mandat
DELETE /api/v1/produits/association/{association_id}
```

**Actions**:
- [ ] Create association component
- [ ] Add to mandat detail page
- [ ] Show allocation summary
- [ ] Validate 100% total allocation

---

## 🟡 PRIORITÉ 2 - Améliorations UX

### 5. **Timeline d'Activité Organisation** ⚠️ Partiel

**Endpoint existant**: `GET /api/v1/organisations/{id}/activity`

**Ce qui manque**:
- [ ] Composant `OrganisationActivityTimeline.tsx`
- [ ] Affichage par type (task, mandat, email, etc.)
- [ ] Filtres par type d'activité
- [ ] Pagination cursor-based

**UI Proposée**:
```tsx
<ActivityTimeline organisationId={id}>
  <ActivityItem type="task.completed" />
  <ActivityItem type="mandat.signed" />
  <ActivityItem type="email.sent" />
</ActivityTimeline>
```

---

### 6. **Segmentation par Langue (Newsletters)** ❌

**Feature**: Filtrer organisations par langue pour newsletters ciblées

**Endpoint existant**: `GET /api/v1/organisations/by-language/{language}`

**UI Requis**:
- [ ] Page newsletter avec sélection langue
- [ ] Prévisualisation destinataires par langue
- [ ] Filtres combinés (langue + category)

---

### 7. **Recherche Avancée** ⚠️ Partiel

**Endpoints existants**:
```
GET /api/v1/search/organisations?q={query}
GET /api/v1/search/people?q={query}
GET /api/v1/search/mandats?q={query}
GET /api/v1/search/autocomplete?q={query}&type={type}
```

**Ce qui manque**:
- [ ] Composant `GlobalSearchBar.tsx` avec autocomplete
- [ ] Filtres avancés (catégorie, langue, statut)
- [ ] Recherche unified cross-entity

---

### 8. **Statistiques & KPIs** ⚠️ Partiel

**Endpoints existants**:
```
GET /api/v1/dashboards/stats/global
GET /api/v1/dashboards/stats/organisation/{id}
GET /api/v1/organisations/stats
```

**Composants manquants**:
- [ ] `DashboardStatsWidget.tsx` - Stats globales
- [ ] `OrganisationStatsCard.tsx` - Stats par organisation
- [ ] Charts (organisations par catégorie, par langue)

---

## 🟢 PRIORITÉ 3 - Nice to Have

### 9. **Workflows UI** ❌

**Backend**: ✅ Complet (`GET /api/v1/workflows/*`)

**Frontend manquant**:
- [ ] Page gestion workflows
- [ ] Workflow builder (visual)
- [ ] Historique exécutions
- [ ] Stats workflows

---

### 10. **Webhooks UI** ❌

**Backend**: ✅ Complet (`GET /api/v1/webhooks/*`)

**Frontend manquant**:
- [ ] Page gestion webhooks
- [ ] CRUD webhooks
- [ ] Test webhook endpoint
- [ ] Logs webhook deliveries

---

### 11. **Email Campaigns UI** ⚠️ Partiel

**Backend**: ✅ Complet

**Manquant**:
- [ ] Éditeur de templates WYSIWYG
- [ ] A/B testing UI
- [ ] Stats campagnes détaillées
- [ ] Gestion recipients

---

## 📋 Checklist Implémentation

### Setup Initial
- [ ] Créer types TypeScript pour nouveaux modèles
- [ ] Ajouter méthodes API dans `lib/api.ts`
- [ ] Créer hooks personnalisés (`useOrganisations`, `useMandats`, etc.)

### Composants Forms
- [ ] `OrganisationForm.tsx` (PRIORITÉ 1)
- [ ] `MandatForm.tsx` (PRIORITÉ 1)
- [ ] `ProduitForm.tsx` (PRIORITÉ 1)
- [ ] `MandatProduitAssociationForm.tsx` (PRIORITÉ 1)

### Pages
- [ ] `/organisations/[id]` - Détail organisation avec timeline
- [ ] `/mandats` - Liste mandats
- [ ] `/mandats/[id]` - Détail mandat avec produits
- [ ] `/produits` - Liste produits
- [ ] `/search` - Recherche globale

### Composants UI
- [ ] `ActivityTimeline.tsx`
- [ ] `GlobalSearchBar.tsx`
- [ ] `DashboardStatsWidget.tsx`
- [ ] `LanguageFilter.tsx`

---

## 🎯 Estimation Efforts

| Tâche | Effort | Priorité |
|-------|--------|----------|
| OrganisationForm | 4h | 🔴 P1 |
| MandatForm | 3h | 🔴 P1 |
| ProduitForm | 3h | 🔴 P1 |
| Association Mandat-Produit | 4h | 🔴 P1 |
| Timeline Activité | 5h | 🟡 P2 |
| Recherche Globale | 6h | 🟡 P2 |
| Stats Dashboard | 4h | 🟡 P2 |
| Workflows UI | 8h | 🟢 P3 |
| Webhooks UI | 4h | 🟢 P3 |
| Email Campaigns UI | 10h | 🟢 P3 |

**Total P1**: ~14h
**Total P2**: ~15h
**Total P3**: ~22h

**TOTAL**: ~51h de développement frontend
