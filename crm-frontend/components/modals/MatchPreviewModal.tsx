/**
 * Modal de prévisualisation des matchs (V1.5 Smart Resolver)
 *
 * Affiche les candidats potentiels avec leurs scores de matching
 * Permet de sélectionner un candidat existant ou créer un nouveau
 */

'use client'

import { useState } from 'react'
import { X, Check, UserPlus, Building2, Mail, Phone, Briefcase } from 'lucide-react'
import { MatchCandidate } from '@/hooks/useAutofillPreview'

interface MatchPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  matches: MatchCandidate[]
  entityType: 'person' | 'organisation'
  onSelectCandidate: (candidate: Record<string, any>) => void
  onCreateNew: () => void
}

export default function MatchPreviewModal({
  isOpen,
  onClose,
  matches,
  entityType,
  onSelectCandidate,
  onCreateNew,
}: MatchPreviewModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (!isOpen) return null

  const handleSelect = () => {
    const selected = matches.find((m) => m.candidate.id === selectedId)
    if (selected) {
      onSelectCandidate(selected.candidate)
      onClose()
    }
  }

  const handleCreateNew = () => {
    onCreateNew()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {entityType === 'person' ? 'Contacts similaires trouvés' : 'Organisations similaires trouvées'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {matches.length} {matches.length > 1 ? 'candidats trouvés' : 'candidat trouvé'}. Sélectionnez un contact existant ou créez-en un nouveau.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-400 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidates List */}
        <div className="p-6 space-y-3">
          {matches.map((match) => {
            const isSelected = match.candidate.id === selectedId
            const isPerson = entityType === 'person'
            const candidate = match.candidate

            return (
              <div
                key={match.candidate.id}
                onClick={() => setSelectedId(match.candidate.id)}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800'}
                `}
              >
                {/* Score Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span
                    className={`
                      px-3 py-1 rounded-full text-sm font-medium
                      ${match.score >= 100 ? 'bg-green-100 text-green-800' : match.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}
                    `}
                  >
                    Score: {match.score}
                  </span>
                  {isSelected && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="pr-32">
                  {isPerson ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600 dark:text-slate-400">
                            {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                            {candidate.first_name} {candidate.last_name}
                          </h3>
                          {candidate.job_title && (
                            <p className="text-sm text-gray-600 dark:text-slate-400">{candidate.job_title}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        {candidate.personal_email && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{candidate.personal_email}</span>
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <Phone className="w-4 h-4" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.company_name && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <Building2 className="w-4 h-4" />
                            <span>{candidate.company_name}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{candidate.name || candidate.nom}</h3>
                          {candidate.category && (
                            <p className="text-sm text-gray-600 dark:text-slate-400">{candidate.category}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        {candidate.email && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{candidate.email}</span>
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <Phone className="w-4 h-4" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.website && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <Briefcase className="w-4 h-4" />
                            <span className="truncate">{candidate.website}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Match Details */}
                  {Object.keys(match.details).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                      <p className="text-xs text-gray-500 mb-1">Critères de matching:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(match.details).map(([criterion, points]) => (
                          <span
                            key={criterion}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {criterion.replace('_', ' ')}: +{points}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white dark:text-slate-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Créer un nouveau contact
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedId}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg transition-colors
                ${selectedId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
              `}
            >
              <Check className="w-4 h-4" />
              Sélectionner ce contact
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
