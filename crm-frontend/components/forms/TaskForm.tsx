'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useEntityPreload } from '@/hooks/useEntityPreload'
import { useOrganisationSelect } from '@/hooks/useOrganisationSelect'
import { useFormToast } from '@/hooks/useFormToast'
import { usePaginatedOptions, type PaginatedFetcherParams } from '@/hooks/usePaginatedOptions'
import { useAIAutofill } from '@/hooks/useAIAutofill'
import { apiClient } from '@/lib/api'
import type {
  TaskInput,
  TaskPriority,
  TaskCategory,
  Person,
} from '@/lib/types'
import { SearchableSelect } from '@/components/shared'
import { FieldContextMenu } from '@/components/ui/FieldContextMenu'

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  initialData?: {
    person_id?: number
    organisation_id?: number
    title?: string
    description?: string
  }
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'critique', label: '🔴 Critique', color: 'text-red-600' },
  { value: 'haute', label: '🟠 Haute', color: 'text-orange-600' },
  { value: 'moyenne', label: '🟡 Moyenne', color: 'text-yellow-600' },
  { value: 'basse', label: '🔵 Basse', color: 'text-blue-600' },
  { value: 'non_prioritaire', label: '⚪ Non prioritaire', color: 'text-gray-600 dark:text-slate-400' },
]

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'relance', label: '📞 Relance' },
  { value: 'rdv', label: '🤝 RDV' },
  { value: 'email', label: '✉️ Email' },
  { value: 'due_diligence', label: '📋 Due Diligence' },
  { value: 'pitch', label: '🎯 Pitch' },
  { value: 'negociation', label: '💼 Négociation' },
  { value: 'admin', label: '📁 Admin' },
  { value: 'autre', label: '➕ Autre' },
]

export default function TaskForm({ isOpen, onClose, initialData }: TaskFormProps) {
  const { createTask, isCreating } = useTasks()
  const toast = useFormToast({ entityName: 'Tâche', gender: 'f' })

  // Hook réutilisable pour autocomplete d'organisations
  const {
    options: organisationOptions,
    isLoading: isLoadingOrganisations,
    isLoadingMore: isLoadingMoreOrganisations,
    hasMore: hasMoreOrganisations,
    search: searchOrganisations,
    loadMore: loadMoreOrganisations,
    upsertOption: _upsertOrganisationOption,
  } = useOrganisationSelect({
    preloadId: initialData?.organisation_id,
    activeOnly: true,
  })

  const fetchPeopleOptions = useCallback(
    ({ query, skip, limit }: PaginatedFetcherParams) =>
      apiClient.getPeople(skip, limit, query ? { q: query } : undefined),
    []
  )

  const mapPersonToOption = useCallback(
    (person: Person) => ({
      id: person.id,
      label: `${person.first_name} ${person.last_name}`,
      sublabel: person.role || person.personal_email || undefined,
    }),
    []
  )

  const {
    options: peopleOptions,
    isLoading: isLoadingPeople,
    isLoadingMore: isLoadingMorePeople,
    hasMore: hasMorePeople,
    search: searchPeople,
    loadMore: loadMorePeople,
    upsertOption: upsertPersonOption,
  } = usePaginatedOptions<Person>({
    fetcher: fetchPeopleOptions,
    mapItem: mapPersonToOption,
    limit: 25,
  })

  const [formData, setFormData] = useState<TaskInput>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    due_date: new Date().toISOString().split('T')[0], // Today
    priority: 'moyenne',
    category: 'relance',
     organisation_id: initialData?.organisation_id,
    person_id: initialData?.person_id,
  })

  const [error, setError] = useState<string | null>(null)

  // ✅ Autofill hook
  const {
    handleFieldRightClick,
    showContextMenu,
    menuPosition,
    activeField,
    handleAutofillSuggest,
  } = useAIAutofill({
    entityType: 'task',
    formData,
    onFieldUpdate: (fieldName, value) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }))
    },
  })

  // Pré-charger l'organisation sélectionnée (via useOrganisationSelect preloadId)

  // Pré-charger la personne sélectionnée (avec useEntityPreload)
  useEntityPreload<Person>({
    entityId: initialData?.person_id,
    fetchEntity: (id) => apiClient.getPerson(id),
    mapToOption: mapPersonToOption,
    upsertOption: upsertPersonOption,
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        title: initialData.title || prev.title,
        description: initialData.description || prev.description,
        organisation_id: initialData.organisation_id,
        person_id: initialData.person_id,
      }))
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Le titre est requis')
      toast.warning('Titre requis', 'Ajoutez un titre pour enregistrer la tâche.')
      return
    }

    // Validation: Au moins une organisation OU une personne doit être sélectionnée
    if (!formData.organisation_id && !formData.person_id) {
      setError('Vous devez lier la tâche à une organisation ou une personne')
      toast.warning('Liaison requise', 'Sélectionnez une organisation ou une personne pour cette tâche.')
      return
    }

    try {
      await createTask(formData)
      onClose()
      // Reset form
      setFormData({
        title: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'moyenne',
        category: 'relance',
        organisation_id: undefined,
      })
      toast.successCreate()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
      toast.error(err)
    }
  }

  const handleQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    setFormData({ ...formData, due_date: date.toISOString().split('T')[0] })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">✨ Nouvelle tâche</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Title with Autofill */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onContextMenu={(e) => handleFieldRightClick(e, 'title')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Ex: Relancer prospect Acme Corp (clic-droit pour IA)"
                required
                autoFocus
              />
            </div>

            {/* Description with Autofill */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onContextMenu={(e) => handleFieldRightClick(e, 'description')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                rows={3}
                placeholder="Détails de la tâche... (clic-droit pour IA)"
              />
            </div>

            {/* Due Date + Quick Buttons */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Date d'échéance <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  +1j
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  +1sem
                </button>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Priorité
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: priority.value })}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                      formData.priority === priority.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                        : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Catégorie
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: category.value })}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                      formData.category === category.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                        : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liaison requise */}
            <div className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-bold text-orange-900">
                  Liaison obligatoire <span className="text-red-600">*</span>
                </span>
              </div>
              <p className="text-xs text-orange-700 mb-4">
                Chaque tâche doit être liée à une organisation et/ou une personne
              </p>

              {/* Organisation avec recherche */}
              <div className="mb-4">
                <SearchableSelect
                  label="Organisation"
                  options={organisationOptions}
                  value={formData.organisation_id || null}
                  onChange={(value) => setFormData({ ...formData, organisation_id: value || undefined })}
                  placeholder="Rechercher une organisation..."
                  onSearch={searchOrganisations}
                  onLoadMore={loadMoreOrganisations}
                  hasMore={hasMoreOrganisations}
                  isLoading={isLoadingOrganisations}
                  isLoadingMore={isLoadingMoreOrganisations}
                />
              </div>

              {/* Personne avec recherche */}
              <div>
                <SearchableSelect
                  label="Personne"
                  options={peopleOptions}
                  value={formData.person_id || null}
                  onChange={(value) => setFormData({ ...formData, person_id: value || undefined })}
                  placeholder="Rechercher une personne..."
                  onSearch={searchPeople}
                  onLoadMore={loadMorePeople}
                  hasMore={hasMorePeople}
                  isLoading={isLoadingPeople}
                  isLoadingMore={isLoadingMorePeople}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:bg-slate-800 font-medium transition-colors"
                disabled={isCreating}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating}
              >
                {isCreating ? 'Création...' : 'Créer la tâche'}
              </button>
            </div>
          </form>

          {/* ✅ Autofill Context Menu */}
          <FieldContextMenu
            show={showContextMenu}
            position={menuPosition}
            fieldName={activeField}
            onAutofill={handleAutofillSuggest}
            onClose={() => {}}
          />
        </div>
      </div>
    </>
  )
}
