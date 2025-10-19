// components/ui/Toast.tsx - Système de notifications moderne
'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
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

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss après duration (défaut: 5s)
    const duration = toast.duration ?? 5000
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
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
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

  const { icon: Icon, bgClass, borderClass, iconClass, titleClass, messageClass } =
    config[toast.type]

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
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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
  success: (title: string, message?: string) => {
    // Cette fonction sera remplacée par le hook dans les composants
    console.log('Toast success:', title, message)
  },
  error: (title: string, message?: string) => {
    console.log('Toast error:', title, message)
  },
  warning: (title: string, message?: string) => {
    console.log('Toast warning:', title, message)
  },
  info: (title: string, message?: string) => {
    console.log('Toast info:', title, message)
  },
}
