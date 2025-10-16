// components/shared/Table.tsx
// ============= MODERN TABLE COMPONENT =============

import React from 'react'
import clsx from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// ============= TYPES =============
interface Column<T = any> {
  header: string
  accessor: string | ((row: T) => any)
  sortable?: boolean
  width?: string
  render?: (value: any, row: T, index: number) => React.ReactNode
  className?: string
}

interface TableProps<T = any> {
  columns: Column<T>[]
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
}

// ============= SKELETON ROW =============
const SkeletonRow = ({ columns }: { columns: Column[] }) => (
  <tr>
    {columns.map((_, idx) => (
      <td key={idx} className="px-spacing-md py-spacing-md">
        <div className="skeleton h-4 w-3/4 rounded" />
      </td>
    ))}
  </tr>
)

// ============= EMPTY STATE =============
const EmptyState = ({ message, colSpan }: { message: string; colSpan: number }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-spacing-2xl">
      <div className="flex flex-col items-center justify-center">
        <svg
          className="w-12 h-12 text-text-muted mb-4"
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
        <p className="text-text-secondary text-sm">{message}</p>
      </div>
    </td>
  </tr>
)

// ============= SORT ICON =============
const SortIcon = ({ column, sortConfig }: { column: string; sortConfig?: TableProps['sortConfig'] }) => {
  if (!sortConfig || sortConfig.key !== column) {
    return <ChevronsUpDown className="w-4 h-4 text-text-muted" />
  }
  
  return sortConfig.direction === 'asc' 
    ? <ChevronUp className="w-4 h-4 text-primary" />
    : <ChevronDown className="w-4 h-4 text-primary" />
}

// ============= TABLE COMPONENT =============
export function Table<T = any>({
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
}: TableProps<T>) {
  // Size styles
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Variant styles
  const variants = {
    default: '',
    striped: 'tbody tr:nth-child(even):bg-muted/50',
    bordered: 'border border-border',
  }

  // Get cell value
  const getCellValue = (row: T, accessor: string | ((row: T) => any)) => {
    if (typeof accessor === 'function') {
      return accessor(row)
    }
    return (row as any)[accessor]
  }

  return (
    <div className="w-full overflow-hidden rounded-radius-lg border border-border">
      <div className="overflow-x-auto">
        <table className={clsx('w-full', sizes[size], variants[variant])}>
          <thead 
            className={clsx(
              'bg-muted border-b border-border',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className={clsx(
                    'px-spacing-md py-spacing-sm text-left font-medium text-text-secondary',
                    'first:pl-spacing-lg last:pr-spacing-lg',
                    column.width,
                    column.sortable && 'cursor-pointer hover:text-text-primary',
                    column.className
                  )}
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
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              // Loading state
              <>
                {[...Array(5)].map((_, idx) => (
                  <SkeletonRow key={idx} columns={columns} />
                ))}
              </>
            ) : isEmpty || data.length === 0 ? (
              // Empty state
              <EmptyState message={emptyMessage} colSpan={columns.length} />
            ) : (
              // Data rows
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-muted/50 transition-colors duration-base"
                >
                  {columns.map((column, colIdx) => {
                    const value = getCellValue(row, column.accessor)
                    
                    return (
                      <td
                        key={colIdx}
                        className={clsx(
                          'px-spacing-md py-spacing-md text-text-primary',
                          'first:pl-spacing-lg last:pr-spacing-lg',
                          column.className
                        )}
                      >
                        {column.render 
                          ? column.render(value, row, rowIdx)
                          : value}
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
  )
}

// ============= RESPONSIVE TABLE (MOBILE CARDS) =============
export function ResponsiveTable<T = any>(props: TableProps<T>) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table {...props} />
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-spacing-sm">
        {props.isLoading ? (
          // Loading cards
          <>
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="card p-spacing-md space-y-2">
                <div className="skeleton h-5 w-2/3 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
            ))}
          </>
        ) : props.isEmpty || props.data.length === 0 ? (
          // Empty state
          <div className="card p-spacing-xl text-center">
            <p className="text-text-secondary">
              {props.emptyMessage || 'Aucune donnée'}
            </p>
          </div>
        ) : (
          // Data cards
          props.data.map((row, idx) => (
            <div key={idx} className="card p-spacing-md space-y-2 hover:shadow-md transition-shadow">
              {props.columns.map((column, colIdx) => {
                const value = typeof column.accessor === 'function'
                  ? column.accessor(row)
                  : (row as any)[column.accessor]
                
                return (
                  <div key={colIdx} className="flex justify-between items-start">
                    <span className="text-xs text-text-secondary font-medium">
                      {column.header}
                    </span>
                    <span className="text-sm text-text-primary text-right">
                      {column.render 
                        ? column.render(value, row, idx)
                        : value}
                    </span>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </>
  )
}