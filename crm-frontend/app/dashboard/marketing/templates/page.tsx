'use client'

import React, { useState } from 'react'
import { FileText, Plus, Edit, Trash2, Eye, Download } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEmailTemplates } from '@/hooks/useEmailAutomation'
import { useExport } from '@/hooks/useExport'
import { useConfirm } from '@/hooks/useConfirm'
import { TemplateCreateModal } from '@/components/email/TemplateCreateModal'
import { TemplatePreviewModal } from '@/components/email/TemplatePreviewModal'
import { TemplateEditModal } from '@/components/email/TemplateEditModal'

export default function TemplatesPage() {
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
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)
  const [editTemplate, setEditTemplate] = useState<any>(null)

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

  const handlePreview = (template: any) => {
    setPreviewTemplate(template)
  }

  const handleEdit = (template: any) => {
    setEditTemplate(template)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 md:w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Templates Email
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            Gérez vos templates réutilisables pour vos campagnes email
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nouveau Template</span>
          <span className="sm:hidden">Nouveau</span>
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
            className="text-xs md:text-sm"
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('excel')}
            disabled={isExporting}
            className="text-xs md:text-sm"
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('pdf')}
            disabled={isExporting}
            className="text-xs md:text-sm"
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            PDF
          </Button>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-8 md:p-12 text-center">
          <FileText className="mx-auto h-12 w-12 md:h-16 md:w-16 text-gray-400 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun template
          </h3>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 md:mb-6">
            Créez votre premier template email pour commencer
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer un Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg md:rounded-xl flex-shrink-0">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white truncate">
                    {template.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                    {template.subject}
                  </p>
                </div>
              </div>

              <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mb-3 md:mb-4">
                Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePreview(template)}
                  className="flex-1 text-xs md:text-sm"
                  title="Aperçu"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  <span className="hidden sm:inline">Aperçu</span>
                  <span className="sm:hidden">Voir</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(template)}
                  className="flex-1 text-xs md:text-sm"
                  title="Modifier"
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(template)}
                  disabled={isDeleting}
                  className="sm:flex-none text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs md:text-sm"
                  title="Supprimer"
                >
                  <Trash2 className="h-3 w-3 sm:mr-0" />
                  <span className="sm:hidden ml-1">Supprimer</span>
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
        onSuccess={(_templateId) => {
          setIsCreateModalOpen(false)
        }}
      />

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />

      {/* Edit Modal */}
      <TemplateEditModal
        template={editTemplate}
        isOpen={!!editTemplate}
        onClose={() => setEditTemplate(null)}
        onSuccess={() => {
          setEditTemplate(null)
          // Recharger les templates (le hook useEmailTemplates devrait se revalider automatiquement)
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
