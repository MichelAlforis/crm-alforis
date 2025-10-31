// components/dashboard/KPICards.tsx
// ============= P2 OPTIMIZATION: Separated KPI Cards for Suspense =============

'use client'

import React, { useEffect } from 'react'
import { Card } from '@/components/shared'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useMandats } from '@/hooks/useMandats'
import { useTasks } from '@/hooks/useTasks'
import { usePeople } from '@/hooks/usePeople'

/**
 * KPI Cards Component
 * Separated from main dashboard for better Suspense streaming
 * Fetches only counts (limit=1) to minimize payload
 */
export function KPICards() {
  // Fetch counts (limit=1 to get only total count, minimal payload)
  const { data: organisationsData, isLoading: loadingOrgs } = useOrganisations({ limit: 1 })
  const { data: mandatsData, isLoading: loadingMandats } = useMandats({ limit: 1 })
  const tasksHook = useTasks()
  const peopleHook = usePeople()

  // Load people count on mount
  useEffect(() => {
    peopleHook.fetchPeople(0, 1) // Load only 1 item to get total
  }, [])

  // Extract counts
  const organisationsCount = organisationsData?.total ?? 0
  const mandatsCount = mandatsData?.total ?? 0
  const tasksCount = tasksHook.total ?? 0
  const peopleCount = peopleHook.people?.data?.total ?? 0

  const isLoading = loadingOrgs || loadingMandats || tasksHook.isLoading || peopleHook.people.isLoading

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="text-center">
        {isLoading ? (
          <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
        ) : (
          <div className="text-3xl font-bold text-bleu">{organisationsCount}</div>
        )}
        <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">Organisations</p>
      </Card>

      <Card className="text-center">
        {isLoading ? (
          <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
        ) : (
          <div className="text-3xl font-bold text-vert">{mandatsCount}</div>
        )}
        <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">Mandats</p>
      </Card>

      <Card className="text-center">
        {isLoading ? (
          <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
        ) : (
          <div className="text-3xl font-bold text-orange-500">{tasksCount}</div>
        )}
        <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">Tâches</p>
      </Card>

      <Card className="text-center">
        {isLoading ? (
          <div className="text-3xl font-bold text-gray-300 animate-pulse">-</div>
        ) : (
          <div className="text-3xl font-bold text-purple-500">{peopleCount}</div>
        )}
        <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">Contacts</p>
      </Card>
    </div>
  )
}
