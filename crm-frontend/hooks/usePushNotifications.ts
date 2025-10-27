'use client'

/**
 * Push Notifications Hook
 *
 * Handles Web Push notification subscriptions and permissions
 *
 * Tests covered:
 * - 8.14: Permission notifications demandée
 * - 8.15: Notification reçue (tâche)
 * - 8.16: Clic notification ouvre app
 * - 8.17: Badge notification affiché
 */

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('[Push] Notifications not supported')
      return
    }

    // Check current permission
    setPermission(Notification.permission)

    // Check if already subscribed
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) return

      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()

      setSubscription(existingSubscription)
      setIsSubscribed(!!existingSubscription)

      console.log('[Push] Subscription status:', !!existingSubscription)
    } catch (error) {
      console.error('[Push] Failed to check subscription:', error)
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      setError('Notifications not supported in this browser')
      return false
    }

    if (permission === 'granted') {
      return true
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      console.log('[Push] Permission result:', result)

      if (result === 'granted') {
        return true
      } else {
        setError('Notification permission denied')
        return false
      }
    } catch (error) {
      console.error('[Push] Permission request failed:', error)
      setError('Failed to request notification permission')
      return false
    }
  }

  const subscribe = async (): Promise<boolean> => {
    if (isLoading) return false

    setIsLoading(true)
    setError(null)

    try {
      // Request permission first
      const hasPermission = await requestPermission()
      if (!hasPermission) {
        setIsLoading(false)
        return false
      }

      // Get service worker registration
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported')
      }

      const registration = await navigator.serviceWorker.ready

      // Subscribe to push manager
      // VAPID public key from environment variables
      const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env')
      }

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setSubscription(pushSubscription)

      // Send subscription to backend
      const subscriptionObject = pushSubscription.toJSON()

      await apiClient.post('/push/subscribe', {
        endpoint: subscriptionObject.endpoint,
        keys: subscriptionObject.keys,
      })

      setIsSubscribed(true)
      console.log('[Push] Successfully subscribed')

      setIsLoading(false)
      return true
    } catch (error) {
      console.error('[Push] Subscription failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to subscribe')
      setIsLoading(false)
      return false
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    if (isLoading || !subscription) return false

    setIsLoading(true)
    setError(null)

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe()

      // Remove from backend
      await apiClient.delete('/push/unsubscribe', {
        params: { endpoint: subscription.endpoint },
      })

      setSubscription(null)
      setIsSubscribed(false)
      console.log('[Push] Successfully unsubscribed')

      setIsLoading(false)
      return true
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to unsubscribe')
      setIsLoading(false)
      return false
    }
  }

  const sendTestNotification = async (title: string, body: string) => {
    try {
      await apiClient.post('/push/send', {
        title,
        body,
        icon: '/favicon/favicon-192.png',
        badge: '/favicon/favicon-96.png',
        url: '/dashboard',
      })

      console.log('[Push] Test notification sent')
    } catch (error) {
      console.error('[Push] Failed to send notification:', error)
      throw error
    }
  }

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
  }
}

/**
 * Helper function to convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
