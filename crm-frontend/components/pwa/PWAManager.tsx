'use client'
import { logger } from '@/lib/logger'

/**
 * PWA Manager Component
 *
 * Central component that manages all PWA features:
 * - Service Worker registration and updates
 * - Install prompts
 * - Offline indicator
 * - Push notifications setup
 *
 * Tests covered:
 * - 8.2: Service Worker enregistré
 * - 8.13: Mise à jour SW automatique
 */

import React, { useEffect, useState } from 'react'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { OfflineIndicator } from './OfflineIndicator'

export function PWAManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logger.log('[PWA] Service Workers not supported')
      return
    }

    // Service Worker is auto-registered by next-pwa
    // We just need to listen for updates

    let refreshing = false

    const handleControllerChange = () => {
      if (refreshing) return
      refreshing = true
      logger.log('[PWA] New Service Worker activated, reloading page...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Check for updates every 30 minutes
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          logger.log('[PWA] Checking for Service Worker updates...')
          await registration.update()
        }
      } catch (error) {
        logger.error('[PWA] Failed to check for updates:', error)
      }
    }

    // Initial check
    checkForUpdates()

    // Periodic checks
    const updateInterval = setInterval(checkForUpdates, 30 * 60 * 1000) // 30 minutes

    // Listen for waiting service worker
    navigator.serviceWorker.ready.then((registration) => {
      logger.log('[PWA] Service Worker ready')

      if (registration.waiting) {
        logger.log('[PWA] Update available')
        setUpdateAvailable(true)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.log('[PWA] New Service Worker installed, update available')
            setUpdateAvailable(true)
          }
        })
      })
    })

    return () => {
      clearInterval(updateInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const handleUpdate = () => {
    if (!navigator.serviceWorker.controller) return

    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    setUpdateAvailable(false)
  }

  return (
    <>
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Install Prompt */}
      <PWAInstallPrompt />

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 animate-slide-up">
          <div className="bg-blue-500 text-white rounded-lg shadow-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">Mise à jour disponible</h3>
            </div>
            <p className="text-xs mb-3 opacity-90">
              Une nouvelle version de l'application est disponible.
            </p>
            <button
              onClick={handleUpdate}
              className="w-full bg-white dark:bg-slate-900 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Mettre à jour maintenant
            </button>
          </div>
        </div>
      )}
    </>
  )
}
