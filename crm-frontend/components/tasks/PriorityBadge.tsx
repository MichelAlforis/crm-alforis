'use client'

import type { TaskPriority } from '@/lib/types'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critique: 'bg-red-100 text-red-800',
  haute: 'bg-orange-100 text-orange-800',
  moyenne: 'bg-yellow-100 text-yellow-800',
  basse: 'bg-blue-100 text-blue-800',
  non_prioritaire: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
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

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
      <span>{PRIORITY_EMOJI[priority]}</span>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
