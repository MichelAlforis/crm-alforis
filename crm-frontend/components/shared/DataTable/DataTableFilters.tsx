/**
 * DataTableFilters - Filter panel (placeholder for now)
 */
'use client'

import React from 'react'
import { Column } from './index'

interface DataTableFiltersProps {
  columns: Column[]
}

export function DataTableFilters({ _ }: DataTableFiltersProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg animate-in slide-in-from-top-2 duration-200">
      <p className="text-sm text-gray-600 dark:text-slate-400">
        Filtres avancés (à implémenter)
      </p>
    </div>
  )
}
