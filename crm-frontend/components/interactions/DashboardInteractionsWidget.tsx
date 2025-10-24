'use client'

import React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card } from '@/components/shared'
import { useRecentInteractions } from '@/hooks/useInteractions'
import { INTERACTION_TYPE_ICONS, INTERACTION_TYPE_LABELS } from '@/types/interaction'
import type { Interaction } from '@/types/interaction'

interface DashboardInteractionsWidgetProps {
  limit?: number
}

export function DashboardInteractionsWidget({ limit = 5 }: DashboardInteractionsWidgetProps) {
  const { data, isLoading, error } = useRecentInteractions(limit)

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Activités récentes</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Activités récentes</h2>
        </div>
        <div className="text-sm text-red-600">
          Erreur lors du chargement des interactions
        </div>
      </Card>
    )
  }

  const interactions = data?.items ?? []

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Activités récentes</h2>
        {interactions.length > 0 && (
          <Link
            href="/dashboard/organisations"
            className="text-sm text-bleu hover:underline"
          >
            Voir tout
          </Link>
        )}
      </div>

      {interactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aucune interaction enregistrée</p>
          <p className="text-xs mt-1">
            Les interactions apparaîtront dans les fiches Organisation et Personne
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <InteractionRow key={interaction.id} interaction={interaction} />
          ))}
        </div>
      )}
    </Card>
  )
}

function InteractionRow({ interaction }: { interaction: Interaction }) {
  const Icon = INTERACTION_TYPE_ICONS[interaction.type]
  const typeLabel = INTERACTION_TYPE_LABELS[interaction.type]

  // Determine entity link
  const entityLink = interaction.org_id
    ? `/dashboard/organisations/${interaction.org_id}`
    : interaction.person_id
      ? `/dashboard/people/${interaction.person_id}`
      : null

  const participantCount = (interaction.participants?.length ?? 0) +
                          (interaction.external_participants?.length ?? 0)

  return (
    <div className="flex gap-3 items-start hover:bg-gray-50 p-2 rounded-lg transition-colors">
      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-bleu" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {interaction.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{typeLabel}</span>
              {participantCount > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">
                    {participantCount} participant{participantCount > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <span className="text-xs text-gray-400 flex-shrink-0">
            {format(parseISO(interaction.created_at), 'd MMM', { locale: fr })}
          </span>
        </div>

        {interaction.body && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
            {interaction.body}
          </p>
        )}

        {entityLink && (
          <Link
            href={entityLink}
            className="text-xs text-bleu hover:underline mt-1 inline-block"
          >
            Voir la fiche →
          </Link>
        )}
      </div>
    </div>
  )
}

export default DashboardInteractionsWidget
