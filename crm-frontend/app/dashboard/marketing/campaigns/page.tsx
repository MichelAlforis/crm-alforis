'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Mail, Edit, Trash2, Download, Copy } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, PageContainer, PageHeader, PageSection } from '@/components/shared'
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
  draft: 'bg-surface-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-secondary',
  scheduled: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  sending: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light',
  sent: 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light',
  failed: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light',
  paused: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light',
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
    onDelete: async (id: number) => {
      await deleteCampaign(id)
    },
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
      render: (value: unknown, row: EmailCampaign, _index: number) => (
        <div>
          <Link href={`/dashboard/marketing/campaigns/${row.id}`} className="font-medium text-bleu hover:underline">
            {value}
          </Link>
          {row.subject && (
            <p className="text-fluid-xs text-text-tertiary mt-0.5">Objet: {row.subject}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Statut',
      accessor: 'status',
      priority: 'high',
      minWidth: '120px',
      render: (value: unknown, _row, _index: number) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-fluid-xs font-medium ${STATUS_COLORS[value as keyof typeof STATUS_COLORS] || 'bg-surface-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-secondary'}`}>
          {STATUS_LABELS[value as keyof typeof STATUS_LABELS] || value}
        </span>
      ),
    },
    {
      header: 'Provider',
      accessor: 'provider',
      priority: 'medium',
      minWidth: '120px',
      render: (value: unknown, _row, _index: number) => (
        <span className="text-fluid-sm capitalize">{value || '-'}</span>
      ),
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      priority: 'medium',
      minWidth: '120px',
      render: (value: unknown, _row, _index: number) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Programmée pour',
      accessor: 'scheduled_at',
      priority: 'low',
      minWidth: '140px',
      render: (value: unknown, _row, _index: number) =>
        value ? new Date(value).toLocaleString('fr-FR') : '-',
    },
    {
      header: 'Actions',
      accessor: 'id',
      sticky: 'right',
      priority: 'high',
      minWidth: '120px',
      render: (id: unknown, row: EmailCampaign, _index: number) => {
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
    <PageContainer width="default">
      <PageHeader
        title="Dashboard Campagnes Email"
        subtitle="Gérez et analysez vos campagnes de marketing par email"
        icon={<Mail className="w-8 h-8 text-primary" />}
        actions={
          <Link href="/dashboard/marketing/campaigns/new">
            <Button variant="primary" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle campagne
            </Button>
          </Link>
        }
      />

      <PageSection>
        {/* KPI Cards */}
        <CampaignStatsCards stats={stats} onFilterChange={setStatusFilter} />

        {/* Filtres de statut */}
        {statusFilter && (
          <div className="flex items-center gap-spacing-sm">
            <span className="text-fluid-sm text-text-secondary">Filtre actif:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-fluid-sm font-medium ${STATUS_COLORS[statusFilter as keyof typeof STATUS_COLORS]}`}>
              {STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}
            </span>
            <Button variant="ghost" size="xs" onClick={() => setStatusFilter(null)}>
              Réinitialiser
            </Button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-spacing-md py-spacing-sm rounded-radius-md">
            Impossible de charger les campagnes
          </div>
        )}

        {/* Campaign Alerts */}
        <CampaignAlerts stats={stats} />
      </PageSection>

      <PageSection>
        {/* Table des campagnes */}
        <Card>
        <CardHeader
          title={`Campagnes (${filteredCampaigns.length})`}
          subtitle={statusFilter ? `Filtrées par statut: ${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}` : 'Toutes vos campagnes email'}
          icon={<Mail className="w-5 h-5 text-primary" />}
        />
        <CardBody>
          {/* Boutons d'export */}
          <div className="flex items-center justify-end gap-spacing-sm mb-spacing-md">
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
            mobileCollapse={true}
            emptyMessage={statusFilter ? `Aucune campagne avec le statut "${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}"` : "Aucune campagne créée. Créez votre première campagne !"}
          />

          {/* Pagination personnalisée */}
          {filteredCampaigns.length > 0 && (
            <div className="flex items-center justify-between mt-spacing-md pt-spacing-md border-t border-border">
              <div className="text-fluid-sm text-text-secondary">
                Page {Math.floor(pagination.skip / pagination.limit) + 1} sur {Math.ceil(filteredCampaigns.length / pagination.limit)} ({filteredCampaigns.length} campagnes au total)
              </div>
              <div className="flex items-center gap-spacing-sm">
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
      </PageSection>

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </PageContainer>
  )
}
