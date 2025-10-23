'use client'

import React, { useState, useEffect } from 'react'
import { Mail, Clock, Layers } from 'lucide-react'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

type EmailProvider = 'resend' | 'sendgrid' | 'mailgun'

interface Step3ConfigurationProps {
  provider: EmailProvider
  from_name: string
  from_email: string
  batch_size: number
  delay_between_batches: number
  onChange: (updates: {
    provider?: EmailProvider
    from_name?: string
    from_email?: string
    batch_size?: number
    delay_between_batches?: number
  }) => void
}

export const Step3Configuration: React.FC<Step3ConfigurationProps> = ({
  provider,
  from_name,
  from_email,
  batch_size,
  delay_between_batches,
  onChange,
}) => {
  const [availableProviders, setAvailableProviders] = useState<EmailProvider[]>([])
  const [isLoadingProviders, setIsLoadingProviders] = useState(true)

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await apiClient.get<EmailProvider[]>('/email-config/available-providers')
        setAvailableProviders(response.data || [])
      } catch (error) {
        logger.error('Failed to load available providers:', error)
        setAvailableProviders(['resend', 'sendgrid', 'mailgun'])
      } finally {
        setIsLoadingProviders(false)
      }
    }
    loadProviders()
  }, [])

  return (
    <div className="space-y-spacing-xl">
      {/* Section Provider & Expéditeur */}
      <div className="space-y-spacing-md">
        <div className="flex items-center gap-2 text-text-primary mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Expéditeur et fournisseur</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
          <Select
            label="Fournisseur d'email *"
            value={provider}
            onChange={e => onChange({ provider: e.target.value as EmailProvider })}
            disabled={isLoadingProviders}
            required
          >
            <option value="resend" disabled={!availableProviders.includes('resend')}>
              Resend{!availableProviders.includes('resend') ? ' (non configuré)' : ''}
            </option>
            <option value="sendgrid" disabled={!availableProviders.includes('sendgrid')}>
              SendGrid{!availableProviders.includes('sendgrid') ? ' (non configuré)' : ''}
            </option>
            <option value="mailgun" disabled={!availableProviders.includes('mailgun')}>
              Mailgun{!availableProviders.includes('mailgun') ? ' (non configuré)' : ''}
            </option>
          </Select>

          <Input
            label="Nom de l'expéditeur *"
            value={from_name}
            onChange={e => onChange({ from_name: e.target.value })}
            placeholder="Ex: ALFORIS Finance"
            required
          />

          <Input
            label="Email de l'expéditeur *"
            type="email"
            value={from_email}
            onChange={e => onChange({ from_email: e.target.value })}
            placeholder="Ex: contact@alforis.com"
            required
          />
        </div>
      </div>

      {/* Section Envoi par lots */}
      <div className="space-y-spacing-md">
        <div className="flex items-center gap-2 text-text-primary mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Paramètres d'envoi par lots</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-md">
          <Input
            label="Taille des lots (batch)"
            type="number"
            min="1"
            max="1000"
            value={batch_size}
            onChange={e => onChange({ batch_size: Number(e.target.value) })}
            helperText="Nombre d'emails envoyés par lot"
            leftIcon={<Layers className="h-4 w-4" />}
          />

          <Input
            label="Délai entre les lots (secondes)"
            type="number"
            min="0"
            max="3600"
            value={delay_between_batches}
            onChange={e => onChange({ delay_between_batches: Number(e.target.value) })}
            helperText="Temps d'attente entre chaque lot"
            leftIcon={<Clock className="h-4 w-4" />}
          />
        </div>

        <Alert
          type="info"
          title="Pourquoi l'envoi par lots ?"
          message="L'envoi par lots permet de respecter les quotas des fournisseurs d'email, d'améliorer la délivrabilité et d'éviter d'être marqué comme spam. Nous recommandons 600 emails par lot avec un délai de 60 secondes."
        />
      </div>

      {/* Estimation */}
      <div className="rounded-radius-md border border-border bg-primary/5 p-spacing-md">
        <p className="text-sm font-medium text-text-primary mb-2">Estimation de l'envoi</p>
        <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary">
          <div>
            <span className="font-medium">Emails par lot :</span> {batch_size}
          </div>
          <div>
            <span className="font-medium">Délai entre lots :</span> {delay_between_batches}s
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step3Configuration
