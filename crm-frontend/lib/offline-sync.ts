import { logger } from '@/lib/logger'
/**
 * Offline Sync Service
 *
 * Manages offline data synchronization and queue management
 *
 * Tests covered:
 * - 8.10: Reconnexion synchronise données
 */

type QueuedRequest = {
  id: string
  url: string
  method: string
  body?: any
  headers?: Record<string, string>
  timestamp: number
}

const QUEUE_KEY = 'offline-sync-queue'

export class OfflineSyncService {
  private static instance: OfflineSyncService
  private queue: QueuedRequest[] = []
  private isSyncing = false

  private constructor() {
    this.loadQueue()
    this.setupEventListeners()
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService()
    }
    return OfflineSyncService.instance
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return

    // Listen for online event
    window.addEventListener('online', () => {
      logger.log('[OfflineSync] Network back online, starting sync...')
      this.sync()
    })

    // Listen for custom sync event
    window.addEventListener('online-sync', () => {
      logger.log('[OfflineSync] Manual sync triggered')
      this.sync()
    })
  }

  private loadQueue() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
        logger.log(`[OfflineSync] Loaded ${this.queue.length} queued requests`)
      }
    } catch (error) {
      logger.error('[OfflineSync] Failed to load queue:', error)
      this.queue = []
    }
  }

  private saveQueue() {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      logger.error('[OfflineSync] Failed to save queue:', error)
    }
  }

  /**
   * Add a request to the offline queue
   */
  addToQueue(request: Omit<QueuedRequest, 'id' | 'timestamp'>) {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    this.queue.push(queuedRequest)
    this.saveQueue()

    logger.log(`[OfflineSync] Added request to queue: ${request.method} ${request.url}`)
  }

  /**
   * Sync all queued requests when back online
   */
  async sync(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      logger.log('[OfflineSync] Sync already in progress')
      return { success: 0, failed: 0 }
    }

    if (!navigator.onLine) {
      logger.log('[OfflineSync] Still offline, cannot sync')
      return { success: 0, failed: 0 }
    }

    if (this.queue.length === 0) {
      logger.log('[OfflineSync] Queue is empty, nothing to sync')
      return { success: 0, failed: 0 }
    }

    this.isSyncing = true
    let success = 0
    let failed = 0

    logger.log(`[OfflineSync] Syncing ${this.queue.length} requests...`)

    // Process queue in order
    const requests = [...this.queue]
    this.queue = []

    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        })

        if (response.ok) {
          success++
          logger.log(`[OfflineSync] ✓ Synced: ${request.method} ${request.url}`)
        } else {
          failed++
          // Re-queue failed request
          this.queue.push(request)
          logger.error(`[OfflineSync] ✗ Failed: ${request.method} ${request.url} (${response.status})`)
        }
      } catch (error) {
        failed++
        // Re-queue failed request
        this.queue.push(request)
        logger.error(`[OfflineSync] ✗ Error syncing: ${request.method} ${request.url}`, error)
      }
    }

    this.saveQueue()
    this.isSyncing = false

    logger.log(`[OfflineSync] Sync complete: ${success} success, ${failed} failed`)

    // Emit custom event for UI updates
    window.dispatchEvent(
      new CustomEvent('sync-complete', {
        detail: { success, failed },
      })
    )

    return { success, failed }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Clear all queued requests
   */
  clearQueue() {
    this.queue = []
    this.saveQueue()
    logger.log('[OfflineSync] Queue cleared')
  }
}

// Export singleton instance
export const offlineSyncService = OfflineSyncService.getInstance()
