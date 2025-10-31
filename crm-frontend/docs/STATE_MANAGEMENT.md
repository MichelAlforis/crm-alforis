# State Management Architecture

## 🎯 Philosophy: Right Tool for the Right Job

Notre architecture state suit le principe **"URL-first + Zustand + React Query"** :

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SERVER STATE          → React Query (TanStack Query v5)   │
│  (API data, cache)                                          │
│                                                              │
│  URL STATE             → Next.js searchParams + useUrlState │
│  (shareable, filters)                                       │
│                                                              │
│  GLOBAL UI STATE       → Zustand (stores/ui.ts)            │
│  (modals, sidebar)                                          │
│                                                              │
│  LOCAL UI STATE        → useState / useReducer              │
│  (form inputs, temp)                                        │
│                                                              │
│  COMPLEX WORKFLOWS     → XState (cas ciblés uniquement)     │
│  (multi-step, rollback)                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Server State: React Query

**Quand utiliser:** API data, cache, loading states, mutations

**Avantages:**
- ✅ Cache automatique avec invalidation intelligente
- ✅ Loading/Error states out-of-the-box
- ✅ Optimistic updates
- ✅ Background refetching
- ✅ Stale-while-revalidate

**Exemple:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organisationsAPI } from '@/lib/api'

function OrganisationsList() {
  const queryClient = useQueryClient()

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['organisations', { page: 1, limit: 50 }],
    queryFn: () => organisationsAPI.getOrganisations({ skip: 0, limit: 50 })
  })

  // Mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (id: number) => organisationsAPI.deleteOrganisation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.items.map(org => (
        <li key={org.id}>
          {org.name}
          <button onClick={() => deleteMutation.mutate(org.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

---

## 2️⃣ URL State: useUrlState

**Quand utiliser:** État partageable/bookmarkable (filters, sort, pagination, tabs)

**Avantages:**
- ✅ URLs shareables → utilisateur peut partager lien avec filtres
- ✅ Back/Forward browser buttons fonctionnent
- ✅ SSR-friendly (searchParams dans Server Components)
- ✅ SEO-friendly

**Exemple:**
```tsx
'use client'

import { useUrlState, useUrlParams } from '@/hooks/useUrlState'

function OrganisationsPage() {
  // Single param
  const [page, setPage] = useUrlState('page', 1)
  const [search, setSearch] = useUrlState('search', '')

  // Multiple params
  const [filters, setFilters, resetFilters] = useUrlParams({
    category: '',
    country: '',
    status: 'active',
    limit: 50
  })

  // URL: /organisations?page=2&search=test&category=client&status=active

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />

      <select
        value={filters.category}
        onChange={(e) => setFilters({ category: e.target.value })}
      >
        <option value="">All Categories</option>
        <option value="client">Client</option>
        <option value="prospect">Prospect</option>
      </select>

      <button onClick={resetFilters}>Reset Filters</button>

      {/* Fetch data using URL state */}
      <OrganisationsList
        page={page}
        search={search}
        filters={filters}
      />
    </div>
  )
}
```

**Server Component (read-only):**
```tsx
import { parseUrlParams } from '@/hooks/useUrlState'

export default function OrganisationsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseUrlParams(new URLSearchParams(searchParams as any), {
    page: 1,
    limit: 50,
    search: ''
  })

  // Use filters to fetch data server-side
  const organisations = await organisationsAPI.getOrganisations({
    skip: (filters.page - 1) * filters.limit,
    limit: filters.limit
  })

  return <OrganisationsList data={organisations} />
}
```

---

## 3️⃣ Global UI State: Zustand

**Quand utiliser:** UI state global (modals, sidebar, toasts, selections, preferences)

**Avantages:**
- ✅ Simple API (pas de boilerplate)
- ✅ Performant (re-renders uniquement ce qui change)
- ✅ Persistence automatique (localStorage)
- ✅ DevTools support

**Store structure:**
```
stores/
├── ui.ts              # UI global (sidebar, modals, toasts, selections)
└── [future]           # Ajouter d'autres stores si besoin
```

**Exemple:**
```tsx
import { useUIStore } from '@/stores/ui'

function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <aside className={collapsed ? 'w-16' : 'w-64'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  )
}

function CreateOrganisationButton() {
  const openModal = useUIStore((state) => state.openModal)

  return (
    <button onClick={() => openModal('create-organisation')}>
      Create Organisation
    </button>
  )
}

function ModalsRoot() {
  const activeModal = useUIStore((state) => state.activeModal)
  const closeModal = useUIStore((state) => state.closeModal)

  return (
    <>
      {activeModal === 'create-organisation' && (
        <CreateOrganisationModal onClose={closeModal} />
      )}
    </>
  )
}
```

**Selectors (performance):**
```tsx
import { useUIStore, selectSidebarCollapsed } from '@/stores/ui'

// ❌ BAD - re-renders on ANY state change
const state = useUIStore()

// ✅ GOOD - re-renders only when sidebarCollapsed changes
const collapsed = useUIStore(selectSidebarCollapsed)
```

**Persist state:**
```tsx
// Automatically persisted to localStorage under key 'crm-ui-state'
// Only: sidebarCollapsed, viewMode, density, featureFlags

// Not persisted: toasts, activeModal (transient state)
```

---

## 4️⃣ Local UI State: useState

**Quand utiliser:** État temporaire local à un composant (form inputs, toggles)

**Exemple:**
```tsx
function SearchInput() {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  )
}
```

---

## 5️⃣ Complex Workflows: XState (Optional)

**Quand utiliser:** Workflows multi-étapes avec états complexes, rollbacks, side-effects

**Cas d'usage:**
- Onboarding multi-étapes
- Wizards avec validation conditionnelle
- Processus avec rollback (ex: création mandat → produits → validation)

**⚠️ À utiliser avec parcimonie** - seulement quand la logique devient vraiment complexe.

**Exemple (si nécessaire à l'avenir):**
```tsx
import { createMachine } from 'xstate'

const onboardingMachine = createMachine({
  id: 'onboarding',
  initial: 'welcome',
  states: {
    welcome: {
      on: { NEXT: 'profile' }
    },
    profile: {
      on: {
        NEXT: 'organisation',
        BACK: 'welcome'
      }
    },
    organisation: {
      on: {
        NEXT: 'complete',
        BACK: 'profile'
      }
    },
    complete: {
      type: 'final'
    }
  }
})
```

---

## 📋 Decision Tree: Quel state utiliser?

```
┌─ État lié à l'API (fetch, mutations)?
│  └─ ✅ React Query
│
├─ État partageable via URL (filters, pagination)?
│  └─ ✅ useUrlState / useUrlParams
│
├─ État global UI (sidebar, modals)?
│  └─ ✅ Zustand (stores/ui.ts)
│
├─ État local temporaire (form input)?
│  └─ ✅ useState / useReducer
│
└─ Workflow multi-étapes complexe?
   └─ ✅ XState (cas ciblés)
```

---

## 🚀 Migration Examples

### Before (useState everywhere):
```tsx
function OrganisationsList() {
  const [sidebarOpen, setSidebarOpen] = useState(true) // ❌ Local
  const [page, setPage] = useState(1) // ❌ Not in URL
  const [organisations, setOrganisations] = useState([]) // ❌ Manual fetch
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/organisations')
      .then(res => res.json())
      .then(setOrganisations)
      .finally(() => setLoading(false))
  }, [page])

  return <div>...</div>
}
```

### After (proper architecture):
```tsx
function OrganisationsList() {
  const sidebarOpen = useUIStore(selectSidebarCollapsed) // ✅ Zustand
  const [page, setPage] = useUrlState('page', 1) // ✅ URL state

  const { data, isLoading } = useQuery({ // ✅ React Query
    queryKey: ['organisations', { page }],
    queryFn: () => organisationsAPI.getOrganisations({ skip: (page - 1) * 50 })
  })

  return <div>...</div>
}
```

---

## 📚 Best Practices

1. **URL-first for filters** - Si l'utilisateur peut vouloir partager l'état → URL
2. **React Query for API** - JAMAIS de `useState` pour les données d'API
3. **Zustand for global UI** - Sidebar, modals, toasts, selections, preferences
4. **useState for local** - Form inputs, temporary toggles
5. **Selectors for performance** - `useUIStore(selectSpecificValue)` au lieu de `useUIStore()`
6. **Avoid prop drilling** - Si vous passez du state sur 3+ niveaux → Zustand ou Context
7. **XState avec parcimonie** - Seulement pour workflows vraiment complexes

---

## 🔗 Resources

- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [React Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [XState Docs](https://xstate.js.org/docs/) (si besoin)
