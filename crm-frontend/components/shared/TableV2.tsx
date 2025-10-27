// components/shared/TableV2.tsx
// ============= RESPONSIVE TABLE V2 - ADVANCED =============
// Features: Sticky columns, mobile collapse, overflow menu, pointer detection

'use client'

import React, { useState } from 'react'
import clsx from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, MoreVertical } from 'lucide-react'

// ============= TYPES =============
export interface ColumnV2<T = any> {
  header: string
  accessor: string | ((row: T) => any)
  sortable?: boolean
  width?: string
  minWidth?: string
  maxWidth?: string
  render?: (value: any, row: T, index: number) => React.ReactNode
  className?: string
  // V2 features
  sticky?: 'left' | 'right' | false
  priority?: 'high' | 'medium' | 'low' // For mobile collapse
  hidden?: boolean
}

export interface TableV2Props<T = any> {
  columns: ColumnV2<T>[]
  data: T[]
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  sortConfig?: {
    key: string
    direction: 'asc' | 'desc'
  }
  onSort?: (key: string) => void
  variant?: 'default' | 'striped' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
  stickyHeader?: boolean
  // V2 features
  mobileCollapse?: boolean // Enable collapse/expand on mobile
  overflowMenu?: boolean // Group actions in "..." menu on touch devices
  rowKey?: string | ((row: T) => string | number) // Unique key for rows
}

// ============= HOOKS =============
function usePointerType() {
  const [isCoarse, setIsCoarse] = useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    setIsCoarse(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsCoarse(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return { isCoarse, isFine: !isCoarse }
}

// ============= UTILITY FUNCTIONS =============
function getColumnStickySide(columns: ColumnV2<any>[]): Record<number, 'left' | 'right'> {
  const stickySides: Record<number, 'left' | 'right'> = {}

  columns.forEach((col, idx) => {
    if (col.sticky === 'left' || col.sticky === 'right') {
      stickySides[idx] = col.sticky
    }
  })

  return stickySides
}

function calculateStickyOffset(columns: ColumnV2<any>[], index: number, side: 'left' | 'right'): string {
  let offset = 0

  if (side === 'left') {
    for (let i = 0; i < index; i++) {
      if (columns[i].sticky === 'left') {
        // Estimate width (you can parse minWidth if needed)
        offset += 120 // Default column width
      }
    }
  } else {
    for (let i = columns.length - 1; i > index; i--) {
      if (columns[i].sticky === 'right') {
        offset += 120
      }
    }
  }

  return `${offset}px`
}

// ============= SORT ICON =============
const SortIcon = ({ column, sortConfig }: { column: string; sortConfig?: TableV2Props['sortConfig'] }) => {
  if (!sortConfig || sortConfig.key !== column) {
    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
  }

  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-4 h-4 text-blue-600" />
    : <ChevronDown className="w-4 h-4 text-blue-600" />
}

// ============= SKELETON ROW =============
const SkeletonRow = ({ columns }: { columns: ColumnV2[] }) => (
  <tr>
    {columns.filter(col => !col.hidden).map((col, idx) => (
      <td key={idx} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      </td>
    ))}
  </tr>
)

// ============= EMPTY STATE =============
const EmptyState = ({ message, colSpan }: { message: string; colSpan: number }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-12">
      <div className="flex flex-col items-center justify-center">
        <svg
          className="w-12 h-12 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </td>
  </tr>
)

// ============= MOBILE COLLAPSED ROW =============
interface CollapsedRowProps<T> {
  row: T
  rowIdx: number
  columns: ColumnV2<T>[]
  getCellValue: (row: T, accessor: string | ((row: T) => any)) => any
}

function CollapsedRow<T>({ row, rowIdx, columns, getCellValue }: CollapsedRowProps<T>) {
  const [expanded, setExpanded] = useState(false)

  // Show only high priority columns in collapsed view
  const highPriorityColumns = columns.filter(col =>
    !col.hidden && (col.priority === 'high' || col.priority === undefined)
  )
  const lowPriorityColumns = columns.filter(col =>
    !col.hidden && (col.priority === 'medium' || col.priority === 'low')
  )

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      {/* Collapsed View - High Priority */}
      <div className="space-y-2">
        {highPriorityColumns.map((column, colIdx) => {
          const value = getCellValue(row, column.accessor)

          return (
            <div key={colIdx} className="flex justify-between items-start gap-2">
              <span className="text-xs text-gray-500 font-medium min-w-[80px]">
                {column.header}
              </span>
              <span className="text-sm text-gray-900 text-right flex-1">
                {column.render ? column.render(value, row, rowIdx) : value}
              </span>
            </div>
          )
        })}
      </div>

      {/* Expand/Collapse Button */}
      {lowPriorityColumns.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
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

      {/* Expanded View - Low Priority */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {lowPriorityColumns.map((column, colIdx) => {
            const value = getCellValue(row, column.accessor)

            return (
              <div key={colIdx} className="flex justify-between items-start gap-2">
                <span className="text-xs text-gray-500 font-medium min-w-[80px]">
                  {column.header}
                </span>
                <span className="text-sm text-gray-900 text-right flex-1">
                  {column.render ? column.render(value, row, rowIdx) : value}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============= TABLE V2 COMPONENT =============
export function TableV2<T = any>({
  columns,
  data,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'Aucune donnée disponible',
  sortConfig,
  onSort,
  variant = 'default',
  size = 'md',
  stickyHeader = false,
  mobileCollapse = true,
  overflowMenu = false,
  rowKey,
}: TableV2Props<T>) {
  const { isCoarse } = usePointerType()

  // Size styles
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Variant styles
  const variants = {
    default: '',
    striped: '[&_tbody_tr:nth-child(even)]:bg-gray-50/50',
    bordered: 'border border-gray-200',
  }

  // Get sticky positions
  const stickySides = getColumnStickySide(columns)
  const visibleColumns = columns.filter(col => !col.hidden)

  // Get cell value
  const getCellValue = (row: T, accessor: string | ((row: T) => any)) => {
    if (typeof accessor === 'function') {
      return accessor(row)
    }
    return (row as any)[accessor]
  }

  // Get row key
  const getRowKey = (row: T, idx: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row)
    }
    if (typeof rowKey === 'string') {
      return (row as any)[rowKey]
    }
    return idx
  }

  return (
    <>
      {/* Desktop/Tablet Table */}
      <div className={clsx(
        'hidden md:block w-full overflow-hidden rounded-lg border border-gray-200',
        variants[variant]
      )}>
        <div className="overflow-x-auto">
          <table className={clsx('w-full', sizes[size])}>
            <thead
              className={clsx(
                'bg-gray-50 border-b border-gray-200',
                stickyHeader && 'sticky top-0 z-20 shadow-sm'
              )}
            >
              <tr>
                {visibleColumns.map((column, idx) => {
                  const isSticky = stickySides[idx]
                  const stickyOffset = isSticky
                    ? calculateStickyOffset(visibleColumns, idx, isSticky)
                    : undefined

                  return (
                    <th
                      key={idx}
                      className={clsx(
                        'px-4 py-3 text-left font-semibold text-gray-700 bg-gray-50',
                        'first:pl-6 last:pr-6',
                        column.width,
                        column.minWidth && `min-w-[${column.minWidth}]`,
                        column.sortable && 'cursor-pointer hover:text-gray-900 select-none',
                        column.className,
                        // Sticky styles
                        isSticky && 'sticky z-10',
                        isSticky === 'left' && 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                        isSticky === 'right' && 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                      )}
                      style={isSticky ? {
                        [isSticky]: stickyOffset,
                      } : undefined}
                      onClick={() => column.sortable && onSort?.(
                        typeof column.accessor === 'string' ? column.accessor : ''
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.header}</span>
                        {column.sortable && (
                          <SortIcon
                            column={typeof column.accessor === 'string' ? column.accessor : ''}
                            sortConfig={sortConfig}
                          />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <>
                  {[...Array(5)].map((_, idx) => (
                    <SkeletonRow key={idx} columns={visibleColumns} />
                  ))}
                </>
              ) : isEmpty || data.length === 0 ? (
                <EmptyState message={emptyMessage} colSpan={visibleColumns.length} />
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={getRowKey(row, rowIdx)}
                    className="hover:bg-gray-50/80 transition-colors duration-150"
                  >
                    {visibleColumns.map((column, colIdx) => {
                      const value = getCellValue(row, column.accessor)
                      const isSticky = stickySides[colIdx]
                      const stickyOffset = isSticky
                        ? calculateStickyOffset(visibleColumns, colIdx, isSticky)
                        : undefined

                      return (
                        <td
                          key={colIdx}
                          className={clsx(
                            'px-4 py-3 text-gray-900 bg-white',
                            'first:pl-6 last:pr-6',
                            column.className,
                            // Sticky styles
                            isSticky && 'sticky z-10',
                            isSticky === 'left' && 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                            isSticky === 'right' && 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                          )}
                          style={{
                            ...(isSticky ? { [isSticky]: stickyOffset } : {}),
                            ...(column.minWidth ? { minWidth: column.minWidth } : {}),
                            ...(column.maxWidth ? { width: column.maxWidth, maxWidth: column.maxWidth } : {}),
                          }}
                        >
                          <div className={clsx(
                            'overflow-hidden',
                            column.maxWidth && 'max-w-0 w-full'
                          )}>
                            {column.render
                              ? column.render(value, row, rowIdx)
                              : value}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Collapsed View */}
      {mobileCollapse && (
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                </div>
              ))}
            </>
          ) : isEmpty || data.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-8 bg-white text-center">
              <p className="text-gray-500 text-sm">{emptyMessage}</p>
            </div>
          ) : (
            data.map((row, rowIdx) => (
              <CollapsedRow
                key={getRowKey(row, rowIdx)}
                row={row}
                rowIdx={rowIdx}
                columns={visibleColumns}
                getCellValue={getCellValue}
              />
            ))
          )}
        </div>
      )}
    </>
  )
}

export default TableV2
