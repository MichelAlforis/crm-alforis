'use client'
import { logger } from '@/lib/logger'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkflows } from '@/hooks/useWorkflows'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'
import { PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared'
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
    <PageContainer width="default">
      <PageHeader>
        <div className="flex justify-between items-center">
          <div>
            <PageTitle className="flex items-center gap-spacing-sm">
              <Sparkles className="text-purple-600" />
              Workflows Automatisés
            </PageTitle>
            <p className="text-text-secondary mt-spacing-sm">
              {stats.total} workflows disponibles ({stats.templates} templates + {stats.custom} personnalisés)
            </p>
          </div>
          <a
            href="/dashboard/workflows/new"
            className="flex items-center gap-spacing-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white px-spacing-md py-spacing-sm rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/30"
          >
            <Plus size={20} />
            Nouveau workflow
          </a>
        </div>
      </PageHeader>

      <PageSection>
        <div className="space-y-spacing-lg">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" size={20} />
            <input
              type="text"
              placeholder="Rechercher un workflow (nom, description, trigger...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-surface text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-spacing-md items-center">
            {/* Filtre Status */}
            <div className="flex gap-spacing-sm">
              <span className="text-fluid-sm font-medium text-text-secondary self-center">Status:</span>
              {(['all', 'active', 'inactive', 'draft'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-spacing-md py-spacing-sm rounded-lg transition ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 border border-border'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Séparateur */}
            <div className="h-8 w-px bg-border"></div>

            {/* Filtre Type (Template/Personnalisé) */}
            <div className="flex gap-spacing-sm">
              <span className="text-fluid-sm font-medium text-text-secondary self-center">Type:</span>
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-spacing-md py-spacing-sm rounded-lg transition ${
                  typeFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-surface text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 border border-border'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setTypeFilter('template')}
                className={`px-spacing-md py-spacing-sm rounded-lg transition flex items-center gap-spacing-xs ${
                  typeFilter === 'template'
                    ? 'bg-purple-600 text-white'
                    : 'bg-surface text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 border border-border'
                }`}
              >
                <BookTemplate size={16} />
                Templates ({stats.templates})
              </button>
              <button
                onClick={() => setTypeFilter('custom')}
                className={`px-spacing-md py-spacing-sm rounded-lg transition flex items-center gap-spacing-xs ${
                  typeFilter === 'custom'
                    ? 'bg-purple-600 text-white'
                    : 'bg-surface text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 border border-border'
                }`}
              >
                <User size={16} />
                Personnalisés ({stats.custom})
              </button>
            </div>

            {/* Badge résultats */}
            <div className="ml-auto flex items-center gap-spacing-sm bg-purple-50 dark:bg-purple-900/20 px-spacing-md py-spacing-sm rounded-lg">
              <Filter className="text-purple-600" size={18} />
              <span className="text-fluid-sm font-medium text-purple-900 dark:text-purple-200">
                {filteredWorkflows.length} résultat{filteredWorkflows.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Ligne filtres Triggers */}
          {availableTriggers.length > 0 && (
            <div className="flex flex-wrap gap-spacing-sm items-center">
              <span className="text-fluid-sm font-medium text-text-secondary">Déclencheurs:</span>
              <button
                onClick={() => setTriggerFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-fluid-sm transition ${
                  triggerFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 border border-border'
                }`}
              >
                Tous ({stats.total})
              </button>
              {availableTriggers.map((trigger) => (
                <button
                  key={trigger}
                  onClick={() => setTriggerFilter(trigger)}
                  className={`px-3 py-1.5 rounded-lg text-fluid-sm transition ${
                    triggerFilter === trigger
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 border border-border'
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
          <div className="text-center py-spacing-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-spacing-md"></div>
            <p className="text-text-secondary">Chargement des workflows...</p>
          </div>
        ) : workflows.error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-spacing-md rounded-lg">
            {workflows.error}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="bg-surface rounded-lg p-spacing-xl text-center">
            <BookTemplate size={48} className="mx-auto text-text-tertiary mb-spacing-md" />
            <p className="text-text-secondary mb-spacing-md">
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
                className="px-spacing-md py-spacing-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-spacing-md">
            {filteredWorkflows.slice(pagination.skip, pagination.skip + pagination.limit).map((workflow) => (
              <div
                key={workflow.id}
                className="bg-surface rounded-lg p-spacing-lg shadow hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-spacing-sm mb-spacing-sm flex-wrap">
                      <h3 className="text-fluid-lg font-semibold text-text-primary">
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
                      <p className="text-text-secondary text-fluid-sm mb-spacing-sm">
                        {workflow.description}
                      </p>
                    )}

                    <div className="flex items-center gap-spacing-md text-fluid-sm text-text-secondary">
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
                  <div className="flex items-center gap-spacing-xs">
                    <a
                      href={`/dashboard/workflows/${workflow.id}`}
                      className="p-spacing-sm text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
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
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-gray-700'
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

            {/* Pagination Controls */}
            {filteredWorkflows.length > pagination.limit && (
              <div className="flex items-center justify-between px-spacing-lg py-spacing-md bg-surface rounded-lg mt-spacing-lg">
                <div className="text-fluid-sm text-text-secondary">
                  Affichage <span className="font-semibold text-text-primary">{pagination.skip + 1}-{Math.min(pagination.skip + pagination.limit, filteredWorkflows.length)}</span> sur{' '}
                  <span className="font-semibold text-text-primary">{filteredWorkflows.length}</span> résultats
                </div>

                <div className="flex items-center gap-spacing-xs">
                  <button
                    onClick={() => pagination.setSkip(0)}
                    disabled={pagination.skip === 0}
                    className="px-3 py-1.5 text-fluid-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-surface text-text-primary border border-border hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    «
                  </button>
                  <button
                    onClick={() => pagination.setSkip(Math.max(0, pagination.skip - pagination.limit))}
                    disabled={pagination.skip === 0}
                    className="px-3 py-1.5 text-fluid-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-surface text-text-primary border border-border hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    ‹ Précédent
                  </button>
                  <div className="px-spacing-md py-1.5 text-fluid-sm font-medium bg-purple-600 text-white rounded-md">
                    Page {Math.floor(pagination.skip / pagination.limit) + 1} / {Math.ceil(filteredWorkflows.length / pagination.limit)}
                  </div>
                  <button
                    onClick={() => pagination.setSkip(pagination.skip + pagination.limit)}
                    disabled={pagination.skip + pagination.limit >= filteredWorkflows.length}
                    className="px-3 py-1.5 text-fluid-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-surface text-text-primary border border-border hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Suivant ›
                  </button>
                  <button
                    onClick={() => pagination.setSkip((Math.ceil(filteredWorkflows.length / pagination.limit) - 1) * pagination.limit)}
                    disabled={pagination.skip + pagination.limit >= filteredWorkflows.length}
                    className="px-3 py-1.5 text-fluid-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-surface text-text-primary border border-border hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialogComponent />
      </PageSection>
    </PageContainer>
  )
}
