/**
 * DataTableHeader - Table header with sorting
 */
'use client'

import React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import clsx from 'clsx'
import { Column } from './index'

interface DataTableHeaderProps {
  columns: Column[]
  hasSelection: boolean
  isAllSelected: boolean
  onSelectAll: () => void
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null
  onSort: (key: string) => void
}

export function DataTableHeader({
  columns,
  hasSelection,
  isAllSelected,
  onSelectAll,
  sortConfig,
  onSort
}: DataTableHeaderProps) {
  return (
    <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
      <tr>
        {/* Selection column */}
        {hasSelection && (
          <th className="w-12 px-4 py-3">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onSelectAll}
              className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            />
          </th>
        )}

        {/* Column headers */}
        {columns.map((column) => {
          const isSorted = sortConfig?.key === column.id
          const direction = isSorted ? sortConfig.direction : null

          return (
            <th
              key={column.id}
              className={clsx(
                'px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider',
                column.sortable && 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors',
                column.width && `w-[${column.width}]`,
                column.minWidth && `min-w-[${column.minWidth}]`
              )}
              onClick={() => column.sortable && onSort(column.id)}
              style={{
                width: column.width,
                minWidth: column.minWidth
              }}
            >
              <div className="flex items-center gap-2">
                <span>{column.header}</span>
                {column.sortable && (
                  <span className="text-gray-400 dark:text-slate-500">
                    {isSorted ? (
                      direction === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-4 h-4" />
                    )}
                  </span>
                )}
              </div>
            </th>
          )
        })}

        {/* Actions column */}
        <th className="w-16 px-4 py-3">
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  )
}
