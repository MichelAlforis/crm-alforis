/**
 * Test utilities for wrapping components with required providers
 */
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Creates a fresh QueryClient for each test
 * Disables retries and sets cache time to 0 for deterministic tests
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface AllProvidersProps {
  children: ReactNode
}

/**
 * Wrapper component with all required providers for testing
 */
export function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Custom render function that wraps components with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

/**
 * Custom renderHook function that wraps hooks with providers
 */
export function renderHookWithProviders<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) {
  return renderHook(hook, { wrapper: AllProviders, ...options })
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'
