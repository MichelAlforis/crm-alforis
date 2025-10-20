'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Save } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Input, Select, Alert } from '@/components/shared'
import { useEmailCampaigns } from '@/hooks/useEmailAutomation'
import { useToast } from '@/components/ui/Toast'
import type { EmailCampaignInput, EmailProvider, EmailScheduleType } from '@/lib/types'

const PROVIDER_OPTIONS = [
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
]

const SCHEDULE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manuel' },
  { value: 'immediate', label: 'Immédiat' },
  { value: 'scheduled', label: 'Programmé' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const { createCampaign, isCreating } = useEmailCampaigns()
  const { showToast } = useToast()

  const [formData, setFormData] = useState<EmailCampaignInput>({
    name: '',
    description: '',
    provider: 'sendgrid',
    from_name: '',
    from_email: '',
    reply_to: '',
    subject: '',
    preheader: '',
    track_opens: true,
    track_clicks: true,
    is_ab_test: false,
    ab_test_split_percentage: 50,
    schedule_type: 'manual',
    steps: [],
  })

  const [error, setError] = useState<string>()

  const handleChange = (field: keyof EmailCampaignInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)

    // Validation
    if (!formData.name.trim()) {
      setError('Le nom de la campagne est requis')
      return
    }
    if (!formData.from_name.trim()) {
      setError('Le nom de l\'expéditeur est requis')
      return
    }
    if (!formData.from_email.trim()) {
      setError('L\'email de l\'expéditeur est requis')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.from_email)) {
      setError('L\'email de l\'expéditeur est invalide')
      return
    }

    try {
      const campaign = await createCampaign(formData)
      showToast({
        type: 'success',
        title: `Campagne "${campaign.name}" créée avec succès`,
      })
      router.push(`/dashboard/campaigns/${campaign.id}`)
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création de la campagne')
      showToast({
        type: 'error',
        title: err?.message || 'Impossible de créer la campagne',
      })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
              Créez une nouvelle campagne d'emailing
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} />
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Informations générales</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nom de la campagne *"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Newsletter Q4 2024"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Description de la campagne"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bleu focus:border-transparent"
                />
              </div>

              <Select
                label="Fournisseur email *"
                value={formData.provider}
                onChange={(e) => handleChange('provider', e.target.value as EmailProvider)}
                options={PROVIDER_OPTIONS}
                required
              />

              <Select
                label="Type d'envoi *"
                value={formData.schedule_type}
                onChange={(e) => handleChange('schedule_type', e.target.value as EmailScheduleType)}
                options={SCHEDULE_TYPE_OPTIONS}
                required
              />
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Expéditeur</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom de l'expéditeur *"
                value={formData.from_name}
                onChange={(e) => handleChange('from_name', e.target.value)}
                placeholder="Ex: TPM Finance"
                required
              />

              <Input
                label="Email de l'expéditeur *"
                type="email"
                value={formData.from_email}
                onChange={(e) => handleChange('from_email', e.target.value)}
                placeholder="Ex: contact@tpm.finance"
                required
              />

              <div className="md:col-span-2">
                <Input
                  label="Email de réponse"
                  type="email"
                  value={formData.reply_to || ''}
                  onChange={(e) => handleChange('reply_to', e.target.value)}
                  placeholder="Ex: support@tpm.finance (optionnel)"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Contenu email</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Input
                label="Sujet de l'email"
                value={formData.subject || ''}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="Ex: Découvrez nos nouveaux produits"
              />

              <Input
                label="Preheader (texte de prévisualisation)"
                value={formData.preheader || ''}
                onChange={(e) => handleChange('preheader', e.target.value)}
                placeholder="Ex: Une offre exclusive pour vous"
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Pour ajouter un template et personnaliser le contenu HTML,
                  vous pourrez le faire après la création de la campagne.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Options de tracking</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.track_opens}
                  onChange={(e) => handleChange('track_opens', e.target.checked)}
                  className="w-4 h-4 text-bleu border-gray-300 rounded focus:ring-bleu"
                />
                <span className="text-sm text-gray-700">
                  Suivre les ouvertures d'emails (pixel de tracking)
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.track_clicks}
                  onChange={(e) => handleChange('track_clicks', e.target.checked)}
                  className="w-4 h-4 text-bleu border-gray-300 rounded focus:ring-bleu"
                />
                <span className="text-sm text-gray-700">
                  Suivre les clics sur les liens
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_ab_test}
                  onChange={(e) => handleChange('is_ab_test', e.target.checked)}
                  className="w-4 h-4 text-bleu border-gray-300 rounded focus:ring-bleu"
                />
                <span className="text-sm text-gray-700">
                  Activer le test A/B (2 versions)
                </span>
              </label>

              {formData.is_ab_test && (
                <div className="ml-7">
                  <Input
                    label="Pourcentage version A (%)"
                    type="number"
                    min="1"
                    max="99"
                    value={formData.ab_test_split_percentage}
                    onChange={(e) => handleChange('ab_test_split_percentage', parseInt(e.target.value) || 50)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Version B recevra {100 - (formData.ab_test_split_percentage || 50)}% des emails
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/campaigns">
            <Button type="button" variant="ghost">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Créer la campagne
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
