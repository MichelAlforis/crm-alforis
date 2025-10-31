/**
 * useActivities — Hook pour gérer les activités (interactions) globales
 *
 * Ce hook permet de récupérer et gérer toutes les activités (emails, appels,
 * réunions, notes) depuis l'API des organisations.
 *
 * @example
 * const { activities, isLoading, createActivity, deleteActivity } = useActivities({
 *   type: 'email',
 *   organisationId: 42
 * })
 */

import { useCallback, useMemo, useState } from 'react'
import { api } from '@/lib/axios'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { logger } from '@/lib/logger'

// Types d'activités (backend enum)
export type ActivityType =
  | 'note'
  | 'appel'
  | 'email'
  | 'reunion'
  | 'tache_completee'
  | 'changement_stage'
  | 'organisation_created'
  | 'organisation_updated'
  | 'mandat_created'
  | 'mandat_signed'
  | 'autre'

export interface Activity {
  id: number
  organisation_id: number
  type: ActivityType
  title: string | null
  description: string | null
  metadata: Record<string, unknown> | null
  created_by: number | null
  occurred_at: string
  created_at: string
  updated_at: string

  // Données enrichies (si disponibles)
  organisation?: {
    id: number
    nom: string
  }
}

export interface ActivityCreateInput {
  organisation_id: number
  type: ActivityType
  title: string
  description?: string
  metadata?: Record<string, unknown>
  occurred_at?: string
}

interface UseActivitiesOptions {
  organisationId?: number
  type?: ActivityType
  limit?: number
  autoFetch?: boolean
}

interface UseActivitiesReturn {
  activities: Activity[]
  isLoading: boolean
  error: unknown
  mutate: () => void
  createActivity: (data: ActivityCreateInput) => Promise<Activity | null>
  deleteActivity: (organisationId: number, activityId: number) => Promise<boolean>
  stats: {
    total: number
    byType: Record<ActivityType, number>
  }
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { organisationId, type, limit = 100, autoFetch = true } = options
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Construire l'URL pour fetcher les activités
  // Note: Backend n'a pas d'endpoint global /activities, on doit passer par /organisations/{id}/activity
  // Pour l'instant, on va créer un endpoint spécial ou récupérer depuis toutes les orgs
  const url = useMemo(() => {
    if (!autoFetch) return null

    if (organisationId) {
      // Activités d'une seule organisation
      const params = new URLSearchParams()
      if (type) params.append('type', type)
      if (limit) params.append('limit', limit.toString())
      return `/api/v1/organisations/${organisationId}/activity?${params}`
    }

    // TODO: Endpoint global pour toutes les activités (à créer backend)
    // Pour l'instant, retourner null et on fetche à la main
    return null
  }, [organisationId, type, limit, autoFetch])

  const { data, error, mutate, isLoading } = useSWR<Activity[]>(
    url,
    async (url) => {
      const response = await api.get(url)
      return response.data.items || response.data || []
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const activities = useMemo(() => data || [], [data])

  // Statistiques
  const stats = useMemo(() => {
    const byType: Record<string, number> = {}
    activities.forEach(activity => {
      byType[activity.type] = (byType[activity.type] || 0) + 1
    })

    return {
      total: activities.length,
      byType: byType as Record<ActivityType, number>,
    }
  }, [activities])

  // Créer une activité
  const createActivity = useCallback(async (input: ActivityCreateInput): Promise<Activity | null> => {
    setIsCreating(true)
    try {
      // Endpoint simplifié /interactions (existe dans backend mais non enregistré)
      // Alternative: POST /organisations/{id}/activity (à vérifier si existe)
      const response = await api.post(`/api/v1/organisations/${input.organisation_id}/activity`, {
        type: input.type,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        occurred_at: input.occurred_at,
      })

      const newActivity = response.data
      toast.success('Activité créée avec succès')

      // Rafraîchir la liste
      mutate()

      return newActivity
    } catch (err: unknown) {
      logger.error('Erreur création activité:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
        toast.error(typeof detail === 'string' ? detail : 'Erreur lors de la création')
      } else {
        toast.error('Erreur lors de la création')
      }
      return null
    } finally {
      setIsCreating(false)
    }
  }, [mutate])

  // Supprimer une activité
  const deleteActivity = useCallback(async (orgId: number, activityId: number): Promise<boolean> => {
    setIsDeleting(true)
    try {
      await api.delete(`/api/v1/organisations/${orgId}/activity/${activityId}`)
      toast.success('Activité supprimée')

      // Rafraîchir la liste
      mutate()

      return true
    } catch (err: unknown) {
      logger.error('Erreur suppression activité:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
        toast.error(typeof detail === 'string' ? detail : 'Erreur lors de la suppression')
      } else {
        toast.error('Erreur lors de la suppression')
      }
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [mutate])

  return {
    activities,
    isLoading: isLoading || isCreating || isDeleting,
    error,
    mutate,
    createActivity,
    deleteActivity,
    stats,
  }
}
