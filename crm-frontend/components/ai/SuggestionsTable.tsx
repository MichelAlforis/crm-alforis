/**
 * Table des suggestions avec sélection multiple et actions batch
 */
'use client'

import React, { useState } from 'react'
import { AISuggestion, AISuggestionType, AISuggestionStatus } from '@/types/ai'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Sparkles,
  Database,
  FileCheck,
  Edit,
} from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface SuggestionsTableProps {
  suggestions: AISuggestion[]
  selectedIds: number[]
  onSelectChange: (ids: number[]) => void
  onPreview?: (id: number) => void
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
}

const TYPE_ICONS: Record<AISuggestionType, { icon: any; label: string; color: string }> = {
  [AISuggestionType.DUPLICATE_DETECTION]: {
    icon: Sparkles,
    label: 'Doublon',
    color: 'text-purple-600',
  },
  [AISuggestionType.DATA_ENRICHMENT]: {
    icon: Database,
    label: 'Enrichissement',
    color: 'text-blue-600',
  },
  [AISuggestionType.QUALITY_CHECK]: {
    icon: FileCheck,
    label: 'Qualité',
    color: 'text-green-600',
  },
  [AISuggestionType.FIELD_CORRECTION]: {
    icon: Edit,
    label: 'Correction',
    color: 'text-orange-600',
  },
}

const STATUS_CONFIG: Record<
  AISuggestionStatus,
  { label: string; color: string; bgColor: string; icon: any }
> = {
  [AISuggestionStatus.PENDING]: {
    label: 'En attente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: Clock,
  },
  [AISuggestionStatus.APPROVED]: {
    label: 'Approuvée',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  [AISuggestionStatus.REJECTED]: {
    label: 'Rejetée',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: XCircle,
  },
  [AISuggestionStatus.APPLIED]: {
    label: 'Appliquée',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: CheckCircle,
  },
  [AISuggestionStatus.FAILED]: {
    label: 'Échouée',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: AlertCircle,
  },
}

export default function SuggestionsTable({
  suggestions,
  selectedIds,
  onSelectChange,
  onPreview,
  onApprove,
  onReject,
}: SuggestionsTableProps) {
  const allIds = suggestions.map((s) => s.id)
  const isAllSelected = selectedIds.length === suggestions.length && suggestions.length > 0
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < suggestions.length

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectChange([])
    } else {
      onSelectChange(allIds)
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectChange([...selectedIds, id])
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100'
    if (score >= 0.7) return 'text-blue-600 bg-blue-100'
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Aucune suggestion trouvée</p>
        <p className="text-sm text-gray-500 mt-1">
          Lancez une analyse pour générer des suggestions
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white rounded-xl shadow-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-4">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Suggestion
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Entité
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Confiance
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {suggestions.map((suggestion) => {
              const isSelected = selectedIds.includes(suggestion.id)
              const typeConfig = TYPE_ICONS[suggestion.type]
              const statusConfig = STATUS_CONFIG[suggestion.status]
              const TypeIcon = typeConfig.icon
              const StatusIcon = statusConfig.icon

              return (
                <tr
                  key={suggestion.id}
                  className={clsx(
                    'transition-colors hover:bg-gray-50',
                    isSelected && 'bg-blue-50'
                  )}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectOne(suggestion.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={clsx('h-5 w-5', typeConfig.color)} />
                      <span className="text-sm font-medium text-gray-900">
                        {typeConfig.label}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {suggestion.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 capitalize">
                        {suggestion.entity_type}
                      </p>
                      <p className="text-gray-500">ID: {suggestion.entity_id}</p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                        getConfidenceColor(suggestion.confidence_score)
                      )}
                    >
                      {(suggestion.confidence_score * 100).toFixed(0)}%
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                        statusConfig.color,
                        statusConfig.bgColor
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig.label}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(suggestion.created_at), 'dd MMM yyyy', { locale: fr })}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onPreview && (
                        <button
                          onClick={() => onPreview(suggestion.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Prévisualiser"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {onApprove && suggestion.status === AISuggestionStatus.PENDING && (
                        <button
                          onClick={() => onApprove(suggestion.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approuver"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {onReject && suggestion.status === AISuggestionStatus.PENDING && (
                        <button
                          onClick={() => onReject(suggestion.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rejeter"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
