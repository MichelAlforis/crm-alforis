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

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const dropdownWidth = 160
      const dropdownHeight = 200 // Estimate

      // Position below if space, otherwise above
      const shouldPositionAbove = rect.bottom + dropdownHeight > viewportHeight

      // Calculate left position, ensuring it stays within viewport
      let leftPos = rect.right - dropdownWidth + window.scrollX

      // If dropdown would go off left edge, align to left of trigger instead
      if (leftPos < 0) {
        leftPos = rect.left + window.scrollX
      }

      // If still off right edge, align to right edge with padding
      if (leftPos + dropdownWidth > viewportWidth) {
        leftPos = viewportWidth - dropdownWidth - 8
      }

      setPosition({
        top: shouldPositionAbove
          ? rect.top - dropdownHeight + window.scrollY
          : rect.bottom + 4 + window.scrollY,
        left: Math.max(8, leftPos) // Ensure at least 8px from left edge
      })
    }
  }, [isOpen, triggerRef])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    // Add small delay to prevent immediate close on open
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node | null

        // Check if click is inside trigger button (including SVG children)
        const isInsideTrigger = target ? triggerRef.current?.contains(target) : false

        // Check if click is inside dropdown content
        const isInsideDropdown = target ? dropdownRef.current?.contains(target) : false

        // Only close if click is outside both trigger and dropdown
        if (!isInsideTrigger && !isInsideDropdown) {
          onClose()
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }

      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside as any) // Touch support
      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside as any)
        document.removeEventListener('keydown', handleEscape)
      }
    }, 100) // 100ms delay

    return () => clearTimeout(timeoutId)
  }, [isOpen, onClose, triggerRef])

  if (!isOpen || typeof window === 'undefined') return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999]"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      data-dropdown-content
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150">
        {children}
      </div>
    </div>,
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
