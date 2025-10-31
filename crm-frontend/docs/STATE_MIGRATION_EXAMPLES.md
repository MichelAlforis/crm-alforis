# State Management Migration Examples

Ce document contient des exemples concrets de migration du code existant vers la nouvelle architecture state.

---

## Example 1: Filters & Pagination (URL State)

### ❌ AVANT (useState - état perdu au refresh)
```tsx
'use client'

function OrganisationsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState(50)

  // URL: /organisations (no state in URL)
  // Refresh → state perdu ❌
  // Cannot share filtered view ❌

  const { data } = useQuery({
    queryKey: ['organisations', page, search, category, limit],
    queryFn: () => organisationsAPI.getOrganisations({
      skip: (page - 1) * limit,
      limit,
      category
    })
  })

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {/* ... */}
    </div>
  )
}
```

### ✅ APRÈS (useUrlParams - état dans URL)
```tsx
'use client'

import { useUrlParams } from '@/hooks/useUrlState'

function OrganisationsPage() {
  const [filters, setFilters, resetFilters] = useUrlParams({
    page: 1,
    search: '',
    category: '',
    limit: 50
  })

  // URL: /organisations?page=2&search=test&category=client&limit=50
  // Refresh → state preserved ✅
  // Shareable/bookmarkable ✅
  // Back/Forward buttons work ✅

  const { data } = useQuery({
    queryKey: ['organisations', filters],
    queryFn: () => organisationsAPI.getOrganisations({
      skip: (filters.page - 1) * filters.limit,
      limit: filters.limit,
      category: filters.category
    })
  })

  return (
    <div>
      <input
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
      />

      <select
        value={filters.category}
        onChange={(e) => setFilters({ category: e.target.value, page: 1 })}
      >
        <option value="">All</option>
        <option value="client">Client</option>
        <option value="prospect">Prospect</option>
      </select>

      <button onClick={resetFilters}>Reset Filters</button>

      {/* Pagination */}
      <button onClick={() => setFilters({ page: filters.page - 1 })}>
        Previous
      </button>
      <button onClick={() => setFilters({ page: filters.page + 1 })}>
        Next
      </button>
    </div>
  )
}
```

---

## Example 2: Sidebar State (Zustand)

### ❌ AVANT (useState + prop drilling)
```tsx
// app/dashboard/layout.tsx
function DashboardLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // State perdu au refresh ❌
  // Prop drilling ❌

  return (
    <div>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main>{children}</main>
    </div>
  )
}

// components/Sidebar.tsx
function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={collapsed ? 'w-16' : 'w-64'}>
      <button onClick={onToggle}>Toggle</button>
      {/* Prop drilling continues... */}
    </aside>
  )
}
```

### ✅ APRÈS (Zustand - global + persisted)
```tsx
// app/dashboard/layout.tsx
import { useUIStore, selectSidebarCollapsed } from '@/stores/ui'

function DashboardLayout({ children }) {
  const collapsed = useUIStore(selectSidebarCollapsed)
  // State persisted in localStorage ✅
  // No prop drilling ✅

  return (
    <div>
      <Sidebar />
      <main className={collapsed ? 'ml-16' : 'ml-64'}>
        {children}
      </main>
    </div>
  )
}

// components/Sidebar.tsx
import { useUIStore } from '@/stores/ui'

function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <aside className={collapsed ? 'w-16' : 'w-64'}>
      <button onClick={toggleSidebar}>Toggle</button>
      {/* No props needed ✅ */}
    </aside>
  )
}
```

---

## Example 3: Modals (Zustand)

### ❌ AVANT (useState + props)
```tsx
function OrganisationsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  // Multiple states ❌
  // Props everywhere ❌

  return (
    <div>
      <button onClick={() => setIsCreateModalOpen(true)}>
        Create
      </button>

      {isCreateModalOpen && (
        <CreateModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isEditModalOpen && (
        <EditModal
          data={editData}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditData(null)
          }}
        />
      )}
    </div>
  )
}
```

### ✅ APRÈS (Zustand - centralized)
```tsx
import { useUIStore } from '@/stores/ui'

function OrganisationsPage() {
  const openModal = useUIStore((state) => state.openModal)

  return (
    <div>
      <button onClick={() => openModal('create-organisation')}>
        Create
      </button>

      <button onClick={() => openModal('edit-organisation', { id: 123 })}>
        Edit
      </button>

      {/* Modals rendered in root layout */}
    </div>
  )
}

// app/dashboard/layout.tsx or components/ModalsRoot.tsx
function ModalsRoot() {
  const activeModal = useUIStore((state) => state.activeModal)
  const modalData = useUIStore((state) => state.modalData)
  const closeModal = useUIStore((state) => state.closeModal)

  return (
    <>
      {activeModal === 'create-organisation' && (
        <CreateOrganisationModal onClose={closeModal} />
      )}

      {activeModal === 'edit-organisation' && (
        <EditOrganisationModal
          id={modalData?.id}
          onClose={closeModal}
        />
      )}

      {/* Add more modals here */}
    </>
  )
}
```

---

## Example 4: Bulk Selection (Zustand)

### ❌ AVANT (useState local)
```tsx
function OrganisationsList() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  // State perdu si on navigue ailleurs ❌

  const handleToggle = (id: number) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  const handleBulkDelete = () => {
    // Delete selectedIds
    setSelectedIds(new Set())
  }

  return (
    <div>
      {organisations.map(org => (
        <div key={org.id}>
          <input
            type="checkbox"
            checked={selectedIds.has(org.id)}
            onChange={() => handleToggle(org.id)}
          />
          {org.name}
        </div>
      ))}

      {selectedIds.size > 0 && (
        <button onClick={handleBulkDelete}>
          Delete {selectedIds.size} items
        </button>
      )}
    </div>
  )
}
```

### ✅ APRÈS (Zustand - persisted)
```tsx
import { useUIStore } from '@/stores/ui'

function OrganisationsList() {
  const selectedItems = useUIStore((state) => state.selectedItems)
  const toggleSelection = useUIStore((state) => state.toggleSelection)
  const selectAll = useUIStore((state) => state.selectAll)
  const clearSelection = useUIStore((state) => state.clearSelection)

  const handleBulkDelete = () => {
    // Delete selectedItems
    clearSelection()
  }

  return (
    <div>
      <button onClick={() => selectAll(organisations.map(o => o.id))}>
        Select All
      </button>

      {organisations.map(org => (
        <div key={org.id}>
          <input
            type="checkbox"
            checked={selectedItems.has(org.id)}
            onChange={() => toggleSelection(org.id)}
          />
          {org.name}
        </div>
      ))}

      {selectedItems.size > 0 && (
        <button onClick={handleBulkDelete}>
          Delete {selectedItems.size} items
        </button>
      )}
    </div>
  )
}
```

---

## Example 5: Tabs (URL State)

### ❌ AVANT (useState)
```tsx
function OrganisationDetail({ id }: { id: number }) {
  const [activeTab, setActiveTab] = useState<'info' | 'mandats' | 'activity'>('info')
  // URL: /organisations/123 (no tab state)
  // Cannot share tab ❌

  return (
    <div>
      <div className="tabs">
        <button onClick={() => setActiveTab('info')}>Info</button>
        <button onClick={() => setActiveTab('mandats')}>Mandats</button>
        <button onClick={() => setActiveTab('activity')}>Activity</button>
      </div>

      {activeTab === 'info' && <InfoTab />}
      {activeTab === 'mandats' && <MandatsTab />}
      {activeTab === 'activity' && <ActivityTab />}
    </div>
  )
}
```

### ✅ APRÈS (useUrlState)
```tsx
'use client'

import { useUrlState } from '@/hooks/useUrlState'

function OrganisationDetail({ id }: { id: number }) {
  const [activeTab, setActiveTab] = useUrlState<'info' | 'mandats' | 'activity'>('tab', 'info')
  // URL: /organisations/123?tab=mandats
  // Shareable ✅
  // Back/Forward works ✅

  return (
    <div>
      <div className="tabs">
        <button onClick={() => setActiveTab('info')}>Info</button>
        <button onClick={() => setActiveTab('mandats')}>Mandats</button>
        <button onClick={() => setActiveTab('activity')}>Activity</button>
      </div>

      {activeTab === 'info' && <InfoTab />}
      {activeTab === 'mandats' && <MandatsTab />}
      {activeTab === 'activity' && <ActivityTab />}
    </div>
  )
}
```

---

## Example 6: Display Preferences (Zustand)

### ❌ AVANT (localStorage manual)
```tsx
function OrganisationsList() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('viewMode') as any) || 'list'
    }
    return 'list'
  })

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    localStorage.setItem('viewMode', mode)
  }
  // Manual localStorage management ❌
  // Duplicated across components ❌

  return (
    <div>
      <button onClick={() => handleViewModeChange('list')}>List</button>
      <button onClick={() => handleViewModeChange('grid')}>Grid</button>

      {viewMode === 'list' ? <ListView /> : <GridView />}
    </div>
  )
}
```

### ✅ APRÈS (Zustand with persist)
```tsx
import { useUIStore } from '@/stores/ui'

function OrganisationsList() {
  const viewMode = useUIStore((state) => state.viewMode)
  const setViewMode = useUIStore((state) => state.setViewMode)
  // Auto-persisted ✅
  // Global (shared across pages) ✅

  return (
    <div>
      <button onClick={() => setViewMode('list')}>List</button>
      <button onClick={() => setViewMode('grid')}>Grid</button>

      {viewMode === 'list' ? <ListView /> : <GridView />}
    </div>
  )
}
```

---

## Example 7: Feature Flags (Zustand)

### ❌ AVANT (env variables - requires rebuild)
```tsx
function DashboardPage() {
  const showNewFeature = process.env.NEXT_PUBLIC_FEATURE_NEW_DASHBOARD === 'true'
  // Requires rebuild to toggle ❌
  // Cannot toggle per-user ❌

  return (
    <div>
      {showNewFeature ? <NewDashboard /> : <OldDashboard />}
    </div>
  )
}
```

### ✅ APRÈS (Zustand - runtime toggleable)
```tsx
import { useUIStore } from '@/stores/ui'

function DashboardPage() {
  const isFeatureEnabled = useUIStore((state) => state.isFeatureEnabled)

  return (
    <div>
      {isFeatureEnabled('new-dashboard') ? (
        <NewDashboard />
      ) : (
        <OldDashboard />
      )}
    </div>
  )
}

// Admin panel to toggle features
function FeatureFlagsAdmin() {
  const featureFlags = useUIStore((state) => state.featureFlags)
  const enableFeature = useUIStore((state) => state.enableFeature)
  const disableFeature = useUIStore((state) => state.disableFeature)

  return (
    <div>
      {Object.entries(featureFlags).map(([flag, enabled]) => (
        <div key={flag}>
          <span>{flag}</span>
          <button
            onClick={() => enabled ? disableFeature(flag) : enableFeature(flag)}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## Migration Checklist

Lors de la migration d'un composant, suivre ces étapes:

### 1. Identifier le type de state
- [ ] État d'API? → React Query (déjà en place ✅)
- [ ] Filtres/pagination/tabs? → useUrlState
- [ ] UI global (sidebar/modals)? → Zustand
- [ ] État local temporaire? → useState (OK)

### 2. Pour URL state (filters, tabs, pagination)
- [ ] Remplacer `useState` par `useUrlState` ou `useUrlParams`
- [ ] Tester que l'URL change quand state change
- [ ] Tester refresh → state preserved
- [ ] Tester back/forward buttons

### 3. Pour Zustand (sidebar, modals, selections)
- [ ] Ajouter action dans `stores/ui.ts` si nécessaire
- [ ] Remplacer `useState` par `useUIStore`
- [ ] Utiliser selector pour performance
- [ ] Tester persistence (localStorage)

### 4. Cleanup
- [ ] Supprimer old state logic
- [ ] Supprimer prop drilling
- [ ] Tester que tout fonctionne

---

## Testing

### URL State
```tsx
import { renderHook, act } from '@testing-library/react'
import { useUrlState } from '@/hooks/useUrlState'

test('useUrlState updates URL', () => {
  const { result } = renderHook(() => useUrlState('page', 1))

  act(() => {
    result.current[1](2)
  })

  expect(window.location.search).toContain('page=2')
})
```

### Zustand
```tsx
import { renderHook, act } from '@testing-library/react'
import { useUIStore } from '@/stores/ui'

test('sidebar toggle works', () => {
  const { result } = renderHook(() => useUIStore())

  expect(result.current.sidebarCollapsed).toBe(false)

  act(() => {
    result.current.toggleSidebar()
  })

  expect(result.current.sidebarCollapsed).toBe(true)
})
```

---

## FAQ

**Q: Dois-je migrer tout le code existant immédiatement?**
A: Non! Migrez progressivement. Nouveau code → nouvelle architecture. Code existant → migrer quand vous le modifiez.

**Q: useUrlState vs Zustand pour les filtres?**
A: useUrlState → utilisateur peut partager/bookmark. Zustand → préférences UI (viewMode, density).

**Q: Quand utiliser Context vs Zustand?**
A: Context pour tree-scoped state (ex: form context). Zustand pour truly global state.

**Q: Performance de Zustand?**
A: Très performant si vous utilisez des selectors. `useUIStore(selectValue)` au lieu de `useUIStore()`.

**Q: XState, c'est quand?**
A: Seulement si vous avez un workflow multi-étapes complexe avec rollbacks. Pas pour UI simple.
