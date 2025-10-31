# Constants Library

Centralized constants for the CRM application. Use these constants instead of magic strings throughout the codebase.

## Quick Start

```typescript
import {
  AI_ENDPOINTS,
  ROUTES,
  storage,
  PAGINATION,
  CAMPAIGN_STATUS,
  ERROR_MESSAGES,
  API_TIMEOUTS
} from '@/lib/constants';
```

## Available Modules

### 1. **API Endpoints** (`api.ts`)

All API endpoint definitions organized by module.

```typescript
import { AI_ENDPOINTS, ORGANISATION_ENDPOINTS } from '@/lib/constants';

// AI module
fetch(AI_ENDPOINTS.SUGGESTIONS);
fetch(AI_ENDPOINTS.SUGGESTION_APPROVE(123));

// Organisation module
fetch(ORGANISATION_ENDPOINTS.BASE);
fetch(ORGANISATION_ENDPOINTS.DETAIL(456));
```

**Available endpoint groups:**
- `AI_ENDPOINTS` - AI suggestions, executions, config
- `ORGANISATION_ENDPOINTS` - Organisation CRUD operations
- `PEOPLE_ENDPOINTS` - People/contacts operations
- `EMAIL_ENDPOINTS` - Email campaigns & templates
- `WORKFLOW_ENDPOINTS` - Workflow automation
- `MONITORING_ENDPOINTS` - Health checks, metrics
- `SEARCH_ENDPOINTS` - Global search
- `AUTH_ENDPOINTS` - Authentication

---

### 2. **Application Routes** (`routes.ts`)

Type-safe route definitions for navigation.

```typescript
import { ROUTES } from '@/lib/constants';

// Navigate to pages
router.push(ROUTES.CRM.ORGANISATIONS);
router.push(ROUTES.AI.SUGGESTIONS);
router.push(ROUTES.SETTINGS.PROFILE);

// Dynamic routes with IDs
router.push(ROUTES.CRM.ORGANISATION_DETAIL(123));
router.push(ROUTES.EMAIL.CAMPAIGN_DETAIL(456));
```

**Route groups:**
- `ROUTES.CRM.*` - CRM module (organisations, people, mandats)
- `ROUTES.AI.*` - AI module (suggestions, config)
- `ROUTES.MARKETING.*` - Marketing campaigns
- `ROUTES.EMAIL.*` - Email campaigns (legacy)
- `ROUTES.WORKFLOWS.*` - Workflow automation
- `ROUTES.TASKS.*` - Task management
- `ROUTES.SETTINGS.*` - Settings pages
- `ROUTES.AUTH.*` - Authentication pages

**Helpers:**
```typescript
import { isRouteActive, withQuery } from '@/lib/constants';

// Check if route is active
isRouteActive('/dashboard/organisations', ROUTES.CRM.ORGANISATIONS);

// Add query params
withQuery(ROUTES.CRM.ORGANISATIONS, { status: 'active', page: 2 });
// => "/dashboard/organisations?status=active&page=2"
```

---

### 3. **Storage Keys** (`storage.ts`)

Safe localStorage/sessionStorage access with helper functions.

```typescript
import { storage, STORAGE_KEYS } from '@/lib/constants';

// Set value
storage.set(STORAGE_KEYS.TOKEN, 'abc123');
storage.set(STORAGE_KEYS.USER, { id: 1, name: 'John' });

// Get value
const token = storage.get(STORAGE_KEYS.TOKEN);
const user = storage.get<User>(STORAGE_KEYS.USER);

// Check existence
if (storage.has(STORAGE_KEYS.TOKEN)) { ... }

// Remove
storage.remove(STORAGE_KEYS.TOKEN);

// Clear all
storage.clear();
```

**Storage key groups:**
- `AUTH_STORAGE_KEYS` - Authentication tokens
- `PREFERENCES_STORAGE_KEYS` - User preferences
- `UI_STATE_STORAGE_KEYS` - UI state persistence
- `CACHE_STORAGE_KEYS` - Client-side caching
- `FEATURE_FLAGS_STORAGE_KEYS` - Feature toggles

**Benefits:**
- ✅ Type-safe access
- ✅ SSR-safe (checks `typeof window`)
- ✅ Automatic JSON parsing
- ✅ Error handling built-in

---

### 4. **Pagination Config** (`pagination.ts`)

Consistent pagination across the application.

```typescript
import { PAGINATION, paginationHelpers } from '@/lib/constants';

// Use default values
const limit = PAGINATION.DEFAULT_PAGE_SIZE; // 20
const skip = PAGINATION.DEFAULT_SKIP; // 0

// Page size options
const options = PAGINATION.PAGE_SIZE_OPTIONS; // [10, 20, 50, 100, 500]

// Helpers
const totalPages = paginationHelpers.getTotalPages(100, 20); // 5
const skip = paginationHelpers.getSkipFromPage(2, 20); // 20
const hasNext = paginationHelpers.hasNextPage(2, 100, 20); // true
```

**Constants:**
- `DEFAULT_PAGE_SIZE` - Default items per page (20)
- `PAGE_SIZE_OPTIONS` - Dropdown options
- `SMALL_LIST` - For small lists (10)
- `LARGE_LIST` - For large lists (100)
- `MAX_LIMIT` - API maximum (10000)

---

### 5. **Timeouts & Intervals** (`timeouts.ts`)

Centralized timing configuration.

```typescript
import { API_TIMEOUTS, POLLING_INTERVALS, UI_DELAYS } from '@/lib/constants';

// API request timeouts
fetch(url, { timeout: API_TIMEOUTS.DEFAULT }); // 10s

// Polling intervals
useQuery(queryKey, queryFn, {
  refetchInterval: POLLING_INTERVALS.NORMAL // 10s
});

// UI debouncing
const debouncedSearch = debounce(search, UI_DELAYS.DEBOUNCE_SEARCH); // 300ms
```

**Timing groups:**
- `API_TIMEOUTS` - Request timeouts (5s to 60s)
- `POLLING_INTERVALS` - Refetch intervals (5s to 5min)
- `CACHE_TTL` - Cache durations (30s to 24h)
- `STALE_TIME` - React Query stale times
- `UI_DELAYS` - Debounce, throttle, animations
- `SESSION_TIMEOUTS` - Session management
- `RETRY_CONFIG` - Exponential backoff

**Helper functions:**
```typescript
import { timingHelpers } from '@/lib/constants';

// Sleep
await timingHelpers.sleep(1000);

// Debounce
const debounced = timingHelpers.debounce(func, 300);

// Throttle
const throttled = timingHelpers.throttle(func, 100);

// Backoff delay
const delay = timingHelpers.getBackoffDelay(attempt);

// Format duration
timingHelpers.formatDuration(125000); // "2m 5s"
```

---

### 6. **Status Enums** (`status.ts`)

Type-safe status values with colors and labels.

```typescript
import {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_STATUS_LABELS
} from '@/lib/constants';

// Status values
const status = CAMPAIGN_STATUS.DRAFT;

// Get color class
const color = CAMPAIGN_STATUS_COLORS[status]; // "bg-gray-500"

// Get French label
const label = CAMPAIGN_STATUS_LABELS[status]; // "Brouillon"
```

**Available status enums:**
- `CAMPAIGN_STATUS` - Email campaign statuses
- `ACTIVITY_TYPE` - Activity types (call, email, meeting)
- `TASK_STATUS` - Task statuses (todo, in_progress, completed)
- `TASK_PRIORITY` - Task priorities (low, medium, high, urgent)
- `AI_SUGGESTION_STATUS` - AI suggestion states
- `QUALITY_LEVEL` - Data quality levels
- `ORGANISATION_STAGE` - CRM pipeline stages
- `EMAIL_STATUS` - Email send statuses
- `WORKFLOW_STATUS` - Workflow execution states

Each enum includes:
- Status constants
- Color mappings (Tailwind classes)
- Label mappings (French)
- Icon mappings (Lucide icons)

---

### 7. **User Messages** (`messages.ts`)

Consistent user-facing messages.

```typescript
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  INFO_MESSAGES,
  CONFIRM_MESSAGES
} from '@/lib/constants';

// Error messages
toast.error(ERROR_MESSAGES.LOAD_ORGANISATIONS);

// Success messages
toast.success(SUCCESS_MESSAGES.ORGANISATION_CREATED);

// Info messages
console.log(INFO_MESSAGES.NO_DATA);

// Confirmation messages
if (confirm(CONFIRM_MESSAGES.DELETE_ORGANISATION)) { ... }
```

**Message categories:**
- `ERROR_MESSAGES` - Error messages (generic, load, create, update, delete)
- `SUCCESS_MESSAGES` - Success notifications
- `INFO_MESSAGES` - Info/warning messages
- `CONFIRM_MESSAGES` - Confirmation dialogs
- `VALIDATION_MESSAGES` - Form validation

**Helper functions:**
```typescript
import { getErrorMessage, formatApiError } from '@/lib/constants';

// Extract message from error
const message = getErrorMessage(error);

// Format API error by status code
const message = formatApiError(404); // "Ressource introuvable"
```

---

## Usage Examples

### Complete Example: Fetching Organisations

```typescript
import {
  ORGANISATION_ENDPOINTS,
  PAGINATION,
  API_TIMEOUTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  storage,
  STORAGE_KEYS
} from '@/lib/constants';

async function fetchOrganisations() {
  try {
    const response = await fetch(
      `${ORGANISATION_ENDPOINTS.BASE}?limit=${PAGINATION.DEFAULT_PAGE_SIZE}`,
      {
        headers: {
          'Authorization': `Bearer ${storage.get(STORAGE_KEYS.TOKEN)}`
        },
        timeout: API_TIMEOUTS.DEFAULT
      }
    );

    if (!response.ok) {
      throw new Error(ERROR_MESSAGES.LOAD_ORGANISATIONS);
    }

    const data = await response.json();
    toast.success(SUCCESS_MESSAGES.OPERATION_SUCCESS);
    return data;

  } catch (error) {
    toast.error(getErrorMessage(error));
    throw error;
  }
}
```

### Complete Example: Navigation with Breadcrumbs

```typescript
import { ROUTES } from '@/lib/constants';
import { Breadcrumbs } from '@/components/navigation';

function OrganisationPage({ id }: { id: number }) {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: ROUTES.DASHBOARD },
          { label: 'CRM', href: ROUTES.CRM.BASE },
          { label: 'Organisations', href: ROUTES.CRM.ORGANISATIONS },
          { label: `#${id}`, href: ROUTES.CRM.ORGANISATION_DETAIL(id) },
        ]}
      />

      <button onClick={() => router.push(ROUTES.CRM.ORGANISATION_NEW)}>
        Nouvelle organisation
      </button>
    </div>
  );
}
```

---

## Migration Guide

### Migrating from Magic Strings

**Before:**
```typescript
// ❌ Magic strings everywhere
const response = await fetch('/api/v1/organisations');
localStorage.setItem('token', token);
router.push('/dashboard/organisations');
toast.error('Impossible de charger les organisations');
```

**After:**
```typescript
// ✅ Using constants
import {
  ORGANISATION_ENDPOINTS,
  storage,
  STORAGE_KEYS,
  ROUTES,
  ERROR_MESSAGES
} from '@/lib/constants';

const response = await fetch(ORGANISATION_ENDPOINTS.BASE);
storage.set(STORAGE_KEYS.TOKEN, token);
router.push(ROUTES.CRM.ORGANISATIONS);
toast.error(ERROR_MESSAGES.LOAD_ORGANISATIONS);
```

---

## Best Practices

### 1. Always use constants
```typescript
// ❌ Bad - magic string
router.push('/dashboard/ai/suggestions');

// ✅ Good - constant
router.push(ROUTES.AI.SUGGESTIONS);
```

### 2. Use storage helper
```typescript
// ❌ Bad - direct localStorage
localStorage.setItem('token', token);
const token = localStorage.getItem('token');

// ✅ Good - storage helper
storage.set(STORAGE_KEYS.TOKEN, token);
const token = storage.get(STORAGE_KEYS.TOKEN);
```

### 3. Use timing constants
```typescript
// ❌ Bad - magic number
setTimeout(() => {...}, 5000);

// ✅ Good - named constant
setTimeout(() => {...}, UI_DELAYS.TOAST_DURATION);
```

### 4. Use message constants
```typescript
// ❌ Bad - hardcoded message
toast.error('Erreur lors du chargement');

// ✅ Good - constant message
toast.error(ERROR_MESSAGES.LOAD_FAILED);
```

---

## TypeScript Support

All constants are fully typed with:
- `as const` assertions for literal types
- Type inference for better IntelliSense
- Exported types for constant values

```typescript
// Inferred types
type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];
type RouteKeys = keyof typeof ROUTES;
```

---

## Contributing

When adding new constants:

1. **Choose the right file:**
   - API endpoints → `api.ts`
   - Routes → `routes.ts`
   - Messages → `messages.ts`
   - etc.

2. **Follow naming conventions:**
   - SCREAMING_SNAKE_CASE for constants
   - camelCase for helper functions
   - Group related constants in objects

3. **Add JSDoc comments:**
   ```typescript
   /**
    * AI suggestion endpoints
    */
   export const AI_ENDPOINTS = { ... };
   ```

4. **Export from index.ts:**
   ```typescript
   export * from './your-file';
   ```

5. **Update this README** with examples

---

## Related Documentation

- [types/README.md](../../types/README.md) - Type definitions guide
- [PHASE1_SUMMARY.md](../../PHASE1_SUMMARY.md) - Phase 1 refactoring summary
- [CHANGELOG_PHASE1.md](../../CHANGELOG_PHASE1.md) - Detailed changelog

---

**Created:** 2025-10-31
**Status:** ✅ Production Ready
**Maintainer:** Development Team
