'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from "@/lib/constants"
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/shared'
import { useToast } from '@/components/ui/Toast'
import { CampaignWizard } from '@/components/email/CampaignWizard'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

interface CampaignResponse {
  id: number
  name: string
  description?: string
  status: string
  created_at: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [isCreating, setIsCreating] = React.useState(false)
  const [initialData, setInitialData] = React.useState<any>(null)

  // Charger le brouillon depuis URL si on édite (ex: /new?edit=123)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')

    if (editId) {
      // Charger la campagne depuis l'API
      apiClient.get<CampaignResponse>(`/email/campaigns/${editId}`)
        .then(response => {
          const data = response.data as any

          // Transformer audience_filters (backend) → recipient_filters (frontend)
          let recipient_filters = data.recipient_filters
          if (data.audience_filters && !data.recipient_filters) {
            recipient_filters = {
              target_type: data.audience_filters.target_type || 'contacts',
              specific_ids: data.audience_filters.specific_ids || [],
              languages: data.audience_filters.languages || [],
              countries: data.audience_filters.countries || [],
              organisation_categories: data.audience_filters.organisation_categories || [],
              organisation_types: data.audience_filters.organisation_types || [],
              cities: data.audience_filters.cities || [],
              roles: data.audience_filters.roles || [],
              is_active: data.audience_filters.is_active,
              exclude_ids: data.audience_filters.exclude_ids || [],
            }
          }

          // Transformer default_template_id (backend) → template_id (frontend)
          const template_id = data.default_template_id !== undefined ? data.default_template_id : data.template_id

          setInitialData({
            ...data,
            recipient_filters,
            template_id,
          })
          logger.log('📥 Brouillon chargé depuis DB:', { ...data, recipient_filters })
        })
        .catch(err => {
          logger.error('Failed to load draft:', err)
          showToast({
            type: 'error',
            title: 'Impossible de charger le brouillon',
          })
        })
    }
  }, [])

  const handleSubmit = async (formData: any) => {
    setIsCreating(true)
    try {
      // Transformer recipient_filters en audience_filters pour le backend
      const payload = { ...formData }

      if (formData.recipient_filters) {
        payload.audience_filters = {
          target_type: formData.recipient_filters.target_type || 'contacts',
          specific_ids: formData.recipient_filters.specific_ids || []
        }
        // Supprimer recipient_filters car c'est un format frontend
        delete payload.recipient_filters
      }

      // IMPORTANT: Le backend utilise default_template_id, pas template_id
      if (formData.template_id !== undefined) {
        payload.default_template_id = formData.template_id
        delete payload.template_id
      }

      logger.log('📤 Création campagne avec produit:', payload)

      await apiClient.post<CampaignResponse>('/email/campaigns', payload)

      showToast({
        type: 'success',
        title: `Campagne "${formData.name}" créée`,
        message: `${payload.audience_filters?.specific_ids?.length || 0} destinataires sélectionnés`,
      })

      // Rediriger vers la liste des campagnes
      router.push(ROUTES.MARKETING.CAMPAIGNS)
    } catch (err: any) {
      logger.error('Failed to create campaign:', err)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: err?.response?.data?.detail || 'Impossible de créer la campagne',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveDraft = async (formData: any) => {
    // Sauvegarder en base de données comme brouillon
    try {
      // Transformer recipient_filters en audience_filters pour le backend
      const payload = { ...formData }

      if (formData.recipient_filters) {
        payload.audience_filters = {
          target_type: formData.recipient_filters.target_type || 'contacts',
          specific_ids: formData.recipient_filters.specific_ids || []
        }
        // Supprimer recipient_filters car c'est un format frontend
        delete payload.recipient_filters
      }

      // IMPORTANT: Le backend utilise default_template_id, pas template_id
      if (formData.template_id !== undefined) {
        payload.default_template_id = formData.template_id
        delete payload.template_id
      }

      if (initialData?.id) {
        // Mise à jour d'un brouillon existant
        await apiClient.put(`/email/campaigns/${initialData.id}`, payload)
        showToast({
          type: 'success',
          title: 'Brouillon mis à jour',
        })
      } else {
        // Création d'un nouveau brouillon
        const response = await apiClient.post<CampaignResponse>('/email/campaigns', payload)
        const campaign = response.data

        // Mettre à jour initialData avec l'ID pour les prochaines sauvegardes
        setInitialData({ ...formData, id: campaign.id })

        showToast({
          type: 'success',
          title: 'Brouillon sauvegardé',
          message: `Vous pouvez le retrouver dans la liste des campagnes`,
        })
      }
    } catch (err: any) {
      logger.error('Failed to save draft:', err)
      showToast({
        type: 'error',
        title: 'Erreur lors de la sauvegarde',
        message: err?.response?.data?.detail || 'Impossible de sauvegarder le brouillon',
      })
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/marketing/campaigns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Mail className="w-6 h-6 text-bleu" />
              Nouvelle Campagne Email
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Créez une campagne marketing pour promouvoir vos produits financiers
            </p>
          </div>
        </div>
      </div>

      <CampaignWizard
        initialData={initialData}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        isSubmitting={isCreating}
      />
    </div>
  )
}
