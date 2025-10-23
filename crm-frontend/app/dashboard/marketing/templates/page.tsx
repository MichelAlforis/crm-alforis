'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Edit, Trash2, Eye, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEmailTemplates } from '@/hooks/useEmailAutomation'
import { useExport } from '@/hooks/useExport'
import { useConfirm } from '@/hooks/useConfirm'
import { TemplateCreateModal } from '@/components/email/TemplateCreateModal'

export default function TemplatesPage() {
  const router = useRouter()
  const {
    templates,
    isLoading: loading,
    deleteTemplate,
    isDeleting,
  } = useEmailTemplates()

  const { exportData, isExporting } = useExport({
    resource: 'email/templates',
    baseFilename: 'templates-email',
  })

  const { confirm, ConfirmDialogComponent } = useConfirm()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleDelete = (template: { id: number; name: string }) => {
    confirm({
      title: 'Supprimer le template ?',
      message: `Êtes-vous sûr de vouloir supprimer "${template.name}" ? Cette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        await deleteTemplate(template.id)
      },
    })
  }

  const handlePreview = (template: { id: number; name: string }) => {
    confirm({
      title: 'Aperçu',
      message: 'La fonctionnalité d\'aperçu est en cours de développement.',
      type: 'info',
      confirmText: 'OK',
      onConfirm: () => {},
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Templates Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérez vos templates réutilisables pour vos campagnes email
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Template
        </Button>
      </div>

      {/* Boutons d'export */}
      {templates.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('excel')}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('pdf')}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun template
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Créez votre premier template email pour commencer
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer un Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl">
                  <FileText className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {template.subject}
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePreview(template)}
                  className="flex-1"
                  title="Aperçu (bientôt disponible)"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Aperçu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(template)}
                  disabled={isDeleting}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Supprimer"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <TemplateCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(templateId) => {
          setIsCreateModalOpen(false)
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
