/**
 * DataTableBulkActions - Bulk action bar
 */
'use client'

import React from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { BulkAction } from './index'

interface DataTableBulkActionsProps<T = any> {
  selectedCount: number
  actions: BulkAction<T>[]
  selectedRows: T[]
  onClear: () => void
}

export function DataTableBulkActions<T = any>({
  selectedCount,
  actions,
  selectedRows,
  onClear
}: DataTableBulkActionsProps<T>) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {selectedCount} élément{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>

        <div className="h-4 w-px bg-blue-200 dark:bg-blue-700" />

        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => action.onClick(selectedRows)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
                  action.variant === 'danger'
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-800'
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {action.label}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={onClear}
        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
        title="Annuler la sélection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
