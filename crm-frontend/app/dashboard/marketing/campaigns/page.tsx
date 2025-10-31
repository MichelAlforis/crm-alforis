'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Mail, Edit, Trash2, Download, Copy } from 'lucide-react'
import { Card, CardHeader, CardBody, Button } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { useEmailCampaigns } from '@/hooks/useEmailAutomation'
import { useExport } from '@/hooks/useExport'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'
import { useCampaignStats } from '@/hooks/useCampaignStats'
import { useCampaignActions } from '@/hooks/useCampaignActions'
import { CampaignStatsCards, CampaignAlerts } from '@/components/marketing/CampaignStatsCards'
import type { EmailCampaign } from '@/lib/types'

const STATUS_COLORS = {
  draft: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-orange-100 text-orange-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
}

const STATUS_LABELS = {
  draft: 'Brouillon',
  scheduled: 'Programmée',
  sending: 'En cours',
  sent: 'Envoyée',
  failed: 'Échouée',
  paused: 'En pause',
}

export default function CampaignsPage() {
  const { campaigns, error, deleteCampaign, refetch } = useEmailCampaigns()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const { ConfirmDialogComponent } = useConfirm()
  const pagination = usePagination({ initialLimit: 20 })

  // Hook d'export avec filtres
  const { exportData, isExporting } = useExport({
    resource: 'email/campaigns',
    baseFilename: 'campagnes-email',
    params: statusFilter ? { status: statusFilter } : {},
  })

  // Statistiques via hook
  const stats = useCampaignStats(campaigns)

  // Actions via hook
  const { handleDelete, handleDuplicate } = useCampaignActions({
    onDelete: deleteCampaign,
    onRefetch: refetch,
  })

  // Filtrage des campagnes
  const filteredCampaigns = useMemo(() => {
    if (!statusFilter) return campaigns
    return campaigns.filter(c => c.status === statusFilter)
  }, [campaigns, statusFilter])

  // Column definitions
  const columns: ColumnV2<EmailCampaign>[] = [
    {
      header: 'Campagne',
      accessor: 'name',
      sticky: 'left',
      priority: 'high',
      minWidth: '200px',
      render: (value: string, row: EmailCampaign) => (
        <div>
          <Link href={`/dashboard/marketing/campaigns/${row.id}`} className="font-medium text-bleu hover:underline">
            {value}
          </Link>
          {row.subject && (
            <p className="text-xs text-gray-500 mt-0.5">Objet: {row.subject}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      priority: 'high',
      minWidth: '120px',
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[value as keyof typeof STATUS_COLORS] || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
          {STATUS_LABELS[value as keyof typeof STATUS_LABELS] || value}
        </span>
      ),
    },
    {
      header: 'Provider',
      accessor: 'provider',
      priority: 'medium',
      minWidth: '120px',
      render: (value: string) => (
        <span className="text-sm capitalize">{value || '-'}</span>
      ),
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      priority: 'medium',
      minWidth: '120px',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Programmée pour',
      accessor: 'scheduled_at',
      priority: 'low',
      minWidth: '140px',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString('fr-FR') : '-',
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: number, row: EmailCampaign) => {
        const actions: OverflowAction[] = []

        if (row.status === 'draft') {
          actions.push({
            label: 'Modifier',
            icon: Edit,
            onClick: () => window.location.href = `/dashboard/marketing/campaigns/new?edit=${id}`,
            variant: 'default',
          })
        } else {
          actions.push({
            label: 'Voir',
            icon: Eye,
            onClick: () => window.location.href = `/dashboard/marketing/campaigns/${id}`,
            variant: 'default',
          })
        }

        actions.push(
          {
            label: 'Dupliquer',
            icon: Copy,
            onClick: () => handleDuplicate(row),
            variant: 'default',
          },
          {
            label: 'Supprimer',
            icon: Trash2,
            onClick: () => handleDelete(row),
            variant: 'danger',
          }
        )

        return <OverflowMenu actions={actions} />
      },
    },
  ]

  return (
    <div className="space-y-spacing-lg p-spacing-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <Mail className="w-8 h-8 text-primary" />
            Dashboard Campagnes Email
          </h1>
          <p className="text-text-secondary mt-1">
            Gérez et analysez vos campagnes de marketing par email
          </p>
        </div>
        <Link href="/dashboard/marketing/campaigns/new">
          <Button variant="primary" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <CampaignStatsCards stats={stats} onFilterChange={setStatusFilter} />

      {/* Filtres de statut */}
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Filtre actif:</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[statusFilter as keyof typeof STATUS_COLORS]}`}>
            {STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}
          </span>
          <Button variant="ghost" size="xs" onClick={() => setStatusFilter(null)}>
            Réinitialiser
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-radius-md">
          Impossible de charger les campagnes
        </div>
      )}

      {/* Campaign Alerts */}
      <CampaignAlerts stats={stats} />

      {/* Table des campagnes */}
      <Card>
        <CardHeader
          title={`Campagnes (${filteredCampaigns.length})`}
          subtitle={statusFilter ? `Filtrées par statut: ${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}` : 'Toutes vos campagnes email'}
          icon={<Mail className="w-5 h-5 text-primary" />}
        />
        <CardBody>
          {/* Boutons d'export */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('csv')}
              disabled={isExporting || filteredCampaigns.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('excel')}
              disabled={isExporting || filteredCampaigns.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('pdf')}
              disabled={isExporting || filteredCampaigns.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>

          <TableV2<EmailCampaign>
            columns={columns}
            data={filteredCampaigns.slice(pagination.skip, pagination.skip + pagination.limit)}
            rowKey={(row: EmailCampaign) => row.id.toString()}
            size="md"
            variant="default"
            stickyHeader
            emptyMessage={statusFilter ? `Aucune campagne avec le statut "${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}"` : "Aucune campagne créée. Créez votre première campagne !"}
          />

          {/* Pagination personnalisée */}
          {filteredCampaigns.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                Page {Math.floor(pagination.skip / pagination.limit) + 1} sur {Math.ceil(filteredCampaigns.length / pagination.limit)} ({filteredCampaigns.length} campagnes au total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.setSkip(Math.max(0, pagination.skip - pagination.limit))}
                  disabled={pagination.skip === 0}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.setSkip(pagination.skip + pagination.limit)}
                  disabled={pagination.skip + pagination.limit >= filteredCampaigns.length}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </div>
  )
}
