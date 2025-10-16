// components/forms/FournisseurForm.tsx
// ============= FOURNISSEUR FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Fournisseur, FournisseurCreate } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'

interface FournisseurFormProps {
  initialData?: Fournisseur
  onSubmit: (data: FournisseurCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

export function FournisseurForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: FournisseurFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FournisseurCreate>({
    defaultValues: {
      ...initialData,
      country_code: initialData?.country_code ?? undefined,
      language: initialData?.language ?? undefined,
    },
    mode: 'onBlur',
  })

  const handleFormSubmit = async (data: FournisseurCreate) => {
    try {
      await onSubmit(data)
      showToast({
        type: 'success',
        title: initialData ? 'Fournisseur mis à jour' : 'Fournisseur créé',
        message: initialData
          ? 'Les informations du fournisseur ont été enregistrées.'
          : 'Le nouveau fournisseur a été ajouté avec succès.',
      })
    } catch (err: any) {
      const message =
        err?.detail || err?.message || "Impossible d'enregistrer le fournisseur."
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
        label="Nom du fournisseur"
        {...register('name', { required: 'Nom requis' })}
        error={errors.name?.message}
        placeholder="ex: FSS 1, Fournisseur XYZ"
      />

      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        placeholder="contact@fournisseur.com"
      />

      <Input
        label="Téléphone accueil"
        {...register('main_phone')}
        error={errors.main_phone?.message}
        placeholder="+33 1 23 45 67 89"
      />

      <Input
        label="Site web"
        type="url"
        {...register('website')}
        error={errors.website?.message}
        placeholder="https://..."
      />

      <Input
        label="Société"
        {...register('company')}
        error={errors.company?.message}
        placeholder="Nom de la société (si différent)"
      />

      <Input
        label="Activité principale"
        {...register('activity')}
        error={errors.activity?.message}
        placeholder="ex: Asset Management, IT, Marketing..."
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          rows={4}
          placeholder="Notes supplémentaires sur le fournisseur..."
        />
      </div>

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
