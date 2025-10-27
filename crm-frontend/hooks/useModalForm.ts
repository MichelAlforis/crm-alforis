/**
 * useModalForm Hook
 *
 * Centralized hook for managing modal forms with validation, loading states,
 * and error handling. Reduces boilerplate code across the application.
 *
 * @example
 * ```tsx
 * const modal = useModalForm<OrganisationFormData>({
 *   initialValues: { name: '', email: '' },
 *   onSubmit: async (values) => {
 *     await createOrganisation(values)
 *   },
 *   onSuccess: () => {
 *     toast.success('Organisation créée!')
 *   },
 *   validate: (values) => {
 *     if (!values.name) return { name: 'Le nom est requis' }
 *     return {}
 *   }
 * })
 *
 * // Usage in component
 * <Modal isOpen={modal.isOpen} onClose={modal.close}>
 *   <form onSubmit={modal.handleSubmit}>
 *     {modal.error && <Alert type="error" message={modal.error} />}
 *     <input value={modal.values.name} onChange={modal.handleChange('name')} />
 *     <Button type="submit" isLoading={modal.isSubmitting}>Save</Button>
 *   </form>
 * </Modal>
 * ```
 */

import { useState, useCallback } from 'react'

export interface UseModalFormOptions<T> {
  /** Initial form values */
  initialValues: T
  /** Submit handler that returns a promise */
  onSubmit: (values: T) => Promise<void> | void
  /** Success callback after successful submission */
  onSuccess?: () => void
  /** Error callback when submission fails */
  onError?: (error: Error) => void
  /** Validation function that returns errors object */
  validate?: (values: T) => Partial<Record<keyof T, string>>
  /** Reset form on successful submission (default: true) */
  resetOnSuccess?: boolean
  /** Close modal on successful submission (default: true) */
  closeOnSuccess?: boolean
}

export interface UseModalFormReturn<T> {
  /** Current form values */
  values: T
  /** Whether modal is open */
  isOpen: boolean
  /** Whether form is currently submitting */
  isSubmitting: boolean
  /** Current form error message (if any) */
  error: string | null
  /** Validation errors per field */
  validationErrors: Partial<Record<keyof T, string>>
  /** Open the modal */
  open: () => void
  /** Close the modal */
  close: () => void
  /** Set form values (useful for edit mode) */
  setValues: (values: T | ((prev: T) => T)) => void
  /** Handle input change for a specific field */
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  /** Set a specific field value */
  setFieldValue: (field: keyof T, value: any) => void
  /** Handle form submission */
  handleSubmit: (e: React.FormEvent) => Promise<void>
  /** Reset form to initial values */
  reset: () => void
  /** Clear error message */
  clearError: () => void
}

export function useModalForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  onSuccess,
  onError,
  validate,
  resetOnSuccess = true,
  closeOnSuccess = true,
}: UseModalFormOptions<T>): UseModalFormReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState<T>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof T, string>>>({})

  const open = useCallback(() => {
    setIsOpen(true)
    setError(null)
    setValidationErrors({})
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setError(null)
    setValidationErrors({})
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues)
    setError(null)
    setValidationErrors({})
  }, [initialValues])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleChange = useCallback((field: keyof T) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value

      setValues((prev) => ({
        ...prev,
        [field]: value,
      }))

      // Clear validation error for this field
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    }
  }, [validationErrors])

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [validationErrors])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    // Run validation if provided
    if (validate) {
      const errors = validate(values)
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }
    }

    setIsSubmitting(true)

    try {
      await onSubmit(values)

      if (onSuccess) {
        onSuccess()
      }

      if (resetOnSuccess) {
        reset()
      }

      if (closeOnSuccess) {
        close()
      }
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Une erreur est survenue'
      setError(errorMessage)

      if (onError) {
        onError(err)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, onSubmit, onSuccess, onError, resetOnSuccess, closeOnSuccess, reset, close])

  return {
    values,
    isOpen,
    isSubmitting,
    error,
    validationErrors,
    open,
    close,
    setValues,
    handleChange,
    setFieldValue,
    handleSubmit,
    reset,
    clearError,
  }
}
