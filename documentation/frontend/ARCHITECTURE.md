// ARCHITECTURE GUIDE - STRUCTURE COMPLÈTE
// ========================================

/**
 * 🏗️ ARCHITECTURE ULTRA-MODULAIRE ET SCALABLE
 * 
 * Cette structure est conçue pour la réutilisabilité maximale et la maintenabilité.
 * Chaque couche est séparé et peut évoluer indépendamment.
 */

// ============= COUCHES DE L'APPLICATION =============

/**
 * 1️⃣ API CLIENT LAYER (lib/api.ts)
 * ──────────────────────────────────
 * - Singleton qui centralise TOUS les appels HTTP
 * - Gère l'authentification (token Bearer)
 * - Gère les erreurs et les redirects (401 → login)
 * - Retry logic, timeouts, etc. peuvent être ajoutés ici
 * 
 * Avantages:
 * ✅ Un seul point de contrôle pour tous les appels
 * ✅ Facile à tester
 * ✅ Facile à ajouter du caching, logging, retry, etc.
 * ✅ Gestion cohérente des erreurs
 */

import { apiClient } from '@/lib/api'

// Utilisation:
// const investors = await apiClient.getInvestors(0, 100)
// apiClient.setToken(token)
// apiClient.clearToken()


/**
 * 2️⃣ HOOKS LAYER (hooks/*.ts)
 * ────────────────────────────
 * - useAuth(): Gère l'état d'authentification
 * - useInvestors(): Gère le CRUD des investisseurs
 * - useInteractions(): Gère le CRUD des interactions
 * 
 * Chaque hook:
 * - Encapsule la logique métier
 * - Gère l'état (loading, error, data)
 * - Appelle apiClient
 * - Peut être réutilisé dans n'importe quel composant
 * 
 * Avantages:
 * ✅ Logique réutilisable et testable
 * ✅ Séparation de la logique du rendu
 * ✅ État centralisé par domaine métier
 * ✅ Facile à memoizer/cacher
 */

import { useInvestors } from '@/hooks/useInvestors'

export function MyComponent() {
  const { investors, fetchInvestors, createInvestor } = useInvestors()

  useEffect(() => {
    fetchInvestors()
  }, [])

  return (
    // Utiliser investors.data, investors.isLoading, etc.
  )
}


/**
 * 3️⃣ COMPONENTS LAYER (components/shared/*.tsx)
 * ───────────────────────────────────────────────
 * Composants réutilisables non métier:
 * - Card, Button, Input, Select, Modal, Alert, Table
 * 
 * Chaque composant:
 * - Reçoit des props (pas de logique API)
 * - Rendu purement visuel
 * - Peut être composé ensemble
 * - Facilement testable
 * 
 * Avantages:
 * ✅ Réutilisable partout
 * ✅ Facile à maintenir et à modifier
 * ✅ Design cohérent
 * ✅ Peut être documenté dans Storybook
 */

import { Card, Button, Input, Modal } from '@/components/shared'

export function MyForm() {
  return (
    <Card padding="lg">
      <Input label="Nom" />
      <Button variant="primary">Soumettre</Button>
    </Card>
  )
}


/**
 * 4️⃣ FORM COMPONENTS LAYER (components/forms/*.tsx)
 * ──────────────────────────────────────────────────
 * Formulaires réutilisables:
 * - LoginForm, InvestorForm, InteractionForm
 * 
 * Chaque formulaire:
 * - Utilise react-hook-form + zod (validation)
 * - Reçoit un callback onSubmit
 * - Reçoit initialData (pour édition)
 * - Composé de composants shared
 * 
 * Avantages:
 * ✅ Formulaires validés et typés
 * ✅ Réutilisable (création et édition)
 * ✅ Gestion de l'erreur cohérente
 * ✅ Facile à modifier la validation
 */

import { InvestorForm } from '@/components/forms'

export function CreateInvestorModal() {
  const { createInvestor } = useInvestors()

  return (
    <Modal>
      <InvestorForm
        onSubmit={createInvestor}
        submitLabel="Créer"
      />
    </Modal>
  )
}


/**
 * 5️⃣ PAGES LAYER (app/dashboard/**/*.tsx)
 * ───────────────────────────────────────
 * Pages Next.js qui:
 * - Utilisent les hooks
 * - Composent les formulaires et composants
 * - Gèrent le routage (navigation)
 * - Structurent l'UX
 * 
 * Pages principales:
 * - /dashboard/investors: Liste
 * - /dashboard/investors/[id]: Détail
 * - /dashboard/investors/new: Créer
 * 
 * Avantages:
 * ✅ Clean et facile à lire
 * ✅ Chaque page a une responsabilité claire
 * ✅ Facile à ajouter des fonctionnalités
 */

export default function InvestorsPage() {
  const { investors, fetchInvestors } = useInvestors()

  useEffect(() => {
    fetchInvestors()
  }, [])

  return (
    <div>
      <h1>Investisseurs</h1>
      <Table data={investors.data?.items} />
    </div>
  )
}


/**
 * 6️⃣ MIDDLEWARE LAYER (middleware.ts)
 * ────────────────────────────────────
 * Protège les routes:
 * - Vérifie le token pour /dashboard/*
 * - Redirige vers /auth/login si pas d'authentification
 * 
 * Avantages:
 * ✅ Protection au niveau du serveur
 * ✅ Redirect automatique
 * ✅ Fonctionne même si JS est désactivé
 */

// middleware.ts vérifie automatiquement les cookies


// ============= FLUX DE DONNÉES =============

/**
 * USER INTERACTION FLOW:
 * 
 * User clicks "Create investor" button
 *     ↓
 * Component opens InvestorForm
 *     ↓
 * User fills form and submits
 *     ↓
 * InvestorForm calls onSubmit (from hook)
 *     ↓
 * useInvestors.createInvestor() is called
 *     ↓
 * Hook sets state: { isLoading: true }
 *     ↓
 * Hook calls apiClient.createInvestor(data)
 *     ↓
 * API client makes POST request to backend
 *     ↓
 * Backend creates investor and returns data
 *     ↓
 * Hook sets state: { isLoading: false, success: true }
 *     ↓
 * Component re-renders with new data
 *     ↓
 * Modal closes, list refreshes
 *     ↓
 * User sees new investor in list
 * 
 * ✅ Chaque étape est modularisée et réutilisable!
 */


// ============= SCALABILITÉ EXEMPLES =============

/**
 * Example 1: Ajouter un nouveau type d'entité (Contact)
 * ──────────────────────────────────────────────────
 * 
 * 1. Ajouter types dans lib/types.ts:
 *    interface Contact { id, name, email, ... }
 *    interface ContactCreate { ... }
 * 
 * 2. Ajouter endpoints dans lib/api.ts:
 *    async getContacts() {}
 *    async createContact() {}
 *    etc.
 * 
 * 3. Créer hook dans hooks/useContacts.ts:
 *    export function useContacts() {
 *      // Même pattern que useInvestors
 *    }
 * 
 * 4. Créer formulaire dans components/forms/ContactForm.tsx:
 *    export function ContactForm() { ... }
 * 
 * 5. Créer pages dans app/dashboard/contacts/:
 *    - /page.tsx (liste)
 *    - /[id]/page.tsx (détail)
 *    - /new/page.tsx (créer)
 * 
 * → Tout suit le même pattern = facile et rapide!
 */


/**
 * Example 2: Ajouter une authentification avancée
 * ───────────────────────────────────────────────
 * 
 * Pour ajouter 2FA, OAuth, refresh tokens, etc.:
 * 
 * 1. Modifier apiClient pour gérer refresh tokens
 * 2. Modifier useAuth pour ajouter 2FA
 * 3. Ajouter LoginForm2FA si besoin
 * 
 * → Tout reste modulaire, aucune cascade de changements!
 */


/**
 * Example 3: Ajouter du caching/optimistic updates
 * ─────────────────────────────────────────────────
 * 
 * Pour améliorer les performances:
 * 
 * 1. Ajouter zustand store pour cacher (optionnel)
 * 2. Ajouter optimistic updates dans les hooks
 * 3. Ajouter retry logic dans apiClient
 * 
 * → Changements isolés, pas de breaking changes!
 */


// ============= CONVENTIONS IMPORTANTES =============

/**
 * NAMING CONVENTIONS:
 * 
 * ✅ Hooks: use<Entity>
 *    - useInvestors, useInteractions, useKPIs
 * 
 * ✅ Components: <EntityName><Type>
 *    - InvestorForm, InvestorCard, InvestorList
 * 
 * ✅ Pages: snake_case folders, same name
 *    - app/dashboard/investors/page.tsx
 *    - app/dashboard/investors/[id]/page.tsx
 * 
 * ✅ Files: lowercase with hyphens
 *    - lib/api.ts
 *    - hooks/useInvestors.ts
 *    - components/shared/Button.tsx
 */


/**
 * PROP DRILLING PREVENTION:
 * 
 * Au lieu de:
 * <Page> → <List> → <Item> → <Action>
 * 
 * On utilise les hooks directement:
 * <Page>
 *   <List /> (utilise useInvestors)
 *   <Item /> (utilise useInvestors)
 *   <Action /> (utilise useInvestors)
 * 
 * Chacun a accès aux mêmes données sans prop drilling!
 */


/**
 * ERROR HANDLING PATTERN:
 * 
 * 1. apiClient catches API errors
 * 2. Hook catches API errors et les stocke dans state
 * 3. Component affiche les erreurs avec Alert
 * 4. User voit un message clair
 * 
 * ✅ Cohérent partout!
 */


/**
 * LOADING STATES PATTERN:
 * 
 * Chaque opération (fetch, create, update, delete) a:
 * - isLoading: boolean
 * - error?: string
 * - success?: boolean
 * 
 * Components affichent spinner, désactive buttons, etc.
 * ✅ Cohérent partout!
 */


// ============= CHECKLIST POUR CONTINUER =============

/**
 * ✅ FAIT:
 * - API Client (lib/api.ts)
 * - Hooks (useAuth, useInvestors, useInteractions)
 * - Components réutilisables (Card, Button, etc.)
 * - Formulaires (LoginForm, InvestorForm, etc.)
 * - Pages (Dashboard, Investors liste/détail/créer)
 * - Navbar et Sidebar
 * - Middleware
 * 
 * 📋 À FAIRE PROCHAINEMENT:
 * - Pages Interactions (liste, créer)
 * - Pages KPIs (liste, formulaire, graphiques)
 * - Pages Rapports (statistiques, graphiques)
 * - Notifications/Toast
 * - Tests unitaires (Jest + React Testing Library)
 * - E2E tests (Cypress ou Playwright)
 * - Responsive design final
 * - Déploiement (Vercel)
 * 
 * 🚀 PHASE 3 ITEMS:
 * - Advanced filtering et search
 * - Export CSV/PDF
 * - Pagination advanced
 * - Real-time updates (Socket.io?)
 * - Graphiques (recharts)
 * - Calendrier (react-big-calendar?)
 */

export default {}