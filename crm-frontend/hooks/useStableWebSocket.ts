// hooks/useStableWebSocket.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook WebSocket robuste pour Next.js dev + HMR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Garantit:
// - 1 seule connexion (évite double-connect avec StrictMode)
// - Cleanup garanti (pas de connexions zombies)
// - Reconnection intelligente avec backoff exponentiel
// - Heartbeat automatique (évite timeouts silencieux)
// - Support Fast-Refresh / HMR (fermeture propre)
// - Respect visibilité page (économise ressources)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client'

import { useEffect, useRef } from 'react'

type UseStableWebSocketOptions = {
  url: string
  enabled?: boolean
  onMessage?: (event: MessageEvent) => void
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  heartbeatIntervalMs?: number
}

export function useStableWebSocket({
  url,
  enabled = true,
  onMessage,
  onOpen,
  onClose,
  onError,
  heartbeatIntervalMs = 25_000, // 25s par défaut
}: UseStableWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<number | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const manualCloseRef = useRef(false)

  const startHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }

    heartbeatRef.current = window.setInterval(() => {
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }))
        }
      } catch (error) {
        console.warn('[useStableWebSocket] Heartbeat failed:', error)
      }
    }, heartbeatIntervalMs)
  }

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const connect = () => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    // Évite double-connect (StrictMode + Fast Refresh)
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.debug('[useStableWebSocket] Already connected/connecting, skipping')
      return
    }

    clearReconnectTimer()
    manualCloseRef.current = false

    try {
      console.debug('[useStableWebSocket] 🔌 Connecting to', url)
      wsRef.current = new WebSocket(url)
    } catch (error) {
      console.error('[useStableWebSocket] ❌ Failed to create WebSocket:', error)
      scheduleReconnect()
      return
    }

    wsRef.current.addEventListener('open', () => {
      console.debug('[useStableWebSocket] ✅ Connected')
      reconnectAttemptsRef.current = 0
      startHeartbeat()
      onOpen?.()
    })

    wsRef.current.addEventListener('message', (event) => {
      onMessage?.(event)
    })

    wsRef.current.addEventListener('close', (event) => {
      console.debug(
        '[useStableWebSocket] ⚠️ Connection closed',
        event.code,
        event.reason
      )
      stopHeartbeat()
      onClose?.(event)

      // Reconnect seulement si:
      // 1. Pas une fermeture manuelle
      // 2. Enabled est true
      // 3. Page visible
      if (
        !manualCloseRef.current &&
        enabled &&
        document.visibilityState === 'visible'
      ) {
        scheduleReconnect()
      }
    })

    wsRef.current.addEventListener('error', (event) => {
      console.error('[useStableWebSocket] ❌ WebSocket error:', event)
      onError?.(event)
    })
  }

  const scheduleReconnect = () => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const maxAttempts = 6
    if (reconnectAttemptsRef.current >= maxAttempts) {
      console.error('[useStableWebSocket] ❌ Max reconnect attempts reached')
      return
    }

    // Backoff exponentiel: 300ms → 600ms → 1.2s → 2.4s → 4.8s → 9.6s → 19.2s
    const n = Math.min(reconnectAttemptsRef.current, 6)
    const delay = 300 * Math.pow(2, n)
    reconnectAttemptsRef.current += 1

    console.debug(
      `[useStableWebSocket] 🔁 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current})`
    )

    clearReconnectTimer()
    reconnectTimerRef.current = window.setTimeout(() => {
      connect()
    }, delay)
  }

  const disconnect = (code = 1000, reason = 'component unmount') => {
    manualCloseRef.current = true
    stopHeartbeat()
    clearReconnectTimer()

    try {
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close(code, reason)
      }
    } catch (error) {
      console.warn('[useStableWebSocket] Error during disconnect:', error)
    }

    wsRef.current = null
  }

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Gestion visibilité page (économise ressources)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.debug('[useStableWebSocket] 👁️ Page visible, connecting...')
        connect()
      } else {
        console.debug('[useStableWebSocket] 🙈 Page hidden, closing...')
        disconnect(1001, 'page hidden')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Connexion initiale si page visible
    if (document.visibilityState === 'visible') {
      connect()
    }

    // Cleanup garanti
    return () => {
      console.debug('[useStableWebSocket] 🧹 Cleaning up...')
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      disconnect(1000, 'component unmount')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled])

  // Support HMR / Fast Refresh (Next.js dev)
  useEffect(() => {
    // Fermer proprement lors du Hot Module Replacement
    if (typeof window !== 'undefined' && (window as any).module?.hot) {
      ;(window as any).module.hot.dispose(() => {
        console.debug('[useStableWebSocket] 🔥 HMR dispose, closing...')
        disconnect(1000, 'hmr dispose')
      })
    }
  }, [])

  // Cleanup lors de l'unload de la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect(1000, 'page unload')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: () => {
      reconnectAttemptsRef.current = 0
      disconnect()
      setTimeout(connect, 100)
    },
    disconnect: () => disconnect(1000, 'manual disconnect'),
  }
}
