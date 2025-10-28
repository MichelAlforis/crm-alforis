'use client'
import { logger } from '@/lib/logger'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkflows } from '@/hooks/useWorkflows'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  Play, Plus, Power, PowerOff, Trash2, Eye, TrendingUp, Copy,
  Search, Filter, Sparkles, BookTemplate, User
} from 'lucide-react'

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
  const pagination = usePagination({ initialLimit: 20 })

  // États des filtres
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'draft'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'template' | 'custom'>('all')
  const [triggerFilter, setTriggerFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Charger les workflows au démarrage
  useEffect(() => {
    fetchWorkflows(0, 100, filter !== 'all' ? { status: filter } : undefined)
  }, [filter, fetchWorkflows])

  const handleToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await toggleWorkflow(id, newStatus)
      fetchWorkflows(0, 100, filter !== 'all' ? { status: filter } : undefined)
    } catch (error) {
      logger.error('Erreur toggle:', error)
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
          logger.error('Erreur suppression:', error)
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
      logger.error('Erreur duplication:', error)
    }
  }

  // Filtrage combiné (status + type + trigger + recherche)
  const filteredWorkflows = useMemo(() => {
    if (!workflows.data?.items) return []

    return workflows.data.items.filter(w => {
      // Filtre par type (Template/Personnalisé)
      if (typeFilter === 'template' && !w.is_template) return false
      if (typeFilter === 'custom' && w.is_template) return false

      // Filtre par trigger
      if (triggerFilter !== 'all' && w.trigger_type !== triggerFilter) return false

      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          w.name.toLowerCase().includes(query) ||
          w.description?.toLowerCase().includes(query) ||
          w.trigger_type.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [workflows.data?.items, typeFilter, triggerFilter, searchQuery])

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
      // Entités principales
      organisation_created: '🏢 Nouvelle Organisation',
      organisation_updated: '✏️ Modification Organisation',
      person_created: '👤 Nouvelle Personne',
      person_updated: '✏️ Modification Personne',

      // Communications
      email_received: '📧 Nouveau Mail',
      email_sent: '📨 Mail Envoyé',
      webhook_received: '🔗 Webhook Externe',

      // Réunions & Appels
      meeting_created: '📅 Nouvelle Réunion',
      meeting_completed: '✅ Réunion Terminée',
      call_completed: '☎️ Appel Terminé',

      // Deals & Pipeline
      deal_created: '💼 Nouveau Deal',
      deal_stage_changed: '📊 Changement Statut Deal',
      deal_won: '🎉 Deal Gagné',
      deal_lost: '❌ Deal Perdu',

      // Tasks & Interactions
      task_created: '✅ Nouvelle Tâche',
      task_completed: '✔️ Tâche Complétée',
      task_assigned: '👥 Tâche Assignée',

      // Autres
      inactivity_delay: '⏰ Inactivité Détectée',
      scheduled: '📅 Planification Automatique',
      manual: '👤 Déclenchement Manuel',
    }
    return labels[triggerType] || triggerType
  }

  // Stats
  const stats = useMemo(() => {
    const items = workflows.data?.items || []

    // Compter par trigger
    const triggerCounts: Record<string, number> = {}
    items.forEach(w => {
      triggerCounts[w.trigger_type] = (triggerCounts[w.trigger_type] || 0) + 1
    })

    return {
      total: items.length,
      templates: items.filter(w => w.is_template).length,
      custom: items.filter(w => !w.is_template).length,
      active: items.filter(w => w.status === 'active').length,
      triggerCounts,
    }
  }, [workflows.data?.items])

  // Liste des triggers disponibles
  const availableTriggers = useMemo(() => {
    return Object.keys(stats.triggerCounts).sort()
  }, [stats.triggerCounts])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Sparkles className="text-purple-600" />
                Workflows Automatisés
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {stats.total} workflows disponibles ({stats.templates} templates + {stats.custom} personnalisés)
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

          {/* Barre de recherche */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un workflow (nom, description, trigger...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Filtre Status */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">Status:</span>
              {(['all', 'active', 'inactive', 'draft'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Séparateur */}
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>

            {/* Filtre Type (Template/Personnalisé) */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">Type:</span>
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  typeFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setTypeFilter('template')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  typeFilter === 'template'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                }`}
              >
                <BookTemplate size={16} />
                Templates ({stats.templates})
              </button>
              <button
                onClick={() => setTypeFilter('custom')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  typeFilter === 'custom'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                }`}
              >
                <User size={16} />
                Personnalisés ({stats.custom})
              </button>
            </div>

            {/* Badge résultats */}
            <div className="ml-auto flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
              <Filter className="text-purple-600" size={18} />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                {filteredWorkflows.length} résultat{filteredWorkflows.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Ligne filtres Triggers */}
          {availableTriggers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Déclencheurs:</span>
              <button
                onClick={() => setTriggerFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  triggerFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                }`}
              >
                Tous ({stats.total})
              </button>
              {availableTriggers.map((trigger) => (
                <button
                  key={trigger}
                  onClick={() => setTriggerFilter(trigger)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    triggerFilter === trigger
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {getTriggerLabel(trigger)} ({stats.triggerCounts[trigger]})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Liste workflows */}
        {workflows.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des workflows...</p>
          </div>
        ) : workflows.error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {workflows.error}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <BookTemplate size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || typeFilter !== 'all' || filter !== 'all' || triggerFilter !== 'all'
                ? 'Aucun workflow ne correspond à vos critères'
                : 'Aucun workflow trouvé'
              }
            </p>
            {(searchQuery || typeFilter !== 'all' || filter !== 'all' || triggerFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setTypeFilter('all')
                  setFilter('all')
                  setTriggerFilter('all')
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="grid gap-4">
            {filteredWorkflows.slice(pagination.skip, pagination.skip + pagination.limit).map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {workflow.name}
                      </h3>

                      {/* Badge Status */}
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                          workflow.status
                        )}`}
                      >
                        {workflow.status}
                      </span>

                      {/* Badge Type (Template/Manuel) */}
                      {workflow.is_template ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1">
                          <BookTemplate size={12} />
                          Template
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
                          <User size={12} />
                          Personnalisé
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

                    {/* Bouton Dupliquer */}
                    <button
                      onClick={() => handleDuplicate(workflow.id)}
                      className={`p-2 rounded transition ${
                        workflow.is_template
                          ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 ring-2 ring-purple-200 dark:ring-purple-800'
                          : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      title={
                        workflow.is_template
                          ? 'Utiliser ce template'
                          : 'Dupliquer ce workflow'
                      }
                      disabled={operation.isLoading}
                    >
                      <Copy size={18} />
                    </button>

                    {/* Toggle Active/Inactive (désactivé pour templates) */}
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

                    {/* Supprimer (désactivé pour templates) */}
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

          {/* Pagination Controls */}
          {filteredWorkflows.length > pagination.limit && (
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 rounded-lg mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Affichage <span className="font-semibold text-gray-900 dark:text-white">{pagination.skip + 1}-{Math.min(pagination.skip + pagination.limit, filteredWorkflows.length)}</span> sur{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{filteredWorkflows.length}</span> résultats
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => pagination.setSkip(0)}
                  disabled={pagination.skip === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  «
                </button>
                <button
                  onClick={() => pagination.setSkip(Math.max(0, pagination.skip - pagination.limit))}
                  disabled={pagination.skip === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  ‹ Précédent
                </button>
                <div className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-md">
                  Page {Math.floor(pagination.skip / pagination.limit) + 1} / {Math.ceil(filteredWorkflows.length / pagination.limit)}
                </div>
                <button
                  onClick={() => pagination.setSkip(pagination.skip + pagination.limit)}
                  disabled={pagination.skip + pagination.limit >= filteredWorkflows.length}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Suivant ›
                </button>
                <button
                  onClick={() => pagination.setSkip((Math.ceil(filteredWorkflows.length / pagination.limit) - 1) * pagination.limit)}
                  disabled={pagination.skip + pagination.limit >= filteredWorkflows.length}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  »
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
