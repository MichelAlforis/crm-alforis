# ADR 001: State Management Architecture

**Status:** Accepted
**Date:** 2025-10-31
**Decision Makers:** Development Team

## Context

The CRM frontend needed a unified state management strategy to handle:
- Server data (API responses)
- URL state (filters, pagination, tabs)
- Global UI state (modals, toasts, sidebar)
- Local component state

Previous implementation mixed useState, useContext, and direct localStorage access without clear patterns.

## Decision

We adopted **Option B: React Query + Zustand + URL-first** architecture:

```
SERVER STATE       → React Query (TanStack v5)
URL STATE          → useUrlState + Next.js searchParams
GLOBAL UI STATE    → Zustand (stores/ui.ts)
LOCAL UI STATE     → useState / useReducer
COMPLEX WORKFLOWS  → XState (targeted use only)
```

## Rationale

**React Query for Server State:**
- Automatic caching, refetching, and invalidation
- Built-in loading/error states
- Reduces boilerplate by 70%
- Excellent TypeScript support
- Industry standard for Next.js apps

**URL State for Filters:**
- Shareable/bookmarkable URLs
- Browser back/forward support
- SSR-compatible
- No extra state library needed
- Better UX for filtering and pagination

**Zustand for Global UI:**
- Simple API (no reducers, no actions)
- Built-in TypeScript support
- Automatic localStorage persistence
- Minimal bundle size (~1KB)
- No Provider hell

## Consequences

**Positive:**
- Clear separation of concerns
- Reduced code duplication
- Better performance (selective re-renders)
- Improved DX (developer experience)
- Type-safe throughout
- Migration path is progressive (no breaking changes)

**Negative:**
- Learning curve for new team members
- Multiple libraries to maintain
- Some duplication between URL and Zustand state for certain use cases

**Neutral:**
- Existing code continues to work (backward compatible)
- Migration is opt-in, not forced

## Implementation

**Files Created:**
- `stores/ui.ts` - Zustand global store
- `hooks/useUrlState.ts` - URL state management
- `docs/STATE_MANAGEMENT.md` - Architecture guide
- `docs/STATE_MIGRATION_EXAMPLES.md` - Migration patterns

**Migration Strategy:**
1. New features use new architecture
2. Existing features migrate gradually
3. No breaking changes required
4. Full migration target: Q1 2026

## Alternatives Considered

**Option A: Zustand Only**
- Pros: Single library, simpler mental model
- Cons: No built-in server state caching, more boilerplate

**Option C: Redux Toolkit + React Query**
- Pros: More structure, well-established patterns
- Cons: More boilerplate, Provider complexity, larger bundle

**Option D: Context API Only**
- Pros: No external dependencies
- Cons: Performance issues, prop drilling, no caching

## References

- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Next.js App Router Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Internal: STATE_MANAGEMENT.md](../STATE_MANAGEMENT.md)
