# 🎣 Hooks Réutilisables - CRM Alforis

**Date de création** : 23 Octobre 2025
**Contexte** : Chapitre 5 - Module Organisations
**Objectif** : Centraliser la logique métier et améliorer la maintenabilité

---

## 📋 Liste des Hooks

| Hook | Fichier | Utilité | Utilisé dans |
|------|---------|---------|--------------|
| useTableColumns | `/hooks/useTableColumns.ts` | Gestion colonnes modifiables | Organisations, People, Mandats |
| useSearchFocus | `/hooks/useSearchFocus.ts` | Effets focus recherche | SearchBar global |
| useConfirm | `/hooks/useConfirm.tsx` | Modals de confirmation | Toutes pages detail |
| useExport | `/hooks/useExport.ts` | Exports CSV/Excel/PDF | ExportButtons |

---

## 1. useTableColumns ⭐

### Description
Hook pour gérer les colonnes visibles/cachées dans les tables avec sauvegarde dans localStorage.

### Fichier
```
crm-frontend/hooks/useTableColumns.ts
```

### API
```typescript
const {
  visibleColumns,      // Array<string> - IDs des colonnes visibles
  toggleColumn,        // (columnId: string) => void
  resetColumns         // () => void
} = useTableColumns(storageKey: string, defaultColumns: Array<string>)
```

### Paramètres
- `storageKey` : Clé localStorage (ex: 'organisations-columns')
- `defaultColumns` : Array des IDs de colonnes par défaut

### Exemple d'utilisation
```typescript
// Page Organisations
const { visibleColumns, toggleColumn, resetColumns } = useTableColumns(
  'organisations-columns',
  ['name', 'type', 'country', 'aum', 'language', 'city']
)

// Vérifier si colonne visible
const isVisible = visibleColumns.includes('aum')

// Toggle une colonne
toggleColumn('aum')

// Réinitialiser toutes les colonnes
resetColumns()
```

### Utilisé dans
- `/app/dashboard/organisations/page.tsx`
- `/app/dashboard/people/page.tsx` (6 colonnes)
- `/app/dashboard/mandats/page.tsx` (6 colonnes)

### Composant associé
**ColumnSelector** : Dropdown pour sélectionner colonnes visibles

---

## 2. useSearchFocus ⭐

### Description
Hook pour gérer les effets de focus sur les barres de recherche.

### Fichier
```
crm-frontend/hooks/useSearchFocus.ts
```

### API
```typescript
const {
  isFocused,          // boolean
  handleFocus,        // () => void
  handleBlur          // () => void
} = useSearchFocus()
```

### Exemple d'utilisation
```typescript
const { isFocused, handleFocus, handleBlur } = useSearchFocus()

<input
  type="text"
  onFocus={handleFocus}
  onBlur={handleBlur}
  className={isFocused ? 'ring-2 ring-primary' : ''}
/>
```

### Utilisé dans
- `/components/shared/SearchBar.tsx`
- Toutes les pages avec recherche (Organisations, People, etc.)

---

## 3. useConfirm ⭐⭐⭐

### Description
Hook réutilisable pour afficher des modals de confirmation modernes (remplace window.confirm()).

### Fichier
```
crm-frontend/hooks/useConfirm.tsx
```

### API
```typescript
const confirm = useConfirm()

await confirm({
  title: string,
  message: string,
  type?: 'danger' | 'warning' | 'info' | 'success',  // default: 'danger'
  onConfirm?: () => Promise<void> | void
})
```

### Types visuels
| Type | Couleur | Utilisation |
|------|---------|-------------|
| danger | 🔴 Rouge | Suppressions définitives |
| warning | 🟠 Orange | Actions risquées |
| info | 🔵 Bleu | Informations importantes |
| success | 🟢 Vert | Confirmations positives |

### Exemple d'utilisation
```typescript
const confirm = useConfirm()

const handleDelete = async (id: number) => {
  await confirm({
    title: 'Supprimer cette organisation ?',
    message: 'Cette action est irréversible. Toutes les données seront perdues.',
    type: 'danger',
    onConfirm: async () => {
      await api.delete(`/organisations/${id}`)
      toast.success('Organisation supprimée')
      router.push('/dashboard/organisations')
    }
  })
}
```

### Utilisé dans
- `/app/dashboard/organisations/[id]/page.tsx` (2 confirmations)
- `/app/dashboard/people/[id]/page.tsx` (2 confirmations)
- `/app/dashboard/mandats/[id]/page.tsx` (2 confirmations)
- `/app/dashboard/marketing/mailing-lists/page.tsx`

### Composant associé
**ConfirmDialog** : Modal de confirmation moderne avec animations

### Features
- ✅ Async/await automatique
- ✅ État loading géré
- ✅ Animations smooth (fade + zoom)
- ✅ Backdrop blur
- ✅ Accessible (aria-modal, keyboard support)
- ✅ 4 types visuels

---

## 4. useExport ⭐

### Description
Hook pour gérer les exports CSV/Excel/PDF avec gestion d'erreurs.

### Fichier
```
crm-frontend/hooks/useExport.ts
```

### API
```typescript
const {
  exportCSV,          // (endpoint: string, filename: string) => Promise<void>
  exportExcel,        // (endpoint: string, filename: string) => Promise<void>
  exportPDF,          // (endpoint: string, filename: string) => Promise<void>
  isExporting,        // boolean
  error               // string | null
} = useExport()
```

### Exemple d'utilisation
```typescript
const { exportCSV, exportExcel, isExporting, error } = useExport()

const handleExportCSV = async () => {
  await exportCSV(
    '/api/v1/exports/organisations/csv',
    'organisations.csv'
  )
}

<Button onClick={handleExportCSV} disabled={isExporting}>
  {isExporting ? 'Export en cours...' : 'CSV'}
</Button>

{error && <Alert variant="destructive">{error}</Alert>}
```

### Utilisé dans
- `/components/shared/ExportButtons.tsx` (refactoré 185→111 lignes)

### Features
- ✅ Téléchargement automatique
- ✅ Gestion erreurs réseau
- ✅ État loading
- ✅ Support CSV/Excel/PDF
- ✅ Noms de fichiers personnalisables

---

## 📊 Impact sur le Projet

### Avant les hooks réutilisables
- Code dupliqué dans chaque page
- confirm() natifs du navigateur (UI moche)
- Logique export répétée partout
- Gestion colonnes ad-hoc

### Après les hooks réutilisables
| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Lignes de code ExportButtons | 185 | 111 | -40% |
| Duplications confirm() | 6+ endroits | 0 | ✅ Centralisé |
| Cohérence UX modals | ❌ Incohérent | ✅ 100% cohérent | ⭐ |
| Maintenabilité | 🟡 Moyenne | 🟢 Excellente | ⬆️ |

---

## 🎯 Bonnes Pratiques

### 1. Nomenclature
- Préfixe `use` obligatoire (convention React)
- Nom descriptif (`useConfirm` au lieu de `useModal`)

### 2. Retour de valeur
- Objet pour API flexible : `{ value, action, state }`
- Pas de tableau si > 2 valeurs

### 3. localStorage
- Toujours préfixer : `[module]-[feature]` (ex: 'organisations-columns')
- Fallback si localStorage indisponible

### 4. TypeScript
- Typer les paramètres et retours
- Interfaces pour objets complexes

### 5. Réutilisabilité
- Pas de logique métier spécifique au hook
- Paramètres flexibles
- Documentation claire

---

## 🔗 Ressources Connexes

- [Chapitre 5 - Module Organisations](../../checklists/05-organisations.md)
- [Composants Partagés](../frontend/COMPOSANTS_PARTAGES.md)
- [Architecture Frontend](../frontend/ARCHITECTURE.md)

---

**Dernière mise à jour** : 23 Octobre 2025
