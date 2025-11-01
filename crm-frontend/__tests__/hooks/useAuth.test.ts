import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, renderHookWithProviders } from '../test-utils'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', async () => {
    vi.mocked(apiClient.getToken).mockReturnValue(null)

    const { result } = renderHookWithProviders(() => useAuth())

    // Initially, loading should complete quickly when no token
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should set authenticated when token exists and user is fetched', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' }
    vi.mocked(apiClient.getToken).mockReturnValue('fake-token')
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUser)

    const { result } = renderHookWithProviders(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
  })

  it('should handle login successfully', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' }
    vi.mocked(apiClient.login).mockResolvedValue({ access_token: 'new-token' })
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(apiClient.getToken).mockReturnValue(null)

    const { result } = renderHookWithProviders(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await waitFor(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password123' })
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(result.current.user).toEqual(mockUser)
  })

  it('should handle login error', async () => {
    const errorMessage = 'Invalid credentials'
    vi.mocked(apiClient.login).mockRejectedValue({ detail: errorMessage })
    vi.mocked(apiClient.getToken).mockReturnValue(null)

    const { result } = renderHookWithProviders(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    try {
      await result.current.login({ email: 'test@example.com', password: 'wrong' })
    } catch (error) {
      // Expected to throw
    }

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  it('should handle logout', async () => {
    vi.mocked(apiClient.getToken).mockReturnValue('fake-token')
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({ id: 1, email: 'test@example.com' })
    vi.mocked(apiClient.logout).mockResolvedValue(undefined)

    const { result } = renderHookWithProviders(() => useAuth())

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    await waitFor(async () => {
      await result.current.logout()
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false)
    })
    expect(result.current.user).toBeUndefined()
    expect(apiClient.logout).toHaveBeenCalled()
  })
})
