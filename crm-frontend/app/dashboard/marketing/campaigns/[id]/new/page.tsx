'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import { Select } from '@/components/shared/Select'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { useEmailTemplates } from '@/hooks/useEmailAutomation'
import type { EmailTemplate } from '@/lib/types'
import { logger } from '@/lib/logger'

interface EmailCampaign {
  id: number
  name: string
  description?: string
  from_name: string
  from_email: string
  provider: string
  steps: Array<{
    id: number
    template_id: number
    order_index: number
  }>
}

export default function NewCampaignSendPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0
  const { showToast } = useToast()
  const { templates, isLoading: templatesLoading } = useEmailTemplates()

  const [campaign, setCampaign] = useState<EmailCampaign | null>(null)
  const [recipientCount, setRecipientCount] = useState(0)

  const [sendName, setSendName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Charger la campagne et les données
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Charger la campagne
        const campaignResponse = await apiClient.get<EmailCampaign>(`/email/campaigns/${campaignId}`)
        const campaignData = campaignResponse.data
        setCampaign(campaignData)

        // Auto-sélectionner le template par défaut
        if (campaignData.steps && campaignData.steps.length > 0) {
          setSelectedTemplateId(campaignData.steps[0].template_id)
        }

        // Charger le nombre de destinataires depuis les subscriptions
        try {
          const subscriptionsResponse = await apiClient.get<any[]>(
            `/email/campaigns/${campaignId}/subscriptions`,
            { params: { only_active: true } }
          )
          setRecipientCount(subscriptionsResponse.data?.length || 0)
        } catch (err) {
          logger.error('Failed to load subscriptions:', err)
          setRecipientCount(0)
        }

      } catch (error) {
        logger.error('Failed to load campaign:', error)
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de charger la campagne',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId) {
      loadData()
    }
  }, [campaignId, showToast])

  const handleScheduleSend = async () => {
    if (!sendName.trim()) {
      showToast({
        type: 'error',
        title: 'Nom requis',
        message: 'Veuillez donner un nom à cet envoi',
      })
      return
    }

    if (!selectedTemplateId) {
      showToast({
        type: 'error',
        title: 'Template requis',
        message: 'Veuillez sélectionner un template',
      })
      return
    }

    if (recipientCount === 0) {
      showToast({
        type: 'error',
        title: 'Aucun destinataire',
        message: 'Cette campagne n\'a pas de destinataires. Veuillez ajouter des contacts à la campagne.',
      })
      return
    }

    setIsSending(true)
    try {
      // 1. Charger les destinataires depuis les subscriptions
      let recipients: any[] = []

      try {
        const subscriptionsResponse = await apiClient.get<any[]>(
          `/email/campaigns/${campaignId}/subscriptions`,
          { params: { only_active: true } }
        )

        // Transformer les subscriptions en format destinataires
        recipients = (subscriptionsResponse.data || []).map((sub: any) => ({
          type: sub.person_id ? 'contact' : 'organisation',
          id: sub.person_id || sub.organisation_id,
          email: sub.entity_email,
          name: sub.entity_name,
        }))
      } catch (err) {
        logger.error('Failed to load campaign subscriptions:', err)
        showToast({
          type: 'error',
          title: 'Erreur de chargement',
          message: 'Impossible de charger la liste des destinataires de cette campagne.',
        })
        setIsSending(false)
        return
      }

      if (recipients.length === 0) {
        showToast({
          type: 'error',
          title: 'Aucun destinataire',
          message: 'Cette campagne n\'a pas de destinataires inscrits.',
        })
        setIsSending(false)
        return
      }

      // 2. Préparer les données d'envoi
      const scheduleData: any = {
        name: sendName,
        recipients: recipients,
        schedule_type: scheduleType === 'immediate' ? 'immediate' : 'scheduled'
      }

      if (scheduleType === 'scheduled') {
        if (!scheduledDate || !scheduledTime) {
          showToast({
            type: 'error',
            title: 'Date/heure requise',
            message: 'Veuillez saisir une date et heure pour l\'envoi programmé',
          })
          setIsSending(false)
          return
        }
        scheduleData.scheduled_at = `${scheduledDate}T${scheduledTime}:00`
      }

      await apiClient.post(`/email/campaigns/${campaignId}/schedule`, scheduleData)

      showToast({
        type: 'success',
        title: 'Envoi créé',
        message: scheduleType === 'immediate'
          ? 'L\'envoi va commencer dans quelques instants'
          : `L\'envoi est programmé pour le ${scheduledDate} à ${scheduledTime}`,
      })

      // Rediriger vers la page de la campagne
      router.push(`/dashboard/marketing/campaigns/${campaignId}`)

    } catch (error: any) {
      logger.error('Failed to schedule campaign:', error)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.response?.data?.detail || 'Impossible de planifier la campagne',
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <Alert type="error" message="Campagne introuvable" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/dashboard/marketing/campaigns/${campaignId}`}
            className="inline-flex items-center text-sm text-primary hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour à la campagne
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Nouvel envoi</h1>
          <p className="text-text-secondary mt-2">
            Campagne : <span className="font-medium">{campaign.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/marketing/campaigns/${campaignId}`)}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleScheduleSend}
            disabled={isSending || !sendName.trim() || !selectedTemplateId || recipientCount === 0}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {isSending ? 'Création...' : 'Créer l\'envoi'}
          </Button>
        </div>
      </div>

      {/* Nom de l'envoi */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Nom de l'envoi</h2>
        </CardHeader>
        <CardBody>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Donnez un nom à cet envoi *
            </label>
            <input
              type="text"
              value={sendName}
              onChange={(e) => setSendName(e.target.value)}
              placeholder="Ex: Newsletter Janvier 2025, Relance prospects, etc."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              maxLength={255}
            />
            <p className="text-xs text-text-tertiary mt-1">
              Ce nom vous permettra d'identifier cet envoi dans l'historique
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Info destinataires */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Destinataires</h2>
            <div className="flex items-center gap-2">
              {recipientCount > 0 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-text-primary">
                    {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium text-warning">
                    Aucun destinataire
                  </span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {recipientCount === 0 ? (
            <Alert
              type="warning"
              message="Cette campagne n'a pas de destinataires. Vous devez ajouter des contacts ou organisations à cette campagne avant de pouvoir créer un envoi."
            />
          ) : (
            <Alert
              type="info"
              message={`Cet envoi sera destiné aux ${recipientCount} personne${recipientCount > 1 ? 's' : ''} inscrite${recipientCount > 1 ? 's' : ''} à cette campagne.`}
            />
          )}
        </CardBody>
      </Card>

      {/* Sélection du template */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Template d'email</h2>
            <Link
              href="/dashboard/marketing/templates"
              className="text-sm text-primary hover:underline"
              target="_blank"
            >
              Gérer les templates
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Template à utiliser *
              </label>
              {templatesLoading ? (
                <div className="text-sm text-text-secondary">Chargement des templates...</div>
              ) : templates.length === 0 ? (
                <Alert
                  type="warning"
                  message="Aucun template disponible. Veuillez créer un template d'email avant de créer un envoi."
                />
              ) : (
                <Select
                  value={selectedTemplateId?.toString() || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Sélectionner un template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.subject && `- ${template.subject}`}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Programmation de l'envoi */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Programmation de l'envoi</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Option 1 : Envoi immédiat */}
            <label
              className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
              style={{
                borderColor: scheduleType === 'immediate' ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: scheduleType === 'immediate' ? 'var(--color-primary-light, rgba(59, 130, 246, 0.05))' : 'transparent'
              }}
            >
              <input
                type="radio"
                name="scheduleType"
                value="immediate"
                checked={scheduleType === 'immediate'}
                onChange={(e) => setScheduleType(e.target.value as 'immediate' | 'scheduled')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-text-primary flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Envoi immédiat
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Les emails seront envoyés dès maintenant
                </p>
              </div>
            </label>

            {/* Option 2 : Envoi programmé */}
            <label
              className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
              style={{
                borderColor: scheduleType === 'scheduled' ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: scheduleType === 'scheduled' ? 'var(--color-primary-light, rgba(59, 130, 246, 0.05))' : 'transparent'
              }}
            >
              <input
                type="radio"
                name="scheduleType"
                value="scheduled"
                checked={scheduleType === 'scheduled'}
                onChange={(e) => setScheduleType(e.target.value as 'immediate' | 'scheduled')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-text-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Envoi programmé (différé)
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Planifiez l'envoi pour une date et heure précises
                </p>

                {scheduleType === 'scheduled' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Heure
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/marketing/campaigns/${campaignId}`)}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleScheduleSend}
          disabled={isSending || !selectedTemplateId || recipientCount === 0}
          leftIcon={<Send className="w-4 h-4" />}
        >
          {isSending ? 'Création en cours...' : 'Créer l\'envoi'}
        </Button>
      </div>
    </div>
  )
}
