'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/shared'
import { useToast } from '@/components/ui/Toast'
import { CompleteCampaignForm } from '@/components/email/CompleteCampaignForm'
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

  const handleSubmit = async (formData: any) => {
    setIsCreating(true)
    try {
      const response = await apiClient.post<CampaignResponse>('/api/v1/email-campaigns/campaigns', formData)
      const campaign = response.data

      showToast({
        type: 'success',
        title: `Campagne "${campaign.name}" créée avec succès`,
      })
      router.push(`/dashboard/campaigns/${campaign.id}`)
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
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

      <CompleteCampaignForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
      />
    </div>
  )
}
