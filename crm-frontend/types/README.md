# Type Definitions

This directory contains all TypeScript type definitions for the CRM frontend application.

## Structure

```
types/
├── index.ts                    # Central export point (use this!)
├── activity.ts                 # Activity & participant types
├── ai.ts                       # AI suggestions & execution types
├── email-marketing.ts          # Email marketing & lead scoring types
├── interaction.ts              # Interaction types
└── react-email-editor.d.ts     # External library type definitions
```

## Usage

**Always import from the root types index:**

```typescript
import {
  Organisation,
  Person,
  AISuggestion,
  ActivityWithParticipants
} from '@/types';
```

**Don't import directly from individual files:**

```typescript
// ❌ BAD - Don't do this
import { Organisation } from '@/lib/types';
import { AISuggestion } from '@/types/ai';

// ✅ GOOD - Do this instead
import { Organisation, AISuggestion } from '@/types';
```

## Main Type Categories

### 1. **Core Entities** (from `lib/types.ts`)
- `Organisation` - Companies, distributors, partners
- `Person` - Individual contacts
- `PersonOrganizationLink` - Relationship between people and orgs
- `MandatDistribution` - Distribution mandates
- `Produit` - Financial products
- `Task` - Task management

### 2. **AI Module** (from `types/ai.ts`)
- `AISuggestion` - AI-generated suggestions
- `AIExecution` - AI task execution records
- `AIConfiguration` - AI agent configuration
- `AIStatistics` - AI performance metrics

### 3. **Email & Marketing** (from `types/email-marketing.ts`)
- `EmailSend` - Email tracking records
- `LeadScore` - Lead scoring data
- `EmailCampaign` - Email campaigns (from lib/types.ts)
- `EmailTemplate` - Email templates (from lib/types.ts)

### 4. **Activities** (from `types/activity.ts`)
- `ActivityWithParticipants` - Activities with participant data
- `ActivityParticipant` - Meeting/call participants
- `CreateActivityWithParticipants` - Activity creation payload

### 5. **Interactions** (from `types/interaction.ts`)
- Types for CRM interactions and pipeline management

### 6. **Authentication & API** (from `lib/types.ts`)
- `LoginRequest`, `TokenResponse`, `UserInfo`
- `PaginatedResponse<T>` - Generic paginated API responses
- `ApiError` - Standardized error responses

## Type Naming Conventions

| Suffix | Purpose | Example |
|--------|---------|---------|
| _(none)_ | Main entity type | `Organisation`, `Person` |
| `Input` | Create operation payload | `PersonInput`, `OrganisationCreate` |
| `UpdateInput` | Update operation payload | `PersonUpdateInput`, `OrganisationUpdate` |
| `Detail` | Entity with relations populated | `PersonDetail`, `OrganisationDetail` |
| `Filters` | Query filter parameters | `TaskFilters`, `SuggestionsFilters` |
| `Response` | API response wrapper | `PaginatedResponse<T>` |
| `Request` | API request payload | `DetectDuplicatesRequest` |

## Common Patterns

### Paginated Responses

```typescript
import { PaginatedResponse, Organisation } from '@/types';

const response: PaginatedResponse<Organisation> = {
  total: 100,
  skip: 0,
  limit: 20,
  items: [/* organisations */]
};
```

### Enums vs Union Types

We use **union types** for most enums to avoid runtime overhead:

```typescript
// ✅ Good - Union type (no runtime code)
export type TaskStatus = 'todo' | 'doing' | 'done' | 'snoozed';

// ❌ Avoid - TypeScript enum (adds runtime code)
export enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing'
}
```

**Exception:** AI module uses TypeScript enums for better IDE support:

```typescript
import { AISuggestionStatus } from '@/types';

const status = AISuggestionStatus.PENDING; // Autocomplete works
```

### Optional vs Nullable

- Use `?` for **optional** fields that may not exist
- Use `| null` for **nullable** fields that exist but can be null

```typescript
interface Example {
  optional?: string;        // May not exist in object
  nullable: string | null;  // Exists but can be null
  both?: string | null;     // May not exist OR be null
}
```

## Migration Notes

### Legacy Type Names (Pre-2025)

The following types were renamed during the 2025-10-20 migration:

| Old Name | New Name | Notes |
|----------|----------|-------|
| `Fournisseur` | `Organisation` | Unified entity |
| `Investor` | `Organisation` | Unified entity |
| `OrganizationType` | `OrganisationCategory` | Enum values changed |
| `fournisseur_id` | `organisation_id` | In various entities |
| `investor_id` | `organisation_id` | In various entities |

## Adding New Types

1. **Determine the correct file:**
   - Core entities → `lib/types.ts`
   - Specialized module → `types/{module}.ts`

2. **Add the type definition:**
   ```typescript
   export interface MyNewType {
     id: number;
     name: string;
     // ...
   }
   ```

3. **Export from index:**
   - If in a types/*.ts file, it's auto-exported via `types/index.ts`
   - If in lib/types.ts, it's also auto-exported

4. **Document here** in this README if it's a major type

## Best Practices

1. **Always use the central import**
   ```typescript
   import { ... } from '@/types';
   ```

2. **Prefer `interface` over `type` for object shapes**
   ```typescript
   // ✅ Good
   export interface Person { ... }

   // ❌ Avoid
   export type Person = { ... }
   ```

3. **Use `Partial<T>` for update inputs**
   ```typescript
   export type PersonUpdateInput = Partial<PersonInput>;
   ```

4. **Add JSDoc comments for complex types**
   ```typescript
   /**
    * Represents a person with enriched organisation links
    * @see PersonOrganizationLink
    */
   export interface PersonDetail extends Person {
     organizations: PersonOrganizationLink[];
   }
   ```

## Related Files

- **Constants:** See `lib/constants/` for magic strings and enums
- **API Client:** See `lib/api.ts` for API endpoint types
- **Hooks:** See `hooks/` for React Query types
- **Components:** See `components/` for UI prop types

## Questions?

For type-related questions, check:
1. This README
2. JSDoc comments in the type files
3. Backend Pydantic models (source of truth)
4. API documentation
