'use client'

import React, { useState, useEffect } from 'react'
import { Check, Mail, Users, Settings, FileText, AlertCircle } from 'lucide-react'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { RecipientFilters } from '../RecipientSelectorTable'

type EmailProvider = 'resend' | 'sendgrid' | 'mailgun'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string
}

interface Step4SummaryProps {
  name: string
  description: string
  template_id: number | null
  recipient_filters: RecipientFilters
  provider: EmailProvider
  from_name: string
  from_email: string
  batch_size: number
  delay_between_batches: number
  recipientCount: number
}

export const Step4Summary: React.FC<Step4SummaryProps> = ({
  name,
  description,
  template_id,
  recipient_filters,
  provider,
  from_name,
  from_email,
  batch_size,
  delay_between_batches,
  recipientCount,
}) => {
  const [template, setTemplate] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    if (template_id) {
      const loadTemplate = async () => {
        try {
          const response = await apiClient.get<EmailTemplate>(`/email/templates/${template_id}`)
          setTemplate(response.data)
        } catch (error) {
          console.error('Failed to load template:', error)
        }
      }
      loadTemplate()
    }
  }, [template_id])

  const providerLabel = provider === 'resend' ? 'Resend' : provider === 'sendgrid' ? 'SendGrid' : 'Mailgun'
  const targetTypeLabel = recipient_filters.target_type === 'contacts' ? 'Contacts' : 'Organisations'

  const totalBatches = Math.ceil(recipientCount / batch_size)
  const totalTimeMinutes = Math.ceil((totalBatches * delay_between_batches) / 60)

  return (
    <div className="space-y-spacing-lg">
      {/* Alert de confirmation */}
      <Alert
        type="success"
        title="Prêt à créer la campagne"
        message="Vérifiez les informations ci-dessous avant de créer votre campagne email."
      />

      {/* Informations de base */}
      <div className="rounded-radius-md border border-border p-spacing-md space-y-spacing-sm">
        <div className="flex items-center gap-2 text-primary mb-3">
          <FileText className="h-5 w-5" />
          <h3 className="text-base font-semibold">Informations de base</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 text-text-secondary">Nom :</span>
            <span className="font-medium text-text-primary">{name}</span>
          </div>
          {description && (
            <div className="flex">
              <span className="w-32 text-text-secondary">Description :</span>
              <span className="text-text-primary">{description}</span>
            </div>
          )}
          <div className="flex">
            <span className="w-32 text-text-secondary">Template :</span>
            <span className="text-text-primary">{template?.name || 'Chargement...'}</span>
          </div>
          {template && (
            <div className="flex">
              <span className="w-32 text-text-secondary">Sujet :</span>
              <span className="text-text-primary">{template.subject}</span>
            </div>
          )}
        </div>
      </div>

      {/* Destinataires */}
      <div className="rounded-radius-md border border-border p-spacing-md space-y-spacing-sm">
        <div className="flex items-center gap-2 text-primary mb-3">
          <Users className="h-5 w-5" />
          <h3 className="text-base font-semibold">Destinataires</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 text-text-secondary">Type :</span>
            <span className="text-text-primary">{targetTypeLabel}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-text-secondary">Nombre :</span>
            <span className="font-bold text-primary text-lg">{recipientCount}</span>
          </div>
          {recipient_filters.countries && recipient_filters.countries.length > 0 && (
            <div className="flex">
              <span className="w-32 text-text-secondary">Pays :</span>
              <span className="text-text-primary">{recipient_filters.countries.join(', ')}</span>
            </div>
          )}
          {recipient_filters.languages && recipient_filters.languages.length > 0 && (
            <div className="flex">
              <span className="w-32 text-text-secondary">Langues :</span>
              <span className="text-text-primary">{recipient_filters.languages.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Configuration d'envoi */}
      <div className="rounded-radius-md border border-border p-spacing-md space-y-spacing-sm">
        <div className="flex items-center gap-2 text-primary mb-3">
          <Settings className="h-5 w-5" />
          <h3 className="text-base font-semibold">Configuration d'envoi</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 text-text-secondary">Fournisseur :</span>
            <span className="text-text-primary">{providerLabel}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-text-secondary">Expéditeur :</span>
            <span className="text-text-primary">
              {from_name} &lt;{from_email}&gt;
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-text-secondary">Taille des lots :</span>
            <span className="text-text-primary">{batch_size} emails/lot</span>
          </div>
          <div className="flex">
            <span className="w-32 text-text-secondary">Délai :</span>
            <span className="text-text-primary">{delay_between_batches}s entre lots</span>
          </div>
        </div>
      </div>

      {/* Estimation de l'envoi */}
      <div className="rounded-radius-md border border-success bg-success/5 p-spacing-md">
        <div className="flex items-center gap-2 text-success mb-3">
          <Mail className="h-5 w-5" />
          <h3 className="text-base font-semibold">Estimation de l'envoi</h3>
        </div>
        <div className="space-y-2 text-sm text-text-primary">
          <div className="flex justify-between">
            <span>Nombre de lots :</span>
            <span className="font-semibold">{totalBatches}</span>
          </div>
          <div className="flex justify-between">
            <span>Durée totale estimée :</span>
            <span className="font-semibold">
              {totalTimeMinutes < 60
                ? `${totalTimeMinutes} minute${totalTimeMinutes > 1 ? 's' : ''}`
                : `${Math.floor(totalTimeMinutes / 60)}h ${totalTimeMinutes % 60}min`}
            </span>
          </div>
        </div>
      </div>

      {/* Avertissement si aucun destinataire */}
      {recipientCount === 0 && (
        <Alert
          type="danger"
          title="Aucun destinataire"
          message="Vous ne pouvez pas créer une campagne sans destinataires. Retournez à l'étape 2 pour sélectionner des destinataires."
        />
      )}

      {/* Aperçu du template */}
      {template && (
        <div className="rounded-radius-md border border-border p-spacing-md space-y-spacing-sm">
          <p className="text-sm font-semibold text-text-primary mb-2">Aperçu du template</p>
          <div
            className="prose prose-sm max-w-none rounded-radius-sm border border-border bg-white p-spacing-md max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: template.html_content }}
          />
        </div>
      )}
    </div>
  )
}

export default Step4Summary
