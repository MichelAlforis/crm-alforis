/**
 * DataTableRow - Individual table row with hover actions
 */
'use client'

import React, { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import clsx from 'clsx'
import { Column, QuickAction } from './index'

interface DataTableRowProps<T = any> {
  row: T
  columns: Column<T>[]
  isSelected: boolean
  onSelect: () => void
  onClick?: (row: T) => void
  quickActions?: QuickAction<T>[]
  hasSelection: boolean
  variant: 'default' | 'compact'
}

export function DataTableRow<T = any>({
  row,
  columns,
  isSelected,
  onSelect,
  onClick,
  quickActions,
  hasSelection,
  variant
}: DataTableRowProps<T>) {
  const [showActions, setShowActions] = useState(false)

  const getCellValue = (column: Column<T>, row: T) => {
    if (column.accessor) {
      // Si accessor est une fonction, l'appeler avec row
      if (typeof column.accessor === 'function') {
        return column.accessor(row)
      }
      // Si accessor est une string, l'utiliser comme clé
      return row[column.accessor as keyof T]
    }
    if (column.accessorKey) {
      return row[column.accessorKey]
    }
    return null
  }

  return (
    <tr
      className={clsx(
        'group transition-all duration-200',
        'hover:bg-gray-50 dark:bg-slate-800/80 dark:hover:bg-slate-800/50',
        isSelected && 'bg-blue-50/50 dark:bg-blue-500/10',
        onClick && 'cursor-pointer'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onClick?.(row)}
    >
      {/* Selection checkbox */}
      {hasSelection && (
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400/20 transition-all cursor-pointer"
          />
        </td>
      )}

      {/* Data cells */}
      {columns.map((column) => {
        const value = getCellValue(column, row)
        const displayValue = column.cell ? column.cell(value, row) : value

        return (
          <td
            key={column.id}
            className={clsx(
              'px-4 text-sm text-gray-900 dark:text-slate-100',
              variant === 'compact' ? 'py-2' : 'py-3'
            )}
          >
            {displayValue}
          </td>
        )
      })}

      {/* Quick actions */}
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {showActions && quickActions && quickActions.length > 0 && (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      action.onClick(row)
                    }}
                    className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200 transition-all"
                    title={action.label}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                  </button>
                )
              })}
            </div>
          )}

          <button className="p-2 rounded-lg text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
