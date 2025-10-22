'use client'

import React, { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react'
import { apiClient } from '@/lib/api'

type ExportFormat = 'csv' | 'excel' | 'pdf'

interface ExportActionConfig {
  format: ExportFormat
  label: string
  icon: LucideIcon
  path: string
  tooltip?: string
}

export interface ExportButtonsProps {
  resource: 'organisations' | 'mandats'
  actions?: ExportActionConfig[]
  params?: Record<string, string | number | boolean | undefined>
  baseFilename?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  onError?: (format: ExportFormat, error: string) => void
  onSuccess?: (format: ExportFormat) => void
}

const DEFAULT_ACTIONS: Record<ExportButtonsProps['resource'], ExportActionConfig[]> = {
  organisations: [
    { format: 'csv', label: 'CSV', icon: FileDown, path: '/exports/organisations/csv', tooltip: 'Export CSV (UTF-8 + BOM)' },
    { format: 'excel', label: 'Excel', icon: FileSpreadsheet, path: '/exports/organisations/excel', tooltip: 'Export Excel avec graphiques' },
    { format: 'pdf', label: 'PDF', icon: FileText, path: '/exports/organisations/pdf', tooltip: 'Rapport PDF prêt à partager' },
  ],
  mandats: [
    { format: 'csv', label: 'CSV', icon: FileDown, path: '/exports/mandats/csv', tooltip: 'Export CSV avec filtres appliqués' },
    { format: 'pdf', label: 'PDF', icon: FileText, path: '/exports/mandats/pdf', tooltip: 'Rapport PDF détaillé' },
  ],
}

const EXTENSIONS: Record<ExportFormat, string> = {
  csv: 'csv',
  excel: 'xlsx',
  pdf: 'pdf',
}

export function ExportButtons({
  resource,
  actions,
  params,
  baseFilename,
  size = 'md',
  disabled = false,
  className,
  onError,
  onSuccess,
}: ExportButtonsProps) {
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resolvedActions = useMemo(() => {
    return actions ?? DEFAULT_ACTIONS[resource] ?? []
  }, [actions, resource])

  const buttonClasses = useMemo(() => clsx(
    'inline-flex items-center gap-2 rounded-xl border font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed',
    size === 'sm'
      ? 'px-3 py-1.5 text-sm'
      : 'px-4 py-2 text-sm',
  ), [size])

  const handleDownload = useCallback(async (action: ExportActionConfig) => {
    if (disabled || !action?.path) {
      return
    }

    setCurrentFormat(action.format)
    setError(null)

    try {
      const url = apiClient.resolveUrl(action.path, params)
      const token = apiClient.getToken()

      const response = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        const message = `Export ${action.format.toUpperCase()} impossible (${response.status})`
        setError(message)
        onError?.(action.format, message)
        return
      }

      const blob = await response.blob()
      const filename = buildFilename({
        responseFilename: extractFilename(response.headers.get('Content-Disposition')),
        baseFilename,
        format: action.format,
        resource,
      })

      triggerBrowserDownload(blob, filename)
      onSuccess?.(action.format)
    } catch (err: any) {
      const message = err?.message ?? 'Erreur inconnue lors de l’export'
      setError(message)
      onError?.(action.format, message)
    } finally {
      setCurrentFormat(null)
    }
  }, [baseFilename, disabled, onError, onSuccess, params, resource])

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      {resolvedActions.map((action) => {
        const Icon = action.icon ?? FileDown
        const isLoading = currentFormat === action.format
        return (
          <button
            key={`${resource}-${action.format}`}
            type="button"
            className={clsx(
              buttonClasses,
              'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
            )}
            title={action.tooltip}
            disabled={disabled || isLoading}
            onClick={() => handleDownload(action)}
          >
            <Icon className={clsx('h-4 w-4', isLoading && 'animate-spin')} aria-hidden />
            <span>
              {action.label}
            </span>
          </button>
        )
      })}

      {error && (
        <div className="w-full mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return match ? decodeURIComponent(match[1]) : null
}

function buildFilename({
  responseFilename,
  baseFilename,
  format,
  resource,
}: {
  responseFilename: string | null
  baseFilename?: string
  format: ExportFormat
  resource: ExportButtonsProps['resource']
}): string {
  if (responseFilename) return responseFilename
  const base = baseFilename ?? `${resource}-export`
  const extension = EXTENSIONS[format] ?? 'dat'
  return `${base}.${extension}`
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}
