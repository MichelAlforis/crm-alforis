// app/dashboard/page.tsx
// ============= DASHBOARD HOME PAGE - P2 OPTIMIZED =============

'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/shared'
import { CardsSkeleton, WidgetSkeleton } from '@/components/skeletons'

// P2 Optimization: Dynamic imports with loading states
const KPICards = dynamic(() => import('@/components/dashboard/KPICards').then(mod => ({ default: mod.KPICards })), {
  ssr: false,
  loading: () => <CardsSkeleton />,
})

const DashboardInteractionsWidget = dynamic(
  () => import('@/components/interactions/DashboardInteractionsWidget').then(mod => ({ default: mod.DashboardInteractionsWidget })),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
)

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ardoise mb-2">Bienvenue au CRM</h1>
        <p className="text-gray-600">Gérez vos organisations, mandats et relations clients</p>
      </div>

      {/* Stats cards - P2: Suspense + Dynamic import */}
      <Suspense fallback={<CardsSkeleton />}>
        <KPICards />
      </Suspense>

      {/* Quick actions - Static, renders immediately */}
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

      {/* Recent Interactions Widget - P2: Suspense + Dynamic import */}
      <Suspense fallback={<WidgetSkeleton />}>
        <DashboardInteractionsWidget limit={5} />
      </Suspense>
    </div>
  )
}
