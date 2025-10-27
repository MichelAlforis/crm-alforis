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
  const openedAtRef = useRef<number>(0)

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

  // Close on click outside
  useEffect(() => {
    console.log('🟡 [DropdownPortal] useEffect isOpen:', isOpen)
    if (!isOpen) return

    // Mark when dropdown was opened
    openedAtRef.current = Date.now()
    console.log('📍 [DropdownPortal] Marked open time:', openedAtRef.current)

    // Add delay to prevent immediate close on open - LONGER delay for touch events
    const timeoutId = setTimeout(() => {
      console.log('🟠 [DropdownPortal] Setting up click-outside handlers')

      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node | null

        // Check if click is inside trigger button (including SVG children)
        const isInsideTrigger = target ? triggerRef.current?.contains(target) : false

        // Check if click is inside dropdown content
        const isInsideDropdown = target ? dropdownRef.current?.contains(target) : false

        console.log('🔴 [DropdownPortal] Click/touch detected', {
          type: e.type,
          target: (target as HTMLElement)?.tagName || 'null',
          isInsideTrigger,
          isInsideDropdown,
          triggerExists: !!triggerRef.current,
          dropdownExists: !!dropdownRef.current
        })

        // Only close if click is outside both trigger and dropdown
        if (!isInsideTrigger && !isInsideDropdown) {
          console.log('🔴 [DropdownPortal] Closing dropdown - click was outside')
          onClose()
        } else {
          console.log('🟢 [DropdownPortal] Keeping open - click was inside')
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          console.log('⌨️  [DropdownPortal] Escape pressed, closing')
          onClose()
        }
      }

      // Only mousedown, NOT touchstart - touchstart causes issues on mobile
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)

      return () => {
        console.log('🟣 [DropdownPortal] Cleaning up click-outside handlers')
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, 300) // 300ms delay - longer to avoid touchstart race

    return () => clearTimeout(timeoutId)
  }, [isOpen, onClose, triggerRef])

  if (!isOpen || typeof window === 'undefined') {
    if (!isOpen) console.log('🔵 [DropdownPortal] Not rendering - isOpen is false')
    return null
  }

  console.log('✅ [DropdownPortal] Rendering dropdown at position:', position)

  return createPortal(
    <>
      {/* Backdrop transparent pour fermer au click */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          console.log('🖱️  [DropdownPortal] Backdrop clicked - closing')
          e.stopPropagation()
          onClose()
        }}
        onTouchEnd={(e) => {
          console.log('👆 [DropdownPortal] Backdrop touched - closing')
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
        onClick={(e) => {
          console.log('🖱️  [DropdownPortal] Dropdown clicked - stopping propagation')
          e.stopPropagation()
        }}
        onTouchEnd={(e) => {
          console.log('👆 [DropdownPortal] Dropdown touchend - stopping propagation')
          e.stopPropagation()
        }}
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
    console.log('🔵 [OverflowMenu] Toggle clicked', {
      type: e.type,
      currentIsOpen: isOpen,
      target: e.target,
      currentTarget: e.currentTarget
    })
    setIsOpen((prev) => {
      console.log('🟢 [OverflowMenu] Setting isOpen from', prev, 'to', !prev)
      return !prev
    })
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
