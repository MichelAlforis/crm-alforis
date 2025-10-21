/**
 * Tests pour les hooks React Query de l'Agent IA
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useAISuggestions,
  useApproveSuggestion,
  useBatchApproveSuggestions,
  usePreviewSuggestion,
  useAIStatistics,
  usePendingSuggestionsCount,
} from '@/hooks/useAI'
import { AISuggestionStatus } from '@/types/ai'

// Mock fetch
global.fetch = jest.fn()

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAISuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch suggestions successfully', async () => {
    const mockData = [
      {
        id: 1,
        type: 'data_enrichment',
        status: 'pending',
        title: 'Test suggestion',
        confidence_score: 0.9,
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    const { result } = renderHook(
      () => useAISuggestions({ status: AISuggestionStatus.PENDING }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/suggestions?status=pending'),
      expect.any(Object)
    )
  })

  it('should handle fetch error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Error fetching suggestions' }),
    })

    const { result } = renderHook(() => useAISuggestions({}), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useApproveSuggestion', () => {
  it('should approve suggestion successfully', async () => {
    const mockResponse = {
      id: 1,
      status: 'approved',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useApproveSuggestion(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => result.current.mutate({ id: 1, notes: 'Looks good' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/suggestions/1/approve'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ notes: 'Looks good' }),
      })
    )
  })
})

describe('useBatchApproveSuggestions', () => {
  it('should approve multiple suggestions', async () => {
    const mockResponse = {
      total_requested: 3,
      successful: 3,
      failed: 0,
      results: [
        { suggestion_id: 1, status: 'success' },
        { suggestion_id: 2, status: 'success' },
        { suggestion_id: 3, status: 'success' },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useBatchApproveSuggestions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() =>
      result.current.mutate({ suggestion_ids: [1, 2, 3], notes: 'Batch approval' })
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/suggestions/batch/approve'),
      expect.objectContaining({
        method: 'POST',
      })
    )
  })
})

describe('usePreviewSuggestion', () => {
  it('should fetch preview successfully', async () => {
    const mockPreview = {
      suggestion_id: 1,
      current_data: { nom: 'Test' },
      proposed_changes: { nom: 'Test Company' },
      changes_summary: [
        {
          field: 'nom',
          from: 'Test',
          to: 'Test Company',
          type: 'update',
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPreview,
    })

    const { result } = renderHook(() => usePreviewSuggestion(1), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPreview)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/suggestions/1/preview'),
      expect.any(Object)
    )
  })

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => usePreviewSuggestion(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('useAIStatistics', () => {
  it('should fetch statistics successfully', async () => {
    const mockStats = {
      total_suggestions: 10,
      pending_suggestions: 3,
      approved_suggestions: 7,
      total_cost_usd: 5.5,
      average_confidence: 0.85,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    })

    const { result } = renderHook(() => useAIStatistics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockStats)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/statistics'),
      expect.any(Object)
    )
  })
})

describe('usePendingSuggestionsCount', () => {
  it('should return pending count from statistics', async () => {
    const mockStats = {
      pending_suggestions: 5,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    })

    const { result } = renderHook(() => usePendingSuggestionsCount(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current).toBe(5))
  })

  it('should return 0 when no statistics', () => {
    const { result } = renderHook(() => usePendingSuggestionsCount(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBe(0)
  })
})
