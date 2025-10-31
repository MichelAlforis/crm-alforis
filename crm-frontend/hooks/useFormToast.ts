/**
 * useFormToast - Hook pour messages toast standardisés dans les formulaires
 *
 * Consolide les patterns de toast utilisés dans tous les formulaires:
 * - Messages de succès cohérents (create/update)
 * - Messages d'erreur formatés
 * - Gestion automatique des messages API
 *
 * Utilisé dans: OrganisationForm, PersonForm, MandatForm, TaskForm, etc.
 */

import { useToast } from '@/components/ui/Toast'
import { useCallback } from 'react'

interface FormToastOptions {
  /**
   * Nom de l'entité pour les messages (ex: "Organisation", "Contact", "Tâche")
   */
  entityName: string

  /**
   * Genre de l'entité pour l'accord grammatical
   * @default 'f' (féminin)
   */
  gender?: 'm' | 'f'
}

/**
 * Hook pour gérer les messages toast standardisés dans les formulaires
 *
 * @example
 * ```tsx
 * const toast = useFormToast({ entityName: 'Organisation' })
 *
 * // Succès création
 * toast.successCreate()
 *
 * // Succès mise à jour
 * toast.successUpdate()
 *
 * // Erreur
 * toast.error(err)
 * ```
 */
export function useFormToast(options: FormToastOptions) {
  const { entityName, gender = 'f' } = options
  const { showToast } = useToast()

  // Accord grammatical
  const accord = gender === 'm' ? 'é' : 'e'
  const article = gender === 'm' ? 'le' : 'la'
  const articleUn = gender === 'm' ? 'un' : 'une'

  /**
   * Toast de succès pour création d'entité
   */
  const successCreate = useCallback(() => {
    showToast({
      type: 'success',
      title: `${entityName} créé${accord}`,
      message: `${articleUn} ${entityName.toLowerCase()} a été créé${accord} avec succès.`,
    })
  }, [entityName, accord, articleUn, showToast])

  /**
   * Toast de succès pour mise à jour d'entité
   */
  const successUpdate = useCallback(() => {
    showToast({
      type: 'success',
      title: `${entityName} mis${accord} à jour`,
      message: `Les informations de ${article} ${entityName.toLowerCase()} ont été enregistrées.`,
    })
  }, [entityName, accord, article, showToast])

  /**
   * Toast de succès pour suppression d'entité
   */
  const successDelete = useCallback(() => {
    showToast({
      type: 'success',
      title: `${entityName} supprimé${accord}`,
      message: `${articleUn} ${entityName.toLowerCase()} a été supprimé${accord}.`,
    })
  }, [entityName, accord, articleUn, showToast])

  /**
   * Toast d'erreur avec message personnalisé ou extrait de l'exception
   */
  const error = useCallback(
    (err: any, customMessage?: string) => {
      // Extraction intelligente du message d'erreur
      let errorMessage = customMessage

      if (!errorMessage) {
        if (err?.response?.data?.detail) {
          errorMessage = err.response.data.detail
        } else if (err?.response?.data?.message) {
          errorMessage = err.response.data.message
        } else if (err?.message) {
          errorMessage = err.message
        } else if (typeof err === 'string') {
          errorMessage = err
        } else {
          errorMessage = 'Une erreur inattendue est survenue'
        }
      }

      showToast({
        type: 'error',
        title: 'Erreur',
        message: errorMessage,
      })
    },
    [showToast]
  )

  /**
   * Toast d'information générique
   */
  const info = useCallback(
    (title: string, message: string) => {
      showToast({
        type: 'info',
        title,
        message,
      })
    },
    [showToast]
  )

  /**
   * Toast d'avertissement
   */
  const warning = useCallback(
    (title: string, message: string) => {
      showToast({
        type: 'warning',
        title,
        message,
      })
    },
    [showToast]
  )

  /**
   * Toast de succès personnalisé
   */
  const success = useCallback(
    (title: string, message: string) => {
      showToast({
        type: 'success',
        title,
        message,
      })
    },
    [showToast]
  )

  return {
    /**
     * Affiche un toast de succès après création
     */
    successCreate,

    /**
     * Affiche un toast de succès après mise à jour
     */
    successUpdate,

    /**
     * Affiche un toast de succès après suppression
     */
    successDelete,

    /**
     * Affiche un toast d'erreur avec extraction intelligente du message
     */
    error,

    /**
     * Affiche un toast d'information
     */
    info,

    /**
     * Affiche un toast d'avertissement
     */
    warning,

    /**
     * Affiche un toast de succès personnalisé
     */
    success,
  }
}
