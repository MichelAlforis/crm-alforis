/**
 * useEntityDetail - Hook générique pour les pages de détail d'entités
 *
 * Ce hook centralise toute la logique commune des pages detail:
 * - Extraction de l'ID depuis les params de route
 * - Gestion des états de modal (edit, confirm dialogs)
 * - Gestion des tabs (informations, activité, etc.)
 * - Handlers pour les opérations CRUD
 */

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'

export type ConfirmDialogType = 'delete' | 'deactivate' | 'reactivate' | 'archive' | 'unarchive'

export interface ConfirmDialogState {
  isOpen: boolean
  type: ConfirmDialogType
}

export interface UseEntityDetailOptions {
  /** Route de redirection après suppression (ex: ROUTES.CRM.ORGANISATIONS) */
  listRoute: string
  /** Delay en ms avant redirection après suppression (default: 500) */
  deleteRedirectDelay?: number
}

export interface UseEntityDetailReturn<T extends string = string> {
  // ID extraction
  entityId: number | null
  isValidId: boolean

  // Modal states
  isEditModalOpen: boolean
  setIsEditModalOpen: (open: boolean) => void
  openEditModal: () => void
  closeEditModal: () => void

  // Confirm dialog
  confirmDialog: ConfirmDialogState
  setConfirmDialog: (state: ConfirmDialogState) => void
  openConfirmDialog: (type: ConfirmDialogType) => void
  closeConfirmDialog: () => void

  // Tab management
  activeTab: T
  setActiveTab: (tab: T) => void

  // Delete handler with redirect
  handleDeleteWithRedirect: (deleteAction: () => Promise<void>) => Promise<void>
}

/**
 * Hook pour gérer l'état et la logique des pages de détail d'entités
 *
 * @example
 * ```tsx
 * const {
 *   entityId,
 *   isEditModalOpen,
 *   openEditModal,
 *   closeEditModal,
 *   confirmDialog,
 *   openConfirmDialog,
 *   closeConfirmDialog,
 *   activeTab,
 *   setActiveTab,
 *   handleDeleteWithRedirect,
 * } = useEntityDetail<'informations' | 'activite'>({
 *   listRoute: ROUTES.CRM.ORGANISATIONS,
 * })
 *
 * // Usage dans le composant
 * <Button onClick={openEditModal}>Modifier</Button>
 * <Button onClick={() => openConfirmDialog('delete')}>Supprimer</Button>
 *
 * // Delete avec redirection automatique
 * const handleDelete = () => {
 *   await handleDeleteWithRedirect(async () => {
 *     await deleteMutation.mutateAsync(entityId!)
 *   })
 * }
 * ```
 */
export function useEntityDetail<T extends string = string>(
  options: UseEntityDetailOptions
): UseEntityDetailReturn<T> {
  const { listRoute, deleteRedirectDelay = 500 } = options
  const params = useParams<{ id?: string }>()
  const router = useRouter()

  // Extract and validate entity ID from route params
  const entityId = useMemo(() => {
    const rawId = params?.id
    if (!rawId) return null

    const parsed = Number.parseInt(rawId, 10)
    return Number.isNaN(parsed) ? null : parsed
  }, [params])

  const isValidId = entityId !== null && entityId > 0

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: 'delete',
  })

  // Tab management (generic type for flexibility)
  const [activeTab, setActiveTab] = useState<T>('informations' as T)

  // Helper functions
  const openEditModal = () => setIsEditModalOpen(true)
  const closeEditModal = () => setIsEditModalOpen(false)

  const openConfirmDialog = (type: ConfirmDialogType) => {
    setConfirmDialog({ isOpen: true, type })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, type: confirmDialog.type })
  }

  /**
   * Execute delete action and redirect to list page
   * @param deleteAction - Async function that performs the delete operation
   */
  const handleDeleteWithRedirect = async (deleteAction: () => Promise<void>) => {
    await deleteAction()
    closeConfirmDialog()
    setTimeout(() => {
      router.push(listRoute)
    }, deleteRedirectDelay)
  }

  return {
    // ID
    entityId,
    isValidId,

    // Edit modal
    isEditModalOpen,
    setIsEditModalOpen,
    openEditModal,
    closeEditModal,

    // Confirm dialog
    confirmDialog,
    setConfirmDialog,
    openConfirmDialog,
    closeConfirmDialog,

    // Tabs
    activeTab,
    setActiveTab,

    // Actions
    handleDeleteWithRedirect,
  }
}
