// app/dashboard/interactions/page.tsx
// ============= INTERACTIONS PAGE =============
// MIGRATED: Uses new Organisation activity API instead of legacy hooks

'use client'

import React, { useState, useMemo } from 'react'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useOrganisationActivity, flattenActivities } from '@/hooks/useOrganisationActivity'
import { Card, Table, Alert } from '@/components/shared'

export default function InteractionsPage() {
  const { data: organisations } = useOrganisations()
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)

  const activityQuery = selectedOrgId 
    ? useOrganisationActivity(selectedOrgId)
    : null
  
  const activities = useMemo(() => 
    flattenActivities(activityQuery?.data?.pages),
    [activityQuery?.data?.pages]
  )
  const activityLoading = activityQuery?.isLoading ?? false
  const activityError = activityQuery?.error ? String(activityQuery.error) : undefined

  const handleDelete = async (activityId: number) => {
    if (confirm('Supprimer cette activité?')) {
      try {
        // Call delete endpoint (implement based on your API)
        await fetch(`/api/organisations/${selectedOrgId}/activity/${activityId}`, {
          method: 'DELETE',
        })
        activityQuery?.refetch?.()
      } catch (err) {
        console.error('Error deleting activity:', err)
      }
    }
  }

  const columns = [
    {
      header: 'Type d\'événement',
      accessor: 'event_type',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {value || 'Événement'}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Description',
      accessor: 'description',
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
      <h1 className="text-3xl font-bold text-ardoise">Activités et interactions</h1>

      {/* Sélection d'organisation */}
      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner une organisation
          </label>
          <select
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Historique d'activité</h2>
          </div>

          {activityError && (
            <Alert type="error" message={activityError} />
          )}

          <Card>
            <Table
              columns={columns}
              data={activities || []}
              isLoading={activityLoading}
              isEmpty={!activities || activities.length === 0}
            />
          </Card>
        </>
      )}
    </div>
  )
}
