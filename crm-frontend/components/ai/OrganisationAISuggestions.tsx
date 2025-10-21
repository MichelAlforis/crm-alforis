/**
 * Composant à intégrer dans la fiche Organisation
 * Affiche les suggestions IA pour cette organisation
 *
 * INTÉGRATION:
 * Dans app/dashboard/organisations/[id]/page.tsx, ajouter un onglet:
 *
 * import { OrganisationAISuggestions } from '@/components/ai/OrganisationAISuggestions'
 * import { useEntitySuggestions } from '@/hooks/useAI'
 *
 * const { data: aiSuggestions } = useEntitySuggestions('organisation', organisationId, { status: 'pending' })
 * const pendingCount = aiSuggestions?.length || 0
 *
 * <Tab label="Suggestions IA" badge={pendingCount > 0 ? pendingCount : undefined}>
 *   <OrganisationAISuggestions organisationId={organisationId} />
 * </Tab>
 */
'use client'

import React, { useState } from 'react'
import {
  useEntitySuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
  usePreviewSuggestion,
} from '@/hooks/useAI'
import { AISuggestionStatus } from '@/types/ai'
import SuggestionsTable from './SuggestionsTable'
import SuggestionPreviewModal from './SuggestionPreviewModal'
import { Sparkles, Filter } from 'lucide-react'

interface OrganisationAISuggestionsProps {
  organisationId: number
}

export function OrganisationAISuggestions({ organisationId }: OrganisationAISuggestionsProps) {
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [previewId, setPreviewId] = useState<number | null>(null)

  const { data: suggestions, isLoading } = useEntitySuggestions('organisation', organisationId, {
    status: statusFilter,
  })
  const { data: preview, isLoading: previewLoading } = usePreviewSuggestion(previewId)

  const approveSuggestion = useApproveSuggestion()
  const rejectSuggestion = useRejectSuggestion()

  const handleApprove = (id: number) => {
    approveSuggestion.mutate({ id })
  }

  const handleReject = (id: number) => {
    rejectSuggestion.mutate({ id })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Suggestions IA pour cette organisation
          </h3>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous</option>
            <option value={AISuggestionStatus.PENDING}>En attente</option>
            <option value={AISuggestionStatus.APPROVED}>Approuvées</option>
            <option value={AISuggestionStatus.REJECTED}>Rejetées</option>
            <option value={AISuggestionStatus.APPLIED}>Appliquées</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Empty state */}
          {(!suggestions || suggestions.length === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Aucune suggestion</p>
              <p className="text-sm text-gray-500 mt-1">
                L'Agent IA n'a pas encore généré de suggestions pour cette organisation
              </p>
            </div>
          )}

          {/* Table */}
          {suggestions && suggestions.length > 0 && (
            <SuggestionsTable
              suggestions={suggestions}
              selectedIds={[]}
              onSelectChange={() => {}}
              onPreview={setPreviewId}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </>
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
  )
}
