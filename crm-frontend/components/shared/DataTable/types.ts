/**
 * DataTable Types
 * Centralized type definitions for the DataTable system
 */

import { LucideIcon } from 'lucide-react'

// ============= COLUMN =============

export interface Column<T = unknown> {
  id: string
  header: string
  accessor: keyof T | ((row: T) => unknown)
  sortable?: boolean
  searchable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

// ============= ACTIONS =============

export interface QuickAction<T = unknown> {
  id: string
  label: string
  icon?: LucideIcon
  onClick: (row: T) => void
  variant?: 'default' | 'danger'
}

export interface BulkAction<T = unknown> {
  id: string
  label: string
  icon?: LucideIcon
  onClick: (rows: T[]) => void
  variant?: 'default' | 'danger'
}

// ============= DATA TABLE PROPS =============

export interface DataTableProps<T = unknown> {
  // Required
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string | number

  // Search
  searchable?:
    | false
    | {
        placeholder?: string
        fields?: (keyof T | string)[]
      }

  // Filters (placeholder)
  filterable?: boolean

  // Actions
  bulkActions?: BulkAction<T>[]
  quickActions?: QuickAction<T>[]

  // Callbacks
  onRowClick?: (row: T) => void

  // States
  isLoading?: boolean
  isEmpty?: boolean
  emptyState?: {
    title?: string
    description?: string
    action?: {
      label: string
      onClick: () => void
    }
  }

  // Pagination
  pagination?:
    | false
    | {
        pageSize?: number
        showPageSize?: boolean
        pageSizeOptions?: number[]
      }
}

// ============= INTERNAL STATE =============

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}
