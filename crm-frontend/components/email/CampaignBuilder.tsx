'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { useEmailTemplates } from '@/hooks/useEmailAutomation'
import type {
  EmailCampaign,
  EmailCampaignInput,
  EmailCampaignStepInput,
  EmailProvider,
  EmailTemplate,
  EmailVariant,
} from '@/lib/types'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'

type StepFormValue = EmailCampaignStepInput & {
  id?: number
  key: string
}

interface CampaignFormState {
  name: string
  description?: string
  provider: EmailProvider
  from_name: string
  from_email: string
  reply_to?: string
  subject?: string
  preheader?: string
  track_opens: boolean
  track_clicks: boolean
  is_ab_test: boolean
  ab_test_split_percentage: number
  rate_limit_per_minute?: number
  schedule_type?: 'manual' | 'immediate' | 'scheduled'
  steps: StepFormValue[]
}

interface CampaignBuilderProps {
  initialCampaign?: EmailCampaign | null
  onSubmit: (payload: EmailCampaignInput) => Promise<void> | void
  isSubmitting?: boolean
  className?: string
}

const PROVIDER_OPTIONS: { value: EmailProvider; label: string }[] = [
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
]

const defaultFormState: CampaignFormState = {
  name: '',
  provider: 'sendgrid',
  from_name: 'Equipe Alforis',
  from_email: 'marketing@example.com',
  reply_to: '',
  subject: '',
  preheader: '',
  description: '',
  track_opens: true,
  track_clicks: true,
  is_ab_test: false,
  ab_test_split_percentage: 50,
  rate_limit_per_minute: 120,
  schedule_type: 'manual',
  steps: [
    {
      key: `step-${Date.now()}`,
      order_index: 1,
      delay_hours: 0,
    },
  ],
}

const mapCampaignToForm = (campaign: EmailCampaign): CampaignFormState => ({
  name: campaign.name,
  description: campaign.description ?? '',
  provider: campaign.provider,
  from_name: campaign.from_name,
  from_email: campaign.from_email,
  reply_to: campaign.reply_to ?? '',
  subject: campaign.subject ?? '',
  preheader: campaign.preheader ?? '',
  track_opens: campaign.track_opens,
  track_clicks: campaign.track_clicks,
  is_ab_test: campaign.is_ab_test,
  ab_test_split_percentage: campaign.ab_test_split_percentage,
  rate_limit_per_minute: campaign.rate_limit_per_minute ?? undefined,
  schedule_type: campaign.schedule_type ?? 'manual',
  steps: campaign.steps
    .sort((a, b) => a.order_index - b.order_index)
    .map((step) => ({
      key: `step-${step.id ?? Math.random()}`,
      id: step.id,
      template_id: step.template_id,
      subject: step.subject ?? undefined,
      preheader: step.preheader ?? undefined,
      order_index: step.order_index,
      delay_hours: step.delay_hours,
      wait_for_event: step.wait_for_event ?? undefined,
      variant: step.variant ?? undefined,
      send_window_hours: step.send_window_hours ?? undefined,
    })),
})

const toPayload = (form: CampaignFormState): EmailCampaignInput => ({
  name: form.name,
  description: form.description || undefined,
  provider: form.provider,
  from_name: form.from_name,
  from_email: form.from_email,
  reply_to: form.reply_to || undefined,
  subject: form.subject || undefined,
  preheader: form.preheader || undefined,
  track_opens: form.track_opens,
  track_clicks: form.track_clicks,
  is_ab_test: form.is_ab_test,
  ab_test_split_percentage: form.ab_test_split_percentage,
  rate_limit_per_minute: form.rate_limit_per_minute,
  schedule_type: form.schedule_type,
  steps: form.steps
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((step): EmailCampaignStepInput => ({
      template_id: step.template_id,
      subject: step.subject,
      preheader: step.preheader,
      order_index: step.order_index,
      delay_hours: step.delay_hours,
      wait_for_event: step.wait_for_event,
      variant: step.variant,
      send_window_hours: step.send_window_hours,
    })),
})

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  initialCampaign,
  onSubmit,
  isSubmitting = false,
  className,
}) => {
  const [form, setForm] = useState<CampaignFormState>(initialCampaign ? mapCampaignToForm(initialCampaign) : defaultFormState)
  const { templates, isLoading: templateLoading } = useEmailTemplates({ onlyActive: true })

  useEffect(() => {
    if (initialCampaign) {
      setForm(mapCampaignToForm(initialCampaign))
    }
  }, [initialCampaign])

  const handleFieldChange = (field: keyof CampaignFormState, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleStepChange = (index: number, value: Partial<StepFormValue>) => {
    setForm((prev) => {
      const updated = [...prev.steps]
      updated[index] = { ...updated[index], ...value }
      return { ...prev, steps: updated }
    })
  }

  const handleAddStep = () => {
    setForm((prev) => {
      const nextOrder = (prev.steps[prev.steps.length - 1]?.order_index ?? prev.steps.length) + 1
      return {
        ...prev,
        steps: [
          ...prev.steps,
          {
            key: `step-${Date.now()}`,
            order_index: nextOrder,
            delay_hours: 24,
            template_id: templates[0]?.id,
            subject: prev.subject ?? '',
            preheader: prev.preheader ?? '',
            variant: prev.is_ab_test ? ('A' as EmailVariant) : undefined,
          },
        ],
      }
    })
  }

  const handleRemoveStep = (index: number) => {
    setForm((prev) => {
      const updated = prev.steps.filter((_, idx) => idx !== index)
      const normalised = updated.map((step, idx) => ({ ...step, order_index: idx + 1 }))
      return {
        ...prev,
        steps: normalised.length > 0 ? normalised : prev.steps,
      }
    })
  }

  const handleDuplicateStep = (index: number) => {
    setForm((prev) => {
      const target = prev.steps[index]
      const cloned: StepFormValue = {
        ...target,
        key: `step-${Date.now()}`,
        variant: target.variant,
      }
      const next = [...prev.steps]
      next.splice(index + 1, 0, cloned)
      return {
        ...prev,
        steps: next.map((step, idx) => ({ ...step, order_index: idx + 1 })),
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = toPayload(form)
    await onSubmit(payload)
  }

  const templateOptions = useMemo(() => templates.map((tpl) => ({ value: tpl.id, label: tpl.name })), [templates])
  const atLeastOneTemplate = templates.length > 0

  return (
    <Card className={className}>
      <CardHeader
        title={initialCampaign ? 'Modifier la campagne email' : 'Nouvelle campagne email'}
        subtitle="Définissez le contenu, les étapes et les paramètres d\'envoi. Les segments sont gérés dans le module Audience."
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-spacing-xl">
          <section className="space-y-spacing-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">Informations générales</h3>
            <div className="grid gap-spacing-md md:grid-cols-2">
              <Input
                required
                label="Nom de la campagne"
                placeholder="Ex: Relance proposition Q2"
                value={form.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
              />
              <Select
                label="Fournisseur"
                value={form.provider}
                onChange={(event) => handleFieldChange('provider', event.target.value as EmailProvider)}
                options={PROVIDER_OPTIONS}
              />
            </div>
            <Input
              label="Description"
              placeholder="Contexte interne pour l'équipe commerciale"
              value={form.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
            />
          </section>

          <section className="space-y-spacing-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">Expéditeur & objet</h3>
            <div className="grid gap-spacing-md md:grid-cols-3">
              <Input
                label="Nom expéditeur"
                value={form.from_name}
                onChange={(event) => handleFieldChange('from_name', event.target.value)}
              />
              <Input
                type="email"
                label="Email expéditeur"
                value={form.from_email}
                onChange={(event) => handleFieldChange('from_email', event.target.value)}
              />
              <Input
                type="email"
                label="Reply-to (optionnel)"
                value={form.reply_to}
                onChange={(event) => handleFieldChange('reply_to', event.target.value)}
              />
            </div>
            <div className="grid gap-spacing-md md:grid-cols-2">
              <Input
                label="Objet principal"
                value={form.subject}
                onChange={(event) => handleFieldChange('subject', event.target.value)}
              />
              <Input
                label="Préheader"
                value={form.preheader}
                onChange={(event) => handleFieldChange('preheader', event.target.value)}
              />
            </div>
          </section>

          <section className="space-y-spacing-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">Tracking & tests</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.track_opens}
                  onChange={(event) => handleFieldChange('track_opens', event.target.checked)}
                />
                Suivre les ouvertures (pixel)
              </label>
              <label className="flex items-center gap-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.track_clicks}
                  onChange={(event) => handleFieldChange('track_clicks', event.target.checked)}
                />
                Suivre les clics (liens trackés)
              </label>
              <label className="flex items-center gap-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.is_ab_test}
                  onChange={(event) => handleFieldChange('is_ab_test', event.target.checked)}
                />
                Activer A/B testing
              </label>
            </div>
            {form.is_ab_test && (
              <div className="grid max-w-md grid-cols-2 gap-spacing-md">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  label="Split variante A (%)"
                  value={form.ab_test_split_percentage}
                  onChange={(event) => handleFieldChange('ab_test_split_percentage', Number(event.target.value))}
                />
                <div className="flex items-end text-sm text-text-secondary">
                  <span>Variante B: {100 - form.ab_test_split_percentage}%</span>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-spacing-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">Séquence d'envoi</h3>
              <Button variant="ghost" size="sm" onClick={handleAddStep} leftIcon={<Plus className="h-4 w-4" />}>
                Ajouter une étape
              </Button>
            </div>

            {!atLeastOneTemplate && !templateLoading && (
              <Alert
                type="warning"
                message="Aucun template actif. Créez un template dans la bibliothèque avant de configurer votre séquence."
              />
            )}

            {form.steps.map((step, index) => {
              const template = templates.find((tpl) => tpl.id === step.template_id)
              return (
                <Card key={step.key} variant="bordered" className="border-dashed">
                  <CardBody className="space-y-spacing-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Étape #{index + 1}</p>
                        <p className="text-xs text-text-secondary">
                          {step.delay_hours ? `${step.delay_hours}h après l'étape précédente` : 'Envoi immédiat'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicateStep(index)}>
                          Dupliquer
                        </Button>
                        {form.steps.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveStep(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-spacing-md md:grid-cols-2">
                      <Select
                        label="Template"
                        value={step.template_id ?? ''}
                        onChange={(event) => handleStepChange(index, { template_id: Number(event.target.value) })}
                      >
                        <option value="">Sélectionner un template</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        label="Délai (heures)"
                        value={step.delay_hours ?? 0}
                        onChange={(event) => handleStepChange(index, { delay_hours: Number(event.target.value) })}
                      />
                    </div>

                    <div className="grid gap-spacing-md md:grid-cols-2">
                      <Input
                        label="Objet personnalisé"
                        placeholder={form.subject ?? 'Objet principal par défaut'}
                        value={step.subject ?? ''}
                        onChange={(event) => handleStepChange(index, { subject: event.target.value || undefined })}
                      />
                      <Input
                        label="Préheader personnalisé"
                        placeholder={form.preheader ?? 'Préheader principal'}
                        value={step.preheader ?? ''}
                        onChange={(event) => handleStepChange(index, { preheader: event.target.value || undefined })}
                      />
                    </div>

                    <div className="grid gap-spacing-md md:grid-cols-2">
                      <Input
                        type="number"
                        min={1}
                        max={72}
                        label="Fenêtre d'envoi (heures, optionnel)"
                        value={step.send_window_hours ?? ''}
                        onChange={(event) =>
                          handleStepChange(index, {
                            send_window_hours: event.target.value ? Number(event.target.value) : undefined,
                          })
                        }
                        helperText="Limite le créneau d'envoi (utile pour les campagnes décalées)."
                      />
                      {form.is_ab_test && (
                        <Select
                          label="Variante"
                          value={step.variant ?? ''}
                          onChange={(event) => handleStepChange(index, { variant: event.target.value as EmailVariant })}
                        >
                          <option value="">Automatique</option>
                          <option value="A">Variante A</option>
                          <option value="B">Variante B</option>
                        </Select>
                      )}
                    </div>

                    {template && (
                      <p className="rounded-radius-md border border-dashed border-border bg-muted/40 p-spacing-sm text-xs text-text-secondary">
                        Basé sur le template « {template.name} ». Dernière mise à jour :{' '}
                        {new Date(template.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardBody>
                </Card>
              )
            })}
          </section>

          <section className="space-y-spacing-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">Cadence & limites</h3>
            <div className="grid gap-spacing-md md:grid-cols-3">
              <Input
                type="number"
                min={30}
                label="Quota/minute"
                value={form.rate_limit_per_minute ?? ''}
                onChange={(event) => handleFieldChange('rate_limit_per_minute', event.target.value ? Number(event.target.value) : undefined)}
                helperText="Permet de respecter les quotas d'envoi du provider."
              />
              <Select
                label="Mode de planification"
                value={form.schedule_type}
                onChange={(event) => handleFieldChange('schedule_type', event.target.value as any)}
              >
                <option value="manual">Manuel (via Audience)</option>
                <option value="immediate">Immédiat</option>
                <option value="scheduled">Planifié</option>
              </Select>
              <div className="rounded-radius-md border border-dashed border-border bg-muted/40 p-spacing-md text-xs text-text-secondary">
                <CalendarClock className="mb-1 h-4 w-4 text-text-tertiary" />
                La planification détaillée (date, heure, fuseau) et la segmentation finale se font dans le module « Audience & Lancement ».
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={!atLeastOneTemplate || form.name.trim() === '' || form.steps.length === 0}
            >
              {initialCampaign ? 'Enregistrer les modifications' : 'Créer la campagne'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

export default CampaignBuilder
