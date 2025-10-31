'use client'

import React, { useState, useEffect } from 'react'
import { X, Monitor, Smartphone, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/shared/Input'
import { Alert } from '@/components/shared/Alert'
import { useEmailTemplates } from '@/hooks/useEmailAutomation'
import { useViewportToggle } from '@/hooks/useViewportToggle'
import { logger } from '@/lib/logger'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string
  preheader?: string
}

interface TemplateEditModalProps {
  template: EmailTemplate | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TemplateEditModal({
  template,
  isOpen,
  onClose,
  onSuccess,
}: TemplateEditModalProps) {
  const { updateTemplate } = useEmailTemplates()
  const viewport = useViewportToggle({
    defaultMode: 'desktop',
    modes: ['desktop', 'mobile'],
  })
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    preheader: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les données du template quand il change
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        subject: template.subject || '',
        html_content: template.html_content || '',
        preheader: template.preheader || '',
      })
    }
  }, [template])

  const handleSubmit = async () => {
    if (!template) return

    // Validation
    if (!formData.name.trim() || !formData.subject.trim() || !formData.html_content.trim()) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateTemplate(template.id, {
        name: formData.name,
        subject: formData.subject,
        html_content: formData.html_content,
        preheader: formData.preheader || undefined,
      })

      // Callback de succès
      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err: unknown) {
      logger.error('Failed to update template:', err)
      let message = 'Impossible de mettre à jour le template'
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'detail' in err.response.data &&
        typeof err.response.data.detail === 'string'
      ) {
        message = err.response.data.detail
      } else if (err instanceof Error && err.message) {
        message = err.message
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      onClose()
    }
  }

  if (!template) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-full !h-full sm:!max-w-[95vw] sm:!w-[95vw] sm:!h-[95vh] p-0 overflow-hidden !gap-0">
        <div className="flex flex-col w-full h-full overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl md:text-2xl font-bold truncate">
                  Modifier le template
                </DialogTitle>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                  Éditez le contenu et prévisualisez en temps réel
                </p>
              </div>

              {/* View Mode Toggle + Close (Desktop only in header) */}
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <div className="hidden md:flex items-center gap-1 md:gap-2">
                  <Button
                    size="sm"
                    variant={viewport.isMode('desktop') ? 'default' : 'outline'}
                    onClick={() => viewport.setMode('desktop')}
                    title="Vue Desktop"
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewport.isMode('mobile') ? 'default' : 'outline'}
                    onClick={() => viewport.setMode('mobile')}
                    title="Vue Mobile"
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClose}
                  title="Fermer"
                  className="ml-1 md:ml-2"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Main Content - Split View (Horizontal on large screens, Vertical on small) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Éditeur (Gauche sur desktop, Haut sur mobile) */}
            <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-4 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                Édition
              </h3>

              {error && <Alert type="error" message={error} />}

              <Alert
                type="info"
                message="Les variables sont automatiquement détectées (format: {{nom_variable}})"
                className="text-xs md:text-sm"
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

              <Input
                label="Preheader (optionnel)"
                value={formData.preheader}
                onChange={(e) => setFormData({ ...formData, preheader: e.target.value })}
                placeholder="Texte visible dans l'aperçu de l'email"
                disabled={isSubmitting}
              />

              <div>
                <label className="block text-xs md:text-sm font-medium text-text-primary mb-1">
                  Corps de l'email (HTML) *
                </label>
                <textarea
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  placeholder="<p>Bonjour {{first_name}},</p>&#10;<p>Nous sommes ravis de vous présenter...</p>"
                  rows={12}
                  className="w-full px-2 md:px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-xs md:text-sm font-mono resize-none"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Le preview se met à jour automatiquement
                </p>
              </div>

              <div className="bg-muted/20 rounded-radius-md p-2 md:p-spacing-sm border border-border">
                <h4 className="text-xs md:text-sm font-semibold text-text-primary mb-2">Variables disponibles</h4>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {['first_name', 'last_name', 'email', 'organisation_name', 'country', 'language'].map(
                    (variable) => (
                      <code
                        key={variable}
                        className="text-[10px] md:text-xs bg-white dark:bg-slate-900 px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-border text-primary cursor-pointer hover:bg-gray-50 dark:bg-slate-800 transition-colors"
                        onClick={() => {
                          const variable_text = `{{${variable}}}`
                          setFormData({ ...formData, html_content: formData.html_content + variable_text })
                        }}
                        title="Cliquez pour insérer"
                      >
                        {`{{${variable}}}`}
                      </code>
                    )
                  )}
                </div>
                <p className="text-[10px] md:text-xs text-text-tertiary mt-2">
                  Cliquez sur une variable pour l'insérer
                </p>
              </div>
            </div>

            {/* Preview (Droite sur desktop, Bas sur mobile) */}
            <div className="w-full lg:w-1/2 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 md:mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  Aperçu en temps réel
                </h3>

                {/* View Mode Toggle (Mobile only - visible on small screens) */}
                <div className="flex md:hidden items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                  <Button
                    size="sm"
                    variant={viewport.isMode('desktop') ? 'default' : 'ghost'}
                    onClick={() => viewport.setMode('desktop')}
                    title="Vue Desktop"
                    className="h-7 px-2"
                  >
                    <Monitor className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewport.isMode('mobile') ? 'default' : 'ghost'}
                    onClick={() => viewport.setMode('mobile')}
                    title="Vue Mobile"
                    className="h-7 px-2"
                  >
                    <Smartphone className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="mx-auto" style={{ maxWidth: viewport.maxWidth }}>
                {/* Email Preview Frame */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                  {/* Fake Email Client Header */}
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 md:p-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">
                        A
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm truncate">
                          {formData.name || 'ALFORIS Finance'}
                        </div>
                        <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 truncate">
                          {formData.subject || 'Sujet de l\'email'}
                        </div>
                        {formData.preheader && (
                          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 italic mt-0.5 md:mt-1 truncate">
                            {formData.preheader}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* HTML Content */}
                  <div
                    className="p-3 md:p-4 min-h-[200px] md:min-h-[300px] text-sm md:text-base"
                    dangerouslySetInnerHTML={{ __html: formData.html_content || '<p class="text-gray-400 italic text-xs md:text-sm">Votre contenu apparaîtra ici...</p>' }}
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      color: '#374151'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-3 md:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400 truncate w-full sm:w-auto">
              <span className="hidden md:inline">ID: {template.id} • Dernière modification: {new Date(template.updated_at || template.created_at).toLocaleDateString('fr-FR')}</span>
              <span className="md:hidden">ID: {template.id}</span>
            </div>
            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none text-xs md:text-sm"
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs md:text-sm"
                size="sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Enregistrement...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
