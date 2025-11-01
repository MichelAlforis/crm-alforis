'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useTaskViews, useTasks } from '@/hooks/useTasks'
import { useFilters } from '@/hooks/useFilters'
import { AdvancedFilters, PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'
import type { Task } from '@/lib/types'

// Lazy load TaskForm (only loads when modal opens)
const TaskForm = lazy(() => import('@/components/forms/TaskForm'))

// Composants extraits
import { TaskSection } from '@/components/tasks/TaskSection'


// ============= MAIN PAGE =============

interface TaskFilters {
  priority: string
  category: string
  status: string
}

export default function TaskdeskPage() {
  const { overdue, today, next7, overdueCount, todayCount, stats } = useTaskViews()
  const { quickAction } = useTasks()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const filters = useFilters<TaskFilters>({
    initialValues: {
      priority: '',
      category: '',
      status: '',
    },
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
      const matchesPriority = filters.values.priority
        ? task.priority === filters.values.priority
        : true
      const matchesCategory = filters.values.category
        ? task.category === filters.values.category
        : true
      const matchesStatus = filters.values.status
        ? task.status === filters.values.status
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
      logger.error('Quick action failed:', error)
    }
  }

  return (
    <PageContainer width="default">
      <PageHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-spacing-md">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <PageTitle>Taskdesk</PageTitle>
                <p className="text-fluid-sm text-text-secondary mt-0.5">Gérez vos tâches et priorités efficacement</p>
              </div>
            </div>
          </div>

          <a
            href="/dashboard/tasks/kanban"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Vue Kanban
          </a>
        </div>

        {/* Filters */}
        <div className="mt-spacing-lg">
          <AdvancedFilters
            filters={advancedFilterDefinitions}
            values={filters.values}
            onChange={filters.handleChange}
            onReset={filters.reset}
          />
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-spacing-md mt-spacing-lg">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-border rounded-xl px-spacing-md py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Total</p>
                  <p className="text-lg font-bold text-text-primary">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-red-200 rounded-xl px-spacing-md py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Retard</p>
                  <p className="text-lg font-bold text-red-600">{overdueCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-orange-200 rounded-xl px-spacing-md py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Aujourd'hui</p>
                  <p className="text-lg font-bold text-warning">{todayCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-border rounded-xl px-spacing-md py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">À faire</p>
                  <p className="text-lg font-bold text-text-primary">{stats.by_status.todo || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-blue-200 rounded-xl px-spacing-md py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">En cours</p>
                  <p className="text-lg font-bold text-primary">{stats.by_status.doing || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-green-200 rounded-xl px-spacing-md py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Terminées</p>
                  <p className="text-lg font-bold text-success">{stats.by_status.done || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageHeader>

      <PageSection>
        {/* Sections */}
        <div className="space-y-spacing-lg">
          {/* EN RETARD */}
          <TaskSection
            title="EN RETARD"
            count={filteredOverdue.length}
            emoji="🔴"
            tasks={filteredOverdue}
            bgColor="bg-white dark:bg-slate-900/80 backdrop-blur-sm border-2 border-red-200 shadow-lg"
            onQuickAction={handleQuickAction}
          />

          {/* AUJOURD'HUI */}
          <TaskSection
            title="AUJOURD'HUI"
            count={filteredToday.length}
            emoji="⚡"
            tasks={filteredToday}
            bgColor="bg-white dark:bg-slate-900/80 backdrop-blur-sm border-2 border-orange-200 shadow-lg"
            onQuickAction={handleQuickAction}
          />

          {/* PROCHAINS 7 JOURS */}
          <TaskSection
            title="PROCHAINS 7 JOURS"
            count={filteredNext7.length}
            emoji="📅"
            tasks={filteredNext7}
            bgColor="bg-white dark:bg-slate-900/80 backdrop-blur-sm border-2 border-blue-200 shadow-lg"
            onQuickAction={handleQuickAction}
          />
        </div>
      </PageSection>

      {/* Quick Add Button */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex flex-col gap-3 items-end z-50">
        <div className="hidden sm:flex bg-white dark:bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-xl px-spacing-md py-2.5 text-fluid-sm text-text-secondary border border-border animate-bounce">
          <kbd className="px-2 py-1 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md text-xs font-mono font-semibold border border-gray-300 dark:border-slate-600 shadow-sm">⌘K</kbd>
          <span className="ml-2">pour ajouter</span>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-gradient-to-br from-primary to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-spacing-md sm:p-5 shadow-2xl transition-all hover:scale-110 active:scale-95 group relative"
          title="Nouvelle tâche (⌘K)"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
          <svg className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Task Form Modal */}
      {isFormOpen && (
        <Suspense fallback={<div>Chargement...</div>}>
          <TaskForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
        </Suspense>
      )}
    </PageContainer>
  )
}
