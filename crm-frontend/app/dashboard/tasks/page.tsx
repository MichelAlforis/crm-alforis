'use client'

import { useState, useEffect } from 'react'
import { useTaskViews, useTasks } from '@/hooks/useTasks'
import TaskForm from '@/components/forms/TaskForm'
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3">
            <PriorityBadge priority={task.priority} />

            {task.days_until_due < 0 && (
              <span className="text-xs text-red-600 font-medium">
                En retard de {Math.abs(task.days_until_due)} jour{Math.abs(task.days_until_due) > 1 ? 's' : ''}
              </span>
            )}
            {task.days_until_due === 0 && (
              <span className="text-xs text-orange-600 font-medium">Aujourd'hui</span>
            )}
            {task.days_until_due > 0 && (
              <span className="text-xs text-gray-500">Dans {task.days_until_due} jour{task.days_until_due > 1 ? 's' : ''}</span>
            )}
          </div>

          {task.linked_entity_display && (
            <p className="text-xs text-gray-500 mt-2">{task.linked_entity_display}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => onQuickAction(task.id, 'mark_done')}
            className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded"
            title="Marquer terminée"
          >
            ✓ Fait
          </button>
          <button
            onClick={() => onQuickAction(task.id, 'snooze_1d')}
            className="px-2 py-1 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 rounded"
            title="Reporter d'1 jour"
          >
            +1j
          </button>
          <button
            onClick={() => onQuickAction(task.id, 'snooze_1w')}
            className="px-2 py-1 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 rounded"
            title="Reporter d'1 semaine"
          >
            +1sem
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Taskdesk</h1>
            <p className="text-gray-600">Gérez vos tâches et priorités</p>
          </div>

          <a
            href="/dashboard/tasks/kanban"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transition-all shadow-md hover:shadow-lg"
          >
            🎯 Vue Kanban
          </a>
        </div>

        {stats && (
          <div className="flex gap-4 mt-4">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-600">Total : </span>
              <span className="font-bold text-gray-900">{stats.total}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-600">En cours : </span>
              <span className="font-bold text-blue-600">{stats.by_status.doing || 0}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-600">Terminées : </span>
              <span className="font-bold text-green-600">{stats.by_status.done || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* EN RETARD */}
        <TaskSection
          title="EN RETARD"
          count={overdueCount}
          emoji="🔴"
          tasks={overdue}
          bgColor="bg-red-50 border border-red-200"
          onQuickAction={handleQuickAction}
        />

        {/* AUJOURD'HUI */}
        <TaskSection
          title="AUJOURD'HUI"
          count={todayCount}
          emoji="⚡"
          tasks={today}
          bgColor="bg-orange-50 border border-orange-200"
          onQuickAction={handleQuickAction}
        />

        {/* PROCHAINS 7 JOURS */}
        <TaskSection
          title="PROCHAINS 7 JOURS"
          count={next7Count}
          emoji="📅"
          tasks={next7}
          bgColor="bg-blue-50 border border-blue-200"
          onQuickAction={handleQuickAction}
        />
      </div>

      {/* Quick Add Button */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end">
        <div className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-gray-600">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">⌘K</kbd> pour ajouter
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 group"
          title="Nouvelle tâche (⌘K)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Task Form Modal */}
      <TaskForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  )
}
