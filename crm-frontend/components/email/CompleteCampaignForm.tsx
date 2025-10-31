'use client'

import React, { useState, useEffect } from 'react'
import { Save, Mail, FileText } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { EmailEditor, EmailEditorValue } from './EmailEditor'
import RecipientSelectorTable, { RecipientFilters, TargetType } from './RecipientSelectorTable'
import { apiClient } from '@/lib/api'
import { useConfirm } from '@/hooks/useConfirm'
import { logger } from '@/lib/logger'

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'detail' in error.response.data &&
    typeof error.response.data.detail === 'string'
  ) {
    return error.response.data.detail
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string  // Le backend retourne html_content, pas body_html
  body_text?: string
  variables?: string[]
  created_at: string
  updated_at?: string
}

type EmailProvider = 'resend' | 'sendgrid' | 'mailgun'

interface CampaignFormData {
  name: string
  description: string
  template_id: number | null
  recipient_filters: RecipientFilters
  batch_size: number
  delay_between_batches: number
  from_name: string
  from_email: string
  provider: EmailProvider
}

interface CompleteCampaignFormProps {
  onSubmit: (data: CampaignFormData) => Promise<void>
  isSubmitting?: boolean
  className?: string
}

export const CompleteCampaignForm: React.FC<CompleteCampaignFormProps> = ({
  onSubmit,
  isSubmitting = false,
  className,
}) => {
  const { confirm, ConfirmDialogComponent } = useConfirm()

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    template_id: null,
    recipient_filters: {
      target_type: 'contacts' as TargetType,
      languages: [],
      countries: [],
      organisation_categories: [],
    },
    batch_size: 600,
    delay_between_batches: 60,
    from_name: 'ALFORIS Finance',
    from_email: 'contact@alforis.com',
    provider: 'resend',
  })

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [newTemplate, setNewTemplate] = useState<{
    name: string
    subject: string
    content: EmailEditorValue
  }>({
    name: '',
    subject: '',
    content: { html: '' },
  })
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number>(0)
  const [availableProviders, setAvailableProviders] = useState<EmailProvider[]>([])
  const [isLoadingProviders, setIsLoadingProviders] = useState(true)

  // Charger les providers disponibles
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await apiClient.get<EmailProvider[]>('/email-config/available-providers')
        setAvailableProviders(response.data || [])
      } catch (error) {
        logger.error('Failed to load available providers:', error)
        // En cas d'erreur, autoriser tous les providers
        setAvailableProviders(['resend', 'sendgrid', 'mailgun'])
      } finally {
        setIsLoadingProviders(false)
      }
    }
    loadProviders()
  }, [])

  // Charger les templates existants
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        logger.log('🔄 Chargement des templates...')
        const response = await apiClient.get<EmailTemplate[]>('/email/templates')
        logger.log('✅ Templates reçus:', response.data)
        logger.log('📊 Nombre de templates:', response.data?.length || 0)
        setTemplates(response.data || [])
      } catch (error) {
        logger.error('❌ Failed to load templates:', error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  // Charger le template sélectionné
  useEffect(() => {
    logger.log('🔍 Template ID sélectionné:', formData.template_id)
    logger.log('📦 Templates disponibles:', templates)
    if (formData.template_id) {
      const template = templates.find(t => t.id === formData.template_id)
      logger.log('🎯 Template trouvé:', template)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [formData.template_id, templates])

  const handleFieldChange = <K extends keyof CampaignFormData>(
    field: K,
    value: CampaignFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRecipientFiltersChange = (filters: RecipientFilters) => {
    setFormData(prev => ({ ...prev, recipient_filters: filters }))
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.content.html) {
      confirm({
        title: 'Informations manquantes',
        message: 'Veuillez renseigner le nom, le sujet et le contenu du template avant de l\'enregistrer.',
        type: 'warning',
        confirmText: 'Compris',
        onConfirm: () => {},
      })
      return
    }

    setIsSavingTemplate(true)
    try {
      const response = await apiClient.post<EmailTemplate>('/email/templates', {
        name: newTemplate.name,
        subject: newTemplate.subject,
        html_content: newTemplate.content.html,
        category: 'custom',
        is_active: true,
      })

      const createdTemplate = response.data
      setTemplates(prev => [...prev, createdTemplate])
      setFormData(prev => ({ ...prev, template_id: createdTemplate.id }))
      setShowTemplateEditor(false)
      setNewTemplate({ name: '', subject: '', content: { html: '' } })
    } catch (error: unknown) {
      logger.error('Failed to create template:', error)
      confirm({
        title: 'Erreur lors de la création',
        message: getErrorMessage(
          error,
          'Impossible de créer le template. Veuillez réessayer.'
        ),
        type: 'danger',
        confirmText: 'Compris',
        onConfirm: () => {},
      })
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validations
    if (!formData.name.trim()) {
      confirm({
        title: 'Nom de campagne requis',
        message: 'Veuillez saisir un nom pour votre campagne email.',
        type: 'warning',
        confirmText: 'Compris',
        onConfirm: () => {},
      })
      return
    }
    if (!formData.template_id) {
      confirm({
        title: 'Template requis',
        message: 'Veuillez sélectionner ou créer un template avant de créer la campagne.',
        type: 'warning',
        confirmText: 'Compris',
        onConfirm: () => {},
      })
      return
    }

    // Afficher le modal de confirmation avec récapitulatif
    const templateName = selectedTemplate?.name || 'Template inconnu'
    const targetTypeLabel = formData.recipient_filters.target_type === 'contacts' ? 'Contacts' : 'Organisations'
    const providerLabel = formData.provider === 'resend' ? 'Resend' : formData.provider === 'sendgrid' ? 'SendGrid' : 'Mailgun'

    confirm({
      title: 'Créer la campagne ?',
      message: `Vous allez créer la campagne "${formData.name}" avec le template "${templateName}" pour ${recipientCount} ${targetTypeLabel.toLowerCase()}.\n\nFournisseur : ${providerLabel}\nExpéditeur : ${formData.from_name} <${formData.from_email}>\n\nConfirmez-vous ?`,
      type: 'info',
      confirmText: 'Créer la campagne',
      cancelText: 'Annuler',
      onConfirm: async () => {
        await onSubmit(formData)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-spacing-xl ${className}`}>
      {/* Informations générales */}
      <Card>
        <CardHeader
          title="Informations de la campagne"
          subtitle="Nom et description de votre campagne email"
          icon={<Mail className="h-5 w-5" />}
        />
        <CardBody className="space-y-spacing-md">
          <Input
            label="Nom de la campagne *"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Ex: Newsletter Q1 2025"
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Courte description de la campagne"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        </CardBody>
      </Card>

      {/* Template email */}
      <Card>
        <CardHeader
          title="Template d'email"
          subtitle="Sélectionnez un template existant ou créez-en un nouveau"
          icon={<FileText className="h-5 w-5" />}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
            >
              {showTemplateEditor ? 'Sélectionner un template' : 'Créer un nouveau template'}
            </Button>
          }
        />
        <CardBody className="space-y-spacing-md">
          {!showTemplateEditor ? (
            <>
              <Select
                label="Template *"
                value={formData.template_id?.toString() || ''}
                onChange={(e) => handleFieldChange('template_id', e.target.value ? Number(e.target.value) : null)}
                disabled={isLoadingTemplates}
              >
                <option value="">Sélectionner un template</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </Select>

              {templates.length === 0 && !isLoadingTemplates && (
                <Alert
                  type="info"
                  message="Aucun template disponible. Créez votre premier template en cliquant sur 'Créer un nouveau template'."
                />
              )}

              {selectedTemplate && (
                <div className="rounded-radius-md border border-border bg-muted/20 p-spacing-md">
                  <p className="text-sm font-medium text-text-primary mb-2">
                    Aperçu du template : {selectedTemplate.name}
                  </p>
                  <p className="text-xs text-text-secondary mb-3">
                    Sujet : {selectedTemplate.subject}
                  </p>
                  <div
                    className="prose prose-sm max-w-none rounded-radius-sm border border-border bg-white dark:bg-slate-900 p-spacing-sm max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-spacing-md">
              <Input
                label="Nom du template *"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Newsletter Mensuelle"
              />
              <Input
                label="Sujet de l'email *"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Ex: Bonjour {{first_name}}, découvrez nos nouveautés !"
              />

              <EmailEditor
                value={newTemplate.content}
                onChange={(content) => setNewTemplate(prev => ({ ...prev, content }))}
                title="Contenu du template"
                subtitle="Créez votre email avec l'éditeur drag & drop"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTemplateEditor(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateTemplate}
                  isLoading={isSavingTemplate}
                >
                  Enregistrer le template
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sélection des destinataires */}
      <RecipientSelectorTable
        value={formData.recipient_filters}
        onChange={handleRecipientFiltersChange}
        onCountChange={setRecipientCount}
      />

      {/* Configuration d'envoi */}
      <Card>
        <CardHeader
          title="Configuration d'envoi"
          subtitle="Paramètres d'envoi par lots pour éviter les limitations"
        />
        <CardBody className="space-y-spacing-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-md">
            <Select
              label="Fournisseur d'email *"
              value={formData.provider}
              onChange={(e) => handleFieldChange('provider', e.target.value as EmailProvider)}
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
              value={formData.from_name}
              onChange={(e) => handleFieldChange('from_name', e.target.value)}
              placeholder="Ex: ALFORIS Finance"
              required
            />
            <Input
              label="Email de l'expéditeur *"
              type="email"
              value={formData.from_email}
              onChange={(e) => handleFieldChange('from_email', e.target.value)}
              placeholder="Ex: contact@alforis.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-md">
            <Input
              label="Taille des lots (batch)"
              type="number"
              min="1"
              max="1000"
              value={formData.batch_size}
              onChange={(e) => handleFieldChange('batch_size', Number(e.target.value))}
              helperText="Nombre d'emails envoyés par lot (recommandé : 600)"
            />
            <Input
              label="Délai entre les lots (secondes)"
              type="number"
              min="0"
              value={formData.delay_between_batches}
              onChange={(e) => handleFieldChange('delay_between_batches', Number(e.target.value))}
              helperText="Temps d'attente entre chaque lot (recommandé : 60s)"
            />
          </div>

          <Alert
            type="info"
            message="L'envoi par lots permet de respecter les quotas des fournisseurs d'email et d'éviter d'être marqué comme spam."
          />
        </CardBody>
      </Card>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={!formData.template_id || !formData.name.trim()}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Créer la campagne
        </Button>
      </div>

      {/* Modal de confirmation */}
      <ConfirmDialogComponent />
    </form>
  )
}

export default CompleteCampaignForm
