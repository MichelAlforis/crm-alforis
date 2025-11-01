/**
 * DataTableMobileCard - Mobile Card View Component
 *
 * Displays table data as expandable cards on mobile devices (<768px)
 * - Shows high-priority columns by default
 * - Expandable section for medium/low priority columns
 * - Includes selection checkbox if enabled
 * - Includes quick action buttons
 */
'use client'

import React, { useState } from 'react'
import { ChevronRight, MoreVertical } from 'lucide-react'
import clsx from 'clsx'
import { Column, QuickAction } from './index'

interface DataTableMobileCardProps<T = any> {
  row: T
  columns: Column<T>[]
  isSelected: boolean
  onSelect: () => void
  onClick?: (row: T) => void
  quickActions?: QuickAction<T>[]
  hasSelection: boolean
}

export function DataTableMobileCard<T = any>({
  row,
  columns,
  isSelected,
  onSelect,
  onClick,
  quickActions,
  hasSelection
}: DataTableMobileCardProps<T>) {
  const [expanded, setExpanded] = useState(false)

  // Determine priority (if column has no priority prop, consider it high)
  const highPriorityColumns = columns.filter(col => !col.priority || col.priority === 'high')
  const lowPriorityColumns = columns.filter(col => col.priority === 'medium' || col.priority === 'low')

  // Get cell value (same logic as DataTableRow)
  const getCellValue = (column: Column<T>, row: T) => {
    if (column.accessor) {
      // If accessor is a function, call it with row
      if (typeof column.accessor === 'function') {
        return column.accessor(row)
      }
      // If accessor is a string, use it as key
      return row[column.accessor as keyof T]
    }
    if (column.accessorKey) {
      return row[column.accessorKey]
    }
    return null
  }

  return (
    <div
      className={clsx(
        'border border-border dark:border-slate-700 rounded-lg p-spacing-md bg-surface dark:bg-slate-900 shadow-sm transition-all',
        isSelected && 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/30 dark:bg-blue-500/10',
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      onClick={() => onClick?.(row)}
    >
      {/* Selection checkbox at top if enabled */}
      {hasSelection && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-slate-700">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400/20 transition-all cursor-pointer"
          />
          <span className="text-fluid-xs text-text-secondary">
            {isSelected ? 'Sélectionné' : 'Sélectionner'}
          </span>
        </div>
      )}

      {/* High priority columns */}
      <div className="space-y-spacing-xs">
        {highPriorityColumns.map((column) => {
          const value = getCellValue(column, row)
          const displayValue: React.ReactNode = column.cell ? column.cell(value, row) : value

          return (
            <div key={column.id} className="flex justify-between items-start gap-spacing-sm">
              <span className="text-fluid-xs text-text-secondary font-medium min-w-[80px]">
                {column.header}
              </span>
              <span className="text-fluid-sm text-text-primary text-right flex-1">
                {displayValue}
              </span>
            </div>
          )
        })}
      </div>

      {/* Expand button if low priority columns exist */}
      {lowPriorityColumns.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className="mt-3 flex items-center gap-1 text-fluid-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          <ChevronRight
            className={clsx(
              'w-4 h-4 transition-transform',
              expanded && 'rotate-90'
            )}
          />
          {expanded ? 'Réduire' : 'Voir plus'}
        </button>
      )}

      {/* Low priority columns when expanded */}
      {expanded && lowPriorityColumns.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-spacing-xs">
          {lowPriorityColumns.map((column) => {
            const value = getCellValue(column, row)
            const displayValue: React.ReactNode = column.cell ? column.cell(value, row) : value

            return (
              <div key={column.id} className="flex justify-between items-start gap-spacing-sm">
                <span className="text-fluid-xs text-text-secondary font-medium min-w-[80px]">
                  {column.header}
                </span>
                <span className="text-fluid-sm text-text-primary text-right flex-1">
                  {displayValue}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick actions at bottom */}
      {quickActions && quickActions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-1">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick(row)
                }}
                className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200 transition-all"
                title={action.label}
              >
                {Icon && <Icon className="w-4 h-4" />}
              </button>
            )
          })}
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
