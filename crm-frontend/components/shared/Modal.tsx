// components/shared/Modal.tsx
// ============= MODAL COMPONENT - RÉUTILISABLE =============
import React from 'react'
import { Card } from "./Card"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg lg:max-w-2xl',
    lg: 'sm:max-w-2xl lg:max-w-4xl',
    xl: 'sm:max-w-4xl lg:max-w-6xl',
    full: 'sm:max-w-[95vw] lg:max-w-[90vw]',
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex min-h-full items-end sm:items-center justify-center p-4 sm:p-6">
          <Card
            className={`w-full max-w-full ${sizeClasses[size]} max-h-[calc(100vh-3rem)] overflow-y-auto rounded-t-radius-lg rounded-b-none sm:rounded-radius-lg sm:rounded-b-radius-lg`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="mb-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
