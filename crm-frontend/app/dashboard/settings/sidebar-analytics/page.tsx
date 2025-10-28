'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  Clock,
  MousePointerClick,
  TrendingUp,
  Star,
  Download,
  RefreshCw,
  Lightbulb,
} from 'lucide-react'
import { useSidebarAnalytics } from '@/hooks/useSidebarAnalytics'
import { useSidebar } from '@/hooks/useSidebar'
import { SIDEBAR_SECTIONS } from '@/config/sidebar.config'
import { useToast } from '@/components/ui/Toast'

export default function SidebarAnalyticsPage() {
  const analytics = useSidebarAnalytics()
  const sidebar = useSidebar(SIDEBAR_SECTIONS)
  const { showToast } = useToast()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const totalClicks = analytics.getTotalClicks()
  const totalTimeSeconds = analytics.getTotalTimeSpent()
  const totalTimeFormatted = formatDuration(totalTimeSeconds)
  const mostUsed = analytics.getMostUsed(10)
  const suggestions = analytics.getSuggestedFavorites(sidebar.favorites, 5)

  // Calculer les suggestions avec labels
  const suggestionsWithLabels = suggestions.map((href) => {
    const found = mostUsed.find((stat) => stat.href === href)
    return {
      href,
      label: found?.label || href,
      stats: found,
    }
  })

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}min`
  }

  function handleExport() {
    const jsonData = analytics.exportData()
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sidebar-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast({
      type: 'success',
      title: 'Export réussi',
      message: 'Les analytics ont été exportées en JSON',
    })
  }

  function handleReset() {
    analytics.resetAnalytics()
    setShowResetConfirm(false)
    showToast({
      type: 'success',
      title: 'Analytics réinitialisées',
      message: 'Toutes les données de tracking ont été effacées',
    })
  }

  function handleApplySuggestions() {
    let added = 0
    suggestions.forEach((href) => {
      if (!sidebar.isFavorite(href)) {
        sidebar.toggleFavorite(href)
        added++
      }
    })

    showToast({
      type: 'success',
      title: 'Favoris ajoutés',
      message: `${added} suggestion(s) ajoutée(s) à vos favoris`,
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux paramètres
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Analytics Sidebar
            </h1>
            <p className="text-gray-600 mt-2">
              Analysez votre utilisation de la navigation pour optimiser votre workflow
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <MousePointerClick className="w-8 h-8 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Total Clics
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{totalClicks}</p>
          <p className="text-sm text-gray-500 mt-1">
            Navigation sidebar
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8 text-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Temps Total
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">
            {totalTimeFormatted}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Sur toutes les sections
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <Star className="w-8 h-8 text-yellow-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Favoris
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">
            {sidebar.favorites.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Sections épinglées
          </p>
        </div>
      </div>

      {/* Suggestions IA */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-indigo-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Suggestions Intelligentes
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Basées sur votre utilisation des 30 derniers jours
                </p>
              </div>
            </div>
            <button
              onClick={handleApplySuggestions}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Tout ajouter aux favoris
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            {suggestionsWithLabels.map((item) => (
              <div
                key={item.href}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-indigo-100"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.href}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-indigo-600">
                      {item.stats?.clicks || 0}
                    </p>
                    <p className="text-xs text-gray-500">clics</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-indigo-600">
                      {formatDuration(item.stats?.totalTime || 0)}
                    </p>
                    <p className="text-xs text-gray-500">temps</p>
                  </div>
                  <button
                    onClick={() => sidebar.toggleFavorite(item.href)}
                    className="p-2 rounded-lg hover:bg-indigo-100 transition"
                    title="Ajouter aux favoris"
                  >
                    <Star className="w-5 h-5 text-indigo-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 10 des sections les plus utilisées */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sections les Plus Utilisées
            </h2>
            <p className="text-sm text-gray-500">
              Top 10 basé sur clics et temps passé
            </p>
          </div>
        </div>

        {mostUsed.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Aucune donnée disponible. Commencez à naviguer !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mostUsed.map((stat, index) => {
              const isFavorite = sidebar.isFavorite(stat.href)
              const percentage = Math.min(
                100,
                ((stat.clicks / totalClicks) * 100).toFixed(0)
              )

              return (
                <div
                  key={stat.href}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {stat.label || stat.href.split('/').pop()}
                      </p>
                      {isFavorite && (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{stat.href}</p>

                    {/* Barre de progression */}
                    <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="font-bold text-purple-600">{stat.clicks}</p>
                      <p className="text-xs text-gray-500">clics</p>
                    </div>
                    <div>
                      <p className="font-bold text-purple-600">
                        {formatDuration(stat.totalTime)}
                      </p>
                      <p className="text-xs text-gray-500">temps</p>
                    </div>
                    <div>
                      <p className="font-bold text-purple-600">
                        {formatDuration(stat.avgTimePerVisit)}
                      </p>
                      <p className="text-xs text-gray-500">moy/visite</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmation reset */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900">
              Réinitialiser les analytics ?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Cette action supprimera toutes les données de tracking (clics, temps passé, etc.).
              Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Oui, réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
