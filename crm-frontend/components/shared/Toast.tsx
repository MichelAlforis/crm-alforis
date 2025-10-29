/**
 * Toast Component - Modern Notifications
 *
 * Simple, elegant toast notifications with animations
 */
'use client'

import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styles = {
  success: 'bg-white dark:bg-slate-800 border-l-4 border-green-500 text-slate-900 dark:text-slate-100',
  error: 'bg-white dark:bg-slate-800 border-l-4 border-red-500 text-slate-900 dark:text-slate-100',
  info: 'bg-white dark:bg-slate-800 border-l-4 border-blue-500 text-slate-900 dark:text-slate-100',
  warning: 'bg-white dark:bg-slate-800 border-l-4 border-orange-500 text-slate-900 dark:text-slate-100',
}

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-orange-500',
}

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 200)
  }

  if (!isVisible) return null

  const Icon = icons[type]

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border',
        styles[type],
        'min-w-[320px] max-w-md',
        'animate-in slide-in-from-top-2 duration-200',
        isLeaving && 'animate-out slide-out-to-top-2 duration-200'
      )}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', iconColors[type])} />

      <p className="flex-1 text-sm font-medium">{message}</p>

      <button
        onClick={handleClose}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Toast Container for multiple toasts
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  )
}
