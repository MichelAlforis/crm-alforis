'use client'

import { useState } from 'react'
import { useInbox, useUpdateInteractionStatus, useUpdateInteractionAssignee, useUpdateInteractionNextAction } from '@/hooks/useInteractions'
import { AdvancedFilters } from '@/components/shared'
import { useFilters } from '@/hooks/useFilters'
import type { Interaction, InteractionStatus } from '@/types/interaction'
import {
  INTERACTION_STATUS_LABELS,
  INTERACTION_STATUS_COLORS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_ICONS,
} from '@/types/interaction'
import { addDays, format } from 'date-fns'

// ============= STATUS BADGE =============

function StatusBadge({ status }: { status: InteractionStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${INTERACTION_STATUS_COLORS[status]}`}>
      {INTERACTION_STATUS_LABELS[status]}
    </span>
  )
}

// ============= INTERACTION CARD =============

function InteractionCard({
  interaction,
  onQuickAction,
}: {
  interaction: Interaction
  onQuickAction: (id: number, action: string, value?: any) => void
}) {
  const typeIcon = INTERACTION_TYPE_ICONS[interaction.type] || '📄'
  const typeLabel = INTERACTION_TYPE_LABELS[interaction.type] || interaction.type

  // Calculate time until next action
  const getNextActionLabel = () => {
    if (!interaction.next_action_at) return null

    const nextDate = new Date(interaction.next_action_at)
    const now = new Date()
    const diffMs = nextDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        label: `Retard: ${Math.abs(diffDays)}j`,
        color: 'text-red-600 bg-red-50',
      }
    } else if (diffDays === 0) {
      return {
        label: "Aujourd'hui",
        color: 'text-orange-700 bg-orange-100',
      }
    } else if (diffDays <= 7) {
      return {
        label: `Dans ${diffDays}j`,
        color: 'text-blue-600 bg-blue-50',
      }
    } else {
      return {
        label: format(nextDate, 'dd/MM/yyyy'),
        color: 'text-gray-600 bg-gray-50',
      }
    }
  }

  const nextActionLabel = getNextActionLabel()

  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title & Type */}
          <div className="flex items-start gap-2 mb-1.5">
            <span className="text-lg flex-shrink-0">{typeIcon}</span>
            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors flex-1">
              {interaction.title}
            </h3>
          </div>

          {/* Body preview */}
          {interaction.body && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed ml-7">
              {interaction.body}
            </p>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 ml-7">
            <StatusBadge status={interaction.status} />

            {/* Type badge */}
            <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
              {typeLabel}
            </span>

            {/* Next action date */}
            {nextActionLabel && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${nextActionLabel.color}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {nextActionLabel.label}
              </span>
            )}

            {/* Assignee */}
            {interaction.assignee_id && (
              <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                ID: {interaction.assignee_id}
              </span>
            )}
          </div>

          {/* Entity link */}
          {(interaction.org_id || interaction.person_id) && (
            <div className="flex items-center gap-1.5 mt-2 ml-7">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-xs text-gray-600">
                {interaction.org_id ? `Org #${interaction.org_id}` : `Person #${interaction.person_id}`}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onQuickAction(interaction.id, 'mark_done')}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 shadow-sm hover:shadow flex items-center gap-1"
            title="Marquer terminé"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Terminé
          </button>
          <button
            onClick={() => onQuickAction(interaction.id, 'reschedule_1d')}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
            title="Reporter d'1 jour"
          >
            +1 jour
          </button>
          <button
            onClick={() => onQuickAction(interaction.id, 'reschedule_3d')}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
            title="Reporter de 3 jours"
          >
            +3 jours
          </button>
          <button
            onClick={() => onQuickAction(interaction.id, 'reschedule_1w')}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
            title="Reporter d'1 semaine"
          >
            +1 sem
          </button>
        </div>
      </div>
    </div>
  )
}

// ============= MAIN PAGE =============

interface InboxFilterValues {
  assignee: string
  status: string
  due: string
}

export default function InboxPage() {
  const filters = useFilters<InboxFilterValues>({
    initialValues: {
      assignee: '',
      status: '',
      due: 'all',
    },
  })

  const { data, isLoading } = useInbox({
    assignee: filters.values.assignee || undefined,
    status: filters.values.status || undefined,
    due: filters.values.due,
    limit: 100,
  })

  const updateStatus = useUpdateInteractionStatus()
  const updateAssignee = useUpdateInteractionAssignee()
  const updateNextAction = useUpdateInteractionNextAction()

  const advancedFilterDefinitions = [
    {
      key: 'assignee',
      label: 'Assigné à',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous' },
        { value: 'me', label: 'Moi' },
        { value: 'unassigned', label: 'Non assigné' },
      ],
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: '', label: 'Non terminé' },
        { value: 'todo', label: 'À faire' },
        { value: 'in_progress', label: 'En cours' },
        { value: 'done', label: 'Terminé' },
      ],
    },
    {
      key: 'due',
      label: 'Échéance',
      type: 'select' as const,
      options: [
        { value: 'overdue', label: 'En retard' },
        { value: 'today', label: "Aujourd'hui" },
        { value: 'week', label: 'Cette semaine' },
        { value: 'all', label: 'Toutes' },
      ],
    },
  ]

  const handleQuickAction = async (id: number, action: string, value?: any) => {
    try {
      switch (action) {
        case 'mark_done':
          await updateStatus.mutateAsync({ id, status: 'done' })
          break
        case 'reschedule_1d': {
          const newDate = addDays(new Date(), 1).toISOString()
          await updateNextAction.mutateAsync({ id, next_action_at: newDate })
          break
        }
        case 'reschedule_3d': {
          const newDate = addDays(new Date(), 3).toISOString()
          await updateNextAction.mutateAsync({ id, next_action_at: newDate })
          break
        }
        case 'reschedule_1w': {
          const newDate = addDays(new Date(), 7).toISOString()
          await updateNextAction.mutateAsync({ id, next_action_at: newDate })
          break
        }
        default:
          console.warn('Unknown action:', action)
      }
    } catch (error) {
      console.error('Quick action failed:', error)
    }
  }

  const interactions = data?.items || []
  const total = data?.total || 0

  // Group by status for stats
  const stats = {
    todo: interactions.filter((i) => i.status === 'todo').length,
    in_progress: interactions.filter((i) => i.status === 'in_progress').length,
    done: interactions.filter((i) => i.status === 'done').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inbox</h1>
                  <p className="text-sm text-gray-600 mt-0.5">Actions à traiter et suivis en cours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6">
            <AdvancedFilters
              filters={advancedFilterDefinitions}
              values={filters.values}
              onChange={filters.handleChange}
              onReset={filters.reset}
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">À faire</p>
                  <p className="text-lg font-bold text-gray-900">{stats.todo}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">En cours</p>
                  <p className="text-lg font-bold text-blue-600">{stats.in_progress}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Terminées</p>
                  <p className="text-lg font-bold text-green-600">{stats.done}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-sm text-gray-600">Chargement...</p>
            </div>
          ) : interactions.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Aucune interaction à traiter</p>
              <p className="text-gray-400 text-xs mt-1">Changez les filtres ou créez une nouvelle interaction</p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                onQuickAction={handleQuickAction}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
