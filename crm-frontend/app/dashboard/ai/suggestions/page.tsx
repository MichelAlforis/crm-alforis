/**
 * Page des suggestions AI avec batch operations
 */
'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useAISuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
  useBatchApproveSuggestions,
  useBatchRejectSuggestions,
  usePreviewSuggestion,
} from '@/hooks/useAI'
import { AISuggestionStatus, AISuggestionType } from '@/types/ai'
import SuggestionsTable from '@/components/ai/SuggestionsTable'
import SuggestionPreviewModal from '@/components/ai/SuggestionPreviewModal'
import {
  CheckCircle,
  XCircle,
  Filter,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'

export default function SuggestionsPage() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [filters, setFilters] = useState({
    status: (statusParam as AISuggestionStatus) || AISuggestionStatus.PENDING,
    type: undefined as AISuggestionType | undefined,
    min_confidence: undefined as number | undefined,
  })

  const { data: suggestions, isLoading, refetch } = useAISuggestions(filters)
  const { data: preview, isLoading: previewLoading } = usePreviewSuggestion(previewId)

  const approveSuggestion = useApproveSuggestion()
  const rejectSuggestion = useRejectSuggestion()
  const batchApprove = useBatchApproveSuggestions()
  const batchReject = useBatchRejectSuggestions()

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Approuver ${selectedIds.length} suggestion(s) ?`)) return

    batchApprove.mutate(
      { suggestion_ids: selectedIds },
      {
        onSuccess: () => {
          setSelectedIds([])
        },
      }
    )
  }

  const handleBatchReject = () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Rejeter ${selectedIds.length} suggestion(s) ?`)) return

    batchReject.mutate(
      { suggestion_ids: selectedIds },
      {
        onSuccess: () => {
          setSelectedIds([])
        },
      }
    )
  }

  const handleApprove = (id: number) => {
    approveSuggestion.mutate({ id })
  }

  const handleReject = (id: number) => {
    rejectSuggestion.mutate({ id })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-purple-600" />
              Suggestions IA
            </h1>
            <p className="text-gray-600 mt-2">
              Gérez les suggestions générées par l'Agent IA
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Filters & Batch Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-400" />

              {/* Status filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as AISuggestionStatus })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value={AISuggestionStatus.PENDING}>En attente</option>
                <option value={AISuggestionStatus.APPROVED}>Approuvées</option>
                <option value={AISuggestionStatus.REJECTED}>Rejetées</option>
                <option value={AISuggestionStatus.APPLIED}>Appliquées</option>
                <option value={AISuggestionStatus.FAILED}>Échouées</option>
              </select>

              {/* Type filter */}
              <select
                value={filters.type || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    type: e.target.value ? (e.target.value as AISuggestionType) : undefined,
                  })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les types</option>
                <option value={AISuggestionType.DUPLICATE_DETECTION}>Doublons</option>
                <option value={AISuggestionType.DATA_ENRICHMENT}>Enrichissement</option>
                <option value={AISuggestionType.QUALITY_CHECK}>Qualité</option>
                <option value={AISuggestionType.FIELD_CORRECTION}>Correction</option>
              </select>

              {/* Confidence filter */}
              <select
                value={filters.min_confidence || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    min_confidence: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes confidences</option>
                <option value="0.9">≥ 90%</option>
                <option value="0.7">≥ 70%</option>
                <option value="0.5">≥ 50%</option>
              </select>
            </div>

            {/* Batch Actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">
                  {selectedIds.length} sélectionnée{selectedIds.length > 1 ? 's' : ''}
                </span>

                <button
                  onClick={handleBatchApprove}
                  disabled={batchApprove.isPending}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                    'bg-gradient-to-r from-green-600 to-emerald-600 text-white',
                    'hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approuver {selectedIds.length}
                </button>

                <button
                  onClick={handleBatchReject}
                  disabled={batchReject.isPending}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                    'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter {selectedIds.length}
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          {isLoading ? (
            'Chargement...'
          ) : (
            <>
              {suggestions?.length || 0} suggestion{suggestions && suggestions.length > 1 ? 's' : ''} trouvée{suggestions && suggestions.length > 1 ? 's' : ''}
            </>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <SuggestionsTable
            suggestions={suggestions || []}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            onPreview={setPreviewId}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Preview Modal */}
        {previewId && (
          <SuggestionPreviewModal
            suggestionId={previewId}
            preview={preview}
            isLoading={previewLoading}
            onClose={() => setPreviewId(null)}
            onApprove={() => {
              handleApprove(previewId)
              setPreviewId(null)
            }}
            onReject={() => {
              handleReject(previewId)
              setPreviewId(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
