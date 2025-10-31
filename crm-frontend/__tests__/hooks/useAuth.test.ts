import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'

// Mock API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getToken: vi.fn(),
    clearToken: vi.fn(),
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    vi.mocked(apiClient.getToken).mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should set authenticated when token exists and user is fetched', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' }
    vi.mocked(apiClient.getToken).mockReturnValue('fake-token')
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
  })

  it('should handle login successfully', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' }
    vi.mocked(apiClient.login).mockResolvedValue({ user: mockUser, token: 'new-token' })
    vi.mocked(apiClient.getToken).mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.login({ email: 'test@example.com', password: 'password123' })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
  })

  it('should handle login error', async () => {
    const errorMessage = 'Invalid credentials'
    vi.mocked(apiClient.login).mockRejectedValue(new Error(errorMessage))
    vi.mocked(apiClient.getToken).mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.login({ email: 'test@example.com', password: 'wrong' })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toContain(errorMessage)
  })

  it('should handle logout', async () => {
    vi.mocked(apiClient.getToken).mockReturnValue('fake-token')
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({ id: 1, email: 'test@example.com' })
    vi.mocked(apiClient.logout).mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    await result.current.logout()

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeUndefined()
    expect(apiClient.logout).toHaveBeenCalled()
  })
})
