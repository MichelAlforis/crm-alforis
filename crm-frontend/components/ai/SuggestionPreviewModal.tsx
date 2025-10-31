/**
 * Modal de prévisualisation d'une suggestion
 * Affiche les changements AVANT application
 */
'use client'

import React from 'react'
import { SuggestionPreview } from '@/types/ai'
import { X, ArrowRight, Plus, Minus, Edit } from 'lucide-react'
import clsx from 'clsx'

interface SuggestionPreviewModalProps {
  suggestionId?: number
  preview: SuggestionPreview | undefined
  isLoading?: boolean
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
}

export default function SuggestionPreviewModal({
  suggestionId,
  preview,
  isLoading,
  onClose,
  onApprove,
  onReject,
}: SuggestionPreviewModalProps) {
  if (!preview && !isLoading) return null

  const getChangeIcon = (type: 'add' | 'update' | 'delete') => {
    switch (type) {
      case 'add':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <Minus className="h-4 w-4 text-red-600" />
    }
  }

  const getChangeBgColor = (type: 'add' | 'update' | 'delete') => {
    switch (type) {
      case 'add':
        return 'bg-green-50 border-green-200'
      case 'update':
        return 'bg-blue-50 border-blue-200'
      case 'delete':
        return 'bg-red-50 border-red-200'
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
          <div>
            <h2 className="text-2xl font-bold text-white">Prévisualisation</h2>
            <p className="text-sm text-blue-100 mt-1">
              {preview?.entity_type} #{preview?.entity_id || suggestionId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white dark:bg-slate-900/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>
        )}

        {/* Content */}
        {preview && (
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Impact Assessment */}
              {preview.impact_assessment && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    📊 {preview.impact_assessment}
                  </p>
                </div>
              )}

              {/* Changes Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Modifications proposées ({preview.changes_summary.length})
                </h3>

                {preview.changes_summary.map((change, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'p-4 border rounded-lg transition-all',
                      getChangeBgColor(change.type)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {getChangeIcon(change.type)}
                      <span className="font-semibold text-gray-900 dark:text-slate-100 capitalize">
                        {change.field}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white dark:bg-slate-900/60 rounded-full">
                        {change.type === 'add' && 'Ajout'}
                        {change.type === 'update' && 'Modification'}
                        {change.type === 'delete' && 'Suppression'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* From */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Valeur actuelle</p>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700">
                          <code className="text-sm text-gray-700 dark:text-slate-300 break-all">
                            {formatValue(change.from)}
                          </code>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>

                      {/* To */}
                      <div className="col-start-2">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Nouvelle valeur
                        </p>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700">
                          <code className="text-sm font-semibold text-gray-900 dark:text-slate-100 break-all">
                            {formatValue(change.to)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full data comparison (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    Voir les données complètes
                  </span>
                </summary>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      Données actuelles
                    </h4>
                    <pre className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(preview.current_data, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      Données proposées
                    </h4>
                    <pre className="p-4 bg-blue-50 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(preview.proposed_changes, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:bg-slate-800 transition-colors"
          >
            Fermer
          </button>
          {onReject && (
            <button
              onClick={() => {
                onReject()
                onClose()
              }}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Rejeter
            </button>
          )}
          {onApprove && (
            <button
              onClick={() => {
                onApprove()
                onClose()
              }}
              className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Approuver et appliquer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
