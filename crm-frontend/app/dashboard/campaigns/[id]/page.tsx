'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Eye, MousePointerClick, Ban, Send, Loader2, PlayCircle, Pause } from 'lucide-react'
import { Card, Alert, Button } from '@/components/shared'
import { useEmailCampaign, useEmailCampaignStats } from '@/hooks/useEmailAutomation'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { useConfirm } from '@/hooks/useConfirm'

const STATUS_COLORS = {
  draft: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-orange-100 text-orange-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0

  const { data: campaign, isLoading, error, refetch } = useEmailCampaign(campaignId)
  const { data: stats } = useEmailCampaignStats(campaignId)
  const { showToast } = useToast()
  const { confirm: openConfirm, ConfirmDialogComponent } = useConfirm()

  const [isPreparing, setIsPreparing] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const handlePrepareCampaign = () => {
    openConfirm({
      title: 'Préparer la campagne',
      message: 'Cette action va générer tous les emails personnalisés. Continuer ?',
      confirmText: 'Préparer',
      type: 'warning',
      onConfirm: async () => {
        setIsPreparing(true)
        try {
          const response = await apiClient.post<{ emails_prepared: number }>(
            `/email/campaigns/campaigns/${campaignId}/prepare`
          )
          showToast({
            type: 'success',
            title: `${response.data.emails_prepared} emails préparés avec succès`,
          })
          await refetch()
        } catch (err: any) {
          showToast({
            type: 'error',
            title: err?.response?.data?.detail || 'Erreur lors de la préparation',
          })
        } finally {
          setIsPreparing(false)
        }
      },
    })
  }

  const handleStartCampaign = () => {
    openConfirm({
      title: 'Démarrer la campagne',
      message: `Êtes-vous sûr de vouloir démarrer l'envoi de cette campagne ? Cette action ne peut pas être annulée.`,
      confirmText: "Démarrer l'envoi",
      type: 'danger',
      onConfirm: async () => {
        setIsStarting(true)
        try {
          await apiClient.post(`/email/campaigns/campaigns/${campaignId}/start`)
          showToast({
            type: 'success',
            title: 'Campagne démarrée avec succès',
          })
          await refetch()
        } catch (err: any) {
          showToast({
            type: 'error',
            title: err?.response?.data?.detail || 'Erreur lors du démarrage',
          })
        } finally {
          setIsStarting(false)
        }
      },
    })
  }

  const handlePauseCampaign = () => {
    openConfirm({
      title: 'Mettre la campagne en pause',
      message: 'Les envois en cours seront suspendus immédiatement.',
      confirmText: 'Mettre en pause',
      type: 'warning',
      onConfirm: async () => {
        setIsPausing(true)
        try {
          await apiClient.post(`/email/campaigns/campaigns/${campaignId}/pause`)
          showToast({
            type: 'success',
            title: 'Campagne mise en pause',
          })
          await refetch()
        } catch (err: any) {
          showToast({
            type: 'error',
            title: err?.response?.data?.detail || 'Erreur lors de la mise en pause',
          })
        } finally {
          setIsPausing(false)
        }
      },
    })
  }

  const handlePreviewCampaign = () => {
    router.push(`/dashboard/campaigns/${campaignId}/preview`)
  }

  const handleSendTestEmail = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      showToast({
        type: 'error',
        title: 'Email invalide',
      })
      return
    }

    setIsSendingTest(true)
    try {
      await apiClient.post(`/email/campaigns/campaigns/${campaignId}/send-test`, null, {
        params: { test_email: testEmail }
      })
      showToast({
        type: 'success',
        title: `Email de test envoyé à ${testEmail}`,
      })
      setShowTestEmailDialog(false)
      setTestEmail('')
    } catch (err: any) {
      showToast({
        type: 'error',
        title: err?.response?.data?.detail || 'Erreur lors de l\'envoi du test',
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  if (isLoading) return <div className="p-6">Chargement...</div>
  if (error || !campaign) return <Alert type="error" message="Campagne introuvable" />

  const canPrepare = campaign.status === 'draft'
  const canStart = campaign.status === 'scheduled' || campaign.status === 'paused'
  const canPause = campaign.status === 'sending'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/campaigns" className="inline-flex items-center text-sm text-bleu hover:underline mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux campagnes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ardoise">{campaign.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[campaign.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
                {campaign.status}
              </span>
              {campaign.scheduled_at && (
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Programmée pour: {new Date(campaign.scheduled_at).toLocaleString('fr-FR')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTestEmailDialog(true)}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Envoyer test
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreviewCampaign}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Prévisualiser
            </Button>
            {canPrepare && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrepareCampaign}
                isLoading={isPreparing}
                leftIcon={<Loader2 className="w-4 h-4" />}
              >
                Préparer
              </Button>
            )}
            {canStart && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartCampaign}
                isLoading={isStarting}
                leftIcon={<PlayCircle className="w-4 h-4" />}
              >
                Démarrer l'envoi
              </Button>
            )}
            {canPause && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePauseCampaign}
                isLoading={isPausing}
                leftIcon={<Pause className="w-4 h-4" />}
              >
                Mettre en pause
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-bleu">{stats?.total_sent || 0}</div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">Envoyés</p>
        </Card>

        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
            <Eye className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats?.opens || 0}
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
            Ouvertures ({stats?.open_rate ? (stats.open_rate * 100).toFixed(1) : '0'}%)
          </p>
        </Card>

        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-2">
            <MousePointerClick className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {stats?.clicks || 0}
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
            Clics ({stats?.click_rate ? (stats.click_rate * 100).toFixed(1) : '0'}%)
          </p>
        </Card>

        <Card className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-2">
            <Ban className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">
            {stats?.bounces || 0}
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
            Rebonds ({stats?.bounce_rate ? (stats.bounce_rate * 100).toFixed(1) : '0'}%)
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Détails de la campagne</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Nom</p>
            <p className="font-medium">{campaign.name}</p>
          </div>

          {campaign.subject && (
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Objet</p>
              <p className="font-medium">{campaign.subject}</p>
            </div>
          )}

          {campaign.default_template_id && (
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Template</p>
              <p className="font-medium">Template #{campaign.default_template_id}</p>
            </div>
          )}

          {campaign.provider && (
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Fournisseur</p>
              <p className="font-medium">{campaign.provider}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Créée le</p>
            <p className="font-medium">{new Date(campaign.created_at).toLocaleString('fr-FR')}</p>
          </div>

          {campaign.last_sent_at && (
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Dernier envoi le</p>
              <p className="font-medium">{new Date(campaign.last_sent_at).toLocaleString('fr-FR')}</p>
            </div>
          )}
        </div>
      </Card>

      {stats && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Statistiques détaillées</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total envoyés</p>
              <p className="text-2xl font-bold text-bleu">{stats.total_sent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total ouvertures</p>
              <p className="text-2xl font-bold text-green-600">{stats.opens}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Ouvertures uniques</p>
              <p className="text-2xl font-bold text-green-600">{stats.unique_opens}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total clics</p>
              <p className="text-2xl font-bold text-purple-600">{stats.clicks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Clics uniques</p>
              <p className="text-2xl font-bold text-purple-600">{stats.unique_clicks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total rebonds</p>
              <p className="text-2xl font-bold text-red-600">{stats.bounces}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total désinscriptions</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unsubscribes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Plaintes spam</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-slate-400">{stats.complaints}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Dialog envoi test */}
      {showTestEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Envoyer un email de test</h3>
              <p className="text-sm text-text-secondary">
                Entrez votre adresse email pour recevoir un aperçu de la campagne
              </p>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Email de test *
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendTestEmail()
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTestEmailDialog(false)
                    setTestEmail('')
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendTestEmail}
                  isLoading={isSendingTest}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialogComponent />
    </div>
  )
}
