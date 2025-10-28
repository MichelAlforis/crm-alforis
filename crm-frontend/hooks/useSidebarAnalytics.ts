/**
 * useSidebarAnalytics - Hook pour analytics et intelligence de la sidebar
 *
 * Phase 4 Features:
 * - Tracking clics navigation
 * - Temps passé par section
 * - Items les plus utilisés
 * - Suggestions automatiques de favoris
 * - Heatmap d'utilisation
 *
 * @example
 * const analytics = useSidebarAnalytics()
 * analytics.trackClick('/dashboard/marketing')
 * const mostUsed = analytics.getMostUsed() // ['marketing', 'workflows']
 * const suggestions = analytics.getSuggestedFavorites() // ['/dashboard/ai']
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { logger } from '@/lib/logger'

// Types
export interface ClickData {
  href: string
  timestamp: number
  label?: string
}

export interface TimeData {
  href: string
  startTime: number
  duration: number
}

export interface AnalyticsData {
  clicks: ClickData[]
  timeSpent: TimeData[]
  lastVisit: Record<string, number>
}

export interface UsageStats {
  href: string
  label: string
  clicks: number
  totalTime: number // en secondes
  avgTimePerVisit: number
  lastVisit: Date | null
  frequency: number // clics par jour
}

const STORAGE_KEY = 'sidebar-analytics-data'
const MAX_HISTORY_DAYS = 30 // Garder 30 jours d'historique

/**
 * Charger les données analytics depuis localStorage
 */
function loadAnalytics(): AnalyticsData {
  if (typeof window === 'undefined') {
    return { clicks: [], timeSpent: [], lastVisit: {} }
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { clicks: [], timeSpent: [], lastVisit: {} }

    const data: AnalyticsData = JSON.parse(saved)

    // Nettoyer les données anciennes (> 30 jours)
    const cutoffTime = Date.now() - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000

    return {
      clicks: data.clicks.filter((c) => c.timestamp > cutoffTime),
      timeSpent: data.timeSpent.filter((t) => t.startTime > cutoffTime),
      lastVisit: data.lastVisit || {},
    }
  } catch {
    return { clicks: [], timeSpent: [], lastVisit: {} }
  }
}

/**
 * Sauvegarder les données analytics dans localStorage
 */
function saveAnalytics(data: AnalyticsData) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    logger.warn('Failed to save sidebar analytics:', error)
  }
}

export function useSidebarAnalytics() {
  const pathname = usePathname()
  const [data, setData] = useState<AnalyticsData>(loadAnalytics)
  const [sessionStart, setSessionStart] = useState<number | null>(null)
  const [currentPath, setCurrentPath] = useState<string | null>(null)

  // Sauvegarder automatiquement les changements
  useEffect(() => {
    saveAnalytics(data)
  }, [data])

  // Tracking du temps passé sur la route actuelle
  useEffect(() => {
    if (!pathname) return

    // Si on change de route, enregistrer le temps de la route précédente
    if (currentPath && currentPath !== pathname && sessionStart) {
      const duration = Date.now() - sessionStart

      setData((prev) => ({
        ...prev,
        timeSpent: [
          ...prev.timeSpent,
          {
            href: currentPath,
            startTime: sessionStart,
            duration: Math.floor(duration / 1000), // en secondes
          },
        ],
      }))
    }

    // Démarrer le tracking pour la nouvelle route
    setCurrentPath(pathname)
    setSessionStart(Date.now())

    // Mettre à jour lastVisit
    setData((prev) => ({
      ...prev,
      lastVisit: {
        ...prev.lastVisit,
        [pathname]: Date.now(),
      },
    }))
  }, [pathname])

  // Sauvegarder le temps lors de la fermeture
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPath && sessionStart) {
        const duration = Date.now() - sessionStart
        const current = loadAnalytics()

        saveAnalytics({
          ...current,
          timeSpent: [
            ...current.timeSpent,
            {
              href: currentPath,
              startTime: sessionStart,
              duration: Math.floor(duration / 1000),
            },
          ],
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentPath, sessionStart])

  /**
   * Tracker un clic sur un item de la sidebar
   */
  const trackClick = useCallback((href: string, label?: string) => {
    setData((prev) => ({
      ...prev,
      clicks: [
        ...prev.clicks,
        {
          href,
          timestamp: Date.now(),
          label,
        },
      ],
    }))
  }, [])

  /**
   * Obtenir les statistiques d'usage pour une route
   */
  const getStats = useCallback(
    (href: string): UsageStats => {
      const clicks = data.clicks.filter((c) => c.href === href).length
      const timeEntries = data.timeSpent.filter((t) => t.href === href)
      const totalTime = timeEntries.reduce((sum, t) => sum + t.duration, 0)
      const avgTimePerVisit = timeEntries.length > 0 ? totalTime / timeEntries.length : 0
      const lastVisitTimestamp = data.lastVisit[href]

      // Calculer la fréquence (clics par jour)
      const oldestClick = data.clicks
        .filter((c) => c.href === href)
        .sort((a, b) => a.timestamp - b.timestamp)[0]

      const daysSinceFirstClick = oldestClick
        ? Math.max(1, (Date.now() - oldestClick.timestamp) / (24 * 60 * 60 * 1000))
        : 1

      const frequency = clicks / daysSinceFirstClick

      return {
        href,
        label: data.clicks.find((c) => c.href === href)?.label || '',
        clicks,
        totalTime,
        avgTimePerVisit,
        lastVisit: lastVisitTimestamp ? new Date(lastVisitTimestamp) : null,
        frequency,
      }
    },
    [data]
  )

  /**
   * Obtenir les sections les plus utilisées
   */
  const getMostUsed = useCallback(
    (limit = 5): UsageStats[] => {
      // Récupérer toutes les routes uniques
      const allHrefs = new Set([
        ...data.clicks.map((c) => c.href),
        ...data.timeSpent.map((t) => t.href),
      ])

      // Calculer les stats pour chaque route
      const stats = Array.from(allHrefs).map((href) => getStats(href))

      // Trier par score combiné (clics * 0.6 + temps * 0.4)
      return stats
        .sort((a, b) => {
          const scoreA = a.clicks * 0.6 + (a.totalTime / 60) * 0.4
          const scoreB = b.clicks * 0.6 + (b.totalTime / 60) * 0.4
          return scoreB - scoreA
        })
        .slice(0, limit)
    },
    [data, getStats]
  )

  /**
   * Suggérer des favoris basés sur l'utilisation
   */
  const getSuggestedFavorites = useCallback(
    (currentFavorites: string[] = [], limit = 3): string[] => {
      const mostUsed = getMostUsed(10)

      // Filtrer ceux qui ne sont pas déjà favoris
      const suggestions = mostUsed
        .filter((stat) => !currentFavorites.includes(stat.href))
        .filter((stat) => stat.clicks >= 3) // Au moins 3 clics
        .filter((stat) => stat.frequency > 0.1) // Au moins 1 clic tous les 10 jours
        .slice(0, limit)
        .map((stat) => stat.href)

      return suggestions
    },
    [getMostUsed]
  )

  /**
   * Obtenir le temps total passé (en secondes)
   */
  const getTotalTimeSpent = useCallback((): number => {
    return data.timeSpent.reduce((sum, t) => sum + t.duration, 0)
  }, [data])

  /**
   * Obtenir le nombre total de clics
   */
  const getTotalClicks = useCallback((): number => {
    return data.clicks.length
  }, [data])

  /**
   * Réinitialiser toutes les analytics
   */
  const resetAnalytics = useCallback(() => {
    const emptyData: AnalyticsData = { clicks: [], timeSpent: [], lastVisit: {} }
    setData(emptyData)
    saveAnalytics(emptyData)
  }, [])

  /**
   * Exporter les données en JSON
   */
  const exportData = useCallback((): string => {
    return JSON.stringify(data, null, 2)
  }, [data])

  return {
    // Données brutes
    data,

    // Tracking
    trackClick,

    // Stats
    getStats,
    getMostUsed,
    getSuggestedFavorites,
    getTotalTimeSpent,
    getTotalClicks,

    // Utilitaires
    resetAnalytics,
    exportData,
  }
}
