/**
 * DataTableEmpty - Empty state
 */
'use client'

import React from 'react'
import { Inbox } from 'lucide-react'

interface DataTableEmptyProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function DataTableEmpty({
  title = 'Aucune donnée',
  description = 'Il n\'y a rien à afficher pour le moment.',
  action
}: DataTableEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-gray-400 dark:text-slate-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
        {title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-slate-400 text-center mb-6 max-w-md">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
