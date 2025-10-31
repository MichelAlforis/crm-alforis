# Frontend Refactoring Action Checklist

**Start Date:** [TBD]  
**Target Completion:** 6-8 weeks  
**Team Size:** Recommend 1-2 engineers  

---

## Phase 1: Quick Wins (Week 1-2)

### Remove Demo Pages
- [ ] Delete `/app/dashboard/demo-table-v2/` directory
- [ ] Delete `/app/dashboard/demo-container-queries/` directory  
- [ ] Delete `/app/dashboard/demo-fluid/` directory
- [ ] Delete `/app/dashboard/demo-modern-units/` directory
- [ ] Remove any references from sidebar navigation
- [ ] Remove any links from other pages
- [ ] Test navigation still works

**Files to Delete:**
- `/app/dashboard/demo-*/page.tsx` (4 files)

**Testing:**
- Sidebar navigation loads correctly
- No broken links
- Build succeeds with --skip-lint

### Create Centralized Constants File

**Create:** `lib/constants.ts`
```typescript
// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const API_TIMEOUT = 30000

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_SKIP = 0
export const PAGE_SIZES = [10, 20, 50, 100]

// Feature Flags
export const FEATURES = {
  AUTOFILL: true,
  AI_SUGGESTIONS: true,
  EMAIL_CAMPAIGNS: true,
  WORKFLOWS: true,
  RGPD: true,
}

// UI Constants
export const TOAST_DURATION = 3000
export const ANIMATION_DURATION = 300

// Form Validation
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[0-9\s-()]+$/,
  URL_REGEX: /^https?:\/\/.+/,
}

// Sort Options
export const SORT_DIRECTIONS = ['asc', 'desc'] as const
```

**Tasks:**
- [ ] Create `lib/constants.ts` file
- [ ] Move all hardcoded values to constants
- [ ] Replace usages in dashboard/page.tsx
- [ ] Replace usages in hooks
- [ ] Replace usages in API client
- [ ] Update imports across codebase
- [ ] Test no functionality broken

**Search/Replace:**
```
FROM: const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
TO:   import { API_BASE_URL } from '@/lib/constants'
      // Then use API_BASE_URL
```

### Consolidate Type Definitions

**Current State:**
- `/types/activity.ts`
- `/types/ai.ts`
- `/types/email-marketing.ts`
- `/types/interaction.ts`
- `/lib/types.ts` (959 lines - MAIN)
- `/lib/types/dashboard.ts`

**Create New Structure:**
```
types/
├── index.ts                    # Export all types
├── api.ts                      # API request/response types
├── entities/
│   ├── person.ts
│   ├── organisation.ts
│   ├── campaign.ts
│   ├── task.ts
│   ├── interaction.ts
│   ├── activity.ts
│   ├── ai.ts
│   ├── workflow.ts
│   └── index.ts
├── ui.ts                       # UI component prop types
└── common.ts                   # Shared types
```

**Tasks:**
- [ ] Create new directory structure
- [ ] Move entity types from `lib/types.ts` → `types/entities/`
- [ ] Move API types → `types/api.ts`
- [ ] Move UI types → `types/ui.ts`
- [ ] Create `types/index.ts` with exports
- [ ] Update all imports across codebase
- [ ] Delete `lib/types.ts` (move content)
- [ ] Delete `lib/types/` directory
- [ ] Delete individual files in `/types/` (consolidate into entities)
- [ ] Verify no import errors
- [ ] Test build succeeds

**Migration Script:**
```bash
# Find all imports of lib/types
grep -r "from '@/lib/types'" crm-frontend/

# Update to new structure
# @/lib/types -> @/types
```

### Establish Naming Conventions

**Create:** `docs/NAMING_CONVENTIONS.md`

**Document:**
- [ ] Hook naming: `use[Feature]` (always plural for collections)
  - `useOrganisations` (✅ collection)
  - `useOrganisation(id)` (❌ wrong - use separate hook or param)
  - `useOrganisationDetail(id)` (✅ better for single)
  
- [ ] Component naming: `<PascalCase/>` with domain prefix optional
  - `<OrganisationList/>`
  - `<EmailCampaignWizard/>`
  
- [ ] File naming: matches component/hook name
  - `useOrganisations.ts` (not `organisations.ts`)
  - `OrganisationList.tsx` (not `list.tsx`)
  
- [ ] Constant naming: `UPPER_SNAKE_CASE`
- [ ] Type naming: `PascalCase`
- [ ] Variable naming: `camelCase`

**Tasks:**
- [ ] Create naming conventions document
- [ ] Share with team
- [ ] Add to code review checklist
- [ ] Audit existing code (non-blocking for Phase 1)

### Create Breadcrumb Component

**Create:** `components/shared/Breadcrumbs.tsx`

**Features:**
- Generates breadcrumbs from route
- Click to navigate
- Handle special cases (organisation names, etc)
- Mobile responsive (collapse on small screens)

**Tasks:**
- [ ] Create component
- [ ] Add to dashboard layout
- [ ] Style consistently
- [ ] Test on mobile
- [ ] Add to pages with deep nesting

### Summary - Phase 1 Checklist
- [ ] Demo pages removed (quick win)
- [ ] Constants file created
- [ ] Type definitions consolidated
- [ ] Naming conventions documented
- [ ] Breadcrumbs component added to layout
- [ ] All tests passing
- [ ] No broken links or imports

**Estimated Time:** 5-8 working days  
**Risk Level:** Low  
**Rollback Plan:** Easy (mostly deletions and additions)

---

## Phase 2: Component Consolidation (Week 3-4)

### Consolidate Table Implementations

**Current State:**
- `components/shared/Table.tsx` (v1)
- `components/shared/TableV2.tsx` (v2 - sticky columns)
- `components/shared/DataTable/` (v3 - most advanced)

**Action Plan:**

1. **Audit Current Usage**
   - [ ] List all components using Table v1
   - [ ] List all components using TableV2 v2
   - [ ] List all components using DataTable v3
   - [ ] Identify feature gaps

2. **Create TableV3 (Enhanced)**
   - [ ] Start from DataTable (most complete)
   - [ ] Add missing features from v1 and v2
   - [ ] Improve TypeScript types
   - [ ] Add comprehensive props documentation
   - [ ] Unit tests for edge cases

3. **Migrate Components**
   - [ ] Replace v1 usages → TableV3 (batch by feature)
   - [ ] Replace v2 usages → TableV3
   - [ ] Update column definitions
   - [ ] Test each page
   - [ ] Handle any breaking changes

4. **Cleanup**
   - [ ] Delete old Table.tsx
   - [ ] Delete old TableV2.tsx
   - [ ] Keep DataTable folder but rename to Table
   - [ ] Update component exports

**Files to Migrate:**
- `/app/dashboard/organisations/page.tsx` - Uses DataTable
- `/app/dashboard/people/page.tsx` - Uses DataTable
- `/app/dashboard/mandats/page.tsx` - Uses DataTable
- `/app/dashboard/produits/page.tsx` - Uses DataTable
- All email campaign pages
- All task pages

**Tasks:**
- [ ] Analyze Table v1, v2, v3 differences
- [ ] Create new TableV3 component with all features
- [ ] Add TypeScript types for all props
- [ ] Document column definition format
- [ ] Write migration guide for developers
- [ ] Migrate organisations page
- [ ] Migrate people page
- [ ] Migrate mandats page
- [ ] Migrate produits page
- [ ] Migrate email campaigns pages
- [ ] Migrate task pages
- [ ] Test all tables work correctly
- [ ] Delete old Table and TableV2 files
- [ ] Update imports in all files

### Consolidate Search/Filter Components

**Current State:**
- `components/shared/GlobalSearchInput.tsx`
- `components/shared/GlobalSearchInputAdvanced.tsx`
- `components/search/SearchBar.tsx`
- `components/search/AdvancedFilters.tsx`
- `components/shared/AdvancedFilters.tsx`

**Action Plan:**
- [ ] Analyze each component's features
- [ ] Create unified `<SearchInput/>` component
- [ ] Create unified `<FilterPanel/>` component
- [ ] Migrate all usages
- [ ] Delete duplicate files

**Files to Delete:**
- `components/shared/GlobalSearchInputAdvanced.tsx`
- `components/search/SearchBar.tsx`
- Keep `components/search/AdvancedFilters.tsx` or consolidate

### Start Email Component Refactoring

**Current State:** 19 email components with unclear separation

**Phase 2 Goals:**
- [ ] Audit all 19 email components
- [ ] Create component dependency map
- [ ] Identify which are actively used
- [ ] Plan consolidation strategy for Phase 3

**For Now:**
- [ ] Document email component architecture
- [ ] Create TODO list for Phase 3
- [ ] Do NOT consolidate yet (too complex for Phase 2)

### Summary - Phase 2 Checklist
- [ ] Table consolidation complete (v1, v2 merged into v3)
- [ ] All tables working correctly across app
- [ ] Search/filter components consolidated
- [ ] All migrations tested
- [ ] Old files cleaned up
- [ ] No console errors
- [ ] Build succeeds

**Estimated Time:** 8-12 working days  
**Risk Level:** Medium (many components affected)  
**Rollback Plan:** Use git to revert migrations if issues arise

---

## Phase 3: Architecture Refactoring (Week 5-8)

### Split Monolithic API Client

**Current State:** `/lib/api.ts` (1,140 lines)

**Create Domain-Based Services:**

1. **Base HTTP Client** `services/api/http.ts`
   - [ ] Extract fetch logic
   - [ ] Add request/response interceptors
   - [ ] Handle auth token injection
   - [ ] Handle error responses (401, 500, etc)
   - [ ] Implement retry logic
   - [ ] Add request logging

2. **Domain Services**
   ```
   services/api/
   ├── http.ts                    # Base client
   ├── people.ts                  # Person endpoints
   ├── organisations.ts           # Organisation endpoints
   ├── campaigns.ts               # Campaign endpoints
   ├── tasks.ts                   # Task endpoints
   ├── workflows.ts               # Workflow endpoints
   ├── webhooks.ts                # Webhook endpoints
   ├── templates.ts               # Email template endpoints
   ├── ai.ts                      # AI endpoints
   └── index.ts                   # Exports
   ```

3. **Tasks:**
   - [ ] Create http.ts with request/response handling
   - [ ] Extract person endpoints to people.ts
   - [ ] Extract organisation endpoints to organisations.ts
   - [ ] Extract campaign endpoints to campaigns.ts
   - [ ] Extract all other endpoint groups
   - [ ] Create services/api/index.ts with exports
   - [ ] Update all hooks to use new services
   - [ ] Update all components to use new services
   - [ ] Delete old lib/api.ts
   - [ ] Test all API calls work
   - [ ] Add error handling throughout

### Establish Consistent State Management

1. **Server State:** React Query
   - All server data (people, organisations, etc) via React Query
   - Automatic caching, refetching, invalidation
   - [ ] Audit current React Query usage
   - [ ] Convert remaining useAuth endpoints
   - [ ] Convert manual fetch() calls to React Query

2. **UI State:** Context API
   - [ ] Create UIContext for modal state
   - [ ] Create FilterContext for list filters
   - [ ] Create NotificationContext for toasts
   - [ ] Create UserPreferencesContext
   - [ ] Move sidebar state to context (already using SidebarProvider)

3. **Custom Hooks:** Clear Single Purpose
   - [ ] useOrganisations - Fetch only (delegate to React Query)
   - [ ] useOrganisationFilters - Filter state only
   - [ ] usePagination - Pagination state only (already exists)

4. **Tasks:**
   - [ ] Document state management patterns
   - [ ] Create/refine context files
   - [ ] Update hooks to follow pattern
   - [ ] Migrate existing state to contexts
   - [ ] Update dashboard/page.tsx KPI fetching (currently anti-pattern)

### Implement Error Handling

- [ ] Create ErrorBoundary wrapper for major features
- [ ] Create error context for global errors
- [ ] Implement error recovery patterns
- [ ] Add error logging/monitoring
- [ ] Create user-friendly error messages
- [ ] Add fallback UI for failed sections

**Files to Create:**
- `components/error/ErrorFallback.tsx`
- `contexts/ErrorContext.tsx`
- `lib/error-handler.ts`

### Summary - Phase 3 Checklist
- [ ] API client split into domain services
- [ ] All endpoints migrated to new services
- [ ] Old api.ts deleted
- [ ] State management patterns established
- [ ] Contexts created for UI state
- [ ] Error handling improved
- [ ] Error boundaries added
- [ ] All tests passing
- [ ] No API call failures

**Estimated Time:** 12-20 working days  
**Risk Level:** High (core architecture change)  
**Rollback Plan:** Have feature branch ready; can rollback if critical issues

---

## Phase 4: Code Quality (Week 7-8)

### Enforce ESLint Rules

- [ ] Set `max-lines` to 300 (warn at 500)
- [ ] Enforce in CI/CD
- [ ] Fix violations in:
  - [ ] `app/dashboard/page.tsx` (372 lines)
  - [ ] `app/dashboard/people/page.tsx` (292 lines)
  - [ ] Any other large files

### Split Large Page Components

**Example: organisations/page.tsx**
- [ ] Extract `<OrganisationListView/>`
- [ ] Extract `<OrganisationFilters/>`
- [ ] Extract `<OrganisationActions/>`
- [ ] Extract `<OrganisationModals/>`
- [ ] Keep page as coordinator

**Same for:**
- [ ] `people/page.tsx`
- [ ] `dashboard/page.tsx`
- [ ] Any page >300 lines

### Improve TypeScript Coverage

- [ ] Find all remaining `any` types
- [ ] Replace with proper types
- [ ] Run `tsc --noEmit` to check
- [ ] Fix all errors

### Add Missing Type Annotations

- [ ] Props types for all components
- [ ] Return types for all functions
- [ ] Parameter types for all functions

### Summary - Phase 4 Checklist
- [ ] ESLint rules enforced
- [ ] Large pages split
- [ ] No `any` types (except necessary cases)
- [ ] All functions typed
- [ ] Type coverage >95%
- [ ] No type errors
- [ ] Build succeeds without warnings

**Estimated Time:** 6-10 working days  
**Risk Level:** Low (mostly code cleanup)

---

## Phase 5: Navigation Cleanup (Final Week)

### Consolidate Duplicate Routes

**Current Issues:**
- `/dashboard/campaigns/`
- `/dashboard/email-campaigns/`
- `/dashboard/marketing/campaigns/`

**Solution:**
- [ ] Decide on canonical route: `/dashboard/campaigns/`
- [ ] Update sidebar to point to `/dashboard/campaigns/`
- [ ] Remove `/dashboard/email-campaigns/` directory
- [ ] Remove `/dashboard/marketing/campaigns/` directory
- [ ] Add redirects from old URLs (optional)
- [ ] Update any links in pages/components
- [ ] Update documentation

**Same for:**
- [ ] Mailing lists consolidation
- [ ] Any other duplicate routes

### Improve Feature Discoverability

- [ ] Add feature search to command palette
- [ ] Document all routes in README
- [ ] Add feature discovery guide
- [ ] Organize sidebar better

### Add Route Documentation

**Create:** `docs/ROUTING.md`
- [ ] List all routes with descriptions
- [ ] Explain pattern: `/dashboard/[entity]/`
- [ ] Explain dynamic routes: `/dashboard/[entity]/[id]/`
- [ ] Explain special routes: `/dashboard/settings/`, `/dashboard/help/`
- [ ] Add examples for new developers

### Summary - Phase 5 Checklist
- [ ] Duplicate routes consolidated
- [ ] Feature discoverability improved
- [ ] Routing documentation complete
- [ ] No broken links
- [ ] Navigation consistent
- [ ] All pages accessible

**Estimated Time:** 3-5 working days  
**Risk Level:** Low (mostly reorganization)

---

## Definition of Done

For each phase, code is ready when:

- [ ] All lint errors resolved (except ignored)
- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Build succeeds: `npm run build`
- [ ] No performance regressions
- [ ] Reviewed by team member
- [ ] Merged to main branch

---

## Risk Mitigation

### Before Starting Large Changes
- [ ] Create feature branch: `refactor/phase-X-feature`
- [ ] Set up staging environment
- [ ] Run full test suite
- [ ] Get team approval

### During Changes
- [ ] Commit frequently (small, logical units)
- [ ] Keep separate commits per feature
- [ ] Test after each major change
- [ ] Monitor CI/CD pipeline

### After Completion
- [ ] Merge to main with approval
- [ ] Deploy to staging first
- [ ] Monitor for errors
- [ ] Get team feedback
- [ ] Deploy to production when confident

---

## Communication Plan

### Weekly
- [ ] Share progress with team
- [ ] Report blockers immediately
- [ ] Document decisions made

### Milestone
- [ ] Announce completion of each phase
- [ ] Share lessons learned
- [ ] Get stakeholder approval

### Final
- [ ] Present final refactored architecture
- [ ] Share maintenance guide
- [ ] Train team on new patterns

---

## Success Metrics

### Code Quality
- [ ] ESLint violations: 0 (in changed files)
- [ ] TypeScript errors: 0
- [ ] Test coverage: >80% (target)
- [ ] Average file size: <300 lines
- [ ] Cyclomatic complexity: <12 per function

### Performance
- [ ] Lighthouse score: >90
- [ ] Core Web Vitals: Green
- [ ] No bundle size regression
- [ ] First paint: <1.5s

### Maintainability
- [ ] Onboarding time for new devs: <2 hours
- [ ] Bug fix time: -30% (measured)
- [ ] Feature implementation time: -20% (measured)
- [ ] Code review time: -25% (measured)

---

**Last Updated:** October 31, 2025  
**Status:** Ready for implementation  
**Contact:** [Team Lead Name]

