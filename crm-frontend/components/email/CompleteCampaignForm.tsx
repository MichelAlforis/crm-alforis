'use client'

import React, { useState, useEffect } from 'react'
import { Save, Mail, Users, FileText } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { EmailEditor, EmailEditorValue } from './EmailEditor'
import RecipientSelector, { RecipientFilters, TargetType } from './RecipientSelector'
import { apiClient } from '@/lib/api'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  body_html: string
  body_text?: string
  variables: string[]
  created_at: string
  updated_at?: string
}

interface CampaignFormData {
  name: string
  description: string
  template_id: number | null
  recipient_filters: RecipientFilters
  batch_size: number
  delay_between_batches: number
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

  // Charger les templates existants
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await apiClient.get<EmailTemplate[]>('/email/templates')
        setTemplates(response.data || [])
      } catch (error) {
        console.error('Failed to load templates:', error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  // Charger le template sélectionné
  useEffect(() => {
    if (formData.template_id) {
      const template = templates.find(t => t.id === formData.template_id)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [formData.template_id, templates])

  const handleFieldChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRecipientFiltersChange = (filters: RecipientFilters) => {
    setFormData(prev => ({ ...prev, recipient_filters: filters }))
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.content.html) {
      alert('Veuillez renseigner le nom, le sujet et le contenu du template')
      return
    }

    setIsSavingTemplate(true)
    try {
      const response = await apiClient.post<EmailTemplate>('/email/templates', {
        name: newTemplate.name,
        subject: newTemplate.subject,
        body_html: newTemplate.content.html,
        body_text: '', // Optionnel
        variables: [], // Sera détecté automatiquement par le backend
      })

      const createdTemplate = response.data
      setTemplates(prev => [...prev, createdTemplate])
      setFormData(prev => ({ ...prev, template_id: createdTemplate.id }))
      setShowTemplateEditor(false)
      setNewTemplate({ name: '', subject: '', content: { html: '' } })
    } catch (error: any) {
      console.error('Failed to create template:', error)
      alert(error?.response?.data?.detail || 'Erreur lors de la création du template')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validations
    if (!formData.name.trim()) {
      alert('Le nom de la campagne est requis')
      return
    }
    if (!formData.template_id) {
      alert('Veuillez sélectionner ou créer un template')
      return
    }

    await onSubmit(formData)
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
                    className="prose prose-sm max-w-none rounded-radius-sm border border-border bg-white p-spacing-sm max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }}
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
      <RecipientSelector
        value={formData.recipient_filters}
        onChange={handleRecipientFiltersChange}
      />

      {/* Configuration d'envoi */}
      <Card>
        <CardHeader
          title="Configuration d'envoi"
          subtitle="Paramètres d'envoi par lots pour éviter les limitations"
        />
        <CardBody className="space-y-spacing-md">
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
    </form>
  )
}

export default CompleteCampaignForm
