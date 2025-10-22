// hooks/useTableColumns.ts
// ============= REUSABLE HOOK FOR DYNAMIC TABLE COLUMNS =============

import { useState, useEffect, useCallback } from 'react'

export interface ColumnConfig<T = any> {
  key: string
  header: string
  accessor: string | ((row: T) => any)
  visible: boolean
  sortable?: boolean
  width?: string
  render?: (value: any, row: T, index: number) => React.ReactNode
  className?: string
}

interface UseTableColumnsOptions<T> {
  storageKey: string // Local storage key to persist column visibility
  defaultColumns: ColumnConfig<T>[]
}

/**
 * Hook to manage dynamic table columns with visibility toggle
 * - Saves column preferences to localStorage
 * - Provides functions to show/hide columns
 * - Returns only visible columns for the Table component
 */
export function useTableColumns<T = any>({
  storageKey,
  defaultColumns,
}: UseTableColumnsOptions<T>) {
  const [columns, setColumns] = useState<ColumnConfig<T>[]>(defaultColumns)

  // Load columns from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(storageKey)
    if (savedConfig) {
      try {
        const savedVisibility = JSON.parse(savedConfig) as Record<string, boolean>
        setColumns((prevColumns) =>
          prevColumns.map((col) => ({
            ...col,
            visible: savedVisibility[col.key] ?? col.visible,
          }))
        )
      } catch (error) {
        console.error('Failed to load column config from localStorage:', error)
      }
    }
  }, [storageKey])

  // Save columns to localStorage
  const saveColumns = useCallback(
    (newColumns: ColumnConfig<T>[]) => {
      const visibility = newColumns.reduce(
        (acc, col) => {
          acc[col.key] = col.visible
          return acc
        },
        {} as Record<string, boolean>
      )
      localStorage.setItem(storageKey, JSON.stringify(visibility))
    },
    [storageKey]
  )

  // Toggle column visibility
  const toggleColumn = useCallback(
    (key: string) => {
      setColumns((prevColumns) => {
        const newColumns = prevColumns.map((col) =>
          col.key === key ? { ...col, visible: !col.visible } : col
        )
        saveColumns(newColumns)
        return newColumns
      })
    },
    [saveColumns]
  )

  // Show column
  const showColumn = useCallback(
    (key: string) => {
      setColumns((prevColumns) => {
        const newColumns = prevColumns.map((col) =>
          col.key === key ? { ...col, visible: true } : col
        )
        saveColumns(newColumns)
        return newColumns
      })
    },
    [saveColumns]
  )

  // Hide column
  const hideColumn = useCallback(
    (key: string) => {
      setColumns((prevColumns) => {
        const newColumns = prevColumns.map((col) =>
          col.key === key ? { ...col, visible: false } : col
        )
        saveColumns(newColumns)
        return newColumns
      })
    },
    [saveColumns]
  )

  // Reset to default
  const resetColumns = useCallback(() => {
    setColumns(defaultColumns)
    saveColumns(defaultColumns)
  }, [defaultColumns, saveColumns])

  // Get only visible columns for the Table component
  const visibleColumns = columns.filter((col) => col.visible)

  return {
    columns,
    visibleColumns,
    toggleColumn,
    showColumn,
    hideColumn,
    resetColumns,
  }
}
