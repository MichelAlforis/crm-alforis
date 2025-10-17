// components/forms/InteractionForm.tsx - UPDATED
// ============= INTERACTION FORM - WITH SEARCHABLE MULTI-SELECT =============

'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Input,
  Select,
  Button,
  Alert,
  SearchableMultiSelect,
  type SelectOption
} from '@/components/shared'
import { Interaction, InteractionCreate, InteractionType } from '@/lib/types'
import { useFournisseurs } from '@/hooks/useFournisseurs'
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
  const { fournisseurs, fetchFournisseurs } = useFournisseurs()
  const { showToast } = useToast()
  const [selectedFournisseurs, setSelectedFournisseurs] = useState<number[]>(
    initialData?.fournisseurs || []
  )

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

  useEffect(() => {
    fetchFournisseurs(0, 1000)
  }, [fetchFournisseurs])

  // Convertir les fournisseurs en options pour le SearchableMultiSelect
  const fournisseurOptions: SelectOption[] = fournisseurs.data?.items?.map((fss) => ({
    id: fss.id,
    label: fss.name,
    sublabel: fss.activity || fss.company || undefined,
  })) || []

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
        isLoading={fournisseurs.isLoading}
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
