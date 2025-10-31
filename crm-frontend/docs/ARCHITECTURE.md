# Architecture Frontend - CRM Alforis Finance

**Document d'Architecture Technique**
**Version:** 2.0.0
**Date:** 31 Octobre 2025
**Auteur:** Analyse complète du codebase

---

## Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Stack Technologique](#stack-technologique)
3. [Architecture des Dossiers](#architecture-des-dossiers)
4. [Architecture Applicative](#architecture-applicative)
5. [Patterns et Conventions](#patterns-et-conventions)
6. [Gestion de l'État](#gestion-de-letat)
7. [Architecture API](#architecture-api)
8. [Routing et Navigation](#routing-et-navigation)
9. [Composants UI](#composants-ui)
10. [Authentification et Sécurité](#authentification-et-securite)
11. [Performance et Optimisation](#performance-et-optimisation)
12. [Progressive Web App (PWA)](#progressive-web-app-pwa)
13. [Tests](#tests)
14. [Points d'Amélioration](#points-damelioration)

---

## 1. Vue d'Ensemble

### 1.1 Description

Application CRM moderne développée avec **Next.js 15**, utilisant **TypeScript** et **React 18**. L'application est conçue pour gérer les organisations, personnes, mandats, produits financiers, campagnes email, tâches et intégrations IA.

### 1.2 Métriques du Projet

```
- Langage: TypeScript (strict mode)
- Framework: Next.js 15.0.0
- Routes: 83+ pages
- Composants: ~160 fichiers .tsx
- Hooks personnalisés: ~69 hooks
- API Modules: 13 modules
- Stores Zustand: 2 (sidebar, ui)
```

### 1.3 Caractéristiques Principales

- **Progressive Web App (PWA)** avec support offline
- **Server-Side Rendering (SSR)** et Static Generation
- **Authentification** basée sur JWT
- **Real-time updates** avec React Query
- **Design System** professionnel avec Tailwind CSS
- **Command Palette** (⌘K/Ctrl+K) pour navigation rapide
- **Dark Mode** natif
- **Responsive Design** avec Container Queries
- **AI Integration** pour autofill et suggestions

---

## 2. Stack Technologique

### 2.1 Core Framework

| Technologie | Version | Usage |
|------------|---------|-------|
| **Next.js** | 15.0.0 | Framework React avec SSR/SSG |
| **React** | 18.3.1 | UI Library |
| **TypeScript** | 5.3.0 | Type Safety (strict mode) |
| **Node.js** | 20+ | Runtime |

### 2.2 État et Data Fetching

| Technologie | Version | Usage |
|------------|---------|-------|
| **@tanstack/react-query** | 5.90.5 | Server state management, caching |
| **Zustand** | 4.5.7 | Client state (UI, sidebar) |
| **Axios** | 1.6.0 | HTTP client |

### 2.3 UI et Styling

| Technologie | Version | Usage |
|------------|---------|-------|
| **Tailwind CSS** | 3.3.0 | Utility-first CSS |
| **Framer Motion** | 12.23.24 | Animations |
| **Lucide React** | 0.294.0 | Icons |
| **Recharts** | 2.15.4 | Charts et visualisations |
| **@xyflow/react** | 12.0.0 | Workflow diagrams |

### 2.4 Forms et Validation

| Technologie | Version | Usage |
|------------|---------|-------|
| **React Hook Form** | 7.48.0 | Form management |
| **Zod** | 3.22.0 | Schema validation |
| **@hookform/resolvers** | 3.3.0 | Integration RHF + Zod |

### 2.5 PWA et Performance

| Technologie | Version | Usage |
|------------|---------|-------|
| **@ducanh2912/next-pwa** | 10.2.9 | PWA support |
| **next-themes** | 0.2.1 | Dark mode |

### 2.6 Testing

| Technologie | Version | Usage |
|------------|---------|-------|
| **Vitest** | 4.0.6 | Unit tests |
| **@testing-library/react** | 16.3.0 | Component testing |
| **Playwright** | Latest | E2E tests |
| **Cypress** | Latest | E2E tests (legacy) |

---

## 3. Architecture des Dossiers

```
crm-frontend/
│
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API Routes (Next.js handlers)
│   ├── auth/                     # Pages d'authentification
│   │   ├── login/
│   │   ├── logout/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/                # Pages applicatives (protégées)
│   │   ├── layout.tsx            # Layout principal avec Sidebar/Navbar
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── organisations/
│   │   ├── people/
│   │   ├── mandats/
│   │   ├── produits/
│   │   ├── campaigns/
│   │   ├── email-campaigns/
│   │   ├── workflows/
│   │   ├── tasks/
│   │   ├── kpis/
│   │   ├── ai/
│   │   ├── settings/
│   │   └── ...
│   ├── legal/                    # Pages légales (CGU, Privacy)
│   └── oauth/                    # OAuth callbacks
│
├── components/                   # Composants React (~160 fichiers)
│   ├── activities/               # Activités et timeline
│   ├── ai/                       # Composants IA
│   ├── autofill/                 # Autofill HITL
│   ├── dashboard/                # Widgets dashboard
│   ├── dashboard-v2/             # Widgets V2 optimisés
│   ├── email/                    # Email editor et templates
│   ├── feedback/                 # Toasts, notifications
│   ├── forms/                    # Form components réutilisables
│   ├── help/                     # Help center, docs
│   ├── interactions/             # Modal interactions
│   ├── mandats/                  # Composants mandats
│   ├── marketing/                # Mailing lists, campaigns
│   ├── modals/                   # Modal components
│   ├── navigation/               # Breadcrumbs, navigation
│   ├── onboarding/               # Tour guidé
│   ├── organisations/            # Composants organisations
│   ├── people/                   # Composants people
│   ├── performance/              # Web vitals monitoring
│   ├── providers/                # Context providers
│   ├── pwa/                      # PWA components (install, offline)
│   ├── search/                   # Global search
│   ├── settings/                 # Settings pages/forms
│   ├── shared/                   # Composants partagés globaux
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   ├── CommandPaletteV3.tsx
│   │   └── NavigationProgress.tsx
│   ├── tasks/                    # Tâches, Kanban
│   ├── ui/                       # UI primitives (design system)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   └── workflows/                # Workflow builder
│
├── hooks/                        # Custom React Hooks (~69 hooks)
│   ├── useAuth.ts                # Authentification
│   ├── useAI.ts                  # IA features
│   ├── useActivities.ts          # Activités
│   ├── useFilters.ts             # Filtres tableaux
│   ├── useExport.ts              # Export CSV/Excel
│   ├── useEntityDetail.ts        # Pages détail
│   ├── useContextMenu.ts         # Context menu
│   ├── useDebounce.ts            # Debounce
│   └── ...
│
├── lib/                          # Logique métier et utilitaires
│   ├── api/                      # Client API modulaire
│   │   ├── core/
│   │   │   └── client.ts         # BaseHttpClient
│   │   ├── modules/              # API modules (13 modules)
│   │   │   ├── auth.ts
│   │   │   ├── organisations.ts
│   │   │   ├── people.ts
│   │   │   ├── mandats.ts
│   │   │   ├── produits.ts
│   │   │   ├── tasks.ts
│   │   │   ├── email.ts
│   │   │   ├── webhooks.ts
│   │   │   ├── ai.ts
│   │   │   ├── kpi.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── integrations.ts
│   │   │   └── search.ts
│   │   └── index.ts              # Exports et legacy client
│   ├── constants/                # Constantes centralisées
│   │   ├── api.ts                # 100+ API endpoints
│   │   ├── routes.ts             # Routes app typées
│   │   ├── storage.ts            # LocalStorage SSR-safe
│   │   ├── labels.ts             # Labels UI
│   │   └── ...
│   ├── enums/                    # Enums TypeScript
│   ├── types/                    # Types TypeScript
│   ├── dashboard/                # Logique dashboard
│   └── logger.ts                 # Logging utility
│
├── stores/                       # Zustand stores
│   ├── sidebar.ts                # État sidebar (collapsed, favorites)
│   └── ui.ts                     # État UI global (modals, toasts)
│
├── styles/                       # Styles globaux
│   ├── globals.css               # Reset, variables CSS
│   └── design-system.css         # Design tokens
│
├── types/                        # Type definitions globales
│   ├── index.ts
│   ├── activity.ts
│   ├── ai.ts
│   ├── interaction.ts
│   └── email-marketing.ts
│
├── utils/                        # Utilitaires
│
├── public/                       # Assets statiques
│   ├── favicon/
│   ├── templates/
│   └── manifest.json             # PWA manifest
│
├── __tests__/                    # Tests unitaires
│   ├── hooks/
│   ├── lib/
│   └── ai/
│
├── e2e/                          # Tests Playwright E2E
├── cypress/                      # Tests Cypress E2E (legacy)
│
├── middleware.ts                 # Next.js middleware (auth)
├── next.config.js                # Configuration Next.js
├── tailwind.config.js            # Configuration Tailwind
├── tsconfig.json                 # Configuration TypeScript
├── vitest.config.ts              # Configuration Vitest
└── playwright.config.ts          # Configuration Playwright
```

---

## 4. Architecture Applicative

### 4.1 Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / PWA                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js 15 App Router (SSR/SSG)            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Middleware (Auth Guard)                          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App Routes                                       │  │
│  │  - /auth/login                                    │  │
│  │  - /dashboard/*  (Protected)                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                React Components Layer                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layout Components                                │  │
│  │  - DashboardLayout (Sidebar + Navbar + Footer)    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Page Components                                  │  │
│  │  - OrganisationsPage, PeoplePage, etc.           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Feature Components                               │  │
│  │  - TableV2, Modals, Forms                        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  UI Primitives                                    │  │
│  │  - Button, Input, Dialog, Select                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                ▼                        ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   State Management       │  │   Custom Hooks           │
│                          │  │                          │
│  - React Query           │  │  - useAuth               │
│    (Server State)        │  │  - useFilters            │
│                          │  │  - useExport             │
│  - Zustand               │  │  - useAI                 │
│    (UI State)            │  │  - useActivities         │
│    • sidebar.ts          │  │  - etc. (~69 hooks)      │
│    • ui.ts               │  │                          │
└──────────────────────────┘  └──────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│              API Layer (Modular Architecture)           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  BaseHttpClient (Axios)                           │  │
│  │  - Token management                               │  │
│  │  - Error handling                                 │  │
│  │  - Request/Response interceptors                  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  API Modules (13 modules)                         │  │
│  │  - authAPI, organisationsAPI, peopleAPI          │  │
│  │  - mandatsAPI, emailAPI, aiAPI, etc.             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (FastAPI)                      │
│              http://localhost:8000/api/v1               │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Flux de Données

```
User Action
    │
    ▼
Component Event Handler
    │
    ▼
Custom Hook (useQuery/useMutation)
    │
    ▼
API Module (organisationsAPI.getOrganisations)
    │
    ▼
BaseHttpClient (Axios)
    │
    ▼
Backend API
    │
    ▼
Response
    │
    ▼
React Query Cache Update
    │
    ▼
Component Re-render
```

### 4.3 Pattern de Rendu

L'application utilise une combinaison de :

1. **Server-Side Rendering (SSR)** pour les pages protégées
2. **Client-Side Rendering (CSR)** pour les interactions dynamiques
3. **Static Generation (SSG)** pour les pages publiques (legal, etc.)

Tous les layouts et pages dans `/app/dashboard` sont marqués `'use client'` pour permettre l'interactivité.

---

## 5. Patterns et Conventions

### 5.1 Patterns de Code

#### 5.1.1 Component Pattern

```typescript
// components/organisations/OrganisationCard.tsx
'use client'

import { Organisation } from '@/types'

interface OrganisationCardProps {
  organisation: Organisation
  onEdit?: (id: number) => void
}

export function OrganisationCard({ organisation, onEdit }: OrganisationCardProps) {
  // Component logic
  return (
    <div className="card">
      {/* JSX */}
    </div>
  )
}
```

#### 5.1.2 Custom Hook Pattern

```typescript
// hooks/useOrganisations.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organisationsAPI } from '@/lib/api'

export function useOrganisations() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['organisations'],
    queryFn: () => organisationsAPI.getOrganisations(),
  })

  const createMutation = useMutation({
    mutationFn: organisationsAPI.createOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
    },
  })

  return {
    organisations: data,
    isLoading,
    error,
    createOrganisation: createMutation.mutate,
  }
}
```

#### 5.1.3 API Module Pattern

```typescript
// lib/api/modules/organisations.ts
import { BaseHttpClient } from '../core/client'
import { API_ENDPOINTS } from '@/lib/constants'

export class OrganisationsAPI extends BaseHttpClient {
  async getOrganisations(params?: any) {
    return this.get(API_ENDPOINTS.ORGANISATIONS.LIST, { params })
  }

  async createOrganisation(data: any) {
    return this.post(API_ENDPOINTS.ORGANISATIONS.CREATE, data)
  }
}

export const organisationsAPI = new OrganisationsAPI()
```

### 5.2 Conventions de Nommage

| Type | Convention | Exemple |
|------|-----------|---------|
| Composants | PascalCase | `OrganisationCard.tsx` |
| Hooks | camelCase avec préfixe `use` | `useOrganisations.ts` |
| Stores | camelCase | `sidebar.ts` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS` |
| Types/Interfaces | PascalCase | `Organisation`, `ApiResponse` |
| Fonctions | camelCase | `fetchOrganisations` |
| Fichiers utils | kebab-case | `format-date.ts` |

### 5.3 Structure de Fichier Standard

```typescript
// 1. Imports externes
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Imports internes (lib, types)
import { organisationsAPI } from '@/lib/api'
import { Organisation } from '@/types'

// 3. Imports composants
import { Button } from '@/components/ui/button'

// 4. Types/Interfaces
interface ComponentProps {
  id: number
}

// 5. Composant/Fonction principale
export function Component({ id }: ComponentProps) {
  // Logic
}

// 6. Exports auxiliaires (si nécessaire)
export const helper = () => {}
```

### 5.4 Patterns d'Optimisation

#### 5.4.1 React Query Caching

```typescript
// Stale time de 1 minute par défaut
const { data } = useQuery({
  queryKey: ['organisations', filters],
  queryFn: () => organisationsAPI.getOrganisations(filters),
  staleTime: 60_000, // 1 minute
})
```

#### 5.4.2 Lazy Loading

```typescript
// Dynamic imports pour code splitting
const EmailEditor = dynamic(() => import('@/components/email/EmailEditor'), {
  ssr: false,
  loading: () => <Skeleton />
})
```

---

## 6. Gestion de l'État

### 6.1 Architecture de l'État

L'application utilise une approche **hybride** pour la gestion d'état :

```
┌────────────────────────────────────────────────────────┐
│                    État Application                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Server State (React Query)                   │    │
│  │  - Données API (organisations, people, etc.)  │    │
│  │  - Cache intelligent                          │    │
│  │  - Synchronisation background                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Client State (Zustand)                       │    │
│  │  - UI state (modals, toasts)                  │    │
│  │  - Sidebar state (collapsed, favorites)       │    │
│  │  - Preferences (theme, density)               │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Local State (useState)                       │    │
│  │  - Form inputs                                │    │
│  │  - Component-specific state                   │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  URL State (useSearchParams)                  │    │
│  │  - Filtres, pagination                        │    │
│  │  - State partageable                          │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 6.2 React Query (Server State)

**Usage**: Gestion de toutes les données provenant de l'API

**Configuration**:
```typescript
// components/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})
```

**Avantages**:
- ✅ Cache automatique
- ✅ Invalidation intelligente
- ✅ Background refetch
- ✅ Optimistic updates
- ✅ Retry automatique

**Exemple**:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['organisations', filters],
  queryFn: () => organisationsAPI.getOrganisations(filters),
})
```

### 6.3 Zustand (Client State)

**Usage**: État UI global, préférences utilisateur

#### 6.3.1 Sidebar Store

**Fichier**: `stores/sidebar.ts`

**État géré**:
- Collapsed state (sidebar réduite/étendue)
- Mobile open (menu mobile ouvert/fermé)
- Favoris (liens favoris utilisateur)
- Hidden sections (sections masquées)
- Open submenus (sous-menus ouverts)

**Persistance**: LocalStorage via middleware `persist`

```typescript
export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      collapsed: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      // ...
    }),
    {
      name: 'crm-sidebar-state',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

#### 6.3.2 UI Store

**Fichier**: `stores/ui.ts`

**État géré**:
- Modals (activeModal, modalData)
- Toasts (notifications temporaires)
- Selections (bulk actions)
- View mode (list/grid/kanban)
- Density (comfortable/compact/spacious)
- Feature flags (dark-mode, ai-autofill, etc.)

**Exemple**:
```typescript
const { openModal, closeModal } = useUIStore()

openModal('create-organisation', { prefillData: {...} })
```

### 6.4 Local State (useState)

**Usage**: État spécifique au composant, formulaires

**Exemple**:
```typescript
const [searchQuery, setSearchQuery] = useState('')
const [isOpen, setIsOpen] = useState(false)
```

### 6.5 URL State (useSearchParams)

**Usage**: Filtres, pagination, tri (shareable via URL)

**Exemple**:
```typescript
const searchParams = useSearchParams()
const page = Number(searchParams.get('page') || '1')
const search = searchParams.get('search') || ''
```

---

## 7. Architecture API

### 7.1 Architecture Modulaire

L'API client est organisée en **modules indépendants** :

```
lib/api/
├── core/
│   └── client.ts              # BaseHttpClient (Axios wrapper)
├── modules/
│   ├── auth.ts                # AuthAPI
│   ├── organisations.ts       # OrganisationsAPI
│   ├── people.ts              # PeopleAPI
│   ├── mandats.ts             # MandatsAPI
│   ├── produits.ts            # ProduitsAPI
│   ├── tasks.ts               # TasksAPI
│   ├── email.ts               # EmailAPI
│   ├── webhooks.ts            # WebhooksAPI
│   ├── ai.ts                  # AIAPI
│   ├── kpi.ts                 # KPIAPI
│   ├── dashboard.ts           # DashboardAPI
│   ├── integrations.ts        # IntegrationsAPI
│   └── search.ts              # SearchAPI
└── index.ts                   # Exports + Legacy compatibility
```

### 7.2 BaseHttpClient

**Fichier**: `lib/api/core/client.ts`

**Responsabilités**:
- Wrapper autour d'Axios
- Gestion du token JWT (localStorage)
- Interceptors pour headers, erreurs
- Méthodes HTTP (get, post, put, patch, delete)

**Pseudo-code**:
```typescript
export class BaseHttpClient {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    })

    // Request interceptor (ajoute le token)
    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor (gestion erreurs)
    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // Error handling
        throw error
      }
    )
  }

  get(url: string, config?: any) {
    return this.axiosInstance.get(url, config)
  }

  post(url: string, data?: any, config?: any) {
    return this.axiosInstance.post(url, data, config)
  }

  // ...
}
```

### 7.3 API Modules

Chaque module hérite de `BaseHttpClient` et expose des méthodes spécifiques :

**Exemple**: `lib/api/modules/organisations.ts`

```typescript
export class OrganisationsAPI extends BaseHttpClient {
  async getOrganisations(params?: OrganisationFilters) {
    return this.get(API_ENDPOINTS.ORGANISATIONS.LIST, { params })
  }

  async getOrganisation(id: number) {
    return this.get(API_ENDPOINTS.ORGANISATIONS.DETAIL(id))
  }

  async createOrganisation(data: CreateOrganisationRequest) {
    return this.post(API_ENDPOINTS.ORGANISATIONS.CREATE, data)
  }

  async updateOrganisation(id: number, data: UpdateOrganisationRequest) {
    return this.put(API_ENDPOINTS.ORGANISATIONS.UPDATE(id), data)
  }

  async deleteOrganisation(id: number) {
    return this.delete(API_ENDPOINTS.ORGANISATIONS.DELETE(id))
  }
}

export const organisationsAPI = new OrganisationsAPI()
```

### 7.4 Endpoints Centralisés

**Fichier**: `lib/constants/api.ts`

Tous les endpoints sont centralisés pour éviter les magic strings :

```typescript
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/token',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  ORGANISATIONS: {
    LIST: '/organisations/',
    DETAIL: (id: number) => `/organisations/${id}`,
    CREATE: '/organisations/',
    UPDATE: (id: number) => `/organisations/${id}`,
    DELETE: (id: number) => `/organisations/${id}`,
  },
  // ... 100+ endpoints
}
```

### 7.5 Gestion des Erreurs

Les erreurs API sont gérées à plusieurs niveaux :

1. **BaseHttpClient**: Interceptor global
2. **React Query**: `onError` callbacks
3. **Custom Hooks**: Error state
4. **UI**: Toast notifications

---

## 8. Routing et Navigation

### 8.1 Next.js App Router

L'application utilise **Next.js 15 App Router** avec convention file-system :

```
app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Landing page (/)
├── auth/
│   ├── login/page.tsx            # /auth/login
│   ├── logout/page.tsx           # /auth/logout
│   └── ...
└── dashboard/
    ├── layout.tsx                # Dashboard layout (Sidebar + Navbar)
    ├── page.tsx                  # /dashboard (main dashboard)
    ├── organisations/
    │   ├── page.tsx              # /dashboard/organisations (liste)
    │   ├── [id]/page.tsx         # /dashboard/organisations/123 (détail)
    │   └── new/page.tsx          # /dashboard/organisations/new
    ├── people/
    │   ├── page.tsx
    │   └── [id]/page.tsx
    └── ...
```

### 8.2 Middleware (Auth Guard)

**Fichier**: `middleware.ts`

Protection des routes `/dashboard/*` :

```typescript
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const protectedRoutes = ['/dashboard']
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected) {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}
```

### 8.3 Navigation Components

#### 8.3.1 Sidebar

**Fichier**: `components/shared/Sidebar.tsx`

- Navigation principale avec sections et sous-menus
- Support collapse/expand
- Favoris utilisateur
- Gestion de l'état via Zustand (`useSidebarStore`)

#### 8.3.2 Navbar

**Fichier**: `components/shared/Navbar.tsx`

- Search globale
- Notifications
- User menu
- Command Palette trigger (⌘K)

#### 8.3.3 Breadcrumbs

**Fichier**: `components/navigation/Breadcrumbs.tsx`

- Navigation contextuelle
- Auto-generated from route
- Affichage dans le DashboardLayout

#### 8.3.4 Command Palette

**Fichier**: `components/shared/CommandPaletteV3.tsx`

- Raccourci clavier: `⌘K` (Mac) ou `Ctrl+K` (Windows)
- Navigation rapide vers toutes les pages
- Actions rapides (créer organisation, etc.)
- Search intelligente

### 8.4 Routes Centralisées

**Fichier**: `lib/constants/routes.ts`

Toutes les routes sont typées et centralisées :

```typescript
export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
  },
  DASHBOARD: {
    HOME: '/dashboard',
    ORGANISATIONS: '/dashboard/organisations',
    PEOPLE: '/dashboard/people',
    MANDATS: '/dashboard/mandats',
    // ...
  },
}
```

---

## 9. Composants UI

### 9.1 Design System

L'application utilise un design system professionnel basé sur **Tailwind CSS** avec des composants primitives réutilisables.

**Fichier de config**: `tailwind.config.js`

### 9.2 Variables de Design

#### 9.2.1 Couleurs

```css
/* styles/globals.css */
:root {
  --color-background: 255 255 255;
  --color-foreground: 15 23 42;
  --color-primary: 59 130 246;
  --color-success: 34 197 94;
  --color-warning: 234 179 8;
  --color-danger: 239 68 68;
}

.dark {
  --color-background: 15 23 42;
  --color-foreground: 241 245 249;
}
```

#### 9.2.2 Spacing

Système d'espacement basé sur **8px** :

```javascript
spacing: {
  'spacing-xs': '4px',   // 0.5 units
  'spacing-sm': '8px',   // 1 unit
  'spacing-md': '16px',  // 2 units
  'spacing-lg': '24px',  // 3 units
  'spacing-xl': '32px',  // 4 units
  'spacing-2xl': '48px', // 6 units
}
```

#### 9.2.3 Fluid Typography & Spacing

Utilisation de `clamp()` pour responsive :

```javascript
fontSize: {
  'fluid-base': ['clamp(0.9rem, 1.2vw, 1.1rem)', { lineHeight: '1.6' }],
  'fluid-xl': ['clamp(1.1rem, 2vw, 1.5rem)', { lineHeight: '1.5' }],
}

spacing: {
  'fluid-4': 'clamp(1rem, 2vw, 1.5rem)',    // 16-24px
  'fluid-6': 'clamp(1.5rem, 3vw, 2.5rem)',  // 24-40px
}
```

### 9.3 Composants UI Primitives

**Localisation**: `components/ui/`

| Composant | Description | Variants |
|-----------|-------------|----------|
| `button.tsx` | Boutons | primary, secondary, outline, ghost, danger |
| `input.tsx` | Champs de texte | default, error |
| `select.tsx` | Dropdown select | default |
| `dialog.tsx` | Modal dialogs | default, alert |
| `checkbox.tsx` | Cases à cocher | default, indeterminate |
| `textarea.tsx` | Zone de texte multi-lignes | default |
| `label.tsx` | Labels de formulaire | default |
| `badge.tsx` | Badges | default, success, warning, danger |
| `card.tsx` | Conteneur card | default |
| `tabs.tsx` | Onglets | default |
| `tooltip.tsx` | Info-bulles | default |
| `Toast.tsx` | Notifications toast | success, error, warning, info |
| `Skeleton.tsx` | Loading skeletons | default, text, circle |

### 9.4 Container Queries

Support des **Container Queries** pour composants responsives :

```jsx
<div className="@container">
  <div className="grid @lg:grid-cols-2 @xl:grid-cols-3">
    {/* Responsive based on container width */}
  </div>
</div>
```

### 9.5 Animations

Animations avec **Framer Motion** :

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

Animations Tailwind natives :

```javascript
animation: {
  'fade-in': 'fadeIn 0.3s ease-out',
  'slide-up': 'slideUp 0.3s ease-out',
  'shimmer': 'shimmer 2s linear infinite',
}
```

---

## 10. Authentification et Sécurité

### 10.1 Flux d'Authentification

```
┌──────────────────────────────────────────────────────────┐
│                  Flux d'Authentification                 │
└──────────────────────────────────────────────────────────┘

1. User Login
   │
   ├─> LoginForm (/auth/login)
   │   │
   │   ├─> useAuth().login(credentials)
   │   │   │
   │   │   ├─> apiClient.login() → POST /auth/token
   │   │   │   │
   │   │   │   └─> Backend validation
   │   │   │       │
   │   │   │       └─> Returns { access_token, user }
   │   │   │
   │   │   ├─> apiClient.setToken(access_token)
   │   │   │   │
   │   │   │   └─> localStorage.setItem('auth_token', token)
   │   │   │
   │   │   ├─> apiClient.getCurrentUser() → GET /auth/me
   │   │   │   │
   │   │   │   └─> Returns user profile
   │   │   │
   │   │   └─> router.push('/dashboard')
   │   │
   │   └─> Success: Redirect to /dashboard

2. Protected Route Access
   │
   ├─> Middleware.ts
   │   │
   │   ├─> Check cookie 'auth_token'
   │   │   │
   │   │   ├─> Token exists → Allow
   │   │   └─> No token → Redirect to /auth/login
   │
   └─> DashboardLayout.tsx
       │
       ├─> useAuth() checks authentication
       │   │
       │   ├─> apiClient.getToken() from localStorage
       │   │   │
       │   │   ├─> Token exists → apiClient.getCurrentUser()
       │   │   │   │
       │   │   │   ├─> Success → Set isAuthenticated = true
       │   │   │   └─> Error → Redirect to /auth/login
       │   │   │
       │   │   └─> No token → Redirect to /auth/login
       │
       └─> Render dashboard

3. API Requests
   │
   ├─> BaseHttpClient request interceptor
   │   │
   │   ├─> Get token from localStorage
   │   │
   │   └─> Add header: Authorization: Bearer {token}
   │
   └─> Backend validates JWT
```

### 10.2 useAuth Hook

**Fichier**: `hooks/useAuth.ts`

**Responsabilités**:
- Login/Logout
- Token management
- User profile
- Authentication state

**État géré**:
```typescript
interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user?: User
  error?: string
}
```

**Méthodes**:
- `login(credentials)`: Authentification
- `logout()`: Déconnexion
- `isAuthenticated`: État d'authentification
- `user`: Profil utilisateur

### 10.3 Sécurité

#### 10.3.1 Headers de Sécurité

**Fichier**: `next.config.js`

```javascript
headers: [
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'...",
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]
```

#### 10.3.2 HTTPS Only

Production utilise HTTPS obligatoire (géré par Nginx).

#### 10.3.3 Token Storage

- Tokens JWT stockés dans `localStorage`
- Cookies httpOnly pour refresh tokens (à implémenter)

#### 10.3.4 CORS

- En dev: Proxy via Next.js rewrites (`/_devapi/*`)
- En prod: Même domaine (pas de CORS)

---

## 11. Performance et Optimisation

### 11.1 Stratégies de Performance

#### 11.1.1 Code Splitting

```typescript
// Dynamic imports pour réduire bundle size
const EmailEditor = dynamic(() => import('@/components/email/EmailEditor'), {
  ssr: false,
  loading: () => <Skeleton />
})
```

#### 11.1.2 React Query Caching

```typescript
// Cache intelligent avec stale time
const { data } = useQuery({
  queryKey: ['organisations'],
  queryFn: fetchOrganisations,
  staleTime: 60_000, // 1 minute
})
```

#### 11.1.3 Image Optimization

```jsx
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // Pour images above the fold
/>
```

#### 11.1.4 Bundle Analyzer

```bash
ANALYZE=true npm run build
```

### 11.2 PWA Caching

**Fichier**: `next.config.js`

Stratégies de cache pour assets :

```javascript
runtimeCaching: [
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'images',
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60, // 24h
      },
    },
  },
  // ... autres patterns
]
```

### 11.3 Web Vitals Monitoring

**Fichier**: `components/performance/WebVitalsReporter.tsx`

Monitoring des Core Web Vitals :
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)

### 11.4 Turbopack

En développement, Next.js 15 utilise **Turbopack** :

```bash
npm run dev  # Turbopack enabled by default
```

---

## 12. Progressive Web App (PWA)

### 12.1 Configuration

**Package**: `@ducanh2912/next-pwa`

**Fichier**: `next.config.js`

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})
```

### 12.2 Manifest

**Fichier**: `public/manifest.json`

```json
{
  "name": "CRM Alforis Finance",
  "short_name": "CRM Alforis",
  "description": "Application CRM pour Alforis Finance",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [...]
}
```

### 12.3 Composants PWA

#### 12.3.1 PWA Install Prompt

**Fichier**: `components/pwa/PWAInstallPrompt.tsx`

- Détection support PWA
- Bouton d'installation custom
- Gestion du prompt natif

#### 12.3.2 Offline Indicator

**Fichier**: `components/pwa/OfflineIndicator.tsx`

- Détection perte de connexion
- Notification utilisateur
- Synchronisation auto au retour online

#### 12.3.3 Banner Manager

**Fichier**: `components/pwa/BannerManager.tsx`

- Gestion des banners PWA
- Install prompts
- Update notifications

### 12.4 Service Worker

Généré automatiquement par `next-pwa` :
- Caching des assets statiques
- Runtime caching des API calls
- Background sync (à implémenter)

---

## 13. Tests

### 13.1 Architecture des Tests

```
Testing Strategy
├── Unit Tests (Vitest)
│   ├── Hooks (useAuth, useFilters, etc.)
│   ├── Utils (formatters, validators)
│   └── Components isolés
│
├── Integration Tests (Testing Library)
│   ├── Component interactions
│   └── Form flows
│
└── E2E Tests (Playwright)
    ├── User journeys
    ├── Critical paths
    └── Multi-page flows
```

### 13.2 Vitest (Unit Tests)

**Configuration**: `vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

**Exemples de tests**:
```
__tests__/
├── hooks/
│   ├── useAuth.test.ts
│   ├── useFilters.test.ts
│   └── useExport.test.ts
├── lib/
│   └── api/
│       └── client.test.ts
└── ai/
    └── autofill.test.ts
```

**Commandes**:
```bash
npm run test          # Run tests
npm run test:ui       # Vitest UI
npm run test:coverage # Coverage report
```

### 13.3 Playwright (E2E Tests)

**Configuration**: `playwright.config.ts`

**Tests E2E**:
```
e2e/
├── auth.spec.ts
├── organisations.spec.ts
├── people.spec.ts
├── bulk-actions.spec.ts
└── ai/
    └── ai-agent-flow.spec.ts
```

**Commandes**:
```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Playwright UI
npm run test:e2e:headed # Headed mode
```

### 13.4 Cypress (Legacy)

**Configuration**: `cypress.config.ts`

**Tests Cypress**:
```
cypress/e2e/
├── auth.cy.ts
├── organisations.cy.ts
├── people.cy.ts
└── ai/
    └── ai-agent-flow.cy.ts
```

---

## 14. Points d'Amélioration

### 14.1 Architecture

#### 14.1.1 Code Organization

**Problèmes identifiés**:

1. **Composants trop gros**
   - Certains composants dépassent 500 lignes
   - Mélange de logique métier et UI

   **Solution**: Découper en composants plus petits, extraire la logique dans des hooks

2. **Duplication de code**
   - Logique de filtres répétée dans plusieurs pages
   - Forms similaires sans abstraction

   **Solution**: Créer des hooks génériques (`useTableFilters`, `useEntityForm`)

3. **Types incomplets**
   - Certains types utilisent `any`
   - Manque de validation runtime

   **Solution**: Améliorer typage, utiliser Zod pour validation

#### 14.1.2 State Management

**Problèmes identifiés**:

1. **Mélange de patterns**
   - Certains composants utilisent useState pour données API
   - React Query pas utilisé partout

   **Solution**: Migrer toute data fetching vers React Query

2. **Zustand sous-utilisé**
   - Beaucoup de prop drilling
   - État UI géré localement

   **Solution**: Centraliser plus d'état UI dans Zustand

#### 14.1.3 Performance

**Optimisations possibles**:

1. **Bundle size**
   - Bundle actuel: ~800kb (gzipped)
   - Beaucoup de dépendances non tree-shakées

   **Solutions**:
   - Lazy load routes non-critiques
   - Remplacer lodash par lodash-es
   - Audit des dépendances

2. **Rendering**
   - Certains composants re-render trop souvent
   - Manque de memoization

   **Solutions**:
   - Utiliser React.memo() pour composants lourds
   - useMemo/useCallback pour callbacks/calculs

3. **Images**
   - Images non optimisées
   - Pas de lazy loading

   **Solutions**:
   - Utiliser next/image partout
   - Lazy load images below fold

### 14.2 Fonctionnalités

#### 14.2.1 À Implémenter

1. **Error Boundaries**
   - Pas de gestion globale des erreurs React
   - Crashes remontent à l'utilisateur

   **Solution**: Implémenter ErrorBoundary global + par route

2. **Loading States**
   - Certains loading states manquent
   - UX perfectible

   **Solution**: Skeleton screens partout, Suspense

3. **Offline Support**
   - PWA installable mais sync offline limitée

   **Solution**: Background Sync API, optimistic updates

4. **Accessibility**
   - ARIA labels incomplets
   - Navigation clavier partielle

   **Solution**: Audit a11y, améliorer keyboard navigation

#### 14.2.2 Sécurité

1. **Token Refresh**
   - Pas de refresh token
   - User déconnecté après expiration

   **Solution**: Implémenter refresh token flow

2. **XSS Protection**
   - Certains contenus dangerouslySetInnerHTML

   **Solution**: Sanitizer HTML, utiliser DOMPurify

3. **Rate Limiting**
   - Pas de rate limiting client-side

   **Solution**: Throttle requests, retry avec exponential backoff

### 14.3 Testing

**Coverage actuel**: ~30%

**Objectifs**:
- Unit tests: 70%+ coverage
- E2E tests: Critical paths couverts
- Integration tests: Flows complets

**Actions**:
1. Ajouter tests pour tous les hooks
2. Tests E2E pour user journeys complets
3. Tests de régression pour bugs fixes

### 14.4 Documentation

**Manques identifiés**:

1. **Storybook**
   - Pas de Storybook pour components

   **Solution**: Setup Storybook, documenter UI components

2. **ADRs (Architecture Decision Records)**
   - Pas de documentation des décisions techniques

   **Solution**: Créer dossier `docs/adr/`, documenter choix

3. **API Documentation**
   - Documentation API incomplète

   **Solution**: OpenAPI/Swagger pour backend, JSDoc pour frontend

4. **Contributing Guide**
   - Pas de guide pour nouveaux développeurs

   **Solution**: Créer CONTRIBUTING.md avec standards

### 14.5 DevOps

**Améliorations possibles**:

1. **CI/CD**
   - Pas de pipeline CI/CD complet

   **Solution**: GitHub Actions pour tests, lint, build, deploy

2. **Monitoring**
   - Pas de monitoring en production

   **Solution**: Sentry pour error tracking, Analytics pour usage

3. **Preview Deployments**
   - Pas de preview pour PRs

   **Solution**: Vercel/Netlify preview deployments

---

## Conclusion

### Points Forts de l'Architecture Actuelle

✅ **Stack Moderne**: Next.js 15, React 18, TypeScript strict
✅ **Architecture Modulaire**: API modules, composants découplés
✅ **State Management Hybride**: React Query + Zustand
✅ **Design System Professionnel**: Tailwind + UI primitives
✅ **PWA Support**: Offline, installable
✅ **Performance**: Code splitting, caching intelligent
✅ **Type Safety**: TypeScript partout

### Points d'Attention

⚠️ **Bundle Size**: À optimiser (800kb gzipped)
⚠️ **Test Coverage**: Faible (~30%)
⚠️ **Documentation**: Incomplète
⚠️ **Error Handling**: À améliorer
⚠️ **Accessibility**: À auditer

### Recommandations Stratégiques

1. **Court terme** (1-2 semaines):
   - Implémenter Error Boundaries
   - Améliorer loading states
   - Audit bundle size
   - Ajouter tests critiques

2. **Moyen terme** (1-2 mois):
   - Refactorer composants trop gros
   - Implémenter Storybook
   - Setup CI/CD complet
   - Améliorer a11y

3. **Long terme** (3-6 mois):
   - Migrer vers Server Components (Next.js 15)
   - Implémenter micro-frontends si scale
   - Audit sécurité complet
   - Monitoring production

---

**Document généré le**: 31 Octobre 2025
**Version**: 1.0.0
**Auteur**: Analyse automatisée du codebase
