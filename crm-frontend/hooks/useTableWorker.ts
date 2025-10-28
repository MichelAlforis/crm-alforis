// hooks/useTableWorker.ts
// ============= P2 OPTIMIZATION: Hook for Table Web Worker =============

import { useEffect, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

type TableRow = Record<string, any>

interface UseTableWorkerOptions {
  onError?: (error: string) => void
}

interface WorkerMessage {
  type: 'sort' | 'filter' | 'sortAndFilter'
  data: TableRow[]
  sortBy?: string
  direction?: 'asc' | 'desc'
  filters?: Record<string, any>
  searchQuery?: string
  searchFields?: string[]
}

interface WorkerResponse {
  type: 'sort' | 'filter' | 'sortAndFilter' | 'ready' | 'error'
  result?: TableRow[]
  processingTime?: number
  error?: string
}

/**
 * Hook to use Web Worker for table operations
 *
 * Usage:
 *   const { sortAndFilter, isProcessing } = useTableWorker()
 *
 *   const handleSort = async (column: string) => {
 *     const sorted = await sortAndFilter({
 *       data: rows,
 *       sortBy: column,
 *       direction: 'asc',
 *     })
 *     setRows(sorted)
 *   }
 */
export function useTableWorker(options: UseTableWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Initialize worker
  useEffect(() => {
    // Only in browser environment
    if (typeof window === 'undefined') return

    try {
      // Create worker from separate file
      const worker = new Worker(new URL('../workers/table-worker.ts', import.meta.url))

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          setIsReady(true)
        }
      }

      worker.onerror = (error) => {
        logger.error('[useTableWorker] Worker error:', error)
        options.onError?.('Worker initialization failed')
      }

      workerRef.current = worker

      return () => {
        worker.terminate()
        workerRef.current = null
      }
    } catch (error) {
      logger.error('[useTableWorker] Failed to create worker:', error)
      options.onError?.('Failed to create worker')
    }
  }, [])

  /**
   * Execute worker operation and return result
   */
  const executeWorker = useCallback(
    (message: WorkerMessage): Promise<TableRow[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          // Fallback: execute synchronously if worker not available
          logger.warn('[useTableWorker] Worker not available, executing synchronously')
          const result = executeSynchronously(message)
          resolve(result)
          return
        }

        setIsProcessing(true)

        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === 'error') {
            setIsProcessing(false)
            reject(new Error(event.data.error || 'Unknown error'))
            workerRef.current?.removeEventListener('message', handleMessage)
            return
          }

          if (event.data.result) {
            setIsProcessing(false)
            resolve(event.data.result)
            workerRef.current?.removeEventListener('message', handleMessage)
          }
        }

        workerRef.current.addEventListener('message', handleMessage)
        workerRef.current.postMessage(message)

        // Timeout after 5s
        setTimeout(() => {
          setIsProcessing(false)
          reject(new Error('Worker timeout'))
          workerRef.current?.removeEventListener('message', handleMessage)
        }, 5000)
      })
    },
    []
  )

  /**
   * Sort rows
   */
  const sort = useCallback(
    async (data: TableRow[], sortBy: string, direction: 'asc' | 'desc' = 'asc'): Promise<TableRow[]> => {
      return executeWorker({ type: 'sort', data, sortBy, direction })
    },
    [executeWorker]
  )

  /**
   * Filter rows
   */
  const filter = useCallback(
    async (
      data: TableRow[],
      filters?: Record<string, any>,
      searchQuery?: string,
      searchFields?: string[]
    ): Promise<TableRow[]> => {
      return executeWorker({ type: 'filter', data, filters, searchQuery, searchFields })
    },
    [executeWorker]
  )

  /**
   * Sort and filter rows (most common operation)
   */
  const sortAndFilter = useCallback(
    async (params: {
      data: TableRow[]
      sortBy?: string
      direction?: 'asc' | 'desc'
      filters?: Record<string, any>
      searchQuery?: string
      searchFields?: string[]
    }): Promise<TableRow[]> => {
      return executeWorker({
        type: 'sortAndFilter',
        ...params,
      })
    },
    [executeWorker]
  )

  return {
    sort,
    filter,
    sortAndFilter,
    isProcessing,
    isReady,
  }
}

/**
 * Synchronous fallback (for SSR or when worker fails)
 */
function executeSynchronously(message: WorkerMessage): TableRow[] {
  let result = message.data

  // Simple inline sort
  if (message.type === 'sort' && message.sortBy) {
    result = [...result].sort((a, b) => {
      const aVal = a[message.sortBy!]
      const bVal = b[message.sortBy!]
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return message.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return message.direction === 'asc' ? aVal - bVal : bVal - aVal
    })
  }

  // Simple inline filter
  if (message.type === 'filter' && message.searchQuery) {
    const query = message.searchQuery.toLowerCase()
    result = result.filter((row) =>
      message.searchFields?.some((field) => String(row[field] || '').toLowerCase().includes(query))
    )
  }

  return result
}
