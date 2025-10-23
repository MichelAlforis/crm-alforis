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

  // Charger le brouillon depuis localStorage au montage
  React.useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('campaign_draft')
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        setInitialData(draft)
        console.log('📥 Brouillon chargé depuis localStorage:', draft)
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
    }
  }, [])

  const handleSubmit = async (formData: any) => {
    setIsCreating(true)
    try {
      const response = await apiClient.post<CampaignResponse>('/email/campaigns', formData)
      const campaign = response.data

      // Supprimer le brouillon après création réussie
      localStorage.removeItem('campaign_draft')

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
    // Sauvegarde locale pour le moment (peut être étendu avec un endpoint backend)
    try {
      localStorage.setItem('campaign_draft', JSON.stringify(formData))
      console.log('Draft saved to localStorage')
      showToast({
        type: 'success',
        title: 'Brouillon sauvegardé',
      })
    } catch (err) {
      console.error('Failed to save draft:', err)
      showToast({
        type: 'error',
        title: 'Erreur lors de la sauvegarde',
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
