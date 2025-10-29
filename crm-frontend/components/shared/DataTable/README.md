# DataTable - Guide d'utilisation

## Vue d'ensemble

Le composant `DataTable` est un système de tableau ultra-premium qui remplace `TableV2` avec des fonctionnalités avancées:

- ✅ **Multi-sélection** avec actions groupées
- ✅ **Actions rapides** révélées au survol des lignes
- ✅ **Recherche** en temps réel
- ✅ **Tri** par colonnes
- ✅ **Pagination** complète avec ellipses
- ✅ **États vides** personnalisables
- ✅ **Skeletons** avec animations shimmer
- ✅ **Dark mode** intégral
- ✅ **Couleurs minimales** (90% gris neutre)

---

## Utilisation basique

```tsx
import { DataTable, Column } from '@/components/shared/DataTable'

// 1. Définir les colonnes
const columns: Column<Person>[] = [
  {
    id: 'name',
    header: 'Nom',
    accessor: (row) => `${row.first_name} ${row.last_name}`,
    sortable: true,
    searchable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessor: 'personal_email',
    sortable: true,
    render: (value) => <a href={`mailto:${value}`}>{value}</a>,
  },
]

// 2. Utiliser le composant
<DataTable
  data={people}
  columns={columns}
  keyExtractor={(row) => row.id}
/>
```

---

## Types et interfaces

### Column<T>

```tsx
interface Column<T = any> {
  id: string                                    // Identifiant unique
  header: string                                // En-tête de colonne
  accessor: keyof T | ((row: T) => any)        // Clé ou fonction d'accès
  sortable?: boolean                            // Tri activé (défaut: false)
  searchable?: boolean                          // Recherche activée (défaut: false)
  render?: (value: any, row: T) => React.ReactNode  // Rendu personnalisé
}
```

### QuickAction<T>

```tsx
interface QuickAction<T = any> {
  id: string                     // Identifiant unique
  label: string                  // Libellé (tooltip)
  icon?: LucideIcon             // Icône Lucide
  onClick: (row: T) => void     // Callback au clic
  variant?: 'default' | 'danger' // Style (défaut: default)
}
```

### BulkAction<T>

```tsx
interface BulkAction<T = any> {
  id: string                     // Identifiant unique
  label: string                  // Libellé du bouton
  icon?: LucideIcon             // Icône Lucide
  onClick: (rows: T[]) => void  // Callback avec lignes sélectionnées
  variant?: 'default' | 'danger' // Style (défaut: default)
}
```

---

## Exemples avancés

### Avec actions rapides

```tsx
import { Eye, Edit, Trash2 } from 'lucide-react'

const quickActions: QuickAction<Person>[] = [
  {
    id: 'view',
    label: 'Voir',
    icon: Eye,
    onClick: (row) => router.push(`/people/${row.id}`),
  },
  {
    id: 'edit',
    label: 'Modifier',
    icon: Edit,
    onClick: (row) => router.push(`/people/${row.id}/edit`),
  },
  {
    id: 'delete',
    label: 'Supprimer',
    icon: Trash2,
    onClick: (row) => handleDelete(row.id),
    variant: 'danger',
  },
]

<DataTable
  data={people}
  columns={columns}
  quickActions={quickActions}
  keyExtractor={(row) => row.id}
/>
```

### Avec actions groupées

```tsx
import { Download, Trash2, Mail } from 'lucide-react'

const bulkActions: BulkAction<Person>[] = [
  {
    id: 'export',
    label: 'Exporter',
    icon: Download,
    onClick: (rows) => exportToCSV(rows),
  },
  {
    id: 'email',
    label: 'Envoyer email',
    icon: Mail,
    onClick: (rows) => openEmailModal(rows),
  },
  {
    id: 'delete',
    label: 'Supprimer',
    icon: Trash2,
    onClick: (rows) => handleBulkDelete(rows),
    variant: 'danger',
  },
]

<DataTable
  data={people}
  columns={columns}
  bulkActions={bulkActions}
  keyExtractor={(row) => row.id}
/>
```

### Avec recherche et pagination

```tsx
<DataTable
  data={people}
  columns={columns}
  keyExtractor={(row) => row.id}
  searchable={{
    placeholder: 'Rechercher une personne...',
    fields: ['first_name', 'last_name', 'email'],
  }}
  pagination={{
    pageSize: 20,
    showPageSize: true,
    pageSizeOptions: [10, 20, 50, 100],
  }}
/>
```

### Avec état vide personnalisé

```tsx
<DataTable
  data={people}
  columns={columns}
  keyExtractor={(row) => row.id}
  isEmpty={people.length === 0}
  emptyState={{
    title: 'Aucune personne',
    description: 'Commencez par ajouter votre première personne.',
    action: {
      label: 'Nouvelle personne',
      onClick: () => router.push('/people/new'),
    },
  }}
/>
```

### Avec callback au clic sur ligne

```tsx
<DataTable
  data={people}
  columns={columns}
  keyExtractor={(row) => row.id}
  onRowClick={(row) => {
    router.push(`/people/${row.id}`)
  }}
/>
```

---

## Props complètes

```tsx
interface DataTableProps<T = any> {
  // Données
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string | number

  // Recherche
  searchable?: false | {
    placeholder?: string
    fields?: (keyof T | string)[]
  }

  // Filtres (à implémenter)
  filterable?: boolean

  // Actions
  bulkActions?: BulkAction<T>[]
  quickActions?: QuickAction<T>[]

  // Callbacks
  onRowClick?: (row: T) => void

  // États
  isLoading?: boolean
  isEmpty?: boolean
  emptyState?: {
    title?: string
    description?: string
    action?: {
      label: string
      onClick: () => void
    }
  }

  // Pagination
  pagination?: false | {
    pageSize?: number
    showPageSize?: boolean
    pageSizeOptions?: number[]
  }
}
```

---

## Architecture des composants

```
DataTable/
├── index.tsx                  # Composant principal + orchestrateur
├── DataTableHeader.tsx        # En-tête avec tri + checkbox
├── DataTableRow.tsx           # Ligne avec actions hover
├── DataTableBulkActions.tsx   # Barre actions groupées
├── DataTableEmpty.tsx         # État vide
├── DataTableSkeleton.tsx      # Loading avec shimmer
├── DataTablePagination.tsx    # Pagination complète
├── DataTableFilters.tsx       # Filtres (placeholder)
└── README.md                  # Ce fichier
```

---

## Migration depuis TableV2

### Avant (TableV2)

```tsx
<TableV2<Person>
  columns={[
    {
      header: 'Nom',
      accessor: 'last_name',
      sortable: true,
      render: (value, row) => <Link href={`/people/${row.id}`}>{value}</Link>,
    },
  ]}
  data={people}
  sortConfig={sortConfig}
  onSort={handleSort}
  getRowKey={(row) => row.id}
/>
```

### Après (DataTable)

```tsx
<DataTable<Person>
  columns={[
    {
      id: 'name',              // ✅ id obligatoire
      header: 'Nom',
      accessor: 'last_name',
      sortable: true,
      render: (value, row) => <Link href={`/people/${row.id}`}>{value}</Link>,
    },
  ]}
  data={people}
  keyExtractor={(row) => row.id}  // ✅ keyExtractor au lieu de getRowKey
  // ✅ Tri géré automatiquement en interne
/>
```

---

## Bonnes pratiques

### 1. Utiliser `accessor` avec fonction pour colonnes calculées

```tsx
{
  id: 'fullName',
  header: 'Nom complet',
  accessor: (row) => `${row.first_name} ${row.last_name}`,
  sortable: true,
}
```

### 2. Marquer les colonnes recherchables

```tsx
{
  id: 'email',
  header: 'Email',
  accessor: 'personal_email',
  searchable: true,  // ✅ Inclus dans la recherche
  sortable: true,
}
```

### 3. Stopper la propagation pour liens/boutons

```tsx
{
  id: 'email',
  header: 'Email',
  accessor: 'email',
  render: (value) => (
    <a
      href={`mailto:${value}`}
      onClick={(e) => e.stopPropagation()}  // ✅ Évite onRowClick
    >
      {value}
    </a>
  ),
}
```

### 4. Utiliser variant='danger' pour actions destructives

```tsx
{
  id: 'delete',
  label: 'Supprimer',
  icon: Trash2,
  onClick: handleDelete,
  variant: 'danger',  // ✅ Rouge pour actions dangereuses
}
```

### 5. Toujours fournir `keyExtractor`

```tsx
// ✅ Bon
keyExtractor={(row) => row.id}

// ✅ Bon aussi (clé composite)
keyExtractor={(row) => `${row.id}-${row.email}`}

// ❌ Mauvais (index = problèmes de performance)
keyExtractor={(row, index) => index}
```

---

## Performance

- **Tri**: Client-side avec memoization
- **Recherche**: Debounced (300ms) pour grandes listes
- **Pagination**: Slice côté client (pas de re-fetch API)
- **Animations**: GPU-accelerated (`transform`, `opacity`)

---

## Palette de couleurs

Le composant respecte la directive **"pas d'arc-en-ciel"**:

- **90% gris neutre**: `gray-*`, `slate-*`
- **10% accents**: `blue-*` uniquement
- **Rouge**: Variant `danger` seulement
- **Pas de vert, jaune, orange, violet** (sauf dégradé navbar)

---

## Exemples complets

Voir:
- [page-example.tsx](../../../app/dashboard/people/page-example.tsx) - Implémentation complète avec People
- [index.tsx](./index.tsx) - Code source du composant principal
- [DataTableRow.tsx](./DataTableRow.tsx) - Gestion des actions hover

---

## Todo / Améliorations futures

- [ ] Implémenter `DataTableFilters.tsx` (filtres avancés)
- [ ] Ajouter navigation clavier (↑↓ + Enter)
- [ ] Vue mobile responsive (cards au lieu de table)
- [ ] Virtual scrolling pour >1000 lignes
- [ ] Sauvegarde préférences utilisateur (tri, colonnes visibles)
- [ ] Drag & drop pour réordonner colonnes
- [ ] Export CSV/Excel direct depuis bulkActions
- [ ] Édition inline (double-clic sur cellule)
