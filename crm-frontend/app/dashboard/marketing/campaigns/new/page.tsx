'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/shared'
import { useToast } from '@/components/ui/Toast'
import { CampaignWizard } from '@/components/email/CampaignWizard'
import { apiClient } from '@/lib/api'

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
          setInitialData(response.data)
          console.log('📥 Brouillon chargé depuis DB:', response.data)
        })
        .catch(err => {
          console.error('Failed to load draft:', err)
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
      const response = await apiClient.post<CampaignResponse>('/email/campaigns', formData)
      const campaign = response.data

      showToast({
        type: 'success',
        title: `Campagne "${campaign.name}" créée avec succès`,
      })
      router.push(`/dashboard/marketing/campaigns/${campaign.id}`)
    } catch (err: any) {
      console.error('Failed to create campaign:', err)
      showToast({
        type: 'error',
        title: err?.response?.data?.detail || 'Impossible de créer la campagne',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveDraft = async (formData: any) => {
    // Sauvegarder en base de données comme brouillon
    try {
      if (initialData?.id) {
        // Mise à jour d'un brouillon existant
        await apiClient.put(`/email/campaigns/${initialData.id}`, formData)
        showToast({
          type: 'success',
          title: 'Brouillon mis à jour',
        })
      } else {
        // Création d'un nouveau brouillon
        const response = await apiClient.post<CampaignResponse>('/email/campaigns', formData)
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
      console.error('Failed to save draft:', err)
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-6 h-6 text-bleu" />
              Nouvelle Campagne Email
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Créez une campagne complète avec template et destinataires
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
