import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'

export type ExportFormat = 'csv' | 'excel' | 'pdf'

interface UseExportOptions {
  resource: string // 'organisations', 'people', 'mandats', etc.
  baseFilename?: string
  params?: Record<string, any>
}

interface UseExportReturn {
  exportData: (format: ExportFormat) => Promise<void>
  isExporting: boolean
  error: string | null
}

/**
 * Hook réutilisable pour gérer les exports CSV/Excel/PDF
 *
 * @example
 * ```tsx
 * const { exportData, isExporting } = useExport({
 *   resource: 'organisations',
 *   baseFilename: 'organisations',
 *   params: { category: 'startup', is_active: true }
 * })
 *
 * <button onClick={() => exportData('csv')} disabled={isExporting}>
 *   {isExporting ? 'Export en cours...' : 'CSV'}
 * </button>
 * ```
 */
export function useExport({
  resource,
  baseFilename,
  params = {},
}: UseExportOptions): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  const exportData = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true)
      setError(null)

      try {
        // Construction de l'URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        const queryParams = new URLSearchParams()

        // Ajouter les paramètres de filtre
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value))
          }
        })

        const queryString = queryParams.toString()
        const url = `${apiUrl}/exports/${resource}/${format}${queryString ? `?${queryString}` : ''}`

        // Récupérer le token d'authentification
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('Non authentifié')
        }

        // Requête avec timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Gérer les erreurs spécifiques
          if (response.status === 404) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.detail || 'Aucune donnée à exporter')
          }
          if (response.status === 401) {
            throw new Error('Session expirée, veuillez vous reconnecter')
          }
          if (response.status === 403) {
            throw new Error("Vous n'avez pas les permissions pour exporter ces données")
          }
          throw new Error(`Erreur ${response.status}: ${response.statusText}`)
        }

        // Télécharger le fichier
        const blob = await response.blob()

        // Vérifier que le blob n'est pas vide
        if (blob.size === 0) {
          throw new Error('Le fichier exporté est vide')
        }

        // Extraire le nom de fichier depuis Content-Disposition ou utiliser le nom par défaut
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `${baseFilename || resource}_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        // Créer un lien de téléchargement temporaire
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()

        // Nettoyer
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        // Toast de succès
        showToast({
          type: 'success',
          title: 'Export réussi',
          message: `Le fichier ${format.toUpperCase()} a été téléchargé.`,
        })
      } catch (err: any) {
        logger.error('Export error:', err)

        let errorMessage = 'Une erreur est survenue lors de l\'export'

        if (err.name === 'AbortError') {
          errorMessage = 'L\'export a pris trop de temps (timeout)'
        } else if (err.message) {
          errorMessage = err.message
        }

        setError(errorMessage)

        showToast({
          type: 'error',
          title: 'Erreur d\'export',
          message: errorMessage,
        })
      } finally {
        setIsExporting(false)
      }
    },
    [resource, baseFilename, params, showToast],
  )

  return {
    exportData,
    isExporting,
    error,
  }
}
