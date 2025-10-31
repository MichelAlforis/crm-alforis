// components/forms/MandatForm.tsx
// ============= MANDAT DISTRIBUTION FORM - RÉUTILISABLE =============

'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select, EntityAutocompleteInput } from '@/components/shared'
import { MandatDistribution, MandatDistributionCreate, MandatStatus, Organisation } from '@/lib/types'
import { useEntityPreload } from '@/hooks/useEntityPreload'
import { useOrganisationSelect } from '@/hooks/useOrganisationSelect'
import { useFormToast } from '@/hooks/useFormToast'
import { useFormAutoFocus } from '@/hooks/useFormAutoFocus'
import { HelpTooltip } from '@/components/help/HelpTooltip'

interface MandatFormProps {
  initialData?: MandatDistribution
  organisationId?: number // Si fourni, pré-sélectionne l'organisation
  onSubmit: (data: MandatDistributionCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

const STATUS_OPTIONS: { value: MandatStatus; label: string }[] = [
  { value: 'proposé', label: 'Proposé' },
  { value: 'signé', label: 'Signé' },
  { value: 'actif', label: 'Actif' },
  { value: 'terminé', label: 'Terminé' },
]

export function MandatForm({
  initialData,
  organisationId,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: MandatFormProps) {
  const toast = useFormToast({ entityName: 'Mandat', gender: 'm' })
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<number | null>(
    initialData?.organisation_id ?? organisationId ?? null
  )
  const [selectedOrganisationLabel, setSelectedOrganisationLabel] = useState<string>('')

  // Hook réutilisable pour autocomplete d'organisations
  const {
    options: organisationOptions,
    isLoading: isLoadingOrganisations,
    isLoadingMore: isLoadingMoreOrganisations,
    hasMore: hasMoreOrganisations,
    search: searchOrganisations,
    loadMore: loadMoreOrganisations,
    upsertOption: upsertOrganisationOption,
  } = useOrganisationSelect({
    preloadId: initialData?.organisation_id ?? organisationId,
    activeOnly: true,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<MandatDistributionCreate>({
    defaultValues: {
      ...initialData,
      status: initialData?.status ?? 'proposé',
      date_debut: initialData?.date_debut ?? new Date().toISOString().split('T')[0],
    },
    mode: 'onBlur',
  })

  // Auto-focus sur premier champ en erreur
  useFormAutoFocus(errors, setFocus)

  // Pré-charger l'organisation sélectionnée si fournie
  useEntityPreload<Organisation>({
    entityId: initialData?.organisation_id ?? organisationId,
    fetchEntity: async (id) => {
      const { getOrganisation } = await import('@/lib/api').then(m => m.apiClient)
      return getOrganisation(id)
    },
    mapToOption: (org) => ({
      id: org.id,
      label: org.name,
      sublabel: org.category || undefined,
    }),
    upsertOption: upsertOrganisationOption,
    onLoaded: (organisation) => {
      setSelectedOrganisationId(organisation.id)
      setSelectedOrganisationLabel(organisation.name)
    },
  })

  const handleFormSubmit = async (data: MandatDistributionCreate) => {
    if (!selectedOrganisationId) {
      toast.warning('Organisation manquante', 'Veuillez sélectionner une organisation.')
      return
    }

    try {
      // Convertir les dates en string ISO si nécessaire
      const payload = {
        ...data,
        organisation_id: selectedOrganisationId,
        date_debut: data.date_debut,
        date_fin: data.date_fin || undefined,
      }

      await onSubmit(payload)

      // Toast de succès standardisé
      initialData ? toast.successUpdate() : toast.successCreate()
    } catch (err: any) {
      // Toast d'erreur avec extraction intelligente du message
      toast.error(err)
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <EntityAutocompleteInput
        label="Organisation *"
        placeholder="Tapez le nom de l'organisation (minimum 2 caractères)..."
        icon="organisation"
        required
        disabled={!!organisationId || !!initialData}
        value={selectedOrganisationId}
        selectedLabel={selectedOrganisationLabel}
        onChange={(id, label) => {
          setSelectedOrganisationId(id)
          if (label) setSelectedOrganisationLabel(label)
        }}
        onSearch={searchOrganisations}
        options={organisationOptions}
        isLoading={isLoadingOrganisations}
        onLoadMore={loadMoreOrganisations}
        hasMore={hasMoreOrganisations}
        isLoadingMore={isLoadingMoreOrganisations}
        error={!selectedOrganisationId ? 'Organisation requise' : undefined}
        emptyMessage="Tapez au moins 2 caractères pour rechercher une organisation"
        noResultsMessage="Aucune organisation trouvée avec ce nom"
        minSearchLength={2}
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Numéro de mandat
          </label>
          <HelpTooltip
            content="Identifiant unique du mandat de distribution (référence interne ou contractuelle). Exemple : MAN-2025-001, DIST-FSS1-2025."
            learnMoreLink="/dashboard/help/guides/mandats#numero"
            size="sm"
          />
        </div>
        <Input
          {...register('numero_mandat')}
          error={errors.numero_mandat?.message}
          placeholder="ex: MAN-2025-001"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Statut *
          </label>
          <HelpTooltip
            content="État du mandat : Proposé (en négociation), Signé (contrat finalisé), Actif (en cours), Terminé (échu ou annulé)."
            learnMoreLink="/dashboard/help/guides/mandats#statuts"
            size="sm"
          />
        </div>
        <Select
          {...register('status', { required: 'Statut requis' })}
          error={errors.status?.message}
        >
          <option value="">-- Sélectionner --</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date de début *"
          type="date"
          {...register('date_debut', { required: 'Date de début requise' })}
          error={errors.date_debut?.message}
        />

        <Input
          label="Date de fin"
          type="date"
          {...register('date_fin')}
          error={errors.date_fin?.message}
        />
      </div>

      <div className="pt-2 px-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-semibold">ℹ️ Information</p>
        <p className="mt-1">
          Un mandat est considéré <strong>actif</strong> si son statut est "Signé" ou "Actif" et
          que la date du jour est comprise entre la date de début et la date de fin (si renseignée).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading} variant="primary" className="w-full sm:w-auto">
          {isLoading ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
