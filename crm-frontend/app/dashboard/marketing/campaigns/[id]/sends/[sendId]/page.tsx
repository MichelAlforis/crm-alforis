'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Eye, MousePointerClick, Ban, Clock, Filter, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import { Input } from '@/components/shared/Input'
import { RecipientTrackingList } from '@/components/email/RecipientTrackingList'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'

interface EmailSendBatch {
  id: number
  campaign_id: number
  name: string
  status: string
  scheduled_at?: string
  sent_at?: string
  completed_at?: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  failed_count: number
}

interface RecipientWithTracking {
  id: number
  recipient: {
    person_id: number | null
    name: string
    email: string
    organisation: string | null
    role: string | null
  }
  tracking: {
    sent_at: string | null
    opened: Array<{ event_at: string; ip: string | null }>
    clicked: Array<{ event_at: string; url: string | null; ip: string | null }>
    bounced: boolean
    open_count: number
    click_count: number
  }
  engagement_score: number
}

type FilterType = 'all' | 'clicked' | 'opened' | 'not_opened' | 'bounced'

const FILTER_OPTIONS: Array<{ value: FilterType; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'all', label: 'Tous', icon: <Users className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700' },
  { value: 'clicked', label: 'Ont cliqué', icon: <MousePointerClick className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
  { value: 'opened', label: 'Ont ouvert', icon: <Eye className="w-4 h-4" />, color: 'bg-primary/20 text-primary' },
  { value: 'not_opened', label: 'Non ouverts', icon: <Mail className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700' },
  { value: 'bounced', label: 'Rebonds', icon: <Ban className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
]

export default function BatchTrackingPage() {
  const params = useParams<{ id: string; sendId: string }>()
  const router = useRouter()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0
  const batchId = params?.sendId ? parseInt(params.sendId, 10) : 0
  const { showToast } = useToast()

  const [batch, setBatch] = useState<EmailSendBatch | null>(null)
  const [recipients, setRecipients] = useState<RecipientWithTracking[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)

  // Charger les données du batch
  useEffect(() => {
    const loadBatch = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.get<EmailSendBatch>(
          `/email/campaigns/${campaignId}/batches/${batchId}`
        )
        setBatch(response.data)
      } catch (error) {
        logger.error('Failed to load batch:', error)
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de charger les données du batch',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId && batchId) {
      loadBatch()
    }
  }, [campaignId, batchId])

  // Charger les destinataires avec tracking
  useEffect(() => {
    const loadRecipients = async () => {
      try {
        setIsLoadingRecipients(true)
        const response = await apiClient.get<RecipientWithTracking[]>(
          `/email/campaigns/${campaignId}/batches/${batchId}/recipients-tracking`,
          {
            params: {
              filter: filter === 'all' ? undefined : filter,
              sort: 'engagement',
            }
          }
        )
        setRecipients(response.data)
      } catch (error) {
        logger.error('Failed to load recipients tracking:', error)
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de charger le tracking des destinataires',
        })
      } finally {
        setIsLoadingRecipients(false)
      }
    }

    if (campaignId && batchId) {
      loadRecipients()
    }
  }, [campaignId, batchId, filter])

  // Actions commerciales
  const handleCallClick = async (personId: number, recipient: RecipientWithTracking) => {
    try {
      // Créer une tâche "Appel" automatiquement
      await apiClient.post('/tasks', {
        title: `Rappeler ${recipient.recipient.name}`,
        description: `Suivi email : A ${recipient.tracking.click_count > 0 ? 'cliqué' : 'ouvert'} l'email "${batch?.name || 'campagne'}"`,
        assigned_to_id: null, // L'utilisateur courant
        due_date: new Date().toISOString(),
        priority: recipient.engagement_score >= 70 ? 'high' : 'medium',
        type: 'call',
        related_person_id: personId,
      })

      showToast({
        type: 'success',
        title: 'Tâche créée',
        message: `Tâche d'appel créée pour ${recipient.recipient.name}`,
      })
    } catch (error: any) {
      logger.error('Failed to create task:', error)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.response?.data?.detail || 'Impossible de créer la tâche',
      })
    }
  }

  const handleNoteClick = (personId: number, recipient: RecipientWithTracking) => {
    // Rediriger vers la fiche personne avec param pour ouvrir modal note
    router.push(`/dashboard/people/${personId}?action=add-note&context=email`)
  }

  if (isLoading || !batch) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/20 rounded w-1/3" />
          <div className="h-32 bg-muted/20 rounded" />
        </div>
      </div>
    )
  }

  // Calcul des pourcentages
  const openRate = batch.sent_count > 0 ? (batch.opened_count / batch.sent_count * 100).toFixed(1) : '0'
  const clickRate = batch.sent_count > 0 ? (batch.clicked_count / batch.sent_count * 100).toFixed(1) : '0'
  const bounceRate = batch.sent_count > 0 ? (batch.bounced_count / batch.sent_count * 100).toFixed(1) : '0'

  // Utiliser les compteurs du batch (données globales) au lieu de filtrer recipients
  // Car recipients est déjà filtré par l'API selon le filtre actif
  const filterCounts = {
    all: batch.sent_count,
    clicked: batch.clicked_count,
    opened: batch.opened_count,
    not_opened: batch.sent_count - batch.opened_count - batch.bounced_count,
    bounced: batch.bounced_count,
  }

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
              <Mail className="w-8 h-8 text-primary" />
              {batch.name}
            </h1>
            <p className="text-text-secondary mt-1">
              Envoyé le {batch.sent_at ? new Date(batch.sent_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs Globaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Envoyés</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{batch.sent_count}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Sur {batch.total_recipients} destinataires
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Ouverts</p>
                <p className="text-3xl font-bold text-primary mt-1">{batch.opened_count}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Taux d'ouverture: {openRate}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Cliqués</p>
                <p className="text-3xl font-bold text-success mt-1">{batch.clicked_count}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Taux de clic: {clickRate}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <MousePointerClick className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">Rebonds</p>
                <p className="text-3xl font-bold text-error mt-1">{batch.bounced_count}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Taux de rebond: {bounceRate}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <Ban className="w-6 h-6 text-error" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Alerte leads chauds */}
      {filterCounts.clicked > 0 && (
        <Alert
          type="success"
          message={
            <div className="flex items-center justify-between">
              <span>
                🔥 <strong>{filterCounts.clicked} lead(s) chaud(s)</strong> ont cliqué ! Moment idéal pour les rappeler.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setFilter('clicked')}
              >
                Voir les leads chauds
              </Button>
            </div>
          }
        />
      )}

      {/* Filtres + Destinataires */}
      <Card>
        <CardHeader
          title="Destinataires avec tracking"
          subtitle="Identifiez les leads chauds à rappeler"
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
        <CardBody>
          {/* Tabs de filtre */}
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  flex items-center gap-2
                  ${filter === option.value
                    ? `${option.color} shadow-sm`
                    : 'bg-muted/20 text-text-secondary hover:bg-muted/30'
                  }
                `}
              >
                {option.icon}
                <span>{option.label}</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/30 text-xs font-semibold">
                  {filterCounts[option.value] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Liste des destinataires */}
          <RecipientTrackingList
            recipients={recipients}
            isLoading={isLoadingRecipients}
            onCallClick={handleCallClick}
            onNoteClick={handleNoteClick}
          />
        </CardBody>
      </Card>
    </div>
  )
}
