// components/shared/ColumnSelector.tsx
// ============= COLUMN VISIBILITY SELECTOR =============

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Settings, Eye, EyeOff, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import type { ColumnConfig } from '@/hooks/useTableColumns'

interface ColumnSelectorProps<T = any> {
  columns: ColumnConfig<T>[]
  onToggle: (key: string) => void
  onReset: () => void
}

/**
 * Dropdown component to select which columns to show/hide
 */
export function ColumnSelector<T = any>({
  columns,
  onToggle,
  onReset,
}: ColumnSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const visibleCount = columns.filter((col) => col.visible).length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Settings className="w-4 h-4" />
        <span>Colonnes</span>
        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
          {visibleCount}/{columns.length}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Gérer les colonnes</h3>
              <button
                onClick={() => {
                  onReset()
                  setIsOpen(false)
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez les colonnes à afficher
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {columns.map((column) => (
              <button
                key={column.key}
                onClick={() => onToggle(column.key)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors',
                  column.visible
                    ? 'text-gray-900 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {column.visible ? (
                  <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <span className="flex-1 text-left">{column.header}</span>
                {column.visible && (
                  <span className="text-xs text-blue-600 font-medium">Visible</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
            {visibleCount} colonne{visibleCount > 1 ? 's' : ''} visible
            {visibleCount > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
