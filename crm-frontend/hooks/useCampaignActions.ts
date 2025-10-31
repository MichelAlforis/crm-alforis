// hooks/useCampaignActions.ts
// Campaign action handlers (delete, duplicate)

import { useConfirm } from './useConfirm'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import type { EmailCampaign } from '@/lib/types'

interface UseCampaignActionsProps {
  onDelete: (id: number) => Promise<void>
  onRefetch: () => void
}

export function useCampaignActions({ onDelete, onRefetch }: UseCampaignActionsProps) {
  const { confirm } = useConfirm()
  const { showToast } = useToast()

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
        await onDelete(campaign.id)
      },
    })
  }

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

      onRefetch()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.response?.data?.detail || 'Impossible de dupliquer la campagne',
      })
    }
  }

  return {
    handleDelete,
    handleDuplicate,
  }
}
