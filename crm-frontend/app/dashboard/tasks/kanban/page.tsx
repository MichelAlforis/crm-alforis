'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'
import type { Task, TaskStatus, TaskPriority } from '@/lib/types'

// Lazy load TaskForm (only loads when modal opens)
const TaskForm = lazy(() => import('@/components/forms/TaskForm'))

// ============= PRIORITY BADGE =============

const PRIORITY_EMOJI: Record<TaskPriority, string> = {
  critique: '🔴',
  haute: '🟠',
  moyenne: '🟡',
  basse: '🔵',
  non_prioritaire: '⚪',
}

// ============= TASK CARD =============

function KanbanTaskCard({
  task,
  onDragStart,
}: {
  task: Task
  onDragStart: (e: React.DragEvent, task: Task) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="group bg-white dark:bg-slate-900 border border-border rounded-xl p-spacing-md cursor-grab active:cursor-grabbing hover:shadow-xl hover:border-blue-300 transition-all duration-300 hover:scale-105 active:scale-100 active:rotate-2"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-border group-hover:border-blue-300 transition-colors">
          <span className="text-lg">{PRIORITY_EMOJI[task.priority]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-fluid-sm mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <svg className="w-3.5 h-3.5 text-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{task.due_date}</span>
            </div>
            {task.linked_entity_display && (
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <svg className="w-3.5 h-3.5 text-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="truncate">{task.linked_entity_display}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag indicator */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
    </div>
  )
}

// ============= KANBAN COLUMN =============

function KanbanColumn({
  title,
  status,
  tasks,
  count,
  color,
  onDrop,
  onDragOver,
}: {
  title: string
  status: TaskStatus
  tasks: Task[]
  count: number
  color: string
  onDrop: (e: React.DragEvent, status: TaskStatus) => void
  onDragOver: (e: React.DragEvent) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    onDragOver(e)
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    onDrop(e, status)
    setIsDragOver(false)
  }

  return (
    <div
      className={`${color} rounded-2xl p-spacing-lg min-h-[600px] flex flex-col transition-all duration-300 ${
        isDragOver ? 'ring-4 ring-blue-400 ring-opacity-50 scale-105' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-border">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
          {title}
        </h2>
        <div className="flex items-center justify-center min-w-[28px] h-7 px-2 bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-full text-fluid-sm font-bold text-text-secondary border border-border shadow-sm">
          {count}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-text-disabled py-12 px-spacing-md">
            <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-fluid-sm font-medium">Aucune tâche</p>
            <p className="text-xs mt-1">Glissez une tâche ici</p>
          </div>
        ) : (
          tasks.map((task) => <KanbanTaskCard key={task.id} task={task} onDragStart={handleDragStart} />)
        )}
      </div>
    </div>
  )
}

// ============= DRAG & DROP HANDLERS =============

let draggedTask: Task | null = null

function handleDragStart(e: React.DragEvent, task: Task) {
  draggedTask = task
  e.dataTransfer.effectAllowed = 'move'
}

function handleDragOver(e: React.DragEvent) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

// ============= MAIN PAGE =============

export default function KanbanPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { tasks, total, updateTask } = useTasks()

  // Group tasks by status
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const doingTasks = tasks.filter((t) => t.status === 'doing')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  // Raccourci clavier : K pour ouvrir le formulaire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsFormOpen(true)
      }
      if (e.key === 'Escape' && isFormOpen) {
        setIsFormOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault()

    if (!draggedTask) return

    try {
      await updateTask(draggedTask.id, { status: newStatus })
      draggedTask = null
    } catch (error) {
      logger.error('Failed to update task status:', error)
    }
  }

  return (
    <PageContainer width="wide">
      <PageHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-spacing-md">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-primary rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <PageTitle>Kanban Board</PageTitle>
                <p className="text-fluid-sm text-text-secondary mt-0.5">Glissez-déposez vos tâches pour changer leur statut</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-border rounded-xl px-spacing-md py-2.5 shadow-sm">
              <span className="text-fluid-sm text-text-secondary">Total : </span>
              <span className="font-bold text-text-primary text-lg">{total}</span>
            </div>

            <a
              href="/dashboard/tasks"
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 dark:border-slate-600 text-text-secondary rounded-xl hover:bg-white dark:bg-slate-900 hover:border-gray-400 font-medium transition-all shadow-sm hover:shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Vue Liste
            </a>
          </div>
        </div>
      </PageHeader>

      <PageSection>
        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-md lg:gap-spacing-lg">
          <KanbanColumn
            title="📝 À FAIRE"
            status="todo"
            tasks={todoTasks}
            count={todoTasks.length}
            color="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-border shadow-lg"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />

          <KanbanColumn
            title="⚡ EN COURS"
            status="doing"
            tasks={doingTasks}
            count={doingTasks.length}
            color="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />

          <KanbanColumn
            title="✅ TERMINÉ"
            status="done"
            tasks={doneTasks}
            count={doneTasks.length}
            color="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
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
