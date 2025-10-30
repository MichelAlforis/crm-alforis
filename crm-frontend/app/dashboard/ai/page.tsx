/**
 * Dashboard Agent IA - Page principale
 * Statistiques, actions rapides, exécutions récentes
 */
'use client'

import React, { useState } from 'react'
import {
  useAIStatistics,
  useAIExecutions,
  useDetectDuplicates,
  useEnrichOrganisations,
  useCheckQuality,
  useParseSignature,
} from '@/hooks/useAI'
import AIStatCard from '@/components/ai/AIStatCard'
import AIExecutionsList from '@/components/ai/AIExecutionsList'
import {
  Sparkles,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  Database,
  FileCheck,
  Settings,
  List,
  Mail,
  X,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AIDashboardPage() {
  const router = useRouter()
  const { data: stats } = useAIStatistics()
  const { data: executions, isLoading: executionsLoading } = useAIExecutions({ limit: 10 })

  const detectDuplicates = useDetectDuplicates()
  const enrichOrganisations = useEnrichOrganisations()
  const checkQuality = useCheckQuality()
  const parseSignature = useParseSignature()

  const [showParseModal, setShowParseModal] = useState(false)
  const [emailBody, setEmailBody] = useState('')
  const [parseResult, setParseResult] = useState<any>(null)

  const cacheHitRate = stats?.cache_hit_rate ? (stats.cache_hit_rate * 100).toFixed(0) : '0'

  const handleParse = async () => {
    if (!emailBody.trim()) return

    const result = await parseSignature.mutateAsync({ email_body: emailBody })
    setParseResult(result)
  }

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
              href="/dashboard/ai/intelligence"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 font-medium shadow-lg"
            >
              <TrendingUp className="h-4 w-4" />
              Dashboard Intelligence
            </Link>
            <Link
              href="/dashboard/ai/autofill"
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 font-medium shadow-lg"
            >
              <Zap className="h-4 w-4" />
              Batch Autofill
            </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Parse Signature */}
            <button
              onClick={() => setShowParseModal(true)}
              className="group p-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Parser Signature</h3>
              <p className="text-sm text-orange-100 mt-2">
                Extraire infos d'une signature email
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

      {/* Parse Signature Modal */}
      {showParseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Parser Signature Email</h2>
                  <p className="text-sm text-gray-600">Extraction automatique des coordonnées</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowParseModal(false)
                  setParseResult(null)
                  setEmailBody('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Corps de l'email (avec signature)
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Collez le corps complet de l'email ici...&#10;&#10;Exemple:&#10;Bonjour,&#10;&#10;Merci pour votre retour.&#10;&#10;Cordialement,&#10;Jean Dupont&#10;Directeur Commercial&#10;ACME Corp&#10;Tel: +33 1 23 45 67 89&#10;jean.dupont@acme.fr&#10;www.acme.fr"
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Parse Button */}
              <button
                onClick={handleParse}
                disabled={parseSignature.isPending || !emailBody.trim()}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {parseSignature.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Parsing en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Parser la signature
                  </>
                )}
              </button>

              {/* Results */}
              {parseResult && (
                <div className="border-t border-gray-200 pt-6">
                  {parseResult.success ? (
                    <div className="space-y-4">
                      {/* Success Header */}
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">
                          Parsing réussi ({parseResult.confidence ? (parseResult.confidence * 100).toFixed(0) + '%' : 'N/A'} confiance)
                        </span>
                      </div>

                      {/* Metadata */}
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>🤖 {parseResult.model_used || 'IA'}</span>
                        <span>⏱️ {parseResult.processing_time_ms || 0}ms</span>
                        {parseResult.from_cache && <span>💾 Cached</span>}
                      </div>

                      {/* Extracted Data */}
                      {parseResult.data && Object.keys(parseResult.data).length > 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <h3 className="font-semibold text-gray-900 mb-3">Données extraites:</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(parseResult.data).map(([key, value]) => (
                              <div key={key} className="bg-white rounded p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
                                <p className="font-medium text-gray-900 mt-1">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Aucune donnée extraite</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <span>Erreur: {parseResult.error || 'Échec du parsing'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
