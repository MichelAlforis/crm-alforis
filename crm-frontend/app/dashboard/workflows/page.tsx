'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play, Pause, Eye, Zap, AlertCircle, Plus } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Table, Alert } from '@/components/shared'
import { useWorkflows, type Workflow } from '@/hooks/useWorkflows'
import { useToast } from '@/components/ui/Toast'

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manuel',
  on_organisation_created: 'Nouvelle organisation',
  on_mandat_signed: 'Mandat signé',
  on_task_completed: 'Tâche terminée',
  scheduled: 'Programmé',
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const {
    workflows,
    fetchWorkflows,
    toggleWorkflow,
    operation,
  } = useWorkflows()
  const { showToast } = useToast()

  useEffect(() => {
    const filters = filterStatus === 'all' ? {} : { status: filterStatus }
    fetchWorkflows(0, 100, filters)
  }, [filterStatus, fetchWorkflows])

  const handleToggle = async (workflow: Workflow) => {
    try {
      const newStatus = workflow.status === 'active' ? 'inactive' : 'active'
      await toggleWorkflow(workflow.id, newStatus)
      showToast({
        type: 'success',
        title: newStatus === 'active' ? 'Workflow activé' : 'Workflow désactivé',
        message: `Le workflow "${workflow.name}" a été ${newStatus === 'active' ? 'activé' : 'désactivé'}.`,
      })
      // Refresh list
      fetchWorkflows(0, 100, filterStatus === 'all' ? {} : { status: filterStatus })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err?.message || 'Impossible de modifier le workflow.',
      })
    }
  }

  const workflowsList = workflows.data?.items || []

  const columns = [
    {
      header: 'Nom',
      accessor: 'name',
      render: (value: string, row: Workflow) => (
        <div>
          <Link href={`/dashboard/workflows/${row.id}`} className="font-medium text-bleu hover:underline">
            {value}
          </Link>
          {row.description && (
            <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Déclencheur',
      accessor: 'trigger_type',
      render: (value: string) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
          <Zap className="w-3 h-3" />
          {TRIGGER_LABELS[value] || value}
        </span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value: string) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            value === 'active'
              ? 'bg-green-100 text-green-700'
              : value === 'draft'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-orange-100 text-orange-700'
          }`}
        >
          {value === 'active' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {value === 'active' ? 'Actif' : value === 'draft' ? 'Brouillon' : 'Inactif'}
        </span>
      ),
    },
    {
      header: 'Exécutions',
      accessor: 'execution_count',
      render: (value: number, row: Workflow) => (
        <div className="text-sm">
          <div className="font-medium">{value.toLocaleString()}</div>
          {row.last_executed_at && (
            <div className="text-xs text-gray-500">
              Dernier: {new Date(row.last_executed_at).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: number, row: Workflow) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggle(row)}
            disabled={operation.isLoading || row.status === 'draft'}
            title={row.status === 'draft' ? 'Les brouillons ne peuvent pas être activés' : ''}
          >
            {row.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Link href={`/dashboard/workflows/${row.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Workflows</h1>
          <p className="text-gray-600 mt-1">
            Automatisez vos processus avec des workflows personnalisés
          </p>
        </div>
        <Button
          onClick={() => router.push('/workflows/new')}
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouveau Workflow
        </Button>
      </div>

      {workflows.error && (
        <Alert type="error" message={workflows.error} />
      )}

      <Card>
        <CardHeader
          title={`Workflows (${workflowsList.length})`}
          subtitle="Gérez vos automatisations"
          action={
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          }
        />
        <CardBody>
          <Table
            data={workflowsList}
            columns={columns}
            isLoading={workflows.isLoading}
            isEmpty={!workflows.isLoading && workflowsList.length === 0}
            emptyMessage="Aucun workflow configuré."
          />
        </CardBody>
      </Card>

      {workflowsList.length === 0 && !workflows.isLoading && (
        <div className="text-center py-12 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun workflow</h3>
          <p className="text-gray-600 mb-4">
            Les workflows permettent d'automatiser vos processus métier.
          </p>
          <Button
            onClick={() => router.push('/workflows/new')}
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Créer votre premier workflow
          </Button>
        </div>
      )}
    </div>
  )
}
