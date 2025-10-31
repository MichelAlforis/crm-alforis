/**
 * useFormAutoFocus - Hook pour focus automatique sur le premier champ en erreur
 *
 * Améliore l'UX en guidant automatiquement l'utilisateur vers les erreurs de validation.
 * Pattern utilisé dans: OrganisationForm, PersonForm, MandatForm, etc.
 *
 * Compatible avec react-hook-form
 */

import { useEffect } from 'react'
import type { FieldErrors, FieldValues, UseFormSetFocus } from 'react-hook-form'

/**
 * Hook pour focus automatique sur le premier champ d'un formulaire contenant une erreur
 *
 * @param errors - Objet errors de react-hook-form
 * @param setFocus - Fonction setFocus de react-hook-form
 *
 * @example
 * ```tsx
 * const {
 *   register,
 *   handleSubmit,
 *   formState: { errors },
 *   setFocus,
 * } = useForm<FormData>()
 *
 * // Focus automatique sur erreurs
 * useFormAutoFocus(errors, setFocus)
 * ```
 */
export function useFormAutoFocus<T extends FieldValues>(
  errors: FieldErrors<T>,
  setFocus: UseFormSetFocus<T>
) {
  useEffect(() => {
    // Récupérer le premier champ avec une erreur
    const firstErrorField = Object.keys(errors)[0] as keyof T

    if (firstErrorField) {
      // Focus sur le champ en erreur
      setFocus(firstErrorField as any)
    }
  }, [errors, setFocus])
}
