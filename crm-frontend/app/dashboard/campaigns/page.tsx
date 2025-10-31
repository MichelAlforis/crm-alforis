'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Mail, Send, Clock, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardHeader, CardBody, Button } from '@/components/shared'
import { TableV2, ColumnV2 } from '@/components/shared/TableV2'
import { OverflowMenu, OverflowAction } from '@/components/shared/OverflowMenu'
import { useEmailCampaigns } from '@/hooks/useEmailAutomation'
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
  const { campaigns, isLoading: _isLoading, error } = useEmailCampaigns()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Calcul des statistiques
  const stats = useMemo(() => {
    const totalCampaigns = campaigns.length
    const draftCampaigns = campaigns.filter(c => c.status === 'draft').length
    const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled').length
    const sentCampaigns = campaigns.filter(c => c.status === 'sent').length
    const failedCampaigns = campaigns.filter(c => c.status === 'failed').length
    const sendingCampaigns = campaigns.filter(c => c.status === 'sending').length

    return {
      total: totalCampaigns,
      draft: draftCampaigns,
      scheduled: scheduledCampaigns,
      sent: sentCampaigns,
      failed: failedCampaigns,
      sending: sendingCampaigns,
    }
  }, [campaigns])

  // Filtrage des campagnes
  const filteredCampaigns = useMemo(() => {
    if (!statusFilter) return campaigns
    return campaigns.filter(c => c.status === statusFilter)
  }, [campaigns, statusFilter])

  const columns: ColumnV2<EmailCampaign>[] = [
    {
      header: 'Campagne',
      accessor: 'name',
      sticky: 'left',
      priority: 'high',
      minWidth: '200px',
      render: (value: unknown, row: EmailCampaign, _index: number) => (
        <div>
          <Link href={`/dashboard/campaigns/${row.id}`} className="font-medium text-bleu hover:underline">
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
      render: (value: unknown) => (
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
      render: (value: unknown) => (
        <span className="text-sm capitalize">{value || '-'}</span>
      ),
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      priority: 'medium',
      minWidth: '120px',
      render: (value: unknown) => new Date(value).toLocaleDateString('fr-FR'),
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
      render: (_: unknown) => {
        const actions: OverflowAction[] = [
          {
            label: 'Voir',
            icon: Eye,
            onClick: () => window.location.href = `/dashboard/campaigns/${id}`,
            variant: 'default',
          },
        ]
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
        <Link href="/dashboard/campaigns/new">
          <Button variant="primary" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-spacing-md">
        {/* Total */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter(null)}>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Total</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{stats.total}</p>
                <p className="text-xs text-text-secondary mt-1">Toutes les campagnes</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Brouillons */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('draft')}>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Brouillons</p>
                <p className="text-3xl font-bold text-gray-700 dark:text-slate-300 mt-1">{stats.draft}</p>
                <p className="text-xs text-text-secondary mt-1">À terminer</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-600 dark:text-slate-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Programmées */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('scheduled')}>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Programmées</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{stats.scheduled}</p>
                <p className="text-xs text-text-secondary mt-1">En attente d'envoi</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Envoyées */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('sent')}>
          <CardBody className="p-spacing-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Envoyées</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{stats.sent}</p>
                <p className="text-xs text-text-secondary mt-1">Campagnes terminées</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

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

      {/* Campagnes actives (en cours d'envoi) */}
      {stats.sending > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {`${stats.sending} campagne(s) en cours d'envoi`}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">Envoi en temps réel</p>
              </div>
              <Send className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2 text-sm text-orange-800">
              <TrendingUp className="w-4 h-4" />
              <span>Les emails sont en cours d'envoi...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Campagnes échouées */}
      {stats.failed > 0 && (
        <Card className="border-error/20 bg-error/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {`${stats.failed} campagne(s) échouée(s)`}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">Attention requise</p>
              </div>
              <XCircle className="w-5 h-5 text-error" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2 text-sm text-error">
              <span>Veuillez vérifier les campagnes échouées et les relancer si nécessaire</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Table des campagnes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                {`Campagnes (${filteredCampaigns.length})`}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {statusFilter
                  ? `Filtrées par statut: ${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}`
                  : 'Toutes vos campagnes email'}
              </p>
            </div>
            <Mail className="w-5 h-5 text-primary" />
          </div>
        </CardHeader>
        <CardBody>
          <TableV2<EmailCampaign>
            columns={columns}
            data={filteredCampaigns}
            rowKey={(row) => row.id.toString()}
            size="md"
            variant="default"
            stickyHeader
            emptyMessage={statusFilter ? `Aucune campagne avec le statut "${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}"` : "Aucune campagne créée. Créez votre première campagne !"}
          />
        </CardBody>
      </Card>
    </div>
  )
}
