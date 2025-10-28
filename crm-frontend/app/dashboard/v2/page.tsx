// app/dashboard-v2/page.tsx
// ============= DASHBOARD V2 - Main Page =============

'use client'

import React, { useState, useEffect } from 'react'
import { Card, Button } from '@/components/shared'
import { Alert } from '@/components/shared/Alert'
import {
  KPICardWidget,
  RevenueChartWidget,
  AIInsightsWidget,
  TopClientsWidget,
  EmailPerformanceWidget,
} from '@/components/dashboard-v2/widgets'
import {
  Settings,
  Layout as LayoutIcon,
  Sparkles,
  BarChart3,
  Users,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import { ActivityWidget } from '@/components/dashboard/widgets/ActivityWidget'
import { DashboardInteractionsWidget } from '@/components/interactions/DashboardInteractionsWidget'

type DashboardView = 'executive' | 'commercial' | 'manager' | 'custom'

export default function DashboardV2Page() {
  const [selectedView, setSelectedView] = useState<DashboardView>('executive')
  const [kpiPeriod, setKpiPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [kpiData, setKpiData] = useState<any>(null)
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true)

  useEffect(() => {
    fetchKPIs()
  }, [kpiPeriod])

  const fetchKPIs = async () => {
    setIsLoadingKPIs(true)
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(
        `${API_BASE}/dashboard/kpis?period=${kpiPeriod}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch KPIs')

      const result = await response.json()
      setKpiData(result)
    } catch (err) {
      console.error('Error fetching KPIs:', err)
    } finally {
      setIsLoadingKPIs(false)
    }
  }

  const viewConfigs = [
    {
      id: 'executive' as DashboardView,
      label: 'Vue Executive',
      icon: BarChart3,
      color: 'purple',
      description: 'Vision globale et insights stratégiques',
    },
    {
      id: 'commercial' as DashboardView,
      label: 'Vue Commercial',
      icon: Briefcase,
      color: 'blue',
      description: 'Pipeline et actions commerciales',
    },
    {
      id: 'manager' as DashboardView,
      label: 'Vue Manager',
      icon: Users,
      color: 'green',
      description: 'Performance équipe et analytics',
    },
  ]

  const renderExecutiveView = () => (
    <>
      {/* Hero Section */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-ardoise flex items-center gap-2">
              <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
              Dashboard V2 - Executive
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Vision stratégique de votre activité en temps réel
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={kpiPeriod}
              onChange={(e) => setKpiPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu min-h-[44px]"
            >
              <option value="week">7 jours</option>
              <option value="month">30 jours</option>
              <option value="quarter">90 jours</option>
            </select>
            <Link href="/dashboard/v2/customize" className="w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">
                <Settings className="h-4 w-4 mr-2" />
                <span className="sm:inline">Personnaliser</span>
              </Button>
            </Link>
          </div>
        </div>

        <Alert
          type="info"
          message="🚀 Nouveau! Dashboard V2 avec analytics avancées et insights IA. Personnalisez votre vue selon vos besoins."
        />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6">
        <KPICardWidget
          title="Organisations"
          value={kpiData?.organisations?.value || 0}
          previousValue={kpiData?.organisations?.previous_value}
          changePercent={kpiData?.organisations?.change_percent}
          trend={kpiData?.organisations?.trend}
          color="blue"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Contacts"
          value={kpiData?.contacts?.value || 0}
          previousValue={kpiData?.contacts?.previous_value}
          changePercent={kpiData?.contacts?.change_percent}
          trend={kpiData?.contacts?.trend}
          color="purple"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Tâches"
          value={kpiData?.tasks?.value || 0}
          previousValue={kpiData?.tasks?.previous_value}
          changePercent={kpiData?.tasks?.change_percent}
          trend={kpiData?.tasks?.trend}
          color="orange"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Interactions"
          value={kpiData?.interactions?.value || 0}
          previousValue={kpiData?.interactions?.previous_value}
          changePercent={kpiData?.interactions?.change_percent}
          trend={kpiData?.interactions?.trend}
          color="green"
          isLoading={isLoadingKPIs}
        />
      </div>

      {/* AI Insights - Full width */}
      <div className="mb-6">
        <AIInsightsWidget limit={5} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChartWidget
          title="Évolution du revenu"
          period="30days"
          chartType="area"
        />
        <TopClientsWidget
          title="Top Clients"
          limit={10}
          sortBy="health_score"
        />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <EmailPerformanceWidget period="30days" />
        <div className="lg:col-span-2">
          <ActivityWidget limit={10} />
        </div>
      </div>
    </>
  )

  const renderCommercialView = () => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ardoise flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-bleu" />
          Dashboard V2 - Commercial
        </h1>
        <p className="text-gray-600 mt-1">
          Optimisez votre pipeline et vos actions commerciales
        </p>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 md:mb-6">
        <KPICardWidget
          title="Pipeline"
          value="0"
          color="blue"
          format="currency"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Tâches du jour"
          value={kpiData?.tasks?.value || 0}
          color="orange"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Interactions cette semaine"
          value={kpiData?.interactions?.value || 0}
          color="green"
          isLoading={isLoadingKPIs}
        />
      </div>

      {/* Commercial specific widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TopClientsWidget
          title="Leads prioritaires"
          limit={10}
          sortBy="health_score"
        />
        <DashboardInteractionsWidget limit={10} />
      </div>

      <div className="mb-6">
        <ActivityWidget limit={15} />
      </div>
    </>
  )

  const renderManagerView = () => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ardoise flex items-center gap-2">
          <Users className="h-8 w-8 text-vert" />
          Dashboard V2 - Manager
        </h1>
        <p className="text-gray-600 mt-1">
          Pilotez la performance de votre équipe
        </p>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 md:mb-6">
        <KPICardWidget
          title="Organisations"
          value={kpiData?.organisations?.value || 0}
          changePercent={kpiData?.organisations?.change_percent}
          trend={kpiData?.organisations?.trend}
          color="blue"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Tâches actives"
          value={kpiData?.tasks?.value || 0}
          changePercent={kpiData?.tasks?.change_percent}
          trend={kpiData?.tasks?.trend}
          color="orange"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Taux de conversion"
          value="0"
          format="percent"
          color="green"
          isLoading={isLoadingKPIs}
        />
        <KPICardWidget
          title="Objectif mensuel"
          value="0"
          format="currency"
          color="purple"
          isLoading={isLoadingKPIs}
        />
      </div>

      {/* Manager analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChartWidget
          title="Performance équipe"
          period="90days"
          chartType="bar"
        />
        <AIInsightsWidget limit={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EmailPerformanceWidget period="30days" />
        <TopClientsWidget limit={10} sortBy="revenue" />
      </div>
    </>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* View Selector */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <LayoutIcon className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-700">Vue:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {viewConfigs.map((config) => {
              const Icon = config.icon
              const isActive = selectedView === config.id
              return (
                <button
                  key={config.id}
                  onClick={() => setSelectedView(config.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                    isActive
                      ? 'bg-bleu text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={config.description}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Render selected view */}
      {selectedView === 'executive' && renderExecutiveView()}
      {selectedView === 'commercial' && renderCommercialView()}
      {selectedView === 'manager' && renderManagerView()}
    </div>
  )
}
