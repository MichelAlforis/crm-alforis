// components/forms/MandatForm.tsx
// ============= MANDAT DISTRIBUTION FORM - RÉUTILISABLE =============

'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { MandatDistribution, MandatDistributionCreate, MandatStatus } from '@/lib/types'
import { useOrganisations } from '@/hooks/useOrganisations'
import { useToast } from '@/components/ui/Toast'

interface MandatFormProps {
  initialData?: MandatDistribution
  organisationId?: number // Si fourni, pré-sélectionne l'organisation
  onSubmit: (data: MandatDistributionCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

const STATUS_OPTIONS: { value: MandatStatus; label: string }[] = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_NEGOCIATION', label: 'En négociation' },
  { value: 'SIGNE', label: 'Signé' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'EXPIRE', label: 'Expiré' },
  { value: 'RESILIE', label: 'Résilié' },
]

export function MandatForm({
  initialData,
  organisationId,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: MandatFormProps) {
  const { showToast } = useToast()
  const { data: organisationsData } = useOrganisations({ limit: 1000 })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MandatDistributionCreate>({
    defaultValues: {
      ...initialData,
      organisation_id: initialData?.organisation_id ?? organisationId,
      status: initialData?.status ?? 'BROUILLON',
      date_debut: initialData?.date_debut ?? new Date().toISOString().split('T')[0],
    },
    mode: 'onBlur',
  })

  // Pré-sélectionner l'organisation si fournie
  useEffect(() => {
    if (organisationId) {
      setValue('organisation_id', organisationId)
    }
  }, [organisationId, setValue])

  const handleFormSubmit = async (data: MandatDistributionCreate) => {
    try {
      // Convertir les dates en string ISO si nécessaire
      const payload = {
        ...data,
        date_debut: data.date_debut,
        date_fin: data.date_fin || undefined,
      }

      await onSubmit(payload)
      showToast({
        type: 'success',
        title: initialData ? 'Mandat mis à jour' : 'Mandat créé',
        message: initialData
          ? 'Les informations du mandat ont été enregistrées.'
          : 'Le nouveau mandat a été ajouté avec succès.',
      })
    } catch (err: any) {
      const message =
        err?.detail || err?.message || "Impossible d'enregistrer le mandat."
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
      {error && <Alert type="error" message={error} />}

      <Select
        label="Organisation *"
        {...register('organisation_id', {
          required: 'Organisation requise',
          valueAsNumber: true,
        })}
        error={errors.organisation_id?.message}
        disabled={!!organisationId || !!initialData}
      >
        <option value="">-- Sélectionner une organisation --</option>
        {organisationsData?.items.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name} ({org.category})
          </option>
        ))}
      </Select>

      <Input
        label="Numéro de mandat"
        {...register('numero_mandat')}
        error={errors.numero_mandat?.message}
        placeholder="ex: MAN-2025-001"
      />

      <Select
        label="Statut *"
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading} variant="primary">
          {isLoading ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
