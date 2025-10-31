'use client'

import React, { useState } from 'react'
import { ModalForm } from '@/components/shared/Modal'
import { Input } from '@/components/shared/Input'
import { Alert } from '@/components/shared/Alert'
import { apiClient } from '@/lib/api'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

  const isFormValid =
    formData.name.trim() && formData.subject.trim() && formData.html_content.trim()

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un nouveau template"
      onSubmit={handleSubmit}
      submitLabel="Créer le template"
      isLoading={isSubmitting}
      submitDisabled={!isFormValid}
      error={error}
      size="lg"
    >
      <div className="space-y-4">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Corps de l'email (HTML) *
          </label>
          <textarea
            value={formData.html_content}
            onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
            placeholder="<p>Bonjour {{first_name}},</p>&#10;<p>Nous sommes ravis de vous présenter...</p>"
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-mono resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Utilisez du HTML pour formatter votre email
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Variables disponibles
          </h4>
          <div className="flex flex-wrap gap-2">
            {['first_name', 'last_name', 'email', 'organisation_name', 'country', 'language'].map(
              (variable) => (
                <code
                  key={variable}
                  className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400"
                >
                  {`{{${variable}}}`}
                </code>
              )
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Ces variables seront automatiquement remplacées lors de l'envoi
          </p>
        </div>
      </div>
    </ModalForm>
  )
}

export default TemplateCreateModal
