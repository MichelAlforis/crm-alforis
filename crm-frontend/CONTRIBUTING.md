# Contributing Guide

Merci de contribuer au CRM Frontend Alforis ! Ce guide vous aidera à démarrer rapidement.

## 📋 Table des matières

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Pull Requests](#pull-requests)

## 🚀 Getting Started

### Prérequis

- Node.js 18+
- npm 9+
- Git

### Installation

```bash
# Clone le repo
git clone https://github.com/MichelAlforis/crm-alforis.git
cd crm-alforis/crm-frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start dev server
npm run dev
```

## 🏗️ Architecture

### Structure du projet

```
crm-frontend/
├── app/                    # Next.js 15 App Router
│   ├── dashboard/         # Pages dashboard
│   ├── auth/              # Pages authentification
│   └── layout.tsx         # Layout principal
├── components/            # Composants React
│   ├── shared/           # Composants réutilisables
│   ├── forms/            # Formulaires
│   └── navigation/       # Navigation
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & configuration
│   ├── api/             # API client modulaire
│   ├── constants/       # Constants centralisées
│   └── types.ts         # Types TypeScript
├── stores/              # State management (Zustand)
└── __tests__/           # Tests (Vitest + Playwright)
```

### Principes d'architecture

**State Management:**
- **Server State:** React Query (TanStack v5)
- **URL State:** useUrlState + Next.js searchParams
- **Global UI State:** Zustand (stores/ui.ts)
- **Local UI State:** useState / useReducer

**API Client:**
- Architecture modulaire (`lib/api/modules/`)
- Backward compatible avec ancien client
- Tree-shakeable imports

**Constants:**
- Tous les endpoints API dans `lib/constants/api.ts`
- Toutes les routes dans `lib/constants/routes.ts`
- Storage helper SSR-safe dans `lib/constants/storage.ts`

## 📝 Coding Standards

### TypeScript

```typescript
// ✅ DO: Use explicit types for function parameters
function createUser(data: UserInput): Promise<User> {
  return api.createUser(data)
}

// ✅ DO: Use interfaces for objects
interface User {
  id: number
  name: string
  email: string
}

// ❌ DON'T: Use 'any' type
function processData(data: any) { } // Bad

// ✅ DO: Use proper type inference
function processData(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript knows data is string here
  }
}
```

### React Components

```typescript
// ✅ DO: Use functional components with TypeScript
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}

// ✅ DO: Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Heavy computation
  return <div>{data}</div>
})

// ✅ DO: Use lazy loading for conditional components
const Modal = lazy(() => import('./Modal'))
```

### Hooks

```typescript
// ✅ DO: Custom hooks should start with 'use'
export function useOrganisations(filters?: FilterOptions) {
  return useQuery({
    queryKey: ['organisations', filters],
    queryFn: () => organisationsAPI.getOrganisations(filters),
  })
}

// ✅ DO: Return objects from hooks, not arrays
export function useAuth() {
  return {
    user,
    isAuthenticated,
    login,
    logout,
  }
}
```

### Imports

```typescript
// ✅ DO: Use absolute imports with @/ alias
import { Button } from '@/components/shared/Button'
import { organisationsAPI } from '@/lib/api'
import { ROUTES } from '@/lib/constants'

// ✅ DO: Group imports logically
// 1. React/Next.js
// 2. Third-party libraries
// 3. Internal imports (API, constants, types)
// 4. Relative imports
// 5. Styles
```

### Naming Conventions

```typescript
// ✅ DO: PascalCase for components and types
export function UserProfile() {}
export interface UserProfile {}

// ✅ DO: camelCase for functions and variables
const userName = 'John'
function getUserName() {}

// ✅ DO: UPPER_CASE for constants
export const API_BASE_URL = 'https://api.example.com'
export const DEFAULT_PAGE_SIZE = 20

// ✅ DO: Prefix hooks with 'use'
export function useAuth() {}

// ✅ DO: Prefix event handlers with 'handle'
function handleClick() {}
function handleSubmit() {}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e
```

### Writing Tests

**Unit Tests (Vitest):**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

describe('useAuth', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle login successfully', async () => {
    const { result } = renderHook(() => useAuth())

    await act(() => result.current.login({ email, password }))

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
```

**Integration Tests:**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { organisationsAPI } from '@/lib/api/modules/organisations'

describe('organisationsAPI', () => {
  it('should fetch organisations list', async () => {
    vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockData)

    const result = await organisationsAPI.getOrganisations()

    expect(result.items).toHaveLength(2)
  })
})
```

**E2E Tests (Playwright):**

```typescript
import { test, expect } from '@playwright/test'

test('should login successfully', async ({ page }) => {
  await page.goto('/auth/login')

  await page.fill('[name="email"]', 'user@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/dashboard')
})
```

### Test Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: Critical API modules
- E2E tests: Main user workflows

## 🔄 Git Workflow

### Branches

```bash
main              # Production-ready code
├── feature/*     # New features
├── fix/*         # Bug fixes
├── refactor/*    # Code refactoring
└── docs/*        # Documentation updates
```

### Commit Messages

Format: `<type>(<scope>): <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Add/update tests
- `docs`: Documentation
- `style`: Code style (formatting, no logic change)
- `perf`: Performance improvement
- `chore`: Build/tooling changes

**Examples:**

```bash
feat(auth): Add OAuth login support
fix(tasks): Correct task status filtering
refactor(api): Modularize API client
test(hooks): Add useAuth unit tests
docs(readme): Update installation instructions
```

### Commit Best Practices

```bash
# ✅ DO: Write clear, concise messages
git commit -m "feat(tasks): Add snooze functionality"

# ✅ DO: Use multi-line for detailed commits
git commit -m "feat(tasks): Add snooze functionality

- Add snooze button to task card
- Implement snooze API endpoint
- Add tests for snooze feature"

# ❌ DON'T: Use vague messages
git commit -m "fix stuff"
git commit -m "wip"
```

## 🔍 Pull Requests

### Before Submitting

```bash
# 1. Run tests
npm run test

# 2. Run linter
npm run lint

# 3. Check TypeScript
npm run type-check

# 4. Build project
npm run build
```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

### Code Review Guidelines

**For Authors:**
- Keep PRs small and focused
- Write descriptive PR descriptions
- Respond to feedback promptly
- Update PR based on feedback

**For Reviewers:**
- Review within 24 hours
- Be constructive and respectful
- Ask questions, don't demand changes
- Approve when ready, don't nitpick

## 📚 Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Getting Help

- Check existing issues on GitHub
- Read the [Architecture Documentation](./docs/STATE_MANAGEMENT.md)
- Ask questions in team chat
- Create a new issue with the `question` label

## 📄 License

This project is proprietary and confidential.

---

**Thank you for contributing! 🎉**
