// components/ui/Toast.tsx - Système de notifications moderne
'use client'
import { logger } from '@/lib/logger'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastVariant = 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'error'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface ToastOptions {
  title: string
  message?: unknown
  description?: unknown
  duration?: number
  type?: ToastType
  variant?: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: ToastOptions) => void
  hideToast: (id: string) => void
  toast: (toast: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  // Helper pour convertir n'importe quel message en string
  const normalizeMessage = (message: unknown): string => {
    if (typeof message === 'string') return message
    if (message === null || message === undefined) return ''

    // Si c'est un objet avec des erreurs de validation Pydantic
    if (typeof message === 'object') {
      if (Array.isArray(message)) {
        return message
          .map((err) => {
            if (typeof err === 'object' && err && 'msg' in err) {
              const casted = err as { msg?: unknown }
              return casted.msg ? String(casted.msg) : String(err)
            }
            return String(err)
          })
          .join(', ')
      }
      const record = message as Record<string, unknown>
      if (record.msg !== undefined) return String(record.msg)
      if (record.detail !== undefined) return String(record.detail)
      if (record.message !== undefined) return String(record.message)
      return JSON.stringify(record)
    }

    return String(message)
  }

  const mapVariantToType = (variant?: ToastVariant): ToastType => {
    switch (variant) {
      case 'success':
        return 'success'
      case 'warning':
        return 'warning'
      case 'destructive':
      case 'error':
        return 'error'
      default:
        return 'info'
    }
  }

  const buildToastPayload = (options: ToastOptions): Omit<Toast, 'id'> => {
    const intent = options.type ?? mapVariantToType(options.variant)
    const rawMessage = options.message ?? options.description

    return {
      type: intent,
      title: options.title,
      message: rawMessage !== undefined ? normalizeMessage(rawMessage) : undefined,
      duration: options.duration,
    }
  }

  const showToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7)
    const payload = buildToastPayload(options)
    const newToast: Toast = {
      ...payload,
      id,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss après duration (défaut: 5s)
    const duration = payload.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id)
      }, duration)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, toast: showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: Toast[]
  onClose: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-3 max-w-md w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      icon: CheckCircle,
      bgClass: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderClass: 'border-green-500',
      iconClass: 'text-green-600',
      titleClass: 'text-green-900',
      messageClass: 'text-green-700',
    },
    error: {
      icon: XCircle,
      bgClass: 'bg-gradient-to-r from-red-50 to-rose-50',
      borderClass: 'border-red-500',
      iconClass: 'text-red-600',
      titleClass: 'text-red-900',
      messageClass: 'text-red-700',
    },
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-gradient-to-r from-amber-50 to-orange-50',
      borderClass: 'border-amber-500',
      iconClass: 'text-amber-600',
      titleClass: 'text-amber-900',
      messageClass: 'text-amber-700',
    },
    info: {
      icon: Info,
      bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      borderClass: 'border-blue-500',
      iconClass: 'text-blue-600',
      titleClass: 'text-blue-900',
      messageClass: 'text-blue-700',
    },
  }

  const toastConfig = config[toast.type] || config.info
  const { icon: Icon, bgClass, borderClass, iconClass, titleClass, messageClass } = toastConfig

  return (
    <div
      className={`
        ${bgClass} ${borderClass}
        border-l-4 rounded-lg shadow-lg p-4
        animate-in slide-in-from-right-full fade-in duration-300
        hover:shadow-xl transition-shadow
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${titleClass}`}>{toast.title}</p>
          {toast.message && (
            <p className={`text-sm mt-1 ${messageClass}`}>{toast.message}</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-slate-400 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Helpers pour utilisation rapide
export const toast = {
  success: (title: string, message?: string | unknown) => {
    // Cette fonction sera remplacée par le hook dans les composants
    logger.log('Toast success:', title, message)
  },
  error: (title: string, message?: string | unknown) => {
    logger.log('Toast error:', title, message)
  },
  warning: (title: string, message?: string | unknown) => {
    logger.log('Toast warning:', title, message)
  },
  info: (title: string, message?: string | unknown) => {
    logger.log('Toast info:', title, message)
  },
}
