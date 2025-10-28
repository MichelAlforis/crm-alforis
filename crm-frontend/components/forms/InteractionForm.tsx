// components/forms/InteractionForm.tsx - UPDATED
// ============= INTERACTION FORM - WITH SEARCHABLE MULTI-SELECT =============

'use client'
import { logger } from '@/lib/logger'

import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Input,
  Select,
  Button,
  Alert,
  SearchableMultiSelect,
} from '@/components/shared'
import {
  InteractionNew,
  InteractionCreateNew,
  InteractionType,
  Organisation,
} from '@/lib/types'
import { usePaginatedOptions, type PaginatedFetcherParams } from '@/hooks/usePaginatedOptions'
import { apiClient } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

interface InteractionFormProps {
  initialData?: InteractionNew
  onSubmit: (data: InteractionCreateNew) => Promise<void>
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
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<number | undefined>(
    initialData?.organisation_id
  )

  const fetchOrganisationOptions = useCallback(
    ({ query, skip, limit }: PaginatedFetcherParams) =>
      apiClient.getOrganisations({ skip, limit, category: query }),
    []
  )

  const mapOrganisationToOption = useCallback(
    (org: Organisation) => ({
      id: org.id,
      label: org.name,
      sublabel: org.category || undefined,
    }),
    []
  )

  const {
    options: organisationOptions,
    isLoading: isLoadingOrganisations,
    isLoadingMore: isLoadingMoreOrganisations,
    hasMore: hasMoreOrganisations,
    search: searchOrganisations,
    loadMore: loadMoreOrganisations,
    upsertOption: upsertOrganisationOption,
  } = usePaginatedOptions<Organisation>({
    fetcher: fetchOrganisationOptions,
    mapItem: mapOrganisationToOption,
    limit: 25,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InteractionCreateNew>({
    defaultValues: {
      organisation_id: initialData?.organisation_id || undefined,
      personne_id: initialData?.personne_id,
      produit_id: initialData?.produit_id,
      date: initialData?.date || '',
      type: initialData?.type || 'appel',
      duration_minutes: initialData?.duration_minutes,
      subject: initialData?.subject || '',
      notes: initialData?.notes || '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    const orgId = initialData?.organisation_id
    if (!orgId) return

    const existingIds = new Set(organisationOptions.map((option) => option.id))
    if (existingIds.has(orgId)) {
      return
    }

    void (async () => {
      try {
        const org = await apiClient.getOrganisation(orgId)
        upsertOrganisationOption({
          id: org.id,
          label: org.name,
          sublabel: org.category || undefined,
        })
      } catch (err) {
        logger.error('Impossible de pré-charger l\'organisation sélectionnée', err)
      }
    })()
  }, [organisationOptions, initialData?.organisation_id, upsertOrganisationOption])

  const handleFormSubmit = async (data: InteractionCreateNew) => {
    if (!selectedOrganisationId) {
      showToast({
        type: 'warning',
        title: 'Organisation manquante',
        message: 'Sélectionnez une organisation pour enregistrer cette interaction.',
      })
      return
    }
    try {
      await onSubmit({
        ...data,
        organisation_id: selectedOrganisationId,
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

      {/* Sélection de l'organisation */}
      <SearchableMultiSelect
        label="Organisation"
        options={organisationOptions}
        value={selectedOrganisationId ? [selectedOrganisationId] : []}
        onChange={(ids) => setSelectedOrganisationId(ids[0])}
        placeholder="Rechercher et sélectionner une organisation..."
        required
        error={!selectedOrganisationId ? 'Sélectionnez une organisation' : undefined}
        isLoading={isLoadingOrganisations}
        onSearch={searchOrganisations}
        onLoadMore={loadMoreOrganisations}
        hasMore={hasMoreOrganisations}
        isLoadingMore={isLoadingMoreOrganisations}
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
