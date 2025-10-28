// components/shared/OverflowMenu.tsx
// ============= OVERFLOW MENU FOR TOUCH DEVICES =============
// Automatically groups actions in "..." menu when pointer is coarse

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { MoreVertical } from 'lucide-react'

// ============= TYPES =============
export interface OverflowAction {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
}

interface OverflowMenuProps {
  actions: OverflowAction[]
  threshold?: number // Number of actions before collapsing (default: 3)
  alwaysCollapse?: boolean // Force collapse even on fine pointer
}

// ============= HOOK: Pointer Detection =============
function usePointerType() {
  const [isCoarse, setIsCoarse] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    setIsCoarse(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsCoarse(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return { isCoarse, isFine: !isCoarse }
}

// ============= DROPDOWN PORTAL =============
interface DropdownPortalProps {
  triggerRef: React.RefObject<HTMLButtonElement>
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

function DropdownPortal({ triggerRef, isOpen, onClose, children }: DropdownPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  // const openedAtRef = useRef<number>(0)

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const vw = window.visualViewport?.width ?? window.innerWidth
      const vh = window.visualViewport?.height ?? window.innerHeight
      const dropdownWidth = 160
      const dropdownHeight = 200 // Estimate

      // Position below if space, otherwise above (viewport coords, no scroll offset)
      const shouldPositionAbove = rect.bottom + dropdownHeight > vh

      // Calculate left position: align right edge of dropdown with right edge of button
      let leftPos = rect.right - dropdownWidth

      // Clamp to viewport bounds with margin
      const margin = 8
      if (leftPos + dropdownWidth > vw - margin) {
        leftPos = vw - margin - dropdownWidth
      }
      if (leftPos < margin) {
        leftPos = margin
      }

      // Calculate top position (viewport coords)
      let topPos = shouldPositionAbove
        ? rect.top - dropdownHeight - margin
        : rect.bottom + margin

      // Clamp top to viewport
      if (topPos < margin) {
        topPos = margin
      }
      if (topPos + dropdownHeight > vh - margin) {
        topPos = vh - margin - dropdownHeight
      }

      setPosition({
        top: Math.round(topPos),
        left: Math.round(leftPos)
      })
    }
  }, [isOpen, triggerRef])

  // Close on escape key (click-outside handled by backdrop)
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop transparent pour fermer au click */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        onTouchEnd={(e) => {
          e.stopPropagation()
          onClose()
        }}
      />

      {/* Menu dropdown */}
      <div
        ref={dropdownRef}
        className="fixed z-[9999] transition-opacity duration-150"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        data-dropdown-content
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}

// ============= OVERFLOW MENU COMPONENT =============
export function OverflowMenu({
  actions,
  threshold = 3,
  alwaysCollapse = false
}: OverflowMenuProps) {
  const { isCoarse } = usePointerType()
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Decide whether to collapse
  const shouldCollapse = alwaysCollapse || (isCoarse && actions.length >= threshold)

  // Variant styles
  const getVariantStyles = (variant?: OverflowAction['variant']) => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50'
      case 'success':
        return 'text-green-600 hover:bg-green-50'
      default:
        return 'text-gray-700 hover:bg-gray-50'
    }
  }

  // If not collapsing, render buttons inline
  if (!shouldCollapse) {
    return (
      <div className="flex items-center gap-1">
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <button
              key={idx}
              onClick={action.onClick}
              disabled={action.disabled}
              className={clsx(
                'p-1.5 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center',
                action.disabled && 'opacity-50 cursor-not-allowed',
                !action.disabled && getVariantStyles(action.variant)
              )}
              title={action.label}
            >
              {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ pointerEvents: 'none' }} />}
            </button>
          )
        })}
      </div>
    )
  }

  // Collapsed menu with "..."
  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        onTouchEnd={handleToggle}
        className={clsx(
          'p-1.5 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center',
          isOpen
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
        title="Actions"
        aria-label="Open actions menu"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4 flex-shrink-0" style={{ pointerEvents: 'none' }} />
      </button>

      <DropdownPortal
        triggerRef={triggerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <button
              key={idx}
              onClick={() => {
                if (!action.disabled) {
                  action.onClick()
                  setIsOpen(false)
                }
              }}
              disabled={action.disabled}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                action.disabled && 'opacity-50 cursor-not-allowed',
                !action.disabled && getVariantStyles(action.variant)
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{action.label}</span>
            </button>
          )
        })}
      </DropdownPortal>
    </>
  )
}

// ============= HELPER: Create overflow actions from React elements =============
// Utility to convert button elements to OverflowAction format
export function createOverflowActions(
  buttons: React.ReactElement[],
  labels: string[]
): OverflowAction[] {
  return buttons.map((button, idx) => ({
    label: labels[idx] || `Action ${idx + 1}`,
    icon: button.props.children?.type, // Extract icon component if available
    onClick: button.props.onClick || (() => {}),
    variant: button.props.className?.includes('red') ? 'danger' : 'default',
    disabled: button.props.disabled
  }))
}

export default OverflowMenu
