import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authAPI } from '@/lib/api'

// Mock fetch globally
global.fetch = vi.fn()

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('should login successfully and return user data', async () => {
      const mockResponse = {
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
        access_token: 'fake-token-123',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await authAPI.login({ email: 'test@example.com', password: 'password123' })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      )

      expect(result.user).toEqual(mockResponse.user)
      expect(result.token).toBe(mockResponse.access_token)
    })

    it('should throw error on failed login', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Invalid credentials' }),
      } as Response)

      await expect(
        authAPI.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      } as Response)

      await expect(authAPI.logout()).resolves.not.toThrow()

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch current user profile', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'admin' }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response)

      const result = await authAPI.getCurrentUser()

      expect(result).toEqual(mockUser)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })
})
