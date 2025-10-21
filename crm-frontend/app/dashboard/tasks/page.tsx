'use client'

import { useState, useEffect } from 'react'
import { useTaskViews, useTasks } from '@/hooks/useTasks'
import TaskForm from '@/components/forms/TaskForm'
import { AdvancedFilters } from '@/components/shared'
import type { Task, TaskPriority } from '@/lib/types'

// ============= PRIORITY BADGE =============

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critique: 'bg-red-100 text-red-800',
  haute: 'bg-orange-100 text-orange-800',
  moyenne: 'bg-yellow-100 text-yellow-800',
  basse: 'bg-blue-100 text-blue-800',
  non_prioritaire: 'bg-gray-100 text-gray-600',
}

const PRIORITY_EMOJI: Record<TaskPriority, string> = {
  critique: '🔴',
  haute: '🟠',
  moyenne: '🟡',
  basse: '🔵',
  non_prioritaire: '⚪',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critique: 'Critique',
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
  non_prioritaire: 'Non prioritaire',
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
      <span>{PRIORITY_EMOJI[priority]}</span>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

// ============= TASK CARD =============

function TaskCard({ task, onQuickAction }: { task: Task; onQuickAction: (id: number, action: string) => void }) {
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <PriorityBadge priority={task.priority} />

            {task.days_until_due < 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-md">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Retard: {Math.abs(task.days_until_due)}j
              </span>
            )}
            {task.days_until_due === 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-orange-700 font-semibold bg-orange-100 px-2 py-1 rounded-md">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Aujourd'hui
              </span>
            )}
            {task.days_until_due > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Dans {task.days_until_due}j
              </span>
            )}
          </div>

          {task.linked_entity_display && (
            <div className="flex items-center gap-1.5 mt-2">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-xs text-gray-600">{task.linked_entity_display}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onQuickAction(task.id, 'mark_done')}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 shadow-sm hover:shadow flex items-center gap-1"
            title="Marquer terminée"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Fait
          </button>
          <button
            onClick={() => onQuickAction(task.id, 'snooze_1d')}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
            title="Reporter d'1 jour"
          >
            +1 jour
          </button>
          <button
            onClick={() => onQuickAction(task.id, 'snooze_1w')}
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

// ============= TASK SECTION =============

function TaskSection({
  title,
  count,
  emoji,
  tasks,
  bgColor,
  onQuickAction,
}: {
  title: string
  count: number
  emoji: string
  tasks: Task[]
  bgColor: string
  onQuickAction: (id: number, action: string) => void
}) {
  return (
    <div className={`${bgColor} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{emoji}</span>
          {title}
          <span className="text-lg font-normal text-gray-600">({count})</span>
        </h2>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Aucune tâche</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onQuickAction={onQuickAction} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============= MAIN PAGE =============

export default function TaskdeskPage() {
  const { overdue, today, next7, overdueCount, todayCount, next7Count, stats } = useTaskViews()
  const { quickAction } = useTasks()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filtersState, setFiltersState] = useState({
    priority: '',
    category: '',
    status: '',
  })

  const handleFilterChange = (key: string, value: unknown) => {
    if (Array.isArray(value)) return
    setFiltersState((prev) => ({
      ...prev,
      [key]: value as string,
    }))
  }

  const resetFilters = () =>
    setFiltersState({
      priority: '',
      category: '',
      status: '',
    })

  const advancedFilterDefinitions = [
    {
      key: 'priority',
      label: 'Priorité',
      type: 'select' as const,
      options: [
        { value: '', label: 'Toutes les priorités' },
        { value: 'critique', label: '🔴 Critique' },
        { value: 'haute', label: '🟠 Haute' },
        { value: 'moyenne', label: '🟡 Moyenne' },
        { value: 'basse', label: '🔵 Basse' },
        { value: 'non_prioritaire', label: '⚪ Non prioritaire' },
      ],
    },
    {
      key: 'category',
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: '', label: 'Toutes les catégories' },
        { value: 'follow_up', label: 'Suivi' },
        { value: 'meeting', label: 'Réunion' },
        { value: 'call', label: 'Appel' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Autre' },
      ],
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tous les statuts' },
        { value: 'todo', label: 'À faire' },
        { value: 'doing', label: 'En cours' },
        { value: 'done', label: 'Terminé' },
      ],
    },
  ]

  // Filtrer les tâches
  const filterTasks = (tasks: Task[]) => {
    return tasks.filter((task) => {
      const matchesPriority = filtersState.priority
        ? task.priority === filtersState.priority
        : true
      const matchesCategory = filtersState.category
        ? task.category === filtersState.category
        : true
      const matchesStatus = filtersState.status
        ? task.status === filtersState.status
        : true
      return matchesPriority && matchesCategory && matchesStatus
    })
  }

  const filteredOverdue = filterTasks(overdue)
  const filteredToday = filterTasks(today)
  const filteredNext7 = filterTasks(next7)

  // Raccourci clavier : K pour ouvrir le formulaire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K ou Ctrl+K pour ouvrir le formulaire
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsFormOpen(true)
      }
      // Esc pour fermer
      if (e.key === 'Escape' && isFormOpen) {
        setIsFormOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  const handleQuickAction = async (id: number, action: string) => {
    try {
      await quickAction(id, action as any)
    } catch (error) {
      console.error('Quick action failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Taskdesk</h1>
                  <p className="text-sm text-gray-600 mt-0.5">Gérez vos tâches et priorités efficacement</p>
                </div>
              </div>
            </div>

            <a
              href="/dashboard/tasks/kanban"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Vue Kanban
            </a>
          </div>

          {/* Filters */}
          <div className="mt-6">
            <AdvancedFilters
              filters={advancedFilterDefinitions}
              values={filtersState}
              onChange={handleFilterChange}
              onReset={resetFilters}
            />
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6">
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-red-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Retard</p>
                    <p className="text-lg font-bold text-red-600">{overdueCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-orange-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Aujourd'hui</p>
                    <p className="text-lg font-bold text-orange-600">{todayCount}</p>
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
                    <p className="text-lg font-bold text-gray-900">{stats.by_status.todo || 0}</p>
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
                    <p className="text-lg font-bold text-blue-600">{stats.by_status.doing || 0}</p>
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
                    <p className="text-lg font-bold text-green-600">{stats.by_status.done || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-5 lg:space-y-6">
          {/* EN RETARD */}
          <TaskSection
            title="EN RETARD"
            count={filteredOverdue.length}
            emoji="🔴"
            tasks={filteredOverdue}
            bgColor="bg-white/80 backdrop-blur-sm border-2 border-red-200 shadow-lg"
            onQuickAction={handleQuickAction}
          />

          {/* AUJOURD'HUI */}
          <TaskSection
            title="AUJOURD'HUI"
            count={filteredToday.length}
            emoji="⚡"
            tasks={filteredToday}
            bgColor="bg-white/80 backdrop-blur-sm border-2 border-orange-200 shadow-lg"
            onQuickAction={handleQuickAction}
          />

          {/* PROCHAINS 7 JOURS */}
          <TaskSection
            title="PROCHAINS 7 JOURS"
            count={filteredNext7.length}
            emoji="📅"
            tasks={filteredNext7}
            bgColor="bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-lg"
            onQuickAction={handleQuickAction}
          />
        </div>

        {/* Quick Add Button */}
        <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex flex-col gap-3 items-end z-50">
          <div className="hidden sm:flex bg-white/95 backdrop-blur-sm rounded-xl shadow-xl px-4 py-2.5 text-sm text-gray-700 border border-gray-200 animate-bounce">
            <kbd className="px-2 py-1 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md text-xs font-mono font-semibold border border-gray-300 shadow-sm">⌘K</kbd>
            <span className="ml-2">pour ajouter</span>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 sm:p-5 shadow-2xl transition-all hover:scale-110 active:scale-95 group relative"
            title="Nouvelle tâche (⌘K)"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <svg className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Task Form Modal */}
        <TaskForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      </div>
    </div>
  )
}
