'use client'

import type { Task } from '@/lib/types'
import { PriorityBadge } from './PriorityBadge'

interface TaskCardProps {
  task: Task
  onQuickAction: (id: number, action: string) => void
}

export function TaskCard({ task, onQuickAction }: TaskCardProps) {
  return (
    <div className="group bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1.5 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
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
              <p className="text-xs text-gray-600 dark:text-slate-400">{task.linked_entity_display}</p>
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
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 shadow-sm hover:shadow"
            title="Reporter d'1 jour"
          >
            +1 jour
          </button>
          <button
            onClick={() => onQuickAction(task.id, 'snooze_1w')}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 shadow-sm hover:shadow"
            title="Reporter d'1 semaine"
          >
            +1 sem
          </button>
        </div>
      </div>
    </div>
  )
}
