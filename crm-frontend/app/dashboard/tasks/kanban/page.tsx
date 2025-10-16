'use client'

import { useState, useEffect } from 'react'
import { useTasks } from '@/hooks/useTasks'
import TaskForm from '@/components/forms/TaskForm'
import type { Task, TaskStatus, TaskPriority } from '@/lib/types'

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
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{PRIORITY_EMOJI[task.priority]}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>📅 {task.due_date}</span>
            {task.linked_entity_display && (
              <span className="truncate">{task.linked_entity_display}</span>
            )}
          </div>
        </div>
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
  return (
    <div
      className={`${color} rounded-lg p-4 min-h-[500px] flex flex-col`}
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-600">({count})</span>
        </h2>
      </div>

      <div className="space-y-3 flex-1">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Glissez une tâche ici
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
      console.error('Failed to update task status:', error)
    }
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Kanban</h1>
            <p className="text-gray-600">Glissez-déposez vos tâches pour changer leur statut</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-600">Total : </span>
              <span className="font-bold text-gray-900">{total}</span>
            </div>

            <a
              href="/dashboard/tasks"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              ← Vue Liste
            </a>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KanbanColumn
          title="📝 À FAIRE"
          status="todo"
          tasks={todoTasks}
          count={todoTasks.length}
          color="bg-gray-50 border border-gray-200"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />

        <KanbanColumn
          title="⚡ EN COURS"
          status="doing"
          tasks={doingTasks}
          count={doingTasks.length}
          color="bg-blue-50 border border-blue-200"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />

        <KanbanColumn
          title="✅ TERMINÉ"
          status="done"
          tasks={doneTasks}
          count={doneTasks.length}
          color="bg-green-50 border border-green-200"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      </div>

      {/* Quick Add Button */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end">
        <div className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-gray-600">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">⌘K</kbd> pour ajouter
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105"
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
