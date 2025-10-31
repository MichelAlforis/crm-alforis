# CRM Frontend Codebase Architecture Analysis

**Generated:** October 31, 2025  
**Codebase:** crm-frontend (Next.js 15, React 18, TypeScript)  
**Focus Areas:** Structure, Components, State Management, API Integration, Styling

---

## Executive Summary

The crm-frontend codebase demonstrates a **growing but inconsistent architecture** with multiple iterations of similar components, unclear separation of concerns, and organizational patterns that vary significantly across features. While foundational patterns exist (Next.js App Router, TypeScript, TailwindCSS), the codebase exhibits signs of rapid feature development without consistent refactoring.

### Key Metrics
- **Route directories:** 73 nested dashboard routes
- **Page files:** 72 pages across app/
- **Shared components:** 33 components
- **Email components:** 19 dedicated components
- **Custom hooks:** 51+ hooks in /hooks
- **API client methods:** 100+ endpoints in lib/api.ts (1,140 lines)
- **Core type definitions:** 959 lines in lib/types.ts

### Critical Pain Points (Priority Order)
1. **Duplicate/overlapping components** (Table vs TableV2, AdvancedFilters duplicates)
2. **Inconsistent API client patterns** across components
3. **Large monolithic page files** (292-372 lines)
4. **Mixed state management approaches**
5. **Hard-to-discover features** due to deep nesting
6. **Type definitions scattered** across multiple files
7. **Email component complexity** (19 files, unclear separation)

---

## 1. Directory Structure Analysis

### Overall Architecture

```
crm-frontend/
├── app/                          # Next.js App Router (File-based routing)
│   ├── auth/                     # 4 auth routes (login, logout, forgot-password, reset-password)
│   ├── dashboard/                # 73 nested route directories
│   ├── oauth/                    # OAuth callbacks (Outlook)
│   ├── legal/                    # 4 legal pages (CGV, DPA, CGU, Privacy)
│   ├── api/                      # API routes (search endpoint)
│   ├── layout.tsx                # Root layout
│   ├── providers.tsx             # Global providers (QueryClient, ThemeProvider, ToastProvider)
│   └── page.tsx                  # Root page
├── components/                   # UI Components (27 subdirectories)
├── hooks/                        # Custom React hooks (51+ hooks)
├── lib/                          # Core utilities and API client
├── types/                        # TypeScript type definitions
├── styles/                       # Global CSS and design tokens
├── utils/                        # Utility functions (only 1 file: idleCallback.ts)
├── services/                     # Empty directory (no services)
├── contexts/                     # Empty directory (context files don't exist)
├── middleware.ts                 # Auth middleware for protected routes
└── config/                       # Configuration files
```

### Problem Areas

**1. Empty Planned Directories**
```
crm-frontend/
├── contexts/                     # ❌ Empty - Context API not used
├── services/                     # ❌ Empty - Service layer doesn't exist
└── utils/                        # ❌ Only 1 file (idleCallback.ts) - underdeveloped
```

**2. Inconsistent Structure Naming**
- Some features use `/dashboard/feature-name/` (standard)
- Some use `/dashboard/feature-name/[id]/` (dynamic routes)
- Some use `/dashboard/feature-name/new/` (creation)
- Some use `/dashboard/marketing/campaigns/` while `/dashboard/campaigns/` also exists

**Root Cause:** Incremental feature development without centralized routing/structure planning.

---

## 2. Routing Architecture Analysis

### Route Complexity (73 Dashboard Sub-routes)

```
/dashboard/
├── page.tsx                                      # Main dashboard (372 lines)
├── ai/                                          # AI Features (4 sub-pages)
│   ├── page.tsx
│   ├── config/
│   ├── suggestions/
│   ├── intelligence/
│   └── autofill/
├── organisations/                               # Organisation CRUD (4 sub-pages)
│   ├── page.tsx
│   ├── new/
│   ├── import/
│   └── [id]/
├── people/                                      # People CRUD (4 sub-pages)
│   ├── page.tsx
│   ├── new/
│   ├── import/
│   └── [id]/
├── marketing/                                   # Marketing routes (DUPLICATE BELOW)
│   ├── page.tsx
│   ├── campaigns/[id]/
│   ├── mailing-lists/[id]/
│   └── templates/
├── campaigns/                                   # ⚠️ DUPLICATE: campaigns also here
│   ├── page.tsx
│   ├── new/
│   ├── [id]/
│   └── [id]/preview/
├── email-campaigns/                             # ⚠️ DUPLICATE: email campaigns here
│   ├── page.tsx
│   ├── new/
│   └── [id]/
├── email-templates/                             # Email templates (1 page)
├── mailing-lists/                               # ⚠️ DUPLICATE: also in /marketing
│   └── page.tsx
├── mandats/                                     # Mandats CRUD (4 pages)
│   ├── page.tsx
│   ├── new/
│   └── [id]/
├── produits/                                    # Products CRUD (4 pages)
│   ├── page.tsx
│   ├── new/
│   └── [id]/
├── imports/                                     # Import data (1 page)
│   └── unified/
├── tasks/                                       # Tasks (2 pages)
│   ├── page.tsx
│   └── kanban/
├── inbox/                                       # Inbox (1 page)
├── search/                                      # Global search (1 page)
├── workflows/                                   # Workflows (4 pages)
│   ├── page.tsx
│   ├── new/
│   └── [id]/
├── kpis/                                        # KPIs (1 page)
├── users/                                       # User management (1 page)
├── monitoring/                                  # System monitoring (1 page)
├── autofill-hitl/                              # Autofill HITL (1 page)
├── help/                                        # Help center (6 pages)
│   ├── page.tsx
│   ├── guide-demarrage/
│   ├── tutoriels/
│   ├── guides/
│   └── guides/organisations/
├── settings/                                    # Settings (8 pages)
│   ├── page.tsx
│   ├── team/
│   ├── integrations/
│   ├── email-apis/
│   ├── email-accounts/
│   ├── webhooks/
│   ├── sidebar-analytics/
│   └── rgpd/
├── demo-table-v2/                              # ❌ DEMO PAGE
├── demo-container-queries/                      # ❌ DEMO PAGE
├── demo-fluid/                                  # ❌ DEMO PAGE
└── demo-modern-units/                           # ❌ DEMO PAGE (should be removed)
```

### Identified Issues

**Issue 1: Duplicate Routes**
```
Conflicting paths:
- /dashboard/campaigns/page.tsx
- /dashboard/marketing/campaigns/page.tsx
- /dashboard/email-campaigns/page.tsx

Duplicate lists:
- /dashboard/mailing-lists/page.tsx
- /dashboard/marketing/mailing-lists/[id]/page.tsx

⚠️ Impact: User confusion, inconsistent navigation, hard to find features
```

**Issue 2: Demo Pages in Production Routes**
```
- /dashboard/demo-table-v2/page.tsx
- /dashboard/demo-container-queries/page.tsx
- /dashboard/demo-fluid/page.tsx
- /dashboard/demo-modern-units/page.tsx

❌ These should be in a separate /demo/ route or removed
```

**Issue 3: Inconsistent Nesting Depth**
```
✅ Standard depth: /dashboard/organisations/page.tsx
✅ Dynamic depth: /dashboard/organisations/[id]/page.tsx
⚠️ Excessive depth: /dashboard/marketing/campaigns/[id]/sends/[sendId]/page.tsx
⚠️ Excessive depth: /dashboard/marketing/campaigns/[id]/preview/page.tsx

Inconsistent patterns:
- Some use /new routes: /organisations/new/, /people/new/
- Some use form modals instead of separate pages
- Some use query params (?step=1) instead of routes
```

---

## 3. Component Organization Analysis

### Component Directory Structure (27 subdirectories)

```
components/
├── ui/                          # ✅ Shadcn/UI primitives (14 components)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   ├── card.tsx
│   ├── label.tsx
│   ├── ErrorBoundary.tsx
│   └── ... (6 more)
│
├── shared/                      # ⚠️ PROBLEMATIC: 33 components, mixed concerns
│   ├── Table.tsx                # v1 Table implementation
│   ├── TableV2.tsx              # v2 Table with sticky columns
│   ├── DataTable/               # v3 Table with advanced features (folder)
│   ├── AdvancedFilters.tsx      # Filters (also in /search/)
│   ├── GlobalSearchInput.tsx    # Search (also in /shared/)
│   ├── GlobalSearchInputAdvanced.tsx  # ⚠️ Duplicate
│   ├── SearchableSelect.tsx
│   ├── SearchableMultiSelect.tsx
│   ├── Select.tsx               # Also in /ui/
│   ├── Input.tsx                # Also in /ui/
│   ├── Modal.tsx                # Custom modal wrapper
│   ├── Button.tsx               # Also in /ui/
│   ├── Card.tsx                 # Also in /ui/card.tsx
│   ├── Alert.tsx                # Also in /ui/
│   ├── ColumnSelector.tsx
│   ├── PaginationBar.tsx
│   ├── EntityAutocompleteInput.tsx
│   ├── OverflowMenu.tsx
│   ├── ExportButtons.tsx
│   ├── ... (15 more)
│
├── email/                       # ⚠️ 19 components - lacks clear separation
│   ├── CampaignBuilder.tsx
│   ├── CampaignWizard.tsx       # v1 wizard
│   ├── CompleteCampaignForm.tsx # ⚠️ Different approach
│   ├── EmailEditor.tsx
│   ├── RecipientSelector.tsx
│   ├── RecipientSelectorTable.tsx
│   ├── RecipientSelectorTableV2.tsx  # ⚠️ V2 variant
│   ├── RecipientTrackingList.tsx
│   ├── TemplateLibrary.tsx
│   ├── TemplateCreateModal.tsx
│   ├── TemplateEditModal.tsx
│   ├── TemplatePreviewModal.tsx
│   ├── CampaignAnalytics.tsx
│   ├── CampaignSubscriptionManager.tsx
│   ├── AudienceSelector.tsx
│   ├── wizard/                  # Step-based wizard
│   │   ├── Step1BasicInfo.tsx
│   │   ├── Step2Recipients.tsx
│   │   ├── Step3Configuration.tsx
│   │   └── Step4Summary.tsx
│   └── ... (more)
│
├── forms/                       # ✅ Better organized: 6 form components
│   ├── ImportForm.tsx
│   ├── ImportPeopleForm.tsx
│   ├── ImportOrganisationsForm.tsx
│   ├── InteractionForm.tsx
│   ├── KPIForm.tsx
│   ├── MandatForm.tsx
│   ├── ProduitForm.tsx
│   ├── TaskForm.tsx
│   ├── UserForm.tsx
│   └── index.ts
│
├── dashboard/                   # ✅ Clean: 3 items
│   ├── KPICards.tsx
│   └── widgets/
│       ├── ActivityWidget.tsx
│       ├── InboxWidget.tsx
│       └── HotLeadsWidget.tsx
│
├── dashboard-v2/                # ⚠️ DUPLICATE: Alternative dashboard
│   ├── widgets/
│   │   ├── KPICardWidget.tsx    # Similar to /dashboard/KPICards.tsx
│   │   ├── AIInsightsWidget.tsx
│   │   ├── RevenueChartWidget.tsx
│   │   ├── TopClientsWidget.tsx
│   │   └── EmailPerformanceWidget.tsx
│
├── interactions/                # ✅ Focused: 4 components
│   ├── DashboardInteractionsWidget.tsx
│   ├── InteractionCard.tsx
│   ├── InteractionComposerInline.tsx
│   └── ActivityTab.tsx
│
├── organisations/               # ✅ Focused: 1 component
│   └── OrganisationTimeline.tsx
│
├── ai/                          # ✅ Focused: 3 components
│   ├── OrganisationAISuggestions.tsx
│   ├── AIStatCard.tsx
│   └── SuggestionsTable.tsx
│
├── autofill/                    # ✅ Focused: 1 component
│   └── SuggestionPill.tsx
│
├── activities/                  # ✅ Organized: 3 components
│   ├── RecentActivities.tsx
│   ├── QuickInteractionButton.tsx
│   └── CreateActivityModal.tsx
│
├── search/                      # ⚠️ Duplicate of /shared/
│   ├── SearchBar.tsx
│   └── AdvancedFilters.tsx      # Duplicate of /shared/AdvancedFilters.tsx
│
├── help/                        # ✅ Focused: 2 components
│   ├── HelpTooltip.tsx
│   └── ArticleRating.tsx
│
├── pwa/                         # ✅ Focused: PWA features
│   ├── OfflineIndicator.tsx
│   ├── InstallPrompt.tsx
│   ├── PWAManager.tsx
│   └── BannerManager.tsx
│
├── workflows/                   # ✅ Focused: 2 components
│   ├── WorkflowBuilder.client.tsx
│   └── WorkflowTemplateCard.tsx
│
├── mobile/                      # ✅ Focused: 2 components
│   ├── BottomSheet.tsx
│   └── MobileCard.tsx
│
├── modals/                      # ✅ Focused: 1 component
│   └── MatchPreviewModal.tsx
│
├── legal/                       # ✅ Focused: 1 component
│   └── DownloadPDFButton.tsx
│
├── providers/                   # ✅ Focused: 1 component
│   └── QueryProvider.tsx
│
├── onboarding/                  # ✅ Focused: needs verification
│   └── OnboardingTour.tsx       # (referenced in layout but not detailed)
│
├── performance/                 # ✅ Focused: 1 component
│   └── WebVitalsReporter.tsx
│
├── integrations/                # ✅ Focused: 1 component
│   └── ... (referenced in settings)
│
├── feedback/                    # ⚠️ Empty or minimal
│
├── examples/                    # ❌ Demo components
│   └── MobileOptimizedList.example.tsx
│
├── skeletons/                   # ✅ Loading states
│   └── ... (not detailed)
│
└── mandats/                     # ✅ Focused: 1 component
    └── MandatProduitAssociationModal.tsx
```

### Component Organization Issues

**Issue 1: Duplicate/Overlapping Components**

```typescript
// PROBLEM: 3 different table implementations
components/shared/Table.tsx                    // v1
components/shared/TableV2.tsx                  // v2
components/shared/DataTable/                   // v3

// PROBLEM: Search duplicates
components/shared/GlobalSearchInput.tsx
components/shared/GlobalSearchInputAdvanced.tsx
components/search/SearchBar.tsx
components/search/AdvancedFilters.tsx          // Also in /shared/

// PROBLEM: Form input duplicates
components/ui/input.tsx                        // Shadcn primitive
components/shared/Input.tsx                    // Custom wrapper
components/shared/Select.tsx                   // Custom wrapper
components/ui/select.tsx                       // Shadcn primitive

Impact: Confusion about which to use, code duplication, maintenance burden
```

**Issue 2: Email Component Complexity**

```typescript
// 19 files with unclear responsibilities:
CampaignBuilder.tsx              // Builds campaigns
CampaignWizard.tsx               // Wizard flow (different from CompleteCampaignForm)
CompleteCampaignForm.tsx         // Form-based flow (different from CampaignWizard)
EmailEditor.tsx                  // WYSIWYG editor
RecipientSelector.tsx            // v1 recipient selection
RecipientSelectorTable.tsx       // v2 recipient selection
RecipientSelectorTableV2.tsx     // v3 recipient selection

Root Cause: Multiple iterations without cleanup. Each new feature creates new components.
Recommendation: Consolidate to single campaign builder with clear step separation.
```

**Issue 3: Shared vs UI vs Domain Components**

```typescript
// Unclear separation:
components/ui/                    // Should only have: primitives (button, input, dialog, etc)
components/shared/                // Too many: 33 components mixing concerns
components/forms/                 // ✅ Clear: form-specific components
components/email/                 // ✅ Clear: email-specific components

// What's in /shared/ that should move:
- Table variants → components/data/TableV3/
- DataTable → components/data/DataTable/
- Filters → components/filters/
- Search → components/search/
- Forms → components/forms/ (already exists)
```

**Issue 4: Missing Component Abstractions**

```typescript
// Pattern appears in multiple pages but no component:
// Listing with filters + table + pagination
// Used in: organisations, people, mandats, produits, email-campaigns, etc
// Currently: Each page reimplements this pattern

✅ Recommendation: Create <EntityListView /> component
```

---

## 4. State Management Analysis

### Current Approaches (Mixed Patterns)

```typescript
// Pattern 1: useAuth() hook with localStorage
hooks/useAuth.ts
└── Manages: auth token, user info
└── Storage: localStorage
└── Issues: No persistence layer abstraction

// Pattern 2: React Query (TanStack Query)
lib/api.ts + hooks/use*.ts
└── Server state: People, Organisations, Tasks, etc
└── Query patterns: useQuery, useMutation
└── Issues: Some API calls bypass React Query entirely

// Pattern 3: useState + useEffect (Anti-pattern)
app/dashboard/page.tsx (line 35-55)
└── Fetches KPIs with fetch() directly
└── Manages: kpiData, isLoadingKPIs via useState
└── Issues: No caching, no error handling, manual loading state

// Pattern 4: Context API (Planned but not used)
contexts/ directory exists but empty
└── Examples: SidebarProvider (line 21 in dashboard/layout.tsx)
└── Partially implemented but sparse

// Pattern 5: Custom hooks
hooks/use*.ts (51+ hooks)
└── Each hook manages own state
└── Issues: No clear separation between data/UI hooks
```

### State Management Issues

**Issue 1: Inconsistent API Data Fetching**

```typescript
// ❌ ANTIPATTERN: Direct fetch in component
// app/dashboard/page.tsx (lines 32-45)
const [kpiData, setKpiData] = useState<any>(null)
const [isLoadingKPIs, setIsLoadingKPIs] = useState(true)

const fetchKPIs = async () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('auth_token')
  const response = await fetch(`${API_BASE}/dashboard/kpis?period=${kpiPeriod}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  })
  // ... manual error handling
}

// ✅ CORRECT: Use React Query hook
const { data: kpiData, isLoading } = useKPIs({ period: kpiPeriod })
```

**Issue 2: No Service Layer**

```typescript
// Current: Direct API calls scattered across components
- api.ts contains 100+ endpoints (1,140 lines)
- Each hook duplicates fetch logic
- No error handling abstraction
- No retry logic standardization

// Missing abstraction:
services/
├── organisationService.ts
├── peopleService.ts
├── campaignService.ts
└── ... (one per domain)
```

**Issue 3: Context API Under-utilization**

```typescript
// Existing but sparse:
app/dashboard/layout.tsx imports SidebarProvider
  └── Manages: sidebar state

// Missing but needed:
- AuthContext (currently in useAuth hook)
- NavigationContext (currently scattered)
- UserPreferencesContext (for UI state)
- FilterContext (for list filters)
```

---

## 5. API Layer Analysis

### Current Structure

```typescript
// lib/api.ts (1,140 lines)
class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private csrfToken: string | null = null
  
  // Methods:
  // - getPersons()
  // - getOrganisations()
  // - createEmailCampaign()
  // - updateEmailCampaign()
  // - ... (100+ methods total)
}

export const api = new ApiClient(API_BASE_URL)
```

### API Layer Issues

**Issue 1: Monolithic API Client (1,140 lines)**

```typescript
// Current structure: All endpoints in single class
class ApiClient {
  getPersons() { ... }
  createPerson() { ... }
  getOrganisations() { ... }
  createOrganisation() { ... }
  // ... 96 more methods
}

// Problem: Hard to navigate, mixed concerns
// Solution: Domain-based API services
services/
├── api/
│   ├── base.ts                    // HTTP client
│   ├── people.ts                  // Person endpoints
│   ├── organisations.ts           // Organisation endpoints
│   ├── campaigns.ts               // Campaign endpoints
│   └── ...
```

**Issue 2: Inconsistent Error Handling**

```typescript
// Some components:
try {
  const response = await fetch(...)
  if (!response.ok) throw new Error(...)
  return await response.json()
} catch (err) {
  logger.error(...)
}

// No standardized error handling across components
// No error recovery mechanisms
// No error boundary integration
```

**Issue 3: No Centralized Request/Response Interception**

```typescript
// Missing:
- Request: Add auth token (manual in some places)
- Request: Add CSRF token (manual in some places)
- Response: Handle 401 (auto logout)
- Response: Handle rate limiting
- Response: Retry failed requests
```

**Issue 4: Type Safety Gaps**

```typescript
// Some API calls don't use types:
// app/dashboard/page.tsx:
const result = await response.json()  // ❌ type: any

// hooks/useAuth.ts:
// ✅ Uses proper types from lib/types.ts
const response = await api.login(credentials)  // Type: TokenResponse
```

---

## 6. Shared Resources Organization

### Types Location (Scattered)

```
types/                           # Primary location
├── activity.ts                  # Activity types
├── ai.ts                        # AI types
├── email-marketing.ts           # Email types
├── interaction.ts               # Interaction types
└── react-email-editor.d.ts      # Third-party types

lib/types.ts                     # ⚠️ DUPLICATE: Main types (959 lines)
lib/types/
└── dashboard.ts                 # Dashboard types

PROBLEM: Types split across 3 locations
- /types/ directory
- lib/types.ts file
- lib/types/ subdirectory

RECOMMENDATION: Single source of truth
types/
├── entities/
│   ├── person.ts
│   ├── organisation.ts
│   ├── campaign.ts
│   └── ...
├── api.ts                       # API request/response types
├── ui.ts                        # UI component types
└── index.ts
```

### Constants Location (Minimal)

```
config/                          # Empty/minimal
lib/geo.ts                       # Country/language options
├── COUNTRY_OPTIONS
└── LANGUAGE_OPTIONS

MISSING: No centralized constants file for:
- API endpoints
- Form validations
- Feature flags
- UI constants
```

### Utils Location (Underdeveloped)

```
utils/
└── idleCallback.ts              # Only 1 utility!

lib/
├── utils.ts                     # String/formatting utilities
├── logger.ts                    # Logging
├── geo.ts                       # Geography helpers
├── feedback.ts                  # Feedback/analytics
├── search.ts                    # Search logic
└── ... (others)

PROBLEM: Utilities scattered across lib/ instead of centralized utils/
RECOMMENDATION: Consolidate utilities:
utils/
├── string.ts
├── date.ts
├── format.ts
├── validation.ts
└── ...
```

---

## 7. Styling Approach Analysis

### Current System

```
styles/
├── global.css           # Global styles + @tailwind directives
├── variables.css        # CSS variables (design tokens)
├── components.css       # Component-level styles
├── utilities.css        # Custom utility classes
└── (referenced in tailwind.config.ts)

tailwind.config.ts       # TailwindCSS configuration
├── colors: Professional color system
├── spacing: 'fluid-*' responsive spacing with clamp()
├── fonts: Inter + JetBrains Mono
├── typography: Fluid typography system
└── borders: Radius system

.eslintrc.json          # Linting rules
├── max-lines: 500 per file (warn)
├── max-lines-per-function: 80 (warn)
├── complexity: 12 (warn)
```

### Styling Characteristics

**Strengths:**
- ✅ Professional color system with CSS variables
- ✅ Responsive fluid spacing (clamp-based)
- ✅ Consistent typography scale
- ✅ Container queries support (@tailwindcss/container-queries)
- ✅ Dark mode support (next-themes)

**Issues:**

**Issue 1: Inline Styles Mixed with TailwindCSS**

```typescript
// Throughout components:
className="flex flex-col gap-4 px-4 py-3 bg-blue-100 rounded-lg"

// Occasionally:
style={{ marginBottom: '10px' }}  // ⚠️ Mixing concerns

// Some components define:
const styles = { ... }            // ⚠️ CSS-in-JS pattern
```

**Issue 2: Duplicate Component Styles**

```css
/* styles/components.css may contain:
   Component styles for shared components */

/* Also inline in components:
   className="btn-primary btn-md" */

/* Also in component-specific styles:
   Individual CSS files per component */

ISSUE: No clear location for component styles
```

**Issue 3: CSS Variable Usage Inconsistency**

```css
/* Some use CSS variables: */
color: var(--color-text-primary);

/* Some hardcode Tailwind classes: */
className="text-gray-900 dark:text-slate-100"

/* Some use legacy colors: */
className="text-ardoise" /* #2C3E50 */
```

**Issue 4: responsive Design Approach Mixed**

```typescript
// Container queries (modern):
className="@container @lg:flex-row"

// Media queries (traditional):
className="md:grid-cols-2 xl:grid-cols-4"

// Both used inconsistently across components
```

---

## 8. Navigation & Feature Discovery Issues

### Current Navigation Patterns

```typescript
// 1. Sidebar navigation (shared/Sidebar)
//    - Fixed list of routes
//    - No dynamic feature discovery

// 2. Command Palette (CommandPaletteV3)
//    - Apple-style ⌘K interface
//    - Search across commands
//    - Partially implemented

// 3. Breadcrumbs (missing)
//    - Not consistently shown
//    - Users don't know current path depth

// 4. Direct URL navigation
//    - Only way to access some features
//    - Hard to discover new features
```

### Navigation Issues

**Issue 1: Unclear Route Organization**

```
User perspective:
"I want to create an email campaign. Where do I go?"

Options:
- /dashboard/campaigns/new
- /dashboard/email-campaigns/new
- /dashboard/marketing/campaigns/new

⚠️ No clear answer - user must guess
```

**Issue 2: Deep Nested Routes Without Breadcrumbs**

```
User navigates to:
/dashboard/marketing/campaigns/[id]/sends/[sendId]

Without breadcrumbs, user doesn't know:
- How to go back
- Current page depth
- Available sibling pages
```

**Issue 3: Feature Discoverability Low**

```
Features buried in deep routes:
- /dashboard/ai/autofill/page.tsx
- /dashboard/ai/suggestions/page.tsx
- /dashboard/autofill-hitl/page.tsx
- /dashboard/settings/rgpd/my-data/page.tsx
- /dashboard/settings/rgpd/access-logs/page.tsx

Users may not know these exist
```

---

## 9. Code Quality & Maintainability Issues

### File Size Analysis

```
Large Files (potential candidates for splitting):

1,140 lines    lib/api.ts                          # Too monolithic
959 lines      lib/types.ts                        # Too monolithic
372 lines      app/dashboard/page.tsx              # Exceeds max-lines rule
392 lines      lib/dashboard/widgetDefinitions.ts
283 lines      lib/commandParser.ts
292 lines      app/dashboard/people/page.tsx       # Exceeds max-lines rule

ESLint Config warns at:
- max-lines: 500 per file
- max-lines-per-function: 80 per function
- complexity: 12 per function

Status: Rules configured but not enforced (ignored during build)
```

### Component Complexity Issues

**Issue 1: Page Components Doing Too Much**

```typescript
// app/dashboard/organisations/page.tsx structure:
export default function OrganisationsPage() {
  // 1. Data fetching (useOrganisations hook)
  // 2. Filter logic (getCountryLabel, getLanguageLabel)
  // 3. Column definitions (useMemo with 8+ columns)
  // 4. Action handlers (onClick for view, edit, delete)
  // 5. Bulk actions (useMemo with multiple actions)
  // 6. Table rendering
  // 7. Modals for create/edit/delete
  // 8. Export functionality
  // Total: 292 lines of mixed concerns
}

SOLUTION: Extract to smaller components
- <OrganisationListView /> - Just displays table
- <OrganisationFilters /> - Filter logic
- <OrganisationActions /> - Action handlers
- <OrganisationModals /> - Modals
```

**Issue 2: Hook Complexity**

```typescript
// Multiple hooks doing multiple things:

useOrganisations() {
  // Fetches data
  // Manages pagination
  // Handles errors
  // Manages loading state
  // Caches results
}

RECOMMENDATION: Single Responsibility
- useOrganisationsData() - Fetch only
- usePagination() - Pagination only (already exists)
- useOrganisationFilters() - Filter state only
```

**Issue 3: Missing Error Boundaries**

```typescript
// Error handling exists:
- Try/catch in some components
- Logger utility for errors
- toast notifications for user errors

Missing:
- No error boundary wrapping major features
- No graceful degradation
- No fallback UI for failed sections
```

---

## 10. Inconsistencies & Anti-patterns

### Anti-pattern 1: API URL Duplication

```typescript
// Found in multiple places:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Should be centralized:
// lib/api-config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
```

**Locations found:**
- app/dashboard/page.tsx (line 41)
- hooks/useAuth.ts
- Multiple component files
- lib/api.ts (centralized version)

### Anti-pattern 2: Magic Numbers & Hardcoded Values

```typescript
// Found in components:
skip: 0
limit: 200

// Should be constants:
const DEFAULT_PAGE_SIZE = 20
const INITIAL_SKIP = 0
```

### Anti-pattern 3: Type Definition "any"

```typescript
// Example from app/dashboard/page.tsx:
const [kpiData, setKpiData] = useState<any>(null)

// Should be:
const [kpiData, setKpiData] = useState<KPIData | null>(null)
```

### Anti-pattern 4: Inconsistent Naming Conventions

```typescript
// Different patterns used:
useOrganisations()           // Plural
usePeople()                  // Plural
useAuth()                    // Singular
useOrganisationActivity()    // Singular+compound
useMandats()                 // Plural

// Consistency recommendation: Plural for collection hooks
```

---

## Summary of Pain Points by Severity

### CRITICAL (Blocking Development)
1. **Duplicate/Overlapping Components** (3 table versions, 2+ search implementations)
   - Location: components/shared/, components/search/, components/email/
   - Impact: Confusion, maintenance burden, inconsistent behavior
   - Fix Effort: Medium-High

2. **Monolithic API Client** (1,140 lines in single file)
   - Location: lib/api.ts
   - Impact: Hard to maintain, navigate, extend
   - Fix Effort: Medium

3. **Inconsistent State Management** (Mixed approaches without clear pattern)
   - Location: Scattered across hooks, components, contexts
   - Impact: Hard to debug, predict behavior, onboard new developers
   - Fix Effort: High

### HIGH (Impacting Maintainability)
4. **Type Definitions Scattered** (3 locations: types/, lib/types.ts, lib/types/)
   - Fix Effort: Low-Medium

5. **Large Page Components** (292-372 lines)
   - Fix Effort: Low-Medium

6. **Demo Pages in Production Routes** (4 demo pages)
   - Fix Effort: Low

7. **Duplicate Routes** (campaigns, mailing-lists, email-campaigns)
   - Fix Effort: Medium-High (requires navigation updates)

### MEDIUM (Technical Debt)
8. **Email Component Complexity** (19 files with unclear separation)
   - Fix Effort: Medium

9. **Inconsistent API Error Handling**
   - Fix Effort: Medium

10. **No Service Layer Abstraction**
    - Fix Effort: Medium-High

---

## Recommendations & Refactoring Roadmap

### Phase 1: Quick Wins (1-2 weeks)
1. Remove demo pages from production routes
2. Consolidate type definitions to single location
3. Create centralized constants file
4. Add breadcrumb component to navigation

### Phase 2: Component Consolidation (2-3 weeks)
1. Consolidate 3 table implementations → single TableV3
2. Consolidate 2+ search implementations → single SearchInput
3. Extract shared filtering logic → FilterProvider
4. Create entity list view component pattern

### Phase 3: Architecture Refactoring (4-6 weeks)
1. Split monolithic API client into domain services
2. Establish clear service layer pattern
3. Implement consistent error handling
4. Migrate to React Query for all server state
5. Consolidate contexts for shared UI state

### Phase 4: Code Quality (2-3 weeks)
1. Enforce ESLint max-lines rules
2. Split large page components
3. Add error boundaries
4. Improve TypeScript coverage

### Phase 5: Navigation Cleanup (1-2 weeks)
1. Consolidate duplicate routes (campaigns, email-campaigns, marketing/campaigns)
2. Establish consistent route patterns
3. Improve feature discoverability
4. Add route validation/suggestions

---

## File Path Reference for Key Components

### Architecture
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/app/layout.tsx** - Root layout
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/app/dashboard/layout.tsx** - Dashboard layout
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/middleware.ts** - Auth middleware

### API & State
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/lib/api.ts** - API client (1,140 lines)
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/lib/types.ts** - Types (959 lines)
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/hooks/index.ts** - Hook exports

### Components (Problem Areas)
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/components/shared/Table.tsx** - v1 table
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/components/shared/TableV2.tsx** - v2 table
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/components/shared/DataTable/** - v3 table
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/components/email/** - 19 email components

### Configuration
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/next.config.js** - Next.js config
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/tailwind.config.ts** - Tailwind config
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/.eslintrc.json** - ESLint config
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/tsconfig.json** - TypeScript config

### Styling
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/styles/global.css** - Global styles
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/styles/variables.css** - CSS variables
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/styles/components.css** - Component styles
- **/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend/styles/utilities.css** - Utility styles

---

## Conclusion

The crm-frontend codebase shows signs of rapid feature development with good foundational choices (Next.js 15, TypeScript, TailwindCSS, React Query) but lacks consistent organizational patterns and architecture governance. The primary challenges are:

1. **Component Duplication** - Multiple versions of similar components (tables, filters, search)
2. **Mixed State Management** - No clear single source of truth for application state
3. **Scattered Organization** - Types, utils, services split across multiple locations
4. **Navigation Complexity** - Duplicate routes and hard-to-discover features
5. **Code Quality Drift** - Linting rules configured but not enforced

These issues are addressable through systematic refactoring following the recommended roadmap. The good news is the codebase has a solid foundation; it just needs architectural discipline and cleanup.
