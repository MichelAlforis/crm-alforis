/**
 * ModalBase - Base modal component with backdrop, header, body, footer
 * Use this for simple modals or build specialized variants on top
 */
'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import type { BaseModalProps } from './types'

interface ModalBaseProps extends BaseModalProps {
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
}

const SIZE_CLASSES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg lg:max-w-2xl',
  lg: 'sm:max-w-2xl lg:max-w-4xl',
  xl: 'sm:max-w-4xl lg:max-w-6xl',
  full: 'sm:max-w-[95vw] lg:max-w-[90vw]',
}

export function ModalBase({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  showCloseButton = true,
}: ModalBaseProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex min-h-full items-end sm:items-center justify-center p-4 sm:p-6">
          {/* Modal Content */}
          <div
            className={`relative w-full ${SIZE_CLASSES[size]} bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2
                id="modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-gray-300 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
