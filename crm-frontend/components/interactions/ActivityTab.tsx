/**
 * ActivityTab - Onglet Activité dans les fiches Organisation/Personne
 *
 * Affiche:
 * - Composer inline (si canCreate)
 * - Timeline des interactions (groupées par jour)
 * - Infinite scroll ✅
 */

'use client'

import React, { useMemo } from 'react'
import {
  useOrgInteractionsInfinite,
  usePersonInteractionsInfinite,
  useDeleteInteraction,
} from '@/hooks/useInteractions'
import InteractionCard from './InteractionCard'
import InteractionComposerInline from './InteractionComposerInline'
import { Loader2 } from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useInView } from 'react-intersection-observer'

export interface ActivityTabProps {
  orgId?: number
  personId?: number
  canCreate?: boolean
}

export function ActivityTab({ orgId, personId, canCreate = true }: ActivityTabProps) {
  // Hooks infinite scroll
  const orgQuery = useOrgInteractionsInfinite(orgId || 0, 20)
  const personQuery = usePersonInteractionsInfinite(personId || 0, 20)

  const activeQuery = orgId ? orgQuery : personQuery
  const deleteMutation = useDeleteInteraction()

  // Intersection observer pour charger plus
  const { ref, inView } = useInView({
    threshold: 0,
  })

  // Auto-charger quand visible
  React.useEffect(() => {
    if (inView && activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage()
    }
  }, [inView, activeQuery])

  // Flatten all pages into single array
  const allInteractions = useMemo(() => {
    if (!activeQuery.data?.pages) return []
    return activeQuery.data.pages.flatMap((page) => page.items || [])
  }, [activeQuery.data])

  // Grouper par jour
  const groupedByDay = useMemo(() => {
    if (!allInteractions.length) return []

    const groups = new Map<string, typeof allInteractions>()

    allInteractions.forEach((interaction) => {
      const date = parseISO(interaction.created_at)
      let dayLabel: string

      if (isToday(date)) {
        dayLabel = "Aujourd'hui"
      } else if (isYesterday(date)) {
        dayLabel = 'Hier'
      } else {
        dayLabel = format(date, 'EEEE d MMMM yyyy', { locale: fr })
      }

      if (!groups.has(dayLabel)) {
        groups.set(dayLabel, [])
      }
      groups.get(dayLabel)!.push(interaction)
    })

    return Array.from(groups.entries())
  }, [allInteractions])

  if (activeQuery?.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    )
  }

  if (activeQuery?.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          Erreur lors du chargement des interactions
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Composer inline */}
      {canCreate && (
        <InteractionComposerInline
          defaultOrgId={orgId}
          defaultPersonId={personId}
          onCreated={() => activeQuery?.refetch()}
        />
      )}

      {/* Timeline groupée par jour */}
      {groupedByDay.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Aucune interaction pour le moment
          </p>
          {canCreate && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Utilisez le formulaire ci-dessus pour créer votre première interaction
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDay.map(([dayLabel, interactions]) => (
            <div key={dayLabel}>
              {/* Séparateur jour */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {dayLabel}
                </div>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Liste des interactions du jour */}
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <InteractionCard
                    key={interaction.id}
                    interaction={interaction}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    showOrganisation={false}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Infinite scroll trigger + loading indicator */}
          <div ref={ref} className="flex justify-center py-8">
            {activeQuery.isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : activeQuery.hasNextPage ? (
              <div className="text-sm text-gray-400 dark:text-gray-500">
                Scroll pour charger plus
              </div>
            ) : allInteractions.length > 0 ? (
              <div className="text-sm text-gray-400 dark:text-gray-500">
                Fin de la timeline
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
