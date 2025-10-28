// hooks/useNotifications.example.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXEMPLE D'UTILISATION du hook useStableWebSocket
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ce fichier montre comment utiliser le hook pour les notifications
// en temps réel via WebSocket
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client'
import { logger } from '@/lib/logger'

import { useCallback, useEffect, useState } from 'react'
import { useStableWebSocket } from './useStableWebSocket'
import { toWebSocketUrl } from '@/lib/websocket'

interface Notification {
  id: string
  type: string
  message: string
  timestamp: string
  [key: string]: unknown
}

interface UseNotificationsOptions {
  token?: string
  enabled?: boolean
  onNotification?: (notification: Notification) => void
}

export function useNotifications({
  token,
  enabled = true,
  onNotification,
}: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)

        // Ignorer les pongs (réponses aux heartbeats)
        if (data.type === 'pong') {
          return
        }

        // Nouvelle notification
        const notification: Notification = {
          id: data.id || `notif-${Date.now()}`,
          type: data.type,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          ...data,
        }

        setNotifications((prev) => [notification, ...prev].slice(0, 50))
        onNotification?.(notification)
      } catch (error) {
        logger.error('[useNotifications] Failed to parse message:', error)
      }
    },
    [onNotification]
  )

  const handleOpen = useCallback(() => {
    logger.log('[useNotifications] ✅ Connected to notification stream')
    setIsConnected(true)
  }, [])

  const handleClose = useCallback(() => {
    logger.log('[useNotifications] ⚠️ Disconnected from notification stream')
    setIsConnected(false)
  }, [])

  const handleError = useCallback((event: Event) => {
    logger.error('[useNotifications] ❌ WebSocket error:', event)
    setIsConnected(false)
  }, [])

  // Construire l'URL WebSocket
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const wsBaseUrl = toWebSocketUrl(apiUrl)
  const wsUrl = `${wsBaseUrl}/ws/notifications${token ? `?token=${token}` : ''}`

  // Option pour désactiver WebSocket en dev (si besoin)
  const isDev = process.env.NODE_ENV === 'development'
  const shouldConnect = enabled && !!token
  // const shouldConnect = enabled && !!token && !isDev // Décommenter pour désactiver en dev

  // Utiliser le hook stable
  const { reconnect, disconnect } = useStableWebSocket({
    url: wsUrl,
    enabled: shouldConnect,
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
    heartbeatIntervalMs: 25_000, // 25s
  })

  // Cleanup des notifications anciennes (garder max 50)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) => prev.slice(0, 50))
    }, 60_000) // Toutes les minutes

    return () => clearInterval(interval)
  }, [])

  return {
    notifications,
    isConnected,
    reconnect,
    disconnect,
    clearNotifications: () => setNotifications([]),
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXEMPLE D'UTILISATION DANS UN COMPOSANT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*
'use client'

import { useNotifications } from '@/hooks/useNotifications.example'
import { useAuth } from '@/hooks/useAuth' // Votre hook d'authentification

export function NotificationPanel() {
  const { token } = useAuth() // Récupérer le token JWT

  const { notifications, isConnected, clearNotifications } = useNotifications({
    token,
    enabled: true,
    onNotification: (notification) => {
      logger.log('Nouvelle notification:', notification)
      // Vous pouvez ici afficher un toast, jouer un son, etc.
    },
  })

  return (
    <div className="notification-panel">
      <div className="header">
        <h3>Notifications</h3>
        <span className={isConnected ? 'online' : 'offline'}>
          {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
        </span>
      </div>

      <button onClick={clearNotifications}>
        Tout effacer
      </button>

      <div className="notifications-list">
        {notifications.length === 0 && (
          <p>Aucune notification</p>
        )}

        {notifications.map((notif) => (
          <div key={notif.id} className="notification-item">
            <span className="type">{notif.type}</span>
            <p>{notif.message}</p>
            <small>{new Date(notif.timestamp).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
*/
