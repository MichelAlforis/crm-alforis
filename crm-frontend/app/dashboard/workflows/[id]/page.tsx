'use client'
import { logger } from '@/lib/logger'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { useWorkflows } from '@/hooks/useWorkflows'
import { useConfirm } from '@/hooks/useConfirm'
import {
  ArrowLeft,
  Play,
  Power,
  PowerOff,
  Trash2,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  Copy,
  BookTemplate,
  Zap,
  Target,
  Mail,
  ListTodo,
  Bell,
  Tag,
  CalendarClock,
} from 'lucide-react'

export default function WorkflowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = parseInt(params.id as string)

  const {
    singleWorkflow,
    executions,
    stats,
    operation,
    fetchWorkflow,
    fetchExecutions,
    fetchStats,
    toggleWorkflow,
    deleteWorkflow,
    executeWorkflow,
    duplicateWorkflow,
  } = useWorkflows()

  const { confirm, ConfirmDialogComponent } = useConfirm()
  const [activeTab, setActiveTab] = useState<'details' | 'executions' | 'stats'>('details')
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [entityId, setEntityId] = useState('')

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow(workflowId)
      fetchExecutions(workflowId)
      fetchStats(workflowId)
    }
  }, [workflowId, fetchWorkflow, fetchExecutions, fetchStats])

  const handleToggle = async () => {
    if (!singleWorkflow.data) return
    const newStatus = singleWorkflow.data.status === 'active' ? 'inactive' : 'active'
    try {
      await toggleWorkflow(workflowId, newStatus)
      fetchWorkflow(workflowId)
    } catch (error) {
      logger.error('Erreur toggle:', error)
    }
  }

  const handleDelete = async () => {
    confirm({
      title: 'Supprimer le workflow',
      message: 'Êtes-vous sûr de vouloir supprimer ce workflow ? Cette action est irréversible.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await deleteWorkflow(workflowId)
          router.push(ROUTES.WORKFLOWS.BASE)
        } catch (error) {
          logger.error('Erreur suppression:', error)
        }
      },
    })
  }

  const handleExecute = async () => {
    if (!entityId) return
    try {
      await executeWorkflow(workflowId, 'organisation', parseInt(entityId))
      setShowExecuteModal(false)
      setEntityId('')
      fetchExecutions(workflowId)
      fetchStats(workflowId)
    } catch (error) {
      logger.error('Erreur exécution:', error)
    }
  }

  const handleDuplicate = async () => {
    try {
      const newWorkflow = await duplicateWorkflow(workflowId)
      router.push(`/dashboard/workflows/${newWorkflow.id}`)
    } catch (error) {
      logger.error('Erreur duplication:', error)
    }
  }

  // Helper: Traduire trigger en langage naturel
  const getTriggerDescription = (triggerType: string, _triggerConfig: any) => {
    const descriptions: Record<string, string> = {
      // Entités principales
      organisation_created: '🏢 Quand une nouvelle organisation est créée',
      organisation_updated: '✏️ Quand une organisation est modifiée',
      person_created: '👤 Quand une nouvelle personne est créée',
      person_updated: '✏️ Quand une personne est modifiée',

      // Communications
      email_received: '📧 Quand un nouveau mail est reçu',
      email_sent: '📨 Quand un mail est envoyé',
      webhook_received: '🔗 Quand un webhook externe est reçu',

      // Réunions & Appels
      meeting_created: '📅 Quand une nouvelle réunion est créée',
      meeting_completed: '✅ Quand une réunion est terminée',
      call_completed: '☎️ Quand un appel est terminé',

      // Deals & Pipeline
      deal_created: '💼 Quand un nouveau deal est créé',
      deal_stage_changed: '📊 Quand le statut d\'un deal change',
      deal_won: '🎉 Quand un deal est gagné',
      deal_lost: '❌ Quand un deal est perdu',

      // Tasks & Interactions
      task_created: '✅ Quand une nouvelle tâche est créée',
      task_completed: '✔️ Quand une tâche est complétée',
      task_assigned: '👥 Quand une tâche est assignée',

      // Autres
      inactivity_delay: '⏰ Quand une organisation est inactive depuis X jours',
      scheduled: '📅 À intervalles réguliers (planification automatique)',
      manual: '👤 Déclenché manuellement par un utilisateur',
    }
    return descriptions[triggerType] || `Trigger: ${triggerType}`
  }

  // Helper: Traduire actions en langage naturel avec icônes
  const getActionDescription = (action: any) => {
    const type = action.type || action.config?.type

    switch (type) {
      case 'send_email':
      case 'SEND_EMAIL':
        return {
          icon: <Mail className="text-blue-600" size={20} />,
          label: 'Envoi d\'email',
          description: `Email à ${action.config?.to || 'destinataire'}: "${action.config?.subject || action.config?.template || 'Sujet'}"`,
        }
      case 'create_task':
      case 'CREATE_TASK':
        return {
          icon: <ListTodo className="text-green-600" size={20} />,
          label: 'Création de tâche',
          description: `"${action.config?.title || 'Nouvelle tâche'}" ${action.config?.due_days ? `(échéance: +${action.config.due_days}j)` : ''}`,
        }
      case 'send_notification':
      case 'SEND_NOTIFICATION':
        return {
          icon: <Bell className="text-orange-600" size={20} />,
          label: 'Notification',
          description: action.config?.message || 'Notification envoyée',
        }
      case 'add_tag':
      case 'ADD_TAG':
        return {
          icon: <Tag className="text-purple-600" size={20} />,
          label: 'Ajout de tag',
          description: `Tag: "${action.config?.tag || 'nouveau tag'}"`,
        }
      case 'update_field':
      case 'UPDATE_FIELD':
        return {
          icon: <Target className="text-indigo-600" size={20} />,
          label: 'Mise à jour de champ',
          description: `${action.config?.field || 'champ'} = ${action.config?.value || 'valeur'}`,
        }
      default:
        return {
          icon: <Zap className="text-gray-600" size={20} />,
          label: type || 'Action',
          description: JSON.stringify(action.config).slice(0, 100),
        }
    }
  }

  // Helper: Calculer temps estimé basé sur nombre d'actions
  const getEstimatedDuration = (actions: any[]) => {
    const count = actions.length
    if (count <= 2) return '< 5 secondes'
    if (count <= 4) return '5-10 secondes'
    if (count <= 6) return '10-15 secondes'
    return '15-30 secondes'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="text-green-500" size={20} />
      case 'failed':
        return <XCircle className="text-red-500" size={20} />
      case 'skipped':
        return <MinusCircle className="text-yellow-500" size={20} />
      case 'running':
        return <Clock className="text-blue-500 animate-spin" size={20} />
      default:
        return <AlertCircle className="text-gray-500" size={20} />
    }
  }

  if (singleWorkflow.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
      </div>
    )
  }

  if (singleWorkflow.error || !singleWorkflow.data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {singleWorkflow.error || 'Workflow introuvable'}
        </div>
      </div>
    )
  }

  const workflow = singleWorkflow.data

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {workflow.name}
                </h1>
                {workflow.is_template && (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <BookTemplate size={16} />
                    Template
                  </span>
                )}
              </div>
              {workflow.description && (
                <p className="text-gray-600 dark:text-gray-400">{workflow.description}</p>
              )}
              {workflow.is_template && (
                <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-sm text-purple-900 dark:text-purple-200">
                    💡 <strong>Template en lecture seule</strong> - Ce workflow est un modèle prêt à l'emploi.
                    Utilisez le bouton "Utiliser ce template" pour créer votre propre version personnalisable.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {workflow.is_template ? (
                // Boutons pour TEMPLATE
                <button
                  onClick={handleDuplicate}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/30"
                  disabled={operation.isLoading}
                >
                  <Copy size={18} />
                  Utiliser ce template
                </button>
              ) : (
                // Boutons pour WORKFLOW PERSONNALISÉ
                <>
                  <button
                    onClick={() => setShowExecuteModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    disabled={operation.isLoading}
                  >
                    <Play size={18} />
                    Exécuter
                  </button>

                  <button
                    onClick={handleToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      workflow.status === 'active'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                    disabled={operation.isLoading}
                  >
                    {workflow.status === 'active' ? <Power size={18} /> : <PowerOff size={18} />}
                    {workflow.status === 'active' ? 'Actif' : 'Inactif'}
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    disabled={operation.isLoading}
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section "Comment ça marche?" pour les templates */}
        {workflow.is_template && (
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <Zap className="text-blue-600" size={28} />
              Comment ça marche?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Déclencheur */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Target className="text-blue-600" size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Déclencheur</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {getTriggerDescription(workflow.trigger_type, workflow.trigger_config)}
                </p>
              </div>

              {/* Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <ListTodo className="text-green-600" size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Actions</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  <strong>{workflow.actions.length} action{workflow.actions.length > 1 ? 's' : ''}</strong> seront exécutées automatiquement
                </p>
              </div>

              {/* Durée */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <CalendarClock className="text-purple-600" size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Durée</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  Temps d'exécution estimé: <strong>{getEstimatedDuration(workflow.actions)}</strong>
                </p>
              </div>
            </div>

            {/* Liste des actions détaillées */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="text-orange-600" size={20} />
                Ce workflow va automatiquement:
              </h3>
              <div className="space-y-3">
                {workflow.actions.map((action: any, idx: number) => {
                  const actionInfo = getActionDescription(action)
                  return (
                    <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        {actionInfo.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {actionInfo.label}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {actionInfo.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(['details', 'executions', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'details' && 'Détails'}
              {tab === 'executions' && 'Exécutions'}
              {tab === 'stats' && 'Statistiques'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Configuration
                </h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Type de trigger</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">
                      {workflow.trigger_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Statut</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">{workflow.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Exécutions</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">
                      {workflow.execution_count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Dernière exécution</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">
                      {workflow.last_executed_at
                        ? new Date(workflow.last_executed_at).toLocaleString()
                        : 'Jamais'}
                    </dd>
                  </div>
                </dl>
              </div>

              {workflow.trigger_config && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Configuration du trigger
                  </h3>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(workflow.trigger_config, null, 2)}
                  </pre>
                </div>
              )}

              {workflow.conditions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Conditions
                  </h3>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(workflow.conditions, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Actions ({workflow.actions.length})
                </h3>
                <div className="space-y-3">
                  {workflow.actions.map((action: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 dark:border-gray-700 rounded p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {action.type}
                        </span>
                      </div>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(action.config, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'executions' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Historique des exécutions
              </h3>

              {executions.isLoading ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Chargement...
                </div>
              ) : executions.data && executions.data.items.length > 0 ? (
                <div className="space-y-3">
                  {executions.data.items.map((exec) => (
                    <div
                      key={exec.id}
                      className="border border-gray-200 dark:border-gray-700 rounded p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(exec.status)}
                          <span className="font-medium text-gray-900 dark:text-white">
                            Exécution #{exec.id}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(exec.created_at).toLocaleString()}
                        </span>
                      </div>

                      {exec.trigger_entity_type && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Trigger: {exec.trigger_entity_type} #{exec.trigger_entity_id}
                        </p>
                      )}

                      {exec.error_message && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded text-sm">
                          {exec.error_message}
                        </div>
                      )}

                      {exec.started_at && exec.completed_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          Durée:{' '}
                          {(
                            (new Date(exec.completed_at).getTime() -
                              new Date(exec.started_at).getTime()) /
                            1000
                          ).toFixed(2)}
                          s
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Aucune exécution
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Statistiques
              </h3>

              {stats.isLoading ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Chargement...
                </div>
              ) : stats.data ? (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="text-blue-600" size={24} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total exécutions
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.data.total_executions}
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="text-green-600" size={24} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Taux de succès</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.data.success_rate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="text-purple-600" size={24} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Durée moyenne</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.data.avg_duration_seconds.toFixed(2)}s
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="text-green-600" size={24} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Succès</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.data.success_count}
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <XCircle className="text-red-600" size={24} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Échecs</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.data.failed_count}
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <MinusCircle className="text-yellow-600" size={24} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ignorés</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.data.skipped_count}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Aucune statistique disponible
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal exécution manuelle */}
        {showExecuteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Exécuter le workflow
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID de l'organisation
                </label>
                <input
                  type="number"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowExecuteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleExecute}
                  disabled={!entityId || operation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {operation.isLoading ? 'Exécution...' : 'Exécuter'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
