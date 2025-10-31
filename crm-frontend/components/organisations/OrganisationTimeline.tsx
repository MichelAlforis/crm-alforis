'use client'

import React from 'react'

import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import {
  useOrganisationActivity,
  flattenActivities,
} from '@/hooks/useOrganisationActivity'
import type { OrganisationActivityType } from '@/lib/types'
import {
  getActivityVisual,
  defaultVisual,
  formatRelativeTime,
  getOrganisationName,
  getChangeSummary,
} from '@/components/dashboard/widgets/activityUtils'

interface OrganisationTimelineProps {
  organisationId: number
  types?: OrganisationActivityType[]
  limit?: number
}

const ACTIVITY_FILTERS = [
  { value: '', label: 'Tous les événements' },
  { value: 'interaction', label: 'Interactions' },
  { value: 'task', label: 'Tâches' },
  { value: 'mandat', label: 'Mandats' },
  { value: 'email', label: 'Emails' },
  { value: 'document', label: 'Documents' },
] as const

export const OrganisationTimeline: React.FC<OrganisationTimelineProps> = ({
  organisationId,
  types: propTypes,
  limit = 20,
}) => {
  const [selectedFilter, setSelectedFilter] = React.useState('')

  // Construire les types basés sur le filtre sélectionné
  const types = React.useMemo(() => {
    if (propTypes) return propTypes
    if (!selectedFilter) return undefined

    const filterMap: Record<string, OrganisationActivityType[]> = {
      interaction: ['interaction_created', 'interaction_updated'],
      task: ['task_created', 'task_completed', 'task_updated'],
      mandat: ['mandat_created', 'mandat_status_changed', 'mandat_updated'],
      email: ['email_sent'],
      document: ['document_added'],
    }

    return filterMap[selectedFilter]
  }, [selectedFilter, propTypes])

  const activityQuery = useOrganisationActivity(organisationId, { limit, types })
  const activities = flattenActivities(activityQuery.data?.pages ?? [])

  const isEmpty = !activityQuery.isLoading && !activities.length
  const loadMoreDisabled = !activityQuery.hasNextPage || activityQuery.isFetchingNextPage

  return (
    <Card className="h-full">
      <CardHeader
        title="Événements"
        subtitle="Historique complet de tous les changements et activités"
        className="pb-spacing-sm"
      >
        {!propTypes && (
          <div className="mt-3">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-bleu focus:border-transparent"
            >
              {ACTIVITY_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>
      <CardBody className="space-y-spacing-md">
        {activityQuery.isError && (
          <Alert
            type="error"
            message={activityQuery.error?.detail || 'Impossible de charger la timeline.'}
          />
        )}

        {activityQuery.isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="py-6 text-center text-sm text-text-secondary">
            Aucun événement enregistré pour l'instant.
          </div>
        )}

        {!activityQuery.isLoading && activities.length > 0 && (
          <div className="space-y-spacing-md">
            {activities.map((activity) => {
              const config = getActivityVisual(activity.type) ?? defaultVisual
              const Icon = config.icon
              const organisationName = getOrganisationName(activity)
              const actorName = activity.actor_name
              const changeSummary = getChangeSummary(activity)

              return (
                <div key={`${activity.id}`} className="flex gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${config.text}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {activity.title}
                        </p>
                        {activity.preview && (
                          <p className="text-xs text-text-secondary">{activity.preview}</p>
                        )}
                      </div>
                      <span className="text-xs text-text-tertiary">
                        {activity.occurred_at ? formatRelativeTime(activity.occurred_at) : 'Date inconnue'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-text-secondary">
                        {config.label}
                      </span>
                      {organisationName && (
                        <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-text-secondary">
                          {organisationName}
                        </span>
                      )}
                      {actorName && (
                        <span className="text-text-tertiary">par {actorName}</span>
                      )}
                    </div>

                    {changeSummary.items.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                        {changeSummary.items.map((item) => (
                          <li key={`${activity.id}-${item.label}`}>
                            <span className="font-medium text-text-primary">{item.label}</span>{' '}
                            → {item.value}
                          </li>
                        ))}
                        {changeSummary.remaining > 0 && (
                          <li className="text-text-tertiary">
                            + {changeSummary.remaining} autres modifications
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            )}
          </div>
        )}

        {activityQuery.hasNextPage && (
          <div className="pt-spacing-sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => activityQuery.fetchNextPage()}
              disabled={loadMoreDisabled}
            >
              {activityQuery.isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default OrganisationTimeline
