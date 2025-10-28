import { useState, useCallback } from 'react'
import { ConfirmDialog, ConfirmDialogType } from '@/components/shared/ConfirmDialog'
import { logger } from '@/lib/logger'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmDialogType
  onConfirm: () => void | Promise<void>
}

interface UseConfirmReturn {
  confirm: (options: ConfirmOptions) => void
  ConfirmDialogComponent: () => JSX.Element | null
}

/**
 * Hook pour simplifier l'utilisation des modales de confirmation
 *
 * @example
 * ```tsx
 * const { confirm, ConfirmDialogComponent } = useConfirm()
 *
 * const handleDelete = () => {
 *   confirm({
 *     title: 'Supprimer définitivement ?',
 *     message: 'Cette action est irréversible.',
 *     type: 'danger',
 *     onConfirm: async () => {
 *       await deleteItem(id)
 *     }
 *   })
 * }
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Supprimer</button>
 *     <ConfirmDialogComponent />
 *   </>
 * )
 * ```
 */
export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (isLoading) return // Empêche la fermeture pendant le chargement
    setIsOpen(false)
    setOptions(null)
  }, [isLoading])

  const handleConfirm = useCallback(async () => {
    if (!options?.onConfirm) return

    try {
      setIsLoading(true)
      const result = options.onConfirm()

      // Support async et sync
      if (result instanceof Promise) {
        await result
      }

      setIsOpen(false)
      setOptions(null)
    } catch (error) {
      logger.error('Confirmation action failed:', error)
      // Ne pas fermer la modale en cas d'erreur
      // L'appelant doit gérer l'erreur et afficher un toast
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const ConfirmDialogComponent = useCallback(() => {
    if (!options) return null

    return (
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        type={options.type}
        isLoading={isLoading}
      />
    )
  }, [isOpen, handleClose, handleConfirm, options, isLoading])

  return {
    confirm,
    ConfirmDialogComponent,
  }
}
