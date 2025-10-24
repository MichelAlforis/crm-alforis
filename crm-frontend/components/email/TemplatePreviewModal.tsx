'use client'

import React from 'react'
import { X, Mail, Smartphone, Monitor } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/shared/Input'
import { useViewportToggle } from '@/hooks/useViewportToggle'
import { apiClient } from '@/lib/api'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string
  preheader?: string
}

interface TemplatePreviewModalProps {
  template: EmailTemplate | null
  isOpen: boolean
  onClose: () => void
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
}: TemplatePreviewModalProps) {
  const viewport = useViewportToggle({
    defaultMode: 'desktop',
    modes: ['desktop', 'mobile'],
  })
  const [testEmail, setTestEmail] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const [sendSuccess, setSendSuccess] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)

  const handleSendTest = async () => {
    if (!testEmail.trim() || !template) return

    setIsSending(true)
    setSendError(null)
    setSendSuccess(false)

    try {
      await apiClient.post(`/email/templates/${template.id}/send-test`, null, {
        params: { test_email: testEmail }
      })
      setSendSuccess(true)
      setTimeout(() => {
        setSendSuccess(false)
        setTestEmail('')
      }, 3000)
    } catch (error: any) {
      setSendError(error?.response?.data?.detail || 'Erreur lors de l\'envoi')
    } finally {
      setIsSending(false)
    }
  }

  if (!template) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-0 w-full">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg md:text-2xl font-bold truncate">
                  Aperçu : {template.name}
                </DialogTitle>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                  <Mail className="inline w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Sujet : {template.subject}
                </p>
                {template.preheader && (
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                    Preheader : {template.preheader}
                  </p>
                )}
              </div>

              {/* View Mode Toggle + Close */}
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant={viewport.isMode('desktop') ? 'default' : 'outline'}
                  onClick={() => viewport.setMode('desktop')}
                  title="Vue Desktop"
                  className="hidden sm:flex"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewport.isMode('mobile') ? 'default' : 'outline'}
                  onClick={() => viewport.setMode('mobile')}
                  title="Vue Mobile"
                  className="hidden sm:flex"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  title="Fermer"
                  className="ml-1 md:ml-2"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-3 md:p-6">
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
                      ALFORIS Finance
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 truncate">
                      {template.subject}
                    </div>
                  </div>
                </div>
              </div>

              {/* HTML Content */}
              <div
                className="p-3 md:p-4 text-sm md:text-base"
                dangerouslySetInnerHTML={{ __html: template.html_content }}
                style={{
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.6',
                  color: '#374151'
                }}
              />
            </div>
          </div>
        </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 p-3 md:p-6 border-t border-gray-200 dark:border-gray-700">
            {/* Email de test */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="votre-email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={isSending}
                  className="text-xs md:text-sm"
                />
              </div>
              <Button
                onClick={handleSendTest}
                disabled={!testEmail.trim() || isSending}
                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs md:text-sm"
                size="sm"
              >
                {isSending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Envoyer un test
                  </>
                )}
              </Button>
            </div>

            {/* Messages de succès/erreur */}
            {sendSuccess && (
              <div className="text-xs md:text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                ✅ Email de test envoyé avec succès à {testEmail}
              </div>
            )}
            {sendError && (
              <div className="text-xs md:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                ❌ {sendError}
              </div>
            )}

            {/* Bouton Fermer */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto text-xs md:text-sm"
                size="sm"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
