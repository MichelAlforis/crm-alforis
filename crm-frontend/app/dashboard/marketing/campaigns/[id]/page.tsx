'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Eye, MousePointerClick, Ban, Send, Edit, Trash2, Plus, Clock, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { Card, Alert, Button } from '@/components/shared'
import { useEmailCampaign, useEmailCampaignStats } from '@/hooks/useEmailAutomation'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { useConfirm } from '@/hooks/useConfirm'
import { logger } from '@/lib/logger'

interface EmailSend {
  id: number
  campaign_id: number
  status: string
  scheduled_at?: string
  sent_at?: string
  created_at: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  failed_count: number
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    queued: { label: 'En file', className: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Programmé', className: 'bg-blue-100 text-blue-700' },
    sending: { label: 'En cours', className: 'bg-yellow-100 text-yellow-700' },
    sent: { label: 'Envoyé', className: 'bg-green-100 text-green-700' },
    completed: { label: 'Terminé', className: 'bg-success/20 text-success' },
    failed: { label: 'Échec', className: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-700' },
  }
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0

  const { data: campaign, isLoading, error, refetch } = useEmailCampaign(campaignId)
  const { data: stats } = useEmailCampaignStats(campaignId)
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()

  const [sends, setSends] = useState<EmailSend[]>([])
  const [totalSends, setTotalSends] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [isLoadingSends, setIsLoadingSends] = useState(false)

  // Charger les batches d'envois avec pagination
  useEffect(() => {
    const loadSends = async () => {
      setIsLoadingSends(true)
      try {
        const skip = (page - 1) * limit
        const response = await apiClient.get<{ items: EmailSend[], total: number }>(
          `/email/campaigns/${campaignId}/batches`,
          { params: { skip, limit } }
        )
        setSends(response.data.items || [])
        setTotalSends(response.data.total || 0)
      } catch (error) {
        logger.error('Failed to load batches:', error)
      } finally {
        setIsLoadingSends(false)
      }
    }

    if (campaignId) {
      loadSends()
    }
  }, [campaignId, page, limit])

  const handleCreateNewSend = () => {
    router.push(`/dashboard/marketing/campaigns/${campaignId}/new`)
  }

  const handleViewSendStats = (sendId: number) => {
    router.push(`/dashboard/marketing/campaigns/${campaignId}/sends/${sendId}`)
  }

  const handleEditCampaign = () => {
    router.push(`/dashboard/marketing/campaigns/${campaignId}/edit`)
  }

  const handleDeleteCampaign = async () => {
    if (!campaign) return

    const confirmed = await confirm({
      title: 'Supprimer la campagne ?',
      message: `Êtes-vous sûr de vouloir supprimer "${campaign.name}" ? Cette action supprimera également tous les envois associés.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    })

    if (confirmed) {
      try {
        await apiClient.delete(`/email/campaigns/${campaign.id}`)
        showToast({
          type: 'success',
          title: 'Campagne supprimée',
        })
        router.push('/dashboard/marketing/campaigns')
      } catch (error: any) {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: error?.response?.data?.detail || 'Impossible de supprimer la campagne',
        })
      }
    }
  }

  if (isLoading) return <div className="p-6">Chargement...</div>
  if (error || !campaign) return <div className="p-6"><Alert type="error" message="Campagne introuvable" /></div>

  const totalPages = Math.ceil(totalSends / limit)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/marketing/campaigns" className="inline-flex items-center text-sm text-primary hover:underline mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux campagnes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-text-secondary mt-2">{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditCampaign}
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteCampaign}
              leftIcon={<Trash2 className="w-4 h-4 text-error" />}
            >
              Supprimer
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateNewSend}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nouvel envoi
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total envoyé</p>
              <p className="text-2xl font-bold text-text-primary">{stats?.total_sent || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Eye className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Taux d'ouverture</p>
              <p className="text-2xl font-bold text-text-primary">
                {((stats?.open_rate || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {stats?.total_opened || 0} ouvertures
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MousePointerClick className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Taux de clic</p>
              <p className="text-2xl font-bold text-text-primary">
                {((stats?.click_rate || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {stats?.total_clicked || 0} clics
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-error/10 rounded-lg">
              <Ban className="w-5 h-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Taux de rebond</p>
              <p className="text-2xl font-bold text-text-primary">
                {((stats?.bounce_rate || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {stats?.total_bounced || 0} rebonds
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Liste des envois */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Historique des envois
            </h2>
          </div>

          {isLoadingSends ? (
            <div className="text-center py-8 text-text-secondary">Chargement des envois...</div>
          ) : sends.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-text-secondary mb-2">Aucun envoi pour cette campagne</p>
              <p className="text-sm text-text-tertiary mb-4">
                Créez votre premier envoi pour démarrer votre campagne email
              </p>
              <Button
                variant="primary"
                onClick={handleCreateNewSend}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer un envoi
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Destinataires
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Envoyés
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Ouverts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Cliqués
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sends.map((send) => (
                      <tr key={send.id} className="hover:bg-muted/5 cursor-pointer" onClick={() => handleViewSendStats(send.id)}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">
                            {(send as any).name || 'Sans nom'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(send.status)}
                            {send.status === 'scheduled' && send.scheduled_at && (
                              <span className="text-xs text-text-tertiary flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(send.scheduled_at).toLocaleString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-text-primary">
                            {send.total_recipients || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-primary">
                            {send.sent_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-text-primary">
                              {send.opened_count || 0}
                            </span>
                            {send.sent_count > 0 && (
                              <span className="text-xs text-text-tertiary">
                                {((send.opened_count / send.sent_count) * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-text-primary">
                              {send.clicked_count || 0}
                            </span>
                            {send.sent_count > 0 && (
                              <span className="text-xs text-text-tertiary">
                                {((send.clicked_count / send.sent_count) * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {send.sent_at
                            ? new Date(send.sent_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Non envoyé'}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewSendStats(send.id)
                            }}
                            leftIcon={<Eye className="w-4 h-4" />}
                          >
                            Voir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-text-secondary">
                    Affichage {((page - 1) * limit) + 1} à {Math.min(page * limit, totalSends)} sur {totalSends}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-text-secondary">
                      Page {page} sur {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </div>
  )
}
