/**
 * Shared types for Modal system
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: ModalSize
  className?: string
}

export interface ModalFooterButton {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
}
