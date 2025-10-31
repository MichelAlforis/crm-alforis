/**
 * ModalForm - Modal with form submission, loading state, and action buttons
 * Use for: Create/Edit forms, confirmation dialogs with actions
 */
'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { ModalBase } from './ModalBase'
import type { BaseModalProps } from './types'

interface ModalFormProps extends BaseModalProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  submitDisabled?: boolean
  error?: string | null
  showCancel?: boolean
}

export function ModalForm({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  isLoading = false,
  submitDisabled = false,
  error,
  showCancel = true,
  size = 'md',
  className = '',
}: ModalFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(e)
  }

  const footer = (
    <>
      {showCancel && (
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        form="modal-form"
        disabled={isLoading || submitDisabled}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </>
  )

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      className={className}
      footer={footer}
    >
      <form id="modal-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {children}
      </form>
    </ModalBase>
  )
}
