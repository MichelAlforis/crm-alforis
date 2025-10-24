// components/forms/PersonForm.tsx
// ============= PERSON FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Person, PersonInput } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'
import { HelpTooltip } from '@/components/help/HelpTooltip'

interface PersonFormProps {
  initialData?: Person
  onSubmit: (data: PersonInput) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

export function PersonForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: PersonFormProps) {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonInput>({
    defaultValues: {
      ...initialData,
      country_code: initialData?.country_code ?? undefined,
      language: initialData?.language ?? undefined,
    },
    mode: 'onBlur',
  })

  const handleFormSubmit = async (data: PersonInput) => {
    try {
      await onSubmit(data)
      showToast({
        type: 'success',
        title: initialData ? 'Contact mis à jour' : 'Contact créé',
        message: initialData
          ? 'Le contact a été mis à jour avec succès.'
          : 'Le contact a été ajouté à votre CRM.',
      })
    } catch (err: any) {
      const message =
        err?.detail || err?.message || "Impossible d'enregistrer le contact."
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Prénom"
          {...register('first_name', { required: 'Prénom requis' })}
          error={errors.first_name?.message}
          placeholder="Prénom"
        />

        <Input
          label="Nom"
          {...register('last_name', { required: 'Nom requis' })}
          error={errors.last_name?.message}
          placeholder="Nom"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Rôle / Fonction
          </label>
          <HelpTooltip
            content="Poste occupé dans l'organisation : Directeur, Gérant, Responsable commercial, etc. Cette info aide à cibler vos communications selon les décideurs."
            learnMoreLink="/dashboard/help/guides/personnes#roles"
            size="sm"
          />
        </div>
        <Input
          {...register('role')}
          error={errors.role?.message}
          placeholder="ex: Directeur des partenariats"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email personnel"
          type="email"
          {...register('personal_email')}
          error={errors.personal_email?.message}
          placeholder="prenom.nom@email.com"
        />

        <Input
          label="Mobile"
          {...register('personal_phone')}
          error={errors.personal_phone?.message}
          placeholder="+33 6 12 34 56 78"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Profil LinkedIn
          </label>
          <HelpTooltip
            content="URL du profil LinkedIn de la personne. Permet de suivre son évolution professionnelle et d'accéder rapidement à son réseau."
            learnMoreLink="/dashboard/help/guides/personnes#linkedin"
            size="sm"
          />
        </div>
        <Input
          {...register('linkedin_url')}
          error={errors.linkedin_url?.message}
          placeholder="https://www.linkedin.com/in/..."
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          rows={4}
          placeholder="Informations complémentaires, centres d'intérêt, disponibilités..."
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
