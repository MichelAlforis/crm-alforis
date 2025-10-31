// components/forms/OrganisationForm.tsx
// ============= ORGANISATION FORM - RÉUTILISABLE =============

'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert, Select } from '@/components/shared'
import { Organisation, OrganisationCreate, OrganisationCategory } from '@/lib/types'
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/geo'
import { useFormToast } from '@/hooks/useFormToast'
import { useFormAutoFocus } from '@/hooks/useFormAutoFocus'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { useContextMenu } from '@/hooks/useContextMenu'
import { FieldContextMenu } from '@/components/ui/FieldContextMenu'

interface OrganisationFormProps {
  initialData?: Organisation
  onSubmit: (data: OrganisationCreate) => Promise<void>
  isLoading?: boolean
  error?: string
  submitLabel?: string
}

const CATEGORY_OPTIONS: { value: OrganisationCategory; label: string }[] = [
  { value: 'Institution', label: 'Institution' },
  { value: 'Wholesale', label: 'Wholesale' },
  { value: 'SDG', label: 'SDG (Sélection de Gérants)' },
  { value: 'CGPI', label: 'CGPI (Conseiller en Gestion de Patrimoine)' },
  { value: 'Startup', label: 'Startup' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Autres', label: 'Autres' },
]

export function OrganisationForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Créer',
}: OrganisationFormProps) {
  const toast = useFormToast({ entityName: 'Organisation', gender: 'f' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const contextMenu = useContextMenu()
  const [contextMenuField, setContextMenuField] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
    setValue,
  } = useForm<OrganisationCreate>({
    defaultValues: {
      ...initialData,
      category: initialData?.category ?? 'Autres',
      country_code: initialData?.country_code ?? 'FR',
      language: initialData?.language ?? 'FR',
      is_active: initialData?.is_active ?? true,
    },
    mode: 'onBlur',
  })

  // Focus automatique sur le premier champ en erreur
  useFormAutoFocus(errors, setFocus)

  // Handle context menu open
  const handleFieldContextMenu = (e: React.MouseEvent, fieldName: string) => {
    contextMenu.onContextMenu(e)
    setContextMenuField(fieldName)
  }

  // Handle suggestion selection from context menu
  const handleContextMenuSelect = (value: string) => {
    if (!contextMenuField) return
    setValue(contextMenuField as keyof OrganisationCreate, value as any)
    contextMenu.hideMenu()
    setContextMenuField(null)
    toast.success('Suggestion appliquée', `Le champ "${contextMenuField}" a été rempli avec la suggestion.`)
  }

  const handleFormSubmit = async (data: OrganisationCreate) => {
    try {
      await onSubmit(data)
      initialData ? toast.successUpdate() : toast.successCreate()
    } catch (err: any) {
      toast.error(err)
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

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Catégorie *
          </label>
          <HelpTooltip
            content="Type d'organisation selon votre métier : Institution (banque, assurance), Wholesale (distributeur en gros), SDG (sélection de gérants), CGPI (conseiller patrimoine indépendant), etc."
            learnMoreLink="/dashboard/help/guides/organisations#categories"
            size="sm"
          />
        </div>
        <Select
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
      </div>

      <div onContextMenu={(e) => handleFieldContextMenu(e, 'email')}>
        <Input
          label="Email principal"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="contact@organisation.com"
        />
      </div>

      <div onContextMenu={(e) => handleFieldContextMenu(e, 'main_phone')}>
        <Input
          label="Téléphone principal"
          {...register('main_phone', {
            pattern: {
              value: /^[\+]?[0-9][\s\-\.\(\)0-9]{7,18}$/,
              message: 'Format de téléphone invalide',
            },
          })}
          error={errors.main_phone?.message}
          placeholder="+33 1 23 45 67 89"
        />
      </div>

      <div onContextMenu={(e) => handleFieldContextMenu(e, 'website')}>
        <Input
          label="Site web"
          type="url"
          {...register('website')}
          error={errors.website?.message}
          placeholder="https://www.organisation.com"
        />
      </div>

      <div onContextMenu={(e) => handleFieldContextMenu(e, 'address')}>
        <Input
          label="Adresse"
          {...register('address')}
          error={errors.address?.message}
          placeholder="123 Rue de la Paix, 75001 Paris"
        />
      </div>

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
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  AUM (Assets Under Management)
                </label>
                <HelpTooltip
                  content="Montant des actifs sous gestion de l'organisation, exprimé en millions d'euros. Indicateur clé pour évaluer la taille et l'importance d'un distributeur ou gestionnaire."
                  learnMoreLink="/dashboard/help/guides/organisations#aum"
                  size="sm"
                />
              </div>
              <Input
                type="number"
                {...register('aum', { valueAsNumber: true })}
                error={errors.aum?.message}
                placeholder="Montant en millions €"
              />
            </div>

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
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Stratégies d'investissement
                </label>
                <HelpTooltip
                  content="Liste des stratégies d'investissement proposées par l'organisation (Actions Europe, Obligations, Private Equity, etc.). Une stratégie par ligne. Utile pour cibler les produits compatibles."
                  learnMoreLink="/dashboard/help/guides/organisations#strategies"
                  size="sm"
                />
              </div>
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

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading} variant="primary" className="w-full sm:w-auto">
          {isLoading ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>

      {/* Context Menu for AI Suggestions */}
      {contextMenu.position && contextMenuField && (
        <FieldContextMenu
          position={contextMenu.position}
          fieldName={contextMenuField}
          onClose={() => {
            contextMenu.hideMenu()
            setContextMenuField(null)
          }}
          onSelect={handleContextMenuSelect}
        />
      )}
    </form>
  )
}
