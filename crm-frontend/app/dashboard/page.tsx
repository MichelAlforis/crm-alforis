// app/dashboard-v2/page.tsx
// ============= DASHBOARD V2 - Main Page =============

'use client'

import React, { useState, useEffect, lazy, Suspense } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import { Card, Button, PageContainer } from '@/components/shared'
import { Alert } from '@/components/shared/Alert'
import {
  Settings,
  Layout as LayoutIcon,
  Sparkles,
  BarChart3,
  Users,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

// Lazy load tous les widgets (ne chargent que lorsque la vue est affichée)
const KPICardWidget = lazy(() => import('@/components/dashboard-v2/widgets').then(m => ({ default: m.KPICardWidget })))
const RevenueChartWidget = lazy(() => import('@/components/dashboard-v2/widgets').then(m => ({ default: m.RevenueChartWidget })))
const AIInsightsWidget = lazy(() => import('@/components/dashboard-v2/widgets').then(m => ({ default: m.AIInsightsWidget })))
const TopClientsWidget = lazy(() => import('@/components/dashboard-v2/widgets').then(m => ({ default: m.TopClientsWidget })))
const EmailPerformanceWidget = lazy(() => import('@/components/dashboard-v2/widgets').then(m => ({ default: m.EmailPerformanceWidget })))
const ActivityWidget = lazy(() => import('@/components/dashboard/widgets/ActivityWidget').then(m => ({ default: m.ActivityWidget })))
const DashboardInteractionsWidget = lazy(() => import('@/components/interactions/DashboardInteractionsWidget').then(m => ({ default: m.DashboardInteractionsWidget })))

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
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

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
      logger.error('Error fetching KPIs:', err)
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
      <section className="@container flex flex-col gap-fluid-3 pb-fluid-3">
        <header className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between gap-fluid-3">
          <div className="flex flex-col gap-fluid-1">
            <h1 className="text-fluid-3xl font-bold text-ardoise flex items-center gap-fluid-2">
              <Sparkles className="h-6 w-6 text-purple-500 @md:h-8 @md:w-8" />
              Dashboard V2 - Executive
            </h1>
            <p className="text-fluid-base text-gray-600 dark:text-slate-400">
              Vision stratégique de votre activité en temps réel
            </p>
          </div>
          <div className="flex flex-col @sm:flex-row items-stretch @sm:items-center gap-fluid-2 @lg:gap-fluid-3">
            <select
              value={kpiPeriod}
              onChange={(e) => setKpiPeriod(e.target.value as any)}
              className="w-full @sm:w-auto rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-fluid-3 py-fluid-2 text-fluid-sm focus:outline-none focus:ring-2 focus:ring-bleu min-h-[44px]"
            >
              <option value="week">7 jours</option>
              <option value="month">30 jours</option>
              <option value="quarter">90 jours</option>
            </select>
            <Link href="/dashboard/v2/customize" className="w-full @sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                className="w-full @sm:w-auto min-h-[44px] justify-center gap-2 px-fluid-3 py-fluid-2 text-fluid-sm"
              >
                <Settings className="h-4 w-4" />
                <span className="@sm:inline">Personnaliser</span>
              </Button>
            </Link>
          </div>
        </header>

        <Alert
          type="info"
          message="🚀 Nouveau! Dashboard V2 avec analytics avancées et insights IA. Personnalisez votre vue selon vos besoins."
        />
      </section>

      {/* KPI Cards Row */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-3 @sm:grid-cols-2 @xl:grid-cols-4">
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
      </section>

      {/* AI Insights - Full width */}
      <section className="@container pb-fluid-4">
        <AIInsightsWidget limit={5} />
      </section>

      {/* Charts Row */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-4 @lg:grid-cols-2">
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
      </section>

      {/* Analytics Row */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-4 @lg:grid-cols-3">
          <EmailPerformanceWidget period="30days" />
          <div className="@lg:col-span-2">
            <ActivityWidget limit={10} />
          </div>
        </div>
      </section>
    </>
  )

  const renderCommercialView = () => (
    <>
      <section className="@container flex flex-col gap-fluid-2 pb-fluid-4">
        <h1 className="text-fluid-3xl font-bold text-ardoise flex items-center gap-fluid-2">
          <Briefcase className="h-7 w-7 text-bleu @md:h-8 @md:w-8" />
          Dashboard V2 - Commercial
        </h1>
        <p className="text-fluid-base text-gray-600 dark:text-slate-400">
          Optimisez votre pipeline et vos actions commerciales
        </p>
      </section>

      {/* Quick KPIs */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-3 @sm:grid-cols-2 @xl:grid-cols-3">
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
      </section>

      {/* Commercial specific widgets */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-4 @lg:grid-cols-2">
          <TopClientsWidget
            title="Leads prioritaires"
            limit={10}
            sortBy="health_score"
          />
          <DashboardInteractionsWidget limit={10} />
        </div>
      </section>

      <section className="@container pb-fluid-4">
        <ActivityWidget limit={15} />
      </section>
    </>
  )

  const renderManagerView = () => (
    <>
      <section className="@container flex flex-col gap-fluid-2 pb-fluid-4">
        <h1 className="text-fluid-3xl font-bold text-ardoise flex items-center gap-fluid-2">
          <Users className="h-7 w-7 text-vert @md:h-8 @md:w-8" />
          Dashboard V2 - Manager
        </h1>
        <p className="text-fluid-base text-gray-600 dark:text-slate-400">
          Pilotez la performance de votre équipe
        </p>
      </section>

      {/* Team KPIs */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-3 @sm:grid-cols-2 @xl:grid-cols-4">
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
      </section>

      {/* Manager analytics */}
      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-4 @lg:grid-cols-2">
          <RevenueChartWidget
            title="Performance équipe"
            period="90days"
            chartType="bar"
          />
          <AIInsightsWidget limit={5} />
        </div>
      </section>

      <section className="@container pb-fluid-4">
        <div className="grid grid-cols-1 gap-fluid-4 @lg:grid-cols-2">
          <EmailPerformanceWidget period="30days" />
          <TopClientsWidget limit={10} sortBy="revenue" />
        </div>
      </section>
    </>
  )

  return (
    <PageContainer width="wide" spacing="normal" className="@container">
      {/* View Selector */}
      <Card padding="none" className="@container p-spacing-sm @md:p-spacing-md">
        <div className="flex flex-col @sm:flex-row @sm:items-center @sm:justify-between gap-spacing-sm">
          <div className="flex items-center gap-spacing-xs text-fluid-base text-text-primary">
            <LayoutIcon className="h-5 w-5 text-text-secondary" />
            <span className="font-medium">Vue:</span>
          </div>
          <div className="grid grid-cols-1 gap-spacing-xs @sm:grid-cols-3 w-full @lg:w-auto">
            {viewConfigs.map((config) => {
              const Icon = config.icon
              const isActive = selectedView === config.id
              return (
                <button
                  key={config.id}
                  onClick={() => setSelectedView(config.id)}
                  className={`flex items-center justify-center gap-spacing-xs rounded-lg px-spacing-sm py-spacing-xs text-fluid-sm font-medium transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-bleu text-white shadow-md'
                      : 'bg-gray-100 dark:bg-slate-800 text-text-primary hover:bg-gray-200'
                  }`}
                  title={config.description}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Render selected view */}
      <Suspense fallback={
        <div className="space-y-spacing-lg animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="grid grid-cols-2 gap-spacing-md">
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      }>
        {selectedView === 'executive' && renderExecutiveView()}
        {selectedView === 'commercial' && renderCommercialView()}
        {selectedView === 'manager' && renderManagerView()}
      </Suspense>
    </PageContainer>
  )
}
