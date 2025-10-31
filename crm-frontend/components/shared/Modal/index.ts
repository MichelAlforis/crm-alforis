/**
 * Modular Modal System
 *
 * Exports:
 * - ModalBase: Base modal with backdrop, header, body, footer
 * - ModalForm: Modal with form submission + loading state
 * - useModal: Hook for modal state management
 * - Types: BaseModalProps, ModalSize, etc.
 */

export { ModalBase } from './ModalBase'
export { ModalForm } from './ModalForm'
export { useModal } from './useModal'
export * from './types'

// Legacy export for backward compatibility
export { ModalBase as Modal } from './ModalBase'
