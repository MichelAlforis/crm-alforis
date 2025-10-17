// components/forms/InteractionForm.tsx - UPDATED
// ============= INTERACTION FORM - WITH SEARCHABLE MULTI-SELECT =============

'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Input,
  Select,
  Button,
  Alert,
  SearchableMultiSelect,
} from '@/components/shared'
import {
  Interaction,
  InteractionCreate,
  InteractionType,
  Fournisseur,
} from '@/lib/types'
import { usePaginatedOptions, type PaginatedFetcherParams } from '@/hooks/usePaginatedOptions'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

interface InteractionFormProps {
  initialData?: Interaction
  onSubmit: (data: InteractionCreate) => Promise<void>
  isLoading?: boolean
  error?: string
}

const INTERACTION_TYPE_OPTIONS: { value: InteractionType; label: string }[] = [
  { value: 'appel', label: 'Appel' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'webinaire', label: 'Webinaire' },
  { value: 'autre', label: 'Autre' },
]

export function InteractionForm({
  initialData,
  onSubmit,
  isLoading,
  error,
}: InteractionFormProps) {
  const { showToast } = useToast()
  const [selectedFournisseurs, setSelectedFournisseurs] = useState<number[]>(
    initialData?.fournisseurs || []
  )

  const fetchFournisseurOptions = useCallback(
    ({ query, skip, limit }: PaginatedFetcherParams) =>
      apiClient.getFournisseurs(skip, limit, query),
    []
  )

  const mapFournisseurToOption = useCallback(
    (fss: Fournisseur) => ({
      id: fss.id,
      label: fss.name,
      sublabel: fss.activity || fss.company || undefined,
    }),
    []
  )

  const {
    options: fournisseurOptions,
    isLoading: isLoadingFournisseurs,
    isLoadingMore: isLoadingMoreFournisseurs,
    hasMore: hasMoreFournisseurs,
    search: searchFournisseurs,
    loadMore: loadMoreFournisseurs,
    upsertOption: upsertFournisseurOption,
  } = usePaginatedOptions<Fournisseur>({
    fetcher: fetchFournisseurOptions,
    mapItem: mapFournisseurToOption,
    limit: 25,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InteractionCreate>({
    defaultValues: {
      ...initialData,
      fournisseurs: initialData?.fournisseurs || [],
    },
    mode: 'onBlur',
  })

  const preloadKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const ids = initialData?.fournisseurs ?? []
    if (ids.length === 0) return

    const key = ids.slice().sort((a, b) => a - b).join(',')
    if (preloadKeyRef.current === key) {
      return
    }
    preloadKeyRef.current = key

    const existingIds = new Set(fournisseurOptions.map((option) => option.id))
    const missingIds = ids.filter((id) => !existingIds.has(id))

    if (missingIds.length === 0) {
      return
    }

    void (async () => {
      try {
        const responses = await Promise.all(
          missingIds.map((id) => apiClient.getFournisseur(id))
        )
        responses.forEach(({ fournisseur }) =>
          upsertFournisseurOption({
            id: fournisseur.id,
            label: fournisseur.name,
            sublabel: fournisseur.activity || fournisseur.company || undefined,
          })
        )
      } catch (err) {
        console.error('Impossible de pré-charger les fournisseurs sélectionnés', err)
      }
    })()
  }, [fournisseurOptions, initialData?.fournisseurs, upsertFournisseurOption])

  const handleFormSubmit = async (data: InteractionCreate) => {
    if (selectedFournisseurs.length === 0) {
      showToast({
        type: 'warning',
        title: 'Fournisseur manquant',
        message: 'Sélectionnez au moins un fournisseur pour enregistrer cette interaction.',
      })
      return
    }
    try {
      await onSubmit({
        ...data,
        fournisseurs: selectedFournisseurs,
      })
      showToast({
        type: 'success',
        title: 'Interaction enregistrée',
        message: "L'interaction a été ajoutée au dossier.",
      })
    } catch (err: any) {
      const message = err?.detail || err?.message || "Impossible d'enregistrer l'interaction."
      showToast({
        type: 'error',
        title: 'Erreur',
        message,
      })
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Sélection des fournisseurs avec recherche */}
      <SearchableMultiSelect
        label="Fournisseurs concernés"
        options={fournisseurOptions}
        value={selectedFournisseurs}
        onChange={setSelectedFournisseurs}
        placeholder="Rechercher et sélectionner des fournisseurs..."
        required
        error={selectedFournisseurs.length === 0 ? 'Sélectionnez au moins un fournisseur' : undefined}
        isLoading={isLoadingFournisseurs}
        onSearch={searchFournisseurs}
        onLoadMore={loadMoreFournisseurs}
        hasMore={hasMoreFournisseurs}
        isLoadingMore={isLoadingMoreFournisseurs}
      />

      <Select
        label="Type d'interaction"
        {...register('type', { required: 'Type requis' })}
        options={INTERACTION_TYPE_OPTIONS}
        error={errors.type?.message}
      />

      <Input
        label="Date et heure"
        type="datetime-local"
        {...register('date', { required: 'Date requise' })}
        error={errors.date?.message}
      />

      <Input
        label="Durée (minutes)"
        type="number"
        {...register('duration_minutes', { valueAsNumber: true })}
        error={errors.duration_minutes?.message}
        placeholder="30"
      />

      <Input
        label="Sujet"
        {...register('subject')}
        error={errors.subject?.message}
        placeholder="Objet de l'interaction"
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          rows={4}
          placeholder="Détails de l'interaction..."
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Enregistrer interaction
      </Button>
    </form>
  )
}
