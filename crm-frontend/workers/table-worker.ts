// workers/table-worker.ts
// ============= P2 OPTIMIZATION: Web Worker for TableV2 sorting/filtering =============

/**
 * Web Worker for heavy table operations
 * Offloads sorting and filtering to avoid blocking main thread (reduces TBT)
 *
 * Usage:
 *   const worker = new Worker(new URL('./table-worker.ts', import.meta.url))
 *   worker.postMessage({ type: 'sort', data: rows, sortBy: 'name', direction: 'asc' })
 *   worker.onmessage = (e) => setRows(e.data.result)
 */

type TableRow = Record<string, any>

interface WorkerMessage {
  type: 'sort' | 'filter' | 'sortAndFilter'
  data: TableRow[]
  sortBy?: string
  direction?: 'asc' | 'desc'
  filters?: Record<string, any>
  searchQuery?: string
  searchFields?: string[]
}

interface WorkerResponse {
  type: 'sort' | 'filter' | 'sortAndFilter'
  result: TableRow[]
  processingTime: number
}

// Sort function
function sortRows(rows: TableRow[], sortBy: string, direction: 'asc' | 'desc' = 'asc'): TableRow[] {
  if (!sortBy) return rows

  return [...rows].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return direction === 'asc' ? 1 : -1
    if (bVal == null) return direction === 'asc' ? -1 : 1

    // Compare values
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    // Fallback to string comparison
    const aStr = String(aVal)
    const bStr = String(bVal)
    return direction === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr)
  })
}

// Filter function
function filterRows(
  rows: TableRow[],
  filters?: Record<string, any>,
  searchQuery?: string,
  searchFields: string[] = []
): TableRow[] {
  let result = rows

  // Apply column filters
  if (filters && Object.keys(filters).length > 0) {
    result = result.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value == null || value === '') return true

        const rowValue = row[key]
        if (rowValue == null) return false

        // Exact match for booleans
        if (typeof value === 'boolean') {
          return rowValue === value
        }

        // Contains for strings
        if (typeof value === 'string') {
          return String(rowValue).toLowerCase().includes(value.toLowerCase())
        }

        // Exact match for numbers
        return rowValue === value
      })
    })
  }

  // Apply search query
  if (searchQuery && searchQuery.trim().length > 0 && searchFields.length > 0) {
    const query = searchQuery.toLowerCase()
    result = result.filter((row) => {
      return searchFields.some((field) => {
        const value = row[field]
        if (value == null) return false
        return String(value).toLowerCase().includes(query)
      })
    })
  }

  return result
}

// Handle incoming messages
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const startTime = performance.now()
  const { type, data, sortBy, direction, filters, searchQuery, searchFields } = event.data

  let result: TableRow[] = data

  try {
    switch (type) {
      case 'sort':
        if (sortBy) {
          result = sortRows(data, sortBy, direction)
        }
        break

      case 'filter':
        result = filterRows(data, filters, searchQuery, searchFields)
        break

      case 'sortAndFilter':
        // Filter first, then sort (more efficient)
        result = filterRows(data, filters, searchQuery, searchFields)
        if (sortBy) {
          result = sortRows(result, sortBy, direction)
        }
        break

      default:
        throw new Error(`Unknown worker message type: ${type}`)
    }

    const processingTime = performance.now() - startTime

    const response: WorkerResponse = {
      type,
      result,
      processingTime,
    }

    self.postMessage(response)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: performance.now() - startTime,
    })
  }
}

// Notify that worker is ready
self.postMessage({ type: 'ready' })
