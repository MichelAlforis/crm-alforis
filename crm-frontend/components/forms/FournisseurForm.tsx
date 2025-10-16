// components/forms/FournisseurForm.tsx
// ============= FOURNISSEUR FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert } from '@/components/shared'
import { Fournisseur, FournisseurCreate } from '@/lib/types'

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FournisseurCreate>({
    defaultValues: initialData,
    mode: 'onBlur',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        label="Téléphone"
        {...register('phone')}
        error={errors.phone?.message}
        placeholder="+33 1 2X XX XX XX"
      />

      <Input
        label="Site web"
        type="url"
        {...register('website')}
        error={errors.website?.message}
        placeholder="https://..."
      />

      <Input
        label="Secteur d'activité"
        {...register('industry')}
        error={errors.industry?.message}
        placeholder="ex: SaaS, Services financiers, etc."
      />

      <Input
        label="Personne de contact"
        {...register('contact_person')}
        error={errors.contact_person?.message}
        placeholder="Nom du contact principal"
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