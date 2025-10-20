'use client'

import React, { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, Pause, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, Button, Table, Alert } from '@/components/shared'
import { useWorkflows, type WorkflowExecution } from '@/hooks/useWorkflows'
import { useToast } from '@/components/ui/Toast'

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Terminé' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Échec' },
  running: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100', label: 'En cours' },
  pending: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'En attente' },
  skipped: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Ignoré' },
}

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>()
  const workflowId = params?.id ? parseInt(params.id, 10) : 0

  const {
    singleWorkflow,
    executions,
    stats,
    fetchWorkflow,
    fetchExecutions,
    fetchStats,
    toggleWorkflow,
    operation,
  } = useWorkflows()
  const { showToast } = useToast()

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow(workflowId)
      fetchExecutions(workflowId, 0, 20)
      fetchStats(workflowId)
    }
  }, [workflowId, fetchWorkflow, fetchExecutions, fetchStats])

  const handleToggle = async () => {
    if (!singleWorkflow.data) return
    try {
      const newStatus = singleWorkflow.data.status === 'active' ? 'inactive' : 'active'
      await toggleWorkflow(workflowId, newStatus)
      showToast({
        type: 'success',
        title: newStatus === 'active' ? 'Workflow activé' : 'Workflow désactivé',
      })
      fetchWorkflow(workflowId)
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err?.message || 'Impossible de modifier le workflow.',
      })
    }
  }

  if (singleWorkflow.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-bleu" />
      </div>
    )
  }

  if (singleWorkflow.error || !singleWorkflow.data) {
    return <Alert type="error" message="Workflow introuvable" />
  }

  const workflow = singleWorkflow.data
  const executionsList = executions.data?.items || []
  const workflowStats = stats.data

  const columns = [
    {
      header: 'Statut',
      accessor: 'status',
      render: (value: string) => {
        const config = STATUS_CONFIG[value as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
        const Icon = config.icon
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bg} ${config.color} text-xs font-medium`}>
            <Icon className={`w-3 h-3 ${value === 'running' ? 'animate-spin' : ''}`} />
            {config.label}
          </span>
        )
      },
    },
    {
      header: 'Début',
      accessor: 'started_at',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString('fr-FR') : '-',
    },
    {
      header: 'Fin',
      accessor: 'completed_at',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString('fr-FR') : '-',
    },
    {
      header: 'Entité',
      accessor: 'trigger_entity_type',
      render: (value: string | undefined, row: WorkflowExecution) =>
        value ? `${value} #${row.trigger_entity_id}` : '-',
    },
    {
      header: 'Erreur',
      accessor: 'error_message',
      render: (value: string | undefined) =>
        value ? <span className="text-red-600 text-sm truncate max-w-xs block" title={value}>{value}</span> : '-',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/workflows" className="inline-flex items-center text-sm text-bleu hover:underline mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux workflows
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ardoise">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-gray-600 mt-1">{workflow.description}</p>
            )}
          </div>
          {workflow.status !== 'draft' && (
            <Button
              variant={workflow.status === 'active' ? 'secondary' : 'primary'}
              onClick={handleToggle}
              disabled={operation.isLoading}
            >
              {workflow.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Désactiver
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activer
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-bleu">{workflow.execution_count}</div>
          <p className="text-gray-600 text-sm mt-1">Exécutions totales</p>
        </Card>
        <Card className="text-center">
          <div className={`text-3xl font-bold ${workflow.status === 'active' ? 'text-green-600' : workflow.status === 'draft' ? 'text-gray-400' : 'text-orange-600'}`}>
            {workflow.status === 'active' ? 'Actif' : workflow.status === 'draft' ? 'Brouillon' : 'Inactif'}
          </div>
          <p className="text-gray-600 text-sm mt-1">Statut</p>
        </Card>
        <Card className="text-center">
          {workflowStats ? (
            <>
              <div className="text-3xl font-bold text-green-600">
                {workflowStats.success_rate ? (workflowStats.success_rate * 100).toFixed(1) + '%' : '0%'}
              </div>
              <p className="text-gray-600 text-sm mt-1">Taux de succès</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-gray-300">-</div>
              <p className="text-gray-600 text-sm mt-1">Taux de succès</p>
            </>
          )}
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {workflow.last_executed_at
              ? new Date(workflow.last_executed_at).toLocaleDateString('fr-FR')
              : 'Jamais'}
          </div>
          <p className="text-gray-600 text-sm mt-1">Dernière exécution</p>
        </Card>
      </div>

      {workflowStats && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Statistiques d'exécution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Succès</p>
              <p className="text-2xl font-bold text-green-600">{workflowStats.success_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Échecs</p>
              <p className="text-2xl font-bold text-red-600">{workflowStats.failed_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ignorés</p>
              <p className="text-2xl font-bold text-gray-600">{workflowStats.skipped_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Durée moyenne</p>
              <p className="text-2xl font-bold text-bleu">
                {workflowStats.avg_duration_seconds ? workflowStats.avg_duration_seconds.toFixed(2) + 's' : '-'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold mb-4">Historique des exécutions ({executionsList.length})</h2>
        <Table
          data={executionsList}
          columns={columns}
          isLoading={executions.isLoading}
          isEmpty={!executions.isLoading && executionsList.length === 0}
          emptyMessage="Aucune exécution enregistrée."
        />
      </Card>
    </div>
  )
}
