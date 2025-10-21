/**
 * Dashboard Agent IA - Page principale
 * Statistiques, actions rapides, exécutions récentes
 */
'use client'

import React from 'react'
import {
  useAIStatistics,
  useAIExecutions,
  useDetectDuplicates,
  useEnrichOrganisations,
  useCheckQuality,
} from '@/hooks/useAI'
import AIStatCard from '@/components/ai/AIStatCard'
import AIExecutionsList from '@/components/ai/AIExecutionsList'
import {
  Sparkles,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  Database,
  FileCheck,
  Settings,
  List,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AIDashboardPage() {
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useAIStatistics()
  const { data: executions, isLoading: executionsLoading } = useAIExecutions({ limit: 10 })

  const detectDuplicates = useDetectDuplicates()
  const enrichOrganisations = useEnrichOrganisations()
  const checkQuality = useCheckQuality()

  const cacheHitRate = stats?.cache_hit_rate ? (stats.cache_hit_rate * 100).toFixed(0) : '0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent IA
            </h1>
            <p className="text-gray-600 mt-2">
              Détection intelligente, enrichissement automatique et contrôle qualité
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/ai/suggestions"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              Suggestions
            </Link>
            <Link
              href="/dashboard/ai/config"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configuration
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AIStatCard
            title="Suggestions en attente"
            value={stats?.pending_suggestions || 0}
            icon={Clock}
            gradient="from-yellow-500 to-orange-500"
            subtitle="À valider"
            onClick={() => router.push('/dashboard/ai/suggestions?status=pending')}
          />

          <AIStatCard
            title="Suggestions approuvées"
            value={stats?.approved_suggestions || 0}
            icon={CheckCircle}
            gradient="from-green-500 to-emerald-500"
            subtitle={`${stats?.applied_suggestions || 0} appliquées`}
          />

          <AIStatCard
            title="Coût total"
            value={`$${stats?.total_cost_usd?.toFixed(2) || '0.00'}`}
            icon={DollarSign}
            gradient="from-blue-500 to-cyan-500"
            subtitle={`${cacheHitRate}% cache hit rate`}
          />

          <AIStatCard
            title="Confiance moyenne"
            value={`${((stats?.average_confidence || 0) * 100).toFixed(0)}%`}
            icon={TrendingUp}
            gradient="from-purple-500 to-pink-500"
            subtitle="Score de précision"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Detect Duplicates */}
            <button
              onClick={() => detectDuplicates.mutate({ limit: 100 })}
              disabled={detectDuplicates.isPending}
              className="group p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between mb-3">
                <Sparkles className="h-8 w-8 text-white" />
                {detectDuplicates.isPending && (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white">Détecter doublons</h3>
              <p className="text-sm text-purple-100 mt-2">
                Analyse les 100 dernières organisations
              </p>
            </button>

            {/* Enrich Data */}
            <button
              onClick={() => enrichOrganisations.mutate({ limit: 50 })}
              disabled={enrichOrganisations.isPending}
              className="group p-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between mb-3">
                <Database className="h-8 w-8 text-white" />
                {enrichOrganisations.isPending && (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white">Enrichir données</h3>
              <p className="text-sm text-blue-100 mt-2">
                Complète les champs manquants (50 org)
              </p>
            </button>

            {/* Check Quality */}
            <button
              onClick={() => checkQuality.mutate({ limit: 100 })}
              disabled={checkQuality.isPending}
              className="group p-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between mb-3">
                <FileCheck className="h-8 w-8 text-white" />
                {checkQuality.isPending && (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white">Contrôle qualité</h3>
              <p className="text-sm text-green-100 mt-2">
                Vérifie la cohérence des données
              </p>
            </button>
          </div>
        </div>

        {/* Suggestions by Type */}
        {stats && stats.suggestions_by_type && Object.keys(stats.suggestions_by_type).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Répartition par type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.suggestions_by_type).map(([type, count]) => (
                <div key={type} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 capitalize">
                    {type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Executions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Exécutions récentes</h2>
            <Zap className="h-5 w-5 text-gray-400" />
          </div>

          {executionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <AIExecutionsList executions={executions || []} />
          )}
        </div>
      </div>
    </div>
  )
}
