
// app/dashboard/page.tsx
// ============= DASHBOARD HOME PAGE =============

'use client'

import React from 'react'
import { Card } from '@/components/shared'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ardoise mb-2">Bienvenue au CRM</h1>
        <p className="text-gray-600">Gérez vos investisseurs et leurs interactions</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-bleu">0</div>
          <p className="text-gray-600 text-sm mt-1">Investisseurs</p>
        </Card>
        
        <Card className="text-center">
          <div className="text-3xl font-bold text-vert">0</div>
          <p className="text-gray-600 text-sm mt-1">Interactions</p>
        </Card>
        
        <Card className="text-center">
          <div className="text-3xl font-bold text-orange-500">0</div>
          <p className="text-gray-600 text-sm mt-1">KPIs</p>
        </Card>
        
        <Card className="text-center">
          <div className="text-3xl font-bold text-purple-500">0€</div>
          <p className="text-gray-600 text-sm mt-1">Revenu total</p>
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
            <p className="font-medium text-ardoise">Nouvelle organisation</p>
          </a>
          <a 
            href="/dashboard/organisations"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <p className="font-medium text-ardoise">Voir toutes les organisations</p>
          </a>
          <a 
            href="/dashboard/kpis"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <p className="font-medium text-ardoise">Saisir des KPIs</p>
          </a>
        </div>
      </Card>
    </div>
  )
}