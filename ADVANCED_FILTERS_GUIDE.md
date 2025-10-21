# 🎯 Guide d'utilisation - AdvancedFilters (Composant Générique)

## 📋 Vue d'ensemble

Le composant `AdvancedFilters` est maintenant **100% générique** et peut être utilisé sur **toutes les pages** du CRM :

- ✅ `/dashboard/people` - Filtrer les personnes
- ✅ `/dashboard/organisations` - Filtrer les organisations
- ✅ `/dashboard/tasks` - Filtrer les tâches
- ✅ `/dashboard/mandats` - Filtrer les mandats
- ✅ `/dashboard/produits` - Filtrer les produits
- ✅ **Toute autre page !**

---

## 🎨 5 Types de filtres supportés

### 1️⃣ `select` - Liste déroulante
```tsx
{
  key: 'country',
  label: 'Pays',
  type: 'select',
  options: [
    { value: '', label: 'Tous les pays' },
    { value: 'FR', label: '🇫🇷 France' },
    { value: 'LU', label: '🇱🇺 Luxembourg' },
  ],
}
```
**Rendu** : Menu déroulant classique

---

### 2️⃣ `search` - Champ de recherche
```tsx
{
  key: 'role',
  label: 'Rôle contient',
  type: 'search',
  placeholder: 'Directeur, Analyste...',
}
```
**Rendu** : Input texte avec placeholder

---

### 3️⃣ `date` - Sélecteur de date
```tsx
{
  key: 'createdFrom',
  label: 'Créés après',
  type: 'date',
}
```
**Rendu** : Input date natif du navigateur

---

### 4️⃣ `multiselect` - Cases à cocher multiples
```tsx
{
  key: 'categories',
  label: 'Catégories',
  type: 'multiselect',
  options: [
    { value: 'CGPI', label: 'CGPI' },
    { value: 'Distributeur', label: 'Distributeur' },
    { value: 'Emetteur', label: 'Émetteur' },
  ],
}
```
**Rendu** : Liste de checkboxes scrollables
**Valeur retournée** : `['CGPI', 'Distributeur']` (tableau)

---

### 5️⃣ `boolean` - Boutons toggle
```tsx
{
  key: 'status',
  label: 'Statut',
  type: 'boolean',
  options: [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
  ],
}
```
**Rendu** : 2 boutons côte à côte (un seul sélectionnable)

---

## 🚀 Intégration rapide (3 étapes)

### Étape 1 : Définir les filtres

```tsx
import type { FilterDefinition } from '@/components/search/AdvancedFilters'

const filterDefinitions: FilterDefinition[] = [
  {
    key: 'role',
    label: 'Rôle contient',
    type: 'search',
    placeholder: 'Directeur...',
  },
  {
    key: 'country',
    label: 'Pays',
    type: 'select',
    options: [
      { value: '', label: 'Tous' },
      { value: 'FR', label: '🇫🇷 France' },
    ],
  },
  {
    key: 'createdFrom',
    label: 'Créés après',
    type: 'date',
  },
]
```

### Étape 2 : Gérer l'état

```tsx
const [filtersState, setFiltersState] = useState({
  role: '',
  country: '',
  createdFrom: '',
})

const handleFilterChange = (key: string, value: unknown) => {
  if (Array.isArray(value)) {
    // Gérer les multiselect
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  } else {
    setFiltersState((prev) => ({ ...prev, [key]: value as string }))
  }
}

const resetFilters = () => setFiltersState({
  role: '',
  country: '',
  createdFrom: '',
})
```

### Étape 3 : Utiliser le composant

```tsx
import { AdvancedFilters } from '@/components/shared'

<AdvancedFilters
  filters={filterDefinitions}
  values={filtersState}
  onChange={handleFilterChange}
  onReset={resetFilters}
/>
```

---

## 📦 Exemple complet - Page People

Voir le code actuel dans [`/dashboard/people/page.tsx`](crm-frontend/app/dashboard/people/page.tsx)

```tsx
'use client'

import { useState } from 'react'
import { AdvancedFilters } from '@/components/shared'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'

export default function PeoplePage() {
  const [filtersState, setFiltersState] = useState({
    role: '',
    country: '',
    language: '',
    createdFrom: '',
    createdTo: '',
  })

  const handleFilterChange = (key: string, value: unknown) => {
    if (Array.isArray(value)) return
    setFiltersState((prev) => ({
      ...prev,
      [key]: value as string,
    }))
  }

  const resetFilters = () =>
    setFiltersState({
      role: '',
      country: '',
      language: '',
      createdFrom: '',
      createdTo: '',
    })

  const advancedFilterDefinitions = [
    {
      key: 'role',
      label: 'Rôle contient',
      type: 'search' as const,
      placeholder: 'Directeur, Analyste...',
    },
    {
      key: 'country',
      label: 'Pays',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les pays' },
        ...COUNTRY_OPTIONS.filter((option) => option.value).map((option) => ({
          value: option.value,
          label: option.label,
        })),
      ],
    },
    {
      key: 'language',
      label: 'Langue',
      type: 'select' as const,
      options: [
        { value: '', label: 'Toutes les langues' },
        ...LANGUAGE_OPTIONS.filter((option) => option.code).map((option) => ({
          value: option.code,
          label: `${option.flag} ${option.name}`,
        })),
      ],
    },
    {
      key: 'createdFrom',
      label: 'Créés après',
      type: 'date' as const,
    },
    {
      key: 'createdTo',
      label: 'Créés avant',
      type: 'date' as const,
    },
  ]

  return (
    <div>
      <AdvancedFilters
        filters={advancedFilterDefinitions}
        values={filtersState}
        onChange={handleFilterChange}
        onReset={resetFilters}
      />
    </div>
  )
}
```

---

## 🔍 Utilisation des filtres pour filtrer les données

### Filtrage côté client (dans le composant)

```tsx
const filteredData = (data ?? []).filter((item) => {
  // Filtrer par rôle
  const matchesRole = filtersState.role
    ? item.role?.toLowerCase().includes(filtersState.role.toLowerCase())
    : true

  // Filtrer par pays
  const matchesCountry = filtersState.country
    ? item.country_code === filtersState.country
    : true

  // Filtrer par date
  const createdAt = item.created_at ? new Date(item.created_at) : null
  const matchesDate = filtersState.createdFrom
    ? createdAt && createdAt >= new Date(filtersState.createdFrom)
    : true

  return matchesRole && matchesCountry && matchesDate
})
```

### Filtrage côté serveur (via API)

```tsx
const { data, isLoading } = useOrganisations({
  category: filtersState.category || undefined,
  country_code: filtersState.country || undefined,
  is_active: filtersState.status === 'active' ? true : undefined,
})
```

---

## 🎯 Cas d'usage par page

### Page People
- Rôle (search)
- Pays (select)
- Langue (select)
- Dates de création (date x2)

### Page Organisations
- Catégorie (select)
- Statut Actif/Inactif (boolean)
- Pays (select)
- Langue (select)
- Dates de création (date x2)

### Page Tasks
- Priorité (multiselect)
- Statut (select)
- Catégorie (select)
- Dates d'échéance (date x2)

### Page Mandats
- Organisation (select)
- Statut (boolean)
- Type de mandat (select)
- Dates de début/fin (date x2)

---

## ✨ Fonctionnalités

✅ **Badge de compteur** : Affiche le nombre de filtres actifs
✅ **Panel flottant** : S'ouvre au-dessus du contenu
✅ **Overlay sombre** : Ferme le panel en cliquant à l'extérieur
✅ **Animations fluides** : Transitions CSS modernes
✅ **Bouton Réinitialiser** : Efface tous les filtres en 1 clic
✅ **Bouton Appliquer** : Ferme le panel
✅ **Responsive** : Fonctionne sur mobile

---

## 🐛 Cas où la base de données ne renvoie rien

Si votre table est vide après avoir appliqué des filtres :

1. **Table vide** : Aucune donnée en base
2. **Authentification** : Token expiré (401)
3. **Filtres trop restrictifs** : Aucune donnée ne correspond
4. **Pagination** : Les données sont après skip/limit
5. **Erreur API** : Serveur 500
6. **Structure de réponse** : `data.items` n'existe pas
7. **Recherche vide** : Le terme de recherche ne trouve rien
8. **Filtre serveur** : L'API filtre côté serveur (ex: `organization_id`)

---

## 📚 Documentation complète

Voir [`components/search/AdvancedFilters.md`](crm-frontend/components/search/AdvancedFilters.md) pour plus de détails.

---

## 🎉 Résumé

Le composant `AdvancedFilters` est maintenant **prêt pour toutes les pages** du CRM. Il suffit de :

1. Définir les filtres avec `FilterDefinition[]`
2. Gérer l'état avec `useState`
3. Passer les props `filters`, `values`, `onChange`, `onReset`

**Aucun code spécifique par page** - tout est configurable via les props !
