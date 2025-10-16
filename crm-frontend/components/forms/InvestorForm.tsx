
// components/forms/InvestorForm.tsx
// ============= INVESTOR FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Select, Button, Alert } from '@/components/shared'
import { Investor, InvestorCreate, PipelineStage, ClientType } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'

interface InvestorFormProps {
  initialData?: Investor
  onSubmit: (data: InvestorCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

const PIPELINE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: 'prospect_froid', label: 'Prospect froid' },
  { value: 'prospect_tiede', label: 'Prospect tiède' },
  { value: 'prospect_chaud', label: 'Prospect chaud' },
  { value: 'en_negociation', label: 'En négociation' },
  { value: 'client', label: 'Client' },
  { value: 'inactif', label: 'Inactif' },
]

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'cgpi', label: 'CGPI' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'institutionnel', label: 'Institutionnel' },
  { value: 'autre', label: 'Autre' },
]

export function InvestorForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: InvestorFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvestorCreate>({
    defaultValues: {
      ...initialData,
      country_code: initialData?.country_code ?? undefined,
      language: initialData?.language ?? undefined,
    },
    mode: 'onBlur',
  })

  const handleFormSubmit = async (data: InvestorCreate) => {
    try {
      await onSubmit(data)
      showToast({
        type: 'success',
        title: initialData ? 'Investisseur mis à jour' : 'Investisseur créé',
        message: initialData
          ? "Les informations de l'investisseur ont été enregistrées."
          : "Le nouvel investisseur a été ajouté avec succès.",
      })
    } catch (err: any) {
      const message = err?.detail || err?.message || "Impossible d'enregistrer l'investisseur."
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

      <Input
        label="Nom"
        {...register('name', { required: 'Nom requis' })}
        error={errors.name?.message}
        placeholder="Nom de l'investisseur"
      />

      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        placeholder="email@example.com"
      />

      <Input
        label="Téléphone accueil"
        {...register('main_phone')}
        error={errors.main_phone?.message}
        placeholder="+33 1 23 45 67 89"
      />

      <Input
        label="Société"
        {...register('company')}
        error={errors.company?.message}
        placeholder="Nom de la société"
      />

      <Input
        label="Industrie"
        {...register('industry')}
        error={errors.industry?.message}
        placeholder="Secteur d'activité"
      />

      <Input
        label="Site web"
        type="url"
        {...register('website')}
        error={errors.website?.message}
        placeholder="https://..."
      />

      <Select
        label="Étape du pipeline"
        {...register('pipeline_stage')}
        options={PIPELINE_OPTIONS}
        error={errors.pipeline_stage?.message}
      />

      <Select
        label="Type de client"
        {...register('client_type')}
        options={CLIENT_TYPE_OPTIONS}
        error={errors.client_type?.message}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Pays"
          {...register('country_code', {
            setValueAs: (value) => (value ? value : undefined),
          })}
          options={COUNTRY_OPTIONS}
        />
        <Select
          label="Langue préférée"
          {...register('language', {
            setValueAs: (value) => (value ? value : undefined),
          })}
          options={LANGUAGE_OPTIONS}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          rows={4}
          placeholder="Notes supplémentaires..."
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  )
}
