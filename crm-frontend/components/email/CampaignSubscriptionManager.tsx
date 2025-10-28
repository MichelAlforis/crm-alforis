'use client'

import React, { useState } from 'react'
import { Plus, Mail, Trash2, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardHeader, CardBody, Button } from '@/components/shared'
import { Modal } from '@/components/shared/Modal'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import {
  usePersonSubscriptions,
  useOrganisationSubscriptions,
  useSubscribeToCampaign,
  type CampaignSubscription,
} from '@/hooks/useCampaignSubscriptions'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

interface CampaignSubscriptionManagerProps {
  entityType: 'person' | 'organisation'
  entityId: number
  entityName: string
}

interface Campaign {
  id: number
  name: string
  status: string
  description?: string
}

export function CampaignSubscriptionManager({
  entityType,
  entityId,
  entityName,
}: CampaignSubscriptionManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null)

  // Récupérer les abonnements
  const personSubscriptions = usePersonSubscriptions(entityType === 'person' ? entityId : 0)
  const organisationSubscriptions = useOrganisationSubscriptions(entityType === 'organisation' ? entityId : 0)

  const {
    subscriptions,
    isLoading: isLoadingSubscriptions,
  } = entityType === 'person' ? personSubscriptions : organisationSubscriptions

  // Récupérer la liste des campagnes disponibles
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Campaign[] }>('/email/campaigns', {
        skip: 0,
        limit: 100,
      })
      return response.data.items.filter((c) => c.status !== 'cancelled' && c.status !== 'completed')
    },
  })

  const { subscribe, isSubscribing, unsubscribe, isUnsubscribing } = useSubscribeToCampaign()

  const handleSubscribe = async () => {
    if (!selectedCampaignId) return

    const payload = {
      campaign_id: selectedCampaignId,
      ...(entityType === 'person'
        ? { person_id: entityId }
        : { organisation_id: entityId }),
    }

    await subscribe(payload)
    setIsModalOpen(false)
    setSelectedCampaignId(null)
  }

  const handleUnsubscribe = async (subscription: CampaignSubscription) => {
    if (!subscription.campaign_id || !subscription.id) return

    await unsubscribe({
      campaignId: subscription.campaign_id,
      subscriptionId: subscription.id,
    })
  }

  // Filtrer les campagnes déjà abonnées
  const subscribedCampaignIds = subscriptions.map((s) => s.campaign_id)
  const availableCampaigns = campaigns.filter((c) => !subscribedCampaignIds.includes(c.id))

  const activeSubscriptions = subscriptions.filter((s) => s.is_active)
  const inactiveSubscriptions = subscriptions.filter((s) => !s.is_active)

  return (
    <Card>
      <CardHeader
        title="Abonnements aux campagnes"
        subtitle={`${activeSubscriptions.length} campagne${activeSubscriptions.length > 1 ? 's' : ''} active${activeSubscriptions.length > 1 ? 's' : ''}`}
        icon={<Mail className="w-5 h-5 text-primary" />}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            disabled={availableCampaigns.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter à une campagne
          </Button>
        }
      />

      <CardBody>
        {isLoadingSubscriptions ? (
          <div className="text-center py-8 text-text-secondary">
            Chargement des abonnements...
          </div>
        ) : activeSubscriptions.length === 0 ? (
          <Alert
            type="info"
            message={`${entityName} n'est abonné${entityType === 'person' ? '' : 'e'} à aucune campagne email pour le moment.`}
          />
        ) : (
          <div className="space-y-3">
            {activeSubscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="flex items-center justify-between p-4 border border-border rounded-radius-md hover:bg-background-secondary transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">
                      {subscription.campaign_name || `Campagne #${subscription.campaign_id}`}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Abonné le {new Date(subscription.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle className="w-3 h-3" />
                        Actif
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnsubscribe(subscription)}
                  disabled={isUnsubscribing}
                  className="hover:bg-error/10 hover:border-error text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Abonnements inactifs */}
        {inactiveSubscriptions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium text-text-secondary mb-3">
              Abonnements inactifs ({inactiveSubscriptions.length})
            </h4>
            <div className="space-y-2">
              {inactiveSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between p-3 border border-border rounded-radius-md bg-background-secondary opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-primary">
                        {subscription.campaign_name || `Campagne #${subscription.campaign_id}`}
                      </p>
                      <p className="text-xs text-text-tertiary flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Désabonné le{' '}
                        {subscription.unsubscribed_at
                          ? new Date(subscription.unsubscribed_at).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>

      {/* Modal d'abonnement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedCampaignId(null)
        }}
        title="Ajouter à une campagne"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setSelectedCampaignId(null)
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSubscribe}
              disabled={!selectedCampaignId || isSubscribing}
            >
              {isSubscribing ? 'Validation...' : 'Valider'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert
            type="info"
            message={`Sélectionnez une campagne email à laquelle ajouter ${entityName}.`}
          />

          <div>
            <Select
              label="Campagne *"
              value={selectedCampaignId?.toString() || ''}
              onChange={(e) => setSelectedCampaignId(parseInt(e.target.value))}
              required
              disabled={isLoadingCampaigns}
            >
              <option value="">-- Sélectionner une campagne --</option>
              {availableCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.status})
                </option>
              ))}
            </Select>

            {availableCampaigns.length === 0 && !isLoadingCampaigns && (
              <p className="text-xs text-text-tertiary mt-2">
                Aucune campagne disponible. Toutes les campagnes actives sont déjà abonnées.
              </p>
            )}
          </div>

          {selectedCampaignId && (
            <div className="p-3 bg-background-secondary rounded-radius-md">
              <p className="text-sm text-text-secondary">
                {campaigns.find((c) => c.id === selectedCampaignId)?.description || 'Aucune description'}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  )
}
