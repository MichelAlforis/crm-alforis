// components/activities/RecentActivities.tsx
// Widget "5 dernières interactions" pour afficher sur page personne/organisation

'use client'

import React, { useState, useEffect } from 'react'
import { storage, AUTH_STORAGE_KEYS } from "@/lib/constants"
import Link from 'next/link'
import { Clock, Phone, Mail, Users, Coffee, FileText, ChevronRight, Filter } from 'lucide-react'
import type { ActivityWithParticipants } from '@/types/activity'

interface RecentActivitiesProps {
  organisationId?: number
  personId?: number
  limit?: number
  showFilters?: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const activityIcons = {
  appel: Phone,
  email: Mail,
  reunion: Users,
  dejeuner: Coffee,
  note: FileText,
  autre: FileText,
}

const activityColors = {
  appel: 'text-blue-600 bg-blue-50',
  email: 'text-purple-600 bg-purple-50',
  reunion: 'text-green-600 bg-green-50',
  dejeuner: 'text-orange-600 bg-orange-50',
  note: 'text-gray-600 bg-gray-50',
  autre: 'text-gray-600 bg-gray-50',
}

export default function RecentActivities({
  organisationId,
  personId,
  limit = 5,
  showFilters = true,
}: RecentActivitiesProps) {
  const [activities, setActivities] = useState<ActivityWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const fetchActivities = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = storage.get(AUTH_STORAGE_KEYS.TOKEN)

      let url = ''
      if (organisationId) {
        url = `${API_BASE}/api/v1/organisations/${organisationId}/activities/recent?limit=${limit}`
      } else if (personId) {
        url = `${API_BASE}/api/v1/people/${personId}/activities/recent?limit=${limit}`
      } else {
        throw new Error('organisationId or personId required')
      }

      // Ajouter les filtres de types
      if (selectedTypes.length > 0) {
        url += `&activity_types=${selectedTypes.join(',')}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }

      const data = await response.json()

      // Si c'est une personne, les données sont des participations
      if (personId) {
        // Extraire les activités des participations
        // On devra enrichir l'endpoint pour retourner les activités complètes
        setActivities([])
      } else {
        setActivities(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [organisationId, personId, limit, selectedTypes])

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dernières interactions</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dernières interactions</h3>
        <div className="text-red-600 text-sm">Erreur: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Dernières interactions</h3>
          <Link
            href={`/dashboard/interactions?${organisationId ? `org=${organisationId}` : `person=${personId}`}`}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Voir tout
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Filtres par type */}
        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            {['appel', 'email', 'reunion', 'dejeuner'].map((type) => {
              const Icon = activityIcons[type as keyof typeof activityIcons]
              const isActive = selectedTypes.includes(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Liste des activités */}
      <div className="divide-y divide-gray-100">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">Aucune interaction récente</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons] || FileText
            const colorClass = activityColors[activity.type as keyof typeof activityColors] || activityColors.autre

            return (
              <Link
                key={activity.id}
                href={`/dashboard/interactions/${activity.id}`}
                className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 group"
              >
                {/* Icône */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                    {activity.title}
                  </h4>

                  {/* Participants */}
                  {activity.participants && activity.participants.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Avec {activity.participants.map((p) => p.display_name).join(', ')}
                    </p>
                  )}

                  {/* Métadonnées */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(activity.occurred_at)}
                    </span>
                    {activity.attachments_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {activity.attachments_count} pièce{activity.attachments_count > 1 ? 's' : ''} jointe{activity.attachments_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
