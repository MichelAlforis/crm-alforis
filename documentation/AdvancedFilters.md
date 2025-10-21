# AdvancedFilters - Composant Générique

## Description

`AdvancedFilters` est un composant React **totalement générique** qui peut être utilisé sur n'importe quelle page du CRM (people, organisations, tasks, interactions, etc.).

## Caractéristiques

✅ **5 types de filtres supportés** :
- `select` : Liste déroulante
- `search` : Champ de recherche texte
- `date` : Sélecteur de date
- `multiselect` : Cases à cocher multiples
- `boolean` : Boutons toggle (ex: Actif/Inactif)

✅ **Compteur de filtres actifs** : Badge bleu avec le nombre de filtres appliqués

✅ **Interface moderne** : Panel flottant avec overlay, animations fluides

✅ **Réinitialisation facile** : Bouton pour effacer tous les filtres

---

## Utilisation

### 1. Import

```tsx
import { AdvancedFilters } from '@/components/shared'
import type { FilterDefinition } from '@/components/search/AdvancedFilters'
```

### 2. Définir les filtres

```tsx
const filterDefinitions: FilterDefinition[] = [
  {
    key: 'role',
    label: 'Rôle contient',
    type: 'search',
    placeholder: 'Directeur, Analyste...',
  },
  {
    key: 'country',
    label: 'Pays',
    type: 'select',
    options: [
      { value: '', label: 'Tous les pays' },
      { value: 'FR', label: '🇫🇷 France' },
      { value: 'LU', label: '🇱🇺 Luxembourg' },
    ],
  },
  {
    key: 'createdFrom',
    label: 'Créés après',
    type: 'date',
  },
  {
    key: 'status',
    label: 'Statut',
    type: 'boolean',
    options: [
      { value: 'active', label: 'Actif' },
      { value: 'inactive', label: 'Inactif' },
    ],
  },
]
```

### 3. Gérer l'état des filtres

```tsx
const [filtersState, setFiltersState] = useState({
  role: '',
  country: '',
  createdFrom: '',
  status: '',
})

const handleFilterChange = (key: string, value: unknown) => {
  if (Array.isArray(value)) return // Gérer les multisélections si nécessaire
  setFiltersState((prev) => ({
    ...prev,
    [key]: value as string,
  }))
}

const resetFilters = () =>
  setFiltersState({
    role: '',
    country: '',
    createdFrom: '',
    status: '',
  })
```

### 4. Utiliser le composant

```tsx
<AdvancedFilters
  filters={filterDefinitions}
  values={filtersState}
  onChange={handleFilterChange}
  onReset={resetFilters}
/>
```

---

## Exemples par page

### Page People (`/dashboard/people`)

```tsx
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
      ...COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.label })),
    ],
  },
  {
    key: 'language',
    label: 'Langue',
    type: 'select' as const,
    options: [
      { value: '', label: 'Toutes les langues' },
      ...LANGUAGE_OPTIONS.map((l) => ({ value: l.code, label: l.name })),
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
```

### Page Organisations (`/dashboard/organisations`)

```tsx
const advancedFilterDefinitions = [
  {
    key: 'category',
    label: 'Catégorie',
    type: 'select' as const,
    options: [
      { value: '', label: 'Toutes les catégories' },
      { value: 'DISTRIBUTEUR', label: 'Distributeur' },
      { value: 'EMETTEUR', label: 'Émetteur' },
      { value: 'CGPI', label: 'CGPI' },
    ],
  },
  {
    key: 'status',
    label: 'Statut',
    type: 'boolean' as const,
    options: [
      { value: 'active', label: 'Actif' },
      { value: 'inactive', label: 'Inactif' },
    ],
  },
  {
    key: 'country',
    label: 'Pays',
    type: 'select' as const,
    options: COUNTRY_OPTIONS,
  },
]
```

### Page Tasks (`/dashboard/tasks`)

```tsx
const advancedFilterDefinitions = [
  {
    key: 'priority',
    label: 'Priorité',
    type: 'multiselect' as const,
    options: [
      { value: 'critique', label: '🔴 Critique' },
      { value: 'haute', label: '🟠 Haute' },
      { value: 'moyenne', label: '🟡 Moyenne' },
      { value: 'basse', label: '🔵 Basse' },
    ],
  },
  {
    key: 'status',
    label: 'Statut',
    type: 'select' as const,
    options: [
      { value: '', label: 'Tous' },
      { value: 'pending', label: 'En attente' },
      { value: 'in_progress', label: 'En cours' },
      { value: 'completed', label: 'Terminé' },
    ],
  },
  {
    key: 'dueDate',
    label: 'Échéance',
    type: 'date' as const,
  },
]
```

---

## Types de filtres détaillés

### 1. `select` - Liste déroulante

```tsx
{
  key: 'category',
  label: 'Catégorie',
  type: 'select',
  options: [
    { value: '', label: 'Toutes' },
    { value: 'A', label: 'Option A' },
    { value: 'B', label: 'Option B' },
  ],
}
```

### 2. `search` - Champ texte

```tsx
{
  key: 'name',
  label: 'Nom contient',
  type: 'search',
  placeholder: 'Rechercher...',
}
```

### 3. `date` - Sélecteur de date

```tsx
{
  key: 'createdFrom',
  label: 'Créé après le',
  type: 'date',
}
```

### 4. `multiselect` - Cases à cocher

```tsx
{
  key: 'tags',
  label: 'Tags',
  type: 'multiselect',
  options: [
    { value: 'vip', label: 'VIP' },
    { value: 'partner', label: 'Partenaire' },
  ],
}
```

Retourne un **tableau de valeurs** : `['vip', 'partner']`

### 5. `boolean` - Boutons toggle

```tsx
{
  key: 'isActive',
  label: 'Statut',
  type: 'boolean',
  options: [
    { value: 'true', label: 'Actif' },
    { value: 'false', label: 'Inactif' },
  ],
}
```

---

## Props API

| Prop | Type | Description |
|------|------|-------------|
| `filters` | `FilterDefinition[]` | Définitions des filtres à afficher |
| `values` | `Record<string, string \| string[]>` | État actuel des filtres |
| `onChange` | `(key: string, value: string \| string[] \| undefined) => void` | Callback appelé lors d'un changement |
| `onReset` | `() => void` | Callback appelé lors de la réinitialisation |

---

## Avantages

✅ **Réutilisable** : Fonctionne sur toutes les pages sans modification
✅ **Typé** : Support TypeScript complet
✅ **Accessible** : Labels, placeholders, aria-labels
✅ **Responsive** : S'adapte aux petits écrans
✅ **Performant** : Pas de re-render inutile

---

## Intégration complète (exemple)

Voir [/dashboard/people/page.tsx](../../app/dashboard/people/page.tsx) pour un exemple complet d'intégration.
