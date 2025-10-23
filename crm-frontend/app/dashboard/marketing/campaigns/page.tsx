'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Mail, Send, Clock, CheckCircle, XCircle, TrendingUp, Users, Calendar, Edit, Trash2, Download, Copy } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Table } from '@/components/shared'
import { useEmailCampaigns } from '@/hooks/useEmailAutomation'
import { useExport } from '@/hooks/useExport'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import type { EmailCampaign } from '@/lib/types'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
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
  const { campaigns, isLoading, error, deleteCampaign, isDeleting, refetch } = useEmailCampaigns()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const { showToast } = useToast()

  // Hook d'export avec filtres
  const { exportData, isExporting } = useExport({
    resource: 'email/campaigns',
    baseFilename: 'campagnes-email',
    params: statusFilter ? { status: statusFilter } : {},
  })

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

  // Handler pour supprimer une campagne
  const handleDelete = (campaign: EmailCampaign) => {
    // Ne permettre la suppression que des brouillons ou des campagnes terminées
    if (campaign.status === 'sending' || campaign.status === 'scheduled') {
      confirm({
        title: 'Suppression impossible',
        message: 'Vous ne pouvez pas supprimer une campagne en cours d\'envoi ou programmée. Veuillez d\'abord la mettre en pause.',
        type: 'warning',
        confirmText: 'Compris',
        onConfirm: () => {},
      })
      return
    }

    confirm({
      title: 'Supprimer la campagne ?',
      message: `Êtes-vous sûr de vouloir supprimer "${campaign.name}" ? Cette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        await deleteCampaign(campaign.id)
      },
    })
  }

  // Handler pour dupliquer une campagne
  const handleDuplicate = async (campaign: EmailCampaign) => {
    try {
      // Créer une copie de la campagne avec un nouveau nom
      const duplicatedCampaign = {
        name: `${campaign.name} (Copie)`,
        description: campaign.description,
        subject: campaign.subject,
        default_template_id: campaign.default_template_id,
        provider: campaign.provider,
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        recipient_filters: campaign.recipient_filters,
        batch_size: campaign.batch_size,
        delay_between_batches: campaign.delay_between_batches,
        track_opens: campaign.track_opens,
        track_clicks: campaign.track_clicks,
        // Status toujours draft pour une copie
        status: 'draft',
      }

      await apiClient.post('/email/campaigns', duplicatedCampaign)

      showToast({
        type: 'success',
        title: 'Campagne dupliquée',
        message: `La campagne "${campaign.name}" a été dupliquée avec succès`,
      })

      refetch()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.response?.data?.detail || 'Impossible de dupliquer la campagne',
      })
    }
  }

  const columns = [
    {
      header: 'Campagne',
      accessor: 'name',
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
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[value as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABELS[value as keyof typeof STATUS_LABELS] || value}
        </span>
      ),
    },
    {
      header: 'Provider',
      accessor: 'provider',
      render: (value: string) => (
        <span className="text-sm capitalize">{value || '-'}</span>
      ),
    },
    {
      header: 'Créée le',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      header: 'Programmée pour',
      accessor: 'scheduled_at',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleString('fr-FR') : '-',
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: number, row: EmailCampaign) => (
        <div className="flex items-center gap-2">
          {row.status === 'draft' ? (
            <Link href={`/dashboard/marketing/campaigns/new?edit=${id}`}>
              <Button variant="ghost" size="sm" title="Modifier le brouillon">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link href={`/dashboard/marketing/campaigns/${id}`}>
              <Button variant="ghost" size="sm" title="Voir les détails">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDuplicate(row)}
            title="Dupliquer"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            disabled={isDeleting}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </Button>
        </div>
      ),
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
                <p className="text-3xl font-bold text-gray-700 mt-1">{stats.draft}</p>
                <p className="text-xs text-text-secondary mt-1">À terminer</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-600" />
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
          <CardHeader
            title={`${stats.sending} campagne(s) en cours d'envoi`}
            subtitle="Envoi en temps réel"
            icon={<Send className="w-5 h-5 text-orange-600" />}
          />
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
          <CardHeader
            title={`${stats.failed} campagne(s) échouée(s)`}
            subtitle="Attention requise"
            icon={<XCircle className="w-5 h-5 text-error" />}
          />
          <CardBody>
            <div className="flex items-center gap-2 text-sm text-error">
              <span>Veuillez vérifier les campagnes échouées et les relancer si nécessaire</span>
            </div>
          </CardBody>
        </Card>
      )}

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

          <Table
            data={filteredCampaigns}
            columns={columns}
            isLoading={isLoading}
            isEmpty={!isLoading && filteredCampaigns.length === 0}
            emptyMessage={statusFilter ? `Aucune campagne avec le statut "${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}"` : "Aucune campagne créée. Créez votre première campagne !"}
          />
        </CardBody>
      </Card>

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </div>
  )
}
