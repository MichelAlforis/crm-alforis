// app/dashboard/interactions/page.tsx
// ============= INTERACTIONS PAGE =============
// Page avec création + filtres

'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useOrganisationActivity, flattenActivities } from '@/hooks/useOrganisationActivity'
import { useFilters } from '@/hooks/useFilters'
import { useConfirm } from '@/hooks/useConfirm'
import { Card, Table, Alert, Button } from '@/components/shared'
import InteractionCreateModal from '@/components/interactions/InteractionCreateModal'

const ACTIVITY_TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'email', label: 'Email' },
  { value: 'appel', label: 'Appel' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'dejeuner', label: 'Déjeuner' },
  { value: 'note', label: 'Note' },
  { value: 'autre', label: 'Autre' },
]

interface InteractionFilters {
  type: string
  dateFrom: string
  dateTo: string
}

export default function InteractionsPage() {
  const { data: organisations } = useOrganisations()
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { confirm, ConfirmDialogComponent } = useConfirm()

  const filters = useFilters<InteractionFilters>({
    initialValues: {
      type: 'all',
      dateFrom: '',
      dateTo: '',
    },
  })

  const activityQuery = selectedOrgId
    ? useOrganisationActivity(selectedOrgId)
    : null

  const activities = useMemo(() =>
    flattenActivities(activityQuery?.data?.pages),
    [activityQuery?.data?.pages]
  )

  // Filtrer les activités
  const filteredActivities = useMemo(() => {
    if (!activities) return []

    return activities.filter((activity) => {
      // Filtre par type
      if (filters.values.type !== 'all' && activity.type !== filters.values.type) {
        return false
      }

      // Filtre par date
      const activityDate = new Date(activity.created_at)

      if (filters.values.dateFrom) {
        const fromDate = new Date(filters.values.dateFrom)
        if (activityDate < fromDate) return false
      }

      if (filters.values.dateTo) {
        const toDate = new Date(filters.values.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (activityDate > toDate) return false
      }

      return true
    })
  }, [activities, filters.values])

  const activityLoading = activityQuery?.isLoading ?? false
  const activityError = activityQuery?.error ? String(activityQuery.error) : undefined

  const handleDelete = async (activityId: number) => {
    confirm({
      title: 'Supprimer cette activité?',
      message: 'Cette action est irréversible.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token')
          await fetch(`${API_BASE}/api/v1/organisations/${selectedOrgId}/activity/${activityId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            }
          })
          activityQuery?.refetch?.()
        } catch (err) {
          console.error('Error deleting activity:', err)
        }
      },
    })
  }

  const columns = [
    {
      header: 'Type',
      accessor: 'type',
      render: (value: string) => {
        const typeConfig: Record<string, { label: string; color: string }> = {
          email: { label: 'Email', color: 'bg-blue-100 text-blue-800' },
          appel: { label: 'Appel', color: 'bg-green-100 text-green-800' },
          reunion: { label: 'Réunion', color: 'bg-purple-100 text-purple-800' },
          dejeuner: { label: 'Déjeuner', color: 'bg-orange-100 text-orange-800' },
          note: { label: 'Note', color: 'bg-gray-100 text-gray-800' },
          autre: { label: 'Autre', color: 'bg-yellow-100 text-yellow-800' },
        }

        const config = typeConfig[value] || { label: value, color: 'bg-gray-100 text-gray-800' }

        return (
          <span className={`px-2 py-1 ${config.color} rounded text-xs font-medium`}>
            {config.label}
          </span>
        )
      },
    },
    {
      header: 'Titre',
      accessor: 'title',
      render: (value: string) => (
        <div className="font-medium text-gray-900">{value}</div>
      ),
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (value: string) => {
        const date = new Date(value)
        return (
          <div className="text-sm text-gray-600">
            {date.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            <br />
            <span className="text-xs text-gray-400">
              {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (value: string) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {value || '-'}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number) => (
        <button
          onClick={() => handleDelete(id)}
          className="text-rouge hover:underline text-sm"
        >
          Supprimer
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Interactions</h1>
          <p className="text-gray-600 mt-1">
            Historique des activités et communications
          </p>
        </div>

        {selectedOrgId && (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle Interaction
          </Button>
        )}
      </div>

      {/* Sélection d'organisation */}
      <Card>
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner une organisation
          </label>
          <select
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bleu focus:outline-none"
          >
            <option value="">-- Choisir une organisation --</option>
            {organisations?.items?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {selectedOrgId && activityQuery && (
        <>
          {/* Filtres */}
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Filtres</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtre Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'interaction
                  </label>
                  <select
                    value={filters.values.type}
                    onChange={(e) => filters.setFilter('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bleu focus:outline-none"
                  >
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre Date De */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={filters.values.dateFrom}
                    onChange={(e) => filters.setFilter('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bleu focus:outline-none"
                  />
                </div>

                {/* Filtre Date À */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={filters.values.dateTo}
                    onChange={(e) => filters.setFilter('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bleu focus:outline-none"
                  />
                </div>
              </div>

              {filters.hasActiveFilters && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={filters.reset}
                    className="text-sm text-bleu hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                  <span className="text-sm text-gray-500">
                    ({filteredActivities.length} résultat{filteredActivities.length > 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Tableau */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              Historique d'activité
              {filters.values.type !== 'all' && ` - ${ACTIVITY_TYPES.find(t => t.value === filters.values.type)?.label}`}
            </h2>
          </div>

          {activityError && (
            <Alert type="error" message={activityError} />
          )}

          <Card>
            <Table
              columns={columns}
              data={filteredActivities || []}
              isLoading={activityLoading}
              isEmpty={!filteredActivities || filteredActivities.length === 0}
              emptyMessage={
                filters.hasActiveFilters
                  ? 'Aucune interaction ne correspond aux filtres'
                  : 'Aucune interaction pour cette organisation'
              }
            />
          </Card>
        </>
      )}

      {/* Modal Création */}
      <InteractionCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        organisationId={selectedOrgId || undefined}
        onSuccess={() => {
          activityQuery?.refetch?.()
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
