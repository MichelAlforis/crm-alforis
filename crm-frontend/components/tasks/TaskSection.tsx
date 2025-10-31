'use client'

import type { Task } from '@/lib/types'
import { TaskCard } from './TaskCard'

interface TaskSectionProps {
  title: string
  count: number
  emoji: string
  tasks: Task[]
  bgColor: string
  onQuickAction: (id: number, action: string) => void
}

export function TaskSection({ title, count, emoji, tasks, bgColor, onQuickAction }: TaskSectionProps) {
  return (
    <div className={`${bgColor} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <span>{emoji}</span>
          {title}
          <span className="text-lg font-normal text-gray-600 dark:text-slate-400">({count})</span>
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
