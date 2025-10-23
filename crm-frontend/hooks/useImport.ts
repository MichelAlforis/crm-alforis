/**
 * Hook réutilisable pour importer des données depuis CSV/Excel
 */
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

export interface ImportResult {
  success: boolean
  message: string
  results: {
    created: Array<{ id: number; name: string }>
    updated: Array<{ id: number; name: string }>
    errors: Array<{ row: number; name: string; error: string }>
    total_processed: number
  }
}

export interface UseImportOptions {
  resource: string // Ex: 'mailing-lists', 'email/campaigns'
  updateExisting?: boolean
  onSuccess?: (result: ImportResult) => void
  onError?: (error: any) => void
}

export function useImport({ resource, updateExisting = false, onSuccess, onError }: UseImportOptions) {
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const { showToast } = useToast()

  const importData = async (file: File) => {
    if (!file) {
      showToast({
        type: 'error',
        title: 'Erreur',
        description: 'Aucun fichier sélectionné',
      })
      return
    }

    // Vérifier le type de fichier
    const validExtensions = ['.csv', '.xlsx', '.xls']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    if (!validExtensions.includes(fileExtension)) {
      showToast({
        type: 'error',
        title: 'Format invalide',
        description: 'Le fichier doit être au format CSV ou Excel (.xlsx, .xls)',
      })
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<ImportResult>(
        `/api/v1/${resource}/import?update_existing=${updateExisting}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      const result = response.data
      setImportResult(result)

      // Toast de succès avec détails
      const { created, updated, errors } = result.results
      const hasErrors = errors.length > 0

      showToast({
        type: hasErrors ? 'warning' : 'success',
        title: hasErrors ? 'Import terminé avec des erreurs' : 'Import réussi',
        description: result.message,
      })

      onSuccess?.(result)

      return result
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || error?.message || 'Erreur lors de l\'import'

      showToast({
        type: 'error',
        title: 'Erreur d\'import',
        description: errorMessage,
      })

      onError?.(error)
      throw error
    } finally {
      setIsImporting(false)
    }
  }

  const resetImportResult = () => {
    setImportResult(null)
  }

  return {
    importData,
    isImporting,
    importResult,
    resetImportResult,
  }
}
