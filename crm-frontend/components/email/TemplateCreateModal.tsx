'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

interface TemplateCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (templateId: number) => void
}

export const TemplateCreateModal: React.FC<TemplateCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim() || !formData.subject.trim() || !formData.html_content.trim()) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiClient.post('/email/templates', {
        name: formData.name,
        subject: formData.subject,
        html_content: formData.html_content,
      })

      // Succès
      const template = response.data

      // Reset form
      setFormData({
        name: '',
        subject: '',
        html_content: '',
      })

      // Callback
      if (onSuccess && template.id) {
        onSuccess(template.id)
      }

      onClose()
    } catch (err: any) {
      logger.error('Failed to create template:', err)
      setError(err?.response?.data?.detail || 'Impossible de créer le template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        subject: '',
        html_content: '',
      })
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer un nouveau template"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          >
            {isSubmitting ? 'Création...' : 'Créer le template'}
          </Button>
        </>
      }
    >
      <div className="space-y-spacing-md">
        {error && <Alert type="error" message={error} />}

        <Alert
          type="info"
          message="Les variables sont automatiquement détectées (format: {{nom_variable}})"
        />

        <Input
          label="Nom du template *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Newsletter mensuelle"
          required
          disabled={isSubmitting}
        />

        <Input
          label="Sujet de l'email *"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Ex: Bonjour {{first_name}}, voici notre newsletter"
          required
          disabled={isSubmitting}
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Corps de l'email (HTML) *
          </label>
          <textarea
            value={formData.html_content}
            onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
            placeholder="<p>Bonjour {{first_name}},</p>&#10;<p>Nous sommes ravis de vous présenter...</p>"
            rows={12}
            className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-mono resize-none"
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-text-tertiary mt-1">
            Utilisez du HTML pour formatter votre email
          </p>
        </div>

        <div className="bg-muted/20 rounded-radius-md p-spacing-sm border border-border">
          <h4 className="text-sm font-semibold text-text-primary mb-2">Variables disponibles</h4>
          <div className="flex flex-wrap gap-2">
            {['first_name', 'last_name', 'email', 'organisation_name', 'country', 'language'].map(
              (variable) => (
                <code
                  key={variable}
                  className="text-xs bg-white px-2 py-1 rounded border border-border text-primary"
                >
                  {`{{${variable}}}`}
                </code>
              )
            )}
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Ces variables seront automatiquement remplacées lors de l'envoi
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default TemplateCreateModal
