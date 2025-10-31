'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Mail, User, Building2 } from 'lucide-react'
import { Card, Alert, Button } from '@/components/shared'
import { apiClient } from '@/lib/api'

interface EmailPreview {
  recipient: {
    id: number
    type: string
    name: string
    email: string
    personalization_data: Record<string, any>
  }
  subject: string
  body_html: string
  body_text?: string
}

interface EmailPreviewList {
  total: number
  previews: EmailPreview[]
  page: number
  page_size: number
  total_pages: number
}

export default function CampaignPreviewPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params?.id ? parseInt(params.id, 10) : 0

  const [previewData, setPreviewData] = useState<EmailPreviewList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)

  const pageSize = 10

  useEffect(() => {
    const loadPreviews = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiClient.get<EmailPreviewList>(
          `/email/campaigns/campaigns/${campaignId}/preview`,
          {
            params: { page: currentPage, page_size: pageSize }
          }
        )
        setPreviewData(response.data)
        setCurrentPreviewIndex(0)
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Erreur lors du chargement de la prévisualisation')
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId) {
      loadPreviews()
    }
  }, [campaignId, currentPage])

  const handlePreviousPreview = () => {
    if (currentPreviewIndex > 0) {
      setCurrentPreviewIndex(currentPreviewIndex - 1)
    } else if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      setCurrentPreviewIndex(pageSize - 1)
    }
  }

  const handleNextPreview = () => {
    if (previewData && currentPreviewIndex < previewData.previews.length - 1) {
      setCurrentPreviewIndex(currentPreviewIndex + 1)
    } else if (previewData && currentPage < previewData.total_pages) {
      setCurrentPage(currentPage + 1)
      setCurrentPreviewIndex(0)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">Chargement de la prévisualisation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Link href={`/dashboard/campaigns/${campaignId}`} className="inline-flex items-center text-sm text-bleu hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la campagne
        </Link>
        <Alert type="error" message={error} />
      </div>
    )
  }

  if (!previewData || previewData.previews.length === 0) {
    return (
      <div className="p-6">
        <Link href={`/dashboard/campaigns/${campaignId}`} className="inline-flex items-center text-sm text-bleu hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la campagne
        </Link>
        <Alert
          type="warning"
          message="Aucun email à prévisualiser. Vérifiez que votre campagne a des destinataires valides."
        />
      </div>
    )
  }

  const currentPreview = previewData.previews[currentPreviewIndex]
  const totalEmails = previewData.total
  const currentEmailNumber = (currentPage - 1) * pageSize + currentPreviewIndex + 1
  const canGoPrevious = currentPage > 1 || currentPreviewIndex > 0
  const canGoNext = currentPage < previewData.total_pages || currentPreviewIndex < previewData.previews.length - 1

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/campaigns/${campaignId}`} className="inline-flex items-center text-sm text-bleu hover:underline mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la campagne
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ardoise">Prévisualisation des emails</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Email {currentEmailNumber} sur {totalEmails}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousPreview}
              disabled={!canGoPrevious}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Précédent
            </Button>
            <span className="text-sm text-gray-600 dark:text-slate-400 px-3">
              {currentEmailNumber} / {totalEmails}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPreview}
              disabled={!canGoNext}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>

      {/* Recipient Info */}
      <Card>
        <div className="p-4 bg-muted/20 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {currentPreview.recipient.type === 'organisation' ? (
                <Building2 className="h-6 w-6 text-primary" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">{currentPreview.recipient.name}</p>
              <p className="text-sm text-text-secondary">{currentPreview.recipient.email}</p>
            </div>
            <div className="text-xs text-text-tertiary">
              Type: {currentPreview.recipient.type === 'organisation' ? 'Organisation' : 'Contact'}
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <p className="text-xs font-medium text-text-tertiary mb-1">SUJET</p>
            <p className="text-lg font-semibold text-text-primary">{currentPreview.subject}</p>
          </div>

          {/* Personalization Data */}
          {Object.keys(currentPreview.recipient.personalization_data).length > 0 && (
            <details className="mb-4">
              <summary className="text-xs font-medium text-text-tertiary cursor-pointer hover:text-text-secondary">
                Données de personnalisation ({Object.keys(currentPreview.recipient.personalization_data).length} variables)
              </summary>
              <div className="mt-2 p-3 bg-muted/20 rounded-radius-md">
                <pre className="text-xs text-text-secondary overflow-x-auto">
                  {JSON.stringify(currentPreview.recipient.personalization_data, null, 2)}
                </pre>
              </div>
            </details>
          )}

          {/* Email Body */}
          <div className="border border-border rounded-radius-md overflow-hidden">
            <div className="bg-muted/10 px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-text-tertiary" />
                <span className="text-xs font-medium text-text-secondary">Aperçu de l'email</span>
              </div>
            </div>
            <div className="p-6 bg-white dark:bg-slate-900 max-h-[600px] overflow-y-auto">
              <div
                dangerouslySetInnerHTML={{ __html: currentPreview.body_html }}
                className="prose prose-sm max-w-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Bottom */}
      <div className="flex items-center justify-center gap-3 pb-6">
        <Button
          variant="secondary"
          size="md"
          onClick={handlePreviousPreview}
          disabled={!canGoPrevious}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Précédent
        </Button>
        <div className="px-4 py-2 bg-muted/20 rounded-radius-md">
          <span className="text-sm font-medium text-text-primary">
            {currentEmailNumber} / {totalEmails}
          </span>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={handleNextPreview}
          disabled={!canGoNext}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}
