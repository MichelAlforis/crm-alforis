'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Eye, MousePointerClick, Ban, Clock, Calendar, User, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

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

interface EmailSendDetail {
  id: number
  send_id: number
  recipient_email: string
  recipient_name?: string
  status: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  error_message?: string
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    queued: { label: 'En file', className: 'bg-gray-100 text-gray-700' },
    sending: { label: 'En cours', className: 'bg-yellow-100 text-yellow-700' },
    sent: { label: 'Envoyé', className: 'bg-green-100 text-green-700' },
    delivered: { label: 'Délivré', className: 'bg-success/20 text-success' },
    opened: { label: 'Ouvert', className: 'bg-primary/20 text-primary' },
    clicked: { label: 'Cliqué', className: 'bg-purple-100 text-purple-700' },
    failed: { label: 'Échec', className: 'bg-red-100 text-red-700' },
    bounced: { label: 'Rebond', className: 'bg-orange-100 text-orange-700' },
  }
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export default function SendStatsPage() {
  const params = useParams<{ id: string; sendId: string }>()
  const router = useRouter()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0
  const sendId = params?.sendId ? parseInt(params.sendId, 10) : 0
  const { showToast } = useToast()

  const [send, setSend] = useState<EmailSend | null>(null)
  const [details, setDetails] = useState<EmailSendDetail[]>([])
  const [totalDetails, setTotalDetails] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Charger les données de l'envoi
  useEffect(() => {
    const loadSend = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.get<EmailSend>(`/email/campaigns/${campaignId}/sends/${sendId}`)
        setSend(response.data)
      } catch (error) {
        console.error('Failed to load send:', error)
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de charger les données de l\'envoi',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId && sendId) {
      loadSend()
    }
  }, [campaignId, sendId, showToast])

  // Charger les détails des envois avec filtres
  useEffect(() => {
    const loadDetails = async () => {
      try {
        setIsLoadingDetails(true)
        const skip = (page - 1) * limit
        const params: any = { skip, limit }

        if (statusFilter) params.status = statusFilter
        if (searchQuery) params.search = searchQuery

        const response = await apiClient.get<{ items: EmailSendDetail[], total: number }>(
          `/email/sends/${sendId}/details`,
          { params }
        )
        setDetails(response.data.items || [])
        setTotalDetails(response.data.total || 0)
      } catch (error) {
        console.error('Failed to load send details:', error)
      } finally {
        setIsLoadingDetails(false)
      }
    }

    if (sendId) {
      loadDetails()
    }
  }, [sendId, page, limit, statusFilter, searchQuery])

  if (isLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!send) {
    return (
      <div className="p-6">
        <Alert type="error" message="Envoi introuvable" />
      </div>
    )
  }

  const totalPages = Math.ceil(totalDetails / limit)
  const openRate = send.sent_count > 0 ? (send.opened_count / send.sent_count) * 100 : 0
  const clickRate = send.sent_count > 0 ? (send.clicked_count / send.sent_count) * 100 : 0
  const bounceRate = send.sent_count > 0 ? (send.bounced_count / send.sent_count) * 100 : 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/marketing/campaigns/${campaignId}`}
          className="inline-flex items-center text-sm text-primary hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la campagne
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Statistiques de l'envoi</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {send.sent_at
              ? `Envoyé le ${new Date(send.sent_at).toLocaleString('fr-FR')}`
              : send.scheduled_at
              ? `Programmé pour le ${new Date(send.scheduled_at).toLocaleString('fr-FR')}`
              : `Créé le ${new Date(send.created_at).toLocaleString('fr-FR')}`}
          </div>
          {getStatusBadge(send.status)}
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Destinataires</p>
              <p className="text-2xl font-bold text-text-primary">{send.total_recipients}</p>
              <p className="text-xs text-text-tertiary mt-1">
                {send.sent_count} envoyés
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Eye className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Ouvertures</p>
              <p className="text-2xl font-bold text-text-primary">{send.opened_count}</p>
              <p className="text-xs text-text-tertiary mt-1">
                {openRate.toFixed(1)}% taux d'ouverture
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
              <p className="text-xs text-text-secondary">Clics</p>
              <p className="text-2xl font-bold text-text-primary">{send.clicked_count}</p>
              <p className="text-xs text-text-tertiary mt-1">
                {clickRate.toFixed(1)}% taux de clic
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
              <p className="text-xs text-text-secondary">Rebonds</p>
              <p className="text-2xl font-bold text-text-primary">{send.bounced_count}</p>
              <p className="text-xs text-text-tertiary mt-1">
                {bounceRate.toFixed(1)}% taux de rebond
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Liste des destinataires */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Détails par destinataire</h2>
          </div>
        </CardHeader>
        <CardBody>
          {/* Filtres et recherche */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm bg-white"
              >
                <option value="">Tous les statuts</option>
                <option value="queued">En file</option>
                <option value="sending">En cours</option>
                <option value="sent">Envoyé</option>
                <option value="delivered">Délivré</option>
                <option value="opened">Ouvert</option>
                <option value="clicked">Cliqué</option>
                <option value="failed">Échec</option>
                <option value="bounced">Rebond</option>
              </select>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="text-center py-8 text-text-secondary">Chargement...</div>
          ) : details.length === 0 ? (
            <Alert type="info" message="Aucun destinataire trouvé avec ces critères" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Destinataire
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Envoyé
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Ouvert
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                        Cliqué
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {details.map((detail) => (
                      <tr key={detail.id} className="hover:bg-muted/5">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-text-primary">
                            {detail.recipient_email}
                          </div>
                          {detail.recipient_name && (
                            <div className="text-xs text-text-tertiary">
                              {detail.recipient_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(detail.status)}
                          {detail.error_message && (
                            <div className="text-xs text-error mt-1" title={detail.error_message}>
                              Erreur
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {detail.sent_at
                            ? new Date(detail.sent_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {detail.opened_at
                            ? new Date(detail.opened_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {detail.clicked_at
                            ? new Date(detail.clicked_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
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
                    Affichage {((page - 1) * limit) + 1} à {Math.min(page * limit, totalDetails)} sur {totalDetails}
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
        </CardBody>
      </Card>
    </div>
  )
}
