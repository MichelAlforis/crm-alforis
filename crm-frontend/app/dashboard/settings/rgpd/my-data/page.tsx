'use client'

import { useState } from 'react'
import {
  Download,
  Trash2,
  AlertTriangle,
  Shield,
  Loader2,
  FileJson,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { format } from 'date-fns'

export default function MyDataPage() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const response = await apiClient.get('/rgpd/export')
      const data = response.data.data

      // Create JSON file and download
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mes-donnees-${user?.email}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast('Vos données ont été exportées avec succès', 'success')
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Erreur lors de l\'export de vos données', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'SUPPRIMER') {
      showToast('Veuillez taper "SUPPRIMER" pour confirmer', 'error')
      return
    }

    if (deleteReason.trim().length < 10) {
      showToast('Veuillez indiquer une raison (minimum 10 caractères)', 'error')
      return
    }

    try {
      setIsDeleting(true)
      await apiClient.delete('/rgpd/delete', {
        data: {
          reason: deleteReason,
          confirm: true,
        },
      })

      showToast('Vos données ont été supprimées. Vous allez être déconnecté.', 'success')

      // Logout after 3 seconds
      setTimeout(() => {
        logout()
        window.location.href = '/auth/login?deleted=true'
      }, 3000)
    } catch (error) {
      console.error('Delete failed:', error)
      showToast('Erreur lors de la suppression de vos données', 'error')
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Mes données personnelles</h1>
        </div>
        <p className="text-gray-600 dark:text-slate-400">
          Gérez vos données personnelles conformément au RGPD (Règlement Général sur la Protection
          des Données)
        </p>
      </div>

      {/* User Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Vos droits RGPD</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Droit d'accès à vos données (Article 15)</li>
              <li>✓ Droit à la portabilité des données (Article 20)</li>
              <li>✓ Droit à l'oubli / suppression (Article 17)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              Exporter mes données (Article 15 & 20)
            </h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Téléchargez une copie complète de toutes vos données personnelles stockées dans le CRM
              au format JSON.
            </p>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Données incluses :</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                <li>• Votre profil utilisateur</li>
                <li>• Contacts et personnes créés/assignés</li>
                <li>• Organisations créées/gérées</li>
                <li>• Interactions et communications</li>
                <li>• Tâches assignées</li>
                <li>• Messages emails</li>
              </ul>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <FileJson className="w-5 h-5" />
                  Télécharger mes données (JSON)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              Supprimer mes données (Article 17)
            </h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Exercez votre droit à l'oubli en supprimant définitivement toutes vos données
              personnelles.
            </p>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-2">⚠️ Action irréversible</p>
                  <ul className="space-y-1">
                    <li>• Toutes vos données seront anonymisées</li>
                    <li>• Votre compte sera désactivé définitivement</li>
                    <li>• Cette action ne peut pas être annulée</li>
                    <li>
                      • Certaines données statistiques agrégées peuvent être conservées pour
                      conformité légale
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Lock className="w-5 h-5" />
              Supprimer mon compte et mes données
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Confirmer la suppression de mes données
                </h2>
              </div>

              <div className="space-y-4">
                {/* Warning */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">
                    Cette action est DÉFINITIVE et IRRÉVERSIBLE
                  </p>
                  <p className="text-sm text-red-700">
                    Une fois validée, toutes vos données personnelles seront anonymisées et votre
                    compte sera désactivé. Vous ne pourrez plus vous reconnecter.
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Raison de la suppression (minimum 10 caractères) *
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Ex: Je n'utilise plus le service, problème de confidentialité, etc."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {deleteReason.length}/10 caractères minimum
                  </p>
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Tapez <span className="font-bold text-red-600">SUPPRIMER</span> pour confirmer
                    *
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setDeleteReason('')
                      setDeleteConfirm('')
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={
                      isDeleting ||
                      deleteConfirm !== 'SUPPRIMER' ||
                      deleteReason.trim().length < 10
                    }
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Suppression en cours...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Confirmer la suppression
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
