// components/shared/ConfirmDialog.tsx
// ============= MODERN CONFIRMATION DIALOG =============

'use client'

import React from 'react'
import { AlertTriangle, Power, Info, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

export type ConfirmDialogType = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmDialogType
  isLoading?: boolean
}

const DIALOG_CONFIG = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmButtonBg: 'bg-red-600 hover:bg-red-700',
    confirmButtonText: 'text-white',
  },
  warning: {
    icon: Power,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    confirmButtonBg: 'bg-orange-600 hover:bg-orange-700',
    confirmButtonText: 'text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmButtonBg: 'bg-blue-600 hover:bg-blue-700',
    confirmButtonText: 'text-white',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmButtonBg: 'bg-green-600 hover:bg-green-700',
    confirmButtonText: 'text-white',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const config = DIALOG_CONFIG[type]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        {/* Header with icon */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={clsx('flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', config.iconBg)}>
            <Icon className={clsx('w-6 h-6', config.iconColor)} />
          </div>
          <div className="flex-1 pt-1">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-semibold text-gray-900 leading-tight"
            >
              {title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="px-6 pb-6">
          <p
            id="confirm-dialog-description"
            className="text-sm text-gray-600 leading-relaxed pl-16"
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              config.confirmButtonBg,
              config.confirmButtonText,
              type === 'danger' && 'focus:ring-red-500',
              type === 'warning' && 'focus:ring-orange-500',
              type === 'info' && 'focus:ring-blue-500',
              type === 'success' && 'focus:ring-green-500'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Chargement...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
