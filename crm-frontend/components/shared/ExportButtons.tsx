'use client'

import React, { useMemo } from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import { useExport, type ExportFormat } from '@/hooks/useExport'

interface ExportActionConfig {
  format: ExportFormat
  label: string
  icon: LucideIcon
  tooltip?: string
}

export interface ExportButtonsProps {
  resource: string // 'organisations', 'people', 'mandats', etc.
  actions?: ExportActionConfig[]
  params?: Record<string, any>
  baseFilename?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

const DEFAULT_ACTIONS: Record<string, ExportActionConfig[]> = {
  organisations: [
    { format: 'csv', label: 'CSV', icon: FileDown, tooltip: 'Export CSV (UTF-8)' },
    { format: 'excel', label: 'Excel', icon: FileSpreadsheet, tooltip: 'Export Excel avec graphiques' },
    { format: 'pdf', label: 'PDF', icon: FileText, tooltip: 'Rapport PDF' },
  ],
  people: [
    { format: 'csv', label: 'CSV', icon: FileDown, tooltip: 'Export CSV (UTF-8)' },
    { format: 'excel', label: 'Excel', icon: FileSpreadsheet, tooltip: 'Export Excel' },
    { format: 'pdf', label: 'PDF', icon: FileText, tooltip: 'Rapport PDF' },
  ],
  mandats: [
    { format: 'csv', label: 'CSV', icon: FileDown, tooltip: 'Export CSV' },
    { format: 'pdf', label: 'PDF', icon: FileText, tooltip: 'Rapport PDF' },
  ],
}

/**
 * Composant de boutons d'export réutilisable
 * Utilise le hook useExport pour la logique d'export
 *
 * @example
 * ```tsx
 * <ExportButtons
 *   resource="organisations"
 *   baseFilename="organisations"
 *   params={{ category: 'startup', is_active: true }}
 * />
 * ```
 */
export function ExportButtons({
  resource,
  actions,
  params,
  baseFilename,
  size = 'md',
  disabled = false,
  className,
}: ExportButtonsProps) {
  const { exportData, isExporting } = useExport({
    resource,
    baseFilename,
    params,
  })

  const resolvedActions = useMemo(() => {
    return actions ?? DEFAULT_ACTIONS[resource] ?? DEFAULT_ACTIONS.organisations
  }, [actions, resource])

  const buttonClasses = useMemo(
    () =>
      clsx(
        'inline-flex items-center gap-2 rounded-xl border font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800 hover:border-gray-400 shadow-sm',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
      ),
    [size],
  )

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      {resolvedActions.map((action) => {
        const Icon = action.icon ?? FileDown
        return (
          <button
            key={`${resource}-${action.format}`}
            type="button"
            className={buttonClasses}
            title={action.tooltip}
            disabled={disabled || isExporting}
            onClick={() => exportData(action.format)}
          >
            <Icon
              className={clsx('h-4 w-4', isExporting && 'animate-spin')}
              aria-hidden
            />
            <span>{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
