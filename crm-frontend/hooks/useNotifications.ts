'use client'
import { logger } from '@/lib/logger'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '@/lib/api'
import { WebSocketClient, toWebSocketUrl } from '@/lib/websocket'
import type { NotificationItem, NotificationPayload, NotificationsSnapshot } from '@/lib/types'

const STORAGE_KEY = 'crm.notifications.snapshot.v1'
const MAX_NOTIFICATIONS = 50

function normalizeNotification(raw: NotificationItem): NotificationItem {
  let metadata: unknown = raw.metadata
  if (metadata && typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata)
    } catch {
      // Garder la chaîne brute en cas d'erreur de parsing
      metadata = raw.metadata
    }
  }

  return {
    ...raw,
    metadata,
    title: raw.title ?? 'Notification',
    message: raw.message ?? null,
    created_at: raw.created_at ?? new Date().toISOString(),
  }
}

function prepareNotifications(items: NotificationItem[]): NotificationItem[] {
  const deduped = new Map<number, NotificationItem>()
  for (const item of items) {
    if (item?.id == null) continue
    deduped.set(item.id, item)
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      const aTime = a.created_at ? Date.parse(a.created_at) : 0
      const bTime = b.created_at ? Date.parse(b.created_at) : 0
      return bTime - aTime
    })
    .slice(0, MAX_NOTIFICATIONS)
}

function computeUnreadCount(items: NotificationItem[]): number {
  return items.reduce((count, notif) => count + (notif.is_read ? 0 : 1), 0)
}

function loadSnapshot(): NotificationsSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const snapshot = JSON.parse(raw) as NotificationsSnapshot
    if (!snapshot?.notifications) return null
    const notifications = snapshot.notifications.map(normalizeNotification)
    return {
      notifications: prepareNotifications(notifications),
      unreadCount: computeUnreadCount(notifications),
      lastSyncedAt: snapshot.lastSyncedAt ?? new Date().toISOString(),
    }
  } catch (error) {
    logger.warn('[useNotifications] Failed to load snapshot', error)
    return null
  }
}

function persistSnapshot(items: NotificationItem[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: NotificationsSnapshot = {
      notifications: items,
      unreadCount: computeUnreadCount(items),
      lastSyncedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    logger.warn('[useNotifications] Failed to persist snapshot', error)
  }
}

function buildWebSocketUrl(): string {
  if (typeof window === 'undefined') return ''

  const baseUrl = apiClient.getBaseUrl()
  let httpBase: string

  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    httpBase = baseUrl
  } else {
    httpBase = `${window.location.origin.replace(/\/$/, '')}${baseUrl}`
  }

  // Retirer le suffixe /api/v1 s'il est présent
  const sanitized = httpBase.replace(/\/api\/v1\/?$/, '')
  return toWebSocketUrl(`${sanitized}/ws/notifications`)
}

export interface UseNotificationsResult {
  notifications: NotificationItem[]
  unreadCount: number
  isConnecting: boolean
  isConnected: boolean
  lastError: string | null
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  reconnect: () => void
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const clientRef = useRef<WebSocketClient | null>(null)

  const applyNotificationsUpdate = useCallback((updater: (previous: NotificationItem[]) => NotificationItem[]) => {
    setNotifications((prev) => {
      const next = prepareNotifications(updater(prev))
      setUnreadCount(computeUnreadCount(next))
      persistSnapshot(next)
      return next
    })
  }, [])

  const handleNotificationMessage = useCallback((payload: NotificationPayload) => {
    if (!payload?.data) return
    const notification = normalizeNotification(payload.data)

    applyNotificationsUpdate((prev) => {
      const withoutCurrent = prev.filter((item) => item.id !== notification.id)
      return [notification, ...withoutCurrent]
    })
  }, [applyNotificationsUpdate])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const snapshot = loadSnapshot()
    if (snapshot) {
      setNotifications(snapshot.notifications)
      setUnreadCount(snapshot.unreadCount)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = apiClient.getToken()
    if (!token) {
      setIsConnecting(false)
      setIsConnected(false)
      setLastError('AUTHENTICATION_REQUIRED')
      return
    }

    const client = new WebSocketClient({
      url: buildWebSocketUrl(),
      token,
      autoReconnect: true,
      heartbeatIntervalMs: 25_000,
      onOpen: () => {
        setIsConnected(true)
        setIsConnecting(false)
        setLastError(null)
      },
      onClose: () => {
        setIsConnected(false)
        setIsConnecting(false)
      },
      onError: () => {
        setLastError('CONNECTION_ERROR')
      },
      onMessage: (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          if (data?.type === 'notification') {
            handleNotificationMessage(data as NotificationPayload)
          } else if (data?.type === 'connected') {
            setIsConnected(true)
            setIsConnecting(false)
          }
        } catch (error) {
          logger.warn('[useNotifications] Failed to parse message', error)
        }
      },
    })

    clientRef.current = client
    setIsConnecting(true)
    client.connect()

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [handleNotificationMessage])

  const markAsRead = useCallback((id: number) => {
    applyNotificationsUpdate((prev) =>
      prev.map((notif) =>
        notif.id === id
          ? { ...notif, is_read: true, read_at: notif.read_at ?? new Date().toISOString() }
          : notif
      )
    )
    // TODO: appeler l'API backend pour persister l'état lorsque l'endpoint sera disponible
  }, [applyNotificationsUpdate])

  const markAllAsRead = useCallback(() => {
    applyNotificationsUpdate((prev) =>
      prev.map((notif) =>
        notif.is_read
          ? notif
          : { ...notif, is_read: true, read_at: notif.read_at ?? new Date().toISOString() }
      )
    )
  }, [applyNotificationsUpdate])

  const clearNotifications = useCallback(() => {
    applyNotificationsUpdate(() => [])
  }, [applyNotificationsUpdate])

  const reconnect = useCallback(() => {
    clientRef.current?.reconnect()
  }, [])

  return useMemo(() => ({
    notifications,
    unreadCount,
    isConnecting,
    isConnected,
    lastError,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    reconnect,
  }), [
    notifications,
    unreadCount,
    isConnecting,
    isConnected,
    lastError,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    reconnect,
  ])
}
