/**
 * Liste des exécutions AI (historique des tâches)
 */
'use client'

import React from 'react'
import { AIExecution, AITaskType } from '@/types/ai'
import { CheckCircle, XCircle, Clock, Loader2, Sparkles, Database, FileCheck } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AIExecutionsListProps {
  executions: AIExecution[]
  onSelectExecution?: (id: number) => void
}

const TASK_CONFIG: Record<AITaskType, { label: string; icon: any; color: string }> = {
  [AITaskType.DETECT_DUPLICATES]: {
    label: 'Détection doublons',
    icon: Sparkles,
    color: 'text-purple-600',
  },
  [AITaskType.ENRICH_DATA]: {
    label: 'Enrichissement',
    icon: Database,
    color: 'text-blue-600',
  },
  [AITaskType.CHECK_QUALITY]: {
    label: 'Contrôle qualité',
    icon: FileCheck,
    color: 'text-green-600',
  },
  [AITaskType.CUSTOM]: {
    label: 'Personnalisé',
    icon: Sparkles,
    color: 'text-gray-600',
  },
}

export default function AIExecutionsList({ executions, onSelectExecution }: AIExecutionsListProps) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Aucune exécution</p>
        <p className="text-sm text-gray-500 mt-1">L'historique apparaîtra ici</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {executions.map((execution) => {
        const taskConfig = TASK_CONFIG[execution.task_type]
        // Vérifier que taskConfig existe, sinon utiliser des valeurs par défaut
        if (!taskConfig) {
          console.warn(`Unknown task_type: ${execution.task_type}`)
          return null
        }
        const TaskIcon = taskConfig.icon
        const isRunning = execution.status === 'running'
        const isSuccess = execution.status === 'completed'
        const isFailed = execution.status === 'failed'

        const successRate =
          execution.total_items_processed > 0
            ? (execution.successful_items / execution.total_items_processed) * 100
            : 0

        return (
          <div
            key={execution.id}
            onClick={() => onSelectExecution?.(execution.id)}
            className={clsx(
              'p-4 bg-white rounded-xl border-2 transition-all',
              onSelectExecution && 'cursor-pointer hover:shadow-lg hover:border-blue-300',
              isRunning && 'border-blue-200 bg-blue-50/50',
              isSuccess && 'border-green-200',
              isFailed && 'border-red-200'
            )}
          >
            <div className="flex items-start justify-between">
              {/* Left: Task info */}
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={clsx('p-2 rounded-lg bg-gray-100', isRunning && 'animate-pulse')}
                >
                  <TaskIcon className={clsx('h-5 w-5', taskConfig.color)} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{taskConfig.label}</h3>
                    <span className="text-xs text-gray-500">#{execution.id}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>
                      {execution.total_items_processed} éléments
                    </span>
                    <span>•</span>
                    <span className="text-green-600 font-medium">
                      {execution.successful_items} réussis
                    </span>
                    {execution.failed_items > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-600 font-medium">
                          {execution.failed_items} échoués
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Démarré: {format(new Date(execution.started_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    {execution.completed_at && (
                      <> • Terminé: {format(new Date(execution.completed_at), 'HH:mm')}</>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Status & metrics */}
              <div className="flex flex-col items-end gap-2">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      En cours
                    </span>
                  )}
                  {isSuccess && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      <CheckCircle className="h-3 w-3" />
                      Terminé
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      <XCircle className="h-3 w-3" />
                      Échoué
                    </span>
                  )}
                </div>

                {/* Success rate bar */}
                {execution.total_items_processed > 0 && (
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Succès</span>
                      <span className="font-semibold">{successRate.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full transition-all',
                          successRate >= 90 ? 'bg-green-500' :
                          successRate >= 70 ? 'bg-blue-500' :
                          'bg-yellow-500'
                        )}
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Cost */}
                <div className="text-right">
                  <p className="text-xs text-gray-500">Coût estimé</p>
                  <p className="text-sm font-bold text-gray-900">
                    ${execution.estimated_cost_usd.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Error details */}
            {isFailed && execution.error_details && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-900">Erreur:</p>
                <p className="text-xs text-red-700 mt-1">
                  {typeof execution.error_details === 'string'
                    ? execution.error_details
                    : JSON.stringify(execution.error_details)}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
