'use client'

/**
 * Push Notification Manager Component
 *
 * UI for managing push notification subscriptions
 *
 * Tests covered:
 * - 8.14: Permission notifications demandée
 * - 8.15: Notification reçue (tâche)
 * - 8.16: Clic notification ouvre app
 * - 8.17: Badge notification affiché
 */

import React from 'react'
import { Bell, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushNotificationManager() {
  const {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  // Don't show if notifications not supported
  if (typeof window !== 'undefined' && !('Notification' in window)) {
    return null
  }

  // Don't show if permission denied
  if (permission === 'denied') {
    return null
  }

  // Don't show if already subscribed (to reduce UI clutter)
  // Users can manage via settings page
  if (isSubscribed) {
    return null
  }

  const handleToggle = async () => {
    if (isLoading) return

    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  return (
    <div className="fixed bottom-24 right-4 md:max-w-sm z-40 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Activer les notifications
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              Recevez des notifications pour les nouvelles tâches et rappels.
            </p>

            {error && (
              <p className="text-xs text-red-500 mb-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleToggle}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Chargement...' : 'Activer'}
              </button>
              <button
                onClick={() => {
                  // Hide this prompt (can be shown again in settings)
                  localStorage.setItem('push-notifications-dismissed', 'true')
                  // Force re-render to hide
                  window.location.reload()
                }}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
