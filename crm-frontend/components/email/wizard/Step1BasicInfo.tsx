'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { TemplateCreateModal } from '../TemplateCreateModal'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string
  body_text?: string
  variables?: string[]
  created_at: string
  updated_at?: string
}

interface Step1BasicInfoProps {
  name: string
  description: string
  template_id: number | null
  onChange: (updates: { name?: string; description?: string; template_id?: number | null }) => void
}

export const Step1BasicInfo: React.FC<Step1BasicInfoProps> = ({
  name,
  description,
  template_id,
  onChange,
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await apiClient.get<EmailTemplate[]>('/email/templates')
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (template_id) {
      const template = templates.find(t => t.id === template_id)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [template_id, templates])

  const handleTemplateCreated = async (templateId: number) => {
    // Recharger la liste des templates
    await loadTemplates()

    // Sélectionner automatiquement le nouveau template
    onChange({ template_id: templateId })
  }

  return (
    <div className="space-y-spacing-lg">
      {/* Nom de la campagne */}
      <Input
        label="Nom de la campagne *"
        value={name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Ex: Newsletter Q1 2025"
        required
        helperText="Donnez un nom clair et descriptif à votre campagne"
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Description (optionnel)
        </label>
        <textarea
          value={description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Décrivez l'objectif de cette campagne..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
        />
      </div>

      {/* Sélection du template */}
      <div className="space-y-spacing-sm">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-text-primary">
            Template d'email *
          </label>
          <Button
            variant="ghost"
            size="xs"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Créer un template
          </Button>
        </div>

        <Select
          value={template_id?.toString() || ''}
          onChange={e => onChange({ template_id: e.target.value ? Number(e.target.value) : null })}
          disabled={isLoadingTemplates}
        >
          <option value="">Sélectionner un template</option>
          {templates.map(tpl => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </Select>

        {templates.length === 0 && !isLoadingTemplates && (
          <Alert
            type="info"
            message="Aucun template disponible. Créez votre premier template en cliquant sur 'Créer un template'."
          />
        )}
      </div>

      {/* Aperçu du template sélectionné */}
      {selectedTemplate && (
        <div className="rounded-radius-md border border-border bg-muted/10 p-spacing-md space-y-spacing-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {selectedTemplate.name}
              </p>
              <p className="text-xs text-text-secondary">
                Sujet : {selectedTemplate.subject}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-spacing-sm">
            <p className="text-xs font-medium text-text-secondary mb-2">Aperçu du contenu :</p>
            <div
              className="prose prose-sm max-w-none rounded-radius-sm border border-border bg-white p-spacing-sm max-h-60 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }}
            />
          </div>
        </div>
      )}

      {/* Aide */}
      <Alert
        type="info"
        title="Conseil"
        message="Le template définit le design et le contenu de votre email. Vous pourrez personnaliser certains éléments lors de la programmation de l'envoi."
      />

      {/* Modal de création de template */}
      <TemplateCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTemplateCreated}
      />
    </div>
  )
}

export default Step1BasicInfo
