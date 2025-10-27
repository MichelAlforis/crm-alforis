'use client'

import React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card } from '@/components/shared'
import { useInbox } from '@/hooks/useInteractions'
import {
  INTERACTION_TYPE_ICONS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_STATUS_COLORS,
  INTERACTION_STATUS_LABELS,
} from '@/types/interaction'
import type { Interaction } from '@/types/interaction'

interface InboxWidgetProps {
  limit?: number
}

export function InboxWidget({ limit = 5 }: InboxWidgetProps) {
  // Fetch inbox items: non-done, ordered by next_action_at
  const { data, isLoading, error } = useInbox({
    status: '', // Empty = non-done by default
    due: 'all',
    limit,
  })

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">À traiter</h2>
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
          <h2 className="text-xl font-semibold">À traiter</h2>
        </div>
        <div className="text-sm text-red-600">
          Erreur lors du chargement de l'inbox
        </div>
      </Card>
    )
  }

  const interactions = data?.items ?? []

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          À traiter
        </h2>
        {interactions.length > 0 && (
          <Link
            href="/dashboard/inbox"
            className="text-sm text-bleu hover:underline"
          >
            Voir tout
          </Link>
        )}
      </div>

      {interactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm">Aucune action en attente</p>
          <p className="text-xs mt-1 text-gray-400">
            Vous êtes à jour !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <InboxRow key={interaction.id} interaction={interaction} />
          ))}
        </div>
      )}
    </Card>
  )
}

function InboxRow({ interaction }: { interaction: Interaction }) {
  const typeIcon = INTERACTION_TYPE_ICONS[interaction.type] || '📄'
  const typeLabel = INTERACTION_TYPE_LABELS[interaction.type] || interaction.type

  // Calculate urgency
  const getUrgencyInfo = () => {
    if (!interaction.next_action_at) {
      return null
    }

    const nextDate = new Date(interaction.next_action_at)
    const now = new Date()
    const diffMs = nextDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        label: `Retard: ${Math.abs(diffDays)}j`,
        color: 'text-red-600',
      }
    } else if (diffDays === 0) {
      return {
        label: "Aujourd'hui",
        color: 'text-orange-600',
      }
    } else if (diffDays <= 3) {
      return {
        label: `Dans ${diffDays}j`,
        color: 'text-blue-600',
      }
    }
    return null
  }

  const urgencyInfo = getUrgencyInfo()

  return (
    <Link
      href={`/dashboard/inbox?interaction_id=${interaction.id}`}
      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-lg">{typeIcon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {interaction.title}
          </p>
          {urgencyInfo && (
            <span className={`text-xs font-semibold flex-shrink-0 ${urgencyInfo.color}`}>
              {urgencyInfo.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${INTERACTION_STATUS_COLORS[interaction.status]}`}>
            {INTERACTION_STATUS_LABELS[interaction.status]}
          </span>
          <span className="text-xs text-gray-500">{typeLabel}</span>
          {interaction.next_action_at && (
            <span className="text-xs text-gray-400">
              {format(parseISO(interaction.next_action_at), 'dd MMM', { locale: fr })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
