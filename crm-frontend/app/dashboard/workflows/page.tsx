'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkflows } from '@/hooks/useWorkflows'
import { useConfirm } from '@/hooks/useConfirm'
import { Play, Plus, Power, PowerOff, Trash2, Eye, TrendingUp, Copy } from 'lucide-react'

export default function WorkflowsPage() {
  const router = useRouter()
  const {
    workflows,
    operation,
    fetchWorkflows,
    toggleWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
  } = useWorkflows()

  const { confirm, ConfirmDialogComponent } = useConfirm()
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'draft'>('all')

  useEffect(() => {
    fetchWorkflows(0, 100, filter !== 'all' ? { status: filter } : undefined)
  }, [filter, fetchWorkflows])

  const handleToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await toggleWorkflow(id, newStatus)
      fetchWorkflows(0, 100, filter !== 'all' ? { status: filter } : undefined)
    } catch (error) {
      console.error('Erreur toggle:', error)
    }
  }

  const handleDelete = async (id: number) => {
    confirm({
      title: 'Supprimer le workflow',
      message: 'Êtes-vous sûr de vouloir supprimer ce workflow ? Cette action est irréversible.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await deleteWorkflow(id)
          fetchWorkflows(0, 100, filter !== 'all' ? { status: filter } : undefined)
        } catch (error) {
          console.error('Erreur suppression:', error)
        }
      },
    })
  }

  const handleDuplicate = async (id: number) => {
    try {
      const newWorkflow = await duplicateWorkflow(id)
      fetchWorkflows(0, 100, filter !== 'all' ? { status: filter } : undefined)
      // Rediriger vers la page d'édition du nouveau workflow
      router.push(`/dashboard/workflows/${newWorkflow.id}`)
    } catch (error) {
      console.error('Erreur duplication:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    }
    return styles[status as keyof typeof styles] || styles.draft
  }

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      organisation_created: 'Organisation créée',
      organisation_updated: 'Organisation modifiée',
      deal_created: 'Deal créé',
      deal_stage_changed: 'Changement de stage',
      inactivity_delay: 'Inactivité',
      scheduled: 'Planifié',
    }
    return labels[triggerType] || triggerType
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Workflows Automatisés
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Automatisez vos processus métier
              </p>
            </div>
            <a
              href="/dashboard/workflows/new"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/30"
            >
              <Plus size={20} />
              Nouveau workflow
            </a>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 mt-6">
            {(['all', 'active', 'inactive', 'draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Liste workflows */}
        {workflows.isLoading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            Chargement...
          </div>
        ) : workflows.error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {workflows.error}
          </div>
        ) : !workflows.data || workflows.data.items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aucun workflow trouvé
            </p>
            <a
              href="/dashboard/workflows/new"
              className="inline-block text-blue-600 hover:underline font-medium"
            >
              Créer votre premier workflow →
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {workflows.data.items.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {workflow.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                          workflow.status
                        )}`}
                      >
                        {workflow.status}
                      </span>
                      {workflow.is_template && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          Template
                        </span>
                      )}
                    </div>

                    {workflow.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {workflow.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Play size={14} />
                        <span>Trigger: {getTriggerLabel(workflow.trigger_type)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} />
                        <span>{workflow.execution_count} exécutions</span>
                      </div>
                      {workflow.last_executed_at && (
                        <span>
                          Dernière: {new Date(workflow.last_executed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`/dashboard/workflows/${workflow.id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                      title="Voir détails"
                    >
                      <Eye size={18} />
                    </a>

                    {/* Bouton Dupliquer - toujours visible, highlight pour templates */}
                    <button
                      onClick={() => handleDuplicate(workflow.id)}
                      className={`p-2 rounded transition ${
                        workflow.is_template
                          ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 ring-2 ring-purple-200 dark:ring-purple-800'
                          : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      title={
                        workflow.is_template
                          ? 'Dupliquer ce template pour le personnaliser'
                          : 'Dupliquer ce workflow'
                      }
                      disabled={operation.isLoading}
                    >
                      <Copy size={18} />
                    </button>

                    <button
                      onClick={() => handleToggle(workflow.id, workflow.status)}
                      className={`p-2 rounded transition ${
                        workflow.is_template
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : workflow.status === 'active'
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={
                        workflow.is_template
                          ? 'Les templates ne peuvent pas être modifiés'
                          : workflow.status === 'active'
                          ? 'Désactiver'
                          : 'Activer'
                      }
                      disabled={operation.isLoading || workflow.is_template}
                    >
                      {workflow.status === 'active' ? (
                        <Power size={18} />
                      ) : (
                        <PowerOff size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(workflow.id)}
                      className={`p-2 rounded transition ${
                        workflow.is_template
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={
                        workflow.is_template
                          ? 'Les templates ne peuvent pas être supprimés'
                          : 'Supprimer'
                      }
                      disabled={operation.isLoading || workflow.is_template}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
