'use client'

import React from 'react'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Alert } from '@/components/shared/Alert'
import { useActivityWidget } from '@/hooks/useOrganisationActivity'
import type { OrganisationActivityType } from '@/lib/types'
import {
  getActivityVisual,
  defaultVisual,
  formatRelativeTime,
  getOrganisationName,
  getChangeSummary,
} from './activityUtils'

interface ActivityWidgetProps {
  title?: string
  organisationIds?: number[]
  types?: OrganisationActivityType[]
  limit?: number
  emptyMessage?: string
}


export const ActivityWidget: React.FC<ActivityWidgetProps> = ({
  title = 'Activités récentes',
  organisationIds,
  types,
  limit = 30,
  emptyMessage = 'Aucune activité récente.',
}) => {
  const { data, isLoading, isError, error } = useActivityWidget({
    organisationIds,
    types,
    limit,
  })

  const activities = data?.items ?? []

  return (
    <Card className="h-full">
      <CardHeader
        title={title}
        subtitle="Dernières actions sur vos comptes"
        className="pb-spacing-sm"
      />
      <CardBody className="space-y-spacing-md">
        {isError && (
          <Alert type="error" message={error?.detail || 'Impossible de charger les activités.'} />
        )}

        {isLoading && !isError && (
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

        {!isLoading && !isError && activities.length === 0 && (
          <div className="py-6 text-center text-sm text-text-secondary">
            {emptyMessage}
          </div>
        )}

        {!isLoading && !isError && activities.length > 0 && (
          <div className="space-y-spacing-md">
            {activities.map((activity) => {
              const config = getActivityVisual(activity.type) ?? defaultVisual
              const Icon = config.icon
              const organisationName = getOrganisationName(activity)
              const actorName = activity.actor_name
              const changeSummary = getChangeSummary(activity)

              return (
                <div key={activity.id} className="flex gap-3">
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
                        {formatRelativeTime(activity.occurred_at)}
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
      </CardBody>
    </Card>
  )
}

export default ActivityWidget
