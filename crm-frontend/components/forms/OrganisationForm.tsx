// components/forms/OrganisationForm.tsx
// ============= ORGANISATION FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Organisation, OrganisationCreate, OrganisationCategory } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useToast } from '@/components/ui/Toast'

interface OrganisationFormProps {
  initialData?: Organisation
  onSubmit: (data: OrganisationCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

const CATEGORY_OPTIONS: { value: OrganisationCategory; label: string }[] = [
  { value: 'DISTRIBUTEUR', label: 'Distributeur' },
  { value: 'EMETTEUR', label: 'Émetteur' },
  { value: 'FOURNISSEUR_SERVICE', label: 'Fournisseur de service' },
  { value: 'PARTENAIRE', label: 'Partenaire' },
  { value: 'AUTRE', label: 'Autre' },
]

export function OrganisationForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: OrganisationFormProps) {
  const { showToast } = useToast()
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganisationCreate>({
    defaultValues: {
      ...initialData,
      category: initialData?.category ?? 'AUTRE',
      country_code: initialData?.country_code ?? 'FR',
      language: initialData?.language ?? 'FR',
      is_active: initialData?.is_active ?? true,
    },
    mode: 'onBlur',
  })

  const handleFormSubmit = async (data: OrganisationCreate) => {
    try {
      await onSubmit(data)
      showToast({
        type: 'success',
        title: initialData ? 'Organisation mise à jour' : 'Organisation créée',
        message: initialData
          ? "Les informations de l'organisation ont été enregistrées."
          : "La nouvelle organisation a été ajoutée avec succès.",
      })
    } catch (err: any) {
      const message =
        err?.detail || err?.message || "Impossible d'enregistrer l'organisation."
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

      <Input
        label="Nom de l'organisation *"
        {...register('name', { required: 'Nom requis' })}
        error={errors.name?.message}
        placeholder="ex: FSS 1, Émetteur XYZ, Distributeur ABC"
      />

      <Select
        label="Catégorie *"
        {...register('category', { required: 'Catégorie requise' })}
        error={errors.category?.message}
      >
        <option value="">-- Sélectionner --</option>
        {CATEGORY_OPTIONS.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </Select>

      <Input
        label="Email principal"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        placeholder="contact@organisation.com"
      />

      <Input
        label="Téléphone principal"
        {...register('main_phone')}
        error={errors.main_phone?.message}
        placeholder="+33 1 23 45 67 89"
      />

      <Input
        label="Site web"
        type="url"
        {...register('website')}
        error={errors.website?.message}
        placeholder="https://www.organisation.com"
      />

      <Input
        label="Adresse"
        {...register('address')}
        error={errors.address?.message}
        placeholder="123 Rue de la Paix, 75001 Paris"
      />

      <Select
        label="Pays *"
        {...register('country_code', { required: 'Pays requis' })}
        error={errors.country_code?.message}
      >
        <option value="">-- Sélectionner --</option>
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.name}
          </option>
        ))}
      </Select>

      <Select
        label="Langue *"
        {...register('language', { required: 'Langue requise' })}
        error={errors.language?.message}
      >
        <option value="">-- Sélectionner --</option>
        {LANGUAGE_OPTIONS.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </Select>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          {...register('is_active')}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Organisation active
        </label>
      </div>

      {/* Champs avancés */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-bleu hover:text-blue-700 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAdvanced ? 'Masquer' : 'Afficher'} les champs avancés
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <Input
              label="AUM (Assets Under Management)"
              type="number"
              {...register('aum', { valueAsNumber: true })}
              error={errors.aum?.message}
              placeholder="Montant en millions €"
            />

            <Input
              label="Date AUM"
              type="date"
              {...register('aum_date')}
              error={errors.aum_date?.message}
            />

            <Input
              label="Domicile fiscal"
              {...register('domicile')}
              error={errors.domicile?.message}
              placeholder="ex: Luxembourg, France"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stratégies d'investissement
              </label>
              <textarea
                {...register('strategies')}
                placeholder="Une stratégie par ligne (ex: Actions Europe, Obligations, etc.)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bleu focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Entrez une stratégie par ligne
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes internes
              </label>
              <textarea
                {...register('notes')}
                placeholder="Notes et commentaires internes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bleu focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading} variant="primary">
          {isLoading ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
