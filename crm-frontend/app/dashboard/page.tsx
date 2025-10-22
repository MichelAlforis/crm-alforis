// app/dashboard/page.tsx
// ============= DASHBOARD HOME PAGE =============

'use client'

import React, { useEffect } from 'react'
import { Card } from '@/components/shared'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useMandats } from '@/hooks/useMandats'
import { useTasks } from '@/hooks/useTasks'
import { usePeople } from '@/hooks/usePeople'

export default function DashboardPage() {
  // Fetch counts (limit=1 to get only total count, minimal payload)
  const { data: organisationsData, isLoading: loadingOrgs } = useOrganisations({ limit: 1 })
  const { data: mandatsData, isLoading: loadingMandats } = useMandats({ limit: 1 })
  const tasksHook = useTasks()
  const peopleHook = usePeople()

  // ✅ CORRECTIF: Charger les personnes au montage du composant
  useEffect(() => {
    peopleHook.fetchPeople(0, 1)  // Charger seulement 1 item pour avoir le total
  }, [])

  // Extract counts - utiliser le champ 'total' pour avoir le vrai nombre
  const organisationsCount = organisationsData?.total ?? 0
  const mandatsCount = mandatsData?.total ?? 0
  const tasksCount = tasksHook.total ?? 0  // ✅ CORRECTIF: Utiliser .total au lieu de .tasks.length
  const peopleCount = peopleHook.people?.data?.total ?? 0  // ✅ CORRECTIF: Utiliser .data.total au lieu de .data.items.length

  const isLoading = loadingOrgs || loadingMandats || tasksHook.isLoading || peopleHook.people.isLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ardoise mb-2">Bienvenue au CRM</h1>
        <p className="text-gray-600">Gérez vos organisations, mandats et relations clients</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          {isLoading ? (
            <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
          ) : (
            <div className="text-3xl font-bold text-bleu">{organisationsCount}</div>
          )}
          <p className="text-gray-600 text-sm mt-1">Organisations</p>
        </Card>

        <Card className="text-center">
          {isLoading ? (
            <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
          ) : (
            <div className="text-3xl font-bold text-vert">{mandatsCount}</div>
          )}
          <p className="text-gray-600 text-sm mt-1">Mandats</p>
        </Card>

        <Card className="text-center">
          {isLoading ? (
            <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
          ) : (
            <div className="text-3xl font-bold text-orange-500">{tasksCount}</div>
          )}
          <p className="text-gray-600 text-sm mt-1">Tâches</p>
        </Card>

        <Card className="text-center">
          {isLoading ? (
            <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
          ) : (
            <div className="text-3xl font-bold text-purple-500">{peopleCount}</div>
          )}
          <p className="text-gray-600 text-sm mt-1">Contacts</p>
        </Card>
      </div>

      {/* Quick actions */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/organisations/new"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <p className="font-medium text-ardoise">➕ Nouvelle organisation</p>
          </a>
          <a
            href="/dashboard/mandats/new"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <p className="font-medium text-ardoise">📋 Nouveau mandat</p>
          </a>
          <a
            href="/dashboard/tasks"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <p className="font-medium text-ardoise">✓ Voir mes tâches</p>
          </a>
        </div>
      </Card>
    </div>
  )
}
