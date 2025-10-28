'use client'
import { logger } from '@/lib/logger'

/**
 * Offline Sync Hook
 *
 * Provides access to offline sync functionality
 *
 * Tests covered:
 * - 8.10: Reconnexion synchronise données
 */

import { useEffect, useState } from 'react'
import { offlineSyncService } from '@/lib/offline-sync'
import { useOnlineStatus } from './useOnlineStatus'

export function useOfflineSync() {
  const isOnline = useOnlineStatus()
  const [queueLength, setQueueLength] = useState(0)
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: number
    failed: number
  } | null>(null)

  useEffect(() => {
    // Update queue length
    setQueueLength(offlineSyncService.getQueueLength())

    // Listen for sync complete events
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ success: number; failed: number }>
      setLastSyncResult(customEvent.detail)
      setQueueLength(offlineSyncService.getQueueLength())

      // Clear result after 5 seconds
      setTimeout(() => setLastSyncResult(null), 5000)
    }

    window.addEventListener('sync-complete', handleSyncComplete)

    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete)
    }
  }, [])

  // Trigger sync when back online
  useEffect(() => {
    if (isOnline && queueLength > 0) {
      logger.log('[useOfflineSync] Back online with queued requests, triggering sync')
      offlineSyncService.sync()
    }
  }, [isOnline, queueLength])

  return {
    queueLength,
    lastSyncResult,
    sync: () => offlineSyncService.sync(),
    addToQueue: (request: Parameters<typeof offlineSyncService.addToQueue>[0]) =>
      offlineSyncService.addToQueue(request),
    clearQueue: () => offlineSyncService.clearQueue(),
  }
}
