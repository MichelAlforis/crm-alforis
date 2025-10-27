/**
 * useEntityPreload - Hook pour pré-charger une entité dans un autocomplete
 *
 * Gère le pré-chargement d'une entité (organisation, contact, produit, etc.)
 * pour l'afficher dans un EntityAutocompleteInput en mode édition.
 *
 * @example
 * ```tsx
 * const { isLoading, error } = useEntityPreload({
 *   entityId: initialData?.organisation_id,
 *   fetchEntity: (id) => apiClient.getOrganisation(id),
 *   mapToOption: (org) => ({
 *     id: org.id,
 *     label: org.name,
 *     sublabel: org.category
 *   }),
 *   upsertOption: upsertOrganisationOption,
 *   onLoaded: (org) => {
 *     setSelectedId(org.id)
 *     setSelectedLabel(org.name)
 *   }
 * })
 * ```
 */

import { useEffect, useState } from 'react'

export interface AutocompleteOption {
  id: number
  label: string
  sublabel?: string
}

export interface UseEntityPreloadOptions<T> {
  /**
   * ID de l'entité à pré-charger (undefined = skip)
   */
  entityId?: number | null

  /**
   * Fonction pour fetcher l'entité depuis l'API
   */
  fetchEntity: (id: number) => Promise<T>

  /**
   * Fonction pour mapper l'entité vers une option d'autocomplete
   */
  mapToOption: (entity: T) => AutocompleteOption

  /**
   * Fonction pour insérer l'option dans la liste d'autocomplete
   */
  upsertOption: (option: AutocompleteOption) => void

  /**
   * Callback optionnel appelé après chargement réussi
   */
  onLoaded?: (entity: T) => void

  /**
   * Callback optionnel appelé en cas d'erreur
   */
  onError?: (error: Error) => void

  /**
   * Activer/désactiver le hook (défaut: true)
   */
  enabled?: boolean
}

export interface UseEntityPreloadReturn {
  isLoading: boolean
  error: string | null
  entity: any | null
}

export function useEntityPreload<T = any>({
  entityId,
  fetchEntity,
  mapToOption,
  upsertOption,
  onLoaded,
  onError,
  enabled = true,
}: UseEntityPreloadOptions<T>): UseEntityPreloadReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entity, setEntity] = useState<T | null>(null)

  useEffect(() => {
    // Skip si pas d'ID, pas enabled, ou ID === 0
    if (!entityId || !enabled) return

    let isMounted = true
    setIsLoading(true)
    setError(null)

    void (async () => {
      try {
        const loadedEntity = await fetchEntity(entityId)

        if (!isMounted) return

        // Mapper et insérer dans l'autocomplete
        const option = mapToOption(loadedEntity)
        upsertOption(option)

        // Sauvegarder l'entité
        setEntity(loadedEntity)

        // Callback de succès
        if (onLoaded) {
          onLoaded(loadedEntity)
        }

        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return

        const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement'
        setError(errorMessage)
        setIsLoading(false)

        // Callback d'erreur
        if (onError && err instanceof Error) {
          onError(err)
        } else {
          console.error(`Erreur lors du pré-chargement de l'entité ${entityId}:`, err)
        }
      }
    })()

    // Cleanup
    return () => {
      isMounted = false
    }
  }, [entityId, enabled, fetchEntity, mapToOption, upsertOption, onLoaded, onError])

  return {
    isLoading,
    error,
    entity,
  }
}
