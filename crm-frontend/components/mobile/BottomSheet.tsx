'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
}

/**
 * Bottom Sheet mobile-friendly
 * S'affiche depuis le bas de l'écran sur mobile, modal classique sur desktop
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '90vh',
}: BottomSheetProps) {
  // Lock scroll when open
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

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-modal',
          'animate-fade-in'
        )}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-modal',
          'bg-background rounded-t-3xl shadow-shadow-xl',
          'animate-slide-up md:left-1/2 md:right-auto md:-translate-x-1/2',
          'md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-radius-lg',
          'md:w-full md:max-w-2xl'
        )}
        style={{ maxHeight }}
      >
        {/* Handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-radius-md transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: `calc(${maxHeight} - 120px)` }}>
          {children}
        </div>
      </div>
    </>
  )
}

// Add animation keyframes to tailwind config if not already present
// In tailwind.config.js, add to extend.keyframes:
/*
'slide-up': {
  '0%': { transform: 'translateY(100%)' },
  '100%': { transform: 'translateY(0)' },
},
*/
