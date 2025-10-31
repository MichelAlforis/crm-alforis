/**
 * useEntityDetail - Hook générique pour les pages de détail d'entités
 *
 * Ce hook centralise toute la logique commune des pages detail:
 * - Extraction de l'ID depuis les params de route
 * - Gestion des états de modal (edit, confirm dialogs) via Zustand
 * - Gestion des tabs via URL state (shareable)
 * - Handlers pour les opérations CRUD
 */

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui'
import { useUrlState } from '@/hooks/useUrlState'

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

  // Modal states - Zustand (global, no prop drilling)
  const activeModal = useUIStore((state) => state.activeModal)
  const modalData = useUIStore((state) => state.modalData)
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)

  // Derive modal states from Zustand
  const isEditModalOpen = activeModal === `edit-entity-${entityId}`
  const confirmDialog: ConfirmDialogState =
    activeModal?.startsWith(`confirm-${entityId}`)
      ? { isOpen: true, type: (modalData?.type || 'delete') as ConfirmDialogType }
      : { isOpen: false, type: 'delete' }

  // Tab management - URL state (shareable, bookmarkable)
  const [activeTab, setActiveTab] = useUrlState<T>('tab', 'informations' as T)

  // Helper functions
  const openEditModal = () => openModal(`edit-entity-${entityId}`)
  const closeEditModal = () => closeModal()
  const setIsEditModalOpen = (open: boolean) => open ? openEditModal() : closeEditModal()

  const openConfirmDialog = (type: ConfirmDialogType) => {
    openModal(`confirm-${entityId}-${type}`, { type })
  }

  const closeConfirmDialog = () => closeModal()

  const setConfirmDialog = (state: ConfirmDialogState) => {
    if (state.isOpen) {
      openConfirmDialog(state.type)
    } else {
      closeConfirmDialog()
    }
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

    // Edit modal (now powered by Zustand)
    isEditModalOpen,
    setIsEditModalOpen,
    openEditModal,
    closeEditModal,

    // Confirm dialog (now powered by Zustand)
    confirmDialog,
    setConfirmDialog,
    openConfirmDialog,
    closeConfirmDialog,

    // Tabs (now powered by URL state)
    activeTab,
    setActiveTab,

    // Actions
    handleDeleteWithRedirect,
  }
}
