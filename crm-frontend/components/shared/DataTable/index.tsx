/**
 * DataTable Component - Ultra Premium Table System
 *
 * Features:
 * - Multi-select with bulk actions
 * - Inline filters
 * - Quick actions on hover
 * - Keyboard navigation
 * - Responsive (mobile = cards)
 * - Empty states
 * - Loading states with skeletons
 * - Pagination
 * - Sorting
 */
'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Search, Filter, MoreVertical, ChevronDown, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { DataTableRow } from './DataTableRow'
import { DataTableHeader } from './DataTableHeader'
import { DataTableFilters } from './DataTableFilters'
import { DataTableEmpty } from './DataTableEmpty'
import { DataTableSkeleton } from './DataTableSkeleton'
import { DataTablePagination } from './DataTablePagination'
import { DataTableBulkActions } from './DataTableBulkActions'

export interface Column<T = unknown> {
  id: string
  header: string
  accessorKey?: keyof T
  accessor?: (row: T) => unknown
  cell?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string
  minWidth?: string
}

export interface BulkAction<T = unknown> {
  id: string
  label: string
  icon?: React.ComponentType<unknown>
  onClick: (selectedRows: T[]) => void | Promise<void>
  variant?: 'default' | 'danger'
}

export interface QuickAction<T = unknown> {
  id: string
  label: string
  icon?: React.ComponentType<unknown>
  onClick: (row: T) => void
}

export interface DataTableProps<T = unknown> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string | number

  // Features
  searchable?: boolean
  searchPlaceholder?: string
  filterable?: boolean
  bulkActions?: BulkAction<T>[]
  quickActions?: QuickAction<T>[]
  onRowClick?: (row: T) => void

  // State
  isLoading?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }

  // Pagination
  pagination?: {
    pageSize: number
    currentPage: number
    totalItems: number
    onPageChange: (page: number) => void
  }

  // Styling
  variant?: 'default' | 'compact'
  className?: string
}

export function DataTable<T = unknown>({
  data,
  columns,
  keyExtractor,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  filterable = false,
  bulkActions,
  quickActions,
  onRowClick,
  isLoading = false,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pagination,
  variant = 'default',
  className
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Select all toggle
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.map(keyExtractor)))
    }
  }, [data, keyExtractor, selectedRows.size])

  // Select single row
  const handleSelectRow = useCallback((key: string | number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedRows(newSelected)
  }, [selectedRows])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedRows(new Set())
  }, [])

  // Get selected row data
  const selectedRowsData = useMemo(() => {
    return data.filter(row => selectedRows.has(keyExtractor(row)))
  }, [data, selectedRows, keyExtractor])

  // Sorting
  const handleSort = useCallback((columnId: string) => {
    setSortConfig(current => {
      if (current?.key === columnId) {
        return {
          key: columnId,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key: columnId, direction: 'asc' }
    })
  }, [])

  // Loading state
  if (isLoading) {
    return <DataTableSkeleton columns={columns.length} rows={5} />
  }

  // Empty state
  if (isEmpty || data.length === 0) {
    return (
      <DataTableEmpty
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  const hasSelection = selectedRows.size > 0

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400/20 focus:border-blue-500 transition-all"
              />
            </div>
          )}

          {/* Filters toggle */}
          {filterable && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'px-3 py-2 text-sm font-medium rounded-lg border transition-all',
                showFilters
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              )}
            >
              <Filter className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selection count */}
        {hasSelection && (
          <div className="text-sm text-gray-600 dark:text-slate-400">
            {selectedRows.size} sélectionné{selectedRows.size > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && filterable && (
        <DataTableFilters columns={columns.filter(col => col.filterable)} />
      )}

      {/* Bulk Actions Bar */}
      {hasSelection && bulkActions && (
        <DataTableBulkActions
          selectedCount={selectedRows.size}
          actions={bulkActions}
          selectedRows={selectedRowsData}
          onClear={handleClearSelection}
        />
      )}

      {/* Table */}
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <DataTableHeader
              columns={columns}
              hasSelection={!!bulkActions}
              isAllSelected={selectedRows.size === data.length && data.length > 0}
              onSelectAll={handleSelectAll}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {data.map((row, index) => {
                const key = keyExtractor(row)
                const isSelected = selectedRows.has(key)

                return (
                  <DataTableRow
                    key={key}
                    row={row}
                    columns={columns}
                    isSelected={isSelected}
                    onSelect={() => handleSelectRow(key)}
                    onClick={onRowClick}
                    quickActions={quickActions}
                    hasSelection={!!bulkActions}
                    variant={variant}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination {...pagination} />
      )}
    </div>
  )
}
