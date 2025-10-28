// lib/websocket.ts
// ============= UTILITAIRE CLIENT WEBSOCKET =============

'use client'
import { logger } from '@/lib/logger'

interface WebSocketClientOptions {
  url: string
  token?: string
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelayMs?: number
  heartbeatIntervalMs?: number
  logger?: (message: string, ...args: unknown[]) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (event: MessageEvent) => void
}

const DEFAULT_RECONNECT_DELAY = 1500
const DEFAULT_HEARTBEAT_INTERVAL = 30_000

export class WebSocketClient {
  private options: WebSocketClientOptions
  private socket?: WebSocket
  private reconnectAttempts = 0
  private reconnectTimer?: number
  private heartbeatTimer?: number
  private manualClose = false

  constructor(options: WebSocketClientOptions) {
    this.options = options
  }

  connect(): void {
    if (typeof window === 'undefined') {
      return
    }

    this.clearReconnectTimer()
    const url = this.composeUrl()
    this.log('🔌 Connecting to', url)

    try {
      this.socket = new WebSocket(url)
    } catch (error) {
      this.log('❌ Failed to create WebSocket:', error)
      this.scheduleReconnect()
      return
    }

    this.socket.addEventListener('open', (event) => {
      this.log('✅ WebSocket connected')
      this.reconnectAttempts = 0
      this.options.onOpen?.(event)
      this.startHeartbeat()
    })

    this.socket.addEventListener('message', (event) => {
      this.options.onMessage?.(event)
    })

    this.socket.addEventListener('close', (event) => {
      this.log('⚠️ WebSocket closed', event.code, event.reason)
      this.stopHeartbeat()
      this.options.onClose?.(event)

      if (!this.manualClose) {
        this.scheduleReconnect()
      }
    })

    this.socket.addEventListener('error', (event) => {
      this.log('❌ WebSocket error', event)
      this.options.onError?.(event)
    })
  }

  disconnect(): void {
    this.manualClose = true
    this.stopHeartbeat()
    this.clearReconnectTimer()
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      this.socket.close()
    }
    this.socket = undefined
  }

  reconnect(): void {
    this.manualClose = false
    this.disconnect()
    this.reconnectAttempts = 0
    this.connect()
  }

  send(data: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('⚠️ Cannot send message, socket not open')
      return
    }
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      this.socket.send(payload)
    } catch (error) {
      this.log('❌ Failed to send message', error)
    }
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN
  }

  private composeUrl(): string {
    const { url, token } = this.options
    if (typeof window === 'undefined') {
      return url
    }

    let resolvedUrl: URL
    try {
      resolvedUrl = new URL(url, window.location.href)
    } catch {
      resolvedUrl = new URL(url, window.location.origin)
    }

    if (token) {
      resolvedUrl.searchParams.set('token', token)
    }

    return resolvedUrl.toString()
  }

  private scheduleReconnect(): void {
    if (this.options.autoReconnect === false || typeof window === 'undefined') {
      return
    }

    const maxAttempts = this.options.maxReconnectAttempts ?? 8
    if (this.reconnectAttempts >= maxAttempts) {
      this.log('❌ Max reconnect attempts reached')
      return
    }

    const baseDelay = this.options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), 30_000)
    this.reconnectAttempts += 1

    this.log(`🔁 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`)

    this.clearReconnectTimer()
    this.reconnectTimer = window.setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    if (typeof window === 'undefined') {
      return
    }

    const interval = this.options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' })
      }
    }, Math.max(interval, 5_000))
  }

  private stopHeartbeat(): void {
    if (typeof window === 'undefined') {
      return
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private clearReconnectTimer(): void {
    if (typeof window === 'undefined') {
      return
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.options.logger) {
      this.options.logger(message, ...args)
    } else if (process.env.NODE_ENV !== 'production') {
      logger.log('[WebSocketClient]', message, ...args)
    }
  }
}

/**
 * Helper pour convertir une URL HTTP en URL WebSocket
 */
export function toWebSocketUrl(httpUrl: string): string {
  if (httpUrl.startsWith('ws://') || httpUrl.startsWith('wss://')) {
    return httpUrl
  }
  if (httpUrl.startsWith('https://')) {
    return httpUrl.replace('https://', 'wss://')
  }
  if (httpUrl.startsWith('http://')) {
    return httpUrl.replace('http://', 'ws://')
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return toWebSocketUrl(new URL(httpUrl, origin).toString())
  }
  return httpUrl
}
